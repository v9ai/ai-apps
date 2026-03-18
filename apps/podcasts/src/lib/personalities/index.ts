export type {
  Paper,
  TimelineEvent,
  Contribution,
  Quote,
  PersonResearch,
  Personality,
  Category,
} from "./types";

import type { Category, Personality, PersonResearch } from "./types";

// Lab Leaders & Founders
import samAltman from "./data/sam-altman";
import darioAmodei from "./data/dario-amodei";
import jensenHuang from "./data/jensen-huang";
import liangWenfeng from "./data/liang-wenfeng";
import yangZhilin from "./data/yang-zhilin";

// Builders & Technical Leaders
import andrejKarpathy from "./data/andrej-karpathy";
import borisCherny from "./data/boris-cherny";
import harrisonChase from "./data/harrison-chase";
import jerryLiu from "./data/jerry-liu";
import ilyaSutskever from "./data/ilya-sutskever";
import joaoMoura from "./data/joao-moura";
import samuelColvin from "./data/samuel-colvin";

// Researchers & Thinkers
import yannLecun from "./data/yann-lecun";
import demisHassabis from "./data/demis-hassabis";
import feifeiLi from "./data/fei-fei-li";
import geoffreyHinton from "./data/geoffrey-hinton";
import athosGeorgiou from "./data/athos-georgiou";

// Podcast Hosts & AI Personalities
import lexFridman from "./data/lex-fridman";
import dwarkeshPatel from "./data/dwarkesh-patel";

// Rising Infrastructure & Product Leaders
import amjadMasad from "./data/amjad-masad";
import mustafaSuleyman from "./data/mustafa-suleyman";
import amandaAskell from "./data/amanda-askell";
import noamShazeer from "./data/noam-shazeer";

// AI Infrastructure & Inference
import swamiSivasubramanian from "./data/swami-sivasubramanian";
import woosukKwon from "./data/woosuk-kwon";
import jeffreyMorgan from "./data/jeffrey-morgan";
import alexAtallah from "./data/alex-atallah";
import yagilBurowski from "./data/yagil-burowski";
import krrishDholakia from "./data/krrish-dholakia";
import rohitAgarwal from "./data/rohit-agarwal";

// Vector Database Founders
import jeffHuber from "./data/jeff-huber";
import bobVanLuijt from "./data/bob-van-luijt";
import andreZayarni from "./data/andre-zayarni";
import vasilijeMarkovic from "./data/vasilije-markovic";
import shayBanon from "./data/shay-banon";
import andrewKane from "./data/andrew-kane";

export const categories: Category[] = [
  {
    title: "Lab Leaders & Founders",
    slug: "lab-leaders",
    personalities: [samAltman, darioAmodei, jensenHuang, liangWenfeng, yangZhilin],
  },
  {
    title: "Builders & Technical Leaders",
    slug: "builders",
    personalities: [andrejKarpathy, borisCherny, harrisonChase, jerryLiu, ilyaSutskever, joaoMoura, samuelColvin],
  },
  {
    title: "Researchers & Thinkers",
    slug: "researchers",
    personalities: [yannLecun, demisHassabis, feifeiLi, geoffreyHinton, athosGeorgiou],
  },
  {
    title: "Podcast Hosts & AI Personalities",
    slug: "hosts",
    personalities: [lexFridman, dwarkeshPatel],
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
