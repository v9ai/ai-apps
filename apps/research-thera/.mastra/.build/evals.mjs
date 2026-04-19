import { b as getZodTypeName, c as getZodInnerType } from './chunk-RT2LCNDN.mjs';
import { S as SpanType, e as dbTimestamps, f as paginationInfoSchema, t as tagsField, m as metadataField, s as spanContextFields, g as spanIdField, h as traceIdField, d as dateRangeSchema, i as sortDirectionSchema, p as paginationArgsSchema } from './chunk-OSVQQ7QZ.mjs';
import { _ as _enum, o as object, s as string, r as record, h as unknown, e as boolean, n as number, b as array, f as nativeEnum, d as date, p as preprocess } from './schemas.mjs';

var scoringSourceSchema = _enum(["LIVE", "TEST"]);
var scoringEntityTypeSchema = _enum(["AGENT", "WORKFLOW", ...Object.values(SpanType)]);
object({
  description: string(),
  prompt: string()
});
var recordSchema = record(string(), unknown());
var optionalRecordSchema = recordSchema.optional();
var scoringInputSchema = object({
  runId: string().optional(),
  input: unknown().optional(),
  output: unknown(),
  additionalContext: optionalRecordSchema,
  requestContext: optionalRecordSchema
  // Note: observabilityContext is not serializable, so we don't include it in the schema
  // It's added at runtime when needed
});
object({
  runId: string().optional(),
  scorer: recordSchema,
  input: unknown(),
  output: unknown(),
  metadata: optionalRecordSchema,
  additionalContext: optionalRecordSchema,
  source: scoringSourceSchema,
  entity: recordSchema,
  entityType: scoringEntityTypeSchema,
  requestContext: optionalRecordSchema,
  structuredOutput: boolean().optional(),
  traceId: string().optional(),
  spanId: string().optional(),
  resourceId: string().optional(),
  threadId: string().optional()
  // Note: observabilityContext is not serializable, so we don't include it in the schema
});
var scoringValueSchema = number();
object({
  result: optionalRecordSchema,
  score: scoringValueSchema,
  prompt: string().optional()
});
var scoringInputWithExtractStepResultSchema = scoringInputSchema.extend({
  runId: string(),
  // Required in this context
  extractStepResult: optionalRecordSchema,
  extractPrompt: string().optional()
});
var scoringInputWithExtractStepResultAndAnalyzeStepResultSchema = scoringInputWithExtractStepResultSchema.extend({
  score: number(),
  analyzeStepResult: optionalRecordSchema,
  analyzePrompt: string().optional()
});
scoringInputWithExtractStepResultAndAnalyzeStepResultSchema.extend({
  reason: string().optional(),
  reasonPrompt: string().optional()
});
var scoreRowDataSchema = object({
  id: string(),
  scorerId: string(),
  entityId: string(),
  // From ScoringInputWithExtractStepResultAndScoreAndReason
  runId: string(),
  input: unknown().optional(),
  output: unknown(),
  additionalContext: optionalRecordSchema,
  requestContext: optionalRecordSchema,
  extractStepResult: optionalRecordSchema,
  extractPrompt: string().optional(),
  score: number(),
  analyzeStepResult: optionalRecordSchema,
  analyzePrompt: string().optional(),
  reason: string().optional(),
  reasonPrompt: string().optional(),
  // From ScoringHookInput
  scorer: recordSchema,
  metadata: optionalRecordSchema,
  source: scoringSourceSchema,
  entity: recordSchema,
  entityType: scoringEntityTypeSchema.optional(),
  structuredOutput: boolean().optional(),
  traceId: string().optional(),
  spanId: string().optional(),
  resourceId: string().optional(),
  threadId: string().optional(),
  // Additional ScoreRowData fields
  preprocessStepResult: optionalRecordSchema,
  preprocessPrompt: string().optional(),
  generateScorePrompt: string().optional(),
  generateReasonPrompt: string().optional(),
  // Timestamps
  ...dbTimestamps
});
var saveScorePayloadSchema = scoreRowDataSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var listScoresResponseSchema = object({
  pagination: paginationInfoSchema,
  scores: array(scoreRowDataSchema)
});
var SKIPPED_SPAN_TYPES = /* @__PURE__ */ new Set([
  "scorer_run" /* SCORER_RUN */,
  "scorer_step" /* SCORER_STEP */,
  "generic" /* GENERIC */,
  "model_step" /* MODEL_STEP */,
  "model_chunk" /* MODEL_CHUNK */,
  "workflow_conditional_eval" /* WORKFLOW_CONDITIONAL_EVAL */
]);
function spanToTrajectorySteps(node) {
  const { span, children: childNodes } = node;
  if (SKIPPED_SPAN_TYPES.has(span.spanType)) {
    return childNodes.flatMap(spanToTrajectorySteps);
  }
  const durationMs = span.endedAt != null && span.startedAt != null ? span.endedAt.getTime() - span.startedAt.getTime() : void 0;
  const childSteps = childNodes.flatMap(spanToTrajectorySteps);
  const base = {
    name: span.name,
    durationMs,
    metadata: span.metadata,
    ...childSteps.length > 0 ? { children: childSteps } : {}
  };
  const attrs = span.attributes ?? {};
  switch (span.spanType) {
    case "tool_call" /* TOOL_CALL */: {
      const toolArgs = toRecordOrUndefined(span.input);
      const toolResult = toRecordOrUndefined(span.output);
      return [
        {
          ...base,
          stepType: "tool_call",
          toolArgs,
          toolResult,
          success: typeof attrs.success === "boolean" ? attrs.success : void 0
        }
      ];
    }
    case "mcp_tool_call" /* MCP_TOOL_CALL */: {
      const toolArgs = toRecordOrUndefined(span.input);
      const toolResult = toRecordOrUndefined(span.output);
      return [
        {
          ...base,
          stepType: "mcp_tool_call",
          toolArgs,
          toolResult,
          mcpServer: typeof attrs.mcpServer === "string" ? attrs.mcpServer : void 0,
          success: typeof attrs.success === "boolean" ? attrs.success : void 0
        }
      ];
    }
    case "model_generation" /* MODEL_GENERATION */: {
      const usage = attrs.usage;
      return [
        {
          ...base,
          stepType: "model_generation",
          modelId: typeof attrs.model === "string" ? attrs.model : void 0,
          promptTokens: usage?.inputTokens,
          completionTokens: usage?.outputTokens,
          finishReason: typeof attrs.finishReason === "string" ? attrs.finishReason : void 0
        }
      ];
    }
    case "agent_run" /* AGENT_RUN */:
      return [{ ...base, stepType: "agent_run", agentId: span.entityId ?? void 0 }];
    case "workflow_run" /* WORKFLOW_RUN */:
      return [{ ...base, stepType: "workflow_run", workflowId: span.entityId ?? void 0 }];
    case "workflow_step" /* WORKFLOW_STEP */: {
      const output = toRecordOrUndefined(span.output);
      return [{ ...base, stepType: "workflow_step", stepId: span.name, output }];
    }
    case "workflow_conditional" /* WORKFLOW_CONDITIONAL */:
      return [{ ...base, stepType: "workflow_conditional" }];
    case "workflow_parallel" /* WORKFLOW_PARALLEL */:
      return [{ ...base, stepType: "workflow_parallel" }];
    case "workflow_loop" /* WORKFLOW_LOOP */:
      return [{ ...base, stepType: "workflow_loop" }];
    case "workflow_sleep" /* WORKFLOW_SLEEP */:
      return [{ ...base, stepType: "workflow_sleep" }];
    case "workflow_wait_event" /* WORKFLOW_WAIT_EVENT */:
      return [{ ...base, stepType: "workflow_wait_event" }];
    case "processor_run" /* PROCESSOR_RUN */:
      return [{ ...base, stepType: "processor_run" }];
    default:
      return childSteps;
  }
}
function toRecordOrUndefined(value) {
  if (value == null) return void 0;
  if (typeof value === "object" && !Array.isArray(value)) {
    return value;
  }
  return { value };
}
function extractTrajectoryFromTrace(spans, rootSpanId) {
  if (spans.length === 0) {
    return { steps: [] };
  }
  const nodeMap = /* @__PURE__ */ new Map();
  for (const span of spans) {
    nodeMap.set(span.spanId, { span, children: [] });
  }
  const roots = [];
  for (const span of spans) {
    const node = nodeMap.get(span.spanId);
    if (span.parentSpanId && nodeMap.has(span.parentSpanId)) {
      nodeMap.get(span.parentSpanId).children.push(node);
    } else {
      roots.push(node);
    }
  }
  for (const node of nodeMap.values()) {
    node.children.sort((a, b) => a.span.startedAt.getTime() - b.span.startedAt.getTime());
  }
  let targetRoots;
  if (rootSpanId) {
    const rootNode = nodeMap.get(rootSpanId);
    targetRoots = rootNode ? [rootNode] : roots;
  } else {
    targetRoots = roots;
  }
  let stepsToConvert;
  if (targetRoots.length === 1) {
    const root = targetRoots[0];
    const containerTypes = /* @__PURE__ */ new Set(["workflow_run" /* WORKFLOW_RUN */, "agent_run" /* AGENT_RUN */]);
    if (containerTypes.has(root.span.spanType)) {
      stepsToConvert = root.children;
    } else {
      stepsToConvert = targetRoots;
    }
  } else {
    stepsToConvert = targetRoots;
  }
  const steps = stepsToConvert.flatMap(spanToTrajectorySteps);
  let totalDurationMs;
  if (targetRoots.length === 1) {
    const root = targetRoots[0].span;
    if (root.endedAt && root.startedAt) {
      totalDurationMs = root.endedAt.getTime() - root.startedAt.getTime();
    }
  }
  return { steps, totalDurationMs };
}

