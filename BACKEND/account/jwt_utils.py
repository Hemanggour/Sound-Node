from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer


class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user_obj):
        token = super().get_token(user_obj)
        token["user"] = {
            "username": user_obj.username,
            "email": user_obj.email,
        }
        return token


def generate_jwt_for_user(user):
    token = MyTokenObtainPairSerializer.get_token(user)
    tokens = {
        "refresh": str(token),
        "access": str(token.access_token),
    }
    return {"tokens": tokens}


class CookieJWTAuthentication(JWTAuthentication):
    """
    Custom JWT authentication that reads the access token from cookies
    instead of the Authorization header.
    """

    def authenticate(self, request):
        # Try to get token from cookies first
        access = request.COOKIES.get("access")

        if access:
            # Set it in the request as if it came from the Authorization header
            request.META["HTTP_AUTHORIZATION"] = f"Bearer {access}"
            try:
                # Call the parent authenticate method to validate the token
                result = super().authenticate(request)
                return result
            except AuthenticationFailed:
                # Token is invalid, re-raise the exception
                raise

        # If no token in cookies, return None to allow other auth methods
        return None
