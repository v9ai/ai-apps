/**
 * Company resolvers -- split into sub-modules for maintainability.
 *
 * Re-exports the same `companyResolvers` shape that the old monolithic
 * `company.ts` file exported, so the parent `resolvers.ts` merge is unchanged.
 */

export { safeJsonParse } from "./utils";

import { CompanyField, EvidenceField, CompanyFactField, CompanySnapshotField } from "./field-resolvers";
import { companyQueries } from "./queries";
import { companyMutations } from "./mutations";

export const companyResolvers = {
  Company: CompanyField,
  Evidence: EvidenceField,
  CompanyFact: CompanyFactField,
  CompanySnapshot: CompanySnapshotField,

  Query: companyQueries,
  Mutation: companyMutations,
};
