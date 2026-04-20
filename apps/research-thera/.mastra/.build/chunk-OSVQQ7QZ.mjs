import { d as date, o as object, e as boolean, u as union, n as number$1, l as literal, _ as _enum, b as array, s as string, r as record, f as nativeEnum, h as unknown, p as preprocess } from './schemas.mjs';
import { n as number, d as date$1 } from './coerce.mjs';

// ../_internal-core/dist/index.js
var EntityType = /* @__PURE__ */ ((EntityType2) => {
  EntityType2["AGENT"] = "agent";
  EntityType2["SCORER"] = "scorer";
  EntityType2["TRAJECTORY"] = "trajectory";
  EntityType2["INPUT_PROCESSOR"] = "input_processor";
  EntityType2["INPUT_STEP_PROCESSOR"] = "input_step_processor";
  EntityType2["OUTPUT_PROCESSOR"] = "output_processor";
  EntityType2["OUTPUT_STEP_PROCESSOR"] = "output_step_processor";
  EntityType2["WORKFLOW_STEP"] = "workflow_step";
  EntityType2["TOOL"] = "tool";
  EntityType2["WORKFLOW_RUN"] = "workflow_run";
  EntityType2["MEMORY"] = "memory";
  return EntityType2;
})(EntityType || {});
var createdAtField = date().describe("Database record creation time");
var updatedAtField = date().describe("Database record last update time");
var dbTimestamps = {
  createdAt: createdAtField,
  updatedAt: updatedAtField.nullable()
};
var paginationArgsSchema = object({
  page: number().int().min(0).optional().default(0).describe("Zero-indexed page number"),
  perPage: number().int().min(1).max(100).optional().default(10).describe("Number of items per page")
}).describe("Pagination options for list queries");
var paginationInfoSchema = object({
  total: number$1().describe("Total number of items available"),
  page: number$1().describe("Current page"),
  perPage: union([number$1(), literal(false)]).describe("Number of items per page, or false if pagination is disabled"),
  hasMore: boolean().describe("True if more pages are available")
});
var dateRangeSchema = object({
  start: date$1().optional().describe("Start of date range (inclusive by default)"),
  end: date$1().optional().describe("End of date range (inclusive by default)"),
  startExclusive: boolean().optional().describe("When true, excludes the start date from results (uses > instead of >=)"),
  endExclusive: boolean().optional().describe("When true, excludes the end date from results (uses < instead of <=)")
}).describe("Date range filter for timestamps");
var sortDirectionSchema = _enum(["ASC", "DESC"]).describe("Sort direction: 'ASC' | 'DESC'");
var aggregationTypeSchema = _enum(["sum", "avg", "min", "max", "count", "last"]).describe("Aggregation function");
var aggregationIntervalSchema = _enum(["1m", "5m", "15m", "1h", "1d"]).describe("Time bucket interval");
var comparePeriodSchema = _enum(["previous_period", "previous_day", "previous_week"]).describe("Comparison period for aggregate queries");
var groupBySchema = array(string()).min(1).describe("Fields to group by");
var percentilesSchema = array(number$1().min(0).max(1)).min(1).describe("Percentile values (0-1)");
var aggregateResponseFields = {
  value: number$1().nullable().describe("Aggregated value"),
  previousValue: number$1().nullable().optional().describe("Value from comparison period"),
  changePercent: number$1().nullable().optional().describe("Percentage change from comparison period")
};
var dimensionsField = record(string(), string().nullable()).describe("Dimension values for this group");
var aggregatedValueField = number$1().describe("Aggregated value");
var bucketTimestampField = date().describe("Bucket timestamp");
var percentileField = number$1().describe("Percentile value");
var percentileBucketValueField = number$1().describe("Percentile value at this bucket");
var entityTypeField = nativeEnum(EntityType).describe(`Entity type (e.g., 'agent' | 'processor' | 'tool' | 'workflow')`);
var entityIdField = string().describe('ID of the entity (e.g., "weatherAgent", "orderWorkflow")');
var entityNameField = string().describe("Name of the entity");
var userIdField = string().describe("Human end-user who triggered execution");
var organizationIdField = string().describe("Multi-tenant organization/account");
var resourceIdField = string().describe("Broader resource context (Mastra memory compatibility)");
var runIdField = string().describe("Unique execution run identifier");
var sessionIdField = string().describe("Session identifier for grouping traces");
var threadIdField = string().describe("Conversation thread identifier");
var requestIdField = string().describe("HTTP request ID for log correlation");
var environmentField = string().describe(`Environment (e.g., "production" | "staging" | "development")`);
var sourceField = string().describe(`Source of execution (e.g., "local" | "cloud" | "ci")`);
var executionSourceField = string().describe(`Source of execution (e.g., "local" | "cloud" | "ci")`);
var serviceNameField = string().describe("Name of the service");
var parentEntityTypeField = nativeEnum(EntityType).describe("Entity type of the parent entity");
var parentEntityIdField = string().describe("ID of the parent entity");
var parentEntityNameField = string().describe("Name of the parent entity");
var rootEntityTypeField = nativeEnum(EntityType).describe("Entity type of the root entity");
var rootEntityIdField = string().describe("ID of the root entity");
var rootEntityNameField = string().describe("Name of the root entity");
var entityVersionIdField = string().describe("Version ID of the entity that produced this signal (e.g., agent version, workflow version)");
var parentEntityVersionIdField = string().describe("Version ID of the parent entity that produced this signal");
var rootEntityVersionIdField = string().describe("Version ID of the root entity that produced this signal");
var experimentIdField = string().describe("Experiment or eval run identifier");
var scopeField = record(string(), unknown()).describe('Arbitrary package/app version info (e.g., {"core": "1.0.0", "memory": "1.0.0", "gitSha": "abcd1234"})');
var metadataField = record(string(), unknown()).describe("User-defined metadata for custom filtering");
var tagsField = array(string()).describe("Labels for filtering");
var contextFieldsBase = {
  // Entity identification
  entityType: entityTypeField.nullish(),
  entityId: entityIdField.nullish(),
  entityName: entityNameField.nullish(),
  // Parent entity hierarchy
  parentEntityType: parentEntityTypeField.nullish(),
  parentEntityId: parentEntityIdField.nullish(),
  parentEntityName: parentEntityNameField.nullish(),
  // Root entity hierarchy
  rootEntityType: rootEntityTypeField.nullish(),
  rootEntityId: rootEntityIdField.nullish(),
  rootEntityName: rootEntityNameField.nullish(),
  // Identity & tenancy
  userId: userIdField.nullish(),
  organizationId: organizationIdField.nullish(),
  resourceId: resourceIdField.nullish(),
  // Correlation IDs
  runId: runIdField.nullish(),
  sessionId: sessionIdField.nullish(),
  threadId: threadIdField.nullish(),
  requestId: requestIdField.nullish(),
  // Deployment context
  environment: environmentField.nullish(),
  serviceName: serviceNameField.nullish(),
  scope: scopeField.nullish(),
  // Entity versioning
  entityVersionId: entityVersionIdField.nullish(),
  parentEntityVersionId: parentEntityVersionIdField.nullish(),
  rootEntityVersionId: rootEntityVersionIdField.nullish(),
  // Experimentation
  experimentId: experimentIdField.nullish()
};
var contextFields = {
  ...contextFieldsBase,
  executionSource: executionSourceField.nullish(),
  tags: tagsField.nullish()
};
var spanContextFields = {
  ...contextFieldsBase,
  source: sourceField.nullish()
};
var commonFilterFields = {
  timestamp: dateRangeSchema.optional().describe("Filter by timestamp range"),
  traceId: string().optional().describe("Filter by trace ID"),
  spanId: string().optional().describe("Filter by span ID"),
  entityType: entityTypeField.optional(),
  entityName: entityNameField.optional(),
  entityVersionId: entityVersionIdField.optional(),
  parentEntityVersionId: parentEntityVersionIdField.optional(),
  rootEntityVersionId: rootEntityVersionIdField.optional(),
  userId: userIdField.optional(),
  organizationId: organizationIdField.optional(),
  experimentId: experimentIdField.optional(),
  serviceName: serviceNameField.optional(),
  environment: environmentField.optional(),
  parentEntityType: parentEntityTypeField.optional(),
  parentEntityName: parentEntityNameField.optional(),
  rootEntityType: rootEntityTypeField.optional(),
  rootEntityName: rootEntityNameField.optional(),
  resourceId: resourceIdField.optional(),
  runId: runIdField.optional(),
  sessionId: sessionIdField.optional(),
  threadId: threadIdField.optional(),
  requestId: requestIdField.optional(),
  executionSource: executionSourceField.optional(),
  tags: array(string()).optional().describe("Filter by tags (must have all specified tags)")
};
var traceIdField = string().describe("Unique trace identifier");
var spanIdField = string().describe("Unique span identifier within a trace");
var logLevelSchema = _enum(["debug", "info", "warn", "error", "fatal"]);
var messageField = string().describe("Log message");
var logDataField = record(string(), unknown()).describe("Structured data attached to the log");
var logRecordSchema = object({
  timestamp: date().describe("When the log was created"),
  level: logLevelSchema.describe("Log severity level"),
  message: messageField,
  data: logDataField.nullish(),
  // Correlation
  traceId: traceIdField.nullish(),
  spanId: spanIdField.nullish(),
  // Context fields
  ...contextFields,
  /**
   * @deprecated Use `executionSource` instead.
   */
  source: string().nullish().describe("Execution source"),
  metadata: metadataField.nullish()
}).describe("Log record as stored in the database");
object({
  level: logLevelSchema,
  message: messageField,
  data: logDataField.optional(),
  tags: tagsField.optional()
}).describe("User-provided log input");
var createLogRecordSchema = logRecordSchema;
object({
  logs: array(createLogRecordSchema)
}).describe("Arguments for batch creating logs");
var logsFilterSchema = object({
  ...commonFilterFields,
  // Log-specific filters
  /**
   * @deprecated Use `executionSource` instead.
   */
  source: string().optional().describe("Filter by execution source"),
  level: union([logLevelSchema, array(logLevelSchema)]).optional().describe("Filter by log level(s)")
}).describe("Filters for querying logs");
var logsOrderByFieldSchema = _enum(["timestamp"]).describe("Field to order by: 'timestamp'");
var logsOrderBySchema = object({
  field: logsOrderByFieldSchema.default("timestamp").describe("Field to order by"),
  direction: sortDirectionSchema.default("DESC").describe("Sort direction")
}).describe("Order by configuration");
var listLogsArgsSchema = object({
  filters: logsFilterSchema.optional().describe("Optional filters to apply"),
  pagination: paginationArgsSchema.default({ page: 0, perPage: 10 }).describe("Pagination settings"),
  orderBy: logsOrderBySchema.default({ field: "timestamp", direction: "DESC" }).describe("Ordering configuration (defaults to timestamp desc)")
}).describe("Arguments for listing logs");
object({
  pagination: paginationInfoSchema,
  logs: array(logRecordSchema)
});
var scorerIdField = string().describe("Identifier of the scorer (e.g., relevance, accuracy)");
var scorerNameField = string().describe("Display name of the scorer");
var scorerVersionField = string().describe("Version of the scorer");
var scoreSourceField = string().describe("How the score was produced (e.g., manual, automated, experiment)");
var scoreValueField = number$1().describe("Score value (range defined by scorer)");
var scoreReasonField = string().describe("Explanation for the score");
var scoreRecordSchema = object({
  timestamp: date().describe("When the score was recorded"),
  // Target
  traceId: traceIdField.nullish().describe("Trace that anchors the scored target when available"),
  spanId: spanIdField.nullish().describe("Span ID this score applies to"),
  // Score data
  scorerId: scorerIdField,
  scorerName: scorerNameField.nullish(),
  scorerVersion: scorerVersionField.nullish(),
  scoreSource: scoreSourceField.nullish(),
  /**
   * @deprecated Use `scoreSource` instead.
   */
  source: scoreSourceField.nullish(),
  score: scoreValueField,
  reason: scoreReasonField.nullish(),
  // Context (entity hierarchy, identity, correlation, deployment, experimentation)
  ...contextFields,
  /** Trace ID of the scoring run (links to trace that generated this score) */
  scoreTraceId: string().nullish().describe("Trace ID of the scoring run for debugging score generation"),
  // User-defined metadata (context fields stored here)
  metadata: record(string(), unknown()).nullish().describe("User-defined metadata")
}).describe("Score record as stored in the database");
object({
  scorerId: scorerIdField,
  scorerName: scorerNameField.optional(),
  scorerVersion: scorerVersionField.optional(),
  scoreSource: scoreSourceField.optional(),
  /**
   * @deprecated Use `scoreSource` instead.
   */
  source: scoreSourceField.optional(),
  score: scoreValueField,
  reason: scoreReasonField.optional(),
  metadata: record(string(), unknown()).optional().describe("Additional scorer-specific metadata"),
  experimentId: experimentIdField.optional(),
  scoreTraceId: string().optional().describe("Trace ID of the scoring run for debugging score generation"),
  targetEntityType: entityTypeField.optional().describe("Entity type the scorer evaluated when known")
}).describe("User-provided score input");
var createScoreRecordSchema = scoreRecordSchema;
object({
  score: createScoreRecordSchema
}).describe("Arguments for creating a score");
object({
  score: createScoreRecordSchema.omit({ timestamp: true })
}).describe("Arguments for creating a score");
object({ success: boolean() }).describe("Response from creating a score");
object({
  scores: array(createScoreRecordSchema)
}).describe("Arguments for batch recording scores");
var scoresFilterSchema = object({
  ...commonFilterFields,
  // Score-specific filters
  scorerId: union([string(), array(string())]).optional().describe("Filter by scorer ID(s)"),
  scoreSource: scoreSourceField.optional().describe("Filter by how the score was produced"),
  /**
   * @deprecated Use `scoreSource` instead.
   */
  source: scoreSourceField.optional().describe("Filter by how the score was produced")
}).describe("Filters for querying scores");
var scoresOrderByFieldSchema = _enum(["timestamp", "score"]).describe("Field to order by: 'timestamp' | 'score'");
var scoresOrderBySchema = object({
  field: scoresOrderByFieldSchema.default("timestamp").describe("Field to order by"),
  direction: sortDirectionSchema.default("DESC").describe("Sort direction")
}).describe("Order by configuration");
var listScoresArgsSchema = object({
  filters: scoresFilterSchema.optional(),
  pagination: paginationArgsSchema.default({ page: 0, perPage: 10 }).describe("Pagination settings"),
  orderBy: scoresOrderBySchema.default({ field: "timestamp", direction: "DESC" }).describe("Ordering configuration (defaults to timestamp desc)")
}).describe("Arguments for listing scores");
object({
  pagination: paginationInfoSchema,
  scores: array(scoreRecordSchema)
});
object({
  scorerId: scorerIdField,
  scoreSource: scoreSourceField.optional(),
  aggregation: aggregationTypeSchema,
  filters: scoresFilterSchema.optional(),
  comparePeriod: comparePeriodSchema.optional()
}).describe("Arguments for getting a score aggregate");
object(aggregateResponseFields);
object({
  scorerId: scorerIdField,
  scoreSource: scoreSourceField.optional(),
  groupBy: groupBySchema,
  aggregation: aggregationTypeSchema,
  filters: scoresFilterSchema.optional()
}).describe("Arguments for getting a score breakdown");
object({
  groups: array(
    object({
      dimensions: dimensionsField,
      value: aggregatedValueField
    })
  )
});
object({
  scorerId: scorerIdField,
  scoreSource: scoreSourceField.optional(),
  interval: aggregationIntervalSchema,
  aggregation: aggregationTypeSchema,
  filters: scoresFilterSchema.optional(),
  groupBy: groupBySchema.optional()
}).describe("Arguments for getting score time series");
object({
  series: array(
    object({
      name: string().describe("Series name (scorer ID or group key)"),
      points: array(
        object({
          timestamp: bucketTimestampField,
          value: aggregatedValueField
        })
      )
    })
  )
});
object({
  scorerId: scorerIdField,
  scoreSource: scoreSourceField.optional(),
  percentiles: percentilesSchema,
  interval: aggregationIntervalSchema,
  filters: scoresFilterSchema.optional()
}).describe("Arguments for getting score percentiles");
object({
  series: array(
    object({
      percentile: percentileField,
      points: array(
        object({
          timestamp: bucketTimestampField,
          value: percentileBucketValueField
        })
      )
    })
  )
});
var feedbackSourceField = string().describe("Source of feedback (e.g., 'user', 'system', 'manual')");
var feedbackTypeField = string().describe("Type of feedback (e.g., 'thumbs', 'rating', 'correction')");
var feedbackValueField = union([number$1(), string()]).describe("Feedback value (rating number or correction text)");
var feedbackCommentField = string().describe("Additional comment or context");
var feedbackUserIdField = string().describe("User who provided the feedback");
function normalizeLegacyFeedbackActor(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return input;
  }
  const record = { ...input };
  if (typeof record.userId === "string" && record.feedbackUserId == null) {
    record.feedbackUserId = record.userId;
    delete record.userId;
  }
  return record;
}
var feedbackRecordObjectSchema = object({
  timestamp: date().describe("When the feedback was recorded"),
  // Target
  traceId: traceIdField.nullish().describe("Trace that anchors the feedback target when available"),
  spanId: spanIdField.nullish().describe("Span ID this feedback applies to"),
  // Feedback data
  feedbackSource: feedbackSourceField.nullish(),
  /**
   * @deprecated Use `feedbackSource` instead.
   */
  source: feedbackSourceField.nullish(),
  feedbackType: feedbackTypeField,
  value: feedbackValueField,
  comment: feedbackCommentField.nullish(),
  // Feedback actor identity
  feedbackUserId: feedbackUserIdField.nullish(),
  // Context (entity hierarchy, identity, correlation, deployment, experimentation)
  ...contextFields,
  // Source linkage (e.g. dataset item result ID)
  sourceId: string().nullish().describe("ID of the source record this feedback is linked to (e.g. experiment result ID)"),
  // User-defined metadata (context fields stored here)
  metadata: record(string(), unknown()).nullish().describe("User-defined metadata")
});
var feedbackRecordSchema = object(feedbackRecordObjectSchema.shape).describe("Feedback record as stored in the database");
var feedbackInputObjectSchema = object({
  feedbackSource: feedbackSourceField.optional(),
  /**
   * @deprecated Use `feedbackSource` instead.
   */
  source: feedbackSourceField.optional(),
  feedbackType: feedbackTypeField,
  value: feedbackValueField,
  comment: feedbackCommentField.optional(),
  feedbackUserId: feedbackUserIdField.optional(),
  /**
   * @deprecated Use `feedbackUserId` instead.
   */
  userId: feedbackUserIdField.optional(),
  metadata: record(string(), unknown()).optional().describe("Additional feedback-specific metadata"),
  experimentId: experimentIdField.optional(),
  sourceId: string().optional().describe("ID of the source record this feedback is linked to")
});
object(feedbackInputObjectSchema.shape).describe("User-provided feedback input");
object({
  feedback: preprocess(normalizeLegacyFeedbackActor, feedbackRecordObjectSchema)
}).describe("Arguments for creating feedback");
object({
  feedback: feedbackRecordObjectSchema.omit({ timestamp: true })
}).describe("Arguments for creating feedback");
object({ success: boolean() }).describe("Response from creating feedback");
object({
  feedbacks: array(preprocess(normalizeLegacyFeedbackActor, feedbackRecordObjectSchema))
}).describe("Arguments for batch recording feedback");
var feedbackFilterObjectSchema = object({
  ...commonFilterFields,
  // Feedback-specific filters
  feedbackType: union([string(), array(string())]).optional().describe("Filter by feedback type(s)"),
  feedbackSource: feedbackSourceField.optional(),
  /**
   * @deprecated Use `feedbackSource` instead.
   */
  source: feedbackSourceField.optional(),
  feedbackUserId: feedbackUserIdField.optional()
});
var feedbackFilterSchema = object(feedbackFilterObjectSchema.shape).describe("Filters for querying feedback");
var feedbackOrderByFieldSchema = _enum(["timestamp"]).describe("Field to order by: 'timestamp'");
var feedbackOrderBySchema = object({
  field: feedbackOrderByFieldSchema.default("timestamp").describe("Field to order by"),
  direction: sortDirectionSchema.default("DESC").describe("Sort direction")
}).describe("Order by configuration");
var listFeedbackArgsSchema = object({
  filters: preprocess(normalizeLegacyFeedbackActor, feedbackFilterObjectSchema).optional().describe("Optional filters to apply"),
  pagination: paginationArgsSchema.default({ page: 0, perPage: 10 }).describe("Pagination settings"),
  orderBy: feedbackOrderBySchema.default({ field: "timestamp", direction: "DESC" }).describe("Ordering configuration (defaults to timestamp desc)")
}).describe("Arguments for listing feedback");
object({
  pagination: paginationInfoSchema,
  feedback: array(feedbackRecordSchema)
});
object({
  feedbackType: feedbackTypeField,
  feedbackSource: feedbackSourceField.optional(),
  aggregation: aggregationTypeSchema,
  filters: feedbackFilterSchema.optional(),
  comparePeriod: comparePeriodSchema.optional()
}).describe("Arguments for getting a feedback aggregate over numeric values");
object(aggregateResponseFields);
object({
  feedbackType: feedbackTypeField,
  feedbackSource: feedbackSourceField.optional(),
  groupBy: groupBySchema,
  aggregation: aggregationTypeSchema,
  filters: feedbackFilterSchema.optional()
}).describe("Arguments for getting a feedback breakdown over numeric values");
object({
  groups: array(
    object({
      dimensions: dimensionsField,
      value: aggregatedValueField
    })
  )
});
object({
  feedbackType: feedbackTypeField,
  feedbackSource: feedbackSourceField.optional(),
  interval: aggregationIntervalSchema,
  aggregation: aggregationTypeSchema,
  filters: feedbackFilterSchema.optional(),
  groupBy: groupBySchema.optional()
}).describe("Arguments for getting feedback time series over numeric values");
object({
  series: array(
    object({
      name: string().describe("Series name (feedback type or group key)"),
      points: array(
        object({
          timestamp: bucketTimestampField,
          value: aggregatedValueField
        })
      )
    })
  )
});
object({
  feedbackType: feedbackTypeField,
  feedbackSource: feedbackSourceField.optional(),
  percentiles: percentilesSchema,
  interval: aggregationIntervalSchema,
  filters: feedbackFilterSchema.optional()
}).describe("Arguments for getting feedback percentiles over numeric values");
object({
  series: array(
    object({
      percentile: percentileField,
      points: array(
        object({
          timestamp: bucketTimestampField,
          value: percentileBucketValueField
        })
      )
    })
  )
});
_enum(["counter", "gauge", "histogram"]);
var metricNameField = string().describe("Metric name (e.g., mastra_agent_duration_ms)");
var metricValueField = number$1().describe("Metric value");
var labelsField = record(string(), string()).describe("Metric labels for dimensional filtering");
var providerField = string().describe("Model provider");
var modelField = string().describe("Model");
var estimatedCostField = number$1().describe("Estimated cost");
var costUnitField = string().describe("Unit for the estimated cost (e.g., usd)");
var costMetadField = record(string(), unknown()).nullish().describe("Structured costing metadata");
var metricRecordSchema = object({
  timestamp: date().describe("When the metric was recorded"),
  name: metricNameField,
  value: metricValueField,
  // Correlation
  traceId: traceIdField.nullish(),
  spanId: spanIdField.nullish(),
  // Context (entity hierarchy, identity, correlation, deployment, experimentation)
  ...contextFields,
  /**
   * @deprecated Use `executionSource` instead.
   */
  source: string().nullish().describe("Execution source"),
  // Canonical costing fields
  provider: providerField.nullish(),
  model: modelField.nullish(),
  // Estimated cost related fields
  estimatedCost: estimatedCostField.nullish(),
  costUnit: costUnitField.nullish(),
  costMetadata: costMetadField.nullish(),
  // User-defined labels used for filtering
  labels: labelsField.default({}),
  // User-defined metadata
  metadata: metadataField.nullish()
}).describe("Metric record as stored in the database");
object({
  name: metricNameField,
  value: metricValueField,
  labels: labelsField.optional()
}).describe("User-provided metric input");
var createMetricRecordSchema = metricRecordSchema;
object({
  metrics: array(createMetricRecordSchema)
}).describe("Arguments for batch recording metrics");
object({
  type: aggregationTypeSchema,
  interval: aggregationIntervalSchema.optional(),
  groupBy: groupBySchema.optional()
}).describe("Metrics aggregation configuration");
var metricsFilterSchema = object({
  ...commonFilterFields,
  // Metric identification
  name: array(string()).nonempty().optional().describe("Filter by metric name(s)"),
  /**
   * @deprecated Use `executionSource` instead.
   */
  source: string().optional().describe("Filter by execution source"),
  // Canonical costing filters
  provider: providerField.optional(),
  model: modelField.optional(),
  costUnit: costUnitField.optional(),
  // Label filters (exact match on label values)
  labels: record(string(), string()).optional().describe("Exact match on label key-value pairs")
}).describe("Filters for querying metrics");
var metricsOrderByFieldSchema = _enum(["timestamp"]).describe("Field to order by: 'timestamp'");
var metricsOrderBySchema = object({
  field: metricsOrderByFieldSchema.default("timestamp").describe("Field to order by"),
  direction: sortDirectionSchema.default("DESC").describe("Sort direction")
}).describe("Order by configuration");
var listMetricsArgsSchema = object({
  filters: metricsFilterSchema.optional(),
  pagination: paginationArgsSchema.default({ page: 0, perPage: 10 }).describe("Pagination settings"),
  orderBy: metricsOrderBySchema.default({ field: "timestamp", direction: "DESC" }).describe("Ordering configuration (defaults to timestamp desc)")
}).describe("Arguments for listing metrics");
object({
  pagination: paginationInfoSchema,
  metrics: array(metricRecordSchema)
});
object({
  name: array(string()).nonempty().describe("Metric name(s) to aggregate"),
  aggregation: aggregationTypeSchema,
  filters: metricsFilterSchema.optional(),
  comparePeriod: comparePeriodSchema.optional()
}).describe("Arguments for getting a metric aggregate");
object({
  ...aggregateResponseFields,
  estimatedCost: number$1().nullable().optional().describe("Aggregated estimated cost from the same filtered row set"),
  costUnit: string().nullable().optional().describe("Shared cost unit for the aggregated rows, or null when mixed/unknown"),
  previousEstimatedCost: number$1().nullable().optional().describe("Aggregated estimated cost from the comparison period"),
  costChangePercent: number$1().nullable().optional().describe("Percentage change in estimated cost from comparison period")
});
object({
  name: array(string()).nonempty().describe("Metric name(s) to break down"),
  groupBy: groupBySchema,
  aggregation: aggregationTypeSchema,
  filters: metricsFilterSchema.optional()
}).describe("Arguments for getting a metric breakdown");
object({
  groups: array(
    object({
      dimensions: dimensionsField,
      value: aggregatedValueField,
      estimatedCost: number$1().nullable().optional().describe("Summed estimated cost for this group"),
      costUnit: string().nullable().optional().describe("Shared cost unit for this group, or null when mixed/unknown")
    })
  )
});
object({
  name: array(string()).nonempty().describe("Metric name(s)"),
  interval: aggregationIntervalSchema,
  aggregation: aggregationTypeSchema,
  filters: metricsFilterSchema.optional(),
  groupBy: groupBySchema.optional()
}).describe("Arguments for getting metric time series");
object({
  series: array(
    object({
      name: string().describe("Series name (metric name or group key)"),
      costUnit: string().nullable().optional().describe("Shared cost unit for this series, or null when mixed/unknown"),
      points: array(
        object({
          timestamp: bucketTimestampField,
          value: aggregatedValueField,
          estimatedCost: number$1().nullable().optional().describe("Summed estimated cost in this bucket")
        })
      )
    })
  )
});
object({
  name: string().describe("Metric name"),
  percentiles: percentilesSchema,
  interval: aggregationIntervalSchema,
  filters: metricsFilterSchema.optional()
}).describe("Arguments for getting metric percentiles");
object({
  series: array(
    object({
      percentile: percentileField,
      points: array(
        object({
          timestamp: bucketTimestampField,
          value: percentileBucketValueField
        })
      )
    })
  )
});
object({
  prefix: string().optional().describe("Filter metric names by prefix"),
  limit: number$1().int().min(1).optional().describe("Maximum number of names to return")
}).describe("Arguments for getting metric names");
object({
  names: array(string()).describe("Distinct metric names")
});
object({
  metricName: string().describe("Metric name to get label keys for")
}).describe("Arguments for getting metric label keys");
object({
  keys: array(string()).describe("Distinct label keys for the metric")
});
object({
  metricName: string().describe("Metric name"),
  labelKey: string().describe("Label key to get values for"),
  prefix: string().optional().describe("Filter values by prefix"),
  limit: number$1().int().min(1).optional().describe("Maximum number of values to return")
}).describe("Arguments for getting label values");
object({
  values: array(string()).describe("Distinct label values")
});
object({}).describe("Arguments for getting entity types");
object({
  entityTypes: array(entityTypeField).describe("Distinct entity types")
});
object({
  entityType: entityTypeField.optional().describe("Optional entity type filter")
}).describe("Arguments for getting entity names");
object({
  names: array(string()).describe("Distinct entity names")
});
object({}).describe("Arguments for getting service names");
object({
  serviceNames: array(string()).describe("Distinct service names")
});
object({}).describe("Arguments for getting environments");
object({
  environments: array(string()).describe("Distinct environments")
});
object({
  entityType: entityTypeField.optional().describe("Optional entity type filter")
}).describe("Arguments for getting tags");
object({
  tags: array(string()).describe("Distinct tags")
});

