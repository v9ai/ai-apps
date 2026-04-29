import { PutObjectCommand, PutObjectCommandInput } from "@aws-sdk/client-s3";
import { getR2Client } from "./client";

export interface UploadOptions {
  key: string;
  body: Buffer | Uint8Array;
  bucket: string;
  contentType?: string;
  metadata?: Record<string, string>;
}

export interface UploadResult {
  key: string;
  publicUrl: string | null;
  bucket: string;
  sizeBytes: number;
}

export async function uploadToR2(
  options: UploadOptions,
): Promise<UploadResult> {
  const ctx = getR2Client();
  const {
    key,
    body,
    bucket,
    contentType = "application/octet-stream",
    metadata = {},
  } = options;

  const uploadParams: PutObjectCommandInput = {
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
    Metadata: metadata,
  };

  await ctx.client.send(new PutObjectCommand(uploadParams));

  return {
    key,
    publicUrl: ctx.publicDomain ? `${ctx.publicDomain}/${key}` : null,
    bucket,
    sizeBytes: body.length,
  };
}
