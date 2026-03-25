import { companyResolvers } from "./resolvers/company";
import { jobResolvers } from "./resolvers/job";
import { userSettingsResolvers } from "./resolvers/user-settings";
import { textToSqlResolvers } from "./resolvers/text-to-sql";
import { executeSqlResolvers } from "./resolvers/execute-sql";
import { promptResolvers } from "./resolvers/prompts";
import { applicationResolvers } from "./resolvers/application";
import { langsmithResolvers } from "./resolvers/langsmith";
import { resumeResolvers } from "./resolvers/resume";
import { contactResolvers } from "./resolvers/contacts";
import { opportunityResolvers } from "./resolvers/opportunities";
import { taskResolvers } from "./resolvers/tasks";
import { emailCampaignResolvers } from "./resolvers/email-campaigns";
import { emailTemplateResolvers } from "./resolvers/email-templates";
import { blockedCompanyResolvers } from "./resolvers/blocked-companies";
import { receivedEmailResolvers } from "./resolvers/received-emails";
import { merge } from "lodash";

export const resolvers = merge(
  {},
  companyResolvers,
  jobResolvers,
  userSettingsResolvers,
  textToSqlResolvers,
  executeSqlResolvers,
  promptResolvers,
  applicationResolvers,
  langsmithResolvers,
  resumeResolvers,
  contactResolvers,
  opportunityResolvers,
  taskResolvers,
  emailCampaignResolvers,
  emailTemplateResolvers,
  blockedCompanyResolvers,
  receivedEmailResolvers,
);
