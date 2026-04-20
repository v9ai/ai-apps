import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || "my-car";
const R2_PUBLIC_DOMAIN = process.env.R2_PUBLIC_DOMAIN;

let _client: S3Client | null = null;

function client(): S3Client {
  if (!_client) {
    if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
      throw new Error(
        "Missing R2 credentials: set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY",
      );
    }
    _client = new S3Client({
      region: "auto",
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    });
  }
  return _client;
}

export interface UploadOptions {
  key: string;
  body: Buffer;
  contentType: string;
  metadata?: Record<string, string>;
}

export async function uploadToR2(opts: UploadOptions): Promise<void> {
  await client().send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: opts.key,
      Body: opts.body,
      ContentType: opts.contentType,
      Metadata: opts.metadata,
    }),
  );
}

export async function deleteFromR2(key: string): Promise<void> {
  await client().send(
    new DeleteObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key }),
  );
}

export async function getPresignedGetUrl(
  key: string,
  expiresIn = 3600,
): Promise<string> {
  return getSignedUrl(
    client(),
    new GetObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key }),
    { expiresIn },
  );
}

export function publicUrlFor(key: string): string | null {
  if (!R2_PUBLIC_DOMAIN) return null;
  const base = R2_PUBLIC_DOMAIN.replace(/\/$/, "");
  return `${base}/${key}`;
}

export function generateCarPhotoKey(carId: string, filename: string): string {
  const timestamp = Date.now();
  const rand = Math.random().toString(36).slice(2, 10);
  const ext = (filename.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  return `cars/${carId}/${timestamp}-${rand}.${ext || "jpg"}`;
}

export async function resolvePhotoUrl(key: string): Promise<string> {
  const pub = publicUrlFor(key);
  if (pub) return pub;
  return getPresignedGetUrl(key);
}
