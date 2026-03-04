/* eslint-disable */
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type Maybe<T> = T | null;
export type InputMaybe<T> = T | null | undefined;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  /** A high precision floating point value represented as a string */
  BigFloat: { input: string; output: string; }
  /** An arbitrary size integer represented as a string */
  BigInt: { input: string; output: string; }
  /** An opaque string using for tracking a position in results during pagination */
  Cursor: { input: string; output: string; }
  /** A date without time information */
  Date: { input: string; output: string; }
  /** A date and time */
  Datetime: { input: string; output: string; }
  /** A Javascript Object Notation value serialized as a string */
  JSON: { input: Record<string, unknown>; output: Record<string, unknown>; }
  /** Any type not handled by the type system */
  Opaque: { input: unknown; output: unknown; }
  /** A time without date information */
  Time: { input: any; output: any; }
  /** A universally unique identifier */
  UUID: { input: string; output: string; }
};

/** Boolean expression comparing fields on type "BigFloat" */
export type BigFloatFilter = {
  eq?: InputMaybe<Scalars['BigFloat']['input']>;
  gt?: InputMaybe<Scalars['BigFloat']['input']>;
  gte?: InputMaybe<Scalars['BigFloat']['input']>;
  in?: InputMaybe<Array<Scalars['BigFloat']['input']>>;
  is?: InputMaybe<FilterIs>;
  lt?: InputMaybe<Scalars['BigFloat']['input']>;
  lte?: InputMaybe<Scalars['BigFloat']['input']>;
  neq?: InputMaybe<Scalars['BigFloat']['input']>;
};

/** Boolean expression comparing fields on type "BigFloatList" */
export type BigFloatListFilter = {
  containedBy?: InputMaybe<Array<Scalars['BigFloat']['input']>>;
  contains?: InputMaybe<Array<Scalars['BigFloat']['input']>>;
  eq?: InputMaybe<Array<Scalars['BigFloat']['input']>>;
  is?: InputMaybe<FilterIs>;
  overlaps?: InputMaybe<Array<Scalars['BigFloat']['input']>>;
};

/** Boolean expression comparing fields on type "BigInt" */
export type BigIntFilter = {
  eq?: InputMaybe<Scalars['BigInt']['input']>;
  gt?: InputMaybe<Scalars['BigInt']['input']>;
  gte?: InputMaybe<Scalars['BigInt']['input']>;
  in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  is?: InputMaybe<FilterIs>;
  lt?: InputMaybe<Scalars['BigInt']['input']>;
  lte?: InputMaybe<Scalars['BigInt']['input']>;
  neq?: InputMaybe<Scalars['BigInt']['input']>;
};

/** Boolean expression comparing fields on type "BigIntList" */
export type BigIntListFilter = {
  containedBy?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  contains?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  eq?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  is?: InputMaybe<FilterIs>;
  overlaps?: InputMaybe<Array<Scalars['BigInt']['input']>>;
};

/** Boolean expression comparing fields on type "Boolean" */
export type BooleanFilter = {
  eq?: InputMaybe<Scalars['Boolean']['input']>;
  is?: InputMaybe<FilterIs>;
};

/** Boolean expression comparing fields on type "BooleanList" */
export type BooleanListFilter = {
  containedBy?: InputMaybe<Array<Scalars['Boolean']['input']>>;
  contains?: InputMaybe<Array<Scalars['Boolean']['input']>>;
  eq?: InputMaybe<Array<Scalars['Boolean']['input']>>;
  is?: InputMaybe<FilterIs>;
  overlaps?: InputMaybe<Array<Scalars['Boolean']['input']>>;
};

/** Boolean expression comparing fields on type "Date" */
export type DateFilter = {
  eq?: InputMaybe<Scalars['Date']['input']>;
  gt?: InputMaybe<Scalars['Date']['input']>;
  gte?: InputMaybe<Scalars['Date']['input']>;
  in?: InputMaybe<Array<Scalars['Date']['input']>>;
  is?: InputMaybe<FilterIs>;
  lt?: InputMaybe<Scalars['Date']['input']>;
  lte?: InputMaybe<Scalars['Date']['input']>;
  neq?: InputMaybe<Scalars['Date']['input']>;
};

/** Boolean expression comparing fields on type "DateList" */
export type DateListFilter = {
  containedBy?: InputMaybe<Array<Scalars['Date']['input']>>;
  contains?: InputMaybe<Array<Scalars['Date']['input']>>;
  eq?: InputMaybe<Array<Scalars['Date']['input']>>;
  is?: InputMaybe<FilterIs>;
  overlaps?: InputMaybe<Array<Scalars['Date']['input']>>;
};

/** Boolean expression comparing fields on type "Datetime" */
export type DatetimeFilter = {
  eq?: InputMaybe<Scalars['Datetime']['input']>;
  gt?: InputMaybe<Scalars['Datetime']['input']>;
  gte?: InputMaybe<Scalars['Datetime']['input']>;
  in?: InputMaybe<Array<Scalars['Datetime']['input']>>;
  is?: InputMaybe<FilterIs>;
  lt?: InputMaybe<Scalars['Datetime']['input']>;
  lte?: InputMaybe<Scalars['Datetime']['input']>;
  neq?: InputMaybe<Scalars['Datetime']['input']>;
};

