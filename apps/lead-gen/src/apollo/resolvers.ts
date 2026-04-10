import { companyResolvers } from "./resolvers/company/index";
import { userSettingsResolvers } from "./resolvers/user-settings";
import { contactResolvers } from "./resolvers/contacts/index";
import { remindersResolvers } from "./resolvers/reminders";

import { emailCampaignResolvers } from "./resolvers/email-campaigns";
import { emailTemplateResolvers } from "./resolvers/email-templates";

import { receivedEmailResolvers } from "./resolvers/received-emails";
import { linkedinPostResolvers } from "./resolvers/linkedin-posts";
import { intentSignalResolvers } from "./resolvers/intent-signals";
import { mlResolvers } from "./resolvers/ml";
import { salescueResolvers } from "./resolvers/salescue";
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
  intentSignalResolvers,
  mlResolvers,
  salescueResolvers,
);
