import { S3Client } from "@aws-sdk/client-s3";
import { readR2Env } from "./env";

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicDomain?: string | null;
}

export interface R2Context {
  client: S3Client;
  publicDomain: string | null;
}

export function createR2Client(config: R2Config): R2Context {
  const client = new S3Client({
    region: "auto",
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
  return {
    client,
    publicDomain: config.publicDomain ?? null,
  };
}

let cached: R2Context | null = null;

export function getR2Client(): R2Context {
  if (cached) return cached;
  const env = readR2Env();
  cached = createR2Client({
    accountId: env.accountId,
    accessKeyId: env.accessKeyId,
    secretAccessKey: env.secretAccessKey,
    publicDomain: env.publicDomain,
  });
  return cached;
}
