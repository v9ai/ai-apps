export function generateAudioKey(prefix?: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `${prefix ? `${prefix}/` : ""}audio-${timestamp}-${random}.mp3`;
}

export function generateScreenshotKey(
  issueId: number,
  filename: string,
): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const ext = filename.split(".").pop() || "png";
  return `screenshots/issue-${issueId}/${timestamp}-${random}.${ext}`;
}
