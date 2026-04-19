import { W as WorkflowEventProcessor } from './chunk-YENUKPER.mjs';
import { A as Agent, i as isSupportedLanguageModel, F as EventEmitterPubSub, G as augmentWithInit, H as DualLogger, I as registerHook, J as noopLogger } from './chunk-GYS4EMOL.mjs';
import { g as generateId } from './chunk-EQOFWEGB.mjs';
import { r as resolveModelConfig, I as InMemoryServerCache, h as defaultGateways } from './chunk-XB6GFZYC.mjs';
import { T as ToolLoopAgent } from './chunk-SFTERBTR.mjs';
import { s as setExecuteWithContext, a as setCurrentSpanResolver, b as setExecuteWithContextSync, N as NoOpObservability, n as noOpLoggerContext, d as noOpMetricsContext } from './observability.mjs';
import { AsyncLocalStorage } from 'async_hooks';
import { e as saveScorePayloadSchema } from './evals.mjs';
import { E as EntityType } from './chunk-OSVQQ7QZ.mjs';
import { M as MastraError } from './error.mjs';
import pMap from './index2.mjs';
import { R as RequestContext } from './request-context.mjs';
import { i as isZodType } from './chunk-L43DNVPR.mjs';
import { z as zodToJsonSchema } from './zod-to-json.mjs';
import { L as LogLevel, C as ConsoleLogger } from './chunk-WENZPAHS.mjs';
import { randomUUID } from 'crypto';

// src/tool-loop-agent/utils.ts
function isToolLoopAgentLike(obj) {
  if (!obj) return false;
  if (obj instanceof ToolLoopAgent) return true;
  return "version" in obj && typeof obj.version === "string" && (obj.version === "agent-v1" || obj.version.startsWith("agent-v"));
}
function getSettings(agent) {
  const settings = agent.settings;
  if (!settings) {
    throw new Error("Could not extract settings from ToolLoopAgent. The agent may be from an incompatible version.");
  }
  return settings;
}

// src/tool-loop-agent/tool-loop-processor.ts
var ToolLoopAgentProcessor = class {
  id = "tool-loop-agent-processor";
  name = "ToolLoop to Mastra Agent Processor";
  agent;
  settings;
  prepareCallResult;
  constructor(agent) {
    this.agent = agent;
    this.settings = getSettings(agent);
  }
  getAgentConfig() {
    const tools = "tools" in this.agent ? this.agent.tools : void 0;
    const defaultOptions = {};
    if (this.settings.toolChoice) {
      defaultOptions.toolChoice = this.settings.toolChoice;
    }
    if (this.settings.providerOptions) {
      defaultOptions.providerOptions = this.settings.providerOptions;
    }
    if (this.settings.temperature !== void 0) {
      defaultOptions.modelSettings = {
        ...defaultOptions.modelSettings ?? {},
        temperature: this.settings.temperature
      };
    }
    if (this.settings.topP !== void 0) {
      defaultOptions.modelSettings = { ...defaultOptions.modelSettings ?? {}, topP: this.settings.topP };
    }
    if (this.settings.topK !== void 0) {
      defaultOptions.modelSettings = { ...defaultOptions.modelSettings ?? {}, topK: this.settings.topK };
    }
    if (this.settings.seed !== void 0) {
      defaultOptions.modelSettings = { ...defaultOptions.modelSettings ?? {}, seed: this.settings.seed };
    }
    if (this.settings.maxOutputTokens !== void 0) {
      defaultOptions.modelSettings = {
        ...defaultOptions.modelSettings ?? {},
        maxOutputTokens: this.settings.maxOutputTokens
      };
    }
    if (this.settings.presencePenalty !== void 0) {
      defaultOptions.modelSettings = {
        ...defaultOptions.modelSettings ?? {},
        presencePenalty: this.settings.presencePenalty
      };
    }
    if (this.settings.frequencyPenalty !== void 0) {
      defaultOptions.modelSettings = {
        ...defaultOptions.modelSettings ?? {},
        frequencyPenalty: this.settings.frequencyPenalty
      };
    }
    if (this.settings.stopSequences !== void 0) {
      defaultOptions.modelSettings = {
        ...defaultOptions.modelSettings ?? {},
        stopSequences: this.settings.stopSequences
      };
    }
    if (this.settings.stopWhen) {
      defaultOptions.stopWhen = this.settings.stopWhen;
    }
    if (this.settings.onStepFinish) {
      defaultOptions.onStepFinish = this.settings.onStepFinish;
    }
    if (this.settings.onFinish) {
      defaultOptions.onFinish = this.settings.onFinish;
    }
    return {
      id: this.settings.id,
      name: this.settings.id,
      instructions: this.settings.instructions ?? "",
      model: this.settings.model,
      tools,
      maxRetries: this.settings.maxRetries,
      defaultOptions: Object.keys(defaultOptions).length > 0 ? defaultOptions : void 0
    };
  }
  /**
   * Maps prepareCall or prepareStep result to ProcessInputStepResult.
   * Both hooks return similar structures that can override model, tools, activeTools, etc.
   */
  mapToProcessInputStepResult(result) {
    if (!result) {
      return {};
    }
    const stepResult = {};
    if (result.model) {
      stepResult.model = result.model;
    }
    if ("tools" in result && result.tools) {
      stepResult.tools = result.tools;
    }
    if ("toolChoice" in result && result.toolChoice !== void 0) {
      stepResult.toolChoice = result.toolChoice;
    }
    if (result.activeTools) {
      stepResult.activeTools = result.activeTools;
    }
    if ("providerOptions" in result && result.providerOptions) {
      stepResult.providerOptions = result.providerOptions;
    }
    const modelSettings = {};
    if ("temperature" in result && result.temperature !== void 0) {
      modelSettings.temperature = result.temperature;
    }
    if ("topP" in result && result.topP !== void 0) {
      modelSettings.topP = result.topP;
    }
    if ("topK" in result && result.topK !== void 0) {
      modelSettings.topK = result.topK;
    }
    if ("maxOutputTokens" in result && result.maxOutputTokens !== void 0) {
      modelSettings.maxOutputTokens = result.maxOutputTokens;
    }
    if ("presencePenalty" in result && result.presencePenalty !== void 0) {
      modelSettings.presencePenalty = result.presencePenalty;
    }
    if ("frequencyPenalty" in result && result.frequencyPenalty !== void 0) {
      modelSettings.frequencyPenalty = result.frequencyPenalty;
    }
    if ("stopSequences" in result && result.stopSequences !== void 0) {
      modelSettings.stopSequences = result.stopSequences;
    }
    if ("seed" in result && result.seed !== void 0) {
      modelSettings.seed = result.seed;
    }
    if (Object.keys(modelSettings).length > 0) {
      stepResult.modelSettings = modelSettings;
    }
    const systemContent = "instructions" in result ? result.instructions : "system" in result ? result.system : void 0;
    if (systemContent) {
      if (typeof systemContent === "string") {
        stepResult.systemMessages = [{ role: "system", content: systemContent }];
      } else if (Array.isArray(systemContent)) {
        stepResult.systemMessages = systemContent.map(
          (msg) => typeof msg === "string" ? { role: "system", content: msg } : msg
        );
      } else if (typeof systemContent === "object" && "role" in systemContent && "content" in systemContent) {
        stepResult.systemMessages = [systemContent];
      }
    }
    if ("messages" in result && result.messages && Array.isArray(result.messages)) {
      stepResult.messages = result.messages;
    }
    return stepResult;
  }
  async handlePrepareCall(args) {
    if (this.settings.prepareCall) {
      const { model, messages, activeTools, providerOptions, modelSettings, tools } = args;
      const prepareCallInput = {
        // TODO: prepareCall expects messages in AI SDK format, we have them in Mastra format
        messages,
        model,
        tools,
        instructions: this.settings.instructions,
        stopWhen: this.settings.stopWhen,
        activeTools,
        providerOptions,
        // Model settings
        temperature: modelSettings?.temperature,
        topP: modelSettings?.topP,
        topK: modelSettings?.topK,
        maxOutputTokens: modelSettings?.maxOutputTokens,
        presencePenalty: modelSettings?.presencePenalty,
        frequencyPenalty: modelSettings?.frequencyPenalty,
        stopSequences: modelSettings?.stopSequences,
        seed: modelSettings?.seed
        // Experimental options
        // experimental_telemetry: this.settings.experimental_telemetry,
        // experimental_context: this.settings.experimental_context,
        // experimental_download: this.settings.experimental_download,
      };
      const prepareCallResult = await this.settings.prepareCall(prepareCallInput);
      this.prepareCallResult = prepareCallResult;
    }
  }
  async handlePrepareStep(args, currentResult) {
    if (this.settings.prepareStep) {
      const { messages, steps, stepNumber } = args;
      let model = args.model;
      if (currentResult.model) {
        const resolvedModel = await resolveModelConfig(currentResult.model);
        if (!isSupportedLanguageModel(resolvedModel)) {
          throw new Error("prepareStep returned an unsupported model version");
        }
        model = resolvedModel;
      }
      const prepareStepInputArgs = {
        model,
        // Messages are in Mastra format (MastraDBMessage[])
        messages,
        // Steps may have minor type differences in usage properties (inputTokenDetails/outputTokenDetails)
        steps,
        stepNumber,
        experimental_context: void 0
      };
      const prepareStepResult = await this.settings.prepareStep(prepareStepInputArgs);
      return prepareStepResult;
    }
  }
  async processInputStep(args) {
    const { stepNumber } = args;
    if (stepNumber === 0 && this.settings.prepareCall) {
      await this.handlePrepareCall(args);
    }
    let result = {};
    if (this.prepareCallResult) {
      const mappedResult = this.mapToProcessInputStepResult(this.prepareCallResult);
      if (Object.keys(mappedResult).length > 0) {
        result = { ...result, ...mappedResult };
      }
    }
    if (this.settings.prepareStep) {
      const prepareStepResult = await this.handlePrepareStep(args, result);
      if (prepareStepResult) {
        const mappedResult = this.mapToProcessInputStepResult(prepareStepResult);
        result = { ...result, ...mappedResult };
      }
    }
    return result;
  }
};

// src/tool-loop-agent/index.ts
function toolLoopAgentToMastraAgent(agent, options) {
  const processor = new ToolLoopAgentProcessor(agent);
  const agentConfig = processor.getAgentConfig();
  const id = agentConfig.id || options?.fallbackName || `tool-loop-agent-${generateId()}`;
  return new Agent({
    ...agentConfig,
    id,
    name: agentConfig.name || id,
    inputProcessors: [processor]
  });
}

var spanContextStorage = new AsyncLocalStorage();
function getCurrentSpan() {
  return spanContextStorage.getStore();
}
var initialized = false;
function initContextStorage() {
  if (initialized) return;
  initialized = true;
  setCurrentSpanResolver(getCurrentSpan);
  setExecuteWithContext(executeWithContext);
  setExecuteWithContextSync(executeWithContextSync);
}
async function executeWithContext(params) {
  const { span, fn } = params;
  const wrappedFn = span ? () => spanContextStorage.run(span, fn) : fn;
  if (span?.executeInContext) {
    return span.executeInContext(wrappedFn);
  }
  return wrappedFn();
}
function executeWithContextSync(params) {
  const { span, fn } = params;
  const wrappedFn = span ? () => spanContextStorage.run(span, fn) : fn;
  if (span?.executeInContextSync) {
    return span.executeInContextSync(wrappedFn);
  }
  return wrappedFn();
}

function toScorerTargetEntityType$1(entityType) {
  switch (entityType) {
    case "AGENT":
      return EntityType.AGENT;
    case "WORKFLOW":
      return EntityType.WORKFLOW_RUN;
    default:
      return void 0;
  }
}
function createOnScorerHook(mastra) {
  return async (hookData) => {
    const storage = mastra.getStorage();
    if (!storage) {
      mastra.getLogger()?.warn("Storage not found, skipping score validation and saving");
      return;
    }
    const entityId = hookData.entity.id;
    const entityType = hookData.entityType;
    const scorer = hookData.scorer;
    const scorerId = scorer.id;
    if (!scorerId) {
      mastra.getLogger()?.warn("Scorer ID not found, skipping score validation and saving");
      return;
    }
    try {
      const scorerToUse = await findScorer(mastra, entityId, entityType, scorerId);
      if (!scorerToUse) {
        throw new MastraError({
          id: "MASTRA_SCORER_NOT_FOUND",
          domain: "MASTRA" /* MASTRA */,
          category: "USER" /* USER */,
          text: `Scorer with ID ${scorerId} not found`
        });
      }
      let input = hookData.input;
      let output = hookData.output;
      const { structuredOutput, ...rest } = hookData;
      const currentSpan = hookData.tracingContext?.currentSpan;
      const traceId = currentSpan?.isValid ? currentSpan.traceId : void 0;
      const spanId = currentSpan?.isValid ? currentSpan.id : void 0;
      const targetCorrelationContext = currentSpan?.isValid ? currentSpan.getCorrelationContext?.() : void 0;
      const targetMetadata = currentSpan?.isValid && currentSpan.metadata ? { ...currentSpan.metadata } : void 0;
      const runResult = await scorerToUse.scorer.run({
        ...rest,
        input,
        output,
        scoreSource: "live",
        targetScope: "span",
        targetEntityType: toScorerTargetEntityType$1(entityType),
        targetTraceId: traceId,
        targetSpanId: spanId,
        targetCorrelationContext,
        targetMetadata
      });
      const payload = {
        ...rest,
        ...runResult,
        entityId,
        scorerId,
        spanId,
        traceId,
        scorer: {
          ...rest.scorer,
          hasJudge: !!scorerToUse.scorer.judge
        },
        metadata: {
          structuredOutput: !!structuredOutput
        }
      };
      await validateAndSaveScore(storage, payload);
      if (currentSpan && spanId && traceId) {
        await pMap(
          currentSpan.observabilityInstance.getExporters(),
          async (exporter) => {
            if (exporter.addScoreToTrace) {
              try {
                await exporter.addScoreToTrace({
                  traceId,
                  spanId,
                  score: runResult.score,
                  reason: runResult.reason,
                  scorerName: scorerToUse.scorer.id,
                  metadata: {
                    ...currentSpan.metadata ?? {}
                  }
                });
              } catch (error) {
                mastra.getLogger()?.error(`Failed to add score to trace via exporter: ${error}`);
              }
            }
          },
          { concurrency: 3 }
        );
      }
    } catch (error) {
      const mastraError = new MastraError(
        {
          id: "MASTRA_SCORER_FAILED_TO_RUN_HOOK",
          domain: "SCORER" /* SCORER */,
          category: "USER" /* USER */,
          details: {
            scorerId,
            entityId,
            entityType
          }
        },
        error
      );
      mastra.getLogger()?.trackException(mastraError);
    }
  };
}
async function validateAndSaveScore(storage, payload) {
  const scoresStore = await storage.getStore("scores");
  if (!scoresStore) {
    throw new MastraError({
      id: "MASTRA_SCORES_STORAGE_NOT_AVAILABLE",
      domain: "STORAGE" /* STORAGE */,
      category: "SYSTEM" /* SYSTEM */,
      text: "Scores storage domain is not available"
    });
  }
  const payloadToSave = saveScorePayloadSchema.parse(payload);
  await scoresStore.saveScore(payloadToSave);
}
async function findScorer(mastra, entityId, entityType, scorerId) {
  let scorerToUse;
  if (entityType === "AGENT") {
    try {
      const agent = mastra.getAgentById(entityId);
      const scorers = await agent.listScorers();
      for (const [_, scorer] of Object.entries(scorers)) {
        if (scorer.scorer.id === scorerId) {
          scorerToUse = scorer;
          break;
        }
      }
    } catch {
      try {
        const storedAgent = await mastra.getEditor()?.agent.getById(entityId) ?? null;
        if (storedAgent) {
          const scorers = await storedAgent.listScorers();
          for (const [_, scorer] of Object.entries(scorers)) {
            if (scorer.scorer.id === scorerId) {
              scorerToUse = scorer;
              break;
            }
          }
        }
      } catch {
      }
    }
  } else if (entityType === "WORKFLOW") {
    const scorers = await mastra.getWorkflowById(entityId).listScorers();
    for (const [_, scorer] of Object.entries(scorers)) {
      if (scorer.scorer.id === scorerId) {
        scorerToUse = scorer;
        break;
      }
    }
  }
  if (!scorerToUse) {
    const mastraRegisteredScorer = mastra.getScorerById(scorerId);
    scorerToUse = mastraRegisteredScorer ? { scorer: mastraRegisteredScorer } : void 0;
  }
  return scorerToUse;
}

