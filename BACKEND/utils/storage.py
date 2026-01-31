import boto3
from botocore.exceptions import ClientError
from django.conf import settings
from storages.backends.s3boto3 import S3Boto3Storage


class PublicS3Boto3Storage(S3Boto3Storage):
    """
    S3 storage backend that rewrites internal MinIO URLs to public ones.
    """

    def url(self, name, parameters=None, expire=None, http_method=None):
        url = super().url(name, parameters, expire, http_method)

        public_endpoint = getattr(settings, "AWS_S3_PUBLIC_ENDPOINT_URL", None)
        internal_endpoint = getattr(settings, "AWS_S3_ENDPOINT_URL", None)

        if public_endpoint and internal_endpoint and internal_endpoint in url:
            url = url.replace(internal_endpoint, public_endpoint)

        return url


def ensure_bucket_exists(
    bucket_name: str,
    region: str | None = None,
):
    s3 = boto3.client(
        "s3",
        endpoint_url=settings.AWS_S3_ENDPOINT_URL,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_S3_REGION_NAME,
    )

    try:
        s3.head_bucket(Bucket=bucket_name)
        print(f"Bucket '{bucket_name}' already exists")

    except ClientError as e:
        error_code = int(e.response["Error"]["Code"])

        # Bucket does not exist
        if error_code == 404:
            create_params = {"Bucket": bucket_name}

            # AWS requires region for non us-east-1
            if region:
                create_params["CreateBucketConfiguration"] = {
                    "LocationConstraint": region
                }

            s3.create_bucket(**create_params)
            print(f"Bucket '{bucket_name}' created")

        else:
            raise