// src/observability/types/tracing.ts
var SpanType = /* @__PURE__ */ ((SpanType2) => {
  SpanType2["AGENT_RUN"] = "agent_run";
  SpanType2["SCORER_RUN"] = "scorer_run";
  SpanType2["SCORER_STEP"] = "scorer_step";
  SpanType2["GENERIC"] = "generic";
  SpanType2["MODEL_GENERATION"] = "model_generation";
  SpanType2["MODEL_STEP"] = "model_step";
  SpanType2["MODEL_CHUNK"] = "model_chunk";
  SpanType2["MCP_TOOL_CALL"] = "mcp_tool_call";
  SpanType2["PROCESSOR_RUN"] = "processor_run";
  SpanType2["TOOL_CALL"] = "tool_call";
  SpanType2["WORKFLOW_RUN"] = "workflow_run";
  SpanType2["WORKFLOW_STEP"] = "workflow_step";
  SpanType2["WORKFLOW_CONDITIONAL"] = "workflow_conditional";
  SpanType2["WORKFLOW_CONDITIONAL_EVAL"] = "workflow_conditional_eval";
  SpanType2["WORKFLOW_PARALLEL"] = "workflow_parallel";
  SpanType2["WORKFLOW_LOOP"] = "workflow_loop";
  SpanType2["WORKFLOW_SLEEP"] = "workflow_sleep";
  SpanType2["WORKFLOW_WAIT_EVENT"] = "workflow_wait_event";
  SpanType2["MEMORY_OPERATION"] = "memory_operation";
  SpanType2["WORKSPACE_ACTION"] = "workspace_action";
  SpanType2["RAG_INGESTION"] = "rag_ingestion";
  SpanType2["RAG_EMBEDDING"] = "rag_embedding";
  SpanType2["RAG_VECTOR_OPERATION"] = "rag_vector_operation";
  SpanType2["RAG_ACTION"] = "rag_action";
  SpanType2["GRAPH_ACTION"] = "graph_action";
  return SpanType2;
})(SpanType || {});

export { EntityType as E, SpanType as S, listLogsArgsSchema as a, listScoresArgsSchema as b, listFeedbackArgsSchema as c, dateRangeSchema as d, dbTimestamps as e, paginationInfoSchema as f, spanIdField as g, traceIdField as h, sortDirectionSchema as i, listMetricsArgsSchema as l, metadataField as m, paginationArgsSchema as p, spanContextFields as s, tagsField as t };
//# sourceMappingURL=chunk-OSVQQ7QZ.mjs.map
