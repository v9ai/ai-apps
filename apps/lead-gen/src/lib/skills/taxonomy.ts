/**
 * Skill Taxonomy — re-exports from the unified schema contracts.
 *
 * The canonical skill taxonomy is defined in src/schema/contracts/skill-taxonomy.ts.
 * This file re-exports it as SKILL_LABELS (the name used throughout the codebase)
 * and provides utility functions.
 */

import { SKILL_TAXONOMY, ESCO_SKILL_MAP, ESCO_LABEL_TO_TAG } from "@/schema/contracts/skill-taxonomy";

/** Maps skill tags to human-readable labels. */
export const SKILL_LABELS: Record<string, string> = SKILL_TAXONOMY;

/**
 * Get human-readable label for a skill tag
 */
export function getSkillLabel(tag: string): string {
  return SKILL_LABELS[tag] || tag;
}

/**
 * Format confidence score as percentage
 */
export function formatConfidence(
  confidence: number | null | undefined,
): string {
  if (confidence == null) return "";
  return `${(confidence * 100).toFixed(0)}%`;
}

/**
 * Get the ESCO label for an internal skill tag.
 * Returns undefined if no ESCO mapping exists.
 */
export function getEscoLabel(tag: string): string | undefined {
  return ESCO_SKILL_MAP[tag]?.label;
}

/**
 * Look up internal tag from an ESCO label (case-insensitive).
 */
export function tagFromEscoLabel(escoLabel: string): string | undefined {
  return ESCO_LABEL_TO_TAG[escoLabel.toLowerCase()];
}

export { ESCO_SKILL_MAP, ESCO_LABEL_TO_TAG };
