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
      className="group block featured-card"
      style={{ animation: "fade-in 0.8s ease-out both" }}
    >
      <div className="py-10 px-6 md:py-16 md:px-8 lg:px-12">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-8 md:gap-12">
          {/* -- Portrait column -- */}
          <div className="flex-shrink-0 md:w-[40%] flex flex-col items-center">
            {avatar ? (
              <img
                src={avatar}
                alt={personality.name}
                width={280}
                height={280}
                className="w-[200px] h-[200px] md:w-[240px] md:h-[240px] lg:w-[280px] lg:h-[280px] rounded-full object-cover border-2 border-neutral-100 shadow-lg group-hover:scale-[1.02] transition-transform duration-500"
              />
            ) : (
              <div className="w-[200px] h-[200px] md:w-[240px] md:h-[240px] lg:w-[280px] lg:h-[280px] rounded-full border-2 border-neutral-100 shadow-lg flex items-center justify-center bg-neutral-100 group-hover:scale-[1.02] transition-transform duration-500">
                <span className="text-4xl md:text-5xl lg:text-6xl font-bold text-neutral-400 select-none">
                  {initials}
                </span>
              </div>
            )}

            {/* Category pill */}
            <span className="mt-5 bg-neutral-100 text-neutral-600 border border-neutral-200 rounded-full px-3 py-1 text-xs font-medium tracking-wide uppercase">
              {categoryName}
            </span>
          </div>

          {/* -- Quote + info column -- */}
          <div className="md:w-[60%] flex flex-col justify-center text-center md:text-left">
            {/* Quote block */}
            <blockquote
              className="relative pl-8"
              style={{ animation: "fade-in-up 0.7s ease-out 0.3s both" }}
            >
              {/* Decorative opening quote mark */}
              <span
                className="absolute -top-2 -left-1 text-7xl md:text-8xl leading-none select-none pointer-events-none font-[family-name:var(--font-playfair)] text-neutral-300"
                aria-hidden="true"
              >
                {"\u201C"}
              </span>

              <p className="text-2xl md:text-3xl font-[family-name:var(--font-playfair)] italic text-[#2C2C2C] leading-relaxed">
                {quote}
              </p>
            </blockquote>

            {/* Name */}
            <h2
              className="text-xl font-bold text-[#1a1a1a] mt-6"
              style={{ animation: "fade-in-up 0.6s ease-out 0.5s both" }}
            >
              {personality.name}
            </h2>

            {/* Role & Org */}
            <p
              className="text-neutral-500 text-sm mt-1"
              style={{ animation: "fade-in-up 0.6s ease-out 0.6s both" }}
            >
              {personality.role} &middot; {personality.org}
            </p>

            {/* Read their story link */}
            <span
              className="inline-flex items-center gap-1.5 mt-6 text-sm font-medium text-[#1a1a1a] group-hover:underline underline-offset-4 decoration-neutral-300 transition-all duration-300"
              style={{ animation: "fade-in-up 0.6s ease-out 0.7s both" }}
            >
              Read their story
              <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">
                &rarr;
              </span>
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
