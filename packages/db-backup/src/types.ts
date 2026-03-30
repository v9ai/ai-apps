export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
}

export interface BackupConfig {
  appName: string;
  databaseUrl: string;
  r2: R2Config;
  maxDurationMs: number;
  retentionDays: number;
}

export interface ColumnInfo {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
  udt_name: string;
  ordinal_position: number;
}

export interface ConstraintInfo {
  conname: string;
  definition: string;
}

export interface IndexInfo {
  indexname: string;
  indexdef: string;
}

export interface TableSchema {
  tableName: string;
  columns: ColumnInfo[];
  constraints: ConstraintInfo[];
  indexes: IndexInfo[];
}

export interface TableBackupResult {
  tableName: string;
  rowCount: number;
  sizeBytes: number;
  status: "complete" | "failed" | "skipped_timeout";
  error?: string;
}

export interface BackupManifest {
  app: string;
  date: string;
  startedAt: string;
  completedAt: string;
  status: "complete" | "partial" | "failed";
  tables: Record<string, TableBackupResult>;
  durationMs: number;
  packageVersion: string;
}
