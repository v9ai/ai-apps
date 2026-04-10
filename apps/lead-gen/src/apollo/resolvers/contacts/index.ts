/**
 * Contact resolvers — split into sub-modules for maintainability.
 *
 * Re-exports the same `contactResolvers` shape that the old monolithic
 * `contacts.ts` file exported, so the parent `resolvers.ts` merge is unchanged.
 */

export { classifyContact, computeDeletionScore, parseJsonArray } from "./classification";
export type { ContactClassification, DeletionScore } from "./classification";

import { Contact, CompanyContactsField, ContactEmailField, CompanyContactEmailField } from "./field-resolvers";
import { contactQueries } from "./queries";
import { contactMutations } from "./mutations";

export const contactResolvers = {
  Contact,
  Query: contactQueries,
  Mutation: contactMutations,

  // Company.contacts field resolver
  Company: CompanyContactsField,

  ContactEmail: ContactEmailField,
  CompanyContactEmail: CompanyContactEmailField,
};
