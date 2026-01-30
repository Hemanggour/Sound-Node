from django.contrib import admin

from .models import Album, Artist, Song

# Register your models here.


class ArtistAdmin(admin.ModelAdmin):
    list_display = ("name", "artist_uuid", "createdAt")
    search_fields = ("name",)
    readonly_fields = ("artist_uuid", "createdAt")


class AlbumAdmin(admin.ModelAdmin):
    list_display = ("title", "artist", "releaseYear", "album_uuid", "createdAt")
    search_fields = ("title", "artist__name")
    list_filter = ("releaseYear", "createdAt")
    readonly_fields = ("album_uuid", "createdAt")


class SongAdmin(admin.ModelAdmin):
    list_display = ("title", "artist", "album", "duration", "song_uuid", "uploadedBy")
    search_fields = ("title", "artist__name", "album__title")
    list_filter = ("artist", "album", "uploadedBy", "mimeType")
    readonly_fields = ("song_uuid", "size", "mimeType", "uploadedBy")


admin.site.register(Artist, ArtistAdmin)
admin.site.register(Album, AlbumAdmin)
admin.site.register(Song, SongAdmin)
