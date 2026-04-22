import { config as loadDotenv } from "dotenv";

let loaded = false;

export function loadR2Env(): void {
  if (loaded) return;
  loaded = true;
  if (!process.env.R2_ACCOUNT_ID) {
    loadDotenv();
  }
}

export interface R2Env {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicDomain: string | null;
}

export function readR2Env(): R2Env {
  loadR2Env();
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET_NAME || "longform-tts";
  const publicDomain = process.env.R2_PUBLIC_DOMAIN || null;
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "R2 credentials not configured (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY)",
    );
  }
  return { accountId, accessKeyId, secretAccessKey, bucket, publicDomain };
}
