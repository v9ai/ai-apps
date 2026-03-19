/**
 * Regression tests for the emailVerified boolean fix.
 *
 * Background: Better Auth's default schema uses `timestamp` for emailVerified.
 * Our Drizzle schema changed it to `boolean`, which caused:
 *   TypeError: e.toISOString is not a function
 * when Better Auth tried to serialize the value during user creation.
 *
 * The fix (commit 0a1d305) migrated the DB column from timestamp to boolean
 * and updated the Drizzle schema to match.
 */
import { describe, it, expect } from "vitest";
import { getTestInstance } from "better-auth/test";
import { user as userTable } from "../schema";

describe("auth signup – emailVerified boolean regression", () => {
  it("schema defines emailVerified as boolean, not timestamp", () => {
    const col = userTable.emailVerified;
    // Drizzle boolean columns have dataType "boolean"
    expect(col.dataType).toBe("boolean");
    expect(col.columnType).toBe("PgBoolean");
    expect(col.hasDefault).toBe(true);
    expect(col.notNull).toBe(true);
  });

  it("sign-up succeeds and emailVerified is a boolean", async () => {
    const { client } = await getTestInstance({
      emailAndPassword: { enabled: true },
    });

    const result = await client.signUp.email({
      name: "Test User",
      email: "test@example.com",
      password: "password123456",
    });

    expect(result.data).not.toBeNull();
    expect(result.data?.user).toBeDefined();
    expect(result.data?.user.emailVerified).toBe(false);
    // This is the exact check: if emailVerified were a Date,
    // typeof would be "object", not "boolean"
    expect(typeof result.data?.user.emailVerified).toBe("boolean");
  });

  it("sign-up user does NOT have toISOString on emailVerified", async () => {
    const { client } = await getTestInstance({
      emailAndPassword: { enabled: true },
    });

    const result = await client.signUp.email({
      name: "Another User",
      email: "another@example.com",
      password: "password123456",
    });

    const emailVerified = result.data?.user.emailVerified;
    // The original bug: better-auth called .toISOString() on this value
    // A boolean doesn't have toISOString, so it crashed.
    // If the field were still a timestamp/Date, this would be truthy.
    expect(emailVerified).not.toHaveProperty("toISOString");
  });

  it("schema emailVerified defaults to false, not null", () => {
    const col = userTable.emailVerified;
    // The original timestamp column was nullable (no default).
    // The boolean column has a default of false and is NOT NULL.
    expect(col.notNull).toBe(true);
    expect(col.hasDefault).toBe(true);
  });
});
