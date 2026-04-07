import {
  getFamilyMember,
  getIssuesForFamilyMember,
  getBehaviorObservationsForFamilyMember,
  getTeacherFeedbacksForFamilyMember,
  getContactFeedbacksForFamilyMember,
  getDeepIssueAnalysesForFamilyMember,
  listTherapyResearch,
} from "@/src/db";
import { sql as neonSql } from "@/src/db/neon";

export async function buildConversationSystemPrompt(
  issue: {
    id: number;
    title: string;
    description: string;
    category: string;
    severity: string;
    recommendations: string[] | null;
    familyMemberId: number;
  },
  userEmail: string,
): Promise<string> {
  // Fetch all context in parallel, each with its own error boundary
  const [
    member,
    allIssues,
    observations,
    teacherFeedbacks,
    contactFeedbacks,
    deepAnalyses,
    research,
    characteristics,
  ] = await Promise.all([
    getFamilyMember(issue.familyMemberId).catch(() => null),
    getIssuesForFamilyMember(issue.familyMemberId, undefined, userEmail).catch(() => []),
    getBehaviorObservationsForFamilyMember(issue.familyMemberId, userEmail).catch(() => []),
    getTeacherFeedbacksForFamilyMember(issue.familyMemberId, userEmail).catch(() => []),
    getContactFeedbacksForFamilyMember(issue.familyMemberId, userEmail).catch(() => []),
    getDeepIssueAnalysesForFamilyMember(issue.familyMemberId, userEmail).catch(() => []),
    listTherapyResearch(undefined, issue.id).catch(() => []),
    neonSql`SELECT category, title, description, severity, impairment_domains FROM family_member_characteristics WHERE family_member_id = ${issue.familyMemberId} AND user_id = ${userEmail} ORDER BY created_at DESC`.catch(() => []),
  ]);

  // Build profile sections following the pattern in generateTherapeuticQuestions.ts
  const sections: string[] = [];

  if (member) {
    const parts = [`**${member.firstName}${member.name ? ` ${member.name}` : ""}**`];
    if (member.ageYears) parts.push(`Age: ${member.ageYears}`);
    if (member.relationship) parts.push(`Relationship: ${member.relationship}`);
    if (member.dateOfBirth) parts.push(`DOB: ${member.dateOfBirth}`);
    if (member.bio) parts.push(`Bio: ${member.bio}`);
    sections.push(`### Person Profile\n${parts.join(" | ")}`);
  }

  if (characteristics.length > 0) {
    const charLines = characteristics.map((c: Record<string, unknown>) => {
      const parts = [`- **${c.title}** (${c.category}${c.severity ? `, ${c.severity}` : ""})`];
      if (c.description) parts.push(`  ${c.description}`);
      if (c.impairment_domains) {
        try {
          parts.push(`  Domains: ${JSON.parse(c.impairment_domains as string).join(", ")}`);
        } catch {
          // skip malformed JSON
        }
      }
      return parts.join("\n");
    });
    sections.push(`### Characteristics & Support Needs (${characteristics.length})\n${charLines.join("\n")}`);
  }

  if (allIssues.length > 0) {
    const issueLines = allIssues
      .slice(0, 10)
      .map(
        (i: { title: string; severity: string; category: string; description: string }) =>
          `- **${i.title}** [${i.severity}/${i.category}]: ${i.description.slice(0, 150)}`,
      );
    sections.push(`### All Known Issues (${allIssues.length})\n${issueLines.join("\n")}`);
  }

  if (observations.length > 0) {
    const obsLines = observations
      .slice(0, 10)
      .map(
        (o: { observedAt: string; observationType: string; intensity: string | null; notes: string | null }) =>
          `- ${o.observedAt}: ${o.observationType}${o.intensity ? ` (${o.intensity})` : ""}${o.notes ? ` — ${o.notes.slice(0, 100)}` : ""}`,
      );
    sections.push(`### Recent Behavior Observations (${observations.length})\n${obsLines.join("\n")}`);
  }

  if (teacherFeedbacks.length > 0) {
    const tfLines = teacherFeedbacks
      .slice(0, 5)
      .map(
        (tf: { feedbackDate: string; teacherName: string; subject: string | null; content: string }) =>
          `- ${tf.feedbackDate} (${tf.teacherName}${tf.subject ? `, ${tf.subject}` : ""}): ${tf.content.slice(0, 150)}`,
      );
    sections.push(`### Teacher Feedbacks (${teacherFeedbacks.length})\n${tfLines.join("\n")}`);
  }

  if (contactFeedbacks.length > 0) {
    const cfLines = contactFeedbacks
      .slice(0, 5)
      .map(
        (cf: { feedbackDate: string; subject: string | null; content: string }) =>
          `- ${cf.feedbackDate}${cf.subject ? ` (${cf.subject})` : ""}: ${cf.content.slice(0, 150)}`,
      );
    sections.push(`### Contact Feedbacks (${contactFeedbacks.length})\n${cfLines.join("\n")}`);
  }

  if (deepAnalyses.length > 0) {
    const daLines = deepAnalyses
      .slice(0, 3)
      .map((da: { summary: string }) => `- ${da.summary.slice(0, 200)}`);
    sections.push(`### Deep Issue Analyses (${deepAnalyses.length})\n${daLines.join("\n")}`);
  }

  // Build research section
  let researchSection = "";
  if (research.length > 0) {
    const researchLines = research
      .slice(0, 5)
      .map((r, i) => {
        const parts = [`[${i + 1}] "${r.title}"`];
        if (r.keyFindings.length > 0) {
          parts.push(`  Key findings: ${r.keyFindings.slice(0, 2).join("; ")}`);
        }
        if (r.evidenceLevel) {
          parts.push(`  Evidence level: ${r.evidenceLevel}`);
        }
        return parts.join("\n");
      });
    researchSection = researchLines.join("\n\n");
  }

  // Assemble the recommendations line
  const recText = issue.recommendations?.length
    ? `\nRecommendations: ${issue.recommendations.join(", ")}`
    : "";

  // Assemble the full context section
  const fullProfileContext = sections.length > 0 ? sections.join("\n\n") : "";

  // Build the final system prompt
  const prompt = [
    `You are a compassionate therapeutic advisor helping a parent understand and address a child's issue. Provide practical, evidence-based guidance in a warm, supportive tone. Keep responses focused and actionable. Ground your advice in the research findings provided below when relevant.`,
    ``,
    `## Current Issue`,
    `Issue: ${issue.title}`,
    `Description: ${issue.description}`,
    `Category: ${issue.category}`,
    `Severity: ${issue.severity}${recText}`,
  ];

  if (fullProfileContext) {
    prompt.push(``, `## Full Profile Context`, fullProfileContext);
  }

  if (researchSection) {
    prompt.push(``, `## Relevant Research`, researchSection);
  }

  return prompt.join("\n");
}
