import { aQ as createWorkflow, aR as any, aS as object, aT as string, aU as array, aV as createStep, aW as MastraError, aX as pMap, aY as getEntityTypeForSpan, aZ as saveScorePayloadSchema, a_ as ModelsDevGateway, a$ as NetlifyGateway, b0 as MastraGateway, b1 as GatewayRegistry, b5 as fromEnv, b2 as PROVIDER_REGISTRY, b3 as isOfflineMode, b4 as parseModelString, b6 as ENV_ACCOUNT_ID, b7 as ENV_CREDENTIAL_SCOPE, b8 as ENV_EXPIRATION, b9 as ENV_KEY, ba as ENV_SECRET, bb as ENV_SESSION } from './mastra.mjs';

process.versions = process.versions || {};
process.versions.node = '22.22.1';

// src/evals/scoreTraces/scoreTraces.ts
async function scoreTraces({
  scorerId,
  targets,
  mastra
}) {
  const workflow = mastra.__getInternalWorkflow("__batch-scoring-traces");
  try {
    const run = await workflow.createRun();
    await run.start({ inputData: { targets, scorerId } });
  } catch (error) {
    const mastraError = new MastraError(
      {
        category: "SYSTEM",
        domain: "SCORER",
        id: "MASTRA_SCORER_FAILED_TO_RUN_TRACE_SCORING",
        details: {
          scorerId,
          targets: JSON.stringify(targets)
        }
      },
      error
    );
    mastra.getLogger()?.trackException(mastraError);
  }
}

