import { GraphQLResolveInfo, GraphQLScalarType, GraphQLScalarTypeConfig } from 'graphql';
import { GatewayContext } from '../graphql/context';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  /**
   * GraphQL surface served by the Cloudflare gateway. Subset of the main
   * lead-gen schema (apps/lead-gen/schema/products/schema.graphql) — only the
   * IntelRun + Product fields needed by the product detail pages.
   *
   * Keep this in sync with the upstream schema: kind/status enums and field shapes
   * must match so the cache normalization in the browser works after a swap.
   */
  DateTime: { input: string; output: string; }
  JSON: { input: any; output: any; }
};

export type IntelRun = {
  __typename?: 'IntelRun';
  error?: Maybe<Scalars['String']['output']>;
  finishedAt?: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['ID']['output'];
  kind: Scalars['String']['output'];
  output?: Maybe<Scalars['JSON']['output']>;
  productId: Scalars['Int']['output'];
  startedAt: Scalars['DateTime']['output'];
  status: Scalars['String']['output'];
};

export type IntelRunAccepted = {
  __typename?: 'IntelRunAccepted';
  kind: Scalars['String']['output'];
  productId: Scalars['Int']['output'];
  runId: Scalars['ID']['output'];
  status: Scalars['String']['output'];
};

export type Mutation = {
  __typename?: 'Mutation';
  analyzeProductGTMAsync: IntelRunAccepted;
  analyzeProductPricingAsync: IntelRunAccepted;
  runFullProductIntelAsync: IntelRunAccepted;
};


export type MutationAnalyzeProductGtmAsyncArgs = {
  id: Scalars['Int']['input'];
  resumeFromRunId?: InputMaybe<Scalars['ID']['input']>;
};


export type MutationAnalyzeProductPricingAsyncArgs = {
  id: Scalars['Int']['input'];
  resumeFromRunId?: InputMaybe<Scalars['ID']['input']>;
};


export type MutationRunFullProductIntelAsyncArgs = {
  forceRefresh?: InputMaybe<Scalars['Boolean']['input']>;
  id: Scalars['Int']['input'];
  resumeFromRunId?: InputMaybe<Scalars['ID']['input']>;
};

export type Product = {
  __typename?: 'Product';
  description?: Maybe<Scalars['String']['output']>;
  domain?: Maybe<Scalars['String']['output']>;
  gtmAnalysis?: Maybe<Scalars['JSON']['output']>;
  gtmAnalyzedAt?: Maybe<Scalars['String']['output']>;
  id: Scalars['Int']['output'];
  intelReport?: Maybe<Scalars['JSON']['output']>;
  intelReportAt?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  pricingAnalysis?: Maybe<Scalars['JSON']['output']>;
  pricingAnalyzedAt?: Maybe<Scalars['String']['output']>;
  slug?: Maybe<Scalars['String']['output']>;
  url: Scalars['String']['output'];
};

export type Query = {
  __typename?: 'Query';
  productBySlug?: Maybe<Product>;
  productIntelRun?: Maybe<IntelRun>;
  productIntelRuns: Array<IntelRun>;
};


export type QueryProductBySlugArgs = {
  slug: Scalars['String']['input'];
};


export type QueryProductIntelRunArgs = {
  id: Scalars['ID']['input'];
};


export type QueryProductIntelRunsArgs = {
  kind?: InputMaybe<Scalars['String']['input']>;
  productId: Scalars['Int']['input'];
};

export type Subscription = {
  __typename?: 'Subscription';
  intelRunStatus: IntelRun;
};


export type SubscriptionIntelRunStatusArgs = {
  kind?: InputMaybe<Scalars['String']['input']>;
  productId: Scalars['Int']['input'];
};

export type WithIndex<TObject> = TObject & Record<string, any>;
export type ResolversObject<TObject> = WithIndex<TObject>;

export type ResolverTypeWrapper<T> = Promise<T> | T;


export type ResolverWithResolve<TResult, TParent, TContext, TArgs> = {
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};
export type Resolver<TResult, TParent = {}, TContext = {}, TArgs = {}> = ResolverFn<TResult, TParent, TContext, TArgs> | ResolverWithResolve<TResult, TParent, TContext, TArgs>;

export type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => Promise<TResult> | TResult;

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>;

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

export interface SubscriptionSubscriberObject<TResult, TKey extends string, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<{ [key in TKey]: TResult }, TParent, TContext, TArgs>;
  resolve?: SubscriptionResolveFn<TResult, { [key in TKey]: TResult }, TContext, TArgs>;
}

export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>;
  resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>;
}

export type SubscriptionObject<TResult, TKey extends string, TParent, TContext, TArgs> =
  | SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs>
  | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>;