// src/datasets/experiment/executor.ts
async function executeScorer(scorer, item) {
  try {
    const result = await scorer.run(item.input);
    const score = typeof result.score === "number" && !isNaN(result.score) ? result.score : null;
    if (score === null && result.score !== void 0) {
      console.warn(`Scorer ${scorer.id} returned invalid score: ${result.score}`);
    }
    return {
      output: {
        score,
        reason: typeof result.reason === "string" ? result.reason : null
      },
      error: null,
      traceId: null
      // Scorers don't produce traces
    };
  } catch (error) {
    return {
      output: null,
      error: {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : void 0
      },
      traceId: null
    };
  }
}
async function executeTarget(target, targetType, item, options) {
  try {
    const signal = options?.signal;
    if (signal?.aborted) {
      throw signal.reason ?? new DOMException("The operation was aborted.", "AbortError");
    }
    let executionPromise;
    switch (targetType) {
      case "agent":
        executionPromise = executeAgent(target, item, signal, options?.requestContext, options?.experimentId);
        break;
      case "workflow":
        executionPromise = executeWorkflow(target, item);
        break;
      case "scorer":
        executionPromise = executeScorer(target, item);
        break;
      case "processor":
        throw new Error(`Target type '${targetType}' not yet supported.`);
      default:
        throw new Error(`Unknown target type: ${targetType}`);
    }
    if (signal) {
      return await raceWithSignal(executionPromise, signal);
    }
    return await executionPromise;
  } catch (error) {
    return {
      output: null,
      error: {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : void 0
      },
      traceId: null
    };
  }
}
function raceWithSignal(promise, signal) {
  if (signal.aborted) {
    return Promise.reject(signal.reason ?? new DOMException("The operation was aborted.", "AbortError"));
  }
  return new Promise((resolve, reject) => {
    const onAbort = () => {
      reject(signal.reason ?? new DOMException("The operation was aborted.", "AbortError"));
    };
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener("abort", onAbort);
        resolve(value);
      },
      (err) => {
        signal.removeEventListener("abort", onAbort);
        reject(err);
      }
    );
  });
}
async function executeAgent(agent, item, signal, requestContext, experimentId) {
  const model = await agent.getModel();
  const input = item.input;
  const reqCtx = requestContext ? new RequestContext(Object.entries(requestContext)) : void 0;
  const tracingOptions = experimentId ? { metadata: { experimentId } } : void 0;
  const rawResult = isSupportedLanguageModel(model) ? await agent.generate(input, {
    scorers: {},
    returnScorerData: true,
    abortSignal: signal,
    ...reqCtx ? { requestContext: reqCtx } : {},
    ...tracingOptions ? { tracingOptions } : {}
  }) : await agent.generateLegacy(input, {
    scorers: {},
    returnScorerData: true,
    ...reqCtx ? { requestContext: reqCtx } : {},
    ...tracingOptions ? { tracingOptions } : {}
  });
  const result = rawResult;
  const traceId = result.traceId ?? null;
  const scoringData = result.scoringData;
  const trimmedOutput = {
    text: result.text,
    object: result.object,
    toolCalls: result.toolCalls,
    toolResults: result.toolResults,
    sources: result.sources,
    files: result.files,
    usage: result.usage,
    reasoningText: result.reasoningText,
    traceId,
    error: result.error ?? null
  };
  return {
    output: trimmedOutput,
    error: null,
    traceId,
    scorerInput: scoringData?.input,
    scorerOutput: scoringData?.output
  };
}
async function executeWorkflow(workflow, item) {
  const run = await workflow.createRun({ disableScorers: true });
  const result = await run.start({
    inputData: item.input
  });
  const traceId = result.traceId ?? null;
  if (result.status === "success") {
    return { output: result.result, error: null, traceId };
  }
  if (result.status === "failed") {
    return {
      output: null,
      error: { message: result.error?.message ?? "Workflow failed", stack: result.error?.stack },
      traceId
    };
  }
  if (result.status === "tripwire") {
    return {
      output: null,
      error: { message: `Workflow tripwire: ${result.tripwire?.reason ?? "Unknown reason"}` },
      traceId
    };
  }
  if (result.status === "suspended") {
    return {
      output: null,
      error: { message: "Workflow suspended - not yet supported in dataset experiments" },
      traceId
    };
  }
  if (result.status === "paused") {
    return { output: null, error: { message: "Workflow paused - not yet supported in dataset experiments" }, traceId };
  }
  const _exhaustiveCheck = result;
  return {
    output: null,
    error: { message: `Workflow ended with unexpected status: ${_exhaustiveCheck.status}` },
    traceId
  };
}

// src/datasets/experiment/scorer.ts
function toScorerTargetEntityType(targetType) {
  switch (targetType) {
    case "agent":
      return EntityType.AGENT;
    case "workflow":
      return EntityType.WORKFLOW_RUN;
    case "scorer":
      return EntityType.SCORER;
    default:
      return void 0;
  }
}
function resolveScorers(mastra, scorers) {
  if (!scorers || scorers.length === 0) return [];
  return scorers.map((scorer) => {
    if (typeof scorer === "string") {
      const resolved = mastra.getScorerById(scorer);
      if (!resolved) {
        console.warn(`Scorer not found: ${scorer}`);
        return null;
      }
      return resolved;
    }
    return scorer;
  }).filter((s) => s !== null);
}
async function runScorersForItem(scorers, item, output, storage, runId, targetType, targetId, itemId, scorerInput, scorerOutput, traceId) {
  if (scorers.length === 0) return [];
  const targetCorrelationContext = {
    ...traceId ? { traceId } : {},
    entityType: toScorerTargetEntityType(targetType),
    entityId: targetId,
    entityName: targetId,
    experimentId: runId
  };
  const settled = await Promise.allSettled(
    scorers.map(async (scorer) => {
      const { result, promptMetadata } = await runScorerSafe(
        scorer,
        item,
        output,
        scorerInput,
        scorerOutput,
        targetType,
        traceId,
        targetCorrelationContext
      );
      if (storage && result.score !== null) {
        try {
          await validateAndSaveScore(storage, {
            scorerId: scorer.id,
            score: result.score,
            reason: result.reason ?? void 0,
            input: item.input,
            output,
            additionalContext: item.metadata,
            entityType: targetType.toUpperCase(),
            entityId: itemId,
            source: "TEST",
            runId,
            traceId,
            scorer: {
              id: scorer.id,
              name: scorer.name,
              description: scorer.description ?? "",
              hasJudge: !!scorer.judge
            },
            entity: {
              id: targetId,
              name: targetId
            },
            ...promptMetadata
          });
        } catch (saveError) {
          console.warn(`Failed to save score for scorer ${scorer.id}:`, saveError);
        }
      }
      return result;
    })
  );
  return settled.map(
    (s, i) => s.status === "fulfilled" ? s.value : { scorerId: scorers[i].id, scorerName: scorers[i].name, score: null, reason: null, error: String(s.reason) }
  );
}
async function runScorerSafe(scorer, item, output, scorerInput, scorerOutput, targetType, targetTraceId, targetCorrelationContext) {
  try {
    const scoreResult = await scorer.run({
      input: scorerInput ?? item.input,
      output: scorerOutput ?? output,
      groundTruth: item.groundTruth,
      scoreSource: "experiment",
      targetScope: "span",
      targetEntityType: toScorerTargetEntityType(targetType),
      targetTraceId,
      ...targetCorrelationContext ? { targetCorrelationContext } : {}
    });
    if (typeof scoreResult !== "object" || scoreResult === null) {
      return {
        result: {
          scorerId: scorer.id,
          scorerName: scorer.name,
          score: null,
          reason: null,
          error: `Scorer ${scorer.name} (${scorer.id}) returned invalid result: expected object, got ${scoreResult === null ? "null" : typeof scoreResult} (${String(scoreResult)})`
        },
        promptMetadata: {}
      };
    }
    const fields = scoreResult;
    const score = typeof fields.score === "number" ? fields.score : null;
    const reason = typeof fields.reason === "string" ? fields.reason : null;
    const str = (key) => typeof fields[key] === "string" ? fields[key] : void 0;
    const obj = (key) => {
      const val = fields[key];
      return typeof val === "object" && val !== null ? val : void 0;
    };
    return {
      result: {
        scorerId: scorer.id,
        scorerName: scorer.name,
        score,
        reason,
        error: null
      },
      promptMetadata: {
        generateScorePrompt: str("generateScorePrompt"),
        generateReasonPrompt: str("generateReasonPrompt"),
        preprocessStepResult: obj("preprocessStepResult"),
        preprocessPrompt: str("preprocessPrompt"),
        analyzeStepResult: obj("analyzeStepResult"),
        analyzePrompt: str("analyzePrompt")
      }
    };
  } catch (error) {
    return {
      result: {
        scorerId: scorer.id,
        scorerName: scorer.name,
        score: null,
        reason: null,
        error: error instanceof Error ? error.message : String(error)
      },
      promptMetadata: {}
    };
  }
}

// src/datasets/experiment/analytics/aggregate.ts
function computeMean(values) {
  if (values.length === 0) {
    return 0;
  }
  const sum = values.reduce((acc, val) => acc + val, 0);
  return sum / values.length;
}
function computeScorerStats(scores, passThreshold = 0.5) {
  const totalItems = scores.length;
  if (totalItems === 0) {
    return {
      errorRate: 0,
      errorCount: 0,
      passRate: 0,
      passCount: 0,
      avgScore: 0,
      scoreCount: 0,
      totalItems: 0
    };
  }
  const validScores = [];
  let errorCount = 0;
  for (const score of scores) {
    if (score.score === null || score.score === void 0) {
      errorCount++;
    } else {
      validScores.push(score.score);
    }
  }
  const scoreCount = validScores.length;
  const errorRate = errorCount / totalItems;
  const passCount = validScores.filter((s) => s >= passThreshold).length;
  const passRate = scoreCount > 0 ? passCount / scoreCount : 0;
  const avgScore = computeMean(validScores);
  return {
    errorRate,
    errorCount,
    passRate,
    passCount,
    avgScore,
    scoreCount,
    totalItems
  };
}
function isRegression(delta, threshold, direction = "higher-is-better") {
  if (direction === "higher-is-better") {
    return delta < -threshold;
  } else {
    return delta > threshold;
  }
}

// src/datasets/experiment/analytics/compare.ts
var DEFAULT_THRESHOLD = {
  value: 0,
  direction: "higher-is-better"
};
var DEFAULT_PASS_THRESHOLD = 0.5;
async function compareExperiments(mastra, config) {
  const { experimentIdA, experimentIdB, thresholds = {} } = config;
  const warnings = [];
  const storage = mastra.getStorage();
  if (!storage) {
    throw new Error("Storage not configured. Configure storage in Mastra instance.");
  }
  const experimentsStore = await storage.getStore("experiments");
  const scoresStore = await storage.getStore("scores");
  if (!experimentsStore) {
    throw new Error("ExperimentsStorage not configured.");
  }
  if (!scoresStore) {
    throw new Error("ScoresStorage not configured.");
  }
  const [experimentA, experimentB] = await Promise.all([
    experimentsStore.getExperimentById({ id: experimentIdA }),
    experimentsStore.getExperimentById({ id: experimentIdB })
  ]);
  if (!experimentA) {
    throw new Error(`Experiment not found: ${experimentIdA}`);
  }
  if (!experimentB) {
    throw new Error(`Experiment not found: ${experimentIdB}`);
  }
  const versionMismatch = experimentA.datasetVersion !== experimentB.datasetVersion;
  if (versionMismatch) {
    warnings.push(
      `Experiments have different dataset versions: ${experimentA.datasetVersion} vs ${experimentB.datasetVersion}`
    );
  }
  const [resultsA, resultsB] = await Promise.all([
    experimentsStore.listExperimentResults({ experimentId: experimentIdA, pagination: { page: 0, perPage: false } }),
    experimentsStore.listExperimentResults({ experimentId: experimentIdB, pagination: { page: 0, perPage: false } })
  ]);
  const [scoresA, scoresB] = await Promise.all([
    scoresStore.listScoresByRunId({ runId: experimentIdA, pagination: { page: 0, perPage: false } }),
    scoresStore.listScoresByRunId({ runId: experimentIdB, pagination: { page: 0, perPage: false } })
  ]);
  if (resultsA.results.length === 0 && resultsB.results.length === 0) {
    warnings.push("Both experiments have no results.");
    return buildEmptyResult(experimentA, experimentB, versionMismatch, warnings);
  }
  if (resultsA.results.length === 0) {
    warnings.push("Experiment A has no results.");
  }
  if (resultsB.results.length === 0) {
    warnings.push("Experiment B has no results.");
  }
  const itemIdsA = new Set(resultsA.results.map((r) => r.itemId));
  const itemIdsB = new Set(resultsB.results.map((r) => r.itemId));
  const overlappingItemIds = [...itemIdsA].filter((id) => itemIdsB.has(id));
  if (overlappingItemIds.length === 0) {
    warnings.push("No overlapping items between experiments.");
  }
  const scoresMapA = groupScoresByScorerAndItem(scoresA.scores);
  const scoresMapB = groupScoresByScorerAndItem(scoresB.scores);
  const allScorerIds = /* @__PURE__ */ new Set([...Object.keys(scoresMapA), ...Object.keys(scoresMapB)]);
  const scorers = {};
  let hasRegression = false;
  for (const scorerId of allScorerIds) {
    const scorerScoresA = scoresMapA[scorerId] ?? {};
    const scorerScoresB = scoresMapB[scorerId] ?? {};
    const scoresArrayA = Object.values(scorerScoresA);
    const scoresArrayB = Object.values(scorerScoresB);
    const thresholdConfig = thresholds[scorerId] ?? DEFAULT_THRESHOLD;
    const threshold = thresholdConfig.value;
    const direction = thresholdConfig.direction ?? "higher-is-better";
    const statsA = computeScorerStats(scoresArrayA, DEFAULT_PASS_THRESHOLD);
    const statsB = computeScorerStats(scoresArrayB, DEFAULT_PASS_THRESHOLD);
    const delta = statsB.avgScore - statsA.avgScore;
    const regressed = isRegression(delta, threshold, direction);
    if (regressed) {
      hasRegression = true;
    }
    scorers[scorerId] = {
      statsA,
      statsB,
      delta,
      regressed,
      threshold
    };
  }
  const allItemIds = /* @__PURE__ */ new Set([...itemIdsA, ...itemIdsB]);
  const items = [];
  for (const itemId of allItemIds) {
    const inBothExperiments = itemIdsA.has(itemId) && itemIdsB.has(itemId);
    const itemScoresA = {};
    const itemScoresB = {};
    for (const scorerId of allScorerIds) {
      const scoreA = scoresMapA[scorerId]?.[itemId];
      const scoreB = scoresMapB[scorerId]?.[itemId];
      itemScoresA[scorerId] = scoreA?.score ?? null;
      itemScoresB[scorerId] = scoreB?.score ?? null;
    }
    items.push({
      itemId,
      inBothExperiments,
      scoresA: itemScoresA,
      scoresB: itemScoresB
    });
  }
  return {
    experimentA: {
      id: experimentA.id,
      datasetVersion: experimentA.datasetVersion
    },
    experimentB: {
      id: experimentB.id,
      datasetVersion: experimentB.datasetVersion
    },
    versionMismatch,
    hasRegression,
    scorers,
    items,
    warnings
  };
}
function groupScoresByScorerAndItem(scores) {
  const result = {};
  for (const score of scores) {
    const scorerId = score.scorerId;
    const itemId = score.entityId;
    if (!result[scorerId]) {
      result[scorerId] = {};
    }
    result[scorerId][itemId] = score;
  }
  return result;
}
function buildEmptyResult(experimentA, experimentB, versionMismatch, warnings) {
  return {
    experimentA: {
      id: experimentA.id,
      datasetVersion: experimentA.datasetVersion
    },
    experimentB: {
      id: experimentB.id,
      datasetVersion: experimentB.datasetVersion
    },
    versionMismatch,
    hasRegression: false,
    scorers: {},
    items: [],
    warnings
  };
}

