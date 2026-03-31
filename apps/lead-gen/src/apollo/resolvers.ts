import { companyResolvers } from "./resolvers/company";
import { userSettingsResolvers } from "./resolvers/user-settings";
import { contactResolvers } from "./resolvers/contacts";
import { remindersResolvers } from "./resolvers/reminders";

import { emailCampaignResolvers } from "./resolvers/email-campaigns";
import { emailTemplateResolvers } from "./resolvers/email-templates";

import { receivedEmailResolvers } from "./resolvers/received-emails";
import { linkedinPostResolvers } from "./resolvers/linkedin-posts";
import { merge } from "lodash";

export const resolvers = merge(
  {},
  companyResolvers,
  userSettingsResolvers,
  contactResolvers,
  remindersResolvers,

  emailCampaignResolvers,
  emailTemplateResolvers,

  receivedEmailResolvers,
  linkedinPostResolvers,
);
