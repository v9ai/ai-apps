import { css, cx } from "styled-system/css";
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
      className={cx(
        "group",
        "glass-card",
        "card-glow",
        css({
          pos: "relative",
          display: "block",
          p: { base: "5", sm: "6" },
          transition: "all",
          transitionDuration: "300ms",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
          _hover: {
            bg: "card.bgHover",
            translateY: "-0.125rem",
            boxShadow:
              "0 8px 24px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)",
          },
        }),
      )}
    >
      <div
        className={css({
          display: "flex",
          alignItems: "flex-start",
          gap: { base: "3.5", sm: "4" },
        })}
      >
        {/* Avatar */}
        {avatar ? (
          <img
            src={avatar}
            alt={personality.name}
            width={52}
            height={52}
            className={css({
              flexShrink: 0,
              w: "52px",
              h: "52px",
              rounded: "full",
              objectFit: "cover",
              boxShadow: "0 0 0 1px rgba(255,255,255,0.08)",
              transition: "box-shadow",
              transitionDuration: "300ms",
              _groupHover: {
                boxShadow: "0 0 0 1px rgba(255,255,255,0.15)",
              },
            })}
          />
        ) : (
          <div
            className={css({
              flexShrink: 0,
              w: "52px",
              h: "52px",
              rounded: "full",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontWeight: "bold",
              fontSize: "sm",
              boxShadow: "0 0 0 1px rgba(255,255,255,0.08)",
              transition: "box-shadow",
              transitionDuration: "300ms",
              _groupHover: {
                boxShadow: "0 0 0 1px rgba(255,255,255,0.15)",
              },
            })}
            style={{ background: accentGradient }}
          >
            {getInitials(personality.name)}
          </div>
        )}

        {/* Info */}
        <div className={css({ minW: "0", flex: "1" })}>
          <h3
            className={css({
              fontWeight: "semibold",
              fontSize: "0.9375rem",
              color: "ui.heading",
              lineHeight: "tight",
              transition: "colors",
              transitionDuration: "200ms",
              _groupHover: { color: "white" },
            })}
          >
            {personality.name}
          </h3>
          <p
            className={css({
              fontSize: "sm",
              color: "#A8A8B3",
              mt: "1",
              fontWeight: "normal",
            })}
          >
            {personality.role} · {personality.org}
          </p>
          <p
            className={css({
              fontSize: "sm",
              color: "#B0B0BC",
              mt: "2",
              lineClamp: 2,
              lineHeight: "1.8",
              letterSpacing: "0.012em",
            })}
          >
            {personality.description}
          </p>

          {/* Podcast tags */}
          {personality.podcasts.length > 0 && (
            <div
              className={css({
                display: "flex",
                flexWrap: "wrap",
                gap: "2",
                mt: "4",
              })}
            >
              {personality.podcasts.slice(0, 3).map((pod) => (
                <span
                  key={pod}
                  className={css({
                    display: "inline-flex",
                    alignItems: "center",
                    fontSize: "xs",
                    px: "2.5",
                    py: "1.5",
                    rounded: "full",
                    bg: "rgba(255,255,255,0.07)",
                    color: "#ADADB8",
                    borderWidth: "1px",
                    borderColor: "rgba(255,255,255,0.10)",
                    transition: "all",
                    transitionDuration: "200ms",
                    _groupHover: {
                      bg: "rgba(255,255,255,0.10)",
                      borderColor: "rgba(255,255,255,0.14)",
                      color: "#C4C4CC",
                    },
                  })}
                >
                  {pod}
                </span>
              ))}
              {personality.podcasts.length > 3 && (
                <span
                  className={css({
                    display: "inline-flex",
                    alignItems: "center",
                    fontSize: "xs",
                    px: "2.5",
                    py: "1",
                    rounded: "full",
                    bg: "rgba(255,255,255,0.05)",
                    color: "#A0A0AB",
                    borderWidth: "1px",
                    borderColor: "rgba(255,255,255,0.06)",
                  })}
                >
                  +{personality.podcasts.length - 3}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Play button */}
        {personality.podcasts.length > 0 && (
          <div
            className={css({
              opacity: 0,
              translateY: "0.25rem",
              transition: "all",
              transitionDuration: "300ms",
              pos: "absolute",
              bottom: { base: "5", sm: "6" },
              right: { base: "5", sm: "6" },
              _groupHover: {
                opacity: 1,
                translateY: "0",
              },
            })}
          >
            <div
              className={css({
                w: "10",
                h: "10",
                rounded: "full",
                bg: "#1DB954",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 8px 16px rgba(29,185,84,0.25)",
                transition: "transform",
                transitionDuration: "200ms",
                _hover: { transform: "scale(1.1)" },
              })}
            >
              <svg
                viewBox="0 0 16 16"
                className={css({
                  w: "4",
                  h: "4",
                  color: "black",
                  ml: "0.5",
                })}
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
