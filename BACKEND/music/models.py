import uuid

from django.contrib.auth import get_user_model
from django.db import models

# Create your models here.

User = get_user_model()


class Artist(models.Model):
    artist_uuid = models.UUIDField(default=uuid.uuid4, unique=True)

    name = models.CharField(max_length=255)

    createdBy = models.ForeignKey(User, on_delete=models.CASCADE)
    createdAt = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["artist_uuid"]),
            models.Index(fields=["name"]),
            models.Index(fields=["createdBy"]),
        ]


class Album(models.Model):
    album_uuid = models.UUIDField(default=uuid.uuid4, unique=True)

    artist = models.ForeignKey(Artist, on_delete=models.CASCADE)

    title = models.CharField(max_length=255)

    coverImage = models.ImageField(upload_to="album_covers/", null=True, blank=True)
    releaseYear = models.IntegerField(null=True, blank=True)

    createdBy = models.ForeignKey(User, on_delete=models.CASCADE)
    createdAt = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["album_uuid"]),
            models.Index(fields=["artist"]),
            models.Index(fields=["title"]),
            models.Index(fields=["createdBy"]),
        ]


class Song(models.Model):
    song_uuid = models.UUIDField(default=uuid.uuid4, unique=True)

    title = models.CharField(max_length=255)

    file = models.FileField(upload_to="songs/")

    artist = models.ForeignKey(Artist, on_delete=models.CASCADE)
    album = models.ForeignKey(Album, null=True, blank=True, on_delete=models.SET_NULL)

    duration = models.PositiveIntegerField(help_text="Duration in seconds")
    size = models.PositiveBigIntegerField()

    mimeType = models.CharField(max_length=50)

    isUploadedToCloud = models.BooleanField(default=True)

    uploadedBy = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="uploadedSongs"
    )

    isPublic = models.BooleanField(default=False)

    createdAt = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["song_uuid"]),
            models.Index(fields=["artist"]),
            models.Index(fields=["album"]),
            models.Index(fields=["uploadedBy"]),
        ]


class Playlist(models.Model):
    playlist_uuid = models.UUIDField(default=uuid.uuid4, unique=True)

    name = models.CharField(max_length=255)
    owner = models.ForeignKey(User, on_delete=models.CASCADE)

    createdAt = models.DateTimeField(auto_now_add=True)

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

    addedAt = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("playlist", "song")
        ordering = ["order"]
        indexes = [
            models.Index(fields=["playlist_song_uuid"]),
            models.Index(fields=["playlist", "order"]),
        ]
