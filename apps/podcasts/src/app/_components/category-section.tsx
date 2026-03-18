import { getCategoryColor, type Category } from "@/lib/personalities";
import { PersonalityTile } from "./personality-tile";

type Props = {
  category: Category;
};

export function CategorySection({ category }: Props) {
  const gradient = getCategoryColor(category.slug);

  return (
    <section id={category.slug} className="mb-12 scroll-mt-20">
      <div
        className="h-px mb-6"
        style={{
          backgroundImage:
            "linear-gradient(to right, transparent, rgba(255,255,255,0.06), transparent)",
        }}
      />

      <div className="flex items-center gap-3 mb-4">
        <div
          className={`w-[3px] h-5 rounded-full shrink-0 bg-gradient-to-b ${gradient}`}
        />
        <h2 className="text-lg font-semibold tracking-[-0.01em] text-ink-primary">
          {category.title}
        </h2>
        <span className="text-[0.6875rem] uppercase tracking-[0.08em] font-medium text-ink-muted bg-[rgba(255,255,255,0.04)] px-2.5 py-0.5 rounded-full border border-[rgba(255,255,255,0.06)]">
          {category.personalities.length}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {category.personalities.map((p, i) => (
          <div
            key={p.slug}
            className="animate-stagger-in"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <PersonalityTile personality={p} accentGradient={gradient} />
          </div>
        ))}
      </div>
    </section>
  );
}
