import { companyResolvers } from "./resolvers/company";
import { userSettingsResolvers } from "./resolvers/user-settings";
import { contactResolvers } from "./resolvers/contacts";
import { remindersResolvers } from "./resolvers/reminders";

import { emailCampaignResolvers } from "./resolvers/email-campaigns";
import { emailTemplateResolvers } from "./resolvers/email-templates";

import { receivedEmailResolvers } from "./resolvers/received-emails";
import { emailThreadResolvers } from "./resolvers/email-threads";
import { linkedinPostResolvers } from "./resolvers/linkedin-posts";
import { intentSignalResolvers } from "./resolvers/intent-signals";
import { mlResolvers } from "./resolvers/ml";
import { salescueResolvers } from "./resolvers/salescue";
import { replyDraftResolvers } from "./resolvers/reply-drafts";
import { crawlLogResolvers } from "./resolvers/crawl-logs";
import { opportunityResolvers } from "./resolvers/opportunities";
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
  emailThreadResolvers,
  linkedinPostResolvers,
  intentSignalResolvers,
  mlResolvers,
  salescueResolvers,
  replyDraftResolvers,
  crawlLogResolvers,
  opportunityResolvers,
);
