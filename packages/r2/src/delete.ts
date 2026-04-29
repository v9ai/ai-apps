import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getR2Client } from "./client";

export async function deleteFromR2(
  key: string,
  opts: { bucket: string },
): Promise<void> {
  const { client } = getR2Client();
  await client.send(
    new DeleteObjectCommand({ Bucket: opts.bucket, Key: key }),
  );
}
