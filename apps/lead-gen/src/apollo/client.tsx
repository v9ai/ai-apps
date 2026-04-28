"use client";

import { useMemo } from "react";
import {
  ApolloClient,
  InMemoryCache,
  HttpLink,
  ApolloProvider,
  split,
  type ApolloLink,
} from "@apollo/client";
import { GraphQLWsLink } from "@apollo/client/link/subscriptions";
import { getMainDefinition } from "@apollo/client/utilities";
import { createClient } from "graphql-ws";
import merge from "deepmerge";

// Re-export ApolloProvider for convenience
export { ApolloProvider };

let apolloClient: ApolloClient<any> | undefined;

const GATEWAY_HTTP_URL =
  "https://agenticleadgen-gateway.eeeew.workers.dev/graphql";
const GATEWAY_WS = process.env.NEXT_PUBLIC_GATEWAY_WS_URL ?? "";

// Anonymous read queries served by the Cloudflare gateway against Neon
// directly. Must match the gateway's OWNED_OPS in
// apps/lead-gen/gateway/src/config.ts. Mutations and auth-gated queries stay
// on Vercel where Better Auth cookies flow same-origin.
const OWNED_GATEWAY_FIELDS = new Set([
  "productBySlug",
  "productIntelRun",
  "productIntelRuns",
]);

function createIsomorphLink(): ApolloLink {
  // SSR: always direct to Vercel; no routing logic needed.
  if (typeof window === "undefined") {
    return new HttpLink({
      uri:
        process.env.NEXT_PUBLIC_API_URL ||
        "http://localhost:3000/api/graphql",
      credentials: "include",
    });
  }

  const vercelHttpLink = new HttpLink({
    uri: "/api/graphql",
    credentials: "include",
  });
  const gatewayHttpLink = new HttpLink({
    uri: GATEWAY_HTTP_URL,
    // No `credentials` — cross-origin cookies wouldn't flow to *.workers.dev
    // anyway, and these reads are anonymous (public_read RLS in Neon).
  });

  const httpLink = split(
    ({ query }) => {
      const def = getMainDefinition(query);
      if (def.kind !== "OperationDefinition") return false;
      if (def.operation !== "query") return false;
      const first = def.selectionSet.selections.find(
        (s) => s.kind === "Field",
      );
      return (
        first?.kind === "Field" && OWNED_GATEWAY_FIELDS.has(first.name.value)
      );
    },
    gatewayHttpLink,
    vercelHttpLink,
  );

  if (!GATEWAY_WS) return httpLink;

  const wsLink = new GraphQLWsLink(
    createClient({
      url: GATEWAY_WS,
      lazy: true,
      retryAttempts: 5,
    }),
  );

  return split(
    ({ query }) => {
      const def = getMainDefinition(query);
      return (
        def.kind === "OperationDefinition" &&
        def.operation === "subscription"
      );
    },
    wsLink,
    httpLink,
  );
}

function createApolloClient() {
  return new ApolloClient({
    ssrMode: typeof window === "undefined",
    link: createIsomorphLink(),
    cache: new InMemoryCache({
      typePolicies: {
        Query: {
          fields: {
            jobs: {
              keyArgs: ["sourceType", "sourceTypes", "search", "excludedCompanies", "skills", "remoteEuConfidence"],
              merge(existing, incoming, { args }) {
                if (!incoming) return existing;
                if (!existing || !args?.offset) {
                  return incoming;
                }
                return {
                  ...incoming,
                  jobs: [...existing.jobs, ...incoming.jobs],
                };
              },
            },
            companies: {
              keyArgs: ["filter", "order_by"],
              merge(existing, incoming, { args }) {
                if (!incoming) return existing;
                if (!existing || !args?.offset) {
                  return incoming;
                }
                return {
                  ...incoming,
                  companies: [...existing.companies, ...incoming.companies],
                };
              },
            },
            contacts: {
              keyArgs: ["companyId", "search"],
              merge(existing, incoming, { args }) {
                if (!incoming) return existing;
                if (!existing || !args?.offset) {
                  return incoming;
                }
                return {
                  ...incoming,
                  contacts: [...existing.contacts, ...incoming.contacts],
                };
              },
            },
            emailCampaigns: {
              keyArgs: ["status"],
              merge(existing, incoming, { args }) {
                if (!incoming) return existing;
                if (!existing || !args?.offset) {
                  return incoming;
                }
                return {
                  ...incoming,
                  campaigns: [...existing.campaigns, ...incoming.campaigns],
                };
              },
            },
            emailTemplates: {
              keyArgs: ["category"],
              merge(existing, incoming, { args }) {
                if (!incoming) return existing;
                if (!existing || !args?.offset) {
                  return incoming;
                }
                return {
                  ...incoming,
                  templates: [...existing.templates, ...incoming.templates],
                };
              },
            },
            receivedEmails: {
              keyArgs: ["archived", "classification"],
              merge(existing, incoming, { args }) {
                if (!incoming) return existing;
                if (!existing || !args?.offset) {
                  return incoming;
                }
                return {
                  ...incoming,
                  emails: [...existing.emails, ...incoming.emails],
                };
              },
            },
            emailsNeedingFollowUp: {
              keyArgs: false,
              merge(existing, incoming, { args }) {
                if (!incoming) return existing;
                if (!existing || !args?.offset) {
                  return incoming;
                }
                return {
                  ...incoming,
                  emails: [...existing.emails, ...incoming.emails],
                };
              },
            },
          },
        },
        Job: {
          keyFields: ["id"],
        },
        Company: {
          keyFields: ["id"],
        },
        Contact: {
          keyFields: ["id"],
        },
        EmailCampaign: {
          keyFields: ["id"],
        },
        EmailTemplate: {
          keyFields: ["id"],
        },
        ReceivedEmail: {
          keyFields: ["id"],
        },
        CompanyFact: {
          keyFields: ["id"],
        },
        CompanySnapshot: {
          keyFields: ["id"],
        },
        IntentSignal: {
          keyFields: ["id"],
        },
        LinkedInPost: {
          keyFields: ["id"],
        },
        UserSettings: {
          keyFields: ["id"],
        },
        ContactEmail: {
          keyFields: ["id"],
        },
        FollowUpEmail: {
          keyFields: ["id"],
        },
      },
    }),
  });
}

export function initializeApollo(initialState = null) {
  const _apolloClient = apolloClient ?? createApolloClient();

  // If your page has Next.js data fetching methods that use Apollo Client, the initial state
  // gets hydrated here
  if (initialState) {
    // Get existing cache, loaded during client side data fetching
    const existingCache = _apolloClient.extract();

    // Merge the existing cache into data passed from getStaticProps/getServerSideProps
    const data = merge(initialState, existingCache);

    // Restore the cache with the merged data
    _apolloClient.cache.restore(data);
  }
  // For SSG and SSR always create a new Apollo Client
  if (typeof window === "undefined") return _apolloClient;
  // Create the Apollo Client once in the client
  if (!apolloClient) apolloClient = _apolloClient;

  return _apolloClient;
}

export function useApollo(initialState: any = null) {
  const store = useMemo(() => initializeApollo(initialState), [initialState]);
  return store;
}