/** Boolean expression comparing fields on type "DatetimeList" */
export type DatetimeListFilter = {
  containedBy?: InputMaybe<Array<Scalars['Datetime']['input']>>;
  contains?: InputMaybe<Array<Scalars['Datetime']['input']>>;
  eq?: InputMaybe<Array<Scalars['Datetime']['input']>>;
  is?: InputMaybe<FilterIs>;
  overlaps?: InputMaybe<Array<Scalars['Datetime']['input']>>;
};

export enum FilterIs {
  NotNull = 'NOT_NULL',
  Null = 'NULL'
}

/** Boolean expression comparing fields on type "Float" */
export type FloatFilter = {
  eq?: InputMaybe<Scalars['Float']['input']>;
  gt?: InputMaybe<Scalars['Float']['input']>;
  gte?: InputMaybe<Scalars['Float']['input']>;
  in?: InputMaybe<Array<Scalars['Float']['input']>>;
  is?: InputMaybe<FilterIs>;
  lt?: InputMaybe<Scalars['Float']['input']>;
  lte?: InputMaybe<Scalars['Float']['input']>;
  neq?: InputMaybe<Scalars['Float']['input']>;
};

/** Boolean expression comparing fields on type "FloatList" */
export type FloatListFilter = {
  containedBy?: InputMaybe<Array<Scalars['Float']['input']>>;
  contains?: InputMaybe<Array<Scalars['Float']['input']>>;
  eq?: InputMaybe<Array<Scalars['Float']['input']>>;
  is?: InputMaybe<FilterIs>;
  overlaps?: InputMaybe<Array<Scalars['Float']['input']>>;
};

/** Boolean expression comparing fields on type "ID" */
export type IdFilter = {
  eq?: InputMaybe<Scalars['ID']['input']>;
};

/** Boolean expression comparing fields on type "Int" */
export type IntFilter = {
  eq?: InputMaybe<Scalars['Int']['input']>;
  gt?: InputMaybe<Scalars['Int']['input']>;
  gte?: InputMaybe<Scalars['Int']['input']>;
  in?: InputMaybe<Array<Scalars['Int']['input']>>;
  is?: InputMaybe<FilterIs>;
  lt?: InputMaybe<Scalars['Int']['input']>;
  lte?: InputMaybe<Scalars['Int']['input']>;
  neq?: InputMaybe<Scalars['Int']['input']>;
};

/** Boolean expression comparing fields on type "IntList" */
export type IntListFilter = {
  containedBy?: InputMaybe<Array<Scalars['Int']['input']>>;
  contains?: InputMaybe<Array<Scalars['Int']['input']>>;
  eq?: InputMaybe<Array<Scalars['Int']['input']>>;
  is?: InputMaybe<FilterIs>;
  overlaps?: InputMaybe<Array<Scalars['Int']['input']>>;
};

/** The root type for creating and mutating data */
export type Mutation = {
  __typename?: 'Mutation';
  /** Deletes zero or more records from the `blood_markers` collection */
  deleteFromblood_markersCollection: Blood_MarkersDeleteResponse;
  /** Deletes zero or more records from the `blood_test_embeddings` collection */
  deleteFromblood_test_embeddingsCollection: Blood_Test_EmbeddingsDeleteResponse;
  /** Deletes zero or more records from the `blood_tests` collection */
  deleteFromblood_testsCollection: Blood_TestsDeleteResponse;
  /** Deletes zero or more records from the `conditions` collection */
  deleteFromconditionsCollection: ConditionsDeleteResponse;
  /** Adds one or more `blood_markers` records to the collection */
  insertIntoblood_markersCollection?: Maybe<Blood_MarkersInsertResponse>;
  /** Adds one or more `blood_test_embeddings` records to the collection */
  insertIntoblood_test_embeddingsCollection?: Maybe<Blood_Test_EmbeddingsInsertResponse>;
  /** Adds one or more `blood_tests` records to the collection */
  insertIntoblood_testsCollection?: Maybe<Blood_TestsInsertResponse>;
  /** Adds one or more `conditions` records to the collection */
  insertIntoconditionsCollection?: Maybe<ConditionsInsertResponse>;
  /** Updates zero or more records in the `blood_markers` collection */
  updateblood_markersCollection: Blood_MarkersUpdateResponse;
  /** Updates zero or more records in the `blood_test_embeddings` collection */
  updateblood_test_embeddingsCollection: Blood_Test_EmbeddingsUpdateResponse;
  /** Updates zero or more records in the `blood_tests` collection */
  updateblood_testsCollection: Blood_TestsUpdateResponse;
  /** Updates zero or more records in the `conditions` collection */
  updateconditionsCollection: ConditionsUpdateResponse;
};


/** The root type for creating and mutating data */
export type MutationDeleteFromblood_MarkersCollectionArgs = {
  atMost?: Scalars['Int']['input'];
  filter?: InputMaybe<Blood_MarkersFilter>;
};


/** The root type for creating and mutating data */
export type MutationDeleteFromblood_Test_EmbeddingsCollectionArgs = {
  atMost?: Scalars['Int']['input'];
  filter?: InputMaybe<Blood_Test_EmbeddingsFilter>;
};


/** The root type for creating and mutating data */
export type MutationDeleteFromblood_TestsCollectionArgs = {
  atMost?: Scalars['Int']['input'];
  filter?: InputMaybe<Blood_TestsFilter>;
};


/** The root type for creating and mutating data */
export type MutationDeleteFromconditionsCollectionArgs = {
  atMost?: Scalars['Int']['input'];
  filter?: InputMaybe<ConditionsFilter>;
};


/** The root type for creating and mutating data */
export type MutationInsertIntoblood_MarkersCollectionArgs = {
  objects: Array<Blood_MarkersInsertInput>;
};


