import Link from "next/link";
import {
  getAvatarUrl,
  getInitials,
  type Personality,
} from "@/lib/personalities";

type StoryCardProps = {
  personality: Personality;
  quote?: string;
  index: number;
  variant?: "default" | "compact";
};

export function StoryCard({
  personality,
  quote,
  index,
  variant = "default",
}: StoryCardProps) {
  const avatar = getAvatarUrl(personality);
  const initials = getInitials(personality.name);
  const displayText = quote || personality.description;
  const isCompact = variant === "compact";

  const avatarSize = isCompact ? 80 : 120;
  const podcastCount = personality.podcasts.length;

  return (
    <Link
      href={`/person/${personality.slug}`}
      className={[
        "group relative block",
        "bg-white/[0.02] border border-white/[0.06] rounded-2xl",
        isCompact ? "p-4" : "p-6",
        "hover:bg-white/[0.04] hover:shadow-[0_8px_32px_rgba(217,170,56,0.06)]",
        "hover:-translate-y-[2px]",
        "transition-all duration-[400ms] ease-out",
      ].join(" ")}
      style={{
        opacity: 0,
        animation: `story-card-enter 400ms ease-out ${index * 80}ms forwards`,
      }}
    >
      {/* Portrait */}
      <div className="flex justify-center mb-5">
        {avatar ? (
          <img
            src={avatar}
            alt={personality.name}
            width={avatarSize}
            height={avatarSize}
            className={[
              "rounded-full object-cover",
              "ring-2 ring-white/[0.08] group-hover:ring-amber-400/30",
              "transition-all duration-[400ms] ease-out",
              "group-hover:shadow-[0_0_24px_rgba(217,170,56,0.12)]",
            ].join(" ")}
            style={{ width: avatarSize, height: avatarSize }}
          />
        ) : (
          <div
            className={[
              "rounded-full bg-gradient-to-br from-amber-500/80 to-orange-600/80",
              "flex items-center justify-center",
              "text-white font-bold",
              "ring-2 ring-white/[0.08] group-hover:ring-amber-400/30",
              "transition-all duration-[400ms] ease-out",
              isCompact ? "text-lg" : "text-2xl",
            ].join(" ")}
            style={{ width: avatarSize, height: avatarSize }}
          >
            {initials}
          </div>
        )}
      </div>

      {/* Quote block */}
      <div className="relative mb-4">
        {/* Decorative opening quote mark */}
        <span
          className={[
            "absolute -top-3 -left-1 select-none pointer-events-none",
            "font-[family-name:var(--font-playfair)]",
            "text-amber-500/40 leading-none",
            isCompact ? "text-4xl" : "text-5xl",
          ].join(" ")}
          aria-hidden="true"
        >
          {"\u201C"}
        </span>

        <p
          className={[
            "font-[family-name:var(--font-playfair)] italic",
            "text-neutral-300 leading-relaxed",
            isCompact ? "text-base" : "text-lg",
            "pl-4 line-clamp-4",
          ].join(" ")}
        >
          {displayText}
        </p>
      </div>

      {/* Name and role */}
      <div className="mb-3">
        <h3 className="font-bold text-white text-[15px] leading-tight group-hover:text-amber-100 transition-colors duration-300">
          {personality.name}
        </h3>
        <p className="text-sm text-neutral-500 mt-0.5">
          {personality.role} &middot; {personality.org}
        </p>
      </div>

      {/* Podcast count pill */}
      <div>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full bg-white/[0.04] text-neutral-500 border border-white/[0.04] group-hover:bg-white/[0.06] group-hover:text-neutral-400 transition-colors duration-300">
          <svg
            viewBox="0 0 16 16"
            className="w-3 h-3"
            fill="currentColor"
          >
            <path d="M8 1a4 4 0 0 0-4 4v3a4 4 0 0 0 8 0V5a4 4 0 0 0-4-4zM3 9a5 5 0 0 0 4.5 4.975V15.5a.5.5 0 0 0 1 0v-1.525A5 5 0 0 0 13 9a.5.5 0 0 0-1 0 4 4 0 0 1-8 0 .5.5 0 0 0-1 0z" />
          </svg>
          {podcastCount} {podcastCount === 1 ? "podcast" : "podcasts"}
        </span>
      </div>

      {/* Keyframe animation — inlined via style tag for server component */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes story-card-enter {
              from {
                opacity: 0;
                transform: translateY(12px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }
          `,
        }}
      />
    </Link>
  );
}
