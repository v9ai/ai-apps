import { getAllPapers, getGroupedPapers, getTotalWordCount, CATEGORIES } from "@/lib/data";
import { Topbar } from "@/components/topbar";
import { Hero } from "@/components/hero";
import { CategoryGrid } from "@/components/category-grid";
import { Footer } from "@/components/footer";

export default async function HomePage() {
  const groups = await getGroupedPapers();
  const allPapers = await getAllPapers();
  const total = allPapers.length;
  const catCount = CATEGORIES.length;
  const wordCount = await getTotalWordCount();
  return (
    <div>
      <Topbar paperCount={total} />

      <Hero paperCount={total} domainCount={catCount} wordCount={wordCount} />

      {/* Search + Bento Grid */}
      <div id="research">
        <CategoryGrid groups={groups} />
      </div>

      <Footer />
    </div>
  );
}
