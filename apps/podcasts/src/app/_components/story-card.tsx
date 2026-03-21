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

  const avatarSize = isCompact ? 56 : 72;
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
          bg: "#141418",
          rounded: "2xl",
          borderWidth: "1px",
          borderColor: "rgba(255,255,255,0.06)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
          transition: "all",
          transitionDuration: "400ms",
          transitionTimingFunction: "cubic-bezier(0.25,0.46,0.45,0.94)",
          p: isCompact ? "4" : { base: "5", sm: "6", md: "7" },
          overflow: "hidden",
        })
      )}
      style={{
        opacity: 0,
        animation: `story-card-enter 320ms cubic-bezier(0.16,1,0.3,1) ${index * 55}ms forwards`,
      }}
    >
      {/* Top-edge highlight gradient */}
      <div
        className={css({
          pos: "absolute",
          top: "0",
          left: "0",
          right: "0",
          h: "1px",
          pointerEvents: "none",
          zIndex: "1",
        })}
        style={{
          background:
            "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.12) 30%, rgba(255,255,255,0.18) 50%, rgba(255,255,255,0.12) 70%, rgba(255,255,255,0) 100%)",
        }}
      />
      <div
        className={css({
          pos: "absolute",
          top: "0",
          left: "0",
          right: "0",
          h: "40px",
          pointerEvents: "none",
          zIndex: "0",
        })}
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0) 100%)",
        }}
      />

      {/* Identity block: Avatar + Name + Role */}
      <div
        className={css({
          display: "flex",
          alignItems: "center",
          gap: "3.5",
          mb: isCompact ? "3.5" : "5",
        })}
      >
        {/* Portrait */}
        <div
          className={css({
            flexShrink: 0,
            rounded: "full",
            transition: "all",
            transitionDuration: "400ms",
            transitionTimingFunction: "ease-out",
            p: "2px",
            _groupHover: {
              transform: "scale(1.04)",
            },
          })}
          style={{
            background:
              "linear-gradient(135deg, rgba(139,92,246,0.35) 0%, rgba(59,130,246,0.25) 50%, rgba(139,92,246,0.15) 100%)",
            boxShadow:
              "0 0 0 1px rgba(255,255,255,0.07), 0 0 16px rgba(139,92,246,0.12)",
          }}
        >
          {avatar ? (
            <Image
              src={avatar}
              alt={`${personality.name}, ${personality.role} at ${personality.org}`}
              width={avatarSize}
              height={avatarSize}
              unoptimized
              className={cx(
                "story-card-avatar",
                css({
                  rounded: "full",
                  objectFit: "cover",
                  transition: "all",
                  transitionDuration: "400ms",
                  transitionTimingFunction: "ease-out",
                })
              )}
              style={{ width: avatarSize, height: avatarSize }}
            />
          ) : (
            <div
              className={cx(
                "story-card-avatar",
                css({
                  rounded: "full",
                  bg: "rgba(255,255,255,0.10)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "rgba(255,255,255,0.75)",
                  fontWeight: "semibold",
                  fontSize: isCompact ? "sm" : "base",
                })
              )}
              style={{ width: avatarSize, height: avatarSize }}
              role="img"
              aria-label={`${personality.name}`}
            >
              {initials}
            </div>
          )}
        </div>

        {/* Name and role — placed next to avatar for scannability */}
        <div className={css({ minW: "0", flex: "1" })}>
          <h3
            className={css({
              fontFamily: "sans",
              fontSize: isCompact ? "0.9375rem" : "1rem",
              fontWeight: "semibold",
              color: "#E8E8ED",
              lineHeight: "tight",
              letterSpacing: "-0.01em",
            })}
          >
            {personality.name}
          </h3>
          <p
            className={css({
              fontSize: "sm",
              color: "#A8A8B3",
              mt: "1",
              lineHeight: "1.375",
              letterSpacing: "0.005em",
            })}
          >
            {personality.role}{" "}
            <span
              className={css({
                mx: "1.5",
                color: "rgba(255,255,255,0.18)",
                fontWeight: "light",
              })}
            >
              |
            </span>
            {personality.org}
          </p>
        </div>
      </div>

      {/* Quote block */}
      <div className={css({ pos: "relative" })}>
        <span
          className={css({
            pos: "absolute",
            top: "-0.5rem",
            left: "-0.15rem",
            userSelect: "none",
            pointerEvents: "none",
            fontSize: "5xl",
            color: "rgba(255,255,255,0.10)",
            lineHeight: "1",
            fontFamily: "serif",
            letterSpacing: "tight",
          })}
          aria-hidden="true"
        >
          {"\u201C"}
        </span>
        <div
          className={css({ pos: "relative" })}
          style={{
            borderLeft: "2px solid rgba(139,92,246,0.35)",
          }}
        >
          <p
            className={css({
              color: "#CDCDD6",
              lineHeight: "1.85",
              letterSpacing: "0.012em",
              pl: { base: "4", sm: "5" },
              fontSize: isCompact ? "0.9375rem" : "1.0625rem",
              lineClamp: isCompact ? 3 : 4,
            })}
          >
            {displayText}
          </p>
          {/* Fade mask */}
          <div
            className={css({
              pointerEvents: "none",
              pos: "absolute",
              bottom: "0",
              left: "0",
              right: "0",
              h: "6",
            })}
            style={{
              background:
                "linear-gradient(to bottom, rgba(20,20,24,0) 0%, rgba(20,20,24,0.85) 100%)",
            }}
          />
        </div>
      </div>

      {/* Gradient separator */}
      <div
        className={css({
          mt: isCompact ? "3.5" : "4",
          h: "1px",
          pointerEvents: "none",
        })}
        style={{
          background:
            "linear-gradient(90deg, rgba(139,92,246,0) 0%, rgba(139,92,246,0.3) 25%, rgba(59,130,246,0.25) 50%, rgba(139,92,246,0.3) 75%, rgba(139,92,246,0) 100%)",
        }}
      />

      {/* Pills */}
      <div
        className={css({
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "2",
          mt: "3",
          textAlign: "left",
        })}
      >
        {podcastCount > 0 && (
          <span
            className={cx(
              "podcast-count-pill",
              css({
                display: "inline-flex",
                alignItems: "center",
                gap: "1.5",
                fontSize: "0.8125rem",
                fontWeight: "medium",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                px: "3.5",
                py: "2",
                rounded: "full",
                bg: "rgba(255,255,255,0.05)",
                color: "#ADADB8",
                borderWidth: "1px",
                borderColor: "rgba(255,255,255,0.10)",
                transition: "colors",
                transitionDuration: "300ms",
              })
            )}
          >
            <svg
              viewBox="0 0 12 12"
              className={css({ w: "3", h: "3" })}
              fill="currentColor"
              aria-hidden="true"
            >
              <rect x="0.5" y="3.5" width="2" height="5" rx="1" />
              <rect x="5"   y="1.5" width="2" height="9" rx="1" />
              <rect x="9.5" y="3.5" width="2" height="5" rx="1" />
            </svg>
            {podcastCount} {podcastCount === 1 ? "podcast" : "podcasts"}
          </span>
        )}
        {personality.knownFor && (
          <span
            className={cx(
              "known-for-badge",
              css({
                display: "inline-flex",
                alignItems: "center",
                gap: "1.5",
                fontSize: "0.8125rem",
                fontWeight: "medium",
                letterSpacing: "0.02em",
                px: "3.5",
                py: "2",
                rounded: "full",
                bg: "rgba(139,92,246,0.08)",
                color: "#a78bfa",
                borderWidth: "1px",
                borderColor: "rgba(139,92,246,0.15)",
                transition: "colors",
                transitionDuration: "300ms",
              })
            )}
          >
            <svg
              viewBox="0 0 16 16"
              className={css({ w: "3", h: "3" })}
              fill="currentColor"
            >
              <path d="M4.708 5.578L2.061 8.224a.498.498 0 0 0 .002.706l2.646 2.647a.5.5 0 1 1-.708.708L1.354 9.637a1.498 1.498 0 0 1-.002-2.12L3.999 4.87a.5.5 0 0 1 .709.707zm6.584 0L13.939 8.224a.498.498 0 0 1-.002.706l-2.646 2.647a.5.5 0 1 0 .708.708l2.647-2.648a1.498 1.498 0 0 0 .002-2.12L12.001 4.87a.5.5 0 1 0-.709.707zM7.09 13.241l2-9.5a.5.5 0 1 1 .977.206l-2 9.5a.5.5 0 0 1-.977-.206z" />
            </svg>
            {personality.knownFor}
          </span>
        )}
      </div>

      {/* "Read story" hover link */}
      <div
        className={css({
          mt: "3",
          textAlign: "left",
          overflow: "hidden",
          h: "0",
          opacity: "0",
          transition: "all",
          transitionDuration: "350ms",
          transitionTimingFunction: "cubic-bezier(0.25,0.46,0.45,0.94)",
          transform: "translateY(8px)",
          _groupHover: {
            h: "24px",
            opacity: "1",
            transform: "translateY(0)",
          },
        })}
      >
        <span
          className={css({
            display: "inline-flex",
            alignItems: "center",
            gap: "1.5",
            fontSize: "sm",
            fontWeight: "medium",
            color: "#a78bfa",
            letterSpacing: "0.01em",
          })}
        >
          Read story
          <svg
            viewBox="0 0 16 16"
            className={css({ w: "3.5", h: "3.5", transition: "transform", transitionDuration: "200ms", _groupHover: { transform: "translateX(2px)" } })}
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
