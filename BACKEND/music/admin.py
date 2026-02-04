from django.contrib import admin

from .models import Album, Artist, Song

# Register your models here.


class ArtistAdmin(admin.ModelAdmin):
    list_display = ("name", "artist_uuid", "created_at")
    search_fields = ("name",)
    readonly_fields = ("artist_uuid", "created_at")


class AlbumAdmin(admin.ModelAdmin):
    list_display = ("title", "artist", "release_year", "album_uuid", "created_at")
    search_fields = ("title", "artist__name")
    list_filter = ("release_year", "created_at")
    readonly_fields = ("album_uuid", "created_at")


class SongAdmin(admin.ModelAdmin):
    list_display = ("title", "artist", "album", "duration", "song_uuid", "uploaded_by")
    search_fields = ("title", "artist__name", "album__title")
    list_filter = ("artist", "album", "uploaded_by", "mime_type")
    readonly_fields = ("song_uuid", "size", "mime_type", "uploaded_by")


admin.site.register(Artist, ArtistAdmin)
admin.site.register(Album, AlbumAdmin)
admin.site.register(Song, SongAdmin)
