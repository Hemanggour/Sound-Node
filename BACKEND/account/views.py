from rest_framework import serializers, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.views import APIView

from account.jwt_utils import CookieJWTAuthentication, generate_jwt_for_user
from account.models import User
from account.serializers import UserModelSerializer
from utils.response_wrapper import formatted_response

# Create your views here.


class LoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    class LoginPostSerializer(serializers.Serializer):
        email = serializers.EmailField(required=True, allow_blank=False)
        password = serializers.CharField(required=True, allow_blank=False)

    def post(self, *args, **kwargs):
        serializer = self.LoginPostSerializer(data=self.request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data.get("email")
        password = serializer.validated_data.get("password")

        try:
            user_obj = User.objects.get(email=email)
        except User.DoesNotExist:
            return formatted_response(
                message={"error": "User not found"}, status=status.HTTP_404_NOT_FOUND
            )

        if not user_obj.check_password(password):
            return formatted_response(
                message={"error": "Invalid password"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        token_and_user = generate_jwt_for_user(user_obj)

        response = formatted_response(
            data=token_and_user,
            status=status.HTTP_200_OK,
        )

        # Set access token as HTTP-only cookie
        response.set_cookie(
            key="access",
            value=token_and_user["tokens"]["access"],
            httponly=True,
            secure=False,
            samesite="Lax",
            path="/",
            max_age=86400,  # 1 day to match token lifetime
        )

        # Set refresh token as HTTP-only cookie
        response.set_cookie(
            key="refresh",
            value=token_and_user["tokens"]["refresh"],
            httponly=True,
            secure=False,
            samesite="Lax",
            path="/",
            max_age=604800,  # 7 days to match token lifetime
        )

        return response


class RegisterView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    class RegisterPostSerializer(serializers.Serializer):
        email = serializers.EmailField(required=True, allow_blank=False)
        username = serializers.CharField(required=True, allow_blank=False)
        password = serializers.CharField(
            required=True, allow_blank=False, write_only=True
        )

    def post(self, *args, **kwargs):
        register_post_serializer = self.RegisterPostSerializer(data=self.request.data)
        register_post_serializer.is_valid(raise_exception=True)

        user_serializer = UserModelSerializer(
            data=register_post_serializer.validated_data
        )
        user_serializer.is_valid(raise_exception=True)
        user_obj = user_serializer.save()

        token_and_user = generate_jwt_for_user(user_obj)

        response = formatted_response(
            data=token_and_user,
            status=status.HTTP_201_CREATED,
        )

        # Set access token as HTTP-only cookie
        response.set_cookie(
            key="access",
            value=token_and_user["tokens"]["access"],
            httponly=True,
            secure=False,
            samesite="Lax",
            path="/",
            max_age=86400,  # 1 day to match token lifetime
        )

        # Set refresh token as HTTP-only cookie
        response.set_cookie(
            key="refresh",
            value=token_and_user["tokens"]["refresh"],
            httponly=True,
            secure=False,
            samesite="Lax",
            path="/",
            max_age=604800,  # 7 days to match token lifetime
        )

        return response


class PasswordChangeView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [CookieJWTAuthentication]

    class PasswordChangePostSerializer(serializers.Serializer):
        old_password = serializers.CharField(required=True, allow_blank=False)
        new_password = serializers.CharField(required=True, allow_blank=False)

    def post(self, *args, **kwargs):
        post_serializer = self.PasswordChangePostSerializer(data=self.request.data)
        post_serializer.is_valid(raise_exception=True)

        old_password = post_serializer.validated_data.get("old_password")
        new_password = post_serializer.validated_data.get("new_password")

        user_obj = self.request.user

        if not user_obj.check_password(old_password):
            return formatted_response(
                message={"error": "Invalid password"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user_obj.set_password(new_password)
        user_obj.save()

        return formatted_response(
            message={"success": "Password changed successfully"},
            status=status.HTTP_200_OK,
        )


class ProfileView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [CookieJWTAuthentication]

    class ProfilePatchSerializer(serializers.Serializer):
        username = serializers.CharField(max_length=50, required=False)

    def get(self, *args, **kwargs):
        user_obj = self.request.user

        try:
            user_obj = User.objects.get(id=user_obj.id)
        except User.DoesNotExist:
            return formatted_response(
                message={"error": "User not found"}, status=status.HTTP_404_NOT_FOUND
            )

        return formatted_response(
            data=UserModelSerializer(user_obj).data,
            status=status.HTTP_200_OK,
        )

    def patch(self, *args, **kwargs):
        patch_serializer = self.ProfilePatchSerializer(data=self.request.data)
        patch_serializer.is_valid(raise_exception=True)
        username = patch_serializer.validated_data.get("username", None)

        user_obj = self.request.user

        try:
            user_obj = User.objects.get(id=user_obj.id)
        except User.DoesNotExist:
            return formatted_response(
                message={"error": "User not found"}, status=status.HTTP_404_NOT_FOUND
            )

        if username:
            user_obj.username = username

            user_obj.save()

        return formatted_response(
            data=UserModelSerializer(user_obj).data,
            status=status.HTTP_200_OK,
        )