/** The root type for creating and mutating data */
export type MutationInsertIntoblood_Test_EmbeddingsCollectionArgs = {
  objects: Array<Blood_Test_EmbeddingsInsertInput>;
};


/** The root type for creating and mutating data */
export type MutationInsertIntoblood_TestsCollectionArgs = {
  objects: Array<Blood_TestsInsertInput>;
};


/** The root type for creating and mutating data */
export type MutationInsertIntoconditionsCollectionArgs = {
  objects: Array<ConditionsInsertInput>;
};


/** The root type for creating and mutating data */
export type MutationUpdateblood_MarkersCollectionArgs = {
  atMost?: Scalars['Int']['input'];
  filter?: InputMaybe<Blood_MarkersFilter>;
  set: Blood_MarkersUpdateInput;
};


/** The root type for creating and mutating data */
export type MutationUpdateblood_Test_EmbeddingsCollectionArgs = {
  atMost?: Scalars['Int']['input'];
  filter?: InputMaybe<Blood_Test_EmbeddingsFilter>;
  set: Blood_Test_EmbeddingsUpdateInput;
};


/** The root type for creating and mutating data */
export type MutationUpdateblood_TestsCollectionArgs = {
  atMost?: Scalars['Int']['input'];
  filter?: InputMaybe<Blood_TestsFilter>;
  set: Blood_TestsUpdateInput;
};


/** The root type for creating and mutating data */
export type MutationUpdateconditionsCollectionArgs = {
  atMost?: Scalars['Int']['input'];
  filter?: InputMaybe<ConditionsFilter>;
  set: ConditionsUpdateInput;
};

export type Node = {
  /** Retrieves a record by `ID` */
  nodeId: Scalars['ID']['output'];
};

/** Boolean expression comparing fields on type "Opaque" */
export type OpaqueFilter = {
  eq?: InputMaybe<Scalars['Opaque']['input']>;
  is?: InputMaybe<FilterIs>;
};

/** Defines a per-field sorting order */
export enum OrderByDirection {
  /** Ascending order, nulls first */
  AscNullsFirst = 'AscNullsFirst',
  /** Ascending order, nulls last */
  AscNullsLast = 'AscNullsLast',
  /** Descending order, nulls first */
  DescNullsFirst = 'DescNullsFirst',
  /** Descending order, nulls last */
  DescNullsLast = 'DescNullsLast'
}

export type PageInfo = {
  __typename?: 'PageInfo';
  endCursor?: Maybe<Scalars['String']['output']>;
  hasNextPage: Scalars['Boolean']['output'];
  hasPreviousPage: Scalars['Boolean']['output'];
  startCursor?: Maybe<Scalars['String']['output']>;
};

/** The root type for querying data */
export type Query = {
  __typename?: 'Query';
  /** A pagable collection of type `blood_markers` */
  blood_markersCollection?: Maybe<Blood_MarkersConnection>;
  /** A pagable collection of type `blood_test_embeddings` */
  blood_test_embeddingsCollection?: Maybe<Blood_Test_EmbeddingsConnection>;
  /** A pagable collection of type `blood_tests` */
  blood_testsCollection?: Maybe<Blood_TestsConnection>;
  /** A pagable collection of type `conditions` */
  conditionsCollection?: Maybe<ConditionsConnection>;
  /** Retrieve a record by its `ID` */
  node?: Maybe<Node>;
};


/** The root type for querying data */
export type QueryBlood_MarkersCollectionArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  filter?: InputMaybe<Blood_MarkersFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<Blood_MarkersOrderBy>>;
};


/** The root type for querying data */
export type QueryBlood_Test_EmbeddingsCollectionArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  filter?: InputMaybe<Blood_Test_EmbeddingsFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<Blood_Test_EmbeddingsOrderBy>>;
};


/** The root type for querying data */
export type QueryBlood_TestsCollectionArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  filter?: InputMaybe<Blood_TestsFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<Blood_TestsOrderBy>>;
};


/** The root type for querying data */
export type QueryConditionsCollectionArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  filter?: InputMaybe<ConditionsFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<ConditionsOrderBy>>;
};


/** The root type for querying data */
export type QueryNodeArgs = {
  nodeId: Scalars['ID']['input'];
};

/** Boolean expression comparing fields on type "String" */
export type StringFilter = {
  eq?: InputMaybe<Scalars['String']['input']>;
  gt?: InputMaybe<Scalars['String']['input']>;
  gte?: InputMaybe<Scalars['String']['input']>;
  ilike?: InputMaybe<Scalars['String']['input']>;
  in?: InputMaybe<Array<Scalars['String']['input']>>;
  iregex?: InputMaybe<Scalars['String']['input']>;
  is?: InputMaybe<FilterIs>;
  like?: InputMaybe<Scalars['String']['input']>;
  lt?: InputMaybe<Scalars['String']['input']>;
  lte?: InputMaybe<Scalars['String']['input']>;
  neq?: InputMaybe<Scalars['String']['input']>;
  regex?: InputMaybe<Scalars['String']['input']>;
  startsWith?: InputMaybe<Scalars['String']['input']>;
};

/** Boolean expression comparing fields on type "StringList" */
export type StringListFilter = {
  containedBy?: InputMaybe<Array<Scalars['String']['input']>>;
  contains?: InputMaybe<Array<Scalars['String']['input']>>;
  eq?: InputMaybe<Array<Scalars['String']['input']>>;
  is?: InputMaybe<FilterIs>;
  overlaps?: InputMaybe<Array<Scalars['String']['input']>>;
};

