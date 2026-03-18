import Link from "next/link";
import {
  getAvatarUrl,
  getInitials,
  type Personality,
} from "@/lib/personalities";

type FeaturedStoryProps = {
  personality: Personality;
  quote: string;
  categoryName: string;
};

export function FeaturedStory({
  personality,
  quote,
  categoryName,
}: FeaturedStoryProps) {
  const avatar = getAvatarUrl(personality);
  const initials = getInitials(personality.name);

  return (
    <Link
      href={`/person/${personality.slug}`}
      className="group block featured-card overflow-hidden"
      style={{ animation: "fade-in 0.8s ease-out both" }}
    >
      {/* Warm radial glow background */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_50%,rgba(212,168,83,0.06),transparent_70%)]" />
      </div>

      <div className="relative py-10 px-6 md:py-16 md:px-8 lg:px-12">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-8 md:gap-12">
          {/* ── Portrait column (40%) ─────────────────────── */}
          <div className="flex-shrink-0 md:w-[40%] flex flex-col items-center">
            {avatar ? (
              <img
                src={avatar}
                alt={personality.name}
                width={200}
                height={200}
                className="w-[140px] h-[140px] md:w-[200px] md:h-[200px] rounded-full object-cover portrait-frame group-hover:scale-[1.03] transition-transform duration-500"
              />
            ) : (
              <div
                className="w-[140px] h-[140px] md:w-[200px] md:h-[200px] rounded-full portrait-frame flex items-center justify-center bg-gradient-to-br from-amber-900/40 to-amber-700/20 group-hover:scale-[1.03] transition-transform duration-500"
              >
                <span className="text-4xl md:text-5xl font-bold text-amber-200/70 select-none">
                  {initials}
                </span>
              </div>
            )}

            {/* Category pill — below portrait on mobile, visible on all sizes */}
            <span className="category-pill mt-5">
              {categoryName}
            </span>
          </div>

          {/* ── Quote + info column (60%) ─────────────────── */}
          <div className="md:w-[60%] flex flex-col justify-center text-center md:text-left">
            {/* Quote block */}
            <blockquote
              className="story-quote"
              style={{ animation: "quote-reveal 0.7s ease-out 0.3s both" }}
            >
              {/* Decorative opening quote mark */}
              <span
                className="absolute -top-2 -left-1 text-6xl md:text-7xl leading-none select-none pointer-events-none font-[family-name:var(--font-playfair)]"
                style={{ color: "rgba(212, 168, 83, 0.3)" }}
                aria-hidden="true"
              >
                {"\u201C"}
              </span>

              <p className="text-2xl md:text-3xl font-[family-name:var(--font-playfair)] italic text-neutral-200 leading-relaxed">
                {quote}
              </p>
            </blockquote>

            {/* Name */}
            <h2
              className="text-xl font-bold text-white mt-6 group-hover:text-[#D4A853] transition-colors duration-300"
              style={{ animation: "fade-in-up 0.6s ease-out 0.5s both" }}
            >
              {personality.name}
            </h2>

            {/* Role & Org */}
            <p
              className="text-neutral-400 text-sm mt-1"
              style={{ animation: "fade-in-up 0.6s ease-out 0.6s both" }}
            >
              {personality.role} &middot; {personality.org}
            </p>

            {/* Read their story link */}
            <span
              className="inline-flex items-center gap-1.5 mt-6 text-sm font-medium text-[#D4A853] group-hover:gap-2.5 transition-all duration-300"
              style={{ animation: "fade-in-up 0.6s ease-out 0.7s both" }}
            >
              Read their story
              <svg
                viewBox="0 0 16 16"
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3.5 8h9M8.5 3.5 13 8l-4.5 4.5" />
              </svg>
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
