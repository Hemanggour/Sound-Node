from rest_framework import serializers

from music.models import Song


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
            "mimeType",
            "uploadedBy",
            "isUploadedToCloud",
        ]
        read_only_fields = ["song_uuid", "isUploadedToCloud"]

    def create(self, validated_data):
        return super().create(validated_data)
