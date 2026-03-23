import { getGroupedLessons } from "@/lib/data";
import { Topbar } from "@/components/topbar";
import { Hero } from "@/components/hero";
import { Search } from "@/components/search";
import { Footer } from "@/components/footer";

export default async function HomePage() {
  const groups = await getGroupedLessons();
  const allLessons = groups.flatMap((g) => g.articles);
  const total = allLessons.length;
  const catCount = groups.length;
  const wordCount = allLessons.reduce((sum, l) => sum + l.wordCount, 0);
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
