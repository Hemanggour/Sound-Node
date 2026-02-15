from django.conf import settings
from rest_framework import serializers

from music.models import Album, Artist, Playlist, PlaylistSong, Song


class SongModelSerializer(serializers.ModelSerializer):
    artist_name = serializers.CharField(source="artist.name")

    class Meta:
        model = Song
        fields = [
            "song_uuid",
            "title",
            "file",
            "artist_name",
            "album",
            "duration",
            "size",
            "mime_type",
            "uploaded_by",
            "thumbnail",
        ]
        read_only_fields = ["song_uuid", "is_uploaded_to_cloud"]

    def create(self, validated_data):
        return super().create(validated_data)

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        request = self.context.get("request")

        if request:
            if instance.thumbnail:
                representation["thumbnail"] = request.build_absolute_uri(
                    instance.thumbnail.url
                )
            if instance.file:
                representation["file"] = request.build_absolute_uri(instance.file.url)

        return representation


class PlaylistSongModelSerializer(serializers.ModelSerializer):
    song = SongModelSerializer(read_only=True)

    class Meta:
        model = PlaylistSong
        fields = [
            "playlist_song_uuid",
            "playlist",
            "song",
            "added_at",
        ]
        read_only_fields = ["playlist_song_uuid", "added_at"]

    def create(self, validated_data):
        return super().create(validated_data)


class PlaylistModelSerializer(serializers.ModelSerializer):
    songs = serializers.SerializerMethodField()

    class Meta:
        model = Playlist
        fields = [
            "playlist_uuid",
            "name",
            "created_at",
            "songs",
        ]
        read_only_fields = ["playlist_uuid", "created_at"]

    def create(self, validated_data):
        return super().create(validated_data)

    def get_songs(self, obj):
        return PlaylistSongModelSerializer(
            PlaylistSong.objects.filter(
                playlist=obj,
                song__is_uploaded_to_cloud=settings.STORAGE_BACKEND == "s3",
                song__is_upload_complete=True,
            ).order_by("order"),
            many=True,
            context=self.context,
        ).data


class ArtistModelSerializer(serializers.ModelSerializer):
    class Meta:
        model = Artist
        fields = [
            "artist_uuid",
            "name",
            "created_by",
            "created_at",
        ]
        read_only_fields = ["artist_uuid", "created_by", "created_at"]

    def create(self, validated_data):
        return super().create(validated_data)


class ArtistSongModelSerializer(serializers.ModelSerializer):
    songs = serializers.SerializerMethodField()

    class Meta:
        model = Artist
        fields = [
            "artist_uuid",
            "name",
            "created_by",
            "created_at",
            "songs",
        ]

        read_only_fields = ["artist_uuid", "created_by", "created_at"]

    def create(self, validated_data):
        return super().create(validated_data)

    def get_songs(self, obj):
        return SongModelSerializer(
            Song.objects.filter(
                artist=obj,
                is_uploaded_to_cloud=settings.STORAGE_BACKEND == "s3",
                is_upload_complete=True,
            ),
            many=True,
            context=self.context,
        ).data


class AlbumModelSerializer(serializers.ModelSerializer):
    class Meta:
        model = Album
        fields = [
            "album_uuid",
            "artist",
            "title",
            "cover_image",
            "release_year",
            "created_by",
            "created_at",
        ]

        read_only_fields = [
            "album_uuid",
            "artist",
            "cover_image",
            "release_year",
            "created_by",
            "created_at",
        ]

    def create(self, validated_data):
        return super().create(validated_data)

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        request = self.context.get("request")

        if request and instance.cover_image:
            representation["cover_image"] = request.build_absolute_uri(
                instance.cover_image.url
            )

        return representation


class AlbumSongModelSerializer(serializers.ModelSerializer):
    songs = serializers.SerializerMethodField()

    class Meta:
        model = Album
        fields = [
            "album_uuid",
            "artist",
            "title",
            "cover_image",
            "release_year",
            "created_by",
            "created_at",
            "songs",
        ]

        read_only_fields = [
            "album_uuid",
            "artist",
            "cover_image",
            "release_year",
            "created_by",
            "created_at",
        ]

    def create(self, validated_data):
        return super().create(validated_data)

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        request = self.context.get("request")

        if request and instance.cover_image:
            representation["cover_image"] = request.build_absolute_uri(
                instance.cover_image.url
            )

        return representation

    def get_songs(self, obj):
        return SongModelSerializer(
            Song.objects.filter(
                album=obj,
                is_uploaded_to_cloud=settings.STORAGE_BACKEND == "s3",
                is_upload_complete=True,
            ),
            many=True,
            context=self.context,
        ).data
