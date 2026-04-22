import { PutObjectCommand, PutObjectCommandInput } from "@aws-sdk/client-s3";
import { getR2Client } from "./client";

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

export async function uploadToR2(
  options: UploadOptions,
): Promise<UploadResult> {
  const { client, bucket, publicDomain } = getR2Client();
  const { key, body, contentType = "audio/mpeg", metadata = {} } = options;

  const uploadParams: PutObjectCommandInput = {
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
    Metadata: metadata,
  };

  await client.send(new PutObjectCommand(uploadParams));

  return {
    key,
    publicUrl: publicDomain ? `${publicDomain}/${key}` : null,
    bucket,
    sizeBytes: body.length,
  };
}
