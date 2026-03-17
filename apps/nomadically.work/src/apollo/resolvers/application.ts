import type { GraphQLContext } from "../context";
import { applications, jobs, companies } from "@/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { isAdminEmail } from "@/lib/admin";

function mapApplication(
  app: typeof applications.$inferSelect,
  jobDescription?: string | null,
  companyKey?: string | null,
) {
  return {
    id: app.id,
    email: app.user_email,
    jobId: app.job_id,
    resume: app.resume_url,
    questions: app.questions ? JSON.parse(app.questions) : [],
    status: app.status,
    notes: app.notes ?? null,
    jobTitle: app.job_title ?? null,
    companyName: app.company_name ?? null,
    companyKey: companyKey ?? null,
    jobDescription: app.job_description ?? jobDescription ?? null,
    aiInterviewQuestions: (app as any).ai_interview_questions ?? null,
    createdAt: app.created_at,
  };
}

async function getApplicationById(id: number, db: GraphQLContext["db"]) {
  const [row] = await db
    .select({
      app: applications,
      jobDescription: jobs.description,
      jobCompanyKey: jobs.company_key,
      nameCompanyKey: companies.key,
    })
    .from(applications)
    .leftJoin(jobs, eq(jobs.url, applications.job_id))
    .leftJoin(companies, sql`lower(${companies.key}) = lower(${applications.company_name}) OR lower(${companies.name}) = lower(${applications.company_name})`)
    .where(eq(applications.id, id));
  if (!row) return null;
  return mapApplication(row.app, row.jobDescription, row.jobCompanyKey ?? row.nameCompanyKey);
}

export const applicationResolvers = {
  Query: {
    async applications(_parent: any, _args: any, context: GraphQLContext) {
      try {
        const allApplications = await context.db
          .select({
            app: applications,
            jobDescription: jobs.description,
            jobCompanyKey: jobs.company_key,
            nameCompanyKey: companies.key,
          })
          .from(applications)
          .leftJoin(jobs, eq(jobs.url, applications.job_id))
          .leftJoin(companies, sql`lower(${companies.key}) = lower(${applications.company_name}) OR lower(${companies.name}) = lower(${applications.company_name})`)
          .orderBy(desc(applications.created_at));

        return allApplications.map(({ app, jobDescription, jobCompanyKey, nameCompanyKey }) =>
          mapApplication(app, jobDescription, jobCompanyKey ?? nameCompanyKey),
        );
      } catch (error) {
        console.error("Error fetching applications:", error);
        throw new Error("Failed to fetch applications");
      }
    },

    async application(_parent: any, args: { id: number }, context: GraphQLContext) {
      return getApplicationById(args.id, context.db);
    },
  },
  Mutation: {
    async createApplication(
      _parent: any,
      args: {
        input: {
          jobId?: string | null;
          resume?: File;
          questions: Array<{
            questionId: string;
            questionText: string;
            answerText: string;
          }>;
          jobTitle?: string;
          companyName?: string;
        };
      },
      context: GraphQLContext,
    ) {
      try {
        if (!context.userEmail || !context.userId) {
          throw new Error(
            "User must be authenticated to submit an application",
          );
        }

        const [newApplication] = await context.db
          .insert(applications)
          .values({
            user_email: context.userEmail,
            job_id: args.input.jobId ?? null,
            resume_url: null,
            questions: JSON.stringify(args.input.questions),
            status: "pending",
            job_title: args.input.jobTitle ?? null,
            company_name: args.input.companyName ?? null,
          })
          .returning();

        return mapApplication(newApplication);
      } catch (error) {
        console.error("Error creating application:", error);
        throw new Error("Failed to create application");
      }
    },

    async updateApplication(
      _parent: any,
      args: {
        id: number;
        input: {
          status?: "pending" | "submitted" | "reviewed" | "rejected" | "accepted";
          notes?: string;
          jobDescription?: string;
          companyName?: string;
          jobId?: string;
          jobTitle?: string;
        };
      },
      context: GraphQLContext,
    ) {
      try {
        if (!context.userEmail || !context.userId) {
          throw new Error(
            "User must be authenticated to update an application",
          );
        }

        const updateValues: Partial<typeof applications.$inferInsert> = {
          updated_at: new Date().toISOString(),
        };

        if (args.input.status !== undefined) {
          updateValues.status = args.input.status;
        }
        if (args.input.notes !== undefined) {
          updateValues.notes = args.input.notes;
        }
        if (args.input.jobDescription !== undefined) {
          updateValues.job_description = args.input.jobDescription;
        }
        if (args.input.companyName !== undefined) {
          updateValues.company_name = args.input.companyName;
        }
        if (args.input.jobId !== undefined) {
          updateValues.job_id = args.input.jobId;
        }
        if (args.input.jobTitle !== undefined) {
          updateValues.job_title = args.input.jobTitle;
        }

        const [updated] = await context.db
          .update(applications)
          .set(updateValues)
          .where(
            and(
              eq(applications.id, args.id),
              eq(applications.user_email, context.userEmail),
            ),
          )
          .returning();

        if (!updated) {
          throw new Error("Application not found or access denied");
        }

        // Re-fetch with JOINs so companyKey resolves correctly
        const result = await getApplicationById(updated.id, context.db);
        return result ?? mapApplication(updated);
      } catch (error) {
        console.error("Error updating application:", error);
        throw new Error("Failed to update application");
      }
    },

    async deleteApplication(_parent: any, args: { id: number }, context: GraphQLContext) {
      if (!context.userId || !context.userEmail) {
        throw new Error("Unauthorized");
      }
      const whereClause = and(
        eq(applications.id, args.id),
        eq(applications.user_email, context.userEmail),
      );
      const deleted = await context.db.delete(applications).where(whereClause).returning();
      if (deleted.length === 0) {
        return { success: false, message: "Application not found or access denied" };
      }
      return { success: true, message: "Application deleted" };
    },
  },
};
