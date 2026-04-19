import { E as EntityType } from './chunk-OSVQQ7QZ.mjs';

// src/observability/utils.ts
var entityTypeValues = new Set(Object.values(EntityType));
var currentSpanResolver;
function setCurrentSpanResolver(resolver) {
  currentSpanResolver = resolver;
}
function resolveCurrentSpan() {
  return currentSpanResolver?.();
}
var executeWithContextImpl;
var executeWithContextSyncImpl;
function setExecuteWithContext(impl) {
  executeWithContextImpl = impl;
}
function setExecuteWithContextSync(impl) {
  executeWithContextSyncImpl = impl;
}
async function executeWithContext(params) {
  if (executeWithContextImpl) {
    return executeWithContextImpl(params);
  }
  const { span, fn } = params;
  if (span?.executeInContext) {
    return span.executeInContext(fn);
  }
  return fn();
}
function executeWithContextSync(params) {
  if (executeWithContextSyncImpl) {
    return executeWithContextSyncImpl(params);
  }
  const { span, fn } = params;
  if (span?.executeInContextSync) {
    return span.executeInContextSync(fn);
  }
  return fn();
}
function getOrCreateSpan(options) {
  const { type, attributes, tracingContext, requestContext, tracingOptions, ...rest } = options;
  const metadata = {
    ...rest.metadata ?? {},
    ...tracingOptions?.metadata ?? {}
  };
  if (tracingContext?.currentSpan) {
    return tracingContext.currentSpan.createChildSpan({
      type,
      attributes,
      ...rest,
      metadata,
      requestContext
    });
  }
  const instance = options.mastra?.observability?.getSelectedInstance({ requestContext });
  return instance?.startSpan({
    type,
    attributes,
    ...rest,
    metadata,
    requestContext,
    tracingOptions,
    traceId: tracingOptions?.traceId,
    parentSpanId: tracingOptions?.parentSpanId,
    customSamplerOptions: {
      requestContext,
      metadata
    }
  });
}
function getRootExportSpan(span) {
  if (!span?.isValid) {
    return void 0;
  }
  let current = span;
  let rootExportSpan = span.isInternal ? void 0 : span;
  while (current?.parent) {
    current = current.parent;
    if (!current.isInternal) {
      rootExportSpan = current;
    }
  }
  return rootExportSpan;
}
function getEntityTypeForSpan(span) {
  if (span.entityType && entityTypeValues.has(span.entityType)) {
    return span.entityType;
  }
  switch (span.spanType) {
    case "agent_run" /* AGENT_RUN */:
      return EntityType.AGENT;
    case "scorer_run" /* SCORER_RUN */:
    case "scorer_step" /* SCORER_STEP */:
      return EntityType.SCORER;
    case "workflow_run" /* WORKFLOW_RUN */:
      return EntityType.WORKFLOW_RUN;
    case "workflow_step" /* WORKFLOW_STEP */:
      return EntityType.WORKFLOW_STEP;
    case "tool_call" /* TOOL_CALL */:
    case "mcp_tool_call" /* MCP_TOOL_CALL */:
      return EntityType.TOOL;
    case "processor_run" /* PROCESSOR_RUN */:
      return EntityType.OUTPUT_PROCESSOR;
    default:
      return void 0;
  }
}

// src/observability/no-op.ts
var noOpCounter = {
  add() {
  }
};
var noOpGauge = {
  set() {
  }
};
var noOpHistogram = {
  record() {
  }
};
var noOpTracingContext = {
  currentSpan: void 0
};
var noOpLoggerContext = {
  debug() {
  },
  info() {
  },
  warn() {
  },
  error() {
  },
  fatal() {
  }
};
var noOpMetricsContext = {
  emit() {
  },
  counter() {
    return noOpCounter;
  },
  gauge() {
    return noOpGauge;
  },
  histogram() {
    return noOpHistogram;
  }
};
var NoOpObservability = class {
  setMastraContext(_options) {
    return;
  }
  setLogger(_options) {
    return;
  }
  getSelectedInstance(_options) {
    return;
  }
  async getRecordedTrace(_args) {
    return null;
  }
  async addScore(_args) {
    return;
  }
  async addFeedback(_args) {
    return;
  }
  registerInstance(_name, _instance, _isDefault = false) {
    return;
  }
  getInstance(_name) {
    return;
  }
  getDefaultInstance() {
    return;
  }
  listInstances() {
    return /* @__PURE__ */ new Map();
  }
  unregisterInstance(_name) {
    return false;
  }
  hasInstance(_name) {
    return false;
  }
  setConfigSelector(_selector) {
    return;
  }
  clear() {
    return;
  }
  async shutdown() {
    return;
  }
};

// src/observability/context-factory.ts
function deriveLoggerContext(tracing) {
  const span = tracing.currentSpan;
  return span?.observabilityInstance?.getLoggerContext?.(span) ?? noOpLoggerContext;
}
function deriveMetricsContext(tracing) {
  const span = tracing.currentSpan;
  return span?.observabilityInstance?.getMetricsContext?.(span) ?? noOpMetricsContext;
}
function createObservabilityContext(tracingContext) {
  const tracing = tracingContext ?? noOpTracingContext;
  return {
    tracing,
    loggerVNext: deriveLoggerContext(tracing),
    metrics: deriveMetricsContext(tracing),
    tracingContext: tracing
    // alias — preferred at forwarding sites
  };
}
function resolveObservabilityContext(partial) {
  const tracing = partial.tracing ?? partial.tracingContext ?? noOpTracingContext;
  return {
    tracing,
    loggerVNext: partial.loggerVNext ?? deriveLoggerContext(tracing),
    metrics: partial.metrics ?? deriveMetricsContext(tracing),
    tracingContext: tracing
    // alias — preferred at forwarding sites
  };
}

