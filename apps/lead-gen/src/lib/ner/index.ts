/**
 * B2B Named Entity Recognition — regex-based extraction and normalization.
 *
 * @module ner
 */

export { extractB2BEntities } from "./b2b-extractor";
export type { B2BEntity } from "./b2b-extractor";

export {
  normalizeFundingAmount,
  normalizeTeamSize,
  normalizeTechName,
} from "./normalizer";