// src/datasets/experiment/index.ts
async function runExperiment(mastra, config) {
  const {
    datasetId,
    targetType,
    targetId,
    scorers: scorerInput,
    version,
    maxConcurrency = 5,
    signal,
    itemTimeout,
    maxRetries = 0,
    experimentId: providedExperimentId,
    name,
    description,
    metadata,
    requestContext: globalRequestContext,
    agentVersion
  } = config;
  const startedAt = /* @__PURE__ */ new Date();
  const experimentId = providedExperimentId ?? crypto.randomUUID();
  const storage = mastra.getStorage();
  const datasetsStore = await storage?.getStore("datasets");
  const experimentsStore = await storage?.getStore("experiments");
  const markFailedOnSetupError = async (err) => {
    if (providedExperimentId && experimentsStore) {
      try {
        await experimentsStore.updateExperiment({
          id: experimentId,
          status: "failed",
          completedAt: /* @__PURE__ */ new Date()
        });
      } catch (updateErr) {
        mastra.getLogger()?.error(`Failed to mark experiment ${experimentId} as failed: ${updateErr}`);
      }
    }
    throw err;
  };
  let items;
  let datasetVersion;
  let datasetRecord;
  try {
    if (config.data) {
      const rawData = typeof config.data === "function" ? await config.data() : config.data;
      items = rawData.map((dataItem) => {
        const id = dataItem.id ?? crypto.randomUUID();
        return {
          id,
          datasetVersion: null,
          input: dataItem.input,
          groundTruth: dataItem.groundTruth,
          metadata: dataItem.metadata
        };
      });
      datasetVersion = null;
    } else if (datasetId) {
      if (!datasetsStore) {
        throw new Error("DatasetsStorage not configured. Configure storage in Mastra instance.");
      }
      datasetRecord = await datasetsStore.getDatasetById({ id: datasetId });
      if (!datasetRecord) {
        throw new MastraError({
          id: "DATASET_NOT_FOUND",
          text: `Dataset not found: ${datasetId}`,
          domain: "STORAGE",
          category: "USER"
        });
      }
      datasetVersion = version ?? datasetRecord.version;
      const versionItems = await datasetsStore.getItemsByVersion({
        datasetId,
        version: datasetVersion
      });
      if (versionItems.length === 0) {
        throw new MastraError({
          id: "EXPERIMENT_NO_ITEMS",
          text: `No items in dataset ${datasetId} at version ${datasetVersion}`,
          domain: "STORAGE",
          category: "USER"
        });
      }
      items = versionItems.map((v) => ({
        id: v.id,
        datasetVersion: v.datasetVersion,
        input: v.input,
        groundTruth: v.groundTruth,
        requestContext: v.requestContext,
        metadata: v.metadata
      }));
    } else {
      throw new Error("No data source: provide datasetId or data");
    }
  } catch (err) {
    await markFailedOnSetupError(err);
    throw err;
  }
  let execFn;
  try {
    if (config.task) {
      const taskFn = config.task;
      execFn = async (item, itemSignal) => {
        try {
          const result = await taskFn({
            input: item.input,
            mastra,
            groundTruth: item.groundTruth,
            metadata: item.metadata,
            signal: itemSignal
          });
          return { output: result, error: null, traceId: null };
        } catch (err) {
          return {
            output: null,
            error: {
              message: err instanceof Error ? err.message : String(err),
              stack: err instanceof Error ? err.stack : void 0
            },
            traceId: null
          };
        }
      };
    } else if (targetType && targetId) {
      const target = await resolveTarget(mastra, targetType, targetId, agentVersion);
      if (!target) {
        throw new Error(`Target not found: ${targetType}/${targetId}`);
      }
      execFn = (item, itemSignal) => {
        const mergedRequestContext = globalRequestContext || item.requestContext ? { ...globalRequestContext, ...item.requestContext } : void 0;
        return executeTarget(target, targetType, item, {
          signal: itemSignal,
          requestContext: mergedRequestContext,
          experimentId
        });
      };
    } else {
      throw new Error("No task: provide targetType+targetId or task");
    }
  } catch (err) {
    await markFailedOnSetupError(err);
    throw err;
  }
  let mergedScorerInput = scorerInput;
  const datasetScorerIds = datasetRecord?.scorerIds ?? [];
  if (datasetScorerIds.length > 0) {
    mergedScorerInput = [...scorerInput ?? [], ...datasetScorerIds];
  }
  if (mergedScorerInput && mergedScorerInput.length > 0) {
    const seen = /* @__PURE__ */ new Set();
    mergedScorerInput = mergedScorerInput.filter((entry) => {
      if (typeof entry === "string") {
        if (seen.has(entry)) return false;
        seen.add(entry);
        return true;
      }
      return true;
    });
  }
  const scorers = resolveScorers(mastra, mergedScorerInput);
  if (experimentsStore) {
    if (!providedExperimentId) {
      await experimentsStore.createExperiment({
        id: experimentId,
        name,
        description,
        metadata,
        datasetId: datasetId ?? null,
        datasetVersion,
        targetType: targetType ?? "agent",
        targetId: targetId ?? "inline",
        totalItems: items.length,
        agentVersion
      });
    }
    await experimentsStore.updateExperiment({
      id: experimentId,
      status: "running",
      totalItems: items.length,
      startedAt
    });
  }
  let succeededCount = 0;
  let failedCount = 0;
  const results = new Array(items.length);
  const PROGRESS_UPDATE_INTERVAL = 2e3;
  let lastProgressUpdate = 0;
  try {
    const pMap = (await import('./index2.mjs')).default;
    await pMap(
      items.map((item, idx) => ({ item, idx })),
      async ({ item, idx }) => {
        if (signal?.aborted) {
          throw new DOMException("Aborted", "AbortError");
        }
        const itemStartedAt = /* @__PURE__ */ new Date();
        let itemSignal = signal;
        if (itemTimeout) {
          const timeoutSignal = AbortSignal.timeout(itemTimeout);
          itemSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;
        }
        let retryCount = 0;
        let execResult = await execFn(item, itemSignal);
        while (execResult.error && retryCount < maxRetries) {
          if (execResult.error.message.toLowerCase().includes("abort")) break;
          retryCount++;
          const delay = Math.min(1e3 * Math.pow(2, retryCount - 1), 3e4);
          const jitter = delay * 0.2 * Math.random();
          await new Promise((r) => setTimeout(r, delay + jitter));
          if (signal?.aborted) {
            throw new DOMException("Aborted", "AbortError");
          }
          execResult = await execFn(item, itemSignal);
        }
        const itemCompletedAt = /* @__PURE__ */ new Date();
        if (execResult.error) {
          failedCount++;
        } else {
          succeededCount++;
        }
        const itemResult = {
          itemId: item.id,
          itemVersion: item.datasetVersion ?? 0,
          input: item.input,
          output: execResult.output,
          groundTruth: item.groundTruth ?? null,
          error: execResult.error,
          startedAt: itemStartedAt,
          completedAt: itemCompletedAt,
          retryCount
        };
        const itemScores = await runScorersForItem(
          scorers,
          item,
          execResult.output,
          storage ?? null,
          experimentId,
          targetType ?? "agent",
          targetId ?? "inline",
          item.id,
          execResult.scorerInput,
          execResult.scorerOutput,
          execResult.traceId ?? void 0
        );
        if (experimentsStore) {
          try {
            await experimentsStore.addExperimentResult({
              experimentId,
              itemId: item.id,
              itemDatasetVersion: item.datasetVersion,
              input: item.input,
              output: execResult.output,
              groundTruth: item.groundTruth ?? null,
              error: execResult.error,
              startedAt: itemStartedAt,
              completedAt: itemCompletedAt,
              retryCount,
              traceId: execResult.traceId
            });
          } catch (persistError) {
            console.warn(`Failed to persist result for item ${item.id}:`, persistError);
          }
          const now = Date.now();
          if (now - lastProgressUpdate >= PROGRESS_UPDATE_INTERVAL) {
            lastProgressUpdate = now;
            try {
              await experimentsStore.updateExperiment({
                id: experimentId,
                succeededCount,
                failedCount
              });
            } catch {
            }
          }
        }
        results[idx] = {
          ...itemResult,
          scores: itemScores
        };
      },
      { concurrency: maxConcurrency }
    );
  } catch {
    const completedAt2 = /* @__PURE__ */ new Date();
    const skippedCount2 = items.length - succeededCount - failedCount;
    if (experimentsStore) {
      await experimentsStore.updateExperiment({
        id: experimentId,
        status: "failed",
        succeededCount,
        failedCount,
        skippedCount: skippedCount2,
        completedAt: completedAt2
      });
    }
    return {
      experimentId,
      status: "failed",
      totalItems: items.length,
      succeededCount,
      failedCount,
      skippedCount: skippedCount2,
      completedWithErrors: false,
      startedAt,
      completedAt: completedAt2,
      results: results.filter(Boolean)
    };
  }
  const completedAt = /* @__PURE__ */ new Date();
  const status = failedCount === items.length ? "failed" : "completed";
  const completedWithErrors = status === "completed" && failedCount > 0;
  const skippedCount = items.length - succeededCount - failedCount;
  if (experimentsStore) {
    await experimentsStore.updateExperiment({
      id: experimentId,
      status,
      succeededCount,
      failedCount,
      skippedCount,
      completedAt
    });
  }
  return {
    experimentId,
    status,
    totalItems: items.length,
    succeededCount,
    failedCount,
    skippedCount,
    completedWithErrors,
    startedAt,
    completedAt,
    results
  };
}
async function resolveTarget(mastra, targetType, targetId, agentVersion) {
  let resolved = null;
  switch (targetType) {
    case "agent":
      try {
        if (agentVersion) {
          resolved = await mastra.getAgentById(targetId, { versionId: agentVersion });
        } else {
          resolved = mastra.getAgentById(targetId);
        }
      } catch {
        try {
          if (agentVersion) {
            resolved = await mastra.getAgent(targetId, { versionId: agentVersion });
          } else {
            resolved = mastra.getAgent(targetId);
          }
        } catch {
        }
      }
      break;
    case "workflow":
      try {
        resolved = mastra.getWorkflowById(targetId);
      } catch {
        try {
          resolved = mastra.getWorkflow(targetId);
        } catch {
        }
      }
      break;
    case "scorer":
      try {
        resolved = mastra.getScorerById(targetId) ?? null;
      } catch {
      }
      break;
  }
  return resolved;
}
var Dataset = class {
  id;
  #mastra;
  #datasetsStore;
  #experimentsStore;
  constructor(id, mastra) {
    this.id = id;
    this.#mastra = mastra;
  }
  // ---------------------------------------------------------------------------
  // Lazy storage resolution
  // ---------------------------------------------------------------------------
  async #getDatasetsStore() {
    if (this.#datasetsStore) return this.#datasetsStore;
    const storage = this.#mastra.getStorage();
    if (!storage) {
      throw new MastraError({
        id: "DATASETS_STORAGE_NOT_CONFIGURED",
        text: "Storage not configured. Configure storage in Mastra instance.",
        domain: "STORAGE",
        category: "USER"
      });
    }
    const store = await storage.getStore("datasets");
    if (!store) {
      throw new MastraError({
        id: "DATASETS_STORE_NOT_AVAILABLE",
        text: "Datasets store not available. Ensure your storage adapter provides a datasets domain.",
        domain: "STORAGE",
        category: "USER"
      });
    }
    this.#datasetsStore = store;
    return store;
  }
  async #getExperimentsStore() {
    if (this.#experimentsStore) return this.#experimentsStore;
    const storage = this.#mastra.getStorage();
    if (!storage) {
      throw new MastraError({
        id: "DATASETS_STORAGE_NOT_CONFIGURED",
        text: "Storage not configured. Configure storage in Mastra instance.",
        domain: "STORAGE",
        category: "USER"
      });
    }
    const store = await storage.getStore("experiments");
    if (!store) {
      throw new MastraError({
        id: "EXPERIMENTS_STORE_NOT_AVAILABLE",
        text: "Experiments store not available. Ensure your storage adapter provides an experiments domain.",
        domain: "STORAGE",
        category: "USER"
      });
    }
    this.#experimentsStore = store;
    return store;
  }
  // ---------------------------------------------------------------------------
  // Dataset metadata
  // ---------------------------------------------------------------------------
  /**
   * Get the full dataset record from storage.
   */
  async getDetails() {
    const store = await this.#getDatasetsStore();
    const record = await store.getDatasetById({ id: this.id });
    if (!record) {
      throw new MastraError({
        id: "DATASET_NOT_FOUND",
        text: `Dataset not found: ${this.id}`,
        domain: "STORAGE",
        category: "USER"
      });
    }
    return record;
  }
  /**
   * Update dataset metadata and/or schemas.
   * Zod schemas are automatically converted to JSON Schema.
   */
  async update(input) {
    const store = await this.#getDatasetsStore();
    let { inputSchema, groundTruthSchema, ...rest } = input;
    if (inputSchema !== void 0 && inputSchema !== null && isZodType(inputSchema)) {
      inputSchema = zodToJsonSchema(inputSchema);
    }
    if (groundTruthSchema !== void 0 && groundTruthSchema !== null && isZodType(groundTruthSchema)) {
      groundTruthSchema = zodToJsonSchema(groundTruthSchema);
    }
    return store.updateDataset({
      id: this.id,
      ...rest,
      inputSchema,
      groundTruthSchema
    });
  }
  // ---------------------------------------------------------------------------
  // Item CRUD
  // ---------------------------------------------------------------------------
  /**
   * Add a single item to the dataset.
   */
  async addItem(input) {
    const store = await this.#getDatasetsStore();
    return store.addItem({
      datasetId: this.id,
      input: input.input,
      groundTruth: input.groundTruth,
      expectedTrajectory: input.expectedTrajectory,
      requestContext: input.requestContext,
      metadata: input.metadata,
      source: input.source
    });
  }
  /**
   * Add multiple items to the dataset in bulk.
   */
  async addItems(input) {
    const store = await this.#getDatasetsStore();
    return store.batchInsertItems({
      datasetId: this.id,
      items: input.items
    });
  }
  /**
   * Get a single item by ID, optionally at a specific version.
   */
  async getItem(args) {
    const store = await this.#getDatasetsStore();
    return store.getItemById({ id: args.itemId, datasetVersion: args.version });
  }
  /**
   * List items in the dataset, optionally at a specific version.
   */
  async listItems(args) {
    const store = await this.#getDatasetsStore();
    if (args?.version) {
      return store.getItemsByVersion({ datasetId: this.id, version: args.version });
    }
    return store.listItems({
      datasetId: this.id,
      search: args?.search,
      pagination: { page: args?.page ?? 0, perPage: args?.perPage ?? 20 }
    });
  }
  /**
   * Update an existing item in the dataset.
   */
  async updateItem(input) {
    const store = await this.#getDatasetsStore();
    return store.updateItem({
      id: input.itemId,
      datasetId: this.id,
      input: input.input,
      groundTruth: input.groundTruth,
      expectedTrajectory: input.expectedTrajectory,
      requestContext: input.requestContext,
      metadata: input.metadata
    });
  }
  /**
   * Delete a single item from the dataset.
   */
  async deleteItem(args) {
    const store = await this.#getDatasetsStore();
    return store.deleteItem({ id: args.itemId, datasetId: this.id });
  }
  /**
   * Delete multiple items from the dataset in bulk.
   */
  async deleteItems(args) {
    const store = await this.#getDatasetsStore();
    return store.batchDeleteItems({ datasetId: this.id, itemIds: args.itemIds });
  }
  // ---------------------------------------------------------------------------
  // Versioning
  // ---------------------------------------------------------------------------
  /**
   * List all versions of this dataset.
   */
  async listVersions(args) {
    const store = await this.#getDatasetsStore();
    return store.listDatasetVersions({
      datasetId: this.id,
      pagination: { page: args?.page ?? 0, perPage: args?.perPage ?? 20 }
    });
  }
  /**
   * Get full SCD-2 history of a specific item across all dataset versions.
   */
  async getItemHistory(args) {
    const store = await this.#getDatasetsStore();
    return store.getItemHistory(args.itemId);
  }
  // ---------------------------------------------------------------------------
  // Experiments
  // ---------------------------------------------------------------------------
  /**
   * Run an experiment on this dataset and wait for completion.
   */
  async startExperiment(config) {
    return runExperiment(this.#mastra, { datasetId: this.id, ...config });
  }
  /**
   * Start an experiment asynchronously (fire-and-forget).
   * Returns immediately with the experiment ID and pending status.
   */
  async startExperimentAsync(config) {
    const experimentsStore = await this.#getExperimentsStore();
    const datasetsStore = await this.#getDatasetsStore();
    const dataset = await datasetsStore.getDatasetById({ id: this.id });
    if (!dataset) {
      throw new MastraError({
        id: "DATASET_NOT_FOUND",
        text: `Dataset not found: ${this.id}`,
        domain: "STORAGE",
        category: "USER"
      });
    }
    const targetVersion = config.version ?? dataset.version;
    const items = await datasetsStore.getItemsByVersion({
      datasetId: this.id,
      version: targetVersion
    });
    if (items.length === 0) {
      throw new MastraError({
        id: "EXPERIMENT_NO_ITEMS",
        text: `Cannot run experiment: dataset "${this.id}" has no items at version ${targetVersion}`,
        domain: "STORAGE",
        category: "USER"
      });
    }
    const run = await experimentsStore.createExperiment({
      datasetId: this.id,
      datasetVersion: targetVersion,
      targetType: config.targetType ?? "agent",
      targetId: config.targetId ?? "inline",
      totalItems: items.length,
      name: config.name,
      description: config.description,
      metadata: config.metadata,
      agentVersion: config.agentVersion
    });
    const experimentId = run.id;
    void runExperiment(this.#mastra, {
      datasetId: this.id,
      experimentId,
      ...config,
      version: targetVersion
    }).catch(async (err) => {
      await experimentsStore.updateExperiment({
        id: experimentId,
        status: "failed",
        completedAt: /* @__PURE__ */ new Date()
      }).catch(() => {
      });
      this.#mastra.getLogger()?.error(`Experiment ${experimentId} failed: ${err?.message ?? err}`);
    });
    return { experimentId, status: "pending", totalItems: items.length };
  }
  /**
   * List all experiments (runs) for this dataset.
   */
  async listExperiments(args) {
    const experimentsStore = await this.#getExperimentsStore();
    return experimentsStore.listExperiments({
      datasetId: this.id,
      pagination: { page: args?.page ?? 0, perPage: args?.perPage ?? 20 }
    });
  }
  /**
   * Get a specific experiment (run) by ID.
   */
  async getExperiment(args) {
    const experimentsStore = await this.#getExperimentsStore();
    return experimentsStore.getExperimentById({ id: args.experimentId });
  }
  /**
   * List results for a specific experiment.
   */
  async listExperimentResults(args) {
    const experimentsStore = await this.#getExperimentsStore();
    return experimentsStore.listExperimentResults({
      experimentId: args.experimentId,
      pagination: { page: args?.page ?? 0, perPage: args?.perPage ?? 20 }
    });
  }
  /**
   * Delete an experiment (run) by ID.
   */
  /**
   * Update an experiment result's status or tags.
   */
  async updateExperimentResult(input) {
    const experimentsStore = await this.#getExperimentsStore();
    return experimentsStore.updateExperimentResult(input);
  }
  async deleteExperiment(args) {
    const experimentsStore = await this.#getExperimentsStore();
    return experimentsStore.deleteExperiment({ id: args.experimentId });
  }
};
var DatasetsManager = class {
  #mastra;
  #datasetsStore;
  #experimentsStore;
  constructor(mastra) {
    this.#mastra = mastra;
  }
  // ---------------------------------------------------------------------------
  // Lazy storage resolution
  // ---------------------------------------------------------------------------
  async #getDatasetsStore() {
    if (this.#datasetsStore) return this.#datasetsStore;
    const storage = this.#mastra.getStorage();
    if (!storage) {
      throw new MastraError({
        id: "DATASETS_STORAGE_NOT_CONFIGURED",
        text: "Storage not configured. Configure storage in Mastra instance.",
        domain: "STORAGE",
        category: "USER"
      });
    }
    const store = await storage.getStore("datasets");
    if (!store) {
      throw new MastraError({
        id: "DATASETS_STORE_NOT_AVAILABLE",
        text: "Datasets store not available. Ensure your storage adapter provides a datasets domain.",
        domain: "STORAGE",
        category: "USER"
      });
    }
    this.#datasetsStore = store;
    return store;
  }
  async #getExperimentsStore() {
    if (this.#experimentsStore) return this.#experimentsStore;
    const storage = this.#mastra.getStorage();
    if (!storage) {
      throw new MastraError({
        id: "DATASETS_STORAGE_NOT_CONFIGURED",
        text: "Storage not configured. Configure storage in Mastra instance.",
        domain: "STORAGE",
        category: "USER"
      });
    }
    const store = await storage.getStore("experiments");
    if (!store) {
      throw new MastraError({
        id: "EXPERIMENTS_STORE_NOT_AVAILABLE",
        text: "Experiments store not available. Ensure your storage adapter provides an experiments domain.",
        domain: "STORAGE",
        category: "USER"
      });
    }
    this.#experimentsStore = store;
    return store;
  }
  // ---------------------------------------------------------------------------
  // Dataset CRUD
  // ---------------------------------------------------------------------------
  /**
   * Create a new dataset.
   * Zod schemas are automatically converted to JSON Schema.
   */
  async create(input) {
    const store = await this.#getDatasetsStore();
    let { inputSchema, groundTruthSchema, ...rest } = input;
    if (inputSchema !== void 0 && isZodType(inputSchema)) {
      inputSchema = zodToJsonSchema(inputSchema);
    }
    if (groundTruthSchema !== void 0 && isZodType(groundTruthSchema)) {
      groundTruthSchema = zodToJsonSchema(groundTruthSchema);
    }
    const result = await store.createDataset({
      ...rest,
      inputSchema,
      groundTruthSchema
    });
    return new Dataset(result.id, this.#mastra);
  }
  /**
   * Get an existing dataset by ID.
   * Throws if the dataset does not exist.
   */
  async get(args) {
    const store = await this.#getDatasetsStore();
    const record = await store.getDatasetById({ id: args.id });
    if (!record) {
      throw new MastraError({
        id: "DATASET_NOT_FOUND",
        text: "Dataset not found",
        domain: "STORAGE",
        category: "USER"
      });
    }
    return new Dataset(args.id, this.#mastra);
  }
  /**
   * List all datasets with pagination.
   */
  async list(args) {
    const store = await this.#getDatasetsStore();
    return store.listDatasets({
      pagination: { page: args?.page ?? 0, perPage: args?.perPage ?? 20 }
    });
  }
  /**
   * Delete a dataset by ID.
   */
  async delete(args) {
    const store = await this.#getDatasetsStore();
    return store.deleteDataset({ id: args.id });
  }
  // ---------------------------------------------------------------------------
  // Cross-dataset experiment operations
  // ---------------------------------------------------------------------------
  /**
   * Get a specific experiment (run) by ID.
   */
  async getExperiment(args) {
    const experimentsStore = await this.#getExperimentsStore();
    return experimentsStore.getExperimentById({ id: args.experimentId });
  }
  /**
   * Compare two or more experiments.
   *
   * Uses the internal `compareExperiments` function for pairwise comparison,
   * then enriches results with per-item input/groundTruth/output data.
   */
  async compareExperiments(args) {
    const { experimentIds, baselineId } = args;
    if (experimentIds.length < 2) {
      throw new MastraError({
        id: "COMPARE_INVALID_INPUT",
        text: "compareExperiments requires at least 2 experiment IDs.",
        domain: "STORAGE",
        category: "USER"
      });
    }
    const resolvedBaseline = baselineId ?? experimentIds[0];
    const otherExperimentId = experimentIds.find((id) => id !== resolvedBaseline) ?? experimentIds[1];
    const internal = await compareExperiments(this.#mastra, {
      experimentIdA: resolvedBaseline,
      experimentIdB: otherExperimentId
    });
    const experimentsStore = await this.#getExperimentsStore();
    const [resultsA, resultsB] = await Promise.all([
      experimentsStore.listExperimentResults({
        experimentId: resolvedBaseline,
        pagination: { page: 0, perPage: false }
      }),
      experimentsStore.listExperimentResults({
        experimentId: otherExperimentId,
        pagination: { page: 0, perPage: false }
      })
    ]);
    const resultsMapA = new Map(resultsA.results.map((r) => [r.itemId, r]));
    const resultsMapB = new Map(resultsB.results.map((r) => [r.itemId, r]));
    const items = internal.items.map((item) => {
      const resultA = resultsMapA.get(item.itemId);
      const resultB = resultsMapB.get(item.itemId);
      return {
        itemId: item.itemId,
        input: resultA?.input ?? resultB?.input ?? null,
        groundTruth: resultA?.groundTruth ?? resultB?.groundTruth ?? null,
        results: {
          [resolvedBaseline]: resultA ? { output: resultA.output, scores: item.scoresA } : null,
          [otherExperimentId]: resultB ? { output: resultB.output, scores: item.scoresB } : null
        }
      };
    });
    return {
      baselineId: resolvedBaseline,
      items
    };
  }
};

function createUndefinedPrimitiveError(type, value, key) {
  const typeLabel = type === "mcp-server" ? "MCP server" : type;
  const errorId = `MASTRA_ADD_${type.toUpperCase().replace("-", "_")}_UNDEFINED`;
  return new MastraError({
    id: errorId,
    domain: "MASTRA" /* MASTRA */,
    category: "USER" /* USER */,
    text: `Cannot add ${typeLabel}: ${typeLabel} is ${value === null ? "null" : "undefined"}. This may occur if config was spread ({ ...config }) and the original object had getters or non-enumerable properties.`,
    details: { status: 400, ...key && { key } }
  });
}
var Mastra = class {
  #vectors;
  #agents;
  #logger;
  #workflows;
  #observability;
  #tts;
  #deployer;
  #serverMiddleware = [];
  #storage;
  #scorers;
  #tools;
  #processors;
  #processorConfigurations = /* @__PURE__ */ new Map();
  #memory;
  #workspace;
  #workspaces = {};
  #server;
  #serverAdapter;
  #mcpServers;
  #bundler;
  #idGenerator;
  #pubsub;
  #gateways;
  #events = {};
  #internalMastraWorkflows = {};
  // This is only used internally for server handlers that require temporary persistence
  #serverCache;
  // Cache for stored agents to allow in-memory modifications (like model changes) to persist across requests
  #storedAgentsCache = /* @__PURE__ */ new Map();
  // Cache for stored scorers to allow in-memory modifications to persist across requests
  #storedScorersCache = /* @__PURE__ */ new Map();
  // Registry for prompt blocks (stored or code-defined)
  #promptBlocks = {};
  // Editor instance for handling agent instantiation and configuration
  #editor;
  #datasets;
  get pubsub() {
    return this.#pubsub;
  }
  get datasets() {
    if (!this.#datasets) {
      this.#datasets = new DatasetsManager(this);
    }
    return this.#datasets;
  }
  /**
   * Gets the currently configured ID generator function.
   *
   * @example
   * ```typescript
   * const mastra = new Mastra({
   *   idGenerator: context =>
   *     context?.idType === 'message' && context.threadId
   *       ? `msg-${context.threadId}-${Date.now()}`
   *       : `custom-${Date.now()}`
   * });
   * const generator = mastra.getIdGenerator();
   * console.log(generator?.({ idType: 'message', threadId: 'thread-123' })); // \"msg-thread-123-1234567890\"
   * ```
   */
  getIdGenerator() {
    return this.#idGenerator;
  }
  /**
   * Gets the currently configured editor instance.
   * The editor is responsible for handling agent instantiation and configuration.
   *
   * @example
   * ```typescript
   * const mastra = new Mastra({
   *   editor: new MastraEditor({ logger })
   * });
   * const editor = mastra.getEditor();
   * ```
   */
  getEditor() {
    return this.#editor;
  }
  /**
   * Gets the stored agents cache
   * @internal
   */
  getStoredAgentCache() {
    return this.#storedAgentsCache;
  }
  /**
   * Gets the stored scorers cache
   * @internal
   */
  getStoredScorerCache() {
    return this.#storedScorersCache;
  }
  /**
   * Generates a unique identifier using the configured generator or defaults to `crypto.randomUUID()`.
   *
   * This method is used internally by Mastra for creating unique IDs for various entities
   * like workflow runs, agent conversations, and other resources that need unique identification.
   *
   * @param context - Optional context information about what type of ID is being generated
   *                  and where it's being requested from. This allows custom ID generators
   *                  to create deterministic IDs based on context.
   *
   * @throws {MastraError} When the custom ID generator returns an empty string
   *
   * @example
   * ```typescript
   * const mastra = new Mastra();
   * const id = mastra.generateId();
   * console.log(id); // "550e8400-e29b-41d4-a716-446655440000"
   *
   * // With context for deterministic IDs
   * const messageId = mastra.generateId({
   *   idType: 'message',
   *   source: 'agent',
   *   threadId: 'thread-123'
   * });
   * ```
   */
  generateId(context) {
    if (this.#idGenerator) {
      const id = this.#idGenerator(context);
      if (!id) {
        const error = new MastraError({
          id: "MASTRA_ID_GENERATOR_RETURNED_EMPTY_STRING",
          domain: "MASTRA" /* MASTRA */,
          category: "USER" /* USER */,
          text: "ID generator returned an empty string, which is not allowed"
        });
        this.#logger?.trackException(error);
        throw error;
      }
      return id;
    }
    return randomUUID();
  }
  /**
   * Sets a custom ID generator function for creating unique identifiers.
   *
   * The ID generator function will be used by `generateId()` instead of the default
   * `crypto.randomUUID()`. This is useful for creating application-specific ID formats
   * or integrating with existing ID generation systems. The function receives
   * optional context about what is requesting the ID.
   *
   * @example
   * ```typescript
   * const mastra = new Mastra();
   * mastra.setIdGenerator(context =>
   *   context?.idType === 'run' && context.entityId
   *     ? `run-${context.entityId}-${Date.now()}`
   *     : `custom-${Date.now()}`
   * );
   * const id = mastra.generateId({ idType: 'run', entityId: 'agent-123' });
   * console.log(id); // "run-agent-123-1234567890"
   * ```
   */
  setIdGenerator(idGenerator) {
    this.#idGenerator = idGenerator;
  }
  /**
   * Sets the server configuration for this Mastra instance.
   *
   * @param server - The server configuration object
   *
   * @example
   * ```typescript
   * mastra.setServer({ ...mastra.getServer(), auth: new MastraAuthWorkos() });
   * ```
   */
  setServer(server) {
    this.#server = server;
  }
  /**
   * Registers an exporter on the default observability instance.
   *
   * If the current observability is a no-op (user didn't configure any), it is
   * first replaced with the provided entrypoint and the instance is registered
   * as default. If a real observability entrypoint already exists, the exporter
   * is added directly to the existing default instance.
   *
   * @param exporter - The exporter to register (e.g. a CloudExporter)
   * @param instance - An ObservabilityInstance pre-configured with the exporter, used as default when bootstrapping
   * @param entrypoint - A real ObservabilityEntrypoint to bootstrap if the current one is a no-op
   */
  registerExporter(exporter, instance, entrypoint) {
    if (this.#observability instanceof NoOpObservability) {
      this.#observability = entrypoint;
      this.#observability.setLogger({ logger: this.#logger });
      this.#observability.setMastraContext({ mastra: this });
      this.#observability.registerInstance("default", instance, true);
    }
    const defaultInstance = this.#observability.getDefaultInstance();
    if (defaultInstance?.registerExporter) {
      defaultInstance.registerExporter(exporter);
    }
  }
  /**
   * Creates a new Mastra instance with the provided configuration.
   *
   * The constructor initializes all the components specified in the config, sets up
   * internal systems like logging and observability, and registers components with each other.
   *
   * @example
   * ```typescript
   * const mastra = new Mastra({
   *   agents: {
   *     assistant: new Agent({
   *       id: 'assistant',
   *       name: 'Assistant',
   *       instructions: 'You are a helpful assistant',
   *       model: 'openai/gpt-5'
   *     })
   *   },
   *   storage: new PostgresStore({
   *     connectionString: process.env.DATABASE_URL
   *   }),
   *   logger: new PinoLogger({ name: 'MyApp' }),
   *   observability: new Observability({
   *     configs: { default: { serviceName: 'mastra', exporters: [new DefaultExporter()] } },
   *   }),
   * });
   * ```
   */
  constructor(config) {
    initContextStorage();
    this.#serverCache = new InMemoryServerCache();
    this.#editor = config?.editor;
    if (this.#editor && typeof this.#editor.registerWithMastra === "function") {
      this.#editor.registerWithMastra(this);
    }
    if (config?.pubsub) {
      this.#pubsub = config.pubsub;
    } else {
      this.#pubsub = new EventEmitterPubSub();
    }
    this.#events = {};
    for (const topic in config?.events ?? {}) {
      if (!Array.isArray(config?.events?.[topic])) {
        this.#events[topic] = [config?.events?.[topic]];
      } else {
        this.#events[topic] = config?.events?.[topic] ?? [];
      }
    }
    const workflowEventProcessor = new WorkflowEventProcessor({ mastra: this });
    const workflowEventCb = async (event, cb) => {
      try {
        await workflowEventProcessor.process(event, cb);
      } catch (e) {
        this.getLogger()?.error("Error processing event", e);
      }
    };
    if (this.#events.workflows) {
      this.#events.workflows.push(workflowEventCb);
    } else {
      this.#events.workflows = [workflowEventCb];
    }
    let logger;
    if (config?.logger === false) {
      logger = noopLogger;
    } else {
      if (config?.logger) {
        logger = config.logger;
      } else {
        const levelOnEnv = process.env.NODE_ENV === "production" && process.env.MASTRA_DEV !== "true" ? LogLevel.WARN : LogLevel.INFO;
        logger = new ConsoleLogger({ name: "Mastra", level: levelOnEnv });
      }
    }
    this.#logger = logger;
    this.#idGenerator = config?.idGenerator;
    let storage = config?.storage;
    if (storage) {
      storage = augmentWithInit(storage);
    }
    if (config?.observability) {
      if (typeof config.observability.getDefaultInstance === "function") {
        this.#observability = config.observability;
        this.#observability.setLogger({ logger: this.#logger });
      } else {
        this.#logger?.warn(
          'Observability configuration error: Expected an Observability instance, but received a config object. Import and instantiate: import { Observability, DefaultExporter } from "@mastra/observability"; then pass: observability: new Observability({ configs: { default: { serviceName: "mastra", exporters: [new DefaultExporter()] } } }). Observability has been disabled.'
        );
        this.#observability = new NoOpObservability();
      }
    } else {
      this.#observability = new NoOpObservability();
    }
    const dualLogger = new DualLogger(this.#logger, () => this.loggerVNext);
    this.#logger = dualLogger;
    this.#storage = storage;
    this.#vectors = {};
    this.#mcpServers = {};
    this.#tts = {};
    this.#agents = {};
    this.#scorers = {};
    this.#tools = {};
    this.#processors = {};
    this.#memory = {};
    this.#workflows = {};
    this.#gateways = {};
    if (config?.tools) {
      Object.entries(config.tools).forEach(([key, tool]) => {
        if (tool != null) {
          this.addTool(tool, key);
        }
      });
    }
    if (config?.processors) {
      Object.entries(config.processors).forEach(([key, processor]) => {
        if (processor != null) {
          this.addProcessor(processor, key);
        }
      });
    }
    if (config?.memory) {
      Object.entries(config.memory).forEach(([key, memory]) => {
        if (memory != null) {
          this.addMemory(memory, key);
        }
      });
    }
    if (config?.vectors) {
      Object.entries(config.vectors).forEach(([key, vector]) => {
        if (vector != null) {
          this.addVector(vector, key);
        }
      });
    }
    if (config?.workspace) {
      this.#workspace = config.workspace;
      this.addWorkspace(config.workspace, void 0, { source: "mastra" });
    }
    if (config?.scorers) {
      Object.entries(config.scorers).forEach(([key, scorer]) => {
        if (scorer != null) {
          this.addScorer(scorer, key, { source: "code" });
        }
      });
    }
    if (config?.workflows) {
      Object.entries(config.workflows).forEach(([key, workflow]) => {
        if (workflow != null) {
          this.addWorkflow(workflow, key);
        }
      });
    }
    if (config?.gateways) {
      Object.entries(config.gateways).forEach(([key, gateway]) => {
        if (gateway != null) {
          this.addGateway(gateway, key);
        }
      });
    }
    for (const gateway of defaultGateways) {
      const key = gateway.getId();
      if (!this.#gateways[key]) {
        this.#gateways[key] = gateway;
      }
    }
    if (config?.mcpServers) {
      Object.entries(config.mcpServers).forEach(([key, server]) => {
        if (server != null) {
          this.addMCPServer(server, key);
        }
      });
    }
    if (config?.tts) {
      Object.entries(config.tts).forEach(([key, tts]) => {
        if (tts != null) {
          this.#tts[key] = tts;
        }
      });
    }
    if (config?.server) {
      this.#server = config.server;
    }
    if (config?.agents) {
      Object.entries(config.agents).forEach(([key, agent]) => {
        if (agent != null) {
          this.addAgent(agent, key);
        }
      });
    }
    registerHook("onScorerRun" /* ON_SCORER_RUN */, createOnScorerHook(this));
    this.#observability.setMastraContext({ mastra: this });
    this.setLogger({ logger });
  }
  getAgent(name, version) {
    const agent = this.#agents?.[name];
    if (!agent) {
      const error = new MastraError({
        id: "MASTRA_GET_AGENT_BY_NAME_NOT_FOUND",
        domain: "MASTRA" /* MASTRA */,
        category: "USER" /* USER */,
        text: `Agent with name ${String(name)} not found`,
        details: {
          status: 404,
          agentName: String(name),
          agents: Object.keys(this.#agents ?? {}).join(", ")
        }
      });
      this.#logger?.trackException(error);
      throw error;
    }
    if (!version) {
      return this.#agents[name];
    }
    return this.resolveVersionedAgent(agent, version);
  }
  /**
   * Returns the `AgentChannels` instances for all registered agents.
   * Keys are agent IDs.
   */
  getChannels() {
    const result = {};
    for (const [agentKey, agent] of Object.entries(this.#agents ?? {})) {
      const agentChannels = agent.getChannels();
      if (agentChannels) {
        result[agentKey] = agentChannels;
      }
    }
    return result;
  }
  getAgentById(id, version) {
    let agent = Object.values(this.#agents).find((a) => a.id === id);
    if (!agent) {
      try {
        agent = this.getAgent(id);
      } catch {
      }
    }
    if (!agent) {
      const error = new MastraError({
        id: "MASTRA_GET_AGENT_BY_AGENT_ID_NOT_FOUND",
        domain: "MASTRA" /* MASTRA */,
        category: "USER" /* USER */,
        text: `Agent with id ${String(id)} not found`,
        details: {
          status: 404,
          agentId: String(id),
          agents: Object.keys(this.#agents ?? {}).join(", ")
        }
      });
      this.#logger?.trackException(error);
      throw error;
    }
    if (!version) {
      return agent;
    }
    return this.resolveVersionedAgent(agent, version);
  }
  async resolveVersionedAgent(agent, version) {
    const editor = this.getEditor();
    if (!editor) {
      const error = new MastraError({
        id: "MASTRA_EDITOR_REQUIRED_FOR_VERSIONED_AGENT_LOOKUP",
        domain: "MASTRA" /* MASTRA */,
        category: "USER" /* USER */,
        text: "Versioned agent lookup requires the editor package to be configured",
        details: {
          status: 400,
          agentId: agent.id,
          ...version && "versionId" in version ? { versionId: version.versionId } : {},
          ...version && "status" in version && version.status ? { versionStatus: version.status } : {}
        }
      });
      this.#logger?.trackException(error);
      throw error;
    }
    return editor.agent.applyStoredOverrides(
      agent,
      "versionId" in version ? version : { status: version.status ?? "published" }
    );
  }
  /**
   * Returns all registered agents as a record keyed by their names.
   *
   * This method provides access to the complete registry of agents, allowing you to
   * iterate over them, check what agents are available, or perform bulk operations.
   *
   * @example
   * ```typescript
   * const mastra = new Mastra({
   *   agents: {
   *     weatherAgent: new Agent({ id: 'weather-agent', name: 'weather', model: 'openai/gpt-4o' }),
   *     supportAgent: new Agent({ id: 'support-agent', name: 'support', model: 'openai/gpt-4o' })
   *   }
   * });
   *
   * const allAgents = mastra.listAgents();
   * console.log(Object.keys(allAgents)); // ['weatherAgent', 'supportAgent']
   * ```
   */
  listAgents() {
    return this.#agents;
  }
  /**
   * Adds a new agent to the Mastra instance.
   *
   * This method allows dynamic registration of agents after the Mastra instance
   * has been created. The agent will be initialized with the current logger.
   *
   * @throws {MastraError} When an agent with the same key already exists
   *
   * @example
   * ```typescript
   * const mastra = new Mastra();
   * const newAgent = new Agent({
   *   id: 'chat-agent',
   *   name: 'Chat Assistant',
   *   model: 'openai/gpt-4o'
   * });
   * mastra.addAgent(newAgent); // Uses agent.id as key
   * // or
   * mastra.addAgent(newAgent, 'customKey'); // Uses custom key
   * ```
   */
  addAgent(agent, key, options) {
    if (!agent) {
      throw createUndefinedPrimitiveError("agent", agent, key);
    }
    let mastraAgent;
    if (isToolLoopAgentLike(agent)) {
      mastraAgent = toolLoopAgentToMastraAgent(agent, { fallbackName: key });
    } else {
      mastraAgent = agent;
    }
    const agentKey = key || mastraAgent.id;
    const agents = this.#agents;
    if (agents[agentKey]) {
      return;
    }
    mastraAgent.__setLogger(this.#logger);
    mastraAgent.__registerMastra(this);
    mastraAgent.__registerPrimitives({
      logger: this.getLogger(),
      storage: this.getStorage(),
      agents,
      tts: this.#tts,
      vectors: this.#vectors
    });
    if (options?.source) {
      mastraAgent.source = options.source;
    }
    agents[agentKey] = mastraAgent;
    mastraAgent.getConfiguredProcessorWorkflows().then((processorWorkflows) => {
      for (const workflow of processorWorkflows) {
        this.addWorkflow(workflow, workflow.id);
      }
    }).catch((err) => {
      this.#logger?.debug(`Failed to register processor workflows for agent ${agentKey}:`, err);
    });
    if (mastraAgent.hasOwnWorkspace?.()) {
      Promise.resolve(mastraAgent.getWorkspace?.()).then((workspace) => {
        if (workspace) {
          this.addWorkspace(workspace, void 0, {
            source: "agent",
            agentId: mastraAgent.id ?? agentKey,
            agentName: mastraAgent.name
          });
        }
      }).catch((err) => {
        this.#logger?.debug(`Failed to register workspace for agent ${agentKey}:`, err);
      });
    }
    mastraAgent.listScorers().then((scorers) => {
      for (const [, entry] of Object.entries(scorers || {})) {
        this.addScorer(entry.scorer, void 0, { source: "code" });
      }
    }).catch((err) => {
      this.#logger?.debug(`Failed to register scorers from agent ${agentKey}:`, err);
    });
    const agentChannels = mastraAgent.getChannels();
    if (agentChannels) {
      agentChannels.__setLogger(this.#logger);
      const channelRoutes = agentChannels.getWebhookRoutes();
      if (channelRoutes.length > 0) {
        this.#server = {
          ...this.#server,
          apiRoutes: [...this.#server?.apiRoutes ?? [], ...channelRoutes]
        };
      }
      void agentChannels.initialize(this);
    }
  }
  /**
   * Removes an agent from the Mastra instance by its key or ID.
   * Used when stored agents are updated/deleted to allow fresh data to be loaded.
   *
   * @param keyOrId - The agent key or ID to remove
   * @returns true if an agent was removed, false if no agent was found
   *
   * @example
   * ```typescript
   * // Remove by key
   * mastra.removeAgent('myAgent');
   *
   * // Remove by ID
   * mastra.removeAgent('agent-123');
   * ```
   */
  removeAgent(keyOrId) {
    const agents = this.#agents;
    if (agents[keyOrId]) {
      const agentId = agents[keyOrId]?.id;
      delete agents[keyOrId];
      if (agentId) {
        this.#storedAgentsCache.delete(agentId);
      }
      return true;
    }
    const key = Object.keys(agents).find((k) => agents[k]?.id === keyOrId);
    if (key) {
      const agentId = agents[key]?.id;
      delete agents[key];
      if (agentId) {
        this.#storedAgentsCache.delete(agentId);
      }
      return true;
    }
    return false;
  }
  /**
   * Retrieves a registered vector store by its name.
   *
   * @template TVectorName - The specific vector store name type from the registered vectors
   * @throws {MastraError} When the vector store with the specified name is not found
   *
   * @example Using a vector store for semantic search
   * ```typescript
   * import { PineconeVector } from '@mastra/pinecone';
   * import { OpenAIEmbedder } from '@mastra/embedders';
   *
   * const mastra = new Mastra({
   *   vectors: {
   *     knowledge: new PineconeVector({
   *       apiKey: process.env.PINECONE_API_KEY,
   *       indexName: 'knowledge-base',
   *       embedder: new OpenAIEmbedder({
   *         apiKey: process.env.OPENAI_API_KEY,
   *         model: 'text-embedding-3-small'
   *       })
   *     }),
   *     products: new PineconeVector({
   *       apiKey: process.env.PINECONE_API_KEY,
   *       indexName: 'product-catalog'
   *     })
   *   }
   * });
   *
   * // Get a vector store and perform semantic search
   * const knowledgeBase = mastra.getVector('knowledge');
   * const results = await knowledgeBase.query({
   *   query: 'How to reset password?',
   *   topK: 5
   * });
   *
   * console.log('Relevant documents:', results);
   * ```
   */
  getVector(name) {
    const vector = this.#vectors?.[name];
    if (!vector) {
      const error = new MastraError({
        id: "MASTRA_GET_VECTOR_BY_NAME_NOT_FOUND",
        domain: "MASTRA" /* MASTRA */,
        category: "USER" /* USER */,
        text: `Vector with name ${String(name)} not found`,
        details: {
          status: 404,
          vectorName: String(name),
          vectors: Object.keys(this.#vectors ?? {}).join(", ")
        }
      });
      this.#logger?.trackException(error);
      throw error;
    }
    return vector;
  }
  /**
   * Retrieves a specific vector store instance by its ID.
   *
   * This method searches for a vector store by its internal ID property.
   * If not found by ID, it falls back to searching by registration key.
   *
   * @throws {MastraError} When the specified vector store is not found
   *
   * @example
   * ```typescript
   * const mastra = new Mastra({
   *   vectors: {
   *     embeddings: chromaVector
   *   }
   * });
   *
   * const vectorStore = mastra.getVectorById('chroma-123');
   * ```
   */
  getVectorById(id) {
    const allVectors = this.#vectors ?? {};
    for (const vector of Object.values(allVectors)) {
      if (vector.id === id) {
        return vector;
      }
    }
    const vectorByKey = allVectors[id];
    if (vectorByKey) {
      return vectorByKey;
    }
    const error = new MastraError({
      id: "MASTRA_GET_VECTOR_BY_ID_NOT_FOUND",
      domain: "MASTRA" /* MASTRA */,
      category: "USER" /* USER */,
      text: `Vector store with id ${id} not found`,
      details: {
        status: 404,
        vectorId: String(id),
        vectors: Object.keys(allVectors).join(", ")
      }
    });
    this.#logger?.trackException(error);
    throw error;
  }
  /**
   * Returns all registered vector stores as a record keyed by their names.
   *
   * @example Listing all vector stores
   * ```typescript
   * const mastra = new Mastra({
   *   vectors: {
   *     documents: new PineconeVector({ indexName: 'docs' }),
   *     images: new PineconeVector({ indexName: 'images' }),
   *     products: new ChromaVector({ collectionName: 'products' })
   *   }
   * });
   *
   * const allVectors = mastra.getVectors();
   * console.log(Object.keys(allVectors)); // ['documents', 'images', 'products']
   *
   * // Check vector store types and configurations
   * for (const [name, vectorStore] of Object.entries(allVectors)) {
   *   console.log(`Vector store ${name}:`, vectorStore.constructor.name);
   * }
   * ```
   */
  listVectors() {
    return this.#vectors;
  }
  /**
   * Adds a new vector store to the Mastra instance.
   *
   * This method allows dynamic registration of vector stores after the Mastra instance
   * has been created. The vector store will be initialized with the current logger.
   *
   * @throws {MastraError} When a vector store with the same key already exists
   *
   * @example
   * ```typescript
   * const mastra = new Mastra();
   * const newVector = new ChromaVector({ id: 'chroma-embeddings' });
   * mastra.addVector(newVector); // Uses vector.id as key
   * // or
   * mastra.addVector(newVector, 'customKey'); // Uses custom key
   * ```
   */
  addVector(vector, key) {
    if (!vector) {
      throw createUndefinedPrimitiveError("vector", vector, key);
    }
    const vectorKey = key || vector.id;
    const vectors = this.#vectors;
    if (vectors[vectorKey]) {
      return;
    }
    vector.__setLogger(this.#logger || this.getLogger());
    vectors[vectorKey] = vector;
  }
  /**
   * @deprecated Use listVectors() instead
   */
  getVectors() {
    console.warn("getVectors() is deprecated. Use listVectors() instead.");
    return this.listVectors();
  }
  /**
   * Gets the currently configured deployment provider.
   *
   * @example
   * ```typescript
   * const mastra = new Mastra({
   *   deployer: new VercelDeployer({
   *     token: process.env.VERCEL_TOKEN,
   *     projectId: process.env.VERCEL_PROJECT_ID
   *   })
   * });
   *
   * const deployer = mastra.getDeployer();
   * if (deployer) {
   *   await deployer.deploy({
   *     name: 'my-mastra-app',
   *     environment: 'production'
   *   });
   * }
   * ```
   */
  getDeployer() {
    return this.#deployer;
  }
  /**
   * Gets the global workspace instance.
   * Workspace provides file storage, skills, and code execution capabilities.
   * Agents inherit this workspace unless they have their own configured.
   *
   * @example
   * ```typescript
   * const workspace = mastra.getWorkspace();
   * if (workspace?.skills) {
   *   const skills = await workspace.skills.list();
   * }
   * ```
   */
  getWorkspace() {
    return this.#workspace;
  }
  /**
   * Retrieves a registered workspace by its ID.
   *
   * @throws {MastraError} When the workspace with the specified ID is not found
   *
   * @example
   * ```typescript
   * const workspace = mastra.getWorkspaceById('workspace-123');
   * const files = await workspace.filesystem.readdir('/');
   * ```
   */
  getWorkspaceById(id) {
    const entry = this.#workspaces[id];
    if (!entry) {
      const error = new MastraError({
        id: "MASTRA_GET_WORKSPACE_BY_ID_NOT_FOUND",
        domain: "MASTRA" /* MASTRA */,
        category: "USER" /* USER */,
        text: `Workspace with id ${id} not found`,
        details: {
          status: 404,
          workspaceId: id,
          availableIds: Object.keys(this.#workspaces).join(", ")
        }
      });
      this.#logger?.trackException(error);
      throw error;
    }
    return entry.workspace;
  }
  /**
   * Returns all registered workspaces as a record keyed by their IDs.
   *
   * @example
   * ```typescript
   * const workspaces = mastra.listWorkspaces();
   * for (const [id, entry] of Object.entries(workspaces)) {
   *   console.log(`Workspace ${id}: ${entry.workspace.name} (source: ${entry.source})`);
   * }
   * ```
   */
  listWorkspaces() {
    return { ...this.#workspaces };
  }
  /**
   * Adds a new workspace to the Mastra instance.
   *
   * This method allows dynamic registration of workspaces after the Mastra instance
   * has been created. Workspaces are keyed by their ID.
   *
   * @example
   * ```typescript
   * const workspace = new Workspace({
   *   id: 'project-workspace',
   *   name: 'Project Workspace',
   *   filesystem: new LocalFilesystem({ rootPath: './workspace' })
   * });
   * mastra.addWorkspace(workspace);
   * ```
   */
  addWorkspace(workspace, key, metadata) {
    if (!workspace) {
      throw createUndefinedPrimitiveError("workspace", workspace, key);
    }
    const source = metadata?.source ?? (metadata?.agentId || metadata?.agentName ? "agent" : "mastra");
    if (source === "agent" && (!metadata?.agentId || !metadata?.agentName)) {
      throw new MastraError({
        id: "MASTRA_ADD_WORKSPACE_MISSING_AGENT_METADATA",
        domain: "MASTRA" /* MASTRA */,
        category: "USER" /* USER */,
        text: "Agent workspaces must include agentId and agentName.",
        details: { status: 400, workspaceId: key || workspace.id }
      });
    }
    const workspaceKey = key || workspace.id;
    if (this.#workspaces[workspaceKey]) {
      return;
    }
    this.#workspaces[workspaceKey] = {
      workspace,
      source,
      ...metadata?.agentId ? { agentId: metadata.agentId } : {},
      ...metadata?.agentName ? { agentName: metadata.agentName } : {}
    };
  }
  /**
   * Retrieves a registered workflow by its ID.
   *
   * @template TWorkflowId - The specific workflow ID type from the registered workflows
   * @throws {MastraError} When the workflow with the specified ID is not found
   *
   * @example Getting and executing a workflow
   * ```typescript
   * import { createWorkflow, createStep } from '@mastra/core/workflows';
   * import { z } from 'zod/v4';
   *
   * const processDataWorkflow = createWorkflow({
   *   name: 'process-data',
   *   triggerSchema: z.object({ input: z.string() })
   * })
   *   .then(validateStep)
   *   .then(transformStep)
   *   .then(saveStep)
   *   .commit();
   *
   * const mastra = new Mastra({
   *   workflows: {
   *     dataProcessor: processDataWorkflow
   *   }
   * });
   * ```
   */
  getWorkflow(id, { serialized } = {}) {
    const workflow = this.#workflows?.[id];
    if (!workflow) {
      const error = new MastraError({
        id: "MASTRA_GET_WORKFLOW_BY_ID_NOT_FOUND",
        domain: "MASTRA" /* MASTRA */,
        category: "USER" /* USER */,
        text: `Workflow with ID ${String(id)} not found`,
        details: {
          status: 404,
          workflowId: String(id),
          workflows: Object.keys(this.#workflows ?? {}).join(", ")
        }
      });
      this.#logger?.trackException(error);
      throw error;
    }
    if (serialized) {
      return { name: workflow.name };
    }
    return workflow;
  }
  __registerInternalWorkflow(workflow) {
    workflow.__registerMastra(this);
    workflow.__registerPrimitives({
      logger: this.getLogger()
    });
    this.#internalMastraWorkflows[workflow.id] = workflow;
  }
  __hasInternalWorkflow(id) {
    return Object.values(this.#internalMastraWorkflows).some((workflow) => workflow.id === id);
  }
  __getInternalWorkflow(id) {
    const workflow = Object.values(this.#internalMastraWorkflows).find((a) => a.id === id);
    if (!workflow) {
      throw new MastraError({
        id: "MASTRA_GET_INTERNAL_WORKFLOW_BY_ID_NOT_FOUND",
        domain: "MASTRA" /* MASTRA */,
        category: "SYSTEM" /* SYSTEM */,
        text: `Workflow with id ${String(id)} not found`,
        details: {
          status: 404,
          workflowId: String(id)
        }
      });
    }
    return workflow;
  }
  /**
   * Retrieves a registered workflow by its unique ID.
   *
   * This method searches for a workflow using its internal ID property. If no workflow
   * is found with the given ID, it also attempts to find a workflow using the ID as
   * a name.
   *
   * @throws {MastraError} When no workflow is found with the specified ID
   *
   * @example Finding a workflow by ID
   * ```typescript
   * const mastra = new Mastra({
   *   workflows: {
   *     dataProcessor: createWorkflow({
   *       name: 'process-data',
   *       triggerSchema: z.object({ input: z.string() })
   *     }).commit()
   *   }
   * });
   *
   * // Get the workflow's ID
   * const workflow = mastra.getWorkflow('dataProcessor');
   * const workflowId = workflow.id;
   *
   * // Later, retrieve the workflow by ID
   * const sameWorkflow = mastra.getWorkflowById(workflowId);
   * console.log(sameWorkflow.name); // "process-data"
   * ```
   */
  getWorkflowById(id) {
    let workflow = Object.values(this.#workflows).find((a) => a.id === id);
    if (!workflow) {
      try {
        workflow = this.getWorkflow(id);
      } catch {
      }
    }
    if (!workflow) {
      const error = new MastraError({
        id: "MASTRA_GET_WORKFLOW_BY_ID_NOT_FOUND",
        domain: "MASTRA" /* MASTRA */,
        category: "USER" /* USER */,
        text: `Workflow with id ${String(id)} not found`,
        details: {
          status: 404,
          workflowId: String(id),
          workflows: Object.keys(this.#workflows ?? {}).join(", ")
        }
      });
      this.#logger?.trackException(error);
      throw error;
    }
    return workflow;
  }
  async listActiveWorkflowRuns() {
    const storage = this.#storage;
    if (!storage) {
      this.#logger.debug("Cannot get active workflow runs. Mastra storage is not initialized");
      return { runs: [], total: 0 };
    }
    const defaultEngineWorkflows = Object.values(this.#workflows).filter((workflow) => workflow.engineType === "default");
    const allRuns = [];
    let allTotal = 0;
    for (const workflow of defaultEngineWorkflows) {
      const runningRuns = await workflow.listWorkflowRuns({ status: "running" });
      const waitingRuns = await workflow.listWorkflowRuns({ status: "waiting" });
      allRuns.push(...runningRuns.runs, ...waitingRuns.runs);
      allTotal += runningRuns.total + waitingRuns.total;
    }
    return {
      runs: allRuns,
      total: allTotal
    };
  }
  async restartAllActiveWorkflowRuns() {
    const activeRuns = await this.listActiveWorkflowRuns();
    if (activeRuns.runs.length > 0) {
      this.#logger.debug(
        `Restarting ${activeRuns.runs.length} active workflow run${activeRuns.runs.length > 1 ? "s" : ""}`
      );
    }
    for (const runSnapshot of activeRuns.runs) {
      const workflow = this.getWorkflowById(runSnapshot.workflowName);
      try {
        const run = await workflow.createRun({ runId: runSnapshot.runId });
        await run.restart();
        this.#logger.debug("Restarted workflow run", { workflow: runSnapshot.workflowName, runId: runSnapshot.runId });
      } catch (error) {
        this.#logger.error("Failed to restart workflow run", {
          workflow: runSnapshot.workflowName,
          runId: runSnapshot.runId,
          error
        });
      }
    }
  }
  /**
   * Returns all registered scorers as a record keyed by their IDs.
   *
   * @example Listing all scorers
   * ```typescript
   * import { HelpfulnessScorer, AccuracyScorer, RelevanceScorer } from '@mastra/scorers';
   *
   * const mastra = new Mastra({
   *   scorers: {
   *     helpfulness: new HelpfulnessScorer(),
   *     accuracy: new AccuracyScorer(),
   *     relevance: new RelevanceScorer()
   *   }
   * });
   *
   * const allScorers = mastra.listScorers();
   * console.log(Object.keys(allScorers)); // ['helpfulness', 'accuracy', 'relevance']
   *
   * // Check scorer configurations
   * for (const [id, scorer] of Object.entries(allScorers)) {
   *   console.log(`Scorer ${id}:`, scorer.id, scorer.name, scorer.description);
   * }
   * ```
   */
  listScorers() {
    return this.#scorers;
  }
  /**
   * Adds a new scorer to the Mastra instance.
   *
   * This method allows dynamic registration of scorers after the Mastra instance
   * has been created.
   *
   * @throws {MastraError} When a scorer with the same key already exists
   *
   * @example
   * ```typescript
   * const mastra = new Mastra();
   * const newScorer = new MastraScorer({
   *   id: 'quality-scorer',
   *   name: 'Quality Scorer'
   * });
   * mastra.addScorer(newScorer); // Uses scorer.id as key
   * // or
   * mastra.addScorer(newScorer, 'customKey'); // Uses custom key
   * ```
   */
  addScorer(scorer, key, options) {
    if (!scorer) {
      throw createUndefinedPrimitiveError("scorer", scorer, key);
    }
    const scorerKey = key || scorer.id;
    const scorers = this.#scorers;
    if (scorers[scorerKey]) {
      return;
    }
    scorer.__registerMastra(this);
    if (options?.source) {
      scorer.source = options.source;
    }
    scorers[scorerKey] = scorer;
  }
  /**
   * Retrieves a registered scorer by its key.
   *
   * @template TScorerKey - The specific scorer key type from the registered scorers
   * @throws {MastraError} When the scorer with the specified key is not found
   *
   * @example Getting and using a scorer
   * ```typescript
   * import { HelpfulnessScorer, AccuracyScorer } from '@mastra/scorers';
   *
   * const mastra = new Mastra({
   *   scorers: {
   *     helpfulness: new HelpfulnessScorer({
   *       model: 'openai/gpt-4o',
   *       criteria: 'Rate how helpful this response is'
   *     }),
   *     accuracy: new AccuracyScorer({
   *       model: 'openai/gpt-5'
   *     })
   *   }
   * });
   *
   * // Get a specific scorer
   * const helpfulnessScorer = mastra.getScorer('helpfulness');
   * const score = await helpfulnessScorer.score({
   *   input: 'How do I reset my password?',
   *   output: 'You can reset your password by clicking the forgot password link.',
   *   expected: 'Detailed password reset instructions'
   * });
   *
   * console.log('Helpfulness score:', score);
   * ```
   */
  getScorer(key) {
    const scorer = this.#scorers?.[key];
    if (!scorer) {
      const error = new MastraError({
        id: "MASTRA_GET_SCORER_NOT_FOUND",
        domain: "MASTRA" /* MASTRA */,
        category: "USER" /* USER */,
        text: `Scorer with ${String(key)} not found`
      });
      this.#logger?.trackException(error);
      throw error;
    }
    return scorer;
  }
  /**
   * Retrieves a registered scorer by its name.
   *
   * This method searches through all registered scorers to find one with the specified name.
   * Unlike `getScorer()` which uses the registration key, this method uses the scorer's
   * internal name property.
   *
   * @throws {MastraError} When no scorer is found with the specified name
   *
   * @example Finding a scorer by name
   * ```typescript
   * import { HelpfulnessScorer } from '@mastra/scorers';
   *
   * const mastra = new Mastra({
   *   scorers: {
   *     myHelpfulnessScorer: new HelpfulnessScorer({
   *       name: 'helpfulness-evaluator',
   *       model: 'openai/gpt-5'
   *     })
   *   }
   * });
   *
   * // Find scorer by its internal name, not the registration key
   * const scorer = mastra.getScorerById('helpfulness-evaluator');
   * const score = await scorer.score({
   *   input: 'question',
   *   output: 'answer'
   * });
   * ```
   */
  getScorerById(id) {
    for (const [_key, value] of Object.entries(this.#scorers ?? {})) {
      if (value.id === id || value?.name === id) {
        return value;
      }
    }
    const error = new MastraError({
      id: "MASTRA_GET_SCORER_BY_ID_NOT_FOUND",
      domain: "MASTRA" /* MASTRA */,
      category: "USER" /* USER */,
      text: `Scorer with id ${String(id)} not found`
    });
    this.#logger?.trackException(error);
    throw error;
  }
  /**
   * Removes a scorer from the Mastra instance by its key or ID.
   *
   * @param keyOrId - The scorer key or ID to remove
   * @returns true if a scorer was removed, false if no scorer was found
   */
  removeScorer(keyOrId) {
    const scorers = this.#scorers;
    if (!scorers) return false;
    if (scorers[keyOrId]) {
      const scorerId = scorers[keyOrId]?.id;
      delete scorers[keyOrId];
      if (scorerId) {
        this.#storedScorersCache.delete(scorerId);
      }
      return true;
    }
    const key = Object.keys(scorers).find((k) => scorers[k]?.id === keyOrId || scorers[k]?.name === keyOrId);
    if (key) {
      const scorerId = scorers[key]?.id;
      delete scorers[key];
      if (scorerId) {
        this.#storedScorersCache.delete(scorerId);
      }
      return true;
    }
    return false;
  }
  // =========================================================================
  // Prompt Blocks
  // =========================================================================
  /**
   * Returns all registered prompt blocks.
   */
  listPromptBlocks() {
    return this.#promptBlocks;
  }
  /**
   * Registers a prompt block in the Mastra instance's runtime registry.
   *
   * @param promptBlock - The resolved prompt block to register
   * @param key - Optional registration key (defaults to promptBlock.id)
   */
  addPromptBlock(promptBlock, key) {
    const blockKey = key || promptBlock.id;
    if (this.#promptBlocks[blockKey]) {
      return;
    }
    this.#promptBlocks[blockKey] = promptBlock;
  }
  /**
   * Retrieves a registered prompt block by its key.
   *
   * @throws {MastraError} When the prompt block with the specified key is not found
   */
  getPromptBlock(key) {
    const block = this.#promptBlocks[key];
    if (!block) {
      throw new MastraError({
        id: "MASTRA_GET_PROMPT_BLOCK_NOT_FOUND",
        domain: "MASTRA" /* MASTRA */,
        category: "USER" /* USER */,
        text: `Prompt block with key ${key} not found`
      });
    }
    return block;
  }
  /**
   * Retrieves a registered prompt block by its ID.
   *
   * @throws {MastraError} When no prompt block is found with the specified ID
   */
  getPromptBlockById(id) {
    for (const [, block] of Object.entries(this.#promptBlocks)) {
      if (block.id === id) {
        return block;
      }
    }
    throw new MastraError({
      id: "MASTRA_GET_PROMPT_BLOCK_BY_ID_NOT_FOUND",
      domain: "MASTRA" /* MASTRA */,
      category: "USER" /* USER */,
      text: `Prompt block with id ${id} not found`
    });
  }
  /**
   * Removes a prompt block from the Mastra instance by its key or ID.
   *
   * @param keyOrId - The prompt block key or ID to remove
   * @returns true if a prompt block was removed, false if not found
   */
  removePromptBlock(keyOrId) {
    if (this.#promptBlocks[keyOrId]) {
      delete this.#promptBlocks[keyOrId];
      return true;
    }
    const key = Object.keys(this.#promptBlocks).find((k) => this.#promptBlocks[k]?.id === keyOrId);
    if (key) {
      delete this.#promptBlocks[key];
      return true;
    }
    return false;
  }
  /**
   * Retrieves a specific tool by registration key.
   *
   * @throws {MastraError} When the specified tool is not found
   *
   * @example
   * ```typescript
   * const mastra = new Mastra({
   *   tools: {
   *     calculator: calculatorTool,
   *     weather: weatherTool
   *   }
   * });
   *
   * const tool = mastra.getTool('calculator');
   * ```
   */
  getTool(name) {
    if (!this.#tools || !this.#tools[name]) {
      const error = new MastraError({
        id: "MASTRA_GET_TOOL_BY_NAME_NOT_FOUND",
        domain: "MASTRA" /* MASTRA */,
        category: "USER" /* USER */,
        text: `Tool with name ${String(name)} not found`,
        details: {
          status: 404,
          toolName: String(name),
          tools: Object.keys(this.#tools ?? {}).join(", ")
        }
      });
      this.#logger?.trackException(error);
      throw error;
    }
    return this.#tools[name];
  }
  /**
   * Retrieves a specific tool by its ID.
   *
   * @throws {MastraError} When the specified tool is not found
   *
   * @example
   * ```typescript
   * const mastra = new Mastra({
   *   tools: {
   *     calculator: calculatorTool
   *   }
   * });
   *
   * const tool = mastra.getToolById('calculator-tool-id');
   * ```
   */
  getToolById(id) {
    const allTools = this.#tools;
    if (!allTools) {
      throw new MastraError({
        id: "MASTRA_GET_TOOL_BY_ID_NOT_FOUND",
        domain: "MASTRA" /* MASTRA */,
        category: "USER" /* USER */,
        text: `Tool with id ${id} not found`
      });
    }
    for (const tool of Object.values(allTools)) {
      if (tool.id === id) {
        return tool;
      }
    }
    const toolByKey = allTools[id];
    if (toolByKey) {
      return toolByKey;
    }
    const error = new MastraError({
      id: "MASTRA_GET_TOOL_BY_ID_NOT_FOUND",
      domain: "MASTRA" /* MASTRA */,
      category: "USER" /* USER */,
      text: `Tool with id ${id} not found`,
      details: {
        status: 404,
        toolId: String(id),
        tools: Object.keys(allTools).join(", ")
      }
    });
    this.#logger?.trackException(error);
    throw error;
  }
  /**
   * Lists all configured tools.
   *
   * @example
   * ```typescript
   * const mastra = new Mastra({
   *   tools: {
   *     calculator: calculatorTool,
   *     weather: weatherTool
   *   }
   * });
   *
   * const tools = mastra.listTools();
   * Object.entries(tools || {}).forEach(([name, tool]) => {
   *   console.log(`Tool "${name}":`, tool.id);
   * });
   * ```
   */
  listTools() {
    return this.#tools;
  }
  /**
   * Adds a new tool to the Mastra instance.
   *
   * This method allows dynamic registration of tools after the Mastra instance
   * has been created.
   *
   * @throws {MastraError} When a tool with the same key already exists
   *
   * @example
   * ```typescript
   * const mastra = new Mastra();
   * const newTool = createTool({
   *   id: 'calculator-tool',
   *   description: 'Performs calculations'
   * });
   * mastra.addTool(newTool); // Uses tool.id as key
   * // or
   * mastra.addTool(newTool, 'customKey'); // Uses custom key
   * ```
   */
  addTool(tool, key) {
    if (!tool) {
      throw createUndefinedPrimitiveError("tool", tool, key);
    }
    const toolKey = key || tool.id;
    const tools = this.#tools;
    if (tools[toolKey]) {
      return;
    }
    tools[toolKey] = tool;
  }
  /**
   * Retrieves a specific processor by registration key.
   *
   * @throws {MastraError} When the specified processor is not found
   *
   * @example
   * ```typescript
   * const mastra = new Mastra({
   *   processors: {
   *     validator: validatorProcessor,
   *     transformer: transformerProcessor
   *   }
   * });
   *
   * const processor = mastra.getProcessor('validator');
   * ```
   */
  getProcessor(name) {
    if (!this.#processors || !this.#processors[name]) {
      const error = new MastraError({
        id: "MASTRA_GET_PROCESSOR_BY_NAME_NOT_FOUND",
        domain: "MASTRA" /* MASTRA */,
        category: "USER" /* USER */,
        text: `Processor with name ${String(name)} not found`,
        details: {
          status: 404,
          processorName: String(name),
          processors: Object.keys(this.#processors ?? {}).join(", ")
        }
      });
      this.#logger?.trackException(error);
      throw error;
    }
    return this.#processors[name];
  }
  /**
   * Retrieves a specific processor by its ID.
   *
   * @throws {MastraError} When the specified processor is not found
   *
   * @example
   * ```typescript
   * const mastra = new Mastra({
   *   processors: {
   *     validator: validatorProcessor
   *   }
   * });
   *
   * const processor = mastra.getProcessorById('validator-processor-id');
   * ```
   */
  getProcessorById(id) {
    const allProcessors = this.#processors;
    if (!allProcessors) {
      throw new MastraError({
        id: "MASTRA_GET_PROCESSOR_BY_ID_NOT_FOUND",
        domain: "MASTRA" /* MASTRA */,
        category: "USER" /* USER */,
        text: `Processor with id ${id} not found`
      });
    }
    for (const processor of Object.values(allProcessors)) {
      if (processor.id === id) {
        return processor;
      }
    }
    const processorByKey = allProcessors[id];
    if (processorByKey) {
      return processorByKey;
    }
    const error = new MastraError({
      id: "MASTRA_GET_PROCESSOR_BY_ID_NOT_FOUND",
      domain: "MASTRA" /* MASTRA */,
      category: "USER" /* USER */,
      text: `Processor with id ${id} not found`,
      details: {
        status: 404,
        processorId: String(id),
        processors: Object.keys(allProcessors).join(", ")
      }
    });
    this.#logger?.trackException(error);
    throw error;
  }
  /**
   * Lists all configured processors.
   *
   * @example
   * ```typescript
   * const mastra = new Mastra({
   *   processors: {
   *     validator: validatorProcessor,
   *     transformer: transformerProcessor
   *   }
   * });
   *
   * const processors = mastra.listProcessors();
   * Object.entries(processors || {}).forEach(([name, processor]) => {
   *   console.log(`Processor "${name}":`, processor.id);
   * });
   * ```
   */
  listProcessors() {
    return this.#processors;
  }
  /**
   * Adds a new processor to the Mastra instance.
   *
   * This method allows dynamic registration of processors after the Mastra instance
   * has been created.
   *
   * @throws {MastraError} When a processor with the same key already exists
   *
   * @example
   * ```typescript
   * const mastra = new Mastra();
   * const newProcessor = {
   *   id: 'text-processor',
   *   processInput: async (messages) => messages
   * };
   * mastra.addProcessor(newProcessor); // Uses processor.id as key
   * // or
   * mastra.addProcessor(newProcessor, 'customKey'); // Uses custom key
   * ```
   */
  addProcessor(processor, key) {
    if (!processor) {
      throw createUndefinedPrimitiveError("processor", processor, key);
    }
    const processorKey = key || processor.id;
    const processors = this.#processors;
    if (processors[processorKey]) {
      return;
    }
    if (typeof processor.__registerMastra === "function") {
      processor.__registerMastra(this);
    }
    processors[processorKey] = processor;
  }
  /**
   * Registers a processor configuration with agent context.
   * This tracks which agents use which processors with what configuration.
   *
   * @param processor - The processor instance
   * @param agentId - The ID of the agent that uses this processor
   * @param type - Whether this is an input or output processor
   */
  addProcessorConfiguration(processor, agentId, type) {
    const processorId = processor.id;
    if (!this.#processorConfigurations.has(processorId)) {
      this.#processorConfigurations.set(processorId, []);
    }
    const configs = this.#processorConfigurations.get(processorId);
    const exists = configs.some((c) => c.agentId === agentId && c.type === type);
    if (!exists) {
      configs.push({ processor, agentId, type });
    }
  }
  /**
   * Gets all processor configurations for a specific processor ID.
   *
   * @param processorId - The ID of the processor
   * @returns Array of configurations with agent context
   */
  getProcessorConfigurations(processorId) {
    return this.#processorConfigurations.get(processorId) || [];
  }
  /**
   * Gets all processor configurations.
   *
   * @returns Map of processor IDs to their configurations
   */
  listProcessorConfigurations() {
    return this.#processorConfigurations;
  }
  /**
   * Retrieves a registered memory instance by its registration key.
   *
   * @throws {MastraError} When the memory instance with the specified key is not found
   *
   * @example
   * ```typescript
   * const mastra = new Mastra({
   *   memory: {
   *     chat: new Memory({ storage })
   *   }
   * });
   *
   * const chatMemory = mastra.getMemory('chat');
   * ```
   */
  getMemory(name) {
    if (!this.#memory || !this.#memory[name]) {
      const error = new MastraError({
        id: "MASTRA_GET_MEMORY_BY_KEY_NOT_FOUND",
        domain: "MASTRA" /* MASTRA */,
        category: "USER" /* USER */,
        text: `Memory with key ${String(name)} not found`,
        details: {
          status: 404,
          memoryKey: String(name),
          memory: Object.keys(this.#memory ?? {}).join(", ")
        }
      });
      this.#logger?.trackException(error);
      throw error;
    }
    return this.#memory[name];
  }
  /**
   * Retrieves a registered memory instance by its ID.
   *
   * Searches through all registered memory instances and returns the one whose ID matches.
   *
   * @throws {MastraError} When no memory instance with the specified ID is found
   *
   * @example
   * ```typescript
   * const mastra = new Mastra({
   *   memory: {
   *     chat: new Memory({ id: 'chat-memory', storage })
   *   }
   * });
   *
   * const memory = mastra.getMemoryById('chat-memory');
   * ```
   */
  getMemoryById(id) {
    const allMemory = this.#memory;
    if (allMemory) {
      for (const [, memory] of Object.entries(allMemory)) {
        if (memory.id === id) {
          return memory;
        }
      }
    }
    const error = new MastraError({
      id: "MASTRA_GET_MEMORY_BY_ID_NOT_FOUND",
      domain: "MASTRA" /* MASTRA */,
      category: "USER" /* USER */,
      text: `Memory with id ${id} not found`,
      details: {
        status: 404,
        memoryId: id,
        availableIds: Object.values(allMemory ?? {}).map((m) => m.id).join(", ")
      }
    });
    this.#logger?.trackException(error);
    throw error;
  }
  /**
   * Returns all registered memory instances as a record keyed by their names.
   *
   * @example
   * ```typescript
   * const mastra = new Mastra({
   *   memory: {
   *     chat: new Memory({ storage }),
   *     longTerm: new Memory({ storage })
   *   }
   * });
   *
   * const allMemory = mastra.listMemory();
   * console.log(Object.keys(allMemory)); // ['chat', 'longTerm']
   * ```
   */
  listMemory() {
    return this.#memory;
  }
  /**
   * Adds a new memory instance to the Mastra instance.
   *
   * This method allows dynamic registration of memory instances after the Mastra instance
   * has been created.
   *
   * @example
   * ```typescript
   * const mastra = new Mastra();
   * const chatMemory = new Memory({
   *   id: 'chat-memory',
   *   storage: mastra.getStorage()
   * });
   * mastra.addMemory(chatMemory); // Uses memory.id as key
   * // or
   * mastra.addMemory(chatMemory, 'customKey'); // Uses custom key
   * ```
   */
  addMemory(memory, key) {
    if (!memory) {
      throw createUndefinedPrimitiveError("memory", memory, key);
    }
    const memoryKey = key || memory.id;
    const memoryRegistry = this.#memory;
    if (memoryRegistry[memoryKey]) {
      return;
    }
    memoryRegistry[memoryKey] = memory;
  }
  /**
   * Returns all registered workflows as a record keyed by their IDs.
   *
   * @example Listing all workflows
   * ```typescript
   * const mastra = new Mastra({
   *   workflows: {
   *     dataProcessor: createWorkflow({...}).commit(),
   *     emailSender: createWorkflow({...}).commit(),
   *     reportGenerator: createWorkflow({...}).commit()
   *   }
   * });
   *
   * const allWorkflows = mastra.listWorkflows();
   * console.log(Object.keys(allWorkflows)); // ['dataProcessor', 'emailSender', 'reportGenerator']
   *
   * // Execute all workflows with sample data
   * for (const [id, workflow] of Object.entries(allWorkflows)) {
   *   console.log(`Workflow ${id}:`, workflow.name);
   *   // const result = await workflow.execute(sampleData);
   * }
   * ```
   */
  listWorkflows(props = {}) {
    if (props.serialized) {
      return Object.entries(this.#workflows).reduce((acc, [k, v]) => {
        return {
          ...acc,
          [k]: { name: v.name }
        };
      }, {});
    }
    return this.#workflows;
  }
  /**
   * Adds a new workflow to the Mastra instance.
   *
   * This method allows dynamic registration of workflows after the Mastra instance
   * has been created. The workflow will be initialized with Mastra and primitives.
   *
   * @throws {MastraError} When a workflow with the same key already exists
   *
   * @example
   * ```typescript
   * const mastra = new Mastra();
   * const newWorkflow = createWorkflow({
   *   id: 'data-pipeline',
   *   name: 'Data Pipeline'
   * }).commit();
   * mastra.addWorkflow(newWorkflow); // Uses workflow.id as key
   * // or
   * mastra.addWorkflow(newWorkflow, 'customKey'); // Uses custom key
   * ```
   */
  addWorkflow(workflow, key) {
    if (!workflow) {
      throw createUndefinedPrimitiveError("workflow", workflow, key);
    }
    const workflowKey = key || workflow.id;
    const workflows = this.#workflows;
    if (workflows[workflowKey]) {
      return;
    }
    workflow.__registerMastra(this);
    workflow.__registerPrimitives({
      logger: this.getLogger(),
      storage: this.getStorage()
    });
    if (!workflow.committed) {
      workflow.commit();
    }
    workflows[workflowKey] = workflow;
  }
  /**
   * Sets the storage provider for the Mastra instance.
   *
   * @example
   * ```typescript
   * const mastra = new Mastra();
   *
   * // Set PostgreSQL storage
   * mastra.setStorage(new PostgresStore({
   *   connectionString: process.env.DATABASE_URL
   * }));
   *
   * // Now agents can use memory with the storage
   * const agent = new Agent({
   *   id: 'assistant',
   *   name: 'assistant',
   *   memory: new Memory({ storage: mastra.getStorage() })
   * });
   * ```
   */
  setStorage(storage) {
    this.#storage = augmentWithInit(storage);
  }
  setLogger({ logger }) {
    const dualLogger = new DualLogger(logger, () => this.loggerVNext);
    this.#logger = dualLogger;
    if (this.#agents) {
      Object.keys(this.#agents).forEach((key) => {
        this.#agents?.[key]?.__setLogger(this.#logger);
      });
    }
    if (this.#deployer) {
      this.#deployer.__setLogger(this.#logger);
    }
    if (this.#tts) {
      Object.keys(this.#tts).forEach((key) => {
        this.#tts?.[key]?.__setLogger(this.#logger);
      });
    }
    if (this.#storage) {
      this.#storage.__setLogger(this.#logger);
    }
    if (this.#vectors) {
      Object.keys(this.#vectors).forEach((key) => {
        this.#vectors?.[key]?.__setLogger(this.#logger);
      });
    }
    if (this.#mcpServers) {
      Object.keys(this.#mcpServers).forEach((key) => {
        this.#mcpServers?.[key]?.__setLogger(this.#logger);
      });
    }
    if (this.#workflows) {
      Object.keys(this.#workflows).forEach((key) => {
        this.#workflows?.[key]?.__setLogger(this.#logger);
      });
    }
    if (this.#serverAdapter) {
      this.#serverAdapter.__setLogger(this.#logger);
    }
    if (this.#workspace) {
      this.#workspace.__setLogger(this.#logger);
    }
    if (this.#memory) {
      Object.keys(this.#memory).forEach((key) => {
        this.#memory?.[key]?.__setLogger(this.#logger);
      });
    }
    this.#observability.setLogger({ logger });
  }
  /**
   * Gets all registered text-to-speech (TTS) providers.
   *
   * @example
   * ```typescript
   * const mastra = new Mastra({
   *   tts: {
   *     openai: new OpenAITTS({
   *       apiKey: process.env.OPENAI_API_KEY,
   *       voice: 'alloy'
   *     })
   *   }
   * });
   *
   * const ttsProviders = mastra.getTTS();
   * const openaiTTS = ttsProviders?.openai;
   * if (openaiTTS) {
   *   const audioBuffer = await openaiTTS.synthesize('Hello, world!');
   * }
   * ```
   */
  getTTS() {
    return this.#tts;
  }
  /**
   * Gets the currently configured logger instance.
   *
   * @example
   * ```typescript
   * const mastra = new Mastra({
   *   logger: new PinoLogger({
   *     name: 'MyApp',
   *     level: 'info'
   *   })
   * });
   *
   * const logger = mastra.getLogger();
   * logger.info('Application started');
   * logger.error('An error occurred', { error: 'details' });
   * ```
   */
  getLogger() {
    return this.#logger;
  }
  /**
   * Gets the currently configured storage provider.
   *
   * @example
   * ```typescript
   * const mastra = new Mastra({
   *   storage: new LibSQLStore({ id: 'mastra-storage', url: 'file:./data.db' })
   * });
   *
   * // Use the storage in agent memory
   * const agent = new Agent({
   *   id: 'assistant',
   *   name: 'assistant',
   *   memory: new Memory({
   *     storage: mastra.getStorage()
   *   })
   * });
   * ```
   */
  getStorage() {
    return this.#storage;
  }
  get observability() {
    return this.#observability;
  }
  /**
   * Structured logging API for observability.
   * Logs emitted via this API will not have trace correlation when used outside a span.
   * Use for startup logs, background jobs, or other non-traced scenarios.
   *
   * Note: For the infrastructure logger (IMastraLogger), use getLogger() instead.
   */
  get loggerVNext() {
    return this.#observability.getDefaultInstance()?.getLoggerContext?.() ?? noOpLoggerContext;
  }
  /**
   * Direct metrics API for use outside trace context.
   * Metrics emitted via this API will not have auto correlation or cost context from spans.
   * Use for background jobs, startup metrics, or other non-traced scenarios.
   */
  get metrics() {
    return this.#observability.getDefaultInstance()?.getMetricsContext?.() ?? noOpMetricsContext;
  }
  getServerMiddleware() {
    return this.#serverMiddleware;
  }
  getServerCache() {
    return this.#serverCache;
  }
  setServerMiddleware(serverMiddleware) {
    if (typeof serverMiddleware === "function") {
      this.#serverMiddleware = [
        {
          handler: serverMiddleware,
          path: "/api/*"
        }
      ];
      return;
    }
    if (!Array.isArray(serverMiddleware)) {
      const error = new MastraError({
        id: "MASTRA_SET_SERVER_MIDDLEWARE_INVALID_TYPE",
        domain: "MASTRA" /* MASTRA */,
        category: "USER" /* USER */,
        text: `Invalid middleware: expected a function or array, received ${typeof serverMiddleware}`
      });
      this.#logger?.trackException(error);
      throw error;
    }
    this.#serverMiddleware = serverMiddleware.map((m) => {
      if (typeof m === "function") {
        return {
          handler: m,
          path: "/api/*"
        };
      }
      return {
        handler: m.handler,
        path: m.path || "/api/*"
      };
    });
  }
  getServer() {
    return this.#server;
  }
  /**
   * Sets the server adapter for this Mastra instance.
   *
   * The server adapter provides access to the underlying server app (e.g., Hono, Express)
   * and allows users to call routes directly via `app.fetch()` instead of making HTTP requests.
   *
   * This is typically called by `createHonoServer` or similar factory functions during
   * server initialization.
   *
   * @param adapter - The server adapter instance (e.g., MastraServer from @mastra/hono or @mastra/express)
   *
   * @example
   * ```typescript
   * const app = new Hono();
   * const adapter = new MastraServer({ app, mastra });
   * mastra.setMastraServer(adapter);
   * ```
   */
  setMastraServer(adapter) {
    if (this.#serverAdapter) {
      this.#logger?.debug(
        "Replacing existing server adapter. Only one adapter should be registered per Mastra instance."
      );
    }
    this.#serverAdapter = adapter;
    if (this.#logger) {
      adapter.__setLogger(this.#logger);
    }
  }
  /**
   * Gets the server adapter for this Mastra instance.
   *
   * @returns The server adapter, or undefined if not set
   *
   * @example
   * ```typescript
   * const adapter = mastra.getMastraServer();
   * if (adapter) {
   *   const app = adapter.getApp<Hono>();
   * }
   * ```
   */
  getMastraServer() {
    return this.#serverAdapter;
  }
  /**
   * Gets the server app from the server adapter.
   *
   * This is a convenience method that calls `getMastraServer()?.getApp<T>()`.
   * Use this to access the underlying server framework's app instance (e.g., Hono, Express)
   * for direct operations like calling routes via `app.fetch()`.
   *
   * @template T - The expected type of the app (e.g., Hono, Express Application)
   * @returns The server app, or undefined if no adapter is set
   *
   * @example
   * ```typescript
   * // After createHonoServer() is called:
   * const app = mastra.getServerApp<Hono>();
   *
   * // Call routes directly without HTTP overhead
   * const response = await app?.fetch(new Request('http://localhost/health'));
   * const data = await response?.json();
   * ```
   */
  getServerApp() {
    return this.#serverAdapter?.getApp();
  }
  getBundlerConfig() {
    return this.#bundler;
  }
  async listLogsByRunId({
    runId,
    transportId,
    fromDate,
    toDate,
    logLevel,
    filters,
    page,
    perPage
  }) {
    if (!transportId) {
      const error = new MastraError({
        id: "MASTRA_LIST_LOGS_BY_RUN_ID_MISSING_TRANSPORT",
        domain: "MASTRA" /* MASTRA */,
        category: "USER" /* USER */,
        text: "Transport ID is required",
        details: {
          runId,
          transportId
        }
      });
      this.#logger?.trackException(error);
      throw error;
    }
    if (!this.#logger?.listLogsByRunId) {
      const error = new MastraError({
        id: "MASTRA_GET_LOGS_BY_RUN_ID_LOGGER_NOT_CONFIGURED",
        domain: "MASTRA" /* MASTRA */,
        category: "SYSTEM" /* SYSTEM */,
        text: "Logger is not configured or does not support listLogsByRunId operation",
        details: {
          runId,
          transportId
        }
      });
      this.#logger?.trackException(error);
      throw error;
    }
    return await this.#logger.listLogsByRunId({
      runId,
      transportId,
      fromDate,
      toDate,
      logLevel,
      filters,
      page,
      perPage
    });
  }
  async listLogs(transportId, params) {
    if (!transportId) {
      const error = new MastraError({
        id: "MASTRA_GET_LOGS_MISSING_TRANSPORT",
        domain: "MASTRA" /* MASTRA */,
        category: "USER" /* USER */,
        text: "Transport ID is required",
        details: {
          transportId
        }
      });
      this.#logger?.trackException(error);
      throw error;
    }
    if (!this.#logger) {
      const error = new MastraError({
        id: "MASTRA_GET_LOGS_LOGGER_NOT_CONFIGURED",
        domain: "MASTRA" /* MASTRA */,
        category: "SYSTEM" /* SYSTEM */,
        text: "Logger is not set",
        details: {
          transportId
        }
      });
      throw error;
    }
    return await this.#logger.listLogs(transportId, params);
  }
  /**
   * Gets all registered Model Context Protocol (MCP) server instances.
   *
   * @example
   * ```typescript
   * const mastra = new Mastra({
   *   mcpServers: {
   *     filesystem: new FileSystemMCPServer({
   *       rootPath: '/app/data'
   *     })
   *   }
   * });
   *
   * const mcpServers = mastra.getMCPServers();
   * if (mcpServers) {
   *   const fsServer = mcpServers.filesystem;
   *   const tools = await fsServer.listTools();
   * }
   * ```
   */
  listMCPServers() {
    return this.#mcpServers;
  }
  /**
   * Adds a new MCP server to the Mastra instance.
   *
   * This method allows dynamic registration of MCP servers after the Mastra instance
   * has been created. The server will be initialized with ID, Mastra instance, and logger.
   *
   * @throws {MastraError} When an MCP server with the same key already exists
   *
   * @example
   * ```typescript
   * const mastra = new Mastra();
   * const newServer = new FileSystemMCPServer({
   *   rootPath: '/data'
   * });
   * mastra.addMCPServer(newServer); // Uses server.id as key
   * // or
   * mastra.addMCPServer(newServer, 'customKey'); // Uses custom key
   * ```
   */
  addMCPServer(server, key) {
    if (!server) {
      throw createUndefinedPrimitiveError("mcp-server", server, key);
    }
    if (key) {
      server.setId(key);
    }
    const resolvedId = server.id;
    if (!resolvedId) {
      const error = new MastraError({
        id: "MASTRA_ADD_MCP_SERVER_MISSING_ID",
        domain: "MASTRA" /* MASTRA */,
        category: "USER" /* USER */,
        text: "MCP server must expose an id or be registered under one",
        details: { status: 400 }
      });
      this.#logger?.trackException(error);
      throw error;
    }
    const serverKey = key ?? resolvedId;
    const servers = this.#mcpServers;
    if (servers[serverKey]) {
      return;
    }
    server.__registerMastra(this);
    server.__setLogger(this.getLogger());
    servers[serverKey] = server;
  }
  /**
   * Retrieves a specific MCP server instance by registration key.
   *
   * @throws {MastraError} When the specified MCP server is not found
   *
   * @example
   * ```typescript
   * const mastra = new Mastra({
   *   mcpServers: {
   *     filesystem: new FileSystemMCPServer({...})
   *   }
   * });
   *
   * const fsServer = mastra.getMCPServer('filesystem');
   * const tools = await fsServer.listTools();
   * ```
   */
  getMCPServer(name) {
    if (!this.#mcpServers || !this.#mcpServers[name]) {
      this.#logger?.debug(`MCP server with name ${String(name)} not found`);
      return void 0;
    }
    return this.#mcpServers[name];
  }
  /**
   * Retrieves a specific Model Context Protocol (MCP) server instance by its logical ID.
   *
   * This method searches for an MCP server using its logical ID. If a version is specified,
   * it returns the exact version match. If no version is provided, it returns the server
   * with the most recent release date.
   *
   * @example
   * ```typescript
   * const mastra = new Mastra({
   *   mcpServers: {
   *     filesystem: new FileSystemMCPServer({
   *       id: 'fs-server',
   *       version: '1.0.0',
   *       rootPath: '/app/data'
   *     })
   *   }
   * });
   *
   * const fsServer = mastra.getMCPServerById('fs-server');
   * if (fsServer) {
   *   const tools = await fsServer.listTools();
   * }
   * ```
   */
  getMCPServerById(serverId, version) {
    if (!this.#mcpServers) {
      return void 0;
    }
    const allRegisteredServers = Object.values(this.#mcpServers || {});
    const matchingLogicalIdServers = allRegisteredServers.filter((server) => server.id === serverId);
    if (matchingLogicalIdServers.length === 0) {
      this.#logger?.debug(`No MCP servers found with logical ID: ${serverId}`);
      return void 0;
    }
    if (version) {
      const specificVersionServer = matchingLogicalIdServers.find((server) => server.version === version);
      if (!specificVersionServer) {
        this.#logger?.debug(`MCP server with logical ID '${serverId}' found, but not version '${version}'.`);
      }
      return specificVersionServer;
    } else {
      if (matchingLogicalIdServers.length === 1) {
        return matchingLogicalIdServers[0];
      }
      matchingLogicalIdServers.sort((a, b) => {
        const dateAVal = a.releaseDate && typeof a.releaseDate === "string" ? new Date(a.releaseDate).getTime() : NaN;
        const dateBVal = b.releaseDate && typeof b.releaseDate === "string" ? new Date(b.releaseDate).getTime() : NaN;
        if (isNaN(dateAVal) && isNaN(dateBVal)) return 0;
        if (isNaN(dateAVal)) return 1;
        if (isNaN(dateBVal)) return -1;
        return dateBVal - dateAVal;
      });
      if (matchingLogicalIdServers.length > 0) {
        const latestServer = matchingLogicalIdServers[0];
        if (latestServer && latestServer.releaseDate && typeof latestServer.releaseDate === "string" && !isNaN(new Date(latestServer.releaseDate).getTime())) {
          return latestServer;
        }
      }
      this.#logger?.warn(
        `Could not determine the latest server for logical ID '${serverId}' due to invalid or missing release dates, or no servers left after filtering.`
      );
      return void 0;
    }
  }
  async addTopicListener(topic, listener) {
    await this.#pubsub.subscribe(topic, listener);
  }
  async removeTopicListener(topic, listener) {
    await this.#pubsub.unsubscribe(topic, listener);
  }
  async startEventEngine() {
    for (const topic in this.#events) {
      if (!this.#events[topic]) {
        continue;
      }
      const listeners = Array.isArray(this.#events[topic]) ? this.#events[topic] : [this.#events[topic]];
      for (const listener of listeners) {
        await this.#pubsub.subscribe(topic, listener);
      }
    }
  }
  async stopEventEngine() {
    for (const topic in this.#events) {
      if (!this.#events[topic]) {
        continue;
      }
      const listeners = Array.isArray(this.#events[topic]) ? this.#events[topic] : [this.#events[topic]];
      for (const listener of listeners) {
        await this.#pubsub.unsubscribe(topic, listener);
      }
    }
    await this.#pubsub.flush();
  }
  /**
   * Retrieves a registered gateway by its key.
   *
   * @throws {MastraError} When the gateway with the specified key is not found
   *
   * @example
   * ```typescript
   * const mastra = new Mastra({
   *   gateways: {
   *     myGateway: new CustomGateway()
   *   }
   * });
   *
   * const gateway = mastra.getGateway('myGateway');
   * ```
   */
  getGateway(key) {
    const gateway = this.#gateways?.[key];
    if (!gateway) {
      const error = new MastraError({
        id: "MASTRA_GET_GATEWAY_BY_KEY_NOT_FOUND",
        domain: "MASTRA" /* MASTRA */,
        category: "USER" /* USER */,
        text: `Gateway with key ${key} not found`,
        details: {
          status: 404,
          gatewayKey: key,
          gateways: Object.keys(this.#gateways ?? {}).join(", ")
        }
      });
      this.#logger?.trackException(error);
      throw error;
    }
    return gateway;
  }
  /**
   * Retrieves a registered gateway by its ID.
   *
   * Searches through all registered gateways and returns the one whose ID matches.
   * If a gateway doesn't have an explicit ID, its name is used as the ID.
   *
   * @throws {MastraError} When no gateway with the specified ID is found
   *
   * @example
   * ```typescript
   * class CustomGateway extends MastraModelGateway {
   *   readonly id = 'custom-gateway-v1';
   *   readonly name = 'Custom Gateway';
   *   // ...
   * }
   *
   * const mastra = new Mastra({
   *   gateways: {
   *     myGateway: new CustomGateway()
   *   }
   * });
   *
   * const gateway = mastra.getGatewayById('custom-gateway-v1');
   * ```
   */
  getGatewayById(id) {
    const gateways = this.#gateways ?? {};
    for (const gateway of Object.values(gateways)) {
      if (gateway.getId() === id) {
        return gateway;
      }
    }
    const error = new MastraError({
      id: "MASTRA_GET_GATEWAY_BY_ID_NOT_FOUND",
      domain: "MASTRA" /* MASTRA */,
      category: "USER" /* USER */,
      text: `Gateway with ID ${id} not found`,
      details: {
        status: 404,
        gatewayId: id,
        availableIds: Object.values(gateways).map((g) => g.getId()).join(", ")
      }
    });
    this.#logger?.trackException(error);
    throw error;
  }
  /**
   * Returns all registered gateways as a record keyed by their names.
   *
   * @example
   * ```typescript
   * const mastra = new Mastra({
   *   gateways: {
   *     netlify: new NetlifyGateway(),
   *     custom: new CustomGateway()
   *   }
   * });
   *
   * const allGateways = mastra.listGateways();
   * console.log(Object.keys(allGateways)); // ['netlify', 'custom']
   * ```
   */
  listGateways() {
    return this.#gateways;
  }
  /**
   * Adds a new gateway to the Mastra instance.
   *
   * This method allows dynamic registration of gateways after the Mastra instance
   * has been created. Gateways enable access to LLM providers through custom
   * authentication and routing logic.
   *
   * If no key is provided, the gateway's ID (or name if no ID is set) will be used as the key.
   *
   * @example
   * ```typescript
   * import { MastraModelGateway } from '@mastra/core';
   *
   * class CustomGateway extends MastraModelGateway {
   *   readonly id = 'custom-gateway-v1';  // Optional, defaults to name
   *   readonly name = 'custom';
   *   readonly prefix = 'custom';
   *
   *   async fetchProviders() {
   *     return {
   *       myProvider: {
   *         name: 'My Provider',
   *         models: ['model-1', 'model-2'],
   *         apiKeyEnvVar: 'MY_API_KEY',
   *         gateway: 'custom'
   *       }
   *     };
   *   }
   *
   *   buildUrl(modelId: string) {
   *     return 'https://api.myprovider.com/v1';
   *   }
   *
   *   async getApiKey(modelId: string) {
   *     return process.env.MY_API_KEY || '';
   *   }
   *
   *   async resolveLanguageModel({ modelId, providerId, apiKey }) {
   *     const baseURL = this.buildUrl(`${providerId}/${modelId}`);
   *     return createOpenAICompatible({
   *       name: providerId,
   *       apiKey,
   *       baseURL,
   *       supportsStructuredOutputs: true,
   *     }).chatModel(modelId);
   *   }
   * }
   *
   * const mastra = new Mastra();
   * const newGateway = new CustomGateway();
   * mastra.addGateway(newGateway); // Uses gateway.getId() as key (gateway.id)
   * // or
   * mastra.addGateway(newGateway, 'customKey'); // Uses custom key
   * ```
   */
  addGateway(gateway, key) {
    if (!gateway) {
      throw createUndefinedPrimitiveError("gateway", gateway, key);
    }
    const gatewayKey = key || gateway.getId();
    const gateways = this.#gateways;
    if (gateways[gatewayKey]) {
      return;
    }
    gateways[gatewayKey] = gateway;
    this.#syncGatewayRegistry();
  }
  /**
   * Sync custom gateways with the GatewayRegistry for type generation
   * @private
   */
  #syncGatewayRegistry() {
    try {
      if (process.env.MASTRA_DEV !== "true" && process.env.MASTRA_DEV !== "1") {
        return;
      }
      import('./provider-registry-7BH6TXBL.mjs').then(async ({ GatewayRegistry }) => {
        const registry = GatewayRegistry.getInstance();
        const customGateways = Object.values(this.#gateways || {});
        registry.registerCustomGateways(customGateways);
        const logger = this.getLogger();
        logger.info("\u{1F504} Syncing custom gateway types...");
        await registry.syncGateways(true);
        logger.info("\u2705 Custom gateway types synced! Restart your TypeScript server to see autocomplete.");
      }).catch((err) => {
        const logger = this.getLogger();
        logger.debug("Gateway registry sync skipped:", err);
      });
    } catch (err) {
      const logger = this.getLogger();
      logger.debug("Gateway registry sync failed:", err);
    }
  }
  /**
   * Gracefully shuts down the Mastra instance and cleans up all resources.
   *
   * This method performs a clean shutdown of all Mastra components, including:
   * - tracing registry and all tracing instances
   * - Event engine and pub/sub system
   * - All registered components and their resources
   *
   * It's important to call this method when your application is shutting down
   * to ensure proper cleanup and prevent resource leaks.
   *
   * @example
   * ```typescript
   * const mastra = new Mastra({
   *   agents: { myAgent },
   *   workflows: { myWorkflow }
   * });
   *
   * // Graceful shutdown on SIGINT
   * process.on('SIGINT', async () => {
   *   await mastra.shutdown();
   *   process.exit(0);
   * });
   * ```
   */
  async shutdown() {
    await this.stopEventEngine();
    await this.#observability.shutdown();
    this.#logger?.info("Mastra shutdown completed");
  }
  // This method is only used internally for server hnadlers that require temporary persistence
  get serverCache() {
    return this.#serverCache;
  }
};

export { Mastra };
//# sourceMappingURL=@mastra__core.mjs.map
