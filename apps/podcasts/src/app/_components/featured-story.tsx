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

const avatarBoxShadow = [
  "0 4px 12px -2px rgba(0,0,0,0.5)",
  "0 8px 24px -4px rgba(0,0,0,0.35)",
  "0 16px 40px -8px rgba(0,0,0,0.2)",
  "0 0 0 2px rgba(255,255,255,0.08)",
  "0 0 0 4px rgba(0,0,0,0.3)",
  "0 0 0 5px rgba(255,255,255,0.04)",
  "inset 0 2px 4px rgba(255,255,255,0.06)",
].join(", ");

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
      className="group featured-card block"
      style={{ animation: "fade-in 0.8s ease-out both" }}
    >
      <div className="relative z-[2] py-10 px-6 md:py-16 md:px-8 lg:px-12">
        <div className="flex flex-col items-center gap-8 md:flex-row md:items-start md:gap-12">
          {/* Portrait column */}
          <div className="shrink-0 flex flex-col items-center md:w-[40%]">
            {avatar ? (
              <img
                src={avatar}
                alt={personality.name}
                width={280}
                height={280}
                className="w-[200px] h-[200px] rounded-full object-cover transition-transform duration-500 group-hover:scale-[1.02] md:w-60 md:h-60 lg:w-[280px] lg:h-[280px]"
                style={{ boxShadow: avatarBoxShadow }}
              />
            ) : (
              <div
                className="w-[200px] h-[200px] rounded-full flex items-center justify-center bg-surface-hover transition-transform duration-500 group-hover:scale-[1.02] md:w-60 md:h-60 lg:w-[280px] lg:h-[280px]"
                style={{ boxShadow: avatarBoxShadow }}
              >
                <span className="text-4xl font-bold text-ink-muted select-none md:text-5xl lg:text-6xl">
                  {initials}
                </span>
              </div>
            )}
            <span className="mt-5 rounded-full px-3 py-1 text-xs font-medium tracking-[0.05em] uppercase text-[#8B8B96] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] shadow-[0_1px_3px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.04)]">
              {categoryName}
            </span>
          </div>

          {/* Quote + info column */}
          <div className="flex flex-col justify-center text-center md:w-[60%] md:text-left">
            <blockquote className="relative pl-8 animate-[fade-in-up_0.7s_ease-out_0.3s_both]">
              <span
                className="absolute top-[-0.5rem] left-[-0.25rem] text-[4.5rem] leading-none select-none pointer-events-none text-[rgba(255,255,255,0.06)] md:text-[6rem]"
                aria-hidden="true"
              >
                {"\u201C"}
              </span>
              <p className="text-2xl italic text-ink-secondary leading-[1.625] md:text-3xl">
                {quote}
              </p>
            </blockquote>

            <h2 className="text-xl font-bold text-ink-primary mt-6 animate-[fade-in-up_0.6s_ease-out_0.5s_both]">
              {personality.name}
            </h2>

            <p className="text-ink-tertiary text-[0.9375rem] mt-1 animate-[fade-in-up_0.6s_ease-out_0.6s_both]">
              {personality.role}
              <span className="mx-1.5 text-[#3A3A45]">&middot;</span>
              {personality.org}
            </p>

            <span className="inline-flex items-center gap-1.5 mt-6 text-sm font-medium text-ink-secondary underline-offset-4 decoration-[rgba(255,255,255,0.2)] transition-all duration-300 animate-[fade-in-up_0.6s_ease-out_0.7s_both] group-hover:text-ink-primary group-hover:underline">
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
