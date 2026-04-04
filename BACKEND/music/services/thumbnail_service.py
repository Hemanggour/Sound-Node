import io
import uuid

from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from PIL import Image


def create_thumbnail(image_bytes, size=None):
    """
    Creates a thumbnail from raw image bytes and saves it to storage.
    Returns the relative path to the saved thumbnail.
    """
    if not image_bytes:
        return None

    try:
        # Load image from bytes
        img = Image.open(io.BytesIO(image_bytes))

        # Convert to RGB if necessary (e.g., for PNG with transparency)
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")

        # Get settings
        thumbnail_settings = getattr(settings, "THUMBNAIL_SETTINGS", {})
        thumbnail_size = size or thumbnail_settings.get("SIZE", (200, 200))
        thumbnail_format = thumbnail_settings.get("FORMAT", "JPEG")
        thumbnail_quality = thumbnail_settings.get("QUALITY", 95)
        thumbnail_optimize = thumbnail_settings.get("OPTIMIZE", True)

        # Resize
        img.thumbnail(thumbnail_size)

        # Save to buffer
        buffer = io.BytesIO()

        # Prepare save arguments based on format
        save_kwargs = {"format": thumbnail_format}

        if thumbnail_format.upper() == "JPEG":
            save_kwargs.update(
                {"quality": thumbnail_quality, "optimize": thumbnail_optimize}
            )
        elif thumbnail_format.upper() == "PNG":
            save_kwargs.update({"optimize": thumbnail_optimize})
        elif thumbnail_format.upper() == "WEBP":
            save_kwargs.update(
                {"quality": thumbnail_quality, "optimize": thumbnail_optimize}
            )

        img.save(buffer, **save_kwargs)
        buffer.seek(0)

        # Generate unique filename with appropriate extension
        extension = thumbnail_format.lower().replace("jpeg", "jpg")
        filename = f"thumbnails/{uuid.uuid4()}.{extension}"

        # Save to storage
        path = default_storage.save(filename, ContentFile(buffer.read()))

        return path
    except Exception as e:
        print(f"Error creating thumbnail: {e}")
        return None
