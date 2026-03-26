export const EMAIL_SUBJECTS = [
  "Frontend engineer looking to connect",
  "Senior engineer exploring opportunities",
  "React/TypeScript engineer interested in your team",
  "Exploring frontend roles",
  "Senior frontend engineer reaching out",
  "Frontend engineer looking for next role",
  "Engineer interested in your work",
  "Looking to connect about frontend roles",
  "Senior engineer - potential collaboration",
  "Frontend specialist exploring opportunities",
  "React engineer looking to contribute",
  "Frontend opportunities at your company",
  "Senior engineer seeking new role",
  "Interested in frontend engineering roles",
  "Frontend engineer - looking to connect",
] as const;

export type EmailSubject = (typeof EMAIL_SUBJECTS)[number];

export function getRandomEmailSubject(): string {
  return EMAIL_SUBJECTS[Math.floor(Math.random() * EMAIL_SUBJECTS.length)];
}

export function getDeterministicEmailSubject(seed: number): string {
  return EMAIL_SUBJECTS[seed % EMAIL_SUBJECTS.length];
}
