import {
  S3Client,
  PutObjectCommand,
  PutObjectCommandInput,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || "longform-tts";
const R2_PUBLIC_DOMAIN = process.env.R2_PUBLIC_DOMAIN;

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
  console.warn("R2 credentials not configured");
}

const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID!,
    secretAccessKey: R2_SECRET_ACCESS_KEY!,
  },
});

export interface UploadOptions {
  key: string;
  body: Buffer;
  contentType?: string;
  metadata?: Record<string, string>;
}

export interface UploadResult {
  key: string;
  publicUrl: string | null;
  bucket: string;
  sizeBytes: number;
}

/**
 * Upload a file to Cloudflare R2
 */
export async function uploadToR2(
  options: UploadOptions,
): Promise<UploadResult> {
  const { key, body, contentType = "audio/mpeg", metadata = {} } = options;

  const uploadParams: PutObjectCommandInput = {
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: body,
    ContentType: contentType,
    Metadata: metadata,
  };

  await r2Client.send(new PutObjectCommand(uploadParams));

  // Generate public URL if domain is configured
  const publicUrl = R2_PUBLIC_DOMAIN ? `${R2_PUBLIC_DOMAIN}/${key}` : null;

  return {
    key,
    publicUrl,
    bucket: R2_BUCKET_NAME,
    sizeBytes: body.length,
  };
}

/**
 * Download a file from Cloudflare R2 as a Buffer
 */
export async function downloadFromR2(key: string): Promise<Buffer> {
  const response = await r2Client.send(
    new GetObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key }),
  );
  const chunks: Uint8Array[] = [];
  for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

/**
 * Delete a file from Cloudflare R2
 */
export async function deleteFromR2(key: string): Promise<void> {
  await r2Client.send(
    new DeleteObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key }),
  );
}

/**
 * Generate a presigned URL for private access (expires in 1 hour)
 */
export async function getPresignedUrl(key: string): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
  });

  return getSignedUrl(r2Client, command, { expiresIn: 3600 });
}

/**
 * Generate a key for storing audio files
 */
export function generateAudioKey(prefix?: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const key = `${prefix ? `${prefix}/` : ""}audio-${timestamp}-${random}.mp3`;
  return key;
}
