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
import markZuckerberg from "../../../personalities/mark-zuckerberg";
import sundarPichai from "../../../personalities/sundar-pichai";
import satyaNadella from "../../../personalities/satya-nadella";
import clementDelangue from "../../../personalities/clement-delangue";
import julienChaumond from "../../../personalities/julien-chaumond";
import thomasWolf from "../../../personalities/thomas-wolf";
import arthurMensch from "../../../personalities/arthur-mensch";
import aidanGomez from "../../../personalities/aidan-gomez";
import danielaAmodei from "../../../personalities/daniela-amodei";

// Builders & Technical Leaders
import andrejKarpathy from "../../../personalities/andrej-karpathy";
import borisCherny from "../../../personalities/boris-cherny";
import harrisonChase from "../../../personalities/harrison-chase";
import jerryLiu from "../../../personalities/jerry-liu";
import ilyaSutskever from "../../../personalities/ilya-sutskever";
import joaoMoura from "../../../personalities/joao-moura";
import samuelColvin from "../../../personalities/samuel-colvin";
import simonWillison from "../../../personalities/simon-willison";
import jeffreyIp from "../../../personalities/jeffrey-ip";
import gregBrockman from "../../../personalities/greg-brockman";
import miraMurati from "../../../personalities/mira-murati";
import chrisLattner from "../../../personalities/chris-lattner";
import georgeHotz from "../../../personalities/george-hotz";
import guillaumeLample from "../../../personalities/guillaume-lample";
import mateiZaharia from "../../../personalities/matei-zaharia";
import soumithChintala from "../../../personalities/soumith-chintala";
import paulGauthier from "../../../personalities/paul-gauthier";
import killianLucas from "../../../personalities/killian-lucas";
import jeremyHoward from "../../../personalities/jeremy-howard";
import robertBrennan from "../../../personalities/robert-brennan";
import lewisTunstall from "../../../personalities/lewis-tunstall";
import omarSanseviero from "../../../personalities/omar-sanseviero";
import sylvainGugger from "../../../personalities/sylvain-gugger";
import xingyaoWang from "../../../personalities/xingyao-wang";
import younesBelkada from "../../../personalities/younes-belkada";
import teknium from "../../../personalities/teknium";
import philippSchmid from "../../../personalities/philipp-schmid";
import toranRichards from "../../../personalities/toran-richards";
import ericHartford from "../../../personalities/eric-hartford";
import yihDarShieh from "../../../personalities/yih-dar-shieh";
import erikBjareholt from "../../../personalities/erik-bjareholt";
import siruiHong from "../../../personalities/sirui-hong";
import nateRaw from "../../../personalities/nate-raw";
import lysandreDebut from "../../../personalities/lysandre-debut";

import jasonLiu from "../../../personalities/jason-liu";
import hamelHusain from "../../../personalities/hamel-husain";
import patrickVonPlaten from "../../../personalities/patrick-von-platen";
import chiWang from "../../../personalities/chi-wang";
import anushaLihala from "../../../personalities/anusha-lihala";
import joshuaMo from "../../../personalities/joshua-mo";
import janniTurunen from "../../../personalities/janni-turunen";

// Researchers & Thinkers
import yannLecun from "../../../personalities/yann-lecun";
import demisHassabis from "../../../personalities/demis-hassabis";
import feifeiLi from "../../../personalities/fei-fei-li";
import geoffreyHinton from "../../../personalities/geoffrey-hinton";
import athosGeorgiou from "../../../personalities/athos-georgiou";
import ashishVaswani from "../../../personalities/ashish-vaswani";
import ianGoodfellow from "../../../personalities/ian-goodfellow";
import yoshuaBengio from "../../../personalities/yoshua-bengio";
import andrewNg from "../../../personalities/andrew-ng";
import janLeike from "../../../personalities/jan-leike";
import jasonWei from "../../../personalities/jason-wei";
import francoisChollet from "../../../personalities/francois-chollet";
import timDettmers from "../../../personalities/tim-dettmers";
import omarKhattab from "../../../personalities/omar-khattab";
import triDao from "../../../personalities/tri-dao";
import hongyiZhang from "../../../personalities/hongyi-zhang";
import bernhardScholkopf from "../../../personalities/bernhard-scholkopf";
import nicholasCarlini from "../../../personalities/nicholas-carlini";
import alexanderRush from "../../../personalities/alexander-rush";
import edwardBeeching from "../../../personalities/edward-beeching";

// Podcast Hosts & AI Personalities
import dwarkeshPatel from "../../../personalities/dwarkesh-patel";
import lexFridman from "../../../personalities/lex-fridman";
import pieterLevels from "../../../personalities/pieter-levels";

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
import ishaanJaff from "../../../personalities/ishaan-jaff";
import rohitAgarwal from "../../../personalities/rohit-agarwal";
import richardLiaw from "../../../personalities/richard-liaw";
import georgiGerganov from "../../../personalities/georgi-gerganov";
import danielHan from "../../../personalities/daniel-han";
import robertNishihara from "../../../personalities/robert-nishihara";
import lukasBiewald from "../../../personalities/lukas-biewald";
import connorHolmes from "../../../personalities/connor-holmes";
import zachNussbaum from "../../../personalities/zach-nussbaum";

