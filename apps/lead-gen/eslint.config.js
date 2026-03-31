import { nextConfig } from "eslint-config-next/core-web-vitals";
import { typescriptConfig } from "eslint-config-next/typescript";

/** @type {import("eslint").Linter.Config[]} */
const config = [
  ...nextConfig,
  ...typescriptConfig,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  {
    ignores: ["src/__generated__/**"],
  },
];

export default config;
