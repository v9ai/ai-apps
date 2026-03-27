export function parseYoutubeUrl(url: string): string {
  const match = url.match(
    /(?:v=|youtu\.be\/|embed\/|shorts\/)([a-zA-Z0-9_-]{11})/
  );
  if (!match) throw new Error("Invalid YouTube URL");
  return match[1];
}
