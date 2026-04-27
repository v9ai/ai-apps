/**
 * Single source of truth for the SDL — `src/schema.graphql` is fed to
 * graphql-codegen for type generation; we re-import the same string at runtime
 * so Apollo Server and codegen never drift.
 */
import schema from "../schema.graphql";

export const typeDefs = schema;
