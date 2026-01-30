import re

from django.conf import settings
from django.core.files.storage import default_storage
from django.http import FileResponse, HttpResponse, JsonResponse
from rest_framework import status

RANGE_RE = re.compile(r"bytes=(\d+)-(\d*)", re.I)


def stream_file(request, file_path, content_type):
    """
    Stream a file from storage.
    
    For S3 storage: Returns JSON with presigned URL (client fetches directly from S3)
    For local storage: Proxies the file through Django with range request support
    """
    
    if not default_storage.exists(file_path):
        return HttpResponse("File Doesn't exist!", status=status.HTTP_404_NOT_FOUND)

    # For S3 storage, return presigned URL in JSON response
    # The frontend will use this URL to fetch the audio directly
    if settings.STORAGE_BACKEND == "s3":
        from music.services.s3_service import generate_presigned_url
        
        # Generate presigned URL valid for 1 hour
        presigned_url = generate_presigned_url(file_path, expires=3600)
        return JsonResponse({
            "url": presigned_url,
            "type": content_type
        })

    # For local storage, handle streaming with range support
    file_size = default_storage.size(file_path)
    range_header = request.headers.get("Range")

    # 🔹 No range → normal streaming
    if not range_header:
        response = FileResponse(
            default_storage.open(file_path, "rb"),
            content_type=content_type,
        )
        response["Accept-Ranges"] = "bytes"
        return response

    # 🔹 Range request
    match = RANGE_RE.match(range_header)
    if not match:
        return HttpResponse(status=416)

    start = int(match.group(1))
    end = match.group(2)
    end = int(end) if end else file_size - 1

    if start >= file_size:
        return HttpResponse(status=416)

    length = end - start + 1

    file = default_storage.open(file_path, "rb")
    file.seek(start)

    data = file.read(length)

    response = HttpResponse(
        data,
        status=206,
        content_type=content_type,
    )

    response["Content-Range"] = f"bytes {start}-{end}/{file_size}"
    response["Accept-Ranges"] = "bytes"
    response["Content-Length"] = str(length)

    return response
