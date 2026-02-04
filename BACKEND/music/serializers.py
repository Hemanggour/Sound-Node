from rest_framework import serializers

from music.models import Playlist, PlaylistSong, Song


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
        ]
        read_only_fields = ["song_uuid", "is_uploaded_to_cloud"]

    def create(self, validated_data):
        return super().create(validated_data)


class PlaylistSongModelSerializer(serializers.ModelSerializer):
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
        read_only_fields = ["playlist_uuid", "created_at", "songs"]

    def create(self, validated_data):
        return super().create(validated_data)

    def get_songs(self, playlist_obj):
        return PlaylistSongModelSerializer(
            PlaylistSong.objects.filter(playlist=playlist_obj), many=True
        ).data
