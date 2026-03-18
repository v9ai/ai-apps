import type { Personality } from "@/lib/personalities/types";
import { StoryCard } from "./story-card";

type StoryGridProps = {
  personalities: Personality[];
  quotes: Record<string, string>;
};

export function StoryGrid({ personalities, quotes }: StoryGridProps) {
  return (
    <div className="columns-1 md:columns-2 lg:columns-3 gap-6">
      {personalities.map((p, i) => (
        <div key={p.slug} className="break-inside-avoid mb-6">
          <StoryCard
            personality={p}
            quote={quotes[p.slug]}
            variant={i % 3 === 2 ? "compact" : "default"}
            index={i}
          />
        </div>
      ))}
    </div>
  );
}
