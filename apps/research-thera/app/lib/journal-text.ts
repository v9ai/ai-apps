export type SplitEntry = { title: string | null; content: string };

export function splitEntryText(text: string): SplitEntry {
  const trimmed = text.trim();
  if (!trimmed) return { title: null, content: "" };
  const newlineIdx = trimmed.indexOf("\n");
  if (newlineIdx === -1) {
    return { title: trimmed, content: "" };
  }
  return {
    title: trimmed.slice(0, newlineIdx).trim() || null,
    content: trimmed.slice(newlineIdx + 1).trim(),
  };
}

export function joinTitleAndContent(
  title: string | null | undefined,
  content: string | null | undefined,
): string {
  return [title, content].filter((v): v is string => !!v && v.length > 0).join("\n\n");
}
