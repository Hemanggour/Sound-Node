from django.urls import path

from music.views import SongStreamView, SongView

urlpatterns = [
    path("songs/", SongView.as_view()),
    path("song/upload/", SongView.as_view()),
    path("song/stream/<uuid:song_uuid>/", SongStreamView.as_view()),
]
