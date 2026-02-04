from django.urls import path

from music.views import PlaylistSongView, PlaylistView, SongStreamView, SongView

urlpatterns = [
    path("songs/", SongView.as_view()),
    path("song/upload/", SongView.as_view()),
    path("song/stream/<uuid:song_uuid>/", SongStreamView.as_view()),
    path("playlists/", PlaylistView.as_view()),
    path("playlist/<uuid:playlist_uuid>/", PlaylistView.as_view()),
    path("playlist/song/add/<uuid:playlist_uuid>/", PlaylistSongView.as_view()),
    path("playlist/song/remove/<uuid:playlist_uuid>/", PlaylistSongView.as_view()),
]