import seanOwen from "../../../personalities/sean-owen";

// Vector Database Founders
import jeffHuber from "../../../personalities/jeff-huber";
import bobVanLuijt from "../../../personalities/bob-van-luijt";
import andreZayarni from "../../../personalities/andre-zayarni";
import vasilijeMarkovic from "../../../personalities/vasilije-markovic";
import shayBanon from "../../../personalities/shay-banon";
import andrewKane from "../../../personalities/andrew-kane";

import crispinCourtenay from "../../../personalities/crispin-courtenay";

export const categories: Category[] = [
  {
    title: "Lab Leaders & Founders",
    slug: "lab-leaders",
    personalities: [samAltman, darioAmodei, jensenHuang, liangWenfeng, yangZhilin, markZuckerberg, sundarPichai, satyaNadella, clementDelangue, julienChaumond, thomasWolf, arthurMensch, aidanGomez, danielaAmodei],
  },
  {
    title: "Builders & Technical Leaders",
    slug: "builders",
    personalities: [andrejKarpathy, borisCherny, harrisonChase, jerryLiu, ilyaSutskever, joaoMoura, samuelColvin, simonWillison, jeffreyIp, gregBrockman, miraMurati, chrisLattner, georgeHotz, guillaumeLample, mateiZaharia, soumithChintala, paulGauthier, jeremyHoward, omarSanseviero, sylvainGugger, lewisTunstall, philippSchmid, toranRichards, xingyaoWang, younesBelkada, killianLucas, teknium, ericHartford, robertBrennan, erikBjareholt, jasonLiu, nateRaw, yihDarShieh, siruiHong, hamelHusain, patrickVonPlaten, chiWang, lysandreDebut, anushaLihala, joshuaMo, janniTurunen, crispinCourtenay],
  },
  {
    title: "Researchers & Thinkers",
    slug: "researchers",
    personalities: [yannLecun, demisHassabis, feifeiLi, geoffreyHinton, athosGeorgiou, ashishVaswani, ianGoodfellow, yoshuaBengio, andrewNg, janLeike, nicholasCarlini, jasonWei, francoisChollet, omarKhattab, timDettmers, hongyiZhang, bernhardScholkopf, alexanderRush, triDao, edwardBeeching],
  },
  {
    title: "Podcast Hosts & AI Personalities",
    slug: "hosts",
    personalities: [dwarkeshPatel, lexFridman, pieterLevels],
  },
  {
    title: "Rising Infrastructure & Product Leaders",
    slug: "rising-leaders",
    personalities: [amjadMasad, mustafaSuleyman, amandaAskell, noamShazeer],
  },
  {
    title: "AI Infrastructure & Inference",
    slug: "infrastructure",
    personalities: [swamiSivasubramanian, woosukKwon, jeffreyMorgan, alexAtallah, yagilBurowski, krrishDholakia, ishaanJaff, rohitAgarwal, georgiGerganov, robertNishihara, danielHan, richardLiaw, connorHolmes, lukasBiewald, seanOwen, zachNussbaum],
  },
  {
    title: "Vector Database Founders",
    slug: "vector-dbs",
    personalities: [jeffHuber, bobVanLuijt, andreZayarni, vasilijeMarkovic, shayBanon, andrewKane],
  },
];

const categoryColors: Record<string, string> = {
  "lab-leaders": "linear-gradient(to bottom, #8b5cf6, #9333ea)",
  builders: "linear-gradient(to bottom, #3b82f6, #0891b2)",
  researchers: "linear-gradient(to bottom, #10b981, #0d9488)",
  hosts: "linear-gradient(to bottom, #f59e0b, #ea580c)",
  "rising-leaders": "linear-gradient(to bottom, #f43f5e, #db2777)",
  infrastructure: "linear-gradient(to bottom, #0ea5e9, #4f46e5)",
  "vector-dbs": "linear-gradient(to bottom, #84cc16, #16a34a)",
};

export function getCategoryColor(slug: string): string {
  return categoryColors[slug] ?? "linear-gradient(to bottom, #6b7280, #4b5563)";
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
  return p.github ? `https://avatars.githubusercontent.com/${p.github}` : null;
}

/** Server-only: resolve avatar with enrichment image search fallback. */
export function getAvatarUrlWithEnrichment(p: Personality, enrichedImageUrl?: string | null): string | null {
  if (p.linkedinImage) return p.linkedinImage;
  if (enrichedImageUrl) return enrichedImageUrl;
  return p.github ? `https://avatars.githubusercontent.com/${p.github}` : null;
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
