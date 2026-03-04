import { print } from "graphql";
import type { TypedDocumentNode } from "@graphql-typed-document-node/core";

async function gqlFetch<TData, TVariables>(
  document: TypedDocumentNode<TData, TVariables>,
  variables: TVariables,
  accessToken: string,
): Promise<TData> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/graphql/v1`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ query: print(document), variables }),
    },
  );
  const json = await res.json();
  if (json.errors?.length) throw new Error(json.errors[0].message);
  return json.data as TData;
}

export async function gqlQuery<TData, TVariables>(
  document: TypedDocumentNode<TData, TVariables>,
  variables: TVariables,
  accessToken: string,
): Promise<TData> {
  return gqlFetch(document, variables, accessToken);
}

export async function gqlMutate<TData, TVariables>(
  document: TypedDocumentNode<TData, TVariables>,
  variables: TVariables,
  accessToken: string,
): Promise<TData> {
  return gqlFetch(document, variables, accessToken);
}
