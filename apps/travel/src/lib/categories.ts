export const VALID_CATEGORIES = [
  "culture",
  "architecture",
  "nature",
  "entertainment",
  "history",
  "nightlife",
  "food",
] as const;

export type Category = (typeof VALID_CATEGORIES)[number];

export function isValidCategory(slug: string): slug is Category {
  return (VALID_CATEGORIES as readonly string[]).includes(slug);
}

export const CATEGORY_META: Record<
  Category,
  { label: string; icon: string; color: string }
> = {
  culture:       { label: "Culture",       icon: "\u2726", color: "#7C6E9E" },
  architecture:  { label: "Architecture",  icon: "\u25B2", color: "#4A7A9B" },
  nature:        { label: "Nature",        icon: "\u25C8", color: "#5A7A5C" },
  entertainment: { label: "Entertainment", icon: "\u25C7", color: "#9A7E3A" },
  history:       { label: "History",       icon: "\u25C9", color: "#8C6E4A" },
  nightlife:     { label: "Nightlife",     icon: "\u25CF", color: "#8E4E7E" },
  food:          { label: "Food & Drink",  icon: "\u25C6", color: "#B55C3A" },
};
