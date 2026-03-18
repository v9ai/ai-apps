"""Cloudflare R2 storage — upload & delete via boto3 (S3-compatible)."""

from __future__ import annotations

import boto3
from config import settings

_client = boto3.client(
    "s3",
    region_name="auto",
    endpoint_url=f"https://{settings.r2_account_id}.r2.cloudflarestorage.com",
    aws_access_key_id=settings.r2_access_key_id,
    aws_secret_access_key=settings.r2_secret_access_key,
)


def upload_file(key: str, body: bytes, content_type: str) -> None:
    _client.put_object(
        Bucket=settings.r2_bucket_name,
        Key=key,
        Body=body,
        ContentType=content_type,
    )


def delete_file(key: str) -> None:
    _client.delete_object(
        Bucket=settings.r2_bucket_name,
        Key=key,
    )
