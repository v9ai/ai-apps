import Link from "next/link";
import Image from "next/image";
import { css, cx } from "styled-system/css";
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
  const podcastCount = personality.podcasts.length;

  return (
    <Link
      href={`/person/${personality.slug}`}
      className={cx(
        "story-card-3d",
        "group",
        css({
          pos: "relative",
          display: "block",
          bg: "card.bgRaised",
          rounded: "2xl",
          borderWidth: "1px",
          borderColor: "whiteAlpha.8",
          p: isCompact ? "3.5" : { base: "3.5", sm: "4", lg: "5" },
          overflow: "hidden",
        })
      )}
    >
      {/* Identity block: Avatar + Name + Role */}
      <div
        className={css({
          display: "flex",
          alignItems: "center",
          gap: "3",
          mb: isCompact ? "3" : "4",
        })}
      >
        {/* Portrait */}
        <div
          className={css({
            flexShrink: 0,
            rounded: "full",
            border: "2px solid rgba(255,255,255,0.08)",
          })}
        >
          {avatar ? (
            <Image
              src={avatar}
              alt={`${personality.name}, ${personality.role} at ${personality.org}`}
              width={40}
              height={40}
              unoptimized
              className={css({
                rounded: "full",
                objectFit: "cover",
                w: { base: "40px", sm: "48px" },
                h: { base: "40px", sm: "48px" },
              })}
            />
          ) : (
            <div
              className={css({
                rounded: "full",
                bg: "rgba(255,255,255,0.10)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "rgba(255,255,255,0.75)",
                fontWeight: "semibold",
                fontSize: "sm",
                w: { base: "40px", sm: "48px" },
                h: { base: "40px", sm: "48px" },
              })}
              role="img"
              aria-label={`${personality.name}`}
            >
              {initials}
            </div>
          )}
        </div>

        {/* Name and role */}
        <div className={css({ minW: "0", flex: "1" })}>
          <h3
            className={css({
              fontSize: "0.9375rem",
              fontWeight: "semibold",
              color: "ui.heading",
              lineHeight: "tight",
              letterSpacing: "-0.01em",
            })}
          >
            {personality.name}
          </h3>
          <p
            className={css({
              fontSize: "sm",
              color: "ui.tertiary",
              mt: "0.5",
              lineHeight: "1.375",
              truncate: true,
            })}
          >
            {personality.role}
            <span className={css({ mx: "1.5", color: "rgba(255,255,255,0.15)" })}>
              |
            </span>
            {personality.org}
          </p>
        </div>
      </div>

      {/* Description text */}
      <p
        className={css({
          color: "ui.body",
          lineHeight: "1.7",
          letterSpacing: "0.01em",
          fontSize: isCompact ? "0.8125rem" : { base: "0.8125rem", sm: "0.875rem" },
          lineClamp: 3,
        })}
      >
        {displayText}
      </p>

      {/* Footer: podcast count + CTA */}
      <div
        className={css({
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mt: { base: "3", sm: "4" },
          pt: { base: "2.5", sm: "3" },
          borderTopWidth: "1px",
          borderTopColor: "card.border",
        })}
      >
        {podcastCount > 0 && (
          <span
            className={css({
              display: "inline-flex",
              alignItems: "center",
              gap: "1.5",
              fontSize: "xs",
              color: "ui.dim",
            })}
          >
            <svg
              viewBox="0 0 12 12"
              className={css({ w: "3", h: "3" })}
              fill="currentColor"
              aria-hidden="true"
            >
              <rect x="0.5" y="3.5" width="2" height="5" rx="1" />
              <rect x="5" y="1.5" width="2" height="9" rx="1" />
              <rect x="9.5" y="3.5" width="2" height="5" rx="1" />
            </svg>
            {podcastCount} {podcastCount === 1 ? "podcast" : "podcasts"}
          </span>
        )}

        <span
          className={css({
            display: "inline-flex",
            alignItems: "center",
            gap: "1",
            fontSize: "sm",
            fontWeight: "medium",
            color: "ui.dim",
            ml: "auto",
            transition: "color 0.2s var(--ease-smooth)",
            _groupHover: { color: "accent.purple" },
          })}
        >
          Read story
          <svg
            viewBox="0 0 16 16"
            className={css({
              w: "3.5",
              h: "3.5",
              transition: "transform 0.2s var(--ease-smooth)",
              _groupHover: { transform: "translateX(2px)" },
            })}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 8h10M9 4l4 4-4 4" />
          </svg>
        </span>
      </div>
    </Link>
  );
}