// src/observability/context.ts
var AGENT_GETTERS = ["getAgent", "getAgentById"];
var AGENT_METHODS_TO_WRAP = ["generate", "stream", "generateLegacy", "streamLegacy"];
var WORKFLOW_GETTERS = ["getWorkflow", "getWorkflowById"];
var WORKFLOW_METHODS_TO_WRAP = ["execute", "createRun", "createRun"];
function isNoOpSpan(span) {
  return span.constructor.name === "NoOpSpan" || span.__isNoOp === true;
}
function isMastra(mastra) {
  const hasAgentGetters = AGENT_GETTERS.every((method) => typeof mastra?.[method] === "function");
  const hasWorkflowGetters = WORKFLOW_GETTERS.every((method) => typeof mastra?.[method] === "function");
  return hasAgentGetters && hasWorkflowGetters;
}
function wrapMastra(mastra, tracingContext) {
  if (!tracingContext.currentSpan || isNoOpSpan(tracingContext.currentSpan)) {
    return mastra;
  }
  if (!isMastra(mastra)) {
    return mastra;
  }
  try {
    return new Proxy(mastra, {
      get(target, prop) {
        try {
          if (AGENT_GETTERS.includes(prop)) {
            return (...args) => {
              const agent = target[prop](...args);
              return wrapAgent(agent, tracingContext);
            };
          }
          if (WORKFLOW_GETTERS.includes(prop)) {
            return (...args) => {
              const workflow = target[prop](...args);
              return wrapWorkflow(workflow, tracingContext);
            };
          }
          const value = target[prop];
          return typeof value === "function" ? value.bind(target) : value;
        } catch (error) {
          console.warn("Tracing: Failed to wrap method, falling back to original", error);
          const value = target[prop];
          return typeof value === "function" ? value.bind(target) : value;
        }
      }
    });
  } catch (error) {
    console.warn("Tracing: Failed to create proxy, using original Mastra instance", error);
    return mastra;
  }
}
function wrapAgent(agent, tracingContext) {
  if (!tracingContext.currentSpan || isNoOpSpan(tracingContext.currentSpan)) {
    return agent;
  }
  try {
    return new Proxy(agent, {
      get(target, prop) {
        try {
          if (AGENT_METHODS_TO_WRAP.includes(prop)) {
            return (input, options = {}) => {
              return target[prop](input, {
                ...options,
                ...createObservabilityContext(tracingContext)
              });
            };
          }
          const value = target[prop];
          return typeof value === "function" ? value.bind(target) : value;
        } catch (error) {
          console.warn("Tracing: Failed to wrap agent method, falling back to original", error);
          const value = target[prop];
          return typeof value === "function" ? value.bind(target) : value;
        }
      }
    });
  } catch (error) {
    console.warn("Tracing: Failed to create agent proxy, using original instance", error);
    return agent;
  }
}
function wrapWorkflow(workflow, tracingContext) {
  if (!tracingContext.currentSpan || isNoOpSpan(tracingContext.currentSpan)) {
    return workflow;
  }
  try {
    return new Proxy(workflow, {
      get(target, prop) {
        try {
          if (WORKFLOW_METHODS_TO_WRAP.includes(prop)) {
            if (prop === "createRun" || prop === "createRun") {
              return async (options = {}) => {
                const run = await target[prop](options);
                return run ? wrapRun(run, tracingContext) : run;
              };
            }
            return (input, options = {}) => {
              return target[prop](input, {
                ...options,
                ...createObservabilityContext(tracingContext)
              });
            };
          }
          const value = target[prop];
          return typeof value === "function" ? value.bind(target) : value;
        } catch (error) {
          console.warn("Tracing: Failed to wrap workflow method, falling back to original", error);
          const value = target[prop];
          return typeof value === "function" ? value.bind(target) : value;
        }
      }
    });
  } catch (error) {
    console.warn("Tracing: Failed to create workflow proxy, using original instance", error);
    return workflow;
  }
}
function wrapRun(run, tracingContext) {
  if (!tracingContext.currentSpan || isNoOpSpan(tracingContext.currentSpan)) {
    return run;
  }
  try {
    return new Proxy(run, {
      get(target, prop) {
        try {
          if (prop === "start") {
            return (startOptions = {}) => {
              return target.start({
                ...startOptions,
                ...createObservabilityContext(startOptions.tracingContext ?? tracingContext)
              });
            };
          }
          const value = target[prop];
          return typeof value === "function" ? value.bind(target) : value;
        } catch (error) {
          console.warn("Tracing: Failed to wrap run method, falling back to original", error);
          const value = target[prop];
          return typeof value === "function" ? value.bind(target) : value;
        }
      }
    });
  } catch (error) {
    console.warn("Tracing: Failed to create run proxy, using original instance", error);
    return run;
  }
}

export { NoOpObservability as N, setCurrentSpanResolver as a, setExecuteWithContextSync as b, createObservabilityContext as c, noOpMetricsContext as d, executeWithContext as e, executeWithContextSync as f, getEntityTypeForSpan as g, resolveCurrentSpan as h, getOrCreateSpan as i, getRootExportSpan as j, noOpLoggerContext as n, resolveObservabilityContext as r, setExecuteWithContext as s, wrapMastra as w };
//# sourceMappingURL=observability.mjs.map
