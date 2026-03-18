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
      className="group relative glass-card glass-card-hover card-glow p-5 transition-all duration-300 block hover:scale-[1.015] hover:-translate-y-0.5"
    >
      <div className="flex items-start gap-4">
        {/* Avatar */}
        {avatar ? (
          <img
            src={avatar}
            alt={personality.name}
            width={52}
            height={52}
            className="flex-shrink-0 w-[52px] h-[52px] rounded-full object-cover ring-2 ring-white/10 group-hover:ring-spotify/50 transition-all duration-300"
          />
        ) : (
          <div
            className={`flex-shrink-0 w-[52px] h-[52px] rounded-full bg-gradient-to-br ${accentGradient} flex items-center justify-center text-white font-bold text-sm ring-2 ring-white/10 group-hover:ring-white/25 transition-all duration-300`}
          >
            {getInitials(personality.name)}
          </div>
        )}

        {/* Info */}
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-[15px] text-white leading-tight group-hover:text-spotify transition-colors duration-200">
            {personality.name}
          </h3>
          <p className="text-[13px] text-neutral-500 mt-0.5 font-medium">
            {personality.role} · {personality.org}
          </p>
          <p className="text-[13px] text-neutral-400 mt-2 line-clamp-2 leading-relaxed">
            {personality.description}
          </p>

          {/* Podcast tags */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {personality.podcasts.slice(0, 3).map((pod) => (
              <span
                key={pod}
                className="inline-flex items-center text-[11px] px-2.5 py-1 rounded-full bg-white/[0.05] text-neutral-400 group-hover:bg-white/[0.08] group-hover:text-neutral-300 transition-colors duration-200"
              >
                {pod}
              </span>
            ))}
            {personality.podcasts.length > 3 && (
              <span className="inline-flex items-center text-[11px] px-2.5 py-1 rounded-full bg-white/[0.03] text-neutral-600">
                +{personality.podcasts.length - 3}
              </span>
            )}
          </div>
        </div>

        {/* Play button — appears on hover */}
        <div className="opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-300 absolute bottom-5 right-5">
          <div className="w-10 h-10 rounded-full bg-spotify flex items-center justify-center shadow-xl shadow-spotify/25 hover:scale-110 transition-transform duration-200">
            <svg
              viewBox="0 0 16 16"
              className="w-4 h-4 text-black ml-0.5"
              fill="currentColor"
            >
              <path d="M3 1.713a.7.7 0 0 1 1.05-.607l10.89 6.288a.7.7 0 0 1 0 1.212L4.05 14.894A.7.7 0 0 1 3 14.288V1.713z" />
            </svg>
          </div>
        </div>
      </div>
    </Link>
  );
}
