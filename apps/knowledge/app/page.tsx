import { getAllLessons, getGroupedLessons, getTotalWordCount, getCategoryCount } from "@/lib/data";
import { Topbar } from "@/components/topbar";
import { Hero } from "@/components/hero";
import { Search } from "@/components/search";
import { Footer } from "@/components/footer";

export default async function HomePage() {
  const [groups, allLessons, catCount, wordCount] = await Promise.all([
    getGroupedLessons(),
    getAllLessons(),
    getCategoryCount(),
    getTotalWordCount(),
  ]);
  const total = allLessons.length;
  return (
    <div>
      <Topbar lessonCount={total} />

      <Hero lessonCount={total} domainCount={catCount} wordCount={wordCount} />

      {/* Search + Bento Grid */}
      <div id="lessons">
        <Search groups={groups} />
      </div>

      <Footer />
    </div>
  );
}
