import { ProductField } from "./field-resolvers";
import { productQueries } from "./queries";
import { productMutations } from "./mutations";
import {
  IntelRunField,
  intelRunMutations,
  intelRunQueries,
} from "./intel-runs";
import { productLeadsQueries } from "./leads";

export const productResolvers = {
  Product: ProductField,
  IntelRun: IntelRunField,
  Query: {
    ...productQueries,
    ...intelRunQueries,
    ...productLeadsQueries,
  },
  Mutation: {
    ...productMutations,
    ...intelRunMutations,
  },
};
