import { HeadObjectCommand, HeadObjectCommandOutput } from "@aws-sdk/client-s3";
import { getR2Client } from "./client";

export interface HeadResult {
  audioUrl: string | null;
  metadata: Record<string, string> | null;
  raw: HeadObjectCommandOutput;
}

export async function headR2Object(key: string): Promise<HeadResult> {
  const { client, bucket, publicDomain } = getR2Client();
  const response = await client.send(
    new HeadObjectCommand({ Bucket: bucket, Key: key }),
  );
  return {
    audioUrl: publicDomain ? `${publicDomain}/${key}` : null,
    metadata: response.Metadata ?? null,
    raw: response,
  };
}
