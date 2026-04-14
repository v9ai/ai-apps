import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  getAllPersonalities,
  getPersonalityBySlug,
  getCategoryForPersonality,
  getCategoryColor,
  getInitials,
  getAvatarUrlWithEnrichment,
  getResearch,
} from "@/lib/personalities";
import { getEnrichment } from "@/lib/enrichment";
import type { Metadata } from "next";
import { css, cx } from "styled-system/css";
import NavHeader from "@/app/_components/nav-header";
import { ResearchQuestions } from "../_components/research-questions";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const person = getPersonalityBySlug(slug);
  if (!person) return {};
  const research = getResearch(slug);
  const count = research?.questions?.length ?? 0;
  const title = `Interview Questions — ${person.name}`;
  const description = `${count} interview questions for ${person.name}, ${person.role} at ${person.org}.`;
  const url = `https://humansofai.space/person/${slug}/questions`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url },
    twitter: { card: "summary", title, description },
  };
}

export function generateStaticParams() {
  return getAllPersonalities()
    .filter((p) => {
      const r = getResearch(p.slug);
      return r?.questions?.length;
    })
    .map((p) => ({ slug: p.slug }));
}

export default async function QuestionsPage({ params }: Props) {
  const { slug } = await params;
  const person = getPersonalityBySlug(slug);
  if (!person) notFound();

  const research = getResearch(slug);
  if (!research?.questions?.length) notFound();

  const category = getCategoryForPersonality(slug)!;
  const gradient = getCategoryColor(category.slug);
  const enriched = getEnrichment(slug);
  const avatar = getAvatarUrlWithEnrichment(person, enriched.imageUrl);

  const allPersonalities = getAllPersonalities();
  const totalPersonalities = allPersonalities.length;
  const totalPodcasts = allPersonalities.reduce((acc, p) => acc + p.podcasts.length, 0);

  return (
    <main className={css({ minH: "screen", bg: "#0B0B0F" })}>
      <NavHeader totalPersonalities={totalPersonalities} totalPodcasts={totalPodcasts} />

      <div className={css({ pos: "relative", overflow: "hidden" })}>
        <div className={css({ pos: "relative", zIndex: 10, maxW: "7xl", mx: "auto", px: { base: "5", sm: "6", lg: "8" } })}>
          {/* Back to profile */}
          <div
            className={cx("animate-fade-in", css({ pt: { base: "22", md: "24" }, pb: { base: "5", md: "6" } }))}
            style={{ animationDelay: "0.1s" }}
          >
            <Link
              href={`/person/${slug}`}
              className={cx(
                "group",
                css({
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "1.5",
                  fontSize: "sm",
                  color: "#7B7B86",
                  transition: "colors",
                  transitionDuration: "200ms",
                  _hover: { color: "#C4C4CC" },
                }),
              )}
            >
              <svg
                viewBox="0 0 16 16"
                className={css({ w: "4", h: "4", transition: "transform", transitionDuration: "200ms", transitionTimingFunction: "ease-out", _groupHover: { transform: "translateX(-0.125rem)" } })}
                fill="currentColor"
              >
                <path d="M11.03 3.97a.75.75 0 0 1 0 1.06L7.56 8.5l3.47 3.47a.75.75 0 1 1-1.06 1.06l-4-4a.75.75 0 0 1 0-1.06l4-4a.75.75 0 0 1 1.06 0z" />
              </svg>
              <span className={css({ textUnderlineOffset: "2px", _groupHover: { textDecoration: "underline", textDecorationColor: "rgba(123,123,134,0.5)" } })}>
                Back to profile
              </span>
            </Link>
          </div>

          {/* Compact person header */}
          <div className={css({ display: "flex", alignItems: "center", gap: { base: "3", sm: "4" }, pb: { base: "8", md: "10" } })}>
            <div className={css({ flexShrink: 0 })}>
              {avatar ? (
                <Image
                  src={avatar}
                  alt={person.name}
                  width={56}
                  height={56}
                  unoptimized
                  className={css({ w: "14", h: "14", rounded: "full", objectFit: "cover", borderWidth: "2px", borderColor: "rgba(255,255,255,0.12)" })}
                />
              ) : (
                <div
                  className={css({ w: "14", h: "14", rounded: "full", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: "bold", fontSize: "lg", borderWidth: "2px", borderColor: "rgba(255,255,255,0.12)" })}
                  style={{ background: gradient }}
                >
                  {getInitials(person.name)}
                </div>
              )}
            </div>
            <div className={cx("animate-fade-in-up", css({ minW: "0" }))} style={{ animationDelay: "0.15s" }}>
              <h1 className={css({ fontSize: "xl", sm: { fontSize: "2xl" }, fontWeight: "900", color: "#E8E8ED", letterSpacing: "-0.02em" })}>
                Interview Questions
              </h1>
              <p className={css({ color: "#8B8B96", fontSize: "sm", mt: "1" })}>
                {person.name}
                <span className={css({ color: "#7B7B86", mx: "1.5" })}>|</span>
                <span className={css({ color: "#7B7B86" })}>{research.questions.length} questions</span>
              </p>
            </div>
          </div>
        </div>

        <div className={css({ pos: "relative", zIndex: 10, maxW: "7xl", mx: "auto", px: { base: "5", sm: "6", lg: "8" } })}>
          <div className={css({ h: "1px", bgGradient: "to-r", gradientFrom: "transparent", gradientVia: "rgba(255,255,255,0.10)", gradientTo: "transparent" })} />
        </div>
      </div>

      {/* Questions content */}
      <div className={css({ maxW: "7xl", mx: "auto", px: { base: "5", sm: "6", lg: "8" }, pb: { base: "14", md: "20" } })}>
        <ResearchQuestions research={research} />

        {/* Footer */}
        <div className={css({ mt: { base: "14", md: "20" } })}>
          <div className={css({ h: "1px", bg: "rgba(255,255,255,0.06)", mb: { base: "8", md: "10" } })} />
          <div className={css({ display: "flex", flexDir: "column", sm: { flexDir: "row" }, alignItems: "center", justifyContent: "space-between", gap: { base: "4", md: "6" } })}>
            <div className={css({ display: "flex", alignItems: "center", gap: "3", fontSize: "sm" })}>
              <div className={css({ w: "2.5", h: "2.5", rounded: "full", bg: "#7B7B86" })} />
              <span className={css({ color: "#7B7B86" })}>{category.title}</span>
              <span className={css({ color: "#7B7B86" })}>/</span>
              <Link href={`/person/${slug}`} className={css({ color: "#E8E8ED", fontWeight: "medium", _hover: { textDecoration: "underline" } })}>
                {person.name}
              </Link>
              <span className={css({ color: "#7B7B86" })}>/</span>
              <span className={css({ color: "#8B8B96" })}>Questions</span>
            </div>
            <Link
              href={`/person/${slug}`}
              className={cx(
                "group",
                css({
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "2.5",
                  px: "6",
                  py: "3",
                  rounded: "full",
                  bg: "rgba(255,255,255,0.08)",
                  color: "#E8E8ED",
                  fontSize: "sm",
                  fontWeight: "semibold",
                  transition: "all",
                  transitionDuration: "200ms",
                  _hover: { bg: "rgba(255,255,255,0.12)" },
                }),
              )}
            >
              <svg
                viewBox="0 0 16 16"
                className={css({ w: "3.5", h: "3.5", transition: "transform", transitionDuration: "200ms", _groupHover: { transform: "translateX(-0.25rem)" } })}
                fill="currentColor"
              >
                <path d="M11.03 3.97a.75.75 0 0 1 0 1.06L7.56 8.5l3.47 3.47a.75.75 0 1 1-1.06 1.06l-4-4a.75.75 0 0 1 0-1.06l4-4a.75.75 0 0 1 1.06 0z" />
              </svg>
              Back to Profile
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
