import { textToSql } from "@/lib/langgraph-client";

const SQL_INSTRUCTIONS = `You are a PostgreSQL expert for the nomadically.work database (Neon PostgreSQL). Generate queries that answer user questions about jobs, companies, and related data. When the user asks general questions, prioritise queries that surface fully-remote AI/React engineering roles in the EU or worldwide.`;

export const sqlAgent = {
  async generate(
    question: string,
    _opts?: { maxSteps?: number; structuredOutput?: { schema: unknown } },
  ) {
    const result = await textToSql(question);
    return { object: { sql: result.sql, explanation: result.explanation } };
  },
};
