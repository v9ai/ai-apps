"use client";

import { ApolloProvider as BaseApolloProvider } from "@apollo/client";
import { useApollo } from "../lib/apollo-client";

export function ApolloProvider({ children }: { children: React.ReactNode }) {
  const apolloClient = useApollo();

  return (
    <BaseApolloProvider client={apolloClient}>
      {children}
    </BaseApolloProvider>
  );
}
