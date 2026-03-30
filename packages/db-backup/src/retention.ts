import type { S3Client } from "@aws-sdk/client-s3";
import { listPrefixes, listAllKeys, deleteKeys } from "./r2.js";

export async function cleanupOldBackups(
  client: S3Client,
  bucket: string,
  appName: string,
  retentionDays: number,
): Promise<string[]> {
  const prefix = `${appName}/`;
  const datePrefixes = await listPrefixes(client, bucket, prefix);

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - retentionDays);
  const cutoffStr = cutoff.toISOString().slice(0, 10); // YYYY-MM-DD

  const deleted: string[] = [];

  for (const datePrefix of datePrefixes) {
    // Extract date from prefix like "research-thera/2026-03-30/"
    const parts = datePrefix.replace(prefix, "").replace(/\/$/, "");
    if (parts < cutoffStr) {
      const keys = await listAllKeys(client, bucket, datePrefix);
      if (keys.length > 0) {
        await deleteKeys(client, bucket, keys);
        deleted.push(datePrefix);
      }
    }
  }

  return deleted;
}
