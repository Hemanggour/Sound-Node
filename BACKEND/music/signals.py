from django.db.models.signals import post_delete
from django.dispatch import receiver
from music.models import Song, Album
from music.services.storage_service import delete_file

@receiver(post_delete, sender=Song)
def delete_song_files(sender, instance, **kwargs):
    """
    Automatically delete audio file and thumbnail when a Song is deleted.
    """
    if instance.file:
        delete_file(instance.file)
    if instance.thumbnail:
        delete_file(instance.thumbnail)

    # Cleanup orphaned Album
    if instance.album:
        if not Song.objects.filter(album=instance.album).exists():
            instance.album.delete()

    # Cleanup orphaned Artist
    if instance.artist:
        if not Song.objects.filter(artist=instance.artist).exists():
            instance.artist.delete()

@receiver(post_delete, sender=Album)
def delete_album_files(sender, instance, **kwargs):
    """
    Automatically delete cover image when an Album is deleted.
    """
    if instance.cover_image:
        delete_file(instance.cover_image)
