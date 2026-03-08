#!/usr/bin/env node
/**
 * Generate TTS audio for a blog post and upload to R2.
 * Usage: node scripts/generate-blog-audio.mjs <path-to-index.md>
 *
 * Loads env from apps/research-thera/.env.local
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import OpenAI from "openai";
import {
  S3Client,
  PutObjectCommand,
} from "@aws-sdk/client-s3";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

// Load env manually — script lives inside apps/research-thera/scripts/
const envContent = readFileSync(
  resolve(root, ".env.local"),
  "utf-8",
);
for (const line of envContent.split("\n")) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    const val = match[2].trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const BUCKET = process.env.R2_BUCKET_NAME || "longform-tts";
const PUBLIC_DOMAIN = process.env.R2_PUBLIC_DOMAIN;
const MAX_CHARS = 4000;

// ── helpers ────────────────────────────────────────────────────────────────

function stripMarkdown(md) {
  // Remove frontmatter
  const body = md.replace(/^---[\s\S]*?---\n*/m, "");
  return (
    body
      // Remove markdown formatting but keep text
      .replace(/^#{1,6}\s+/gm, "") // headings
      .replace(/\*\*(.+?)\*\*/g, "$1") // bold
      .replace(/\*(.+?)\*/g, "$1") // italic
      .replace(/`(.+?)`/g, "$1") // inline code
      .replace(/^\s*[-*]\s+/gm, "") // list bullets
      .replace(/^\s*\d+\.\s+/gm, "") // numbered lists
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // links
      .replace(/>\s*/gm, "") // blockquotes
      .replace(/\n{3,}/g, "\n\n") // excess newlines
      .trim()
  );
}

function chunkText(text) {
  if (text.length <= MAX_CHARS) return [text];

  const chunks = [];
  const paragraphs = text.split("\n\n");
  let current = "";

  for (const para of paragraphs) {
    if (current.length + para.length + 2 > MAX_CHARS) {
      if (current) chunks.push(current.trim());
      // If a single paragraph is too long, split by sentences
      if (para.length > MAX_CHARS) {
        const sentences = para.match(/[^.!?]+[.!?]+/g) || [para];
        for (const sentence of sentences) {
          if (current.length + sentence.length > MAX_CHARS) {
            if (current) chunks.push(current.trim());
            current = sentence;
          } else {
            current += sentence;
          }
        }
      } else {
        current = para;
      }
    } else {
      current += (current ? "\n\n" : "") + para;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

// ── main ───────────────────────────────────────────────────────────────────

const mdPath = process.argv[2];
if (!mdPath) {
  console.error("Usage: node scripts/generate-blog-audio.mjs <path-to-index.md>");
  process.exit(1);
}

const md = readFileSync(resolve(mdPath), "utf-8");
const text = stripMarkdown(md);
const chunks = chunkText(text);

console.log(`Article: ${text.length} chars → ${chunks.length} chunks`);

const audioChunks = [];
for (let i = 0; i < chunks.length; i++) {
  console.log(`  Chunk ${i + 1}/${chunks.length} (${chunks[i].length} chars)...`);
  const response = await openai.audio.speech.create({
    model: "gpt-4o-mini-tts",
    voice: "ash",
    input: chunks[i],
    response_format: "mp3",
    speed: 0.9,
    instructions: "Read this article in a clear, engaging, professional podcast style. Natural pacing with slight emphasis on key technical terms.",
  });
  const buffer = Buffer.from(await response.arrayBuffer());
  audioChunks.push(buffer);
}

// Merge
const combined = Buffer.concat(audioChunks);
console.log(`Merged audio: ${(combined.length / 1024 / 1024).toFixed(1)} MB`);

// Extract slug from frontmatter
const fmMatch = md.match(/^---\s*\n([\s\S]*?)\n---/m);
const slugMatch = fmMatch && fmMatch[1].match(/^slug:\s*(.+)$/m);
if (!slugMatch) {
  console.error("Could not extract slug from frontmatter");
  process.exit(1);
}
const slug = slugMatch[1].trim();
const key = `vadim-blog/${slug}-${Date.now()}.mp3`;

await r2.send(
  new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: combined,
    ContentType: "audio/mpeg",
    Metadata: {
      voice: "ash",
      model: "gpt-4o-mini-tts",
      textLength: text.length.toString(),
      chunks: chunks.length.toString(),
      article: slug,
    },
  }),
);

const publicUrl = PUBLIC_DOMAIN ? `${PUBLIC_DOMAIN}/${key}` : key;
console.log(`\nUploaded to R2: ${publicUrl}`);
