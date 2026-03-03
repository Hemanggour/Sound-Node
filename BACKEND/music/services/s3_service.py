import boto3
from django.conf import settings


def generate_presigned_url(object_path, expires=settings.S3_PRESIGNED_URL_EXPIRATION):
    """
    Generate a presigned URL for accessing an S3 object.
    Uses the PUBLIC endpoint so browsers can directly access the file.

    Args:
        object_path: The S3 object key/path
        expires: URL expiration time in seconds (default: 1 hour)

    Returns:
        Presigned URL string (with public endpoint)
    """
    # Use public endpoint for browser access, fall back to internal if not set
    endpoint_for_generation = (
        settings.AWS_S3_PUBLIC_ENDPOINT_URL or settings.AWS_S3_ENDPOINT_URL
    )

    s3 = boto3.client(
        "s3",
        endpoint_url=endpoint_for_generation,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_S3_REGION_NAME,
    )

    url = s3.generate_presigned_url(
        "get_object",
        Params={
            "Bucket": settings.AWS_STORAGE_BUCKET_NAME,
            "Key": object_path,
        },
        ExpiresIn=expires,
    )

    return url


def generate_internal_presigned_url(
    object_path, expires=settings.S3_PRESIGNED_URL_EXPIRATION
):
    """
    Generate a presigned URL for backend-to-backend communication within Docker.
    Uses the INTERNAL endpoint for Docker service-to-service communication.

    Args:
        object_path: The S3 object key/path
        expires: URL expiration time in seconds (default: 1 hour)

    Returns:
        Presigned URL string (with internal endpoint)
    """
    # Use internal endpoint for backend communication
    endpoint_for_generation = settings.AWS_S3_ENDPOINT_URL

    s3 = boto3.client(
        "s3",
        endpoint_url=endpoint_for_generation,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_S3_REGION_NAME,
    )

    url = s3.generate_presigned_url(
        "get_object",
        Params={
            "Bucket": settings.AWS_STORAGE_BUCKET_NAME,
            "Key": object_path,
        },
        ExpiresIn=expires,
    )

    return url
