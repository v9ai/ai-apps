import {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";
import type { R2Config } from "./types.js";

export function createR2Client(config: R2Config): S3Client {
  return new S3Client({
    region: "auto",
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

export async function uploadToR2(
  client: S3Client,
  bucket: string,
  key: string,
  body: string,
): Promise<number> {
  const buffer = Buffer.from(body, "utf-8");
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: "application/json",
    }),
  );
  return buffer.length;
}

export async function listPrefixes(
  client: S3Client,
  bucket: string,
  prefix: string,
): Promise<string[]> {
  const prefixes: string[] = [];
  let continuationToken: string | undefined;

  do {
    const response = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        Delimiter: "/",
        ContinuationToken: continuationToken,
      }),
    );

    if (response.CommonPrefixes) {
      for (const cp of response.CommonPrefixes) {
        if (cp.Prefix) prefixes.push(cp.Prefix);
      }
    }

    continuationToken = response.NextContinuationToken;
  } while (continuationToken);

  return prefixes;
}

export async function listAllKeys(
  client: S3Client,
  bucket: string,
  prefix: string,
): Promise<string[]> {
  const keys: string[] = [];
  let continuationToken: string | undefined;

  do {
    const response = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }),
    );

    if (response.Contents) {
      for (const obj of response.Contents) {
        if (obj.Key) keys.push(obj.Key);
      }
    }

    continuationToken = response.NextContinuationToken;
  } while (continuationToken);

  return keys;
}

export async function deleteKeys(
  client: S3Client,
  bucket: string,
  keys: string[],
): Promise<void> {
  // DeleteObjects supports up to 1000 keys per call
  for (let i = 0; i < keys.length; i += 1000) {
    const batch = keys.slice(i, i + 1000);
    await client.send(
      new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: {
          Objects: batch.map((key) => ({ Key: key })),
          Quiet: true,
        },
      }),
    );
  }
}
