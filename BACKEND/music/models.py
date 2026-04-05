import uuid

from django.contrib.auth import get_user_model
from django.db import models
from django.utils import timezone

# Create your models here.

User = get_user_model()


class Artist(models.Model):
    artist_uuid = models.UUIDField(default=uuid.uuid4, unique=True)

    name = models.CharField(max_length=255)

    created_by = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]
        indexes = [
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
        ordering = ["-created_at"]
        indexes = [
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
        ordering = ["title"]
        indexes = [
            models.Index(fields=["artist"]),
            models.Index(fields=["album"]),
            models.Index(fields=["uploaded_by", "is_uploaded_to_cloud", "is_upload_complete"]),
        ]


class Playlist(models.Model):
    playlist_uuid = models.UUIDField(default=uuid.uuid4, unique=True)

    name = models.CharField(max_length=255)
    owner = models.ForeignKey(User, on_delete=models.CASCADE)

    is_public = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
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
            models.Index(fields=["playlist", "order"]),
            models.Index(fields=["song"]),
        ]


class BaseShared(models.Model):
    shared_uuid = models.UUIDField(default=uuid.uuid4, unique=True)

    shared_by = models.ForeignKey(User, on_delete=models.CASCADE)
    shared_at = models.DateTimeField(auto_now_add=True)
    expire_at = models.DateTimeField(null=True, blank=True, editable=True)

    class Meta:
        abstract = True
        ordering = ["-shared_at"]

    def isExpired(self):
        if not self.expire_at:
            return False
        return self.expire_at < timezone.now()


class SharedSong(BaseShared):
    song = models.ForeignKey(
        Song, on_delete=models.CASCADE, related_name="shared_links"
    )

    class Meta:
        ordering = ["-shared_at"]
        indexes = [
            models.Index(fields=["song", "shared_by"]),
        ]
        constraints = [
            models.UniqueConstraint(fields=["song"], name="unique_shared_song")
        ]


class SharedPlaylist(BaseShared):
    playlist = models.ForeignKey(
        Playlist, on_delete=models.CASCADE, related_name="shared_links"
    )

    class Meta:
        ordering = ["-shared_at"]
        indexes = [
            models.Index(fields=["playlist", "shared_by"]),
        ]
        constraints = [
            models.UniqueConstraint(fields=["playlist"], name="unique_shared_playlist")
        ]