/** Boolean expression comparing fields on type "Time" */
export type TimeFilter = {
  eq?: InputMaybe<Scalars['Time']['input']>;
  gt?: InputMaybe<Scalars['Time']['input']>;
  gte?: InputMaybe<Scalars['Time']['input']>;
  in?: InputMaybe<Array<Scalars['Time']['input']>>;
  is?: InputMaybe<FilterIs>;
  lt?: InputMaybe<Scalars['Time']['input']>;
  lte?: InputMaybe<Scalars['Time']['input']>;
  neq?: InputMaybe<Scalars['Time']['input']>;
};

/** Boolean expression comparing fields on type "TimeList" */
export type TimeListFilter = {
  containedBy?: InputMaybe<Array<Scalars['Time']['input']>>;
  contains?: InputMaybe<Array<Scalars['Time']['input']>>;
  eq?: InputMaybe<Array<Scalars['Time']['input']>>;
  is?: InputMaybe<FilterIs>;
  overlaps?: InputMaybe<Array<Scalars['Time']['input']>>;
};

/** Boolean expression comparing fields on type "UUID" */
export type UuidFilter = {
  eq?: InputMaybe<Scalars['UUID']['input']>;
  in?: InputMaybe<Array<Scalars['UUID']['input']>>;
  is?: InputMaybe<FilterIs>;
  neq?: InputMaybe<Scalars['UUID']['input']>;
};

/** Boolean expression comparing fields on type "UUIDList" */
export type UuidListFilter = {
  containedBy?: InputMaybe<Array<Scalars['UUID']['input']>>;
  contains?: InputMaybe<Array<Scalars['UUID']['input']>>;
  eq?: InputMaybe<Array<Scalars['UUID']['input']>>;
  is?: InputMaybe<FilterIs>;
  overlaps?: InputMaybe<Array<Scalars['UUID']['input']>>;
};

export type Blood_Markers = Node & {
  __typename?: 'blood_markers';
  blood_tests?: Maybe<Blood_Tests>;
  flag?: Maybe<Scalars['String']['output']>;
  id: Scalars['UUID']['output'];
  name: Scalars['String']['output'];
  /** Globally Unique Record Identifier */
  nodeId: Scalars['ID']['output'];
  reference_range?: Maybe<Scalars['String']['output']>;
  test_id: Scalars['UUID']['output'];
  unit?: Maybe<Scalars['String']['output']>;
  value?: Maybe<Scalars['String']['output']>;
};

export type Blood_MarkersConnection = {
  __typename?: 'blood_markersConnection';
  edges: Array<Blood_MarkersEdge>;
  pageInfo: PageInfo;
};

export type Blood_MarkersDeleteResponse = {
  __typename?: 'blood_markersDeleteResponse';
  /** Count of the records impacted by the mutation */
  affectedCount: Scalars['Int']['output'];
  /** Array of records impacted by the mutation */
  records: Array<Blood_Markers>;
};

export type Blood_MarkersEdge = {
  __typename?: 'blood_markersEdge';
  cursor: Scalars['String']['output'];
  node: Blood_Markers;
};

export type Blood_MarkersFilter = {
  /** Returns true only if all its inner filters are true, otherwise returns false */
  and?: InputMaybe<Array<Blood_MarkersFilter>>;
  flag?: InputMaybe<StringFilter>;
  id?: InputMaybe<UuidFilter>;
  name?: InputMaybe<StringFilter>;
  nodeId?: InputMaybe<IdFilter>;
  /** Negates a filter */
  not?: InputMaybe<Blood_MarkersFilter>;
  /** Returns true if at least one of its inner filters is true, otherwise returns false */
  or?: InputMaybe<Array<Blood_MarkersFilter>>;
  reference_range?: InputMaybe<StringFilter>;
  test_id?: InputMaybe<UuidFilter>;
  unit?: InputMaybe<StringFilter>;
  value?: InputMaybe<StringFilter>;
};

export type Blood_MarkersInsertInput = {
  flag?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['UUID']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  reference_range?: InputMaybe<Scalars['String']['input']>;
  test_id?: InputMaybe<Scalars['UUID']['input']>;
  unit?: InputMaybe<Scalars['String']['input']>;
  value?: InputMaybe<Scalars['String']['input']>;
};

export type Blood_MarkersInsertResponse = {
  __typename?: 'blood_markersInsertResponse';
  /** Count of the records impacted by the mutation */
  affectedCount: Scalars['Int']['output'];
  /** Array of records impacted by the mutation */
  records: Array<Blood_Markers>;
};

export type Blood_MarkersOrderBy = {
  flag?: InputMaybe<OrderByDirection>;
  id?: InputMaybe<OrderByDirection>;
  name?: InputMaybe<OrderByDirection>;
  reference_range?: InputMaybe<OrderByDirection>;
  test_id?: InputMaybe<OrderByDirection>;
  unit?: InputMaybe<OrderByDirection>;
  value?: InputMaybe<OrderByDirection>;
};

export type Blood_MarkersUpdateInput = {
  flag?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['UUID']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  reference_range?: InputMaybe<Scalars['String']['input']>;
  test_id?: InputMaybe<Scalars['UUID']['input']>;
  unit?: InputMaybe<Scalars['String']['input']>;
  value?: InputMaybe<Scalars['String']['input']>;
};

