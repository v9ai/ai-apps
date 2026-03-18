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

  const avatarSize = isCompact ? 72 : 96;
  const podcastCount = personality.podcasts.length;

  return (
    <Link
      href={`/person/${personality.slug}`}
      className={[
        "group relative block text-center",
        "bg-white rounded-2xl border border-neutral-100 shadow-sm",
        isCompact ? "p-4" : "p-6",
        "hover:shadow-md hover:-translate-y-[2px]",
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
              "ring-1 ring-neutral-200",
              "shadow-sm group-hover:shadow-md",
              "transition-all duration-[400ms] ease-out",
            ].join(" ")}
            style={{ width: avatarSize, height: avatarSize }}
          />
        ) : (
          <div
            className={[
              "rounded-full bg-neutral-100",
              "flex items-center justify-center",
              "text-neutral-500 font-semibold",
              "ring-1 ring-neutral-200",
              "shadow-sm group-hover:shadow-md",
              "transition-all duration-[400ms] ease-out",
              isCompact ? "text-base" : "text-xl",
            ].join(" ")}
            style={{ width: avatarSize, height: avatarSize }}
          >
            {initials}
          </div>
        )}
      </div>

      {/* Quote block */}
      <div className="relative mb-4 text-left">
        {/* Decorative opening quote mark */}
        <span
          className={[
            "absolute -top-3 -left-1 select-none pointer-events-none",
            "font-[family-name:var(--font-playfair)]",
            "text-3xl text-neutral-300 leading-none",
          ].join(" ")}
          aria-hidden="true"
        >
          {"\u201C"}
        </span>

        <p
          className={[
            "font-[family-name:var(--font-playfair)] italic",
            "text-[#2C2C2C] leading-relaxed",
            isCompact ? "text-base" : "text-lg",
            "pl-4 line-clamp-4",
          ].join(" ")}
        >
          {displayText}
        </p>
      </div>

      {/* Name and role */}
      <div className="mb-3 text-left">
        <h3 className="text-[15px] font-semibold text-[#1a1a1a] leading-tight">
          {personality.name}
        </h3>
        <p className="text-sm text-neutral-500 mt-0.5">
          {personality.role} &middot; {personality.org}
        </p>
      </div>

      {/* Podcast count pill */}
      <div className="text-left">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-400 border border-neutral-200 transition-colors duration-300">
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
