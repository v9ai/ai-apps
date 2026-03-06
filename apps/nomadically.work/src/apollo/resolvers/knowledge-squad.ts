import type { GraphQLContext } from "../context";
import { applications, resumes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { isAdminEmail } from "@/lib/admin";
import { generateApplicationStrategy } from "@/agents/knowledge-squad/strategy";

export const knowledgeSquadResolvers = {
  Job: {
    enrichment(parent: {
      salary_min: number | null;
      salary_max: number | null;
      salary_currency: string | null;
      visa_sponsorship: boolean | number | null;
      enrichment_status: string | null;
    }) {
      if (!parent.enrichment_status) return null;
      return {
        salaryMin: parent.salary_min,
        salaryMax: parent.salary_max,
        salaryCurrency: parent.salary_currency,
        visaSponsorship:
          parent.visa_sponsorship === 1 ||
          parent.visa_sponsorship === true ||
          null,
        enrichmentStatus: parent.enrichment_status,
      };
    },
  },

  Application: {
    applicationStrategy(parent: { ai_application_strategy: string | null }) {
      if (!parent.ai_application_strategy) return null;
      try {
        return JSON.parse(parent.ai_application_strategy);
      } catch {
        return null;
      }
    },
  },

  Mutation: {
    async generateApplicationStrategy(
      _parent: unknown,
      args: { applicationId: number },
      context: GraphQLContext,
    ) {
      if (!context.userId) {
        throw new Error("Forbidden");
      }

      const [app] = await context.db
        .select()
        .from(applications)
        .where(eq(applications.id, args.applicationId))
        .limit(1);

      if (!app) {
        throw new Error("Application not found");
      }

      // Fetch resume for strategy generation
      const [resume] = await context.db
        .select()
        .from(resumes)
        .where(eq(resumes.user_id, app.user_email))
        .limit(1);

      const strategy = await generateApplicationStrategy({
        jobTitle: app.job_title || "Unknown",
        companyName: app.company_name || "Unknown",
        jobDescription: app.job_description || app.job_title || "",
        resumeText: resume?.raw_text || "No resume available",
      });

      const strategyJson = JSON.stringify({
        ...strategy,
        generatedAt: new Date().toISOString(),
      });

      await context.db
        .update(applications)
        .set({
          ai_application_strategy: strategyJson,
          updated_at: new Date().toISOString(),
        })
        .where(eq(applications.id, args.applicationId));

      // Return updated application
      const [updated] = await context.db
        .select()
        .from(applications)
        .where(eq(applications.id, args.applicationId))
        .limit(1);

      return {
        id: updated!.id,
        email: updated!.user_email,
        jobId: updated!.job_id,
        resume: updated!.resume_url,
        questions: updated!.questions ? JSON.parse(updated!.questions) : [],
        status: updated!.status,
        notes: updated!.notes ?? null,
        jobTitle: updated!.job_title ?? null,
        companyName: updated!.company_name ?? null,
        companyKey: null,
        jobDescription: updated!.job_description ?? null,
        createdAt: updated!.created_at,
        aiInterviewPrep: updated!.ai_interview_prep
          ? (() => { try { return JSON.parse(updated!.ai_interview_prep); } catch { return null; } })()
          : null,
        aiInterviewQuestions: updated!.ai_interview_questions
          ? (() => { try { return JSON.parse(updated!.ai_interview_questions); } catch { return null; } })()
          : null,
        agenticCoding: updated!.ai_agentic_coding
          ? (() => { try { return JSON.parse(updated!.ai_agentic_coding); } catch { return null; } })()
          : null,
        aiBackendPrep: updated!.ai_backend_prep
          ? (() => { try { return JSON.parse(updated!.ai_backend_prep); } catch { return null; } })()
          : null,
        aiDeepResearch: updated!.ai_deep_research
          ? (() => { try { return JSON.parse(updated!.ai_deep_research); } catch { return null; } })()
          : null,
        applicationStrategy: updated!.ai_application_strategy
          ? (() => { try { return JSON.parse(updated!.ai_application_strategy); } catch { return null; } })()
          : null,
        interviewPrep: [],
      };
    },
  },
};
