from rest_framework import serializers

from account.models import User


class UserModelSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "user_uuid",
            "email",
            "username",
            "password",
        ]
        read_only_fields = ["user_uuid"]
        extra_kwargs = {
            "password": {
                "required": True,
                "write_only": True,
            },
        }

    def validate(self, data):
        if User.objects.filter(email=data.get("email")).exists():
            raise serializers.ValidationError(
                {"email": "A user with this email already exists."}
            )
        return data

    def create(self, validated_data):
        query = {
            "username": validated_data.get("username"),
            "email": validated_data.get("email"),
        }
        user = User.objects.create(**query)
        user.set_password(validated_data.get("password"))
        user.save()
        return user
