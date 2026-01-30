from storages.backends.s3boto3 import S3Boto3Storage
from django.conf import settings

class PublicS3Boto3Storage(S3Boto3Storage):
    """
    S3 storage backend that rewrites internal MinIO URLs to public ones.
    """
    def url(self, name, parameters=None, expire=None, http_method=None):
        url = super().url(name, parameters, expire, http_method)
        
        public_endpoint = getattr(settings, 'AWS_S3_PUBLIC_ENDPOINT_URL', None)
        internal_endpoint = getattr(settings, 'AWS_S3_ENDPOINT_URL', None)
        
        if public_endpoint and internal_endpoint and internal_endpoint in url:
            url = url.replace(internal_endpoint, public_endpoint)
            
        return url
