import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PRODUCT_INTEL_VERSION } from "../intelVersion";

describe("PRODUCT_INTEL_VERSION parity", () => {
  it("matches backend/leadgen_agent/product_intel_schemas.py", () => {
    const pyPath = resolve(
      __dirname,
      "../../../backend/leadgen_agent/product_intel_schemas.py",
    );
    const py = readFileSync(pyPath, "utf8");
    const match = py.match(/^PRODUCT_INTEL_VERSION\s*=\s*"([^"]+)"/m);
    expect(match, "PRODUCT_INTEL_VERSION assignment not found in Python source").not.toBeNull();
    expect(match![1]).toBe(PRODUCT_INTEL_VERSION);
  });
});
