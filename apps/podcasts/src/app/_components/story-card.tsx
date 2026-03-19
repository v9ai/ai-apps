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
      className={`story-card-3d relative block text-center bg-surface rounded-2xl border border-[rgba(255,255,255,0.06)] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-all duration-[400ms] ease-[cubic-bezier(0.25,0.46,0.45,0.94)] ${isCompact ? "p-3" : "p-4"}`}
      style={{
        opacity: 0,
        animation: `story-card-enter 400ms ease-out ${index * 80}ms forwards`,
        transform: "perspective(800px) rotateX(0deg) translateY(0px)",
      }}
    >
      {/* Portrait */}
      <div className="flex justify-center mb-4">
        {avatar ? (
          <img
            src={avatar}
            alt={personality.name}
            width={avatarSize}
            height={avatarSize}
            className="story-card-avatar rounded-full object-cover shadow-[0_0_0_1px_rgba(255,255,255,0.08)] transition-all duration-[400ms] ease-out"
            style={{ width: avatarSize, height: avatarSize }}
          />
        ) : (
          <div
            className={`story-card-avatar rounded-full bg-[rgba(255,255,255,0.06)] flex items-center justify-center text-[#8B8B96] font-semibold shadow-[0_0_0_1px_rgba(255,255,255,0.08)] ${isCompact ? "text-base" : "text-xl"}`}
            style={{ width: avatarSize, height: avatarSize }}
          >
            {initials}
          </div>
        )}
      </div>

      {/* Quote block */}
      <div className="relative mb-4 text-left">
        <span
          className="absolute top-[-0.75rem] left-[-0.25rem] select-none pointer-events-none text-5xl text-[rgba(255,255,255,0.10)] leading-none"
          aria-hidden="true"
        >
          {"\u201C"}
        </span>
        <p
          className={`italic text-ink-secondary leading-[1.78] tracking-[0.01em] pl-4 ${isCompact ? "text-[0.9375rem] line-clamp-3" : "text-base line-clamp-4"}`}
        >
          {displayText}
        </p>
      </div>

      {/* Name and role */}
      <div className="mb-3 pt-3 border-t border-[rgba(255,255,255,0.04)] text-left">
        <h3 className="font-sans text-[0.9375rem] font-semibold text-ink-primary leading-tight tracking-[-0.01em]">
          {personality.name}
        </h3>
        <p className="text-sm text-ink-tertiary mt-1 leading-[1.375] tracking-[0.005em]">
          {personality.role} &middot; {personality.org}
        </p>
      </div>

      {/* Pills */}
      <div className="flex flex-wrap items-center gap-1.5 mt-1 text-left">
        {podcastCount > 0 && (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.06em] px-2.5 py-1 rounded-full bg-[rgba(255,255,255,0.05)] text-[#8B8B96] border border-[rgba(255,255,255,0.08)] transition-colors duration-300">
            <svg viewBox="0 0 16 16" className="w-3 h-3" fill="currentColor">
              <path d="M8 1a4 4 0 0 0-4 4v3a4 4 0 0 0 8 0V5a4 4 0 0 0-4-4zM3 9a5 5 0 0 0 4.5 4.975V15.5a.5.5 0 0 0 1 0v-1.525A5 5 0 0 0 13 9a.5.5 0 0 0-1 0 4 4 0 0 1-8 0 .5.5 0 0 0-1 0z" />
            </svg>
            {podcastCount} {podcastCount === 1 ? "podcast" : "podcasts"}
          </span>
        )}
        {personality.knownFor && (
          <span className="known-for-badge inline-flex items-center gap-1 text-xs font-medium tracking-[0.02em] px-2.5 py-1 rounded-full bg-[rgba(139,92,246,0.08)] text-[#a78bfa] border border-[rgba(139,92,246,0.15)] transition-colors duration-300">
            <svg viewBox="0 0 16 16" className="w-3 h-3" fill="currentColor">
              <path d="M4.708 5.578L2.061 8.224a.498.498 0 0 0 .002.706l2.646 2.647a.5.5 0 1 1-.708.708L1.354 9.637a1.498 1.498 0 0 1-.002-2.12L3.999 4.87a.5.5 0 0 1 .709.707zm6.584 0L13.939 8.224a.498.498 0 0 1-.002.706l-2.646 2.647a.5.5 0 1 0 .708.708l2.647-2.648a1.498 1.498 0 0 0 .002-2.12L12.001 4.87a.5.5 0 1 0-.709.707zM7.09 13.241l2-9.5a.5.5 0 1 1 .977.206l-2 9.5a.5.5 0 0 1-.977-.206z" />
            </svg>
            {personality.knownFor}
          </span>
        )}
      </div>
    </Link>
  );
}
