import type { CodegenConfig } from "@graphql-codegen/cli";
import { defineConfig } from "@eddeee888/gcg-typescript-resolver-files";

const config: CodegenConfig = {
  schema: "schema/**/*.graphql",
  documents: [
    "app/**/*.{ts,tsx,graphql}",
    "!app/__generated__/**/*",
    "schema/**/operations/**/*.graphql",
  ],
  ignoreNoDocuments: true,
  generates: {
    // Server-side: Generate typed resolvers
    schema: defineConfig({
      typesPluginsConfig: {
        contextType: "../app/apollo/context#GraphQLContext",
        mappers: {
          BloodTest: "../src/db/healthcare#BloodTest as BloodTestRow",
          MedicalLetter: "../src/db/healthcare#MedicalLetter as MedicalLetterRow",
          FamilyDocument: "../src/db/healthcare#FamilyDocument as FamilyDocumentRow",
        },
      },
    }),
    // Client-side: Generate typed queries/mutations with gql function and React hooks
    "./app/__generated__/": {
      preset: "client",
      presetConfig: {
        gqlTagName: "gql",
      },
    },
    "./app/__generated__/hooks.tsx": {
      plugins: [
        "typescript",
        "typescript-operations",
        "typescript-react-apollo",
      ],
      config: {
        withHooks: true,
        withComponent: false,
        withHOC: false,
      },
    },
  },
};

export default config;
