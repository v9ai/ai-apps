"use client";

import { useState, useMemo } from "react";
import NavHeader from "./_components/nav-header";
import HeroSection from "./_components/hero-section";
import { CategoryFilter } from "./_components/category-filter";
import { StoryGrid } from "./_components/story-grid";
import { categories, getAllPersonalities } from "@/lib/personalities";
import { quotes } from "@/lib/quotes";
import type { Category } from "@/lib/personalities/types";

/* ── Page component ──────────────────────────────────────────────── */

export default function HomePage() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const allPersonalities = useMemo(() => getAllPersonalities(), []);

  const totalPersonalities = allPersonalities.length;
  const totalPodcasts = useMemo(
    () => allPersonalities.reduce((acc, p) => acc + p.podcasts.length, 0),
    [allPersonalities],
  );

  const filteredPersonalities = useMemo(() => {
    let pool: Category["personalities"];

    if (activeCategory) {
      const cat = categories.find((c) => c.slug === activeCategory);
      pool = cat ? cat.personalities : [];
    } else {
      pool = allPersonalities;
    }

    return pool.filter((p) => p.slug !== "andrej-karpathy");
  }, [activeCategory, allPersonalities]);

  return (
    <main className="min-h-screen bg-[#0B0B0F] text-[#E8E8ED] pt-14">
      {/* ── Fixed navigation ──────────────────────────────────── */}
      <NavHeader
        totalPersonalities={totalPersonalities}
        totalPodcasts={totalPodcasts}
      />

      {/* ── Hero section ──────────────────────────────────────── */}
      <HeroSection totalPersonalities={totalPersonalities} />

      {/* ── "Their Stories" section ───────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 pt-10 pb-32">
        <h2
          className="text-4xl md:text-5xl font-bold text-[#E8E8ED] text-center mb-2"
          style={{ animation: "fade-in-up 0.6s ease-out both", letterSpacing: "-0.02em" }}
        >
          Their Stories
        </h2>
        <p className="text-center text-[11px] uppercase tracking-[0.1em] font-medium text-[#7B7B86] mb-6">
          {totalPersonalities} voices shaping the future of artificial
          intelligence
        </p>
        <div className="gradient-divider max-w-xs mx-auto mb-10" />

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
          <div className="text-center py-12">
            <p className="text-[#7B7B86] text-lg">
              No stories found in this category.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
