import { companyResolvers } from "./resolvers/company";
import { jobResolvers } from "./resolvers/job";
import { userSettingsResolvers } from "./resolvers/user-settings";
import { contactResolvers } from "./resolvers/contacts";

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
  contactResolvers,

  emailCampaignResolvers,
  emailTemplateResolvers,
  blockedCompanyResolvers,
  receivedEmailResolvers,
);
