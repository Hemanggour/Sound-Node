import io
import uuid

from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from PIL import Image


def create_thumbnail(image_bytes, size=(200, 200)):
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

        # Resize
        img.thumbnail(size)

        # Save to buffer
        buffer = io.BytesIO()
        img.save(buffer, format="JPEG", quality=85)
        buffer.seek(0)

        # Generate unique filename
        filename = f"thumbnails/{uuid.uuid4()}.jpg"

        # Save to storage
        path = default_storage.save(filename, ContentFile(buffer.read()))

        return path
    except Exception as e:
        print(f"Error creating thumbnail: {e}")
        return None
