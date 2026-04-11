import { readFileSync } from "fs";
import { join } from "path";

export type Episode = {
  spotify_id: string;
  name: string;
  description: string;
  show_name: string;
  show_id: string;
  publisher: string;
  release_date: string;
  duration_ms: number;
  duration_min: number;
  url: string;
  image: string;
  guest_query: string;
  guest_slug: string;
  category: string;
};

function loadEpisodes(): Episode[] {
  try {
    const raw = readFileSync(
      join(process.cwd(), "spotify_episodes.json"),
      "utf-8",
    );
    return JSON.parse(raw) as Episode[];
  } catch {
    return [];
  }
}

/** All episodes for a person slug, newest first. */
export function getEpisodesForPerson(slug: string): Episode[] {
  return loadEpisodes()
    .filter((ep) => ep.guest_slug === slug)
    .sort((a, b) => b.release_date.localeCompare(a.release_date));
}

/** All episodes for a category slug, newest first. */
export function getEpisodesForCategory(slug: string): Episode[] {
  return loadEpisodes()
    .filter((ep) => ep.category === slug)
    .sort((a, b) => b.release_date.localeCompare(a.release_date));
}

/** Total episode count (for stats). */
export function getEpisodeCount(): number {
  return loadEpisodes().length;
}