// src/evals/scoreTraces/utils.ts
function isSpanMessage(value) {
  return typeof value === "object" && value !== null && "role" in value && typeof value.role === "string" && "content" in value;
}
function hasMessagesArray(value) {
  return typeof value === "object" && value !== null && "messages" in value && Array.isArray(value.messages);
}
function hasTextProperty(value) {
  return typeof value === "object" && value !== null && "text" in value;
}
function buildSpanTree(spans) {
  const spanMap = /* @__PURE__ */ new Map();
  const childrenMap = /* @__PURE__ */ new Map();
  const rootSpans = [];
  for (const span of spans) {
    spanMap.set(span.spanId, span);
  }
  for (const span of spans) {
    if (span.parentSpanId == null) {
      rootSpans.push(span);
    } else {
      const siblings = childrenMap.get(span.parentSpanId) || [];
      siblings.push(span);
      childrenMap.set(span.parentSpanId, siblings);
    }
  }
  for (const children of childrenMap.values()) {
    children.sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());
  }
  rootSpans.sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());
  return { spanMap, childrenMap, rootSpans };
}
function getChildrenOfType(spanTree, parentSpanId, spanType) {
  const children = spanTree.childrenMap.get(parentSpanId) || [];
  return children.filter((span) => span.spanType === spanType);
}
function normalizeMessageContent(content) {
  if (typeof content === "string") {
    return content;
  }
  const textParts = content.filter((part) => part.type === "text");
  return textParts.length > 0 ? textParts[textParts.length - 1]?.text || "" : "";
}
function createMastraDBMessage(message, createdAt, id = "") {
  const contentText = normalizeMessageContent(message.content);
  const role = message.role;
  return {
    id,
    role,
    content: {
      format: 2,
      parts: [{ type: "text", text: contentText }],
      content: contentText
    },
    createdAt: new Date(createdAt)
  };
}
function extractInputMessages(agentSpan) {
  const input = agentSpan.input;
  if (typeof input === "string") {
    return [
      createMastraDBMessage(
        {
          role: "user",
          content: input
        },
        agentSpan.startedAt
      )
    ];
  }
  if (Array.isArray(input)) {
    const messages = input.filter(isSpanMessage);
    return messages.map((msg) => createMastraDBMessage(msg, agentSpan.startedAt));
  }
  if (hasMessagesArray(input)) {
    const messages = input.messages.filter(isSpanMessage);
    return messages.map((msg) => createMastraDBMessage(msg, agentSpan.startedAt));
  }
  return [];
}
function extractSystemMessages(llmSpan) {
  const input = llmSpan.input;
  if (!hasMessagesArray(input)) {
    return [];
  }
  return input.messages.filter((msg) => isSpanMessage(msg) && msg.role === "system").map((msg) => ({
    role: "system",
    content: normalizeMessageContent(msg.content)
  }));
}
function extractRememberedMessages(llmSpan, currentInputContent) {
  const input = llmSpan.input;
  if (!hasMessagesArray(input)) {
    return [];
  }
  const filtered = input.messages.filter(isSpanMessage);
  const messages = filtered.filter((msg) => msg.role !== "system").filter((msg) => normalizeMessageContent(msg.content) !== currentInputContent);
  return messages.map((msg) => createMastraDBMessage(msg, llmSpan.startedAt));
}
function reconstructToolInvocations(spanTree, parentSpanId) {
  const toolSpans = getChildrenOfType(spanTree, parentSpanId, "tool_call" /* TOOL_CALL */);
  return toolSpans.map((toolSpan) => ({
    toolCallId: toolSpan.spanId,
    toolName: toolSpan.entityName ?? toolSpan.entityId ?? "unknown",
    toolId: toolSpan.entityId,
    args: toolSpan.input || {},
    result: toolSpan.output || {},
    state: "result"
  }));
}
function validateTrace(trace) {
  if (!trace) {
    throw new Error("Trace is null or undefined");
  }
  if (!trace.spans || !Array.isArray(trace.spans)) {
    throw new Error("Trace must have a spans array");
  }
  if (trace.spans.length === 0) {
    throw new Error("Trace has no spans");
  }
  const spanIds = new Set(trace.spans.map((span) => span.spanId));
  for (const span of trace.spans) {
    if (span.parentSpanId && !spanIds.has(span.parentSpanId)) {
      throw new Error(`Span ${span.spanId} references non-existent parent ${span.parentSpanId}`);
    }
  }
}
function findPrimaryLLMSpan(spanTree, rootAgentSpan) {
  const directLLMSpans = getChildrenOfType(spanTree, rootAgentSpan.spanId, "model_generation" /* MODEL_GENERATION */);
  if (directLLMSpans.length > 0) {
    return directLLMSpans[0];
  }
  throw new Error("No model generation span found in trace");
}
function prepareTraceForTransformation(trace) {
  validateTrace(trace);
  const spanTree = buildSpanTree(trace.spans);
  const rootAgentSpan = spanTree.rootSpans.find((span) => span.spanType === "agent_run");
  if (!rootAgentSpan) {
    throw new Error("No root agent_run span found in trace");
  }
  return { spanTree, rootAgentSpan };
}
function transformTraceToScorerInputAndOutput(trace) {
  const { spanTree, rootAgentSpan } = prepareTraceForTransformation(trace);
  if (!rootAgentSpan.output) {
    throw new Error("Root agent span has no output");
  }
  const primaryLLMSpan = findPrimaryLLMSpan(spanTree, rootAgentSpan);
  const inputMessages = extractInputMessages(rootAgentSpan);
  const systemMessages = extractSystemMessages(primaryLLMSpan);
  const currentInputContent = inputMessages[0]?.content.content || "";
  const rememberedMessages = extractRememberedMessages(primaryLLMSpan, currentInputContent);
  const input = {
    inputMessages,
    rememberedMessages,
    systemMessages,
    taggedSystemMessages: {}
    // Todo: Support tagged system messages
  };
  const toolInvocations = reconstructToolInvocations(spanTree, rootAgentSpan.spanId);
  const responseText = hasTextProperty(rootAgentSpan.output) ? rootAgentSpan.output.text ?? "" : "";
  const parts = [];
  for (const toolInvocation of toolInvocations) {
    parts.push({
      type: "tool-invocation",
      toolInvocation
    });
  }
  if (responseText.trim()) {
    parts.push({
      type: "text",
      text: responseText
    });
  }
  const responseMessage = {
    id: "",
    role: "assistant",
    content: {
      format: 2,
      parts,
      // Type assertion needed due to providerMetadata optional field
      content: responseText,
      toolInvocations
      // Always include, even if empty array
    },
    createdAt: new Date(rootAgentSpan.endedAt || rootAgentSpan.startedAt)
  };
  const output = [responseMessage];
  return {
    input,
    output
  };
}

