from django.conf import settings
from django.contrib.auth import get_user_model
from django.db.models import Exists, Max, OuterRef
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from rest_framework import serializers, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from account.jwt_utils import CookieJWTAuthentication
from music.models import Album, Artist, Playlist, PlaylistSong, SharedSong, Song
from music.serializers import (
    AlbumModelSerializer,
    ArtistModelSerializer,
    PlaylistForSongSerializer,
    PlaylistModelSerializer,
    PlaylistSongModelSerializer,
    SharedSongModelSerializer,
    SongModelSerializer,
)
from music.services.streaming_service import stream_file
from music.services.upload_service import upload_song
from utils.response_wrapper import formatted_response, paginated_response

# Create your views here.


User = get_user_model()


class SongView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [CookieJWTAuthentication]

    class SongKwargsSerializer(serializers.Serializer):
        song_uuid = serializers.UUIDField(required=False, allow_null=False)

    class SongQuerySerializer(serializers.Serializer):
        q = serializers.CharField(required=False, allow_blank=False)
        artist_uuid = serializers.UUIDField(required=False, allow_null=False)
        album_uuid = serializers.UUIDField(required=False, allow_null=False)

    def get(self, *args, **kwargs):
        user_obj = self.request.user
        kwargs_serializer = self.SongKwargsSerializer(data=self.kwargs)
        kwargs_serializer.is_valid(raise_exception=True)

        song_uuid = kwargs_serializer.validated_data.get("song_uuid")

        if song_uuid:
            song = get_object_or_404(Song, uploaded_by=user_obj, song_uuid=song_uuid)
            return formatted_response(
                data=SongModelSerializer(song, context={"request": self.request}).data,
                status=status.HTTP_200_OK,
            )

        query_serializer = self.SongQuerySerializer(data=self.request.query_params)
        query_serializer.is_valid(raise_exception=True)

        # Base queryset
        song_objs = Song.objects.filter(
            uploaded_by=user_obj,
            is_uploaded_to_cloud=settings.STORAGE_BACKEND == "s3",
            is_upload_complete=True,
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

        return paginated_response(
            queryset=song_objs,
            request=self.request,
            serializer_class=SongModelSerializer,
            context={"request": self.request},
        )

    def post(self, *args, **kwargs):
        file = self.request.FILES.get("file")

        if not file:
            return formatted_response(
                message={"error": "No file provided"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user_obj = self.request.user

        try:
            song = upload_song(file=file, user=user_obj)

            return formatted_response(
                data=SongModelSerializer(song, context={"request": self.request}).data,
                message="Song uploaded successfully",
                status=status.HTTP_201_CREATED,
            )
        except Exception as e:
            return formatted_response(
                message={"error": f"Upload failed: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
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

    class StreamQuerySerializer(serializers.Serializer):
        direct = serializers.BooleanField(required=False, allow_null=True)

    class StreamKwargsSerializer(serializers.Serializer):
        song_uuid = serializers.UUIDField(required=True, allow_null=False)

    def get(self, *args, **kwargs):
        query_serializer = self.StreamQuerySerializer(data=self.request.query_params)
        query_serializer.is_valid(raise_exception=True)
        direct = query_serializer.validated_data.get("direct")

        kwargs_serializer = self.StreamKwargsSerializer(data=self.kwargs)
        kwargs_serializer.is_valid(raise_exception=True)

        song_uuid = kwargs_serializer.validated_data.get("song_uuid")

        song = get_object_or_404(
            Song,
            uploaded_by=self.request.user,
            song_uuid=song_uuid,
            is_upload_complete=True,
        )

        # If 'direct' is present, stream the file content directly
        if direct:
            return stream_file(
                request=self.request,
                file_path=song.file.name,
                content_type=song.mime_type,
            )

        # Default to JSON response with metadata to reduce frontend API calls
        song_data = SongModelSerializer(song, context={"request": self.request}).data

        if settings.STORAGE_BACKEND == "s3":
            from music.services.s3_service import generate_presigned_url

            presigned_url = generate_presigned_url(song.file.name)
            return JsonResponse(
                {"url": presigned_url, "type": song.mime_type, "song": song_data}
            )
        else:
            # For local storage, provide the direct stream URL
            direct_url = self.request.build_absolute_uri() + "?direct=1"
            return JsonResponse(
                {"url": direct_url, "type": song.mime_type, "song": song_data}
            )


class PlaylistView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [CookieJWTAuthentication]

    class PlaylistKwargsSerializer(serializers.Serializer):
        playlist_uuid = serializers.UUIDField(required=False, allow_null=True)

    class PlaylistPostSerializer(serializers.Serializer):
        name = serializers.CharField(required=True, allow_null=False)

    class PlaylistPatchSerializer(serializers.Serializer):
        name = serializers.CharField(required=True, allow_null=False)

    class PlaylistQuerySerializer(serializers.Serializer):
        q = serializers.CharField(required=False, allow_blank=False)

    def get(self, *args, **kwargs):
        user_obj = self.request.user

        kwargs_serializer = self.PlaylistKwargsSerializer(data=self.kwargs)
        query_serializer = self.PlaylistQuerySerializer(data=self.request.query_params)
        query_serializer.is_valid(raise_exception=True)

        search_query = query_serializer.validated_data.get("q")

        playlist_uuid = None

        if self.kwargs.get("playlist_uuid"):
            kwargs_serializer.is_valid(raise_exception=True)
            playlist_uuid = kwargs_serializer.validated_data.get("playlist_uuid")

        if playlist_uuid:
            playlist = get_object_or_404(
                Playlist, owner=user_obj, playlist_uuid=playlist_uuid
            )
            return formatted_response(
                data=PlaylistModelSerializer(
                    playlist, context={"request": self.request}
                ).data,
                status=status.HTTP_200_OK,
            )

        playlist_objs = Playlist.objects.filter(owner=user_obj).order_by("-created_at")

        if search_query:
            playlist_objs = playlist_objs.filter(name__icontains=search_query)

        return paginated_response(
            queryset=playlist_objs,
            request=self.request,
            serializer_class=PlaylistModelSerializer,
            context={"request": self.request},
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
            data=PlaylistModelSerializer(
                playlist, context={"request": self.request}
            ).data,
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
            data=PlaylistModelSerializer(
                playlist, context={"request": self.request}
            ).data,
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


class PlaylistForSongView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [CookieJWTAuthentication]

    class PlaylistForSongKwargsSerializer(serializers.Serializer):
        song_uuid = serializers.UUIDField(required=True, allow_null=False)

    def get(self, *args, **kwargs):
        kwargs_serializer = self.PlaylistForSongKwargsSerializer(data=self.kwargs)
        kwargs_serializer.is_valid(raise_exception=True)

        user_obj = self.request.user
        song_uuid = kwargs_serializer.validated_data.get("song_uuid")

        playlist_song_subquery = PlaylistSong.objects.filter(
            playlist=OuterRef("pk"), song__song_uuid=song_uuid
        )

        playlist_objs = (
            Playlist.objects.filter(owner=user_obj)
            .annotate(isAdded=Exists(playlist_song_subquery))
            .order_by("-created_at")
        )

        return paginated_response(
            queryset=playlist_objs,
            request=self.request,
            serializer_class=PlaylistForSongSerializer,
            context={"request": self.request},
        )


class PlaylistSongView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [CookieJWTAuthentication]

    class PlaylistSongKwargsSerializer(serializers.Serializer):
        playlist_uuid = serializers.UUIDField(required=True, allow_null=False)

    class PlaylistSongPostSerializer(serializers.Serializer):
        song_uuid = serializers.UUIDField(required=True, allow_null=False)

    class PlaylistSongDeleteSerializer(serializers.Serializer):
        song_uuid = serializers.UUIDField(required=True, allow_null=False)

    class PlaylistSongQuerySerializer(serializers.Serializer):
        q = serializers.CharField(required=False, allow_blank=False)

    def get(self, *args, **kwargs):
        kwargs_serializer = self.PlaylistSongKwargsSerializer(data=self.kwargs)
        kwargs_serializer.is_valid(raise_exception=True)

        query_serializer = self.PlaylistSongQuerySerializer(
            data=self.request.query_params
        )
        query_serializer.is_valid(raise_exception=True)

        playlist_uuid = kwargs_serializer.validated_data.get("playlist_uuid")
        search_query = query_serializer.validated_data.get("q")

        user_obj = self.request.user

        playlist = get_object_or_404(
            Playlist, owner=user_obj, playlist_uuid=playlist_uuid
        )

        # Order by creation date to ensure consistent pagination
        playlistsong_objs = PlaylistSong.objects.filter(playlist=playlist)

        if search_query:
            playlistsong_objs = playlistsong_objs.filter(
                song__title__icontains=search_query
            )

        playlistsong_objs = playlistsong_objs.order_by("added_at")

        return paginated_response(
            queryset=playlistsong_objs,
            request=self.request,
            serializer_class=PlaylistSongModelSerializer,
            context={"request": self.request},
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
            data=PlaylistSongModelSerializer(
                playlist_song, context={"request": self.request}
            ).data,
            message="Song added to playlist successfully",
            status=status.HTTP_200_OK,
        )

    def delete(self, *args, **kwargs):
        kwargs_serializer = self.PlaylistSongKwargsSerializer(data=self.kwargs)
        kwargs_serializer.is_valid(raise_exception=True)

        delete_serializer = self.PlaylistSongDeleteSerializer(data=self.request.data)
        delete_serializer.is_valid(raise_exception=True)

        playlist_uuid = kwargs_serializer.validated_data.get("playlist_uuid")
        song_uuid = delete_serializer.validated_data.get("song_uuid")

        playlist = get_object_or_404(
            Playlist, owner=self.request.user, playlist_uuid=playlist_uuid
        )

        playlistsong_obj = get_object_or_404(
            PlaylistSong, playlist=playlist, song__song_uuid=song_uuid
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

    class ArtistQuerySerializer(serializers.Serializer):
        q = serializers.CharField(required=False, allow_blank=False)

    def get(self, *args, **kwargs):
        kwargs_serializer = self.ArtistKwargsSerializer(data=self.kwargs)
        kwargs_serializer.is_valid(raise_exception=True)

        query_serializer = self.ArtistQuerySerializer(data=self.request.query_params)
        query_serializer.is_valid(raise_exception=True)

        artist_uuid = kwargs_serializer.validated_data.get("artist_uuid")
        search_query = query_serializer.validated_data.get("q")

        user_obj = self.request.user

        if artist_uuid:
            artist_obj = get_object_or_404(
                Artist, created_by=user_obj, artist_uuid=artist_uuid
            )

            return formatted_response(
                data=ArtistModelSerializer(
                    artist_obj, context={"request": self.request}
                ).data,
                message="Artist fetched successfully",
                status=status.HTTP_200_OK,
            )

        artist_objs = Artist.objects.filter(created_by=user_obj).order_by("name")

        if search_query:
            artist_objs = artist_objs.filter(name__icontains=search_query)

        return paginated_response(
            queryset=artist_objs,
            request=self.request,
            serializer_class=ArtistModelSerializer,
            context={"request": self.request},
        )


class AlbumView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [CookieJWTAuthentication]

    class AlbumKwargsSerializer(serializers.Serializer):
        album_uuid = serializers.UUIDField(required=False, allow_null=True)

    class AlbumQuerySerializer(serializers.Serializer):
        q = serializers.CharField(required=False, allow_blank=False)

    def get(self, *args, **kwargs):
        kwargs_serializer = self.AlbumKwargsSerializer(data=self.kwargs)
        kwargs_serializer.is_valid(raise_exception=True)

        query_serializer = self.AlbumQuerySerializer(data=self.request.query_params)
        query_serializer.is_valid(raise_exception=True)

        album_uuid = kwargs_serializer.validated_data.get("album_uuid")
        search_query = query_serializer.validated_data.get("q")

        user_obj = self.request.user

        if album_uuid:
            album_obj = get_object_or_404(
                Album, created_by=user_obj, album_uuid=album_uuid
            )

            return formatted_response(
                data=AlbumModelSerializer(
                    album_obj, context={"request": self.request}
                ).data,
                message="Album fetched successfully",
                status=status.HTTP_200_OK,
            )

        album_objs = Album.objects.filter(created_by=user_obj).order_by("-created_at")

        if search_query:
            album_objs = album_objs.filter(title__icontains=search_query)

        return paginated_response(
            queryset=album_objs,
            request=self.request,
            serializer_class=AlbumModelSerializer,
            context={"request": self.request},
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


class PlaybackQueueView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [CookieJWTAuthentication]

    class QueueQuerySerializer(serializers.Serializer):
        artist_uuid = serializers.UUIDField(required=False, allow_null=False)
        album_uuid = serializers.UUIDField(required=False, allow_null=False)
        playlist_uuid = serializers.UUIDField(required=False, allow_null=False)
        q = serializers.CharField(required=False, allow_blank=False)
        shuffle = serializers.BooleanField(required=False, default=False)
        start_song_uuid = serializers.UUIDField(required=False, allow_null=False)

    def get(self, *args, **kwargs):
        user_obj = self.request.user
        query_serializer = self.QueueQuerySerializer(data=self.request.query_params)
        query_serializer.is_valid(raise_exception=True)

        artist_uuid = query_serializer.validated_data.get("artist_uuid")
        album_uuid = query_serializer.validated_data.get("album_uuid")
        playlist_uuid = query_serializer.validated_data.get("playlist_uuid")
        search_query = query_serializer.validated_data.get("q")
        shuffle = query_serializer.validated_data.get("shuffle")
        start_song_uuid = query_serializer.validated_data.get("start_song_uuid")

        # Base queryset for songs uploaded by the user
        song_objs = Song.objects.filter(
            uploaded_by=user_obj,
            is_uploaded_to_cloud=settings.STORAGE_BACKEND == "s3",
            is_upload_complete=True,
        )

        if playlist_uuid:
            playlist = get_object_or_404(
                Playlist, owner=user_obj, playlist_uuid=playlist_uuid
            )
            song_objs = Song.objects.filter(
                playlistsong__playlist=playlist,
                uploaded_by=user_obj,
                is_uploaded_to_cloud=settings.STORAGE_BACKEND == "s3",
                is_upload_complete=True,
            ).order_by("playlistsong__order")
        elif artist_uuid:
            song_objs = song_objs.filter(artist__artist_uuid=artist_uuid).order_by(
                "title"
            )
        elif album_uuid:
            song_objs = song_objs.filter(album__album_uuid=album_uuid).order_by("title")

        if search_query:
            song_objs = song_objs.filter(title__icontains=search_query)

        if shuffle:
            if start_song_uuid:
                # Get the specific song first
                first_song = song_objs.filter(song_uuid=start_song_uuid)
                # Get other songs shuffled
                other_songs = song_objs.exclude(song_uuid=start_song_uuid).order_by("?")

                queue_uuids = list(
                    first_song.values_list("song_uuid", flat=True)
                ) + list(other_songs.values_list("song_uuid", flat=True))
            else:
                song_objs = song_objs.order_by("?")
                queue_uuids = list(song_objs.values_list("song_uuid", flat=True))
        else:
            queue_uuids = list(song_objs.values_list("song_uuid", flat=True))

        return formatted_response(
            data={"queue": queue_uuids},
            status=status.HTTP_200_OK,
        )


class SharedSongsView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [CookieJWTAuthentication]

    class SharedSongKwargsSerializer(serializers.Serializer):
        shared_uuid = serializers.UUIDField(required=False, allow_null=False)

    class SharedSongPostSerializer(serializers.Serializer):
        song_uuid = serializers.UUIDField(required=True, allow_null=False)
        expire_at = serializers.DateTimeField(required=False, allow_null=True)

    class SharedSongPatchSerializer(serializers.Serializer):
        expire_at = serializers.DateTimeField(required=False, allow_null=True)

    def post(self, *args, **kwargs):
        post_serializer = self.SharedSongPostSerializer(data=self.request.data)
        post_serializer.is_valid(raise_exception=True)

        song_uuid = post_serializer.validated_data.get("song_uuid")
        expire_at = post_serializer.validated_data.get("expire_at")

        user_obj = self.request.user

        song = get_object_or_404(Song, song_uuid=song_uuid, uploaded_by=user_obj)

        try:
            temp_shared_song = SharedSong.objects.get(
                song=song, shared_by=self.request.user
            )

            if temp_shared_song.isExpired():
                temp_shared_song.delete()
            else:
                return formatted_response(
                    message="Song is already in the shared list",
                    status=status.HTTP_400_BAD_REQUEST,
                )

        except SharedSong.DoesNotExist:
            pass

        shared_song = SharedSong.objects.create(
            song=song,
            shared_by=user_obj,
            expire_at=expire_at,
        )

        return formatted_response(
            data=SharedSongModelSerializer(shared_song).data,
            message="Song shared successfully",
            status=status.HTTP_201_CREATED,
        )

    def patch(self, *args, **kwargs):
        kwargs_serializer = self.SharedSongKwargsSerializer(
            data=self.kwargs, required=True
        )
        kwargs_serializer.is_valid(raise_exception=True)

        shared_uuid = kwargs_serializer.validated_data.get("shared_uuid")

        try:
            shared_song_obj = SharedSong.objects.get(
                shared_uuid=shared_uuid, shared_by=self.request.user
            )
        except SharedSong.DoesNotExist:
            return formatted_response(
                message="Shared Song does not exist",
                status=status.HTTP_404_NOT_FOUND,
            )

        patch_serializer = self.SharedSongPatchSerializer(data=self.request.data)
        patch_serializer.is_valid(raise_exception=True)

        expire_at = patch_serializer.validated_data.get("expire_at")

        shared_song_obj.expire_at = expire_at

        shared_song_obj.save()

        return formatted_response(
            data=SharedSongModelSerializer(shared_song_obj).data,
            message="Shared Song updated",
            status=status.HTTP_200_OK,
        )

    def delete(self, *args, **kwargs):
        kwargs_serializer = self.SharedSongKwargsSerializer(
            data=self.kwargs, required=True
        )
        kwargs_serializer.is_valid(raise_exception=True)

        shared_uuid = kwargs_serializer.validated_data.get("shared_uuid")

        try:
            shared_song_obj = SharedSong.objects.get(
                shared_uuid=shared_uuid, shared_by=self.request.user
            )
        except SharedSong.DoesNotExist:
            return formatted_response(
                message="Shared Song does not exist",
                status=status.HTTP_404_NOT_FOUND,
            )

        shared_song_obj.delete()

        return formatted_response(
            message="Shared Song deleted successfully",
            status=status.HTTP_200_OK,
        )


class SharedSongStreamView(APIView):
    permission_classes = []
    authentication_classes = []

    class SharedSongStreamQuerySerializer(serializers.Serializer):
        direct = serializers.BooleanField(required=False, allow_null=True)

    class SharedSongStreamKwargsSerializer(serializers.Serializer):
        shared_uuid = serializers.UUIDField(required=True, allow_null=False)

    def get(self, *args, **kwargs):
        query_serializer = self.SharedSongStreamQuerySerializer(
            data=self.request.query_params
        )
        query_serializer.is_valid(raise_exception=True)
        direct = query_serializer.validated_data.get("direct")

        serializer = self.SharedSongStreamKwargsSerializer(data=self.kwargs)
        serializer.is_valid(raise_exception=True)

        shared_uuid = serializer.validated_data.get("shared_uuid")

        shared_song = get_object_or_404(SharedSong, shared_uuid=shared_uuid)

        if shared_song.isExpired():
            return formatted_response(
                message="Shared url has been expired",
                status=status.HTTP_400_BAD_REQUEST,
            )

        song_obj = shared_song.song

        # If 'direct' is present, stream the file content directly
        if direct:
            return stream_file(
                request=self.request,
                file_path=song_obj.file.name,
                content_type=song_obj.mime_type,
            )

        # Default to JSON response with metadata to reduce frontend API calls
        shared_song_data = SharedSongModelSerializer(
            shared_song, context={"request": self.request}
        ).data

        if settings.STORAGE_BACKEND == "s3":
            from music.services.s3_service import generate_presigned_url

            presigned_url = generate_presigned_url(song_obj.file.name)
            return JsonResponse(
                {
                    "url": presigned_url,
                    "type": song_obj.mime_type,
                    "shared_song": shared_song_data,
                }
            )
        else:
            # For local storage, provide the direct stream URL
            direct_url = self.request.build_absolute_uri() + "?direct=1"
            return JsonResponse(
                {
                    "url": direct_url,
                    "type": song_obj.mime_type,
                    "shared_song": shared_song_data,
                }
            )
