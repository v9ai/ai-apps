export type {
  Paper,
  TimelineEvent,
  Contribution,
  Quote,
  PersonResearch,
  Personality,
  Category,
  TimelineSource,
  EnrichedTimelineEvent,
} from "./types";

import type { Category, Personality, PersonResearch, EnrichedTimelineEvent } from "./types";

// Lab Leaders & Founders
import samAltman from "../../../personalities/sam-altman";
import darioAmodei from "../../../personalities/dario-amodei";
import jensenHuang from "../../../personalities/jensen-huang";
import liangWenfeng from "../../../personalities/liang-wenfeng";
import yangZhilin from "../../../personalities/yang-zhilin";

// Builders & Technical Leaders
import andrejKarpathy from "../../../personalities/andrej-karpathy";
import borisCherny from "../../../personalities/boris-cherny";
import harrisonChase from "../../../personalities/harrison-chase";
import jerryLiu from "../../../personalities/jerry-liu";
import ilyaSutskever from "../../../personalities/ilya-sutskever";
import joaoMoura from "../../../personalities/joao-moura";
import samuelColvin from "../../../personalities/samuel-colvin";
import jeffreyIp from "../../../personalities/jeffrey-ip";

// Researchers & Thinkers
import yannLecun from "../../../personalities/yann-lecun";
import demisHassabis from "../../../personalities/demis-hassabis";
import feifeiLi from "../../../personalities/fei-fei-li";
import geoffreyHinton from "../../../personalities/geoffrey-hinton";
import athosGeorgiou from "../../../personalities/athos-georgiou";

// Podcast Hosts & AI Personalities
import dwarkeshPatel from "../../../personalities/dwarkesh-patel";

// Rising Infrastructure & Product Leaders
import amjadMasad from "../../../personalities/amjad-masad";
import mustafaSuleyman from "../../../personalities/mustafa-suleyman";
import amandaAskell from "../../../personalities/amanda-askell";
import noamShazeer from "../../../personalities/noam-shazeer";

// AI Infrastructure & Inference
import swamiSivasubramanian from "../../../personalities/swami-sivasubramanian";
import woosukKwon from "../../../personalities/woosuk-kwon";
import jeffreyMorgan from "../../../personalities/jeffrey-morgan";
import alexAtallah from "../../../personalities/alex-atallah";
import yagilBurowski from "../../../personalities/yagil-burowski";
import krrishDholakia from "../../../personalities/krrish-dholakia";
import rohitAgarwal from "../../../personalities/rohit-agarwal";

// Vector Database Founders
import jeffHuber from "../../../personalities/jeff-huber";
import bobVanLuijt from "../../../personalities/bob-van-luijt";
import andreZayarni from "../../../personalities/andre-zayarni";
import vasilijeMarkovic from "../../../personalities/vasilije-markovic";
import shayBanon from "../../../personalities/shay-banon";
import andrewKane from "../../../personalities/andrew-kane";

export const categories: Category[] = [
  {
    title: "Lab Leaders & Founders",
    slug: "lab-leaders",
    personalities: [samAltman, darioAmodei, jensenHuang, liangWenfeng, yangZhilin],
  },
  {
    title: "Builders & Technical Leaders",
    slug: "builders",
    personalities: [andrejKarpathy, borisCherny, harrisonChase, jerryLiu, ilyaSutskever, joaoMoura, samuelColvin, jeffreyIp],
  },
  {
    title: "Researchers & Thinkers",
    slug: "researchers",
    personalities: [yannLecun, demisHassabis, feifeiLi, geoffreyHinton, athosGeorgiou],
  },
  {
    title: "Podcast Hosts & AI Personalities",
    slug: "hosts",
    personalities: [dwarkeshPatel],
  },
  {
    title: "Rising Infrastructure & Product Leaders",
    slug: "rising-leaders",
    personalities: [amjadMasad, mustafaSuleyman, amandaAskell, noamShazeer],
  },
  {
    title: "AI Infrastructure & Inference",
    slug: "infrastructure",
    personalities: [swamiSivasubramanian, woosukKwon, jeffreyMorgan, alexAtallah, yagilBurowski, krrishDholakia, rohitAgarwal],
  },
  {
    title: "Vector Database Founders",
    slug: "vector-dbs",
    personalities: [jeffHuber, bobVanLuijt, andreZayarni, vasilijeMarkovic, shayBanon, andrewKane],
  },
];

const categoryColors: Record<string, string> = {
  "lab-leaders": "from-violet-500 to-purple-600",
  builders: "from-blue-500 to-cyan-600",
  researchers: "from-emerald-500 to-teal-600",
  hosts: "from-amber-500 to-orange-600",
  "rising-leaders": "from-rose-500 to-pink-600",
  infrastructure: "from-sky-500 to-indigo-600",
  "vector-dbs": "from-lime-500 to-green-600",
};

export function getCategoryColor(slug: string): string {
  return categoryColors[slug] ?? "from-gray-500 to-gray-600";
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export function getAvatarUrl(p: Personality): string | null {
  if (p.linkedinImage) return p.linkedinImage;
  return p.github ? `https://github.com/${p.github}.png?size=200` : null;
}

/** Server-only: resolve avatar with enrichment image search fallback. */
export function getAvatarUrlWithEnrichment(p: Personality, enrichedImageUrl?: string | null): string | null {
  if (p.linkedinImage) return p.linkedinImage;
  if (enrichedImageUrl) return enrichedImageUrl;
  return p.github ? `https://github.com/${p.github}.png?size=200` : null;
}

export function getAllPersonalities(): Personality[] {
  return categories.flatMap((c) => c.personalities);
}

export function getPersonalityBySlug(slug: string): Personality | undefined {
  return getAllPersonalities().find((p) => p.slug === slug);
}

export function getCategoryForPersonality(slug: string): Category | undefined {
  return categories.find((c) => c.personalities.some((p) => p.slug === slug));
}

export function getResearch(slug: string): PersonResearch | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require(`../research/${slug}.json`) as PersonResearch;
  } catch {
    return null;
  }
}

export function getEnrichedTimeline(slug: string): EnrichedTimelineEvent[] | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const data = require(`../research/${slug}-timeline.json`) as {
      events: EnrichedTimelineEvent[];
    };
    return data.events;
  } catch {
    return null;
  }
}
