from django.apps import AppConfig
from django.conf import settings

from utils.storage import ensure_bucket_exists


class MusicConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "music"

    def ready(self):
        if settings.STORAGE_BACKEND == "s3":
            ensure_bucket_exists(
                settings.AWS_STORAGE_BUCKET_NAME, settings.AWS_S3_REGION_NAME
            )
