from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

User = get_user_model()


class Command(BaseCommand):
    help = "Create SuperUser"

    def handle(self, *args, **options):
        user_obj, is_created = User.objects.get_or_create(
            email=settings.SUPERUSER_EMAIL,
            defaults={
                "username": settings.SUPERUSER_USERNAME,
                "is_active": True,
                "is_staff": True,
                "is_superuser": True,
            },
        )

        if is_created:
            user_obj.set_password(settings.SUPERUSER_PASSWORD)
            user_obj.save()
