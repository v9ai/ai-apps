import { AnalyzerContent } from "../../_content";

function buildListingUrl(source: string, id: string): string {
  if (source === "999") return `https://999.md/ro/${id}`;
  return "";
}

export default async function ListingPage({
  params,
}: {
  params: Promise<{ source: string; id: string }>;
}) {
  const { source, id } = await params;
  const url = buildListingUrl(source, id);
  return <AnalyzerContent initialUrl={url} />;
}
