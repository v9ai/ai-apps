/**
 * Contract/Recruitment Agency Email Generation
 * Specialized email generation for companies tagged with "contract"
 */

export interface ContractEmailInstructions {
  recipientName: string;
  companyName?: string;
  recipientContext?: string;
}

export function buildContractEmailInstructions(
  _input: ContractEmailInstructions
): string {
  return `CRITICAL INSTRUCTIONS - This is a RECRUITMENT AGENCY:

1. Keep email VERY SHORT - max 60-80 words total
2. Ask about fully remote B2B React positions only
3. DO NOT pitch yourself extensively - just ask if they have roles
4. DO NOT ask for full-time employment
5. DO NOT mention any current work, projects, or companies
6. Simply state "12 years of experience as a senior frontend engineer"
7. Be direct and concise
8. DO NOT mention "contract" or "contractor"

Example approach: "I'm a senior frontend engineer with 12 years of experience. I'm looking for fully remote B2B React opportunities. Do you have any suitable roles available?"

Key requirements to mention:
- 12 years of experience
- Fully remote B2B
- Senior frontend level
- Keep it under 80 words

FORBIDDEN topics:
- Trading infrastructure
- Nautilus Trader
- Any current employer or projects
- Specific technical achievements
- The word "contract" or "contractor"`;
}

export function isContractCompany(tags?: string[] | null): boolean {
  return tags?.some((tag) => tag.toLowerCase().includes("contract")) ?? false;
}

export function getContractEmailSubjects(): string[] {
  return [
    "React - Fully Remote B2B Opportunities",
    "Senior React Engineer - Fully Remote",
    "React B2B Opportunities Inquiry",
    "Frontend - Fully Remote B2B",
  ];
}
