import boto3
from django.conf import settings


def generate_presigned_url(object_path, expires=3600):
    """
    Generate a presigned URL for accessing an S3 object.
    
    Args:
        object_path: The S3 object key/path
        expires: URL expiration time in seconds (default: 1 hour)
    
    Returns:
        Presigned URL string
    """
    s3 = boto3.client(
        "s3",
        endpoint_url=settings.AWS_S3_ENDPOINT_URL,
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

    # Rewrite internal URL to public URL if needed
    public_endpoint = getattr(settings, "AWS_S3_PUBLIC_ENDPOINT_URL", None)
    internal_endpoint = settings.AWS_S3_ENDPOINT_URL
    
    if public_endpoint and internal_endpoint and internal_endpoint in url:
        url = url.replace(internal_endpoint, public_endpoint)
        
    return url
