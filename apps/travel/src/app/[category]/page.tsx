import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { VALID_CATEGORIES, CATEGORY_META, isValidCategory, type Category } from "@/lib/categories";
import { data, getPlacesByCategory } from "@/lib/data";
import { TravelPageContent } from "@/components/TravelPageContent";

export function generateStaticParams() {
  return VALID_CATEGORIES.map((category) => ({ category }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  if (!isValidCategory(category)) return {};

  const meta = CATEGORY_META[category];
  const count = getPlacesByCategory(category).length;

  return {
    title: `${meta.label} in ${data.city}`,
    description: `${count} ${meta.label.toLowerCase()} places to visit in ${data.city}, Poland.`,
    openGraph: {
      title: `${meta.label} \u2014 ${data.city} Travel Guide`,
      description: `Explore ${count} curated ${meta.label.toLowerCase()} spots in ${data.city}.`,
    },
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  if (!isValidCategory(category)) {
    notFound();
  }
  return <TravelPageContent category={category} />;
}
