import { createRequire } from "module";

const require = createRequire(import.meta.url);

const nextCoreWebVitals = require("eslint-config-next/core-web-vitals");
const nextTypescript = require("eslint-config-next/typescript");

/** @type {import("eslint").Linter.Config[]} */
const config = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          args: "after-used",
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
        },
      ],
      // React Compiler advisory rules — valid React patterns that the compiler
      // can't auto-optimize. Kept as warnings for visibility, not errors.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
    },
  },
  {
    ignores: [
      "src/__generated__/**",
      "styled-system/**",
      ".next/**",
      "node_modules/**",
      "consultancies/**",
      "dist/**",
      "build/**",
      "crates/**",
      "chrome-extension/**",
      "backend/**",
      "mlx-training/**",
      "migrations/**",
      "scripts/**/*.py",
    ],
  },
];

export default config;