export type SubscriptionResolver<TResult, TKey extends string, TParent = {}, TContext = {}, TArgs = {}> =
  | ((...args: any[]) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
  | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>;

export type TypeResolveFn<TTypes, TParent = {}, TContext = {}> = (
  parent: TParent,
  context: TContext,
  info: GraphQLResolveInfo
) => Maybe<TTypes> | Promise<Maybe<TTypes>>;

export type IsTypeOfResolverFn<T = {}, TContext = {}> = (obj: T, context: TContext, info: GraphQLResolveInfo) => boolean | Promise<boolean>;

export type NextResolverFn<T> = () => Promise<T>;

export type DirectiveResolverFn<TResult = {}, TParent = {}, TContext = {}, TArgs = {}> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;



/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = ResolversObject<{
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  DateTime: ResolverTypeWrapper<Scalars['DateTime']['output']>;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  IntelRun: ResolverTypeWrapper<IntelRun>;
  IntelRunAccepted: ResolverTypeWrapper<IntelRunAccepted>;
  JSON: ResolverTypeWrapper<Scalars['JSON']['output']>;
  Mutation: ResolverTypeWrapper<{}>;
  Product: ResolverTypeWrapper<Product>;
  Query: ResolverTypeWrapper<{}>;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  Subscription: ResolverTypeWrapper<{}>;
}>;

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = ResolversObject<{
  Boolean: Scalars['Boolean']['output'];
  DateTime: Scalars['DateTime']['output'];
  ID: Scalars['ID']['output'];
  Int: Scalars['Int']['output'];
  IntelRun: IntelRun;
  IntelRunAccepted: IntelRunAccepted;
  JSON: Scalars['JSON']['output'];
  Mutation: {};
  Product: Product;
  Query: {};
  String: Scalars['String']['output'];
  Subscription: {};
}>;

export interface DateTimeScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['DateTime'], any> {
  name: 'DateTime';
}

export type IntelRunResolvers<ContextType = GatewayContext, ParentType extends ResolversParentTypes['IntelRun'] = ResolversParentTypes['IntelRun']> = ResolversObject<{
  error?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  finishedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  kind?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  output?: Resolver<Maybe<ResolversTypes['JSON']>, ParentType, ContextType>;
  productId?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  startedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type IntelRunAcceptedResolvers<ContextType = GatewayContext, ParentType extends ResolversParentTypes['IntelRunAccepted'] = ResolversParentTypes['IntelRunAccepted']> = ResolversObject<{
  kind?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  productId?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  runId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export interface JsonScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['JSON'], any> {
  name: 'JSON';
}

export type MutationResolvers<ContextType = GatewayContext, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = ResolversObject<{
  analyzeProductGTMAsync?: Resolver<ResolversTypes['IntelRunAccepted'], ParentType, ContextType, RequireFields<MutationAnalyzeProductGtmAsyncArgs, 'id'>>;
  analyzeProductPricingAsync?: Resolver<ResolversTypes['IntelRunAccepted'], ParentType, ContextType, RequireFields<MutationAnalyzeProductPricingAsyncArgs, 'id'>>;
  runFullProductIntelAsync?: Resolver<ResolversTypes['IntelRunAccepted'], ParentType, ContextType, RequireFields<MutationRunFullProductIntelAsyncArgs, 'id'>>;
}>;

export type ProductResolvers<ContextType = GatewayContext, ParentType extends ResolversParentTypes['Product'] = ResolversParentTypes['Product']> = ResolversObject<{
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  domain?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  gtmAnalysis?: Resolver<Maybe<ResolversTypes['JSON']>, ParentType, ContextType>;
  gtmAnalyzedAt?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  intelReport?: Resolver<Maybe<ResolversTypes['JSON']>, ParentType, ContextType>;
  intelReportAt?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  pricingAnalysis?: Resolver<Maybe<ResolversTypes['JSON']>, ParentType, ContextType>;
  pricingAnalyzedAt?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  slug?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  url?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type QueryResolvers<ContextType = GatewayContext, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = ResolversObject<{
  productBySlug?: Resolver<Maybe<ResolversTypes['Product']>, ParentType, ContextType, RequireFields<QueryProductBySlugArgs, 'slug'>>;
  productIntelRun?: Resolver<Maybe<ResolversTypes['IntelRun']>, ParentType, ContextType, RequireFields<QueryProductIntelRunArgs, 'id'>>;
  productIntelRuns?: Resolver<Array<ResolversTypes['IntelRun']>, ParentType, ContextType, RequireFields<QueryProductIntelRunsArgs, 'productId'>>;
}>;

export type SubscriptionResolvers<ContextType = GatewayContext, ParentType extends ResolversParentTypes['Subscription'] = ResolversParentTypes['Subscription']> = ResolversObject<{
  intelRunStatus?: SubscriptionResolver<ResolversTypes['IntelRun'], "intelRunStatus", ParentType, ContextType, RequireFields<SubscriptionIntelRunStatusArgs, 'productId'>>;
}>;

export type Resolvers<ContextType = GatewayContext> = ResolversObject<{
  DateTime?: GraphQLScalarType;
  IntelRun?: IntelRunResolvers<ContextType>;
  IntelRunAccepted?: IntelRunAcceptedResolvers<ContextType>;
  JSON?: GraphQLScalarType;
  Mutation?: MutationResolvers<ContextType>;
  Product?: ProductResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  Subscription?: SubscriptionResolvers<ContextType>;
}>;

