import { useMemo } from "react";
import { ApolloClient, InMemoryCache, HttpLink } from "@apollo/client";
import merge from "deepmerge";

let apolloClient: ApolloClient<any> | undefined;

function createIsomorphLink() {
  return new HttpLink({
    uri:
      typeof window === "undefined"
        ? process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/graphql"
        : "/api/graphql",
    credentials: "same-origin",
  });
}

function createApolloClient() {
  return new ApolloClient({
    ssrMode: typeof window === "undefined",
    link: createIsomorphLink(),
    cache: new InMemoryCache(),
  });
}

export function initializeApollo(initialState = null) {
  const _apolloClient = apolloClient ?? createApolloClient();

  if (initialState) {
    const existingCache = _apolloClient.extract();
    const data = merge(initialState, existingCache);
    _apolloClient.cache.restore(data);
  }

  if (typeof window === "undefined") return _apolloClient;
  if (!apolloClient) apolloClient = _apolloClient;

  return _apolloClient;
}

export function useApollo(initialState: any = null) {
  const store = useMemo(() => initializeApollo(initialState), [initialState]);
  return store;
}
