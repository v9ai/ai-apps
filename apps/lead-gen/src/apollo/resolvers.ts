import { companyResolvers } from "./resolvers/company";
import { jobResolvers } from "./resolvers/job";
import { userSettingsResolvers } from "./resolvers/user-settings";
import { textToSqlResolvers } from "./resolvers/text-to-sql";
import { executeSqlResolvers } from "./resolvers/execute-sql";
import { applicationResolvers } from "./resolvers/application";
import { resumeResolvers } from "./resolvers/resume";
import { contactResolvers } from "./resolvers/contacts";
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
  applicationResolvers,
  resumeResolvers,
  contactResolvers,
  taskResolvers,
  emailCampaignResolvers,
  emailTemplateResolvers,
  blockedCompanyResolvers,
  receivedEmailResolvers,
);
