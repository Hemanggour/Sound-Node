import uuid

from django.contrib.auth import get_user_model
from django.db import models

# Create your models here.

User = get_user_model()


class Artist(models.Model):
    artist_uuid = models.UUIDField(default=uuid.uuid4, unique=True)

    name = models.CharField(max_length=255)

    createdAt = models.DateTimeField(auto_now_add=True)


class Album(models.Model):
    album_uuid = models.UUIDField(default=uuid.uuid4, unique=True)

    artist = models.ForeignKey(Artist, on_delete=models.CASCADE)

    title = models.CharField(max_length=255)

    coverImage = models.ImageField(upload_to="album_covers/", null=True, blank=True)
    releaseYear = models.IntegerField(null=True, blank=True)

    createdAt = models.DateTimeField(auto_now_add=True)


class Song(models.Model):
    song_uuid = models.UUIDField(default=uuid.uuid4, unique=True)

    title = models.CharField(max_length=255)

    file = models.FileField(upload_to="songs/")

    artist = models.ForeignKey(Artist, on_delete=models.CASCADE)
    album = models.ForeignKey(Album, null=True, blank=True, on_delete=models.SET_NULL)

    duration = models.IntegerField(help_text="Duration in seconds")
    size = models.BigIntegerField()

    mimeType = models.CharField(max_length=50)

    uploadedBy = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="uploadedSongs"
    )

    createdAt = models.DateTimeField(auto_now_add=True)


class Playlist(models.Model):
    playlist_uuid = models.UUIDField(default=uuid.uuid4, unique=True)

    name = models.CharField(max_length=255)
    owner = models.ForeignKey(User, on_delete=models.CASCADE)

    createdAt = models.DateTimeField(auto_now_add=True)


class PlaylistSong(models.Model):
    playlist = models.ForeignKey(Playlist, on_delete=models.CASCADE)
    song = models.ForeignKey(Song, on_delete=models.CASCADE)

    order = models.IntegerField()

    addedAt = models.DateTimeField(auto_now_add=True)
