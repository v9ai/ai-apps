// `import schema from "./schema.graphql"` — wrangler `rules` entry of type
// "Text" turns .graphql files into raw strings at bundle time.
declare module "*.graphql" {
  const content: string;
  export default content;
}
