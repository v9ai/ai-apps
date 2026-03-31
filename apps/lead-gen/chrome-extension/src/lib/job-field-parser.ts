/**
 * Regex-based parser for job-specific fields from LinkedIn post text.
 * Extracts rate, IR35 status, duration, remote type, and contract type.
 */

export interface ParsedJobFields {
  rate: string | null;
  ir35Status: "outside" | "inside" | null;
  duration: string | null;
  remoteType: "fully_remote" | "remote" | "hybrid" | "onsite" | null;
  contractType: "contract" | "permanent" | "ftc" | null;
}

export function parseJobFields(text: string): ParsedJobFields {
  const t = text.toLowerCase();

  // Day rate: £500/day, £600pd, £650 per day, £700 p.d., $800/day
  const rateMatch = text.match(/[£$€]\s*\d{2,4}(?:,\d{3})?\s*(?:\/\s*day|pd|per\s*day|p\.?\s*d\.?|per\s*diem)/i)
    ?? text.match(/\d{3,4}\s*(?:\/\s*day|pd|per\s*day)\s*(?:gbp|usd|eur)?/i);
  const rate = rateMatch ? rateMatch[0].trim() : null;

  // IR35 status
  const ir35Match = t.match(/(outside|inside)\s+ir35/);
  const ir35Status = ir35Match ? (ir35Match[1] as "outside" | "inside") : null;

  // Duration: 6 months, 3-6 months, 12 month, 2 years
  const durationMatch = text.match(/(\d+\s*[-–]\s*\d+|\d+)\s*(months?|weeks?|years?)/i);
  const duration = durationMatch ? durationMatch[0].trim() : null;

  // Remote type
  let remoteType: ParsedJobFields["remoteType"] = null;
  if (/fully\s+remote|100%\s+remote/.test(t)) remoteType = "fully_remote";
  else if (/\bremote\b/.test(t)) remoteType = "remote";
  else if (/\bhybrid\b/.test(t)) remoteType = "hybrid";
  else if (/\bon[\s-]?site\b|\bin[\s-]?office\b/.test(t)) remoteType = "onsite";

  // Contract type
  let contractType: ParsedJobFields["contractType"] = null;
  if (/\bcontract\b/.test(t)) contractType = "contract";
  else if (/\bpermanent\b|\bperm\b/.test(t)) contractType = "permanent";
  else if (/\bftc\b|\bfixed[\s-]term\b/.test(t)) contractType = "ftc";

  return { rate, ir35Status, duration, remoteType, contractType };
}
