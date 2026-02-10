from django.conf import settings
from django.contrib.auth import get_user_model
from django.db.models import Max
from django.shortcuts import get_object_or_404
from rest_framework import serializers, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from account.jwt_utils import CookieJWTAuthentication
from music.models import Album, Artist, Playlist, PlaylistSong, Song
from music.serializers import (
    AlbumModelSerializer,
    AlbumSongModelSerializer,
    ArtistModelSerializer,
    ArtistSongModelSerializer,
    PlaylistModelSerializer,
    PlaylistSongModelSerializer,
    SongModelSerializer,
)
from music.services.streaming_service import stream_file
from music.services.upload_service import upload_song
from music.services.storage_service import delete_file
from utils.response_wrapper import formatted_response

# Create your views here.


User = get_user_model()


class SongView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [CookieJWTAuthentication]

    class SongKwargsSerializer(serializers.Serializer):
        song_uuid = serializers.UUIDField(required=True, allow_null=False)

    class SongQuerySerializer(serializers.Serializer):
        q = serializers.CharField(required=False, allow_blank=False)
        artist_uuid = serializers.UUIDField(required=False, allow_null=False)
        album_uuid = serializers.UUIDField(required=False, allow_null=False)

    def get(self, *args, **kwargs):
        user_obj = self.request.user

        query_serializer = self.SongQuerySerializer(data=self.request.query_params)
        query_serializer.is_valid(raise_exception=True)

        # Base queryset
        song_objs = Song.objects.filter(
            uploaded_by=user_obj, is_uploaded_to_cloud=settings.STORAGE_BACKEND == "s3"
        )

        # Apply optional filters
        search_query = query_serializer.validated_data.get("q")
        artist_uuid = query_serializer.validated_data.get("artist_uuid")
        album_uuid = query_serializer.validated_data.get("album_uuid")

        if search_query:
            song_objs = song_objs.filter(title__icontains=search_query)

        if artist_uuid:
            song_objs = song_objs.filter(artist__artist_uuid=artist_uuid)

        if album_uuid:
            song_objs = song_objs.filter(album__album_uuid=album_uuid)

        return formatted_response(data=SongModelSerializer(song_objs, many=True).data)

    def post(self, *args, **kwargs):
        file = self.request.FILES.get("file")

        if not file:
            return formatted_response(
                message={"error": "No file provided"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user_obj = self.request.user

        song = upload_song(file=file, user=user_obj)

        return formatted_response(
            data=SongModelSerializer(song).data,
            message="Song uploaded successfully",
            status=status.HTTP_201_CREATED,
        )

    def delete(self, *args, **kwargs):
        kwargs_serializer = self.SongKwargsSerializer(data=self.kwargs)
        kwargs_serializer.is_valid(raise_exception=True)

        song_uuid = kwargs_serializer.validated_data.get("song_uuid")
        user_obj = self.request.user

        song = get_object_or_404(Song, uploaded_by=user_obj, song_uuid=song_uuid)
        song.delete()

        return formatted_response(
            message="Song deleted successfully",
            status=status.HTTP_200_OK,
        )


class SongStreamView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [CookieJWTAuthentication]

    class StreamKwargsSerializer(serializers.Serializer):
        song_uuid = serializers.UUIDField(required=True, allow_null=False)

    def get(self, *args, **kwargs):

        kwargs_serializer = self.StreamKwargsSerializer(data=self.kwargs)
        kwargs_serializer.is_valid(raise_exception=True)

        song_uuid = kwargs_serializer.validated_data.get("song_uuid")

        song = get_object_or_404(Song, song_uuid=song_uuid)

        return stream_file(
            request=self.request,
            file_path=song.file.name,
            content_type=song.mime_type,
        )


class PlaylistView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [CookieJWTAuthentication]

    class PlaylistKwargsSerializer(serializers.Serializer):
        playlist_uuid = serializers.UUIDField()

    class PlaylistPostSerializer(serializers.Serializer):
        name = serializers.CharField(required=True, allow_null=False)

    class PlaylistPatchSerializer(serializers.Serializer):
        name = serializers.CharField(required=True, allow_null=False)

    def get(self, *args, **kwargs):
        user_obj = self.request.user
        playlist_objs = Playlist.objects.filter(owner=user_obj)

        return formatted_response(
            data=PlaylistModelSerializer(playlist_objs, many=True).data,
            message="Playlists fetched successfully",
            status=status.HTTP_200_OK,
        )

    def post(self, *args, **kwargs):
        post_serializer = self.PlaylistPostSerializer(data=self.request.data)
        post_serializer.is_valid(raise_exception=True)

        playlist_name = post_serializer.validated_data.get("name")
        user_obj = self.request.user

        playlist = Playlist.objects.create(
            owner=user_obj,
            name=playlist_name,
        )

        return formatted_response(
            data=PlaylistModelSerializer(playlist).data,
            message="Playlist created successfully",
            status=status.HTTP_201_CREATED,
        )

    def patch(self, *args, **kwargs):
        kwargs_serializer = self.PlaylistKwargsSerializer(data=self.kwargs)
        kwargs_serializer.is_valid(raise_exception=True)

        patch_serializer = self.PlaylistPatchSerializer(data=self.request.data)
        patch_serializer.is_valid(raise_exception=True)

        playlist_uuid = kwargs_serializer.validated_data.get("playlist_uuid")
        playlist = get_object_or_404(
            Playlist, owner=self.request.user, playlist_uuid=playlist_uuid
        )

        playlist_name = patch_serializer.validated_data.get("name")

        playlist.name = playlist_name
        playlist.save()

        return formatted_response(
            data=PlaylistModelSerializer(playlist).data,
            message="Playlist updated successfully",
            status=status.HTTP_200_OK,
        )

    def delete(self, *args, **kwargs):
        kwargs_serializer = self.PlaylistKwargsSerializer(data=self.kwargs)
        kwargs_serializer.is_valid(raise_exception=True)

        playlist_uuid = kwargs_serializer.validated_data.get("playlist_uuid")
        playlist = get_object_or_404(
            Playlist, owner=self.request.user, playlist_uuid=playlist_uuid
        )

        playlist.delete()

        return formatted_response(
            message="Playlist deleted successfully",
            status=status.HTTP_200_OK,
        )


class PlaylistSongView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [CookieJWTAuthentication]

    class PlaylistSongKwargsSerializer(serializers.Serializer):
        playlist_uuid = serializers.UUIDField(required=True, allow_null=False)

    class PlaylistSongPostSerializer(serializers.Serializer):
        song_uuid = serializers.UUIDField(required=True, allow_null=False)

    class PlaylistSongDeleteSerializer(serializers.Serializer):
        playlist_song_uuid = serializers.UUIDField(required=True, allow_null=False)

    def get(self, *args, **kwargs):
        kwargs_serializer = self.PlaylistSongKwargsSerializer(data=self.kwargs)
        kwargs_serializer.is_valid(raise_exception=True)

        playlist_uuid = kwargs_serializer.validated_data.get("playlist_uuid")

        user_obj = self.request.user

        playlist = get_object_or_404(
            Playlist, owner=user_obj, playlist_uuid=playlist_uuid
        )

        playlistsong_objs = PlaylistSong.objects.filter(playlist=playlist)

        return formatted_response(
            data=PlaylistSongModelSerializer(playlistsong_objs, many=True).data,
            message="Playlist songs fetched successfully",
            status=status.HTTP_200_OK,
        )

    def post(self, *args, **kwargs):
        kwargs_serializer = self.PlaylistSongKwargsSerializer(data=self.kwargs)
        kwargs_serializer.is_valid(raise_exception=True)

        post_serializer = self.PlaylistSongPostSerializer(data=self.request.data)
        post_serializer.is_valid(raise_exception=True)

        playlist_uuid = kwargs_serializer.validated_data.get("playlist_uuid")
        song_uuid = post_serializer.validated_data.get("song_uuid")

        playlist = get_object_or_404(
            Playlist, owner=self.request.user, playlist_uuid=playlist_uuid
        )
        song = get_object_or_404(Song, song_uuid=song_uuid)

        if PlaylistSong.objects.filter(playlist=playlist, song=song).exists():
            return formatted_response(
                message="Song already exists in playlist",
                status=status.HTTP_400_BAD_REQUEST,
            )

        last_order = (
            PlaylistSong.objects.filter(playlist=playlist)
            .aggregate(max_order=Max("order"))
            .get("max_order")
        )

        if last_order is None:
            last_order = 0

        playlist_song = PlaylistSong.objects.create(
            playlist=playlist,
            song=song,
            order=last_order + 1,
        )

        return formatted_response(
            data=PlaylistSongModelSerializer(playlist_song).data,
            message="Song added to playlist successfully",
            status=status.HTTP_200_OK,
        )

    def delete(self, *args, **kwargs):
        kwargs_serializer = self.PlaylistSongKwargsSerializer(data=self.kwargs)
        kwargs_serializer.is_valid(raise_exception=True)

        delete_serializer = self.PlaylistSongDeleteSerializer(data=self.request.data)
        delete_serializer.is_valid(raise_exception=True)

        playlist_uuid = kwargs_serializer.validated_data.get("playlist_uuid")
        playlist_song_uuid = delete_serializer.validated_data.get("playlist_song_uuid")

        playlist = get_object_or_404(
            Playlist, owner=self.request.user, playlist_uuid=playlist_uuid
        )

        playlistsong_obj = get_object_or_404(
            PlaylistSong, playlist=playlist, playlist_song_uuid=playlist_song_uuid
        )

        playlistsong_obj.delete()

        return formatted_response(
            message="Song removed from playlist successfully",
            status=status.HTTP_204_NO_CONTENT,
        )


class ArtistView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [CookieJWTAuthentication]

    class ArtistKwargsSerializer(serializers.Serializer):
        artist_uuid = serializers.UUIDField(required=False, allow_null=True)

    def get(self, *args, **kwargs):
        kwargs_serializer = self.ArtistKwargsSerializer(data=self.kwargs)
        kwargs_serializer.is_valid(raise_exception=True)

        artist_uuid = kwargs_serializer.validated_data.get("artist_uuid")

        user_obj = self.request.user

        if artist_uuid:
            artist_obj = get_object_or_404(
                Artist, created_by=user_obj, artist_uuid=artist_uuid
            )

            return formatted_response(
                data=ArtistSongModelSerializer(artist_obj).data,
                message="Artist fetched successfully",
                status=status.HTTP_200_OK,
            )

        artist_objs = Artist.objects.filter(created_by=user_obj)

        return formatted_response(
            data=ArtistModelSerializer(artist_objs, many=True).data,
            message="Artists fetched successfully",
            status=status.HTTP_200_OK,
        )


class AlbumView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [CookieJWTAuthentication]

    class AlbumKwargsSerializer(serializers.Serializer):
        album_uuid = serializers.UUIDField(required=False, allow_null=True)

    def get(self, *args, **kwargs):
        kwargs_serializer = self.AlbumKwargsSerializer(data=self.kwargs)
        kwargs_serializer.is_valid(raise_exception=True)

        album_uuid = kwargs_serializer.validated_data.get("album_uuid")

        user_obj = self.request.user

        if album_uuid:
            album_obj = get_object_or_404(
                Album, created_by=user_obj, album_uuid=album_uuid
            )

            return formatted_response(
                data=AlbumSongModelSerializer(album_obj).data,
                message="Album fetched successfully",
                status=status.HTTP_200_OK,
            )

        album_objs = Album.objects.filter(created_by=user_obj)

        return formatted_response(
            data=AlbumModelSerializer(album_objs, many=True).data,
            message="Albums fetched successfully",
            status=status.HTTP_200_OK,
        )

    def delete(self, *args, **kwargs):
        kwargs_serializer = self.AlbumKwargsSerializer(data=self.kwargs)
        kwargs_serializer.is_valid(raise_exception=True)

        album_uuid = kwargs_serializer.validated_data.get("album_uuid")
        user_obj = self.request.user

        album = get_object_or_404(Album, created_by=user_obj, album_uuid=album_uuid)
        album.delete()

        return formatted_response(
            message="Album deleted successfully",
            status=status.HTTP_200_OK,
        )
