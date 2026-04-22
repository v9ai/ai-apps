import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getR2Client } from "./client";

export async function getPresignedUrl(
  key: string,
  expiresIn = 3600,
  opts: { bucket?: string } = {},
): Promise<string> {
  const { client, bucket } = getR2Client();
  const command = new PutObjectCommand({
    Bucket: opts.bucket ?? bucket,
    Key: key,
  });
  return getSignedUrl(
    client as Parameters<typeof getSignedUrl>[0],
    command as Parameters<typeof getSignedUrl>[1],
    { expiresIn },
  );
}
