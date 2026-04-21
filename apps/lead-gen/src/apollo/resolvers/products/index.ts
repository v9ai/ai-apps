import { ProductField } from "./field-resolvers";
import { productQueries } from "./queries";
import { productMutations } from "./mutations";

export const productResolvers = {
  Product: ProductField,
  Query: productQueries,
  Mutation: productMutations,
};