// src/storage/domains/observability/tracing.ts
var createOmitKeys = (shape) => Object.fromEntries(Object.keys(shape).map((k) => [k, true]));
var spanNameField = string().describe("Human-readable span name");
var parentSpanIdField = string().describe("Parent span reference (null = root span)");
var spanTypeField = nativeEnum(SpanType).describe("Span type (e.g., WORKFLOW_RUN, AGENT_RUN, TOOL_CALL, etc.)");
var attributesField = record(string(), unknown()).describe("Span-type specific attributes (e.g., model, tokens, tools)");
var linksField = array(unknown()).describe("References to related spans in other traces");
var inputField = unknown().describe("Input data passed to the span");
var outputField = unknown().describe("Output data returned from the span");
var errorField = unknown().describe("Error info - presence indicates failure (status derived from this)");
var isEventField = boolean().describe("Whether this is an event (point-in-time) vs a span (duration)");
var startedAtField = date().describe("When the span started");
var endedAtField = date().describe("When the span ended (null = running, status derived from this)");
var TraceStatus = /* @__PURE__ */ ((TraceStatus2) => {
  TraceStatus2["SUCCESS"] = "success";
  TraceStatus2["ERROR"] = "error";
  TraceStatus2["RUNNING"] = "running";
  return TraceStatus2;
})(TraceStatus || {});
var traceStatusField = nativeEnum(TraceStatus).describe("Current status of the trace");
var hasChildErrorField = preprocess((v) => {
  if (v === "true") return true;
  if (v === "false") return false;
  return v;
}, boolean()).describe("True if any span in the trace encountered an error");
var sharedFields = {
  ...spanContextFields,
  metadata: metadataField.nullish(),
  tags: tagsField.nullish()
};
var spanIds = {
  traceId: traceIdField,
  spanId: spanIdField
};
var spanIdsSchema = object({
  ...spanIds
});
var omitDbTimestamps = createOmitKeys(dbTimestamps);
var omitSpanIds = createOmitKeys(spanIds);
var spanRecordSchema = object({
  // Required identifiers
  ...spanIds,
  name: spanNameField,
  spanType: spanTypeField,
  isEvent: isEventField,
  startedAt: startedAtField,
  // Shared fields
  parentSpanId: parentSpanIdField.nullish(),
  ...sharedFields,
  // Experimentation
  experimentId: string().nullish().describe("Experiment or eval run identifier"),
  // Additional span-specific nullish fields
  attributes: attributesField.nullish(),
  links: linksField.nullish(),
  input: inputField.nullish(),
  output: outputField.nullish(),
  error: errorField.nullish(),
  endedAt: endedAtField.nullish(),
  requestContext: record(string(), unknown()).nullish().describe("Request context data"),
  // Database timestamps
  ...dbTimestamps
}).describe("Span record data");
function computeTraceStatus(span) {
  if (span.error != null) return "error" /* ERROR */;
  if (span.endedAt == null) return "running" /* RUNNING */;
  return "success" /* SUCCESS */;
}
var traceSpanSchema = spanRecordSchema.extend({
  status: traceStatusField
}).describe("Trace span with computed status (root spans only)");
function toTraceSpan(span) {
  return {
    ...span,
    status: computeTraceStatus(span)
  };
}
function toTraceSpans(spans) {
  return spans.map(toTraceSpan);
}
var createSpanRecordSchema = spanRecordSchema.omit(omitDbTimestamps);
object({
  span: createSpanRecordSchema
}).describe("Arguments for creating a single span");
object({
  records: array(createSpanRecordSchema)
}).describe("Arguments for batch creating spans");
object({
  traceId: traceIdField.min(1),
  spanId: spanIdField.min(1)
}).describe("Arguments for getting a single span");
object({
  span: spanRecordSchema
});
object({
  traceId: traceIdField.min(1)
}).describe("Arguments for getting a root span");
object({
  span: spanRecordSchema
});
var getTraceArgsSchema = object({
  traceId: traceIdField.min(1)
}).describe("Arguments for getting a single trace");
var getTraceResponseSchema = object({
  traceId: traceIdField,
  spans: array(spanRecordSchema)
});
var tracesFilterSchema = object({
  // Date range filters
  startedAt: dateRangeSchema.optional().describe("Filter by span start time range"),
  endedAt: dateRangeSchema.optional().describe("Filter by span end time range"),
  // Span type filter
  spanType: spanTypeField.optional(),
  // Shared fields
  ...sharedFields,
  // Filter-specific derived status fields
  status: traceStatusField.optional(),
  hasChildError: hasChildErrorField.optional()
}).describe("Filters for querying traces");
var tracesOrderByFieldSchema = _enum(["startedAt", "endedAt"]).describe("Field to order by: 'startedAt' | 'endedAt'");
var tracesOrderBySchema = object({
  field: tracesOrderByFieldSchema.default("startedAt").describe("Field to order by"),
  direction: sortDirectionSchema.default("DESC").describe("Sort direction")
}).describe("Order by configuration");
var listTracesArgsSchema = object({
  filters: tracesFilterSchema.optional().describe("Optional filters to apply"),
  pagination: paginationArgsSchema.default({ page: 0, perPage: 10 }).describe("Pagination settings"),
  orderBy: tracesOrderBySchema.default({ field: "startedAt", direction: "DESC" }).describe("Ordering configuration (defaults to startedAt desc)")
}).describe("Arguments for listing traces");
var listTracesResponseSchema = object({
  pagination: paginationInfoSchema,
  spans: array(traceSpanSchema)
});
var updateSpanRecordSchema = createSpanRecordSchema.omit(omitSpanIds);
object({
  spanId: spanIdField,
  traceId: traceIdField,
  updates: updateSpanRecordSchema.partial()
}).describe("Arguments for updating a single span");
object({
  records: array(
    object({
      traceId: traceIdField,
      spanId: spanIdField,
      updates: updateSpanRecordSchema.partial()
    })
  )
}).describe("Arguments for batch updating spans");
object({
  traceIds: array(traceIdField)
}).describe("Arguments for batch deleting traces");
object({
  pagination: paginationInfoSchema,
  scores: array(scoreRowDataSchema)
});
var scoreTracesRequestSchema = object({
  scorerName: string().min(1),
  targets: array(
    object({
      traceId: traceIdField,
      spanId: spanIdField.optional()
    })
  ).min(1)
});
var scoreTracesResponseSchema = object({
  status: string(),
  message: string(),
  traceCount: number()
});

