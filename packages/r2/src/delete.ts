import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getR2Client } from "./client";

export async function deleteFromR2(key: string): Promise<void> {
  const { client, bucket } = getR2Client();
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
