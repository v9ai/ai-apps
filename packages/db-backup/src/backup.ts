import type { BackupConfig, BackupManifest, TableBackupResult } from "./types.js";
import { createR2Client, uploadToR2 } from "./r2.js";
import { discoverTables, getTableSchema, exportTableData } from "./introspect.js";
import { cleanupOldBackups } from "./retention.js";

const PACKAGE_VERSION = "0.1.0";

export async function runBackup(config: BackupConfig): Promise<BackupManifest> {
  const startedAt = new Date();
  const dateStr = startedAt.toISOString().slice(0, 10);
  const r2 = createR2Client(config.r2);
  const bucket = config.r2.bucketName;
  const prefix = `${config.appName}/${dateStr}`;

  const tables: Record<string, TableBackupResult> = {};
  let overallStatus: BackupManifest["status"] = "complete";

  try {
    const tableNames = await discoverTables(config.databaseUrl);
    console.log(`[backup] ${config.appName}: found ${tableNames.length} tables`);

    for (const tableName of tableNames) {
      const elapsed = Date.now() - startedAt.getTime();
      if (elapsed > config.maxDurationMs * 0.8) {
        console.log(`[backup] timeout approaching, skipping remaining tables`);
        tables[tableName] = {
          tableName,
          rowCount: 0,
          sizeBytes: 0,
          status: "skipped_timeout",
        };
        overallStatus = "partial";
        continue;
      }

      try {
        // Export schema
        const schema = await getTableSchema(config.databaseUrl, tableName);
        const schemaJson = JSON.stringify(schema, null, 2);
        await uploadToR2(r2, bucket, `${prefix}/schema/${tableName}.json`, schemaJson);

        // Export data
        const { jsonl, rowCount } = await exportTableData(config.databaseUrl, tableName);
        let sizeBytes = 0;
        if (jsonl.length > 0) {
          sizeBytes = await uploadToR2(r2, bucket, `${prefix}/data/${tableName}.jsonl`, jsonl);
        }

        tables[tableName] = { tableName, rowCount, sizeBytes, status: "complete" };
        console.log(`[backup] ${tableName}: ${rowCount} rows, ${sizeBytes} bytes`);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        tables[tableName] = {
          tableName,
          rowCount: 0,
          sizeBytes: 0,
          status: "failed",
          error: message,
        };
        overallStatus = "partial";
        console.error(`[backup] ${tableName} failed: ${message}`);
      }
    }
  } catch (err) {
    overallStatus = "failed";
    console.error(`[backup] discovery failed: ${err}`);
  }

  const completedAt = new Date();
  const manifest: BackupManifest = {
    app: config.appName,
    date: dateStr,
    startedAt: startedAt.toISOString(),
    completedAt: completedAt.toISOString(),
    status: overallStatus,
    tables,
    durationMs: completedAt.getTime() - startedAt.getTime(),
    packageVersion: PACKAGE_VERSION,
  };

  // Upload manifest
  try {
    await uploadToR2(r2, bucket, `${prefix}/manifest.json`, JSON.stringify(manifest, null, 2));
  } catch (err) {
    console.error(`[backup] manifest upload failed: ${err}`);
  }

  // Retention cleanup
  try {
    const deleted = await cleanupOldBackups(r2, bucket, config.appName, config.retentionDays);
    if (deleted.length > 0) {
      console.log(`[backup] cleaned up ${deleted.length} old backups`);
    }
  } catch (err) {
    console.error(`[backup] retention cleanup failed: ${err}`);
  }

  return manifest;
}
