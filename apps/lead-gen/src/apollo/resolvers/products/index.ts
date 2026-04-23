import { ProductField } from "./field-resolvers";
import { productQueries } from "./queries";
import { productMutations } from "./mutations";
import {
  IntelRunField,
  intelRunMutations,
  intelRunQueries,
} from "./intel-runs";

export const productResolvers = {
  Product: ProductField,
  IntelRun: IntelRunField,
  Query: {
    ...productQueries,
    ...intelRunQueries,
  },
  Mutation: {
    ...productMutations,
    ...intelRunMutations,
  },
};
