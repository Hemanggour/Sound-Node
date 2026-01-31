import re

from django.conf import settings
from django.core.files.storage import default_storage
from django.http import StreamingHttpResponse, HttpResponse, JsonResponse
from rest_framework import status

RANGE_RE = re.compile(r"bytes=(\d+)-(\d*)", re.I)
CHUNK_SIZE = settings.CHUNK_SIZE


def file_iterator(file, start, length, chunk_size=CHUNK_SIZE):
    file.seek(start)
    remaining = length

    while remaining > 0:
        read_size = min(chunk_size, remaining)
        data = file.read(read_size)
        if not data:
            break
        remaining -= len(data)
        yield data


def stream_file(request, file_path, content_type):
    if not default_storage.exists(file_path):
        return HttpResponse("File doesn't exist!", status=404)

    # 🔹 S3 → return presigned URL
    if settings.STORAGE_BACKEND == "s3":
        from music.services.s3_service import generate_presigned_url

        presigned_url = generate_presigned_url(file_path, expires=3600)
        return JsonResponse({
            "url": presigned_url,
            "type": content_type
        })

    file_size = default_storage.size(file_path)
    range_header = request.headers.get("Range")

    # 🔹 No Range header → stream normally
    if not range_header:
        response = StreamingHttpResponse(
            default_storage.open(file_path, "rb"),
            content_type=content_type,
        )
        response["Accept-Ranges"] = "bytes"
        response["Content-Length"] = str(file_size)
        return response

    # 🔹 Parse range
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

    response = StreamingHttpResponse(
        file_iterator(file, start, length),
        status=206,
        content_type=content_type,
    )

    response["Content-Range"] = f"bytes {start}-{end}/{file_size}"
    response["Accept-Ranges"] = "bytes"
    response["Content-Length"] = str(length)

    return response