export type Blood_MarkersUpdateResponse = {
  __typename?: 'blood_markersUpdateResponse';
  /** Count of the records impacted by the mutation */
  affectedCount: Scalars['Int']['output'];
  /** Array of records impacted by the mutation */
  records: Array<Blood_Markers>;
};

export type Blood_Test_Embeddings = Node & {
  __typename?: 'blood_test_embeddings';
  blood_tests?: Maybe<Blood_Tests>;
  content: Scalars['String']['output'];
  created_at: Scalars['Datetime']['output'];
  embedding: Scalars['Opaque']['output'];
  id: Scalars['UUID']['output'];
  /** Globally Unique Record Identifier */
  nodeId: Scalars['ID']['output'];
  test_id: Scalars['UUID']['output'];
  user_id: Scalars['UUID']['output'];
};

export type Blood_Test_EmbeddingsConnection = {
  __typename?: 'blood_test_embeddingsConnection';
  edges: Array<Blood_Test_EmbeddingsEdge>;
  pageInfo: PageInfo;
};

export type Blood_Test_EmbeddingsDeleteResponse = {
  __typename?: 'blood_test_embeddingsDeleteResponse';
  /** Count of the records impacted by the mutation */
  affectedCount: Scalars['Int']['output'];
  /** Array of records impacted by the mutation */
  records: Array<Blood_Test_Embeddings>;
};

export type Blood_Test_EmbeddingsEdge = {
  __typename?: 'blood_test_embeddingsEdge';
  cursor: Scalars['String']['output'];
  node: Blood_Test_Embeddings;
};

export type Blood_Test_EmbeddingsFilter = {
  /** Returns true only if all its inner filters are true, otherwise returns false */
  and?: InputMaybe<Array<Blood_Test_EmbeddingsFilter>>;
  content?: InputMaybe<StringFilter>;
  created_at?: InputMaybe<DatetimeFilter>;
  embedding?: InputMaybe<OpaqueFilter>;
  id?: InputMaybe<UuidFilter>;
  nodeId?: InputMaybe<IdFilter>;
  /** Negates a filter */
  not?: InputMaybe<Blood_Test_EmbeddingsFilter>;
  /** Returns true if at least one of its inner filters is true, otherwise returns false */
  or?: InputMaybe<Array<Blood_Test_EmbeddingsFilter>>;
  test_id?: InputMaybe<UuidFilter>;
  user_id?: InputMaybe<UuidFilter>;
};

export type Blood_Test_EmbeddingsInsertInput = {
  content?: InputMaybe<Scalars['String']['input']>;
  created_at?: InputMaybe<Scalars['Datetime']['input']>;
  embedding?: InputMaybe<Scalars['Opaque']['input']>;
  id?: InputMaybe<Scalars['UUID']['input']>;
  test_id?: InputMaybe<Scalars['UUID']['input']>;
  user_id?: InputMaybe<Scalars['UUID']['input']>;
};

export type Blood_Test_EmbeddingsInsertResponse = {
  __typename?: 'blood_test_embeddingsInsertResponse';
  /** Count of the records impacted by the mutation */
  affectedCount: Scalars['Int']['output'];
  /** Array of records impacted by the mutation */
  records: Array<Blood_Test_Embeddings>;
};

export type Blood_Test_EmbeddingsOrderBy = {
  content?: InputMaybe<OrderByDirection>;
  created_at?: InputMaybe<OrderByDirection>;
  embedding?: InputMaybe<OrderByDirection>;
  id?: InputMaybe<OrderByDirection>;
  test_id?: InputMaybe<OrderByDirection>;
  user_id?: InputMaybe<OrderByDirection>;
};

export type Blood_Test_EmbeddingsUpdateInput = {
  content?: InputMaybe<Scalars['String']['input']>;
  created_at?: InputMaybe<Scalars['Datetime']['input']>;
  embedding?: InputMaybe<Scalars['Opaque']['input']>;
  id?: InputMaybe<Scalars['UUID']['input']>;
  test_id?: InputMaybe<Scalars['UUID']['input']>;
  user_id?: InputMaybe<Scalars['UUID']['input']>;
};

export type Blood_Test_EmbeddingsUpdateResponse = {
  __typename?: 'blood_test_embeddingsUpdateResponse';
  /** Count of the records impacted by the mutation */
  affectedCount: Scalars['Int']['output'];
  /** Array of records impacted by the mutation */
  records: Array<Blood_Test_Embeddings>;
};

export type Blood_Tests = Node & {
  __typename?: 'blood_tests';
  blood_markersCollection?: Maybe<Blood_MarkersConnection>;
  blood_test_embeddings?: Maybe<Blood_Test_Embeddings>;
  error_message?: Maybe<Scalars['String']['output']>;
  file_name: Scalars['String']['output'];
  file_path: Scalars['String']['output'];
  id: Scalars['UUID']['output'];
  /** Globally Unique Record Identifier */
  nodeId: Scalars['ID']['output'];
  status: Scalars['String']['output'];
  test_date?: Maybe<Scalars['Date']['output']>;
  uploaded_at: Scalars['Datetime']['output'];
  user_id: Scalars['UUID']['output'];
};


export type Blood_TestsBlood_MarkersCollectionArgs = {
  after?: InputMaybe<Scalars['Cursor']['input']>;
  before?: InputMaybe<Scalars['Cursor']['input']>;
  filter?: InputMaybe<Blood_MarkersFilter>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Array<Blood_MarkersOrderBy>>;
};

