import Link from "next/link";
import {
  getInitials,
  getAvatarUrl,
  type Personality,
} from "@/lib/personalities";

type Props = {
  personality: Personality;
  accentGradient: string;
};

export function PersonalityTile({ personality, accentGradient }: Props) {
  const avatar = getAvatarUrl(personality);

  return (
    <Link
      href={`/person/${personality.slug}`}
      className="group glass-card card-glow relative block p-4 transition-all duration-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] hover:bg-surface-hover hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.06)]"
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        {avatar ? (
          <img
            src={avatar}
            alt={personality.name}
            width={52}
            height={52}
            className="shrink-0 w-[52px] h-[52px] rounded-full object-cover shadow-[0_0_0_1px_rgba(255,255,255,0.08)] transition-shadow duration-300 group-hover:shadow-[0_0_0_1px_rgba(255,255,255,0.15)]"
          />
        ) : (
          <div
            className={`shrink-0 w-[52px] h-[52px] rounded-full flex items-center justify-center text-white font-bold text-sm shadow-[0_0_0_1px_rgba(255,255,255,0.08)] transition-shadow duration-300 group-hover:shadow-[0_0_0_1px_rgba(255,255,255,0.15)] bg-gradient-to-br ${accentGradient}`}
          >
            {getInitials(personality.name)}
          </div>
        )}

        {/* Info */}
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-[0.9375rem] text-ink-primary leading-tight transition-colors duration-200 group-hover:text-white">
            {personality.name}
          </h3>
          <p className="text-sm text-ink-tertiary mt-0.5 font-normal">
            {personality.role} · {personality.org}
          </p>
          <p className="italic text-sm text-ink-secondary mt-1 line-clamp-2 leading-[1.75] tracking-[0.01em]">
            {personality.description}
          </p>

          {/* Podcast tags */}
          {personality.podcasts.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {personality.podcasts.slice(0, 3).map((pod) => (
                <span
                  key={pod}
                  className="inline-flex items-center text-xs px-2.5 py-1 rounded-full bg-[rgba(255,255,255,0.05)] text-ink-tertiary border border-[rgba(255,255,255,0.06)] transition-all duration-200 group-hover:bg-[rgba(255,255,255,0.08)] group-hover:border-[rgba(255,255,255,0.10)] group-hover:text-ink-secondary"
                >
                  {pod}
                </span>
              ))}
              {personality.podcasts.length > 3 && (
                <span className="inline-flex items-center text-xs px-2.5 py-1 rounded-full bg-[rgba(255,255,255,0.03)] text-ink-muted border border-[rgba(255,255,255,0.06)]">
                  +{personality.podcasts.length - 3}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Play button */}
        {personality.podcasts.length > 0 && (
          <div className="opacity-0 translate-y-1 transition-all duration-300 absolute bottom-4 right-4 group-hover:opacity-100 group-hover:translate-y-0">
            <div className="w-10 h-10 rounded-full bg-spotify flex items-center justify-center shadow-[0_8px_16px_rgba(29,185,84,0.25)] transition-transform duration-200 hover:scale-110">
              <svg
                viewBox="0 0 16 16"
                className="w-4 h-4 text-black ml-0.5"
                fill="currentColor"
              >
                <path d="M3 1.713a.7.7 0 0 1 1.05-.607l10.89 6.288a.7.7 0 0 1 0 1.212L4.05 14.894A.7.7 0 0 1 3 14.288V1.713z" />
              </svg>
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}
