import { CategorySection } from "@/app/_components/category-section";
import { categories, getAllPersonalities } from "@/lib/personalities";

export default function Index() {
  const total = getAllPersonalities().length;
  const totalPodcasts = getAllPersonalities().reduce(
    (acc, p) => acc + p.podcasts.length,
    0
  );

  return (
    <main className="min-h-screen">
      {/* ── Sticky nav ────────────────────────────────────── */}
      <nav className="fixed top-0 w-full z-50 bg-[#050505]/80 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <svg
              viewBox="0 0 24 24"
              className="w-6 h-6 text-spotify"
              fill="currentColor"
            >
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
            </svg>
            <span className="font-semibold text-sm text-white">
              AI Podcast Index
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-4 text-xs text-neutral-500">
            <span>{total} personalities</span>
            <span className="w-px h-3 bg-white/10" />
            <span>{categories.length} categories</span>
            <span className="w-px h-3 bg-white/10" />
            <span>{totalPodcasts} appearances</span>
          </div>
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────────────── */}
      <div className="pt-14">
        <div className="max-w-7xl mx-auto px-6">
          <div className="hero-glow">
            <section className="pt-16 md:pt-20 pb-12">
              <div className="flex items-start gap-6">
                {/* Animated sound bars */}
                <div className="hidden md:flex items-end gap-[3px] h-16 pt-6 flex-shrink-0">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="w-[3px] bg-spotify rounded-full"
                      style={{
                        animation: `sound-bar ${1.0 + i * 0.1}s ease-in-out ${i * 0.12}s infinite`,
                        height: "10px",
                      }}
                    />
                  ))}
                </div>

                <div>
                  <h1 className="text-5xl md:text-6xl lg:text-7xl font-black tracking-tight leading-[0.95]">
                    <span className="text-white">AI </span>
                    <span className="text-gradient-green">Podcast</span>
                    <br className="hidden sm:block" />
                    <span className="text-white"> Index</span>
                  </h1>
                  <p className="text-neutral-400 text-base md:text-lg mt-5 max-w-2xl leading-relaxed">
                    {total} voices shaping the AI landscape — indexed by podcast
                    appearances, technical depth, and industry impact.
                  </p>
                </div>
              </div>

              {/* Category quick-nav pills */}
              <div className="flex flex-wrap gap-2 mt-10">
                {categories.map((cat) => (
                  <a
                    key={cat.slug}
                    href={`#${cat.slug}`}
                    className="px-3.5 py-1.5 rounded-full text-xs font-medium bg-white/[0.04] text-neutral-400 hover:bg-white/[0.1] hover:text-white border border-white/[0.06] transition-all duration-200"
                  >
                    {cat.title}
                    <span className="ml-1.5 text-neutral-600">
                      {cat.personalities.length}
                    </span>
                  </a>
                ))}
              </div>
            </section>
          </div>

          {/* Divider between hero and first category */}
          <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent mb-10" />

          {/* ── Category sections ─────────────────────────── */}
          {categories.map((cat) => (
            <CategorySection key={cat.slug} category={cat} />
          ))}

          <div className="pb-16" />
        </div>
      </div>
    </main>
  );
}
