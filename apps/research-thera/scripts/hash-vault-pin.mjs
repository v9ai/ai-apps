#!/usr/bin/env node
// Usage: node scripts/hash-vault-pin.mjs <pin>
// Prints a scrypt hash suitable for JOURNAL_VAULT_PIN in .env.local

import { randomBytes, scryptSync } from "node:crypto";

const pin = process.argv[2];
if (!pin) {
  console.error("Usage: node scripts/hash-vault-pin.mjs <pin>");
  process.exit(1);
}

const b64url = (buf) =>
  buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const salt = randomBytes(16);
const hash = scryptSync(pin, salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });

console.log(`scrypt$${b64url(salt)}$${b64url(hash)}`);
