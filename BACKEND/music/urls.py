from django.urls import path

from music.views import (
    AlbumView,
    ArtistView,
    PlaybackQueueView,
    PlaylistForSongView,
    PlaylistSongView,
    PlaylistView,
    PublicSharedPlaylistSongView,
    PublicSharedPlaylistView,
    SharedPlaylistSongStreamView,
    SharedPlaylistView,
    SharedSongStreamView,
    SharedSongsView,
    SongStreamView,
    SongView,
)

urlpatterns = [
    # Songs
    path("songs/", SongView.as_view()),
    path("song/upload/", SongView.as_view()),
    path("song/<uuid:song_uuid>/", SongView.as_view()),
    path("song/delete/<uuid:song_uuid>/", SongView.as_view()),
    path("song/stream/<uuid:song_uuid>/", SongStreamView.as_view()),
    # Shared Songs
    path("song/share/", SharedSongsView.as_view()),
    path("song/share/<uuid:shared_uuid>/", SharedSongsView.as_view()),
    path("song/share/stream/<uuid:shared_uuid>/", SharedSongStreamView.as_view()),
    # Playlist
    path("playlists/", PlaylistView.as_view()),
    path("playlist/<uuid:playlist_uuid>/", PlaylistView.as_view()),
    # Playlists for song
    path("playlists/song/<uuid:song_uuid>/", PlaylistForSongView.as_view()),
    path("playlist/<uuid:playlist_uuid>/songs/", PlaylistSongView.as_view()),
    path("playlist/song/add/<uuid:playlist_uuid>/", PlaylistSongView.as_view()),
    path("playlist/song/remove/<uuid:playlist_uuid>/", PlaylistSongView.as_view()),
    # Shared Playlist
    path("playlist/share/", SharedPlaylistView.as_view()),
    path("playlist/share/<uuid:shared_uuid>/", SharedPlaylistView.as_view()),
    # Shared Public Playlist
    path(
        "playlist/share/public/<uuid:shared_uuid>/", PublicSharedPlaylistView.as_view()
    ),
    path(
        "playlist/share/public/<uuid:shared_uuid>/songs/",
        PublicSharedPlaylistSongView.as_view(),
    ),
    path(
        "playlist/share/public/<uuid:shared_uuid>/song/<uuid:playlist_song_uuid>/",     # Currently not in use
        PublicSharedPlaylistSongView.as_view(),
    ),
    path(
        "playlist/share/public/<uuid:shared_uuid>/song/stream/<uuid:playlist_song_uuid>/",
        SharedPlaylistSongStreamView.as_view(),
    ),
    # Artist
    path("artists/", ArtistView.as_view()),
    path("artist/<uuid:artist_uuid>/", ArtistView.as_view()),
    # Album
    path("albums/", AlbumView.as_view()),
    path("album/<uuid:album_uuid>/", AlbumView.as_view()),
    # Playback queue
    path("playback-queue/", PlaybackQueueView.as_view()),
]
