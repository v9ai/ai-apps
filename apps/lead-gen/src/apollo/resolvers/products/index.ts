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
  Subscription: {
    // Apollo's HTTP transport on Vercel does not support subscriptions; the
    // Cloudflare gateway handles the subscription transport. Define the
    // field so makeExecutableSchema accepts the SDL, but never invoke it.
    intelRunStatus: {
      subscribe: () => {
        throw new Error(
          "Subscription.intelRunStatus is served by the Cloudflare gateway, not the Vercel origin",
        );
      },
    },
  },
};
