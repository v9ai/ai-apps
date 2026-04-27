import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  schema: "src/schema.graphql",
  generates: {
    "src/__generated__/resolvers-types.ts": {
      plugins: ["typescript", "typescript-resolvers"],
      config: {
        contextType: "../graphql/context#GatewayContext",
        scalars: {
          DateTime: "string",
          JSON: "any",
        },
        useIndexSignature: true,
      },
    },
  },
};

export default config;
