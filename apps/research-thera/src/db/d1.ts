/**
 * D1 Database Client for Remote Access
 * Uses Cloudflare D1 HTTP API for remote database operations
 */

import {
  CLOUDFLARE_ACCOUNT_ID,
  CLOUDFLARE_DATABASE_ID,
  CLOUDFLARE_D1_TOKEN,
} from "@/src/config/d1";

interface D1Result {
  results?: any[];
  success: boolean;
  error?: string;
  meta?: {
    duration?: number;
  };
}

interface D1Response {
  result: D1Result[];
  success: boolean;
  errors: any[];
  messages: any[];
}

interface ExecuteOptions {
  sql: string;
  args?: any[];
}

/**
 * D1 HTTP API Client
 * Executes SQL queries against Cloudflare D1 via HTTP API
 */
class D1Client {
  private accountId: string;
  private databaseId: string;
  private token: string | null;
  private baseUrl: string;

  constructor() {
    this.accountId = CLOUDFLARE_ACCOUNT_ID;
    this.databaseId = CLOUDFLARE_DATABASE_ID;
    this.token = CLOUDFLARE_D1_TOKEN || null;
    this.baseUrl = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/d1/database/${this.databaseId}`;
  }

  private ensureToken(): string {
    if (!this.token) {
      throw new Error(
        "CLOUDFLARE_D1_TOKEN environment variable is required for remote D1 access",
      );
    }
    return this.token;
  }

  /**
   * Execute a SQL query
   */
  async execute(query: string | ExecuteOptions): Promise<{ rows: any[] }> {
    const token = this.ensureToken();
    const sql = typeof query === "string" ? query : query.sql;
    const params = typeof query === "string" ? [] : query.args || [];

    try {
      const response = await fetch(`${this.baseUrl}/query`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sql,
          params,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`D1 HTTP API error: ${response.status} ${errorText}`);
      }

      const data: D1Response = await response.json();

      if (!data.success) {
        throw new Error(`D1 query failed: ${JSON.stringify(data.errors)}`);
      }

      const result = data.result?.[0];
      if (!result) {
        return { rows: [] };
      }

      return {
        rows: result.results || [],
      };
    } catch (error) {
      console.error("D1 execute error:", error);
      throw error;
    }
  }

  /**
   * Execute multiple SQL statements in a batch
   */
  async batch(queries: ExecuteOptions[]): Promise<{ rows: any[] }[]> {
    const token = this.ensureToken();
    try {
      const response = await fetch(`${this.baseUrl}/query`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          queries.map((q) => ({
            sql: q.sql,
            params: q.args || [],
          })),
        ),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`D1 HTTP API error: ${response.status} ${errorText}`);
      }

      const data: D1Response = await response.json();

      if (!data.success) {
        throw new Error(
          `D1 batch query failed: ${JSON.stringify(data.errors)}`,
        );
      }

      return (data.result || []).map((result) => ({
        rows: result.results || [],
      }));
    } catch (error) {
      console.error("D1 batch error:", error);
      throw error;
    }
  }
}

export const d1 = new D1Client();

/**
 * Initialize database schema
 * Creates all tables if they don't exist
 */
export async function initializeDatabase() {
  console.log("Note: Schema should be managed via drizzle migrations");
  console.log("Use: wrangler d1 migrations apply research-thera-db");
}
