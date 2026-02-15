import os
import tempfile
import uuid

from django.conf import settings
from django.core.files.storage import default_storage
from django.db import transaction

from music.models import Album, Artist, Song
from music.services.metadata_service import extract_metadata
from music.services.storage_service import move_to_final, save_temp_file
from music.services.thumbnail_service import create_thumbnail


def upload_song(file, user):
    # 1. Save temp file
    temp_path = save_temp_file(file)

    try:
        # 2. Extract metadata
        # For S3 storage, we need to download the file to a local temp location
        # because mutagen requires a local file path
        if settings.STORAGE_BACKEND == "s3":
            # Download from S3 to temporary local file
            with tempfile.NamedTemporaryFile(
                delete=False, suffix=os.path.splitext(file.name)[1]
            ) as tmp_file:
                local_temp_path = tmp_file.name
                with default_storage.open(temp_path, "rb") as s3_file:
                    tmp_file.write(s3_file.read())

            try:
                metadata = extract_metadata(local_temp_path)
            finally:
                # Clean up the local temp file
                if os.path.exists(local_temp_path):
                    os.unlink(local_temp_path)
        else:
            # For local storage, use the path directly
            metadata = extract_metadata(default_storage.path(temp_path))

        title = metadata.get("title") or os.path.splitext(file.name)[0]
        artist_name = metadata.get("artist") or "Unknown Artist"
        album_title = metadata.get("album")
        album_art = metadata.get("album_art")

        # 3. Resolve artist
        artist, _ = Artist.objects.get_or_create(
            name__iexact=artist_name,
            created_by=user,
            defaults={"name": artist_name},
        )

        # 4. Resolve album
        album = None
        if album_title:
            album, _ = Album.objects.get_or_create(
                artist=artist,
                title__iexact=album_title,
                created_by=user,
                defaults={
                    "title": album_title,
                    "artist": artist,
                },
            )

        # 5. Generate UUID
        song_uuid = uuid.uuid4()

        # 6. Final storage path
        ext = os.path.splitext(file.name)[1]
        final_path = f"songs/{song_uuid}{ext}"

        # 7. Move file to permanent storage
        move_to_final(temp_path, final_path)

        # 7.5 Create thumbnail if art exists
        thumbnail_path = None
        if album_art:
            thumbnail_path = create_thumbnail(album_art)

        file_size = default_storage.size(final_path)

        is_uploaded_to_cloud = settings.STORAGE_BACKEND == "s3"

        # 8. Create DB record atomically
        with transaction.atomic():
            song = Song.objects.create(
                song_uuid=song_uuid,
                title=title,
                file=final_path,
                artist=artist,
                album=album,
                duration=metadata["duration"],
                size=file_size,
                mime_type=metadata["mime_type"],
                uploaded_by=user,
                is_uploaded_to_cloud=is_uploaded_to_cloud,
                is_upload_complete=True,
                thumbnail=thumbnail_path,
            )

            # Optional: Update album cover if it doesn't have one
            if album and not album.cover_image and thumbnail_path:
                album.cover_image = thumbnail_path
                album.save()

        return song

    except Exception:
        # cleanup temp file
        if default_storage.exists(temp_path):
            default_storage.delete(temp_path)
        raise
