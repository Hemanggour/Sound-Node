from django.contrib import admin

from music.models import Album, Artist, SharedSong, Song

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


class SharedSongAdmin(admin.ModelAdmin):
    list_display = (
        "song__title",
        "shared_uuid",
        "shared_by__username",
        "shared_at",
        "expire_at",
    )
    list_filter = ("shared_by", "shared_at", "expire_at")
    readonly_fields = ("shared_uuid", "shared_by", "shared_at")


admin.site.register(Artist, ArtistAdmin)
admin.site.register(Album, AlbumAdmin)
admin.site.register(Song, SongAdmin)
admin.site.register(SharedSong, SharedSongAdmin)
