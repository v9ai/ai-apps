import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getR2Client } from "./client";

export async function downloadFromR2(
  key: string,
  opts: { bucket: string },
): Promise<Buffer> {
  const { client } = getR2Client();
  const response = await client.send(
    new GetObjectCommand({ Bucket: opts.bucket, Key: key }),
  );
  const chunks: Uint8Array[] = [];
  for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