export type Blood_TestsConnection = {
  __typename?: 'blood_testsConnection';
  edges: Array<Blood_TestsEdge>;
  pageInfo: PageInfo;
};

export type Blood_TestsDeleteResponse = {
  __typename?: 'blood_testsDeleteResponse';
  /** Count of the records impacted by the mutation */
  affectedCount: Scalars['Int']['output'];
  /** Array of records impacted by the mutation */
  records: Array<Blood_Tests>;
};

export type Blood_TestsEdge = {
  __typename?: 'blood_testsEdge';
  cursor: Scalars['String']['output'];
  node: Blood_Tests;
};

export type Blood_TestsFilter = {
  /** Returns true only if all its inner filters are true, otherwise returns false */
  and?: InputMaybe<Array<Blood_TestsFilter>>;
  error_message?: InputMaybe<StringFilter>;
  file_name?: InputMaybe<StringFilter>;
  file_path?: InputMaybe<StringFilter>;
  id?: InputMaybe<UuidFilter>;
  nodeId?: InputMaybe<IdFilter>;
  /** Negates a filter */
  not?: InputMaybe<Blood_TestsFilter>;
  /** Returns true if at least one of its inner filters is true, otherwise returns false */
  or?: InputMaybe<Array<Blood_TestsFilter>>;
  status?: InputMaybe<StringFilter>;
  test_date?: InputMaybe<DateFilter>;
  uploaded_at?: InputMaybe<DatetimeFilter>;
  user_id?: InputMaybe<UuidFilter>;
};

export type Blood_TestsInsertInput = {
  error_message?: InputMaybe<Scalars['String']['input']>;
  file_name?: InputMaybe<Scalars['String']['input']>;
  file_path?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['UUID']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  test_date?: InputMaybe<Scalars['Date']['input']>;
  uploaded_at?: InputMaybe<Scalars['Datetime']['input']>;
  user_id?: InputMaybe<Scalars['UUID']['input']>;
};

export type Blood_TestsInsertResponse = {
  __typename?: 'blood_testsInsertResponse';
  /** Count of the records impacted by the mutation */
  affectedCount: Scalars['Int']['output'];
  /** Array of records impacted by the mutation */
  records: Array<Blood_Tests>;
};

export type Blood_TestsOrderBy = {
  error_message?: InputMaybe<OrderByDirection>;
  file_name?: InputMaybe<OrderByDirection>;
  file_path?: InputMaybe<OrderByDirection>;
  id?: InputMaybe<OrderByDirection>;
  status?: InputMaybe<OrderByDirection>;
  test_date?: InputMaybe<OrderByDirection>;
  uploaded_at?: InputMaybe<OrderByDirection>;
  user_id?: InputMaybe<OrderByDirection>;
};

export type Blood_TestsUpdateInput = {
  error_message?: InputMaybe<Scalars['String']['input']>;
  file_name?: InputMaybe<Scalars['String']['input']>;
  file_path?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['UUID']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
  test_date?: InputMaybe<Scalars['Date']['input']>;
  uploaded_at?: InputMaybe<Scalars['Datetime']['input']>;
  user_id?: InputMaybe<Scalars['UUID']['input']>;
};

export type Blood_TestsUpdateResponse = {
  __typename?: 'blood_testsUpdateResponse';
  /** Count of the records impacted by the mutation */
  affectedCount: Scalars['Int']['output'];
  /** Array of records impacted by the mutation */
  records: Array<Blood_Tests>;
};

export type Conditions = Node & {
  __typename?: 'conditions';
  created_at: Scalars['Datetime']['output'];
  id: Scalars['UUID']['output'];
  name: Scalars['String']['output'];
  /** Globally Unique Record Identifier */
  nodeId: Scalars['ID']['output'];
  notes?: Maybe<Scalars['String']['output']>;
  user_id: Scalars['UUID']['output'];
};

export type ConditionsConnection = {
  __typename?: 'conditionsConnection';
  edges: Array<ConditionsEdge>;
  pageInfo: PageInfo;
};

export type ConditionsDeleteResponse = {
  __typename?: 'conditionsDeleteResponse';
  /** Count of the records impacted by the mutation */
  affectedCount: Scalars['Int']['output'];
  /** Array of records impacted by the mutation */
  records: Array<Conditions>;
};

export type ConditionsEdge = {
  __typename?: 'conditionsEdge';
  cursor: Scalars['String']['output'];
  node: Conditions;
};

export type ConditionsFilter = {
  /** Returns true only if all its inner filters are true, otherwise returns false */
  and?: InputMaybe<Array<ConditionsFilter>>;
  created_at?: InputMaybe<DatetimeFilter>;
  id?: InputMaybe<UuidFilter>;
  name?: InputMaybe<StringFilter>;
  nodeId?: InputMaybe<IdFilter>;
  /** Negates a filter */
  not?: InputMaybe<ConditionsFilter>;
  notes?: InputMaybe<StringFilter>;
  /** Returns true if at least one of its inner filters is true, otherwise returns false */
  or?: InputMaybe<Array<ConditionsFilter>>;
  user_id?: InputMaybe<UuidFilter>;
};

export type ConditionsInsertInput = {
  created_at?: InputMaybe<Scalars['Datetime']['input']>;
  id?: InputMaybe<Scalars['UUID']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  notes?: InputMaybe<Scalars['String']['input']>;
  user_id?: InputMaybe<Scalars['UUID']['input']>;
};

export type ConditionsInsertResponse = {
  __typename?: 'conditionsInsertResponse';
  /** Count of the records impacted by the mutation */
  affectedCount: Scalars['Int']['output'];
  /** Array of records impacted by the mutation */
  records: Array<Conditions>;
};

