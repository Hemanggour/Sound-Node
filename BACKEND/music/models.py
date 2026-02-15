import uuid

from django.contrib.auth import get_user_model
from django.db import models

# Create your models here.

User = get_user_model()


class Artist(models.Model):
    artist_uuid = models.UUIDField(default=uuid.uuid4, unique=True)

    name = models.CharField(max_length=255)

    created_by = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["artist_uuid"]),
            models.Index(fields=["name"]),
            models.Index(fields=["created_by"]),
        ]


class Album(models.Model):
    album_uuid = models.UUIDField(default=uuid.uuid4, unique=True)

    artist = models.ForeignKey(Artist, on_delete=models.CASCADE)

    title = models.CharField(max_length=255)

    cover_image = models.ImageField(upload_to="album_covers/", null=True, blank=True)
    release_year = models.IntegerField(null=True, blank=True)

    created_by = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["album_uuid"]),
            models.Index(fields=["artist"]),
            models.Index(fields=["title"]),
            models.Index(fields=["created_by"]),
        ]


class Song(models.Model):
    song_uuid = models.UUIDField(default=uuid.uuid4, unique=True)

    title = models.CharField(max_length=255)

    file = models.FileField(upload_to="songs/")

    artist = models.ForeignKey(Artist, on_delete=models.CASCADE)
    album = models.ForeignKey(Album, null=True, blank=True, on_delete=models.SET_NULL)

    duration = models.PositiveIntegerField(help_text="Duration in seconds")
    size = models.PositiveBigIntegerField()

    mime_type = models.CharField(max_length=50)

    is_uploaded_to_cloud = models.BooleanField(default=True)

    uploaded_by = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="uploadedSongs"
    )

    is_upload_complete = models.BooleanField(default=False)

    is_public = models.BooleanField(default=False)
    thumbnail = models.ImageField(upload_to="thumbnails/", null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["song_uuid"]),
            models.Index(fields=["artist"]),
            models.Index(fields=["album"]),
            models.Index(fields=["uploaded_by"]),
        ]


class Playlist(models.Model):
    playlist_uuid = models.UUIDField(default=uuid.uuid4, unique=True)

    name = models.CharField(max_length=255)
    owner = models.ForeignKey(User, on_delete=models.CASCADE)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["playlist_uuid"]),
            models.Index(fields=["owner"]),
        ]


class PlaylistSong(models.Model):
    playlist_song_uuid = models.UUIDField(default=uuid.uuid4, unique=True)

    playlist = models.ForeignKey(Playlist, on_delete=models.CASCADE)
    song = models.ForeignKey(Song, on_delete=models.CASCADE)

    order = models.IntegerField()

    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("playlist", "song")
        ordering = ["order"]
        indexes = [
            models.Index(fields=["playlist_song_uuid"]),
            models.Index(fields=["playlist", "order"]),
        ]