// src/evals/scoreTraces/scoreTracesWorkflow.ts
var getTraceStep = createStep({
  id: "__process-trace-scoring",
  inputSchema: object({
    targets: array(
      object({
        traceId: string(),
        spanId: string().optional()
      })
    ),
    scorerId: string()
  }),
  outputSchema: any(),
  execute: async ({ inputData, mastra }) => {
    const logger = mastra.getLogger();
    if (!logger) {
      console.warn(
        "[scoreTracesWorkflow] Logger not initialized: no debug or error logs will be recorded for scoring traces."
      );
    }
    const storage = mastra.getStorage();
    if (!storage) {
      const mastraError = new MastraError({
        id: "MASTRA_STORAGE_NOT_FOUND_FOR_TRACE_SCORING",
        domain: "STORAGE" /* STORAGE */,
        category: "SYSTEM" /* SYSTEM */,
        text: "Storage not found for trace scoring",
        details: {
          scorerId: inputData.scorerId
        }
      });
      logger?.trackException(mastraError);
      return;
    }
    let scorer;
    try {
      scorer = mastra.getScorerById(inputData.scorerId);
    } catch (error) {
      const mastraError = new MastraError(
        {
          id: "MASTRA_SCORER_NOT_FOUND_FOR_TRACE_SCORING",
          domain: "SCORER" /* SCORER */,
          category: "SYSTEM" /* SYSTEM */,
          text: `Scorer not found for trace scoring`,
          details: {
            scorerId: inputData.scorerId
          }
        },
        error
      );
      logger?.trackException(mastraError);
      return;
    }
    await pMap(
      inputData.targets,
      async (target) => {
        try {
          await runScorerOnTarget({ storage, scorer, target });
        } catch (error) {
          const mastraError = new MastraError(
            {
              id: "MASTRA_SCORER_FAILED_TO_RUN_SCORER_ON_TRACE",
              domain: "SCORER" /* SCORER */,
              category: "SYSTEM" /* SYSTEM */,
              details: {
                scorerId: scorer.id,
                spanId: target.spanId || "",
                traceId: target.traceId
              }
            },
            error
          );
          logger?.trackException(mastraError);
        }
      },
      { concurrency: 3 }
    );
  }
});
async function runScorerOnTarget({
  storage,
  scorer,
  target
}) {
  const observabilityStore = await storage.getStore("observability");
  if (!observabilityStore) {
    throw new MastraError({
      id: "MASTRA_OBSERVABILITY_STORAGE_NOT_AVAILABLE",
      domain: "STORAGE" /* STORAGE */,
      category: "SYSTEM" /* SYSTEM */,
      text: "Observability storage domain is not available"
    });
  }
  const trace = await observabilityStore.getTrace({ traceId: target.traceId });
  if (!trace) {
    throw new Error(`Trace not found for scoring, traceId: ${target.traceId}`);
  }
  let span;
  if (target.spanId) {
    span = trace.spans.find((span2) => span2.spanId === target.spanId);
  } else {
    span = trace.spans.find((span2) => span2.parentSpanId === null);
  }
  if (!span) {
    throw new Error(
      `Span not found for scoring, traceId: ${target.traceId}, spanId: ${target.spanId ?? "Not provided"}`
    );
  }
  const scorerRun = buildScorerRun({
    scorerType: scorer.type === "agent" ? "agent" : void 0,
    trace,
    targetSpan: span
  });
  const result = await scorer.run({
    ...scorerRun,
    scoreSource: "trace",
    targetScope: "span",
    targetEntityType: getEntityTypeForSpan(span),
    targetTraceId: target.traceId,
    targetSpanId: span.spanId
  });
  const scorerResult = {
    ...result,
    scorer: {
      id: scorer.id,
      name: scorer.name || scorer.id,
      description: scorer.description,
      hasJudge: !!scorer.judge
    },
    traceId: target.traceId,
    spanId: span.spanId,
    entityId: span.entityId || span.entityName || "unknown",
    entityType: span.spanType,
    entity: { traceId: span.traceId, spanId: span.spanId },
    source: "TEST",
    scorerId: scorer.id
  };
  const savedScoreRecord = await validateAndSaveScore({ storage, scorerResult });
  await attachScoreToSpan({ storage, span, scoreRecord: savedScoreRecord });
}
async function validateAndSaveScore({ storage, scorerResult }) {
  const scoresStore = await storage.getStore("scores");
  if (!scoresStore) {
    throw new MastraError({
      id: "MASTRA_SCORES_STORAGE_NOT_AVAILABLE",
      domain: "STORAGE" /* STORAGE */,
      category: "SYSTEM" /* SYSTEM */,
      text: "Scores storage domain is not available"
    });
  }
  const payloadToSave = saveScorePayloadSchema.parse(scorerResult);
  const result = await scoresStore.saveScore(payloadToSave);
  return result.score;
}
function buildScorerRun({
  scorerType,
  trace,
  targetSpan
}) {
  if (scorerType === "agent") {
    const { input, output } = transformTraceToScorerInputAndOutput(trace);
    return { input, output };
  }
  return { input: targetSpan.input, output: targetSpan.output };
}
async function attachScoreToSpan({
  storage,
  span,
  scoreRecord
}) {
  const observabilityStore = await storage.getStore("observability");
  if (!observabilityStore) {
    throw new MastraError({
      id: "MASTRA_OBSERVABILITY_STORAGE_NOT_AVAILABLE",
      domain: "STORAGE" /* STORAGE */,
      category: "SYSTEM" /* SYSTEM */,
      text: "Observability storage domain is not available"
    });
  }
  try {
    const existingLinks = span.links || [];
    const link = {
      type: "score",
      scoreId: scoreRecord.id,
      scorerId: scoreRecord.scorerId ?? scoreRecord.scorer?.id,
      score: scoreRecord.score,
      createdAt: scoreRecord.createdAt
    };
    await observabilityStore.updateSpan({
      spanId: span.spanId,
      traceId: span.traceId,
      updates: { links: [...existingLinks, link] }
    });
  } catch {
  }
}
var scoreTracesWorkflow = createWorkflow({
  id: "__batch-scoring-traces",
  inputSchema: object({
    targets: array(
      object({
        traceId: string(),
        spanId: string().optional()
      })
    ),
    scorerId: string()
  }),
  outputSchema: any(),
  steps: [getTraceStep],
  options: {
    validateInputs: false
  }
});
scoreTracesWorkflow.then(getTraceStep).commit();