export type ConditionsOrderBy = {
  created_at?: InputMaybe<OrderByDirection>;
  id?: InputMaybe<OrderByDirection>;
  name?: InputMaybe<OrderByDirection>;
  notes?: InputMaybe<OrderByDirection>;
  user_id?: InputMaybe<OrderByDirection>;
};

export type ConditionsUpdateInput = {
  created_at?: InputMaybe<Scalars['Datetime']['input']>;
  id?: InputMaybe<Scalars['UUID']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  notes?: InputMaybe<Scalars['String']['input']>;
  user_id?: InputMaybe<Scalars['UUID']['input']>;
};

export type ConditionsUpdateResponse = {
  __typename?: 'conditionsUpdateResponse';
  /** Count of the records impacted by the mutation */
  affectedCount: Scalars['Int']['output'];
  /** Array of records impacted by the mutation */
  records: Array<Conditions>;
};

export type DeleteBloodTestMutationVariables = Exact<{
  id: Scalars['UUID']['input'];
}>;


export type DeleteBloodTestMutation = { __typename?: 'Mutation', deleteFromblood_testsCollection: { __typename?: 'blood_testsDeleteResponse', affectedCount: number } };

export type InsertBloodTestMutationVariables = Exact<{
  user_id: Scalars['UUID']['input'];
  file_name: Scalars['String']['input'];
  file_path: Scalars['String']['input'];
  status: Scalars['String']['input'];
  test_date?: InputMaybe<Scalars['Date']['input']>;
}>;


export type InsertBloodTestMutation = { __typename?: 'Mutation', insertIntoblood_testsCollection?: { __typename?: 'blood_testsInsertResponse', records: Array<{ __typename?: 'blood_tests', id: string, file_name: string, file_path: string, status: string, test_date?: string | null }> } | null };

export type InsertBloodMarkersMutationVariables = Exact<{
  objects: Array<Blood_MarkersInsertInput> | Blood_MarkersInsertInput;
}>;


export type InsertBloodMarkersMutation = { __typename?: 'Mutation', insertIntoblood_markersCollection?: { __typename?: 'blood_markersInsertResponse', records: Array<{ __typename?: 'blood_markers', id: string }> } | null };

export type UpdateBloodTestStatusMutationVariables = Exact<{
  id: Scalars['UUID']['input'];
  status: Scalars['String']['input'];
  error_message?: InputMaybe<Scalars['String']['input']>;
}>;


export type UpdateBloodTestStatusMutation = { __typename?: 'Mutation', updateblood_testsCollection: { __typename?: 'blood_testsUpdateResponse', records: Array<{ __typename?: 'blood_tests', id: string, status: string }> } };

export type InsertConditionMutationVariables = Exact<{
  user_id: Scalars['UUID']['input'];
  name: Scalars['String']['input'];
  notes?: InputMaybe<Scalars['String']['input']>;
}>;


export type InsertConditionMutation = { __typename?: 'Mutation', insertIntoconditionsCollection?: { __typename?: 'conditionsInsertResponse', records: Array<{ __typename?: 'conditions', id: string, name: string }> } | null };

export type DeleteConditionMutationVariables = Exact<{
  id: Scalars['UUID']['input'];
}>;


export type DeleteConditionMutation = { __typename?: 'Mutation', deleteFromconditionsCollection: { __typename?: 'conditionsDeleteResponse', affectedCount: number } };

export type GetBloodTestsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetBloodTestsQuery = { __typename?: 'Query', blood_testsCollection?: { __typename?: 'blood_testsConnection', edges: Array<{ __typename?: 'blood_testsEdge', node: { __typename?: 'blood_tests', id: string, file_name: string, file_path: string, status: string, test_date?: string | null, uploaded_at: string, error_message?: string | null } }> } | null };

export type GetBloodTestQueryVariables = Exact<{
  id: Scalars['UUID']['input'];
}>;


export type GetBloodTestQuery = { __typename?: 'Query', blood_testsCollection?: { __typename?: 'blood_testsConnection', edges: Array<{ __typename?: 'blood_testsEdge', node: { __typename?: 'blood_tests', id: string, file_name: string, file_path: string, status: string, test_date?: string | null, uploaded_at: string, error_message?: string | null, user_id: string } }> } | null, blood_markersCollection?: { __typename?: 'blood_markersConnection', edges: Array<{ __typename?: 'blood_markersEdge', node: { __typename?: 'blood_markers', id: string, name: string, value?: string | null, unit?: string | null, reference_range?: string | null, flag?: string | null } }> } | null };

export type GetConditionsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetConditionsQuery = { __typename?: 'Query', conditionsCollection?: { __typename?: 'conditionsConnection', edges: Array<{ __typename?: 'conditionsEdge', node: { __typename?: 'conditions', id: string, name: string, notes?: string | null, created_at: string } }> } | null };

export type GetConditionQueryVariables = Exact<{
  id: Scalars['UUID']['input'];
}>;


export type GetConditionQuery = { __typename?: 'Query', conditionsCollection?: { __typename?: 'conditionsConnection', edges: Array<{ __typename?: 'conditionsEdge', node: { __typename?: 'conditions', id: string, name: string, notes?: string | null, created_at: string, user_id: string } }> } | null };


