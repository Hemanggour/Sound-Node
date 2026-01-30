from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from account.views import (
    LoginView,
    PasswordChangeView,
    ProfileView,
    RegisterView,
)

urlpatterns = [
    path("login/", LoginView.as_view(), name="login_view"),
    path("register/", RegisterView.as_view(), name="register_view"),
    path("token/refresh/", TokenRefreshView.as_view(), name="refresh_view"),
    path("change-password/", PasswordChangeView.as_view(), name="password_change_view"),
    path("profile/", ProfileView.as_view(), name="profile_view"),
]