var _virtual__entry = {
      fetch: async (request, env, context) => {
        const { mastra } = await import('./mastra.mjs').then(function (n) { return n.c7; });
        const { tools } = await import('./tools.mjs');
        const {createHonoServer, getToolExports} = await import('./dist-KEJZY3UJ.mjs').then(function (n) { return n.y; });
        const _mastra = mastra();

        if (_mastra.getStorage()) {
          _mastra.__registerInternalWorkflow(scoreTracesWorkflow);
        }

        const app = await createHonoServer(_mastra, { tools: getToolExports(tools) });
        return app.fetch(request, env, context);
      }
    };

var modelsDevM5DKUVAY = /*#__PURE__*/Object.freeze({
      __proto__: null,
      ModelsDevGateway: ModelsDevGateway
});

var netlifyZPL5U4MX = /*#__PURE__*/Object.freeze({
      __proto__: null,
      NetlifyGateway: NetlifyGateway
});

var mastraSUPMMCWW = /*#__PURE__*/Object.freeze({
      __proto__: null,
      MastraGateway: MastraGateway
});

var providerRegistry7BH6TXBL = /*#__PURE__*/Object.freeze({
      __proto__: null,
      GatewayRegistry: GatewayRegistry,
      PROVIDER_REGISTRY: PROVIDER_REGISTRY,
      isOfflineMode: isOfflineMode,
      parseModelString: parseModelString
});

var index = /*#__PURE__*/Object.freeze({
      __proto__: null,
      ENV_ACCOUNT_ID: ENV_ACCOUNT_ID,
      ENV_CREDENTIAL_SCOPE: ENV_CREDENTIAL_SCOPE,
      ENV_EXPIRATION: ENV_EXPIRATION,
      ENV_KEY: ENV_KEY,
      ENV_SECRET: ENV_SECRET,
      ENV_SESSION: ENV_SESSION,
      fromEnv: fromEnv
});

export { _virtual__entry as _, mastraSUPMMCWW as a, index as i, modelsDevM5DKUVAY as m, netlifyZPL5U4MX as n, providerRegistry7BH6TXBL as p, scoreTraces as s };
