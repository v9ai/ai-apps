import { GetObjectCommand, GetObjectCommandOutput } from "@aws-sdk/client-s3";
import { getR2Client } from "./client";

export interface FileStreamResult {
  body: GetObjectCommandOutput["Body"];
  contentType: string | undefined;
  contentLength: number | undefined;
}

export async function getR2FileStream(
  key: string,
  opts: { bucket: string },
): Promise<FileStreamResult> {
  const { client } = getR2Client();
  const response = await client.send(
    new GetObjectCommand({ Bucket: opts.bucket, Key: key }),
  );
  return {
    body: response.Body,
    contentType: response.ContentType,
    contentLength: response.ContentLength,
  };
}
