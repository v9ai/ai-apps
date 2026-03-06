import { eq } from "drizzle-orm";

import { companies } from "@/db/schema";
import type { GraphQLContext } from "../context";
import { isAdminEmail } from "@/lib/admin";
import { analyzeCompanyWebsite } from "@/browser-rendering/company/analyzer";
import type { AnalyzeCompanyArgs, AnalyzeCompanyResponse } from "./types";

export async function analyzeCompany(
  _parent: any,
  args: AnalyzeCompanyArgs,
  context: GraphQLContext,
): Promise<AnalyzeCompanyResponse> {
  try {
    if (!context.userId) {
      throw new Error("Unauthorized");
    }

    if (!isAdminEmail(context.userEmail)) {
      throw new Error("Forbidden - Admin access required");
    }

    if (!args.id && !args.key) {
      throw new Error("Either id or key is required");
    }

    let company;
    if (args.id) {
      company = await context.db.query.companies.findFirst({
        where: eq(companies.id, args.id),
      });
    } else if (args.key) {
      company = await context.db.query.companies.findFirst({
        where: eq(companies.key, args.key),
      });
    }

    if (!company) {
      throw new Error("Company not found");
    }

    if (!company.website) {
      throw new Error("Company must have a website URL to analyze");
    }

    console.log(`Analyzing company ${company.name} from ${company.website}`);

    const services = company.services ? JSON.parse(company.services) : [];

    const analysis = await analyzeCompanyWebsite(company.website, {
      name: company.name,
      description: company.description,
      industry: company.industry,
      services,
    });

    await context.db
      .update(companies)
      .set({
        deep_analysis: analysis,
        updated_at: new Date().toISOString(),
      })
      .where(eq(companies.id, company.id));

    return {
      success: true,
      message: `Deep analysis completed (${analysis.length} chars).`,
      companyId: company.id,
      companyKey: company.key,
    };
  } catch (error) {
    console.error("Error analyzing company:", error);
    throw error;
  }
}
