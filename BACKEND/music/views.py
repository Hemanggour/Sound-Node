from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from rest_framework import serializers, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from account.jwt_utils import CookieJWTAuthentication
from music.models import Song
from music.serializers import SongModelSerializer
from music.services.streaming_service import stream_file
from music.services.upload_service import upload_song
from utils.response_wrapper import formatted_response

# Create your views here.


User = get_user_model()


class SongView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [CookieJWTAuthentication]

    def get(self, *args, **kwargs):
        user_obj = self.request.user

        song_objs = Song.objects.filter(uploadedBy=user_obj)

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


class SongStreamView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [CookieJWTAuthentication]

    class StreamKwargsSerializer(serializers.Serializer):
        song_uuid = serializers.UUIDField(required=True, allow_null=False)

    def get(self, *args, **kwargs):

        kwargs_serializer = self.StreamKwargsSerializer(data=kwargs)
        kwargs_serializer.is_valid(raise_exception=True)

        song_uuid = kwargs_serializer.validated_data.get("song_uuid")

        song = get_object_or_404(Song, song_uuid=song_uuid)

        return stream_file(
            request=self.request,
            file_path=song.file.name,
            content_type=song.mimeType,
        )