export const DeleteBloodTestDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteBloodTest"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UUID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteFromblood_testsCollection"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"filter"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"id"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"eq"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}]}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"affectedCount"}}]}}]}}]} as unknown as DocumentNode<DeleteBloodTestMutation, DeleteBloodTestMutationVariables>;
export const InsertBloodTestDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"InsertBloodTest"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"user_id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UUID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"file_name"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"file_path"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"status"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"test_date"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Date"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"insertIntoblood_testsCollection"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"objects"},"value":{"kind":"ListValue","values":[{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"user_id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"user_id"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"file_name"},"value":{"kind":"Variable","name":{"kind":"Name","value":"file_name"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"file_path"},"value":{"kind":"Variable","name":{"kind":"Name","value":"file_path"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"status"},"value":{"kind":"Variable","name":{"kind":"Name","value":"status"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"test_date"},"value":{"kind":"Variable","name":{"kind":"Name","value":"test_date"}}}]}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"records"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"file_name"}},{"kind":"Field","name":{"kind":"Name","value":"file_path"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"test_date"}}]}}]}}]}}]} as unknown as DocumentNode<InsertBloodTestMutation, InsertBloodTestMutationVariables>;
export const InsertBloodMarkersDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"InsertBloodMarkers"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"objects"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"blood_markersInsertInput"}}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"insertIntoblood_markersCollection"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"objects"},"value":{"kind":"Variable","name":{"kind":"Name","value":"objects"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"records"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]}}]} as unknown as DocumentNode<InsertBloodMarkersMutation, InsertBloodMarkersMutationVariables>;
export const UpdateBloodTestStatusDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateBloodTestStatus"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UUID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"status"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"error_message"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateblood_testsCollection"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"filter"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"id"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"eq"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}]}}]}},{"kind":"Argument","name":{"kind":"Name","value":"set"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"status"},"value":{"kind":"Variable","name":{"kind":"Name","value":"status"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"error_message"},"value":{"kind":"Variable","name":{"kind":"Name","value":"error_message"}}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"records"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}}]}}]}}]}}]} as unknown as DocumentNode<UpdateBloodTestStatusMutation, UpdateBloodTestStatusMutationVariables>;
export const InsertConditionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"InsertCondition"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"user_id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UUID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"name"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"notes"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"insertIntoconditionsCollection"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"objects"},"value":{"kind":"ListValue","values":[{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"user_id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"user_id"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"name"},"value":{"kind":"Variable","name":{"kind":"Name","value":"name"}}},{"kind":"ObjectField","name":{"kind":"Name","value":"notes"},"value":{"kind":"Variable","name":{"kind":"Name","value":"notes"}}}]}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"records"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]}}]} as unknown as DocumentNode<InsertConditionMutation, InsertConditionMutationVariables>;
export const DeleteConditionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteCondition"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UUID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteFromconditionsCollection"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"filter"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"id"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"eq"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}]}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"affectedCount"}}]}}]}}]} as unknown as DocumentNode<DeleteConditionMutation, DeleteConditionMutationVariables>;
export const GetBloodTestsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetBloodTests"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"blood_testsCollection"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"orderBy"},"value":{"kind":"ListValue","values":[{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"uploaded_at"},"value":{"kind":"EnumValue","value":"DescNullsLast"}}]}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"edges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"node"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"file_name"}},{"kind":"Field","name":{"kind":"Name","value":"file_path"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"test_date"}},{"kind":"Field","name":{"kind":"Name","value":"uploaded_at"}},{"kind":"Field","name":{"kind":"Name","value":"error_message"}}]}}]}}]}}]}}]} as unknown as DocumentNode<GetBloodTestsQuery, GetBloodTestsQueryVariables>;
export const GetBloodTestDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetBloodTest"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UUID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"blood_testsCollection"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"filter"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"id"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"eq"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}]}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"edges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"node"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"file_name"}},{"kind":"Field","name":{"kind":"Name","value":"file_path"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"test_date"}},{"kind":"Field","name":{"kind":"Name","value":"uploaded_at"}},{"kind":"Field","name":{"kind":"Name","value":"error_message"}},{"kind":"Field","name":{"kind":"Name","value":"user_id"}}]}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"blood_markersCollection"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"filter"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"test_id"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"eq"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}]}}]}},{"kind":"Argument","name":{"kind":"Name","value":"orderBy"},"value":{"kind":"ListValue","values":[{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"name"},"value":{"kind":"EnumValue","value":"AscNullsLast"}}]}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"edges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"node"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"value"}},{"kind":"Field","name":{"kind":"Name","value":"unit"}},{"kind":"Field","name":{"kind":"Name","value":"reference_range"}},{"kind":"Field","name":{"kind":"Name","value":"flag"}}]}}]}}]}}]}}]} as unknown as DocumentNode<GetBloodTestQuery, GetBloodTestQueryVariables>;
export const GetConditionsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetConditions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"conditionsCollection"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"orderBy"},"value":{"kind":"ListValue","values":[{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"created_at"},"value":{"kind":"EnumValue","value":"DescNullsLast"}}]}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"edges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"node"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"created_at"}}]}}]}}]}}]}}]} as unknown as DocumentNode<GetConditionsQuery, GetConditionsQueryVariables>;
export const GetConditionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetCondition"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UUID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"conditionsCollection"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"filter"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"id"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"eq"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}]}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"edges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"node"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"notes"}},{"kind":"Field","name":{"kind":"Name","value":"created_at"}},{"kind":"Field","name":{"kind":"Name","value":"user_id"}}]}}]}}]}}]}}]} as unknown as DocumentNode<GetConditionQuery, GetConditionQueryVariables>;