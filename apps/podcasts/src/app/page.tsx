"use client";

import { useState, useMemo } from "react";
import NavHeader from "./_components/nav-header";
import HeroSection from "./_components/hero-section";
import { FeaturedStory } from "./_components/featured-story";
import { CategoryFilter } from "./_components/category-filter";
import { StoryGrid } from "./_components/story-grid";
import {
  categories,
  getAllPersonalities,
  getCategoryForPersonality,
} from "@/lib/personalities";
import type { Category } from "@/lib/personalities/types";

/* ── Static quotes map ───────────────────────────────────────────── */

const quotes: Record<string, string> = {
  "sam-altman":
    "The thing I lose the most sleep over is the hypothetical that we already have done something really bad by releasing these systems.",
  "dario-amodei":
    "I think the most important thing about AI safety is that it should be thought of as an engineering discipline, not a philosophical one.",
  "andrej-karpathy":
    "The hottest new programming language is English.",
  "jensen-huang":
    "Software is eating the world, but AI is going to eat software.",
  "lex-fridman":
    "I think the most beautiful thing about being human is the capacity for love in the face of suffering.",
  "yann-lecun":
    "Our intelligence is what makes us human, and AI is an extension of that quality.",
  "geoffrey-hinton":
    "I suddenly switched my views on whether these things are going to be more intelligent than us. I think they're going to be more intelligent than us.",
  "demis-hassabis":
    "If we can solve intelligence, we can use it to solve everything else.",
  "fei-fei-li":
    "If we want machines to think, we need to teach them to see.",
  "ilya-sutskever":
    "At some point it will be quite clear that the neural network is alive.",
  "harrison-chase":
    "We're building the connective tissue between language models and the rest of the world.",
  "liang-wenfeng":
    "We chose to open-source because we believe AI should be a shared technology for all of humanity.",
  "mustafa-suleyman":
    "The measure of our success will not be how smart we make our machines, but how much they help the most vulnerable.",
  "dwarkesh-patel":
    "The best conversations happen when you let brilliant people think out loud.",
  "noam-shazeer":
    "Attention is all you need... and a really good team.",
  "amjad-masad":
    "The future of programming is not about writing code, it's about describing what you want.",
  "yang-zhilin":
    "We don't just want to make models bigger — we want to make them think deeper.",
  "boris-cherny":
    "TypeScript isn't just a language — it's how we teach machines to understand our intentions.",
  "jerry-liu":
    "The future of AI isn't just about the models — it's about connecting them to the world's knowledge.",
  "joao-moura":
    "AI agents aren't replacing humans — they're giving humans superpowers.",
  "samuel-colvin":
    "Good tools should be invisible — they should just work and get out of your way.",
  "amanda-askell":
    "Making AI safe isn't about restrictions — it's about building systems that genuinely understand human values.",
  "jeff-huber":
    "The way we search will fundamentally change when machines truly understand meaning.",
  "bob-van-luijt":
    "Every piece of data has meaning. Vector databases help machines understand it.",
  "athos-georgiou":
    "The gap between research and reality is where the most interesting AI work happens.",
};

/* ── Featured personality ────────────────────────────────────────── */

const FEATURED_SLUG = "andrej-karpathy";

/* ── Page component ──────────────────────────────────────────────── */

export default function HomePage() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const allPersonalities = useMemo(() => getAllPersonalities(), []);

  const totalPersonalities = allPersonalities.length;
  const totalPodcasts = useMemo(
    () => allPersonalities.reduce((acc, p) => acc + p.podcasts.length, 0),
    [allPersonalities],
  );

  const featured = useMemo(
    () => allPersonalities.find((p) => p.slug === FEATURED_SLUG) ?? allPersonalities[0],
    [allPersonalities],
  );

  const featuredCategory = useMemo(
    () => getCategoryForPersonality(featured.slug),
    [featured.slug],
  );

  /* Filtered personalities for the grid, excluding the featured */
  const filteredPersonalities = useMemo(() => {
    let pool: Category["personalities"];

    if (activeCategory) {
      const cat = categories.find((c) => c.slug === activeCategory);
      pool = cat ? cat.personalities : [];
    } else {
      pool = allPersonalities;
    }

    return pool.filter((p) => p.slug !== featured.slug);
  }, [activeCategory, allPersonalities, featured.slug]);

  return (
    <main className="min-h-screen bg-[#FAFAF7] text-[#1a1a1a]">
      {/* ── Fixed navigation ──────────────────────────────────── */}
      <NavHeader
        totalPersonalities={totalPersonalities}
        totalPodcasts={totalPodcasts}
      />

      {/* ── Hero section ──────────────────────────────────────── */}
      <HeroSection totalPersonalities={totalPersonalities} />

      {/* ── Featured story ────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-6 pb-20">
        <FeaturedStory
          personality={featured}
          quote={quotes[featured.slug] ?? featured.description}
          categoryName={featuredCategory?.title ?? ""}
        />
      </div>

      {/* ── Divider ────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-6">
        <div className="h-px bg-neutral-200" />
      </div>

      {/* ── "Their Stories" section ───────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 pt-20 pb-28">
        <h2
          className="font-[family-name:var(--font-playfair)] text-4xl md:text-5xl font-bold text-[#1a1a1a] text-center mb-3"
          style={{ animation: "fade-in-up 0.6s ease-out both" }}
        >
          Their Stories
        </h2>
        <p className="text-neutral-500 text-center text-sm mb-10">
          {totalPersonalities} voices shaping the future of artificial
          intelligence
        </p>

        {/* ── Category filter pills ───────────────────────────── */}
        <div className="mb-12">
          <CategoryFilter
            categories={categories}
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
          />
        </div>

        {/* ── Masonry story grid ──────────────────────────────── */}
        <StoryGrid
          personalities={filteredPersonalities}
          quotes={quotes}
        />

        {/* Empty state */}
        {filteredPersonalities.length === 0 && (
          <div className="text-center py-20">
            <p className="text-neutral-400 text-lg">
              No stories found in this category.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