// src/storage/types.ts
function unwrapSchema(schema) {
  let current = schema;
  let nullable = false;
  while (true) {
    const typeName = getZodTypeName(current);
    if (!typeName) break;
    if (typeName === "ZodNullable" || typeName === "ZodOptional") {
      nullable = true;
    }
    const inner = getZodInnerType(current, typeName);
    if (!inner) break;
    current = inner;
  }
  return { base: current, nullable };
}
function getZodChecks(schema) {
  if ("_zod" in schema) {
    const zodV4 = schema;
    const checks = zodV4._zod?.def?.checks;
    if (checks && Array.isArray(checks)) {
      return checks.map((check) => {
        if (typeof check === "object" && check !== null && "def" in check && typeof check.def === "object" && check.def !== null) {
          const def = check.def;
          if (def.check === "number_format" && def.format === "safeint") {
            return { kind: "int" };
          }
          if (def.check === "string_format" && typeof def.format === "string") {
            return { kind: def.format };
          }
          return { kind: typeof def.check === "string" ? def.check : "unknown" };
        }
        return { kind: "unknown" };
      });
    }
  }
  if ("_def" in schema) {
    const zodV3 = schema;
    const checks = zodV3._def?.checks;
    if (checks && Array.isArray(checks)) {
      return checks;
    }
  }
  return [];
}
function zodToStorageType(schema) {
  const typeName = getZodTypeName(schema);
  if (typeName === "ZodString") {
    const checks = getZodChecks(schema);
    if (checks.some((c) => c.kind === "uuid")) {
      return "uuid";
    }
    return "text";
  }
  if (typeName === "ZodNativeEnum" || typeName === "ZodEnum") {
    return "text";
  }
  if (typeName === "ZodNumber") {
    const checks = getZodChecks(schema);
    return checks.some((c) => c.kind === "int") ? "integer" : "float";
  }
  if (typeName === "ZodBigInt" || typeName === "ZodBigint") {
    return "bigint";
  }
  if (typeName === "ZodDate") {
    return "timestamp";
  }
  if (typeName === "ZodBoolean") {
    return "boolean";
  }
  return "jsonb";
}
function buildStorageSchema(zObject) {
  const shape = zObject.shape;
  const result = {};
  for (const [key, field] of Object.entries(shape)) {
    const { base, nullable } = unwrapSchema(field);
    result[key] = {
      type: zodToStorageType(base),
      nullable
    };
  }
  return result;
}
buildStorageSchema(spanRecordSchema);

export { getTraceResponseSchema as a, scoreTracesResponseSchema as b, spanIdsSchema as c, tracesOrderBySchema as d, saveScorePayloadSchema as e, listTracesArgsSchema as f, getTraceArgsSchema as g, toTraceSpans as h, extractTrajectoryFromTrace as i, listScoresResponseSchema as j, listTracesResponseSchema as l, scoreTracesRequestSchema as s, tracesFilterSchema as t };
//# sourceMappingURL=evals.mjs.map
