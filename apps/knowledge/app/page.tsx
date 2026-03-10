import { getGroupedPapers, getAllPapers, getTotalWordCount, CATEGORIES } from "@/lib/articles";
import { Topbar } from "@/components/topbar";
import { Hero } from "@/components/hero";
import { CategoryGrid } from "@/components/category-grid";
import { Footer } from "@/components/footer";

export default function HomePage() {
  const groups = getGroupedPapers();
  const total = getAllPapers().length;
  const catCount = CATEGORIES.length;
  return (
    <div>
      <Topbar paperCount={total} />

      <Hero paperCount={total} domainCount={catCount} wordCount={getTotalWordCount()} />

      {/* Search + Bento Grid */}
      <div id="research">
        <CategoryGrid groups={groups} />
      </div>

      <Footer />
    </div>
  );
}
