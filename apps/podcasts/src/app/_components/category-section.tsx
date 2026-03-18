import { getCategoryColor, type Category } from "@/lib/personalities";
import { PersonalityTile } from "./personality-tile";

type Props = {
  category: Category;
};

export function CategorySection({ category }: Props) {
  const gradient = getCategoryColor(category.slug);

  return (
    <section id={category.slug} className="mb-14 scroll-mt-20">
      {/* Gradient divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-white/[0.04] to-transparent mb-8" />

      {/* Section header */}
      <div className="flex items-center gap-3 mb-5">
        <div
          className={`w-1 h-6 rounded-full bg-gradient-to-b ${gradient}`}
        />
        <h2 className="text-lg font-bold tracking-tight text-white">
          {category.title}
        </h2>
        <span className="text-[11px] text-neutral-500 font-medium bg-white/[0.05] px-2.5 py-0.5 rounded-full border border-white/[0.04]">
          {category.personalities.length}
        </span>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {category.personalities.map((p, i) => (
          <div
            key={p.slug}
            className="animate-stagger-in"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <PersonalityTile
              personality={p}
              accentGradient={gradient}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
