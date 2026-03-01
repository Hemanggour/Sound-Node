import re

from django.conf import settings
from django.core.files.storage import default_storage
from django.http import HttpResponse, JsonResponse, StreamingHttpResponse
from rest_framework import status

RANGE_RE = re.compile(r"bytes=(\d+)-(\d*)", re.I)
CHUNK_SIZE = settings.CHUNK_SIZE


def file_iterator(file, start, length, chunk_size=CHUNK_SIZE):
    """Iterator for streaming file chunks"""
    try:
        file.seek(start)
        remaining = length

        while remaining > 0:
            read_size = min(chunk_size, remaining)
            data = file.read(read_size)
            if not data:
                break
            remaining -= len(data)
            yield data
    finally:
        file.close()


def stream_file(request, file_path, content_type):
    if not default_storage.exists(file_path):
        return HttpResponse("File doesn't exist!", status=status.HTTP_404_NOT_FOUND)

    # S3 → return presigned URL as JSON (works better with Range requests)
    if settings.STORAGE_BACKEND == "s3":
        from music.services.s3_service import generate_presigned_url

        presigned_url = generate_presigned_url(file_path)
        # Return presigned URL as JSON so frontend can set it directly as audio src
        # This allows the audio element to properly handle Range requests for seeking
        return JsonResponse({"url": presigned_url, "type": content_type})

    file_size = default_storage.size(file_path)
    range_header = request.headers.get("Range")

    # HTTP Range support for efficient streaming and seeking
    if not range_header:
        # No Range header → stream from start
        file = default_storage.open(file_path, "rb")
        response = StreamingHttpResponse(
            file_iterator(file, 0, file_size),
            content_type=content_type,
        )
        response["Accept-Ranges"] = "bytes"
        response["Content-Length"] = str(file_size)
        response["Cache-Control"] = "public, max-age=3600"
        return response

    # Parse range header
    match = RANGE_RE.match(range_header)
    if not match:
        return HttpResponse(status=status.HTTP_416_REQUESTED_RANGE_NOT_SATISFIABLE)

    start = int(match.group(1))
    end = match.group(2)
    end = int(end) if end else file_size - 1

    if start >= file_size or start < 0:
        return HttpResponse(status=status.HTTP_416_REQUESTED_RANGE_NOT_SATISFIABLE)

    length = end - start + 1
    file = default_storage.open(file_path, "rb")

    # Partial content response
    response = StreamingHttpResponse(
        file_iterator(file, start, length),
        status=status.HTTP_206_PARTIAL_CONTENT,
        content_type=content_type,
    )

    response["Content-Range"] = f"bytes {start}-{end}/{file_size}"
    response["Accept-Ranges"] = "bytes"
    response["Content-Length"] = str(length)
    response["Cache-Control"] = "public, max-age=3600"

    return response
