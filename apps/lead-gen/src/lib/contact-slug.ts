/**
 * Contact slug derivation utility.
 *
 * Priority: github_handle > LinkedIn username > first-last name.
 */

function extractLinkedInUsername(url: string): string | null {
  const match = url.match(/linkedin\.com\/in\/([^/?#]+)/);
  return match?.[1]?.toLowerCase() ?? null;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function deriveContactSlug(contact: {
  github_handle?: string | null;
  linkedin_url?: string | null;
  first_name: string;
  last_name: string;
}): string {
  if (contact.github_handle) {
    return slugify(contact.github_handle);
  }
  if (contact.linkedin_url) {
    const username = extractLinkedInUsername(contact.linkedin_url);
    if (username) return username;
  }
  return slugify(`${contact.first_name}-${contact.last_name}`);
}
