import { c as createWorkspaceTools, a as createSkillTools } from './chunk-DNLZ6XAZ.mjs';
import { M as MessageList, p as parsePartialJson, A as APICallError, b as coreContentToString, i as isDeepEqualData, s as stepCountIs, g as generateId, d as isAbortError, e as sanitizeToolName, f as injectJsonInstructionIntoMessages, t as tool, h as asSchema } from './chunk-EQOFWEGB.mjs';
import { M as MastraError, g as getErrorFromUnknown } from './error.mjs';
import { M as MastraBase, R as RegisteredLogger, C as ConsoleLogger } from './chunk-WENZPAHS.mjs';
import 'stream';
import { g as getDefaultExportFromCjs } from './_commonjsHelpers.mjs';
import { r as resolveModelConfig, M as ModelRouterLanguageModel, j as ModelRouterEmbeddingModel, k as MastraLLMV1 } from './chunk-XB6GFZYC.mjs';
import { h as resolveCurrentSpan, r as resolveObservabilityContext, c as createObservabilityContext, e as executeWithContext, i as getOrCreateSpan, j as getRootExportSpan, w as wrapMastra, f as executeWithContextSync } from './observability.mjs';
import { h as ensureToolProperties, m as makeCoreTool, k as createMastraProxy, w as wrapSchemaWithNullTransform, l as deepMerge, s as safeStringify, r as removeUndefinedValues, g as generateEmptyFromSchema, T as ToolStream, n as selectFields, f as delay, o as ensureSerializable, i as isZodType } from './chunk-L43DNVPR.mjs';
import { T as Tool, c as createTool, i as isMastraTool, a as isProviderTool, g as getProviderToolName, b as isProviderDefinedTool } from './tools.mjs';
import { t as toStandardSchema5, s as standardSchemaToJSONSchema, i as isStandardSchemaWithJSON } from './schema.mjs';
import { E as EntityType } from './chunk-OSVQQ7QZ.mjs';
import { R as RequestContext, M as MASTRA_THREAD_ID_KEY, a as MASTRA_RESOURCE_ID_KEY } from './request-context.mjs';
import { k as __commonJS, l as __toESM } from './chunk-SFTERBTR.mjs';
import { randomUUID } from 'crypto';
import { TransformStream, ReadableStream as ReadableStream$1, WritableStream as WritableStream$1 } from 'stream/web';
import 'fs';
import 'path';
import { p as prepareJsonSchemaForOpenAIStrictMode } from './zod-to-json.mjs';
import { o as object, s as string, l as literal, u as union, B as _instanceof, h as unknown, _ as _enum, b as array, r as record, C as custom, n as number, A as discriminatedUnion, a as any, e as boolean, d as date$1 } from './schemas.mjs';
import { d as date } from './coerce.mjs';
import { o as objectType, s as stringType } from './types.mjs';

// src/voice/voice.ts
var MastraVoice = class extends MastraBase {
  listeningModel;
  speechModel;
  speaker;
  realtimeConfig;
  constructor({ listeningModel, speechModel, speaker, realtimeConfig, name } = {}) {
    super({
      component: "VOICE",
      name
    });
    this.listeningModel = listeningModel;
    this.speechModel = speechModel;
    this.speaker = speaker;
    this.realtimeConfig = realtimeConfig;
  }
  updateConfig(_options) {
    this.logger.debug("updateConfig not implemented by this voice provider");
  }
  /**
   * Initializes a WebSocket or WebRTC connection for real-time communication
   * @returns Promise that resolves when the connection is established
   */
  connect(_options) {
    this.logger.debug("connect not implemented by this voice provider");
    return Promise.resolve();
  }
  /**
   * Relay audio data to the voice provider for real-time processing
   * @param audioData Audio data to relay
   */
  send(_audioData) {
    this.logger.debug("relay not implemented by this voice provider");
    return Promise.resolve();
  }
  /**
   * Trigger voice providers to respond
   */
  answer(_options) {
    this.logger.debug("answer not implemented by this voice provider");
    return Promise.resolve();
  }
  /**
   * Equip the voice provider with instructions
   * @param instructions Instructions to add
   */
  addInstructions(_instructions) {
  }
  /**
   * Equip the voice provider with tools
   * @param tools Array of tools to add
   */
  addTools(_tools) {
  }
  /**
   * Disconnect from the WebSocket or WebRTC connection
   */
  close() {
    this.logger.debug("close not implemented by this voice provider");
  }
  /**
   * Register an event listener
   * @param event Event name (e.g., 'speaking', 'writing', 'error')
   * @param callback Callback function that receives event data
   */
  on(_event, _callback) {
    this.logger.debug("on not implemented by this voice provider");
  }
  /**
   * Remove an event listener
   * @param event Event name (e.g., 'speaking', 'writing', 'error')
   * @param callback Callback function to remove
   */
  off(_event, _callback) {
    this.logger.debug("off not implemented by this voice provider");
  }
  /**
   * Get available speakers/voices
   * @returns Array of available voice IDs and their metadata
   */
  getSpeakers() {
    this.logger.debug("getSpeakers not implemented by this voice provider");
    return Promise.resolve([]);
  }
  /**
   * Get available speakers/voices
   * @returns Array of available voice IDs and their metadata
   */
  getListener() {
    this.logger.debug("getListener not implemented by this voice provider");
    return Promise.resolve({ enabled: false });
  }
};

// src/voice/default-voice.ts
var DefaultVoice = class extends MastraVoice {
  constructor() {
    super();
  }
  async speak(_input) {
    throw new MastraError({
      id: "VOICE_DEFAULT_NO_SPEAK_PROVIDER",
      text: "No voice provider configured",
      domain: "MASTRA_VOICE" /* MASTRA_VOICE */,
      category: "USER" /* USER */
    });
  }
  async listen(_input) {
    throw new MastraError({
      id: "VOICE_DEFAULT_NO_LISTEN_PROVIDER",
      text: "No voice provider configured",
      domain: "MASTRA_VOICE" /* MASTRA_VOICE */,
      category: "USER" /* USER */
    });
  }
  async getSpeakers() {
    throw new MastraError({
      id: "VOICE_DEFAULT_NO_SPEAKERS_PROVIDER",
      text: "No voice provider configured",
      domain: "MASTRA_VOICE" /* MASTRA_VOICE */,
      category: "USER" /* USER */
    });
  }
  async getListener() {
    throw new MastraError({
      id: "VOICE_DEFAULT_NO_LISTENER_PROVIDER",
      text: "No voice provider configured",
      domain: "MASTRA_VOICE" /* MASTRA_VOICE */,
      category: "USER" /* USER */
    });
  }
};

// src/workflows/constants.ts
var PUBSUB_SYMBOL = /* @__PURE__ */ Symbol("pubsub");
var STREAM_FORMAT_SYMBOL = /* @__PURE__ */ Symbol("stream_format");

var events = {exports: {}};

events.exports;

var R$1 = typeof Reflect === 'object' ? Reflect : null;
var ReflectApply = R$1 && typeof R$1.apply === 'function'
  ? R$1.apply
  : function ReflectApply(target, receiver, args) {
    return Function.prototype.apply.call(target, receiver, args);
  };

var ReflectOwnKeys;
if (R$1 && typeof R$1.ownKeys === 'function') {
  ReflectOwnKeys = R$1.ownKeys;
} else if (Object.getOwnPropertySymbols) {
  ReflectOwnKeys = function ReflectOwnKeys(target) {
    return Object.getOwnPropertyNames(target)
      .concat(Object.getOwnPropertySymbols(target));
  };
} else {
  ReflectOwnKeys = function ReflectOwnKeys(target) {
    return Object.getOwnPropertyNames(target);
  };
}

function ProcessEmitWarning(warning) {
  if (console && console.warn) console.warn(warning);
}

var NumberIsNaN = Number.isNaN || function NumberIsNaN(value) {
  return value !== value;
};

function EventEmitter() {
  EventEmitter.init.call(this);
}
events.exports = EventEmitter;
events.exports.once = once;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._eventsCount = 0;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
var defaultMaxListeners = 10;

function checkListener(listener) {
  if (typeof listener !== 'function') {
    throw new TypeError('The "listener" argument must be of type Function. Received type ' + typeof listener);
  }
}

Object.defineProperty(EventEmitter, 'defaultMaxListeners', {
  enumerable: true,
  get: function() {
    return defaultMaxListeners;
  },
  set: function(arg) {
    if (typeof arg !== 'number' || arg < 0 || NumberIsNaN(arg)) {
      throw new RangeError('The value of "defaultMaxListeners" is out of range. It must be a non-negative number. Received ' + arg + '.');
    }
    defaultMaxListeners = arg;
  }
});

EventEmitter.init = function() {

  if (this._events === undefined ||
      this._events === Object.getPrototypeOf(this)._events) {
    this._events = Object.create(null);
    this._eventsCount = 0;
  }

  this._maxListeners = this._maxListeners || undefined;
};

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function setMaxListeners(n) {
  if (typeof n !== 'number' || n < 0 || NumberIsNaN(n)) {
    throw new RangeError('The value of "n" is out of range. It must be a non-negative number. Received ' + n + '.');
  }
  this._maxListeners = n;
  return this;
};

function _getMaxListeners(that) {
  if (that._maxListeners === undefined)
    return EventEmitter.defaultMaxListeners;
  return that._maxListeners;
}

EventEmitter.prototype.getMaxListeners = function getMaxListeners() {
  return _getMaxListeners(this);
};

EventEmitter.prototype.emit = function emit(type) {
  var args = [];
  for (var i = 1; i < arguments.length; i++) args.push(arguments[i]);
  var doError = (type === 'error');

  var events = this._events;
  if (events !== undefined)
    doError = (doError && events.error === undefined);
  else if (!doError)
    return false;

  // If there is no 'error' event listener then throw.
  if (doError) {
    var er;
    if (args.length > 0)
      er = args[0];
    if (er instanceof Error) {
      // Note: The comments on the `throw` lines are intentional, they show
      // up in Node's output if this results in an unhandled exception.
      throw er; // Unhandled 'error' event
    }
    // At least give some kind of context to the user
    var err = new Error('Unhandled error.' + (er ? ' (' + er.message + ')' : ''));
    err.context = er;
    throw err; // Unhandled 'error' event
  }

  var handler = events[type];

  if (handler === undefined)
    return false;

  if (typeof handler === 'function') {
    ReflectApply(handler, this, args);
  } else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      ReflectApply(listeners[i], this, args);
  }

  return true;
};

function _addListener(target, type, listener, prepend) {
  var m;
  var events;
  var existing;

  checkListener(listener);

  events = target._events;
  if (events === undefined) {
    events = target._events = Object.create(null);
    target._eventsCount = 0;
  } else {
    // To avoid recursion in the case that type === "newListener"! Before
    // adding it to the listeners, first emit "newListener".
    if (events.newListener !== undefined) {
      target.emit('newListener', type,
                  listener.listener ? listener.listener : listener);

      // Re-assign `events` because a newListener handler could have caused the
      // this._events to be assigned to a new object
      events = target._events;
    }
    existing = events[type];
  }

  if (existing === undefined) {
    // Optimize the case of one listener. Don't need the extra array object.
    existing = events[type] = listener;
    ++target._eventsCount;
  } else {
    if (typeof existing === 'function') {
      // Adding the second element, need to change to array.
      existing = events[type] =
        prepend ? [listener, existing] : [existing, listener];
      // If we've already got an array, just append.
    } else if (prepend) {
      existing.unshift(listener);
    } else {
      existing.push(listener);
    }

    // Check for listener leak
    m = _getMaxListeners(target);
    if (m > 0 && existing.length > m && !existing.warned) {
      existing.warned = true;
      // No error code for this since it is a Warning
      // eslint-disable-next-line no-restricted-syntax
      var w = new Error('Possible EventEmitter memory leak detected. ' +
                          existing.length + ' ' + String(type) + ' listeners ' +
                          'added. Use emitter.setMaxListeners() to ' +
                          'increase limit');
      w.name = 'MaxListenersExceededWarning';
      w.emitter = target;
      w.type = type;
      w.count = existing.length;
      ProcessEmitWarning(w);
    }
  }

  return target;
}

EventEmitter.prototype.addListener = function addListener(type, listener) {
  return _addListener(this, type, listener, false);
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.prependListener =
    function prependListener(type, listener) {
      return _addListener(this, type, listener, true);
    };

function onceWrapper() {
  if (!this.fired) {
    this.target.removeListener(this.type, this.wrapFn);
    this.fired = true;
    if (arguments.length === 0)
      return this.listener.call(this.target);
    return this.listener.apply(this.target, arguments);
  }
}

function _onceWrap(target, type, listener) {
  var state = { fired: false, wrapFn: undefined, target: target, type: type, listener: listener };
  var wrapped = onceWrapper.bind(state);
  wrapped.listener = listener;
  state.wrapFn = wrapped;
  return wrapped;
}

EventEmitter.prototype.once = function once(type, listener) {
  checkListener(listener);
  this.on(type, _onceWrap(this, type, listener));
  return this;
};

EventEmitter.prototype.prependOnceListener =
    function prependOnceListener(type, listener) {
      checkListener(listener);
      this.prependListener(type, _onceWrap(this, type, listener));
      return this;
    };

// Emits a 'removeListener' event if and only if the listener was removed.
EventEmitter.prototype.removeListener =
    function removeListener(type, listener) {
      var list, events, position, i, originalListener;

      checkListener(listener);

      events = this._events;
      if (events === undefined)
        return this;

      list = events[type];
      if (list === undefined)
        return this;

      if (list === listener || list.listener === listener) {
        if (--this._eventsCount === 0)
          this._events = Object.create(null);
        else {
          delete events[type];
          if (events.removeListener)
            this.emit('removeListener', type, list.listener || listener);
        }
      } else if (typeof list !== 'function') {
        position = -1;

        for (i = list.length - 1; i >= 0; i--) {
          if (list[i] === listener || list[i].listener === listener) {
            originalListener = list[i].listener;
            position = i;
            break;
          }
        }

        if (position < 0)
          return this;

        if (position === 0)
          list.shift();
        else {
          spliceOne(list, position);
        }

        if (list.length === 1)
          events[type] = list[0];

        if (events.removeListener !== undefined)
          this.emit('removeListener', type, originalListener || listener);
      }

      return this;
    };

EventEmitter.prototype.off = EventEmitter.prototype.removeListener;

EventEmitter.prototype.removeAllListeners =
    function removeAllListeners(type) {
      var listeners, events, i;

      events = this._events;
      if (events === undefined)
        return this;

      // not listening for removeListener, no need to emit
      if (events.removeListener === undefined) {
        if (arguments.length === 0) {
          this._events = Object.create(null);
          this._eventsCount = 0;
        } else if (events[type] !== undefined) {
          if (--this._eventsCount === 0)
            this._events = Object.create(null);
          else
            delete events[type];
        }
        return this;
      }

      // emit removeListener for all listeners on all events
      if (arguments.length === 0) {
        var keys = Object.keys(events);
        var key;
        for (i = 0; i < keys.length; ++i) {
          key = keys[i];
          if (key === 'removeListener') continue;
          this.removeAllListeners(key);
        }
        this.removeAllListeners('removeListener');
        this._events = Object.create(null);
        this._eventsCount = 0;
        return this;
      }

      listeners = events[type];

      if (typeof listeners === 'function') {
        this.removeListener(type, listeners);
      } else if (listeners !== undefined) {
        // LIFO order
        for (i = listeners.length - 1; i >= 0; i--) {
          this.removeListener(type, listeners[i]);
        }
      }

      return this;
    };

function _listeners(target, type, unwrap) {
  var events = target._events;

  if (events === undefined)
    return [];

  var evlistener = events[type];
  if (evlistener === undefined)
    return [];

  if (typeof evlistener === 'function')
    return unwrap ? [evlistener.listener || evlistener] : [evlistener];

  return unwrap ?
    unwrapListeners(evlistener) : arrayClone(evlistener, evlistener.length);
}

EventEmitter.prototype.listeners = function listeners(type) {
  return _listeners(this, type, true);
};

EventEmitter.prototype.rawListeners = function rawListeners(type) {
  return _listeners(this, type, false);
};

EventEmitter.listenerCount = function(emitter, type) {
  if (typeof emitter.listenerCount === 'function') {
    return emitter.listenerCount(type);
  } else {
    return listenerCount.call(emitter, type);
  }
};

EventEmitter.prototype.listenerCount = listenerCount;
function listenerCount(type) {
  var events = this._events;

  if (events !== undefined) {
    var evlistener = events[type];

    if (typeof evlistener === 'function') {
      return 1;
    } else if (evlistener !== undefined) {
      return evlistener.length;
    }
  }

  return 0;
}

EventEmitter.prototype.eventNames = function eventNames() {
  return this._eventsCount > 0 ? ReflectOwnKeys(this._events) : [];
};

function arrayClone(arr, n) {
  var copy = new Array(n);
  for (var i = 0; i < n; ++i)
    copy[i] = arr[i];
  return copy;
}

function spliceOne(list, index) {
  for (; index + 1 < list.length; index++)
    list[index] = list[index + 1];
  list.pop();
}

function unwrapListeners(arr) {
  var ret = new Array(arr.length);
  for (var i = 0; i < ret.length; ++i) {
    ret[i] = arr[i].listener || arr[i];
  }
  return ret;
}

function once(emitter, name) {
  return new Promise(function (resolve, reject) {
    function errorListener(err) {
      emitter.removeListener(name, resolver);
      reject(err);
    }

    function resolver() {
      if (typeof emitter.removeListener === 'function') {
        emitter.removeListener('error', errorListener);
      }
      resolve([].slice.call(arguments));
    }
    eventTargetAgnosticAddListener(emitter, name, resolver, { once: true });
    if (name !== 'error') {
      addErrorHandlerIfEventEmitter(emitter, errorListener, { once: true });
    }
  });
}

function addErrorHandlerIfEventEmitter(emitter, handler, flags) {
  if (typeof emitter.on === 'function') {
    eventTargetAgnosticAddListener(emitter, 'error', handler, flags);
  }
}

function eventTargetAgnosticAddListener(emitter, name, listener, flags) {
  if (typeof emitter.on === 'function') {
    if (flags.once) {
      emitter.once(name, listener);
    } else {
      emitter.on(name, listener);
    }
  } else if (typeof emitter.addEventListener === 'function') {
    // EventTarget does not have `error` event semantics like Node
    // EventEmitters, we do not listen for `error` events here.
    emitter.addEventListener(name, function wrapListener(arg) {
      // IE does not have builtin `{ once: true }` support so we
      // have to do it manually.
      if (flags.once) {
        emitter.removeEventListener(name, wrapListener);
      }
      listener(arg);
    });
  } else {
    throw new TypeError('The "emitter" argument must be of type EventEmitter. Received type ' + typeof emitter);
  }
}

var eventsExports = events.exports;
var EventEmitter$1 = /*@__PURE__*/getDefaultExportFromCjs(eventsExports);

// src/events/pubsub.ts
var PubSub = class {
};
var EventEmitterPubSub = class extends PubSub {
  emitter;
  constructor(existingEmitter) {
    super();
    this.emitter = existingEmitter ?? new EventEmitter$1();
  }
  async publish(topic, event) {
    const id = crypto.randomUUID();
    const createdAt = /* @__PURE__ */ new Date();
    this.emitter.emit(topic, {
      ...event,
      id,
      createdAt
    });
  }
  async subscribe(topic, cb) {
    this.emitter.on(topic, cb);
  }
  async unsubscribe(topic, cb) {
    this.emitter.off(topic, cb);
  }
  async flush() {
  }
  /**
   * Clean up all listeners during graceful shutdown.
   */
  async close() {
    this.emitter.removeAllListeners();
  }
};

// src/hooks/mitt.ts
function mitt(all) {
  all = all || /* @__PURE__ */ new Map();
  return {
    /**
     * A Map of event names to registered handler functions.
     */
    all,
    /**
     * Register an event handler for the given type.
     * @param {string|symbol} type Type of event to listen for, or `'*'` for all events
     * @param {Function} handler Function to call in response to given event
     * @memberOf mitt
     */
    on(type, handler) {
      const handlers = all.get(type);
      if (handlers) {
        handlers.push(handler);
      } else {
        all.set(type, [handler]);
      }
    },
    /**
     * Remove an event handler for the given type.
     * If `handler` is omitted, all handlers of the given type are removed.
     * @param {string|symbol} type Type of event to unregister `handler` from (`'*'` to remove a wildcard handler)
     * @param {Function} [handler] Handler function to remove
     * @memberOf mitt
     */
    off(type, handler) {
      const handlers = all.get(type);
      if (handlers) {
        if (handler) {
          handlers.splice(handlers.indexOf(handler) >>> 0, 1);
        } else {
          all.set(type, []);
        }
      }
    },
    /**
     * Invoke all handlers for the given type.
     * If present, `'*'` handlers are invoked after type-matched handlers.
     *
     * Note: Manually firing '*' handlers is not supported.
     *
     * @param {string|symbol} type The event type to invoke
     * @param {Any} [evt] Any value (object is recommended and powerful), passed to each handler
     * @memberOf mitt
     */
    emit(type, evt) {
      let handlers = all.get(type);
      if (handlers) {
        handlers.slice().map((handler) => {
          handler(evt);
        });
      }
      handlers = all.get("*");
      if (handlers) {
        handlers.slice().map((handler) => {
          handler(type, evt);
        });
      }
    }
  };
}
var hooks = mitt();
function registerHook(hook, action) {
  hooks.on(hook, action);
}
function executeHook(hook, data) {
  setImmediate(() => {
    hooks.emit(hook, data);
  });
}

// src/logger/dual-logger.ts
var DualLogger = class {
  #inner;
  #getLoggerVNext;
  constructor(inner, getLoggerVNext) {
    this.#inner = inner;
    this.#getLoggerVNext = getLoggerVNext;
  }
  /**
   * Set or update the loggerVNext getter.
   * Called after observability initializes (which may happen after logger creation).
   */
  setLoggerVNext(getLoggerVNext) {
    this.#getLoggerVNext = getLoggerVNext;
  }
  debug(message, ...args) {
    this.#inner.debug(message, ...args);
    this.#forwardToVNext("debug", message, args);
  }
  info(message, ...args) {
    this.#inner.info(message, ...args);
    this.#forwardToVNext("info", message, args);
  }
  warn(message, ...args) {
    this.#inner.warn(message, ...args);
    this.#forwardToVNext("warn", message, args);
  }
  error(message, ...args) {
    this.#inner.error(message, ...args);
    this.#forwardToVNext("error", message, args);
  }
  trackException(error, metadata) {
    this.#inner.trackException(error, metadata);
    try {
      const loggerVNext = this.#resolveLoggerVNext();
      loggerVNext?.error(error.message, {
        errorId: error.id,
        domain: error.domain,
        category: error.category,
        details: error.details,
        cause: error.cause?.message,
        ...metadata
      });
    } catch {
    }
  }
  getTransports() {
    return this.#inner.getTransports();
  }
  async listLogs(transportId, params) {
    return this.#inner.listLogs(transportId, params);
  }
  async listLogsByRunId(args) {
    return this.#inner.listLogsByRunId(args);
  }
  /**
   * Resolve the best available LoggerContext:
   * 1. Span-correlated loggerVNext from AsyncLocalStorage (has traceId/spanId)
   * 2. Global loggerVNext from the lazy getter (no correlation, still persisted)
   */
  #resolveLoggerVNext() {
    const span = resolveCurrentSpan();
    if (span) {
      const correlated = span.observabilityInstance?.getLoggerContext?.(span);
      if (correlated) return correlated;
    }
    return this.#getLoggerVNext?.();
  }
  /**
   * Adapt IMastraLogger's variadic args to LoggerContext's structured data param.
   * Extracts the first plain object as `data`, serializes Error args, and
   * collects any remaining primitives so the dual write preserves all context.
   */
  #forwardToVNext(level, message, args) {
    try {
      const loggerVNext = this.#resolveLoggerVNext();
      if (!loggerVNext) return;
      const objectData = args.find(
        (arg) => arg !== null && typeof arg === "object" && !Array.isArray(arg) && !(arg instanceof Error)
      );
      const errorArg = args.find((arg) => arg instanceof Error);
      const extraArgs = args.filter((arg) => arg !== objectData && arg !== errorArg);
      loggerVNext[level](message, {
        ...objectData ?? {},
        ...errorArg ? {
          error: {
            name: errorArg.name,
            message: errorArg.message,
            stack: errorArg.stack
          }
        } : {},
        ...extraArgs.length > 0 ? { args: extraArgs } : {}
      });
    } catch {
    }
  }
};

// src/logger/noop-logger.ts
var noopLogger = {
  debug: () => {
  },
  info: () => {
  },
  warn: () => {
  },
  error: () => {
  },
  cleanup: async () => {
  },
  getTransports: () => /* @__PURE__ */ new Map(),
  trackException: () => {
  },
  listLogs: async () => ({ logs: [], total: 0, page: 1, perPage: 100, hasMore: false }),
  listLogsByRunId: async () => ({ logs: [], total: 0, page: 1, perPage: 100, hasMore: false })
};

const isSymbol = (value) => {
  return !!value && value.constructor === Symbol;
};
const isFunction = (value) => {
  return !!(value && value.constructor && value.call && value.apply);
};
const isNumber = (value) => {
  try {
    return Number(value) === value;
  } catch {
    return false;
  }
};
const isDate = (value) => {
  return Object.prototype.toString.call(value) === "[object Date]";
};
const isEmpty = (value) => {
  if (value === true || value === false)
    return true;
  if (value === null || value === void 0)
    return true;
  if (isNumber(value))
    return value === 0;
  if (isDate(value))
    return isNaN(value.getTime());
  if (isFunction(value))
    return false;
  if (isSymbol(value))
    return false;
  const length = value.length;
  if (isNumber(length))
    return length === 0;
  const size = value.size;
  if (isNumber(size))
    return size === 0;
  const keys = Object.keys(value).length;
  return keys === 0;
};

const t=new Uint8Array([0,97,115,109,1,0,0,0,1,48,8,96,3,127,127,127,1,127,96,3,127,127,127,0,96,2,127,127,0,96,1,127,1,127,96,3,127,127,126,1,126,96,3,126,127,127,1,126,96,2,127,126,0,96,1,127,1,126,3,11,10,0,0,2,1,3,4,5,6,1,7,5,3,1,0,1,7,85,9,3,109,101,109,2,0,5,120,120,104,51,50,0,0,6,105,110,105,116,51,50,0,2,8,117,112,100,97,116,101,51,50,0,3,8,100,105,103,101,115,116,51,50,0,4,5,120,120,104,54,52,0,5,6,105,110,105,116,54,52,0,7,8,117,112,100,97,116,101,54,52,0,8,8,100,105,103,101,115,116,54,52,0,9,10,251,22,10,242,1,1,4,127,32,0,32,1,106,33,3,32,1,65,16,79,4,127,32,3,65,16,107,33,6,32,2,65,168,136,141,161,2,106,33,3,32,2,65,137,235,208,208,7,107,33,4,32,2,65,207,140,162,142,6,106,33,5,3,64,32,3,32,0,40,2,0,65,247,148,175,175,120,108,106,65,13,119,65,177,243,221,241,121,108,33,3,32,4,32,0,65,4,106,34,0,40,2,0,65,247,148,175,175,120,108,106,65,13,119,65,177,243,221,241,121,108,33,4,32,2,32,0,65,4,106,34,0,40,2,0,65,247,148,175,175,120,108,106,65,13,119,65,177,243,221,241,121,108,33,2,32,5,32,0,65,4,106,34,0,40,2,0,65,247,148,175,175,120,108,106,65,13,119,65,177,243,221,241,121,108,33,5,32,6,32,0,65,4,106,34,0,79,13,0,11,32,2,65,12,119,32,5,65,18,119,106,32,4,65,7,119,106,32,3,65,1,119,106,5,32,2,65,177,207,217,178,1,106,11,32,1,106,32,0,32,1,65,15,113,16,1,11,146,1,0,32,1,32,2,106,33,2,3,64,32,1,65,4,106,32,2,75,69,4,64,32,0,32,1,40,2,0,65,189,220,202,149,124,108,106,65,17,119,65,175,214,211,190,2,108,33,0,32,1,65,4,106,33,1,12,1,11,11,3,64,32,1,32,2,79,69,4,64,32,0,32,1,45,0,0,65,177,207,217,178,1,108,106,65,11,119,65,177,243,221,241,121,108,33,0,32,1,65,1,106,33,1,12,1,11,11,32,0,32,0,65,15,118,115,65,247,148,175,175,120,108,34,0,65,13,118,32,0,115,65,189,220,202,149,124,108,34,0,65,16,118,32,0,115,11,63,0,32,0,65,8,106,32,1,65,168,136,141,161,2,106,54,2,0,32,0,65,12,106,32,1,65,137,235,208,208,7,107,54,2,0,32,0,65,16,106,32,1,54,2,0,32,0,65,20,106,32,1,65,207,140,162,142,6,106,54,2,0,11,195,4,1,6,127,32,1,32,2,106,33,6,32,0,65,24,106,33,4,32,0,65,40,106,40,2,0,33,3,32,0,32,0,40,2,0,32,2,106,54,2,0,32,0,65,4,106,34,5,32,5,40,2,0,32,2,65,16,79,32,0,40,2,0,65,16,79,114,114,54,2,0,32,2,32,3,106,65,16,73,4,64,32,3,32,4,106,32,1,32,2,252,10,0,0,32,0,65,40,106,32,2,32,3,106,54,2,0,15,11,32,3,4,64,32,3,32,4,106,32,1,65,16,32,3,107,34,2,252,10,0,0,32,0,65,8,106,34,3,32,3,40,2,0,32,4,40,2,0,65,247,148,175,175,120,108,106,65,13,119,65,177,243,221,241,121,108,54,2,0,32,0,65,12,106,34,3,32,3,40,2,0,32,4,65,4,106,40,2,0,65,247,148,175,175,120,108,106,65,13,119,65,177,243,221,241,121,108,54,2,0,32,0,65,16,106,34,3,32,3,40,2,0,32,4,65,8,106,40,2,0,65,247,148,175,175,120,108,106,65,13,119,65,177,243,221,241,121,108,54,2,0,32,0,65,20,106,34,3,32,3,40,2,0,32,4,65,12,106,40,2,0,65,247,148,175,175,120,108,106,65,13,119,65,177,243,221,241,121,108,54,2,0,32,0,65,40,106,65,0,54,2,0,32,1,32,2,106,33,1,11,32,1,32,6,65,16,107,77,4,64,32,6,65,16,107,33,8,32,0,65,8,106,40,2,0,33,2,32,0,65,12,106,40,2,0,33,3,32,0,65,16,106,40,2,0,33,5,32,0,65,20,106,40,2,0,33,7,3,64,32,2,32,1,40,2,0,65,247,148,175,175,120,108,106,65,13,119,65,177,243,221,241,121,108,33,2,32,3,32,1,65,4,106,34,1,40,2,0,65,247,148,175,175,120,108,106,65,13,119,65,177,243,221,241,121,108,33,3,32,5,32,1,65,4,106,34,1,40,2,0,65,247,148,175,175,120,108,106,65,13,119,65,177,243,221,241,121,108,33,5,32,7,32,1,65,4,106,34,1,40,2,0,65,247,148,175,175,120,108,106,65,13,119,65,177,243,221,241,121,108,33,7,32,8,32,1,65,4,106,34,1,79,13,0,11,32,0,65,8,106,32,2,54,2,0,32,0,65,12,106,32,3,54,2,0,32,0,65,16,106,32,5,54,2,0,32,0,65,20,106,32,7,54,2,0,11,32,1,32,6,73,4,64,32,4,32,1,32,6,32,1,107,34,1,252,10,0,0,32,0,65,40,106,32,1,54,2,0,11,11,97,1,1,127,32,0,65,16,106,40,2,0,33,1,32,0,65,4,106,40,2,0,4,127,32,1,65,12,119,32,0,65,20,106,40,2,0,65,18,119,106,32,0,65,12,106,40,2,0,65,7,119,106,32,0,65,8,106,40,2,0,65,1,119,106,5,32,1,65,177,207,217,178,1,106,11,32,0,40,2,0,106,32,0,65,24,106,32,0,65,40,106,40,2,0,16,1,11,255,3,2,3,126,1,127,32,0,32,1,106,33,6,32,1,65,32,79,4,126,32,6,65,32,107,33,6,32,2,66,214,235,130,238,234,253,137,245,224,0,124,33,3,32,2,66,177,169,172,193,173,184,212,166,61,125,33,4,32,2,66,249,234,208,208,231,201,161,228,225,0,124,33,5,3,64,32,3,32,0,41,3,0,66,207,214,211,190,210,199,171,217,66,126,124,66,31,137,66,135,149,175,175,152,182,222,155,158,127,126,33,3,32,4,32,0,65,8,106,34,0,41,3,0,66,207,214,211,190,210,199,171,217,66,126,124,66,31,137,66,135,149,175,175,152,182,222,155,158,127,126,33,4,32,2,32,0,65,8,106,34,0,41,3,0,66,207,214,211,190,210,199,171,217,66,126,124,66,31,137,66,135,149,175,175,152,182,222,155,158,127,126,33,2,32,5,32,0,65,8,106,34,0,41,3,0,66,207,214,211,190,210,199,171,217,66,126,124,66,31,137,66,135,149,175,175,152,182,222,155,158,127,126,33,5,32,6,32,0,65,8,106,34,0,79,13,0,11,32,2,66,12,137,32,5,66,18,137,124,32,4,66,7,137,124,32,3,66,1,137,124,32,3,66,207,214,211,190,210,199,171,217,66,126,66,31,137,66,135,149,175,175,152,182,222,155,158,127,126,133,66,135,149,175,175,152,182,222,155,158,127,126,66,157,163,181,234,131,177,141,138,250,0,125,32,4,66,207,214,211,190,210,199,171,217,66,126,66,31,137,66,135,149,175,175,152,182,222,155,158,127,126,133,66,135,149,175,175,152,182,222,155,158,127,126,66,157,163,181,234,131,177,141,138,250,0,125,32,2,66,207,214,211,190,210,199,171,217,66,126,66,31,137,66,135,149,175,175,152,182,222,155,158,127,126,133,66,135,149,175,175,152,182,222,155,158,127,126,66,157,163,181,234,131,177,141,138,250,0,125,32,5,66,207,214,211,190,210,199,171,217,66,126,66,31,137,66,135,149,175,175,152,182,222,155,158,127,126,133,66,135,149,175,175,152,182,222,155,158,127,126,66,157,163,181,234,131,177,141,138,250,0,125,5,32,2,66,197,207,217,178,241,229,186,234,39,124,11,32,1,173,124,32,0,32,1,65,31,113,16,6,11,134,2,0,32,1,32,2,106,33,2,3,64,32,2,32,1,65,8,106,79,4,64,32,1,41,3,0,66,207,214,211,190,210,199,171,217,66,126,66,31,137,66,135,149,175,175,152,182,222,155,158,127,126,32,0,133,66,27,137,66,135,149,175,175,152,182,222,155,158,127,126,66,157,163,181,234,131,177,141,138,250,0,125,33,0,32,1,65,8,106,33,1,12,1,11,11,32,1,65,4,106,32,2,77,4,64,32,0,32,1,53,2,0,66,135,149,175,175,152,182,222,155,158,127,126,133,66,23,137,66,207,214,211,190,210,199,171,217,66,126,66,249,243,221,241,153,246,153,171,22,124,33,0,32,1,65,4,106,33,1,11,3,64,32,1,32,2,73,4,64,32,0,32,1,49,0,0,66,197,207,217,178,241,229,186,234,39,126,133,66,11,137,66,135,149,175,175,152,182,222,155,158,127,126,33,0,32,1,65,1,106,33,1,12,1,11,11,32,0,32,0,66,33,136,133,66,207,214,211,190,210,199,171,217,66,126,34,0,32,0,66,29,136,133,66,249,243,221,241,153,246,153,171,22,126,34,0,32,0,66,32,136,133,11,77,0,32,0,65,8,106,32,1,66,214,235,130,238,234,253,137,245,224,0,124,55,3,0,32,0,65,16,106,32,1,66,177,169,172,193,173,184,212,166,61,125,55,3,0,32,0,65,24,106,32,1,55,3,0,32,0,65,32,106,32,1,66,249,234,208,208,231,201,161,228,225,0,124,55,3,0,11,244,4,2,3,127,4,126,32,1,32,2,106,33,5,32,0,65,40,106,33,4,32,0,65,200,0,106,40,2,0,33,3,32,0,32,0,41,3,0,32,2,173,124,55,3,0,32,2,32,3,106,65,32,73,4,64,32,3,32,4,106,32,1,32,2,252,10,0,0,32,0,65,200,0,106,32,2,32,3,106,54,2,0,15,11,32,3,4,64,32,3,32,4,106,32,1,65,32,32,3,107,34,2,252,10,0,0,32,0,65,8,106,34,3,32,3,41,3,0,32,4,41,3,0,66,207,214,211,190,210,199,171,217,66,126,124,66,31,137,66,135,149,175,175,152,182,222,155,158,127,126,55,3,0,32,0,65,16,106,34,3,32,3,41,3,0,32,4,65,8,106,41,3,0,66,207,214,211,190,210,199,171,217,66,126,124,66,31,137,66,135,149,175,175,152,182,222,155,158,127,126,55,3,0,32,0,65,24,106,34,3,32,3,41,3,0,32,4,65,16,106,41,3,0,66,207,214,211,190,210,199,171,217,66,126,124,66,31,137,66,135,149,175,175,152,182,222,155,158,127,126,55,3,0,32,0,65,32,106,34,3,32,3,41,3,0,32,4,65,24,106,41,3,0,66,207,214,211,190,210,199,171,217,66,126,124,66,31,137,66,135,149,175,175,152,182,222,155,158,127,126,55,3,0,32,0,65,200,0,106,65,0,54,2,0,32,1,32,2,106,33,1,11,32,1,65,32,106,32,5,77,4,64,32,5,65,32,107,33,2,32,0,65,8,106,41,3,0,33,6,32,0,65,16,106,41,3,0,33,7,32,0,65,24,106,41,3,0,33,8,32,0,65,32,106,41,3,0,33,9,3,64,32,6,32,1,41,3,0,66,207,214,211,190,210,199,171,217,66,126,124,66,31,137,66,135,149,175,175,152,182,222,155,158,127,126,33,6,32,7,32,1,65,8,106,34,1,41,3,0,66,207,214,211,190,210,199,171,217,66,126,124,66,31,137,66,135,149,175,175,152,182,222,155,158,127,126,33,7,32,8,32,1,65,8,106,34,1,41,3,0,66,207,214,211,190,210,199,171,217,66,126,124,66,31,137,66,135,149,175,175,152,182,222,155,158,127,126,33,8,32,9,32,1,65,8,106,34,1,41,3,0,66,207,214,211,190,210,199,171,217,66,126,124,66,31,137,66,135,149,175,175,152,182,222,155,158,127,126,33,9,32,2,32,1,65,8,106,34,1,79,13,0,11,32,0,65,8,106,32,6,55,3,0,32,0,65,16,106,32,7,55,3,0,32,0,65,24,106,32,8,55,3,0,32,0,65,32,106,32,9,55,3,0,11,32,1,32,5,73,4,64,32,4,32,1,32,5,32,1,107,34,1,252,10,0,0,32,0,65,200,0,106,32,1,54,2,0,11,11,188,2,1,5,126,32,0,65,24,106,41,3,0,33,1,32,0,41,3,0,34,2,66,32,90,4,126,32,0,65,8,106,41,3,0,34,3,66,1,137,32,0,65,16,106,41,3,0,34,4,66,7,137,124,32,1,66,12,137,32,0,65,32,106,41,3,0,34,5,66,18,137,124,124,32,3,66,207,214,211,190,210,199,171,217,66,126,66,31,137,66,135,149,175,175,152,182,222,155,158,127,126,133,66,135,149,175,175,152,182,222,155,158,127,126,66,157,163,181,234,131,177,141,138,250,0,125,32,4,66,207,214,211,190,210,199,171,217,66,126,66,31,137,66,135,149,175,175,152,182,222,155,158,127,126,133,66,135,149,175,175,152,182,222,155,158,127,126,66,157,163,181,234,131,177,141,138,250,0,125,32,1,66,207,214,211,190,210,199,171,217,66,126,66,31,137,66,135,149,175,175,152,182,222,155,158,127,126,133,66,135,149,175,175,152,182,222,155,158,127,126,66,157,163,181,234,131,177,141,138,250,0,125,32,5,66,207,214,211,190,210,199,171,217,66,126,66,31,137,66,135,149,175,175,152,182,222,155,158,127,126,133,66,135,149,175,175,152,182,222,155,158,127,126,66,157,163,181,234,131,177,141,138,250,0,125,5,32,1,66,197,207,217,178,241,229,186,234,39,124,11,32,2,124,32,0,65,40,106,32,2,66,31,131,167,16,6,11]);async function e(){return function(t){const{exports:{mem:e,xxh32:n,xxh64:r,init32:i,update32:a,digest32:o,init64:s,update64:u,digest64:c}}=t;let h=new Uint8Array(e.buffer);function g(t,n){if(e.buffer.byteLength<t+n){const r=Math.ceil((t+n-e.buffer.byteLength)/65536);e.grow(r),h=new Uint8Array(e.buffer);}}function f(t,e,n,r,i,a){g(t);const o=new Uint8Array(t);return h.set(o),n(0,e),o.set(h.subarray(0,t)),{update(e){let n;return h.set(o),"string"==typeof e?(g(3*e.length,t),n=w.encodeInto(e,h.subarray(t)).written):(g(e.byteLength,t),h.set(e,t),n=e.byteLength),r(0,t,n),o.set(h.subarray(0,t)),this},digest:()=>(h.set(o),a(i(0)))}}function y(t){return t>>>0}const b=2n**64n-1n;function d(t){return t&b}const w=new TextEncoder,l=0,p=0n;function x(t,e=l){return g(3*t.length,0),y(n(0,w.encodeInto(t,h).written,e))}function L(t,e=p){return g(3*t.length,0),d(r(0,w.encodeInto(t,h).written,e))}return {h32:x,h32ToString:(t,e=l)=>x(t,e).toString(16).padStart(8,"0"),h32Raw:(t,e=l)=>(g(t.byteLength,0),h.set(t),y(n(0,t.byteLength,e))),create32:(t=l)=>f(48,t,i,a,o,y),h64:L,h64ToString:(t,e=p)=>L(t,e).toString(16).padStart(16,"0"),h64Raw:(t,e=p)=>(g(t.byteLength,0),h.set(t),d(r(0,t.byteLength,e))),create64:(t=p)=>f(88,t,s,u,c,d)}}((await WebAssembly.instantiate(t)).instance)}

var C={hasSubscribers:false},S=C,W=C;var D=()=>S.hasSubscribers||W.hasSubscribers,I=typeof performance=="object"&&performance&&typeof performance.now=="function"?performance:Date,U=new Set,L=typeof process=="object"&&process?process:{},G=(u,e,t,i)=>{typeof L.emitWarning=="function"?L.emitWarning(u,e,t,i):console.error(`[${t}] ${e}: ${u}`);},P=u=>!U.has(u),F=u=>!!u&&u===Math.floor(u)&&u>0&&isFinite(u),j=u=>F(u)?u<=Math.pow(2,8)?Uint8Array:u<=Math.pow(2,16)?Uint16Array:u<=Math.pow(2,32)?Uint32Array:u<=Number.MAX_SAFE_INTEGER?O:null:null,O=class extends Array{constructor(e){super(e),this.fill(0);}},R=class u{heap;length;static#o=false;static create(e){let t=j(e);if(!t)return [];u.#o=true;let i=new u(e,t);return u.#o=false,i}constructor(e,t){if(!u.#o)throw new TypeError("instantiate Stack using Stack.create(n)");this.heap=new t(e),this.length=0;}push(e){this.heap[this.length++]=e;}pop(){return this.heap[--this.length]}},M=class u{#o;#u;#w;#D;#S;#M;#U;#m;get perf(){return this.#m}ttl;ttlResolution;ttlAutopurge;updateAgeOnGet;updateAgeOnHas;allowStale;noDisposeOnSet;noUpdateTTL;maxEntrySize;sizeCalculation;noDeleteOnFetchRejection;noDeleteOnStaleGet;allowStaleOnFetchAbort;allowStaleOnFetchRejection;ignoreFetchAbort;#n;#b;#s;#i;#t;#a;#c;#l;#h;#y;#r;#_;#F;#d;#g;#T;#W;#f;#j;static unsafeExposeInternals(e){return {starts:e.#F,ttls:e.#d,autopurgeTimers:e.#g,sizes:e.#_,keyMap:e.#s,keyList:e.#i,valList:e.#t,next:e.#a,prev:e.#c,get head(){return e.#l},get tail(){return e.#h},free:e.#y,isBackgroundFetch:t=>e.#e(t),backgroundFetch:(t,i,s,n)=>e.#P(t,i,s,n),moveToTail:t=>e.#L(t),indexes:t=>e.#A(t),rindexes:t=>e.#z(t),isStale:t=>e.#p(t)}}get max(){return this.#o}get maxSize(){return this.#u}get calculatedSize(){return this.#b}get size(){return this.#n}get fetchMethod(){return this.#M}get memoMethod(){return this.#U}get dispose(){return this.#w}get onInsert(){return this.#D}get disposeAfter(){return this.#S}constructor(e){let{max:t=0,ttl:i,ttlResolution:s=1,ttlAutopurge:n,updateAgeOnGet:o,updateAgeOnHas:r,allowStale:h,dispose:l,onInsert:c,disposeAfter:f,noDisposeOnSet:g,noUpdateTTL:p,maxSize:T=0,maxEntrySize:w=0,sizeCalculation:y,fetchMethod:a,memoMethod:m,noDeleteOnFetchRejection:_,noDeleteOnStaleGet:b,allowStaleOnFetchRejection:d,allowStaleOnFetchAbort:A,ignoreFetchAbort:z,perf:x}=e;if(x!==void 0&&typeof x?.now!="function")throw new TypeError("perf option must have a now() method if specified");if(this.#m=x??I,t!==0&&!F(t))throw new TypeError("max option must be a nonnegative integer");let v=t?j(t):Array;if(!v)throw new Error("invalid max value: "+t);if(this.#o=t,this.#u=T,this.maxEntrySize=w||this.#u,this.sizeCalculation=y,this.sizeCalculation){if(!this.#u&&!this.maxEntrySize)throw new TypeError("cannot set sizeCalculation without setting maxSize or maxEntrySize");if(typeof this.sizeCalculation!="function")throw new TypeError("sizeCalculation set to non-function")}if(m!==void 0&&typeof m!="function")throw new TypeError("memoMethod must be a function if defined");if(this.#U=m,a!==void 0&&typeof a!="function")throw new TypeError("fetchMethod must be a function if specified");if(this.#M=a,this.#W=!!a,this.#s=new Map,this.#i=Array.from({length:t}).fill(void 0),this.#t=Array.from({length:t}).fill(void 0),this.#a=new v(t),this.#c=new v(t),this.#l=0,this.#h=0,this.#y=R.create(t),this.#n=0,this.#b=0,typeof l=="function"&&(this.#w=l),typeof c=="function"&&(this.#D=c),typeof f=="function"?(this.#S=f,this.#r=[]):(this.#S=void 0,this.#r=void 0),this.#T=!!this.#w,this.#j=!!this.#D,this.#f=!!this.#S,this.noDisposeOnSet=!!g,this.noUpdateTTL=!!p,this.noDeleteOnFetchRejection=!!_,this.allowStaleOnFetchRejection=!!d,this.allowStaleOnFetchAbort=!!A,this.ignoreFetchAbort=!!z,this.maxEntrySize!==0){if(this.#u!==0&&!F(this.#u))throw new TypeError("maxSize must be a positive integer if specified");if(!F(this.maxEntrySize))throw new TypeError("maxEntrySize must be a positive integer if specified");this.#X();}if(this.allowStale=!!h,this.noDeleteOnStaleGet=!!b,this.updateAgeOnGet=!!o,this.updateAgeOnHas=!!r,this.ttlResolution=F(s)||s===0?s:1,this.ttlAutopurge=!!n,this.ttl=i||0,this.ttl){if(!F(this.ttl))throw new TypeError("ttl must be a positive integer if specified");this.#H();}if(this.#o===0&&this.ttl===0&&this.#u===0)throw new TypeError("At least one of max, maxSize, or ttl is required");if(!this.ttlAutopurge&&!this.#o&&!this.#u){let E="LRU_CACHE_UNBOUNDED";P(E)&&(U.add(E),G("TTL caching without ttlAutopurge, max, or maxSize can result in unbounded memory consumption.","UnboundedCacheWarning",E,u));}}getRemainingTTL(e){return this.#s.has(e)?1/0:0}#H(){let e=new O(this.#o),t=new O(this.#o);this.#d=e,this.#F=t;let i=this.ttlAutopurge?Array.from({length:this.#o}):void 0;this.#g=i,this.#N=(r,h,l=this.#m.now())=>{t[r]=h!==0?l:0,e[r]=h,s(r,h);},this.#x=r=>{t[r]=e[r]!==0?this.#m.now():0,s(r,e[r]);};let s=this.ttlAutopurge?(r,h)=>{if(i?.[r]&&(clearTimeout(i[r]),i[r]=void 0),h&&h!==0&&i){let l=setTimeout(()=>{this.#p(r)&&this.#v(this.#i[r],"expire");},h+1);l.unref&&l.unref(),i[r]=l;}}:()=>{};this.#E=(r,h)=>{if(e[h]){let l=e[h],c=t[h];if(!l||!c)return;r.ttl=l,r.start=c,r.now=n||o();let f=r.now-c;r.remainingTTL=l-f;}};let n=0,o=()=>{let r=this.#m.now();if(this.ttlResolution>0){n=r;let h=setTimeout(()=>n=0,this.ttlResolution);h.unref&&h.unref();}return r};this.getRemainingTTL=r=>{let h=this.#s.get(r);if(h===void 0)return 0;let l=e[h],c=t[h];if(!l||!c)return 1/0;let f=(n||o())-c;return l-f},this.#p=r=>{let h=t[r],l=e[r];return !!l&&!!h&&(n||o())-h>l};}#x=()=>{};#E=()=>{};#N=()=>{};#p=()=>false;#X(){let e=new O(this.#o);this.#b=0,this.#_=e,this.#R=t=>{this.#b-=e[t],e[t]=0;},this.#k=(t,i,s,n)=>{if(this.#e(i))return 0;if(!F(s))if(n){if(typeof n!="function")throw new TypeError("sizeCalculation must be a function");if(s=n(i,t),!F(s))throw new TypeError("sizeCalculation return invalid (expect positive integer)")}else throw new TypeError("invalid size value (must be positive integer). When maxSize or maxEntrySize is used, sizeCalculation or size must be set.");return s},this.#I=(t,i,s)=>{if(e[t]=i,this.#u){let n=this.#u-e[t];for(;this.#b>n;)this.#G(true);}this.#b+=e[t],s&&(s.entrySize=i,s.totalCalculatedSize=this.#b);};}#R=e=>{};#I=(e,t,i)=>{};#k=(e,t,i,s)=>{if(i||s)throw new TypeError("cannot set size without setting maxSize or maxEntrySize on cache");return 0};*#A({allowStale:e=this.allowStale}={}){if(this.#n)for(let t=this.#h;this.#V(t)&&((e||!this.#p(t))&&(yield t),t!==this.#l);)t=this.#c[t];}*#z({allowStale:e=this.allowStale}={}){if(this.#n)for(let t=this.#l;this.#V(t)&&((e||!this.#p(t))&&(yield t),t!==this.#h);)t=this.#a[t];}#V(e){return e!==void 0&&this.#s.get(this.#i[e])===e}*entries(){for(let e of this.#A())this.#t[e]!==void 0&&this.#i[e]!==void 0&&!this.#e(this.#t[e])&&(yield [this.#i[e],this.#t[e]]);}*rentries(){for(let e of this.#z())this.#t[e]!==void 0&&this.#i[e]!==void 0&&!this.#e(this.#t[e])&&(yield [this.#i[e],this.#t[e]]);}*keys(){for(let e of this.#A()){let t=this.#i[e];t!==void 0&&!this.#e(this.#t[e])&&(yield t);}}*rkeys(){for(let e of this.#z()){let t=this.#i[e];t!==void 0&&!this.#e(this.#t[e])&&(yield t);}}*values(){for(let e of this.#A())this.#t[e]!==void 0&&!this.#e(this.#t[e])&&(yield this.#t[e]);}*rvalues(){for(let e of this.#z())this.#t[e]!==void 0&&!this.#e(this.#t[e])&&(yield this.#t[e]);}[Symbol.iterator](){return this.entries()}[Symbol.toStringTag]="LRUCache";find(e,t={}){for(let i of this.#A()){let s=this.#t[i],n=this.#e(s)?s.__staleWhileFetching:s;if(n!==void 0&&e(n,this.#i[i],this))return this.#C(this.#i[i],t)}}forEach(e,t=this){for(let i of this.#A()){let s=this.#t[i],n=this.#e(s)?s.__staleWhileFetching:s;n!==void 0&&e.call(t,n,this.#i[i],this);}}rforEach(e,t=this){for(let i of this.#z()){let s=this.#t[i],n=this.#e(s)?s.__staleWhileFetching:s;n!==void 0&&e.call(t,n,this.#i[i],this);}}purgeStale(){let e=false;for(let t of this.#z({allowStale:true}))this.#p(t)&&(this.#v(this.#i[t],"expire"),e=true);return e}info(e){let t=this.#s.get(e);if(t===void 0)return;let i=this.#t[t],s=this.#e(i)?i.__staleWhileFetching:i;if(s===void 0)return;let n={value:s};if(this.#d&&this.#F){let o=this.#d[t],r=this.#F[t];if(o&&r){let h=o-(this.#m.now()-r);n.ttl=h,n.start=Date.now();}}return this.#_&&(n.size=this.#_[t]),n}dump(){let e=[];for(let t of this.#A({allowStale:true})){let i=this.#i[t],s=this.#t[t],n=this.#e(s)?s.__staleWhileFetching:s;if(n===void 0||i===void 0)continue;let o={value:n};if(this.#d&&this.#F){o.ttl=this.#d[t];let r=this.#m.now()-this.#F[t];o.start=Math.floor(Date.now()-r);}this.#_&&(o.size=this.#_[t]),e.unshift([i,o]);}return e}load(e){this.clear();for(let[t,i]of e){if(i.start){let s=Date.now()-i.start;i.start=this.#m.now()-s;}this.#O(t,i.value,i);}}set(e,t,i={}){let{status:s=S.hasSubscribers?{}:void 0}=i;i.status=s,s&&(s.op="set",s.key=e,t!==void 0&&(s.value=t));let n=this.#O(e,t,i);return s&&S.hasSubscribers&&S.publish(s),n}#O(e,t,i={}){let{ttl:s=this.ttl,start:n,noDisposeOnSet:o=this.noDisposeOnSet,sizeCalculation:r=this.sizeCalculation,status:h}=i;if(t===void 0)return h&&(h.set="deleted"),this.delete(e),this;let{noUpdateTTL:l=this.noUpdateTTL}=i;h&&!this.#e(t)&&(h.value=t);let c=this.#k(e,t,i.size||0,r,h);if(this.maxEntrySize&&c>this.maxEntrySize)return this.#v(e,"set"),h&&(h.set="miss",h.maxEntrySizeExceeded=true),this;let f=this.#n===0?void 0:this.#s.get(e);if(f===void 0)f=this.#n===0?this.#h:this.#y.length!==0?this.#y.pop():this.#n===this.#o?this.#G(false):this.#n,this.#i[f]=e,this.#t[f]=t,this.#s.set(e,f),this.#a[this.#h]=f,this.#c[f]=this.#h,this.#h=f,this.#n++,this.#I(f,c,h),h&&(h.set="add"),l=false,this.#j&&this.#D?.(t,e,"add");else {this.#L(f);let g=this.#t[f];if(t!==g){if(this.#W&&this.#e(g)){g.__abortController.abort(new Error("replaced"));let{__staleWhileFetching:p}=g;p!==void 0&&!o&&(this.#T&&this.#w?.(p,e,"set"),this.#f&&this.#r?.push([p,e,"set"]));}else o||(this.#T&&this.#w?.(g,e,"set"),this.#f&&this.#r?.push([g,e,"set"]));if(this.#R(f),this.#I(f,c,h),this.#t[f]=t,h){h.set="replace";let p=g&&this.#e(g)?g.__staleWhileFetching:g;p!==void 0&&(h.oldValue=p);}}else h&&(h.set="update");this.#j&&this.onInsert?.(t,e,t===g?"update":"replace");}if(s!==0&&!this.#d&&this.#H(),this.#d&&(l||this.#N(f,s,n),h&&this.#E(h,f)),!o&&this.#f&&this.#r){let g=this.#r,p;for(;p=g?.shift();)this.#S?.(...p);}return this}pop(){try{for(;this.#n;){let e=this.#t[this.#l];if(this.#G(!0),this.#e(e)){if(e.__staleWhileFetching)return e.__staleWhileFetching}else if(e!==void 0)return e}}finally{if(this.#f&&this.#r){let e=this.#r,t;for(;t=e?.shift();)this.#S?.(...t);}}}#G(e){let t=this.#l,i=this.#i[t],s=this.#t[t];return this.#W&&this.#e(s)?s.__abortController.abort(new Error("evicted")):(this.#T||this.#f)&&(this.#T&&this.#w?.(s,i,"evict"),this.#f&&this.#r?.push([s,i,"evict"])),this.#R(t),this.#g?.[t]&&(clearTimeout(this.#g[t]),this.#g[t]=void 0),e&&(this.#i[t]=void 0,this.#t[t]=void 0,this.#y.push(t)),this.#n===1?(this.#l=this.#h=0,this.#y.length=0):this.#l=this.#a[t],this.#s.delete(i),this.#n--,t}has(e,t={}){let{status:i=S.hasSubscribers?{}:void 0}=t;t.status=i,i&&(i.op="has",i.key=e);let s=this.#Y(e,t);return S.hasSubscribers&&S.publish(i),s}#Y(e,t={}){let{updateAgeOnHas:i=this.updateAgeOnHas,status:s}=t,n=this.#s.get(e);if(n!==void 0){let o=this.#t[n];if(this.#e(o)&&o.__staleWhileFetching===void 0)return  false;if(this.#p(n))s&&(s.has="stale",this.#E(s,n));else return i&&this.#x(n),s&&(s.has="hit",this.#E(s,n)),true}else s&&(s.has="miss");return  false}peek(e,t={}){let{status:i=D()?{}:void 0}=t;i&&(i.op="peek",i.key=e),t.status=i;let s=this.#J(e,t);return S.hasSubscribers&&S.publish(i),s}#J(e,t){let{status:i,allowStale:s=this.allowStale}=t,n=this.#s.get(e);if(n===void 0||!s&&this.#p(n)){i&&(i.peek=n===void 0?"miss":"stale");return}let o=this.#t[n],r=this.#e(o)?o.__staleWhileFetching:o;return i&&(r!==void 0?(i.peek="hit",i.value=r):i.peek="miss"),r}#P(e,t,i,s){let n=t===void 0?void 0:this.#t[t];if(this.#e(n))return n;let o=new AbortController,{signal:r}=i;r?.addEventListener("abort",()=>o.abort(r.reason),{signal:o.signal});let h={signal:o.signal,options:i,context:s},l=(w,y=false)=>{let{aborted:a}=o.signal,m=i.ignoreFetchAbort&&w!==void 0,_=i.ignoreFetchAbort||!!(i.allowStaleOnFetchAbort&&w!==void 0);if(i.status&&(a&&!y?(i.status.fetchAborted=true,i.status.fetchError=o.signal.reason,m&&(i.status.fetchAbortIgnored=true)):i.status.fetchResolved=true),a&&!m&&!y)return f(o.signal.reason,_);let b=p,d=this.#t[t];return (d===p||d===void 0&&m&&y)&&(w===void 0?b.__staleWhileFetching!==void 0?this.#t[t]=b.__staleWhileFetching:this.#v(e,"fetch"):(i.status&&(i.status.fetchUpdated=true),this.#O(e,w,h.options))),w},c=w=>(i.status&&(i.status.fetchRejected=true,i.status.fetchError=w),f(w,false)),f=(w,y)=>{let{aborted:a}=o.signal,m=a&&i.allowStaleOnFetchAbort,_=m||i.allowStaleOnFetchRejection,b=_||i.noDeleteOnFetchRejection,d=p;if(this.#t[t]===p&&(!b||!y&&d.__staleWhileFetching===void 0?this.#v(e,"fetch"):m||(this.#t[t]=d.__staleWhileFetching)),_)return i.status&&d.__staleWhileFetching!==void 0&&(i.status.returnedStale=true),d.__staleWhileFetching;if(d.__returned===d)throw w},g=(w,y)=>{let a=this.#M?.(e,n,h);a&&a instanceof Promise&&a.then(m=>w(m===void 0?void 0:m),y),o.signal.addEventListener("abort",()=>{(!i.ignoreFetchAbort||i.allowStaleOnFetchAbort)&&(w(void 0),i.allowStaleOnFetchAbort&&(w=m=>l(m,true)));});};i.status&&(i.status.fetchDispatched=true);let p=new Promise(g).then(l,c),T=Object.assign(p,{__abortController:o,__staleWhileFetching:n,__returned:void 0});return t===void 0?(this.#O(e,T,{...h.options,status:void 0}),t=this.#s.get(e)):this.#t[t]=T,T}#e(e){if(!this.#W)return  false;let t=e;return !!t&&t instanceof Promise&&t.hasOwnProperty("__staleWhileFetching")&&t.__abortController instanceof AbortController}fetch(e,t={}){let i=W.hasSubscribers,{status:s=D()?{}:void 0}=t;t.status=s,s&&t.context&&(s.context=t.context);let n=this.#B(e,t);return s&&D()&&i&&(s.trace=true,W.tracePromise(()=>n,s).catch(()=>{})),n}async#B(e,t={}){let{allowStale:i=this.allowStale,updateAgeOnGet:s=this.updateAgeOnGet,noDeleteOnStaleGet:n=this.noDeleteOnStaleGet,ttl:o=this.ttl,noDisposeOnSet:r=this.noDisposeOnSet,size:h=0,sizeCalculation:l=this.sizeCalculation,noUpdateTTL:c=this.noUpdateTTL,noDeleteOnFetchRejection:f=this.noDeleteOnFetchRejection,allowStaleOnFetchRejection:g=this.allowStaleOnFetchRejection,ignoreFetchAbort:p=this.ignoreFetchAbort,allowStaleOnFetchAbort:T=this.allowStaleOnFetchAbort,context:w,forceRefresh:y=false,status:a,signal:m}=t;if(a&&(a.op="fetch",a.key=e,y&&(a.forceRefresh=true)),!this.#W)return a&&(a.fetch="get"),this.#C(e,{allowStale:i,updateAgeOnGet:s,noDeleteOnStaleGet:n,status:a});let _={allowStale:i,updateAgeOnGet:s,noDeleteOnStaleGet:n,ttl:o,noDisposeOnSet:r,size:h,sizeCalculation:l,noUpdateTTL:c,noDeleteOnFetchRejection:f,allowStaleOnFetchRejection:g,allowStaleOnFetchAbort:T,ignoreFetchAbort:p,status:a,signal:m},b=this.#s.get(e);if(b===void 0){a&&(a.fetch="miss");let d=this.#P(e,b,_,w);return d.__returned=d}else {let d=this.#t[b];if(this.#e(d)){let E=i&&d.__staleWhileFetching!==void 0;return a&&(a.fetch="inflight",E&&(a.returnedStale=true)),E?d.__staleWhileFetching:d.__returned=d}let A=this.#p(b);if(!y&&!A)return a&&(a.fetch="hit"),this.#L(b),s&&this.#x(b),a&&this.#E(a,b),d;let z=this.#P(e,b,_,w),v=z.__staleWhileFetching!==void 0&&i;return a&&(a.fetch=A?"stale":"refresh",v&&A&&(a.returnedStale=true)),v?z.__staleWhileFetching:z.__returned=z}}forceFetch(e,t={}){let i=W.hasSubscribers,{status:s=D()?{}:void 0}=t;t.status=s,s&&t.context&&(s.context=t.context);let n=this.#K(e,t);return s&&D()&&i&&(s.trace=true,W.tracePromise(()=>n,s).catch(()=>{})),n}async#K(e,t={}){let i=await this.#B(e,t);if(i===void 0)throw new Error("fetch() returned undefined");return i}memo(e,t={}){let{status:i=S.hasSubscribers?{}:void 0}=t;t.status=i,i&&(i.op="memo",i.key=e,t.context&&(i.context=t.context));let s=this.#Q(e,t);return i&&(i.value=s),S.hasSubscribers&&S.publish(i),s}#Q(e,t={}){let i=this.#U;if(!i)throw new Error("no memoMethod provided to constructor");let{context:s,status:n,forceRefresh:o,...r}=t;n&&o&&(n.forceRefresh=true);let h=this.#C(e,r),l=o||h===void 0;if(n&&(n.memo=l?"miss":"hit",l||(n.value=h)),!l)return h;let c=i(e,h,{options:r,context:s});return n&&(n.value=c),this.#O(e,c,r),c}get(e,t={}){let{status:i=S.hasSubscribers?{}:void 0}=t;t.status=i,i&&(i.op="get",i.key=e);let s=this.#C(e,t);return i&&(s!==void 0&&(i.value=s),S.hasSubscribers&&S.publish(i)),s}#C(e,t={}){let{allowStale:i=this.allowStale,updateAgeOnGet:s=this.updateAgeOnGet,noDeleteOnStaleGet:n=this.noDeleteOnStaleGet,status:o}=t,r=this.#s.get(e);if(r===void 0){o&&(o.get="miss");return}let h=this.#t[r],l=this.#e(h);return o&&this.#E(o,r),this.#p(r)?l?(o&&(o.get="stale-fetching"),i&&h.__staleWhileFetching!==void 0?(o&&(o.returnedStale=true),h.__staleWhileFetching):void 0):(n||this.#v(e,"expire"),o&&(o.get="stale"),i?(o&&(o.returnedStale=true),h):void 0):(o&&(o.get=l?"fetching":"hit"),this.#L(r),s&&this.#x(r),l?h.__staleWhileFetching:h)}#$(e,t){this.#c[t]=e,this.#a[e]=t;}#L(e){e!==this.#h&&(e===this.#l?this.#l=this.#a[e]:this.#$(this.#c[e],this.#a[e]),this.#$(this.#h,e),this.#h=e);}delete(e){return this.#v(e,"delete")}#v(e,t){S.hasSubscribers&&S.publish({op:"delete",delete:t,key:e});let i=false;if(this.#n!==0){let s=this.#s.get(e);if(s!==void 0)if(this.#g?.[s]&&(clearTimeout(this.#g?.[s]),this.#g[s]=void 0),i=true,this.#n===1)this.#q(t);else {this.#R(s);let n=this.#t[s];if(this.#e(n)?n.__abortController.abort(new Error("deleted")):(this.#T||this.#f)&&(this.#T&&this.#w?.(n,e,t),this.#f&&this.#r?.push([n,e,t])),this.#s.delete(e),this.#i[s]=void 0,this.#t[s]=void 0,s===this.#h)this.#h=this.#c[s];else if(s===this.#l)this.#l=this.#a[s];else {let o=this.#c[s];this.#a[o]=this.#a[s];let r=this.#a[s];this.#c[r]=this.#c[s];}this.#n--,this.#y.push(s);}}if(this.#f&&this.#r?.length){let s=this.#r,n;for(;n=s?.shift();)this.#S?.(...n);}return i}clear(){return this.#q("delete")}#q(e){for(let t of this.#z({allowStale:true})){let i=this.#t[t];if(this.#e(i))i.__abortController.abort(new Error("deleted"));else {let s=this.#i[t];this.#T&&this.#w?.(i,s,e),this.#f&&this.#r?.push([i,s,e]);}}if(this.#s.clear(),this.#t.fill(void 0),this.#i.fill(void 0),this.#d&&this.#F){this.#d.fill(0),this.#F.fill(0);for(let t of this.#g??[])t!==void 0&&clearTimeout(t);this.#g?.fill(void 0);}if(this.#_&&this.#_.fill(0),this.#l=0,this.#h=0,this.#y.length=0,this.#b=0,this.#n=0,this.#f&&this.#r){let t=this.#r,i;for(;i=t?.shift();)this.#S?.(...i);}}};

// ../../node_modules/.pnpm/fast-deep-equal@3.1.3/node_modules/fast-deep-equal/index.js
var require_fast_deep_equal = __commonJS({
  "../../node_modules/.pnpm/fast-deep-equal@3.1.3/node_modules/fast-deep-equal/index.js"(exports$1, module) {
    module.exports = function equal(a, b) {
      if (a === b) return true;
      if (a && b && typeof a == "object" && typeof b == "object") {
        if (a.constructor !== b.constructor) return false;
        var length, i, keys;
        if (Array.isArray(a)) {
          length = a.length;
          if (length != b.length) return false;
          for (i = length; i-- !== 0; )
            if (!equal(a[i], b[i])) return false;
          return true;
        }
        if (a.constructor === RegExp) return a.source === b.source && a.flags === b.flags;
        if (a.valueOf !== Object.prototype.valueOf) return a.valueOf() === b.valueOf();
        if (a.toString !== Object.prototype.toString) return a.toString() === b.toString();
        keys = Object.keys(a);
        length = keys.length;
        if (length !== Object.keys(b).length) return false;
        for (i = length; i-- !== 0; )
          if (!Object.prototype.hasOwnProperty.call(b, keys[i])) return false;
        for (i = length; i-- !== 0; ) {
          var key = keys[i];
          if (!equal(a[key], b[key])) return false;
        }
        return true;
      }
      return a !== a && b !== b;
    };
  }
});

// src/memory/types.ts
function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function getThreadOMMetadata(threadMetadata) {
  if (!threadMetadata) return void 0;
  const mastra = threadMetadata.mastra;
  if (!isPlainObject(mastra)) return void 0;
  const om = mastra.om;
  if (!isPlainObject(om)) return void 0;
  return om;
}
function setThreadOMMetadata(threadMetadata, omMetadata) {
  const existing = threadMetadata ?? {};
  const existingMastra = isPlainObject(existing.mastra) ? existing.mastra : {};
  const existingOM = isPlainObject(existingMastra.om) ? existingMastra.om : {};
  return {
    ...existing,
    mastra: {
      ...existingMastra,
      om: {
        ...existingOM,
        ...omMetadata
      }
    }
  };
}
function parseMemoryRequestContext(requestContext) {
  if (!requestContext) {
    return null;
  }
  const memoryContext = requestContext.get("MastraMemory");
  if (!memoryContext) {
    return null;
  }
  if (typeof memoryContext !== "object" || memoryContext === null) {
    throw new Error(`Invalid MemoryRequestContext: expected object, got ${typeof memoryContext}`);
  }
  const ctx = memoryContext;
  if (ctx.thread !== void 0) {
    if (typeof ctx.thread !== "object" || ctx.thread === null) {
      throw new Error(`Invalid MemoryRequestContext.thread: expected object, got ${typeof ctx.thread}`);
    }
    const thread = ctx.thread;
    if (typeof thread.id !== "string") {
      throw new Error(`Invalid MemoryRequestContext.thread.id: expected string, got ${typeof thread.id}`);
    }
  }
  if (ctx.resourceId !== void 0 && typeof ctx.resourceId !== "string") {
    throw new Error(`Invalid MemoryRequestContext.resourceId: expected string, got ${typeof ctx.resourceId}`);
  }
  return memoryContext;
}
function isObservationalMemoryEnabled(config) {
  if (config === true) return true;
  if (config === false || config === void 0) return false;
  return config.enabled !== false;
}
var MastraAgentNetworkStream = class extends ReadableStream$1 {
  #usageCount = {
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    cachedInputTokens: 0,
    reasoningTokens: 0
  };
  #streamPromise;
  #objectPromise;
  #objectStreamController = null;
  #objectStream = null;
  #run;
  runId;
  constructor({
    createStream,
    run
  }) {
    const deferredPromise = {
      promise: null,
      resolve: null,
      reject: null
    };
    deferredPromise.promise = new Promise((resolve2, reject) => {
      deferredPromise.resolve = resolve2;
      deferredPromise.reject = reject;
    });
    const objectDeferredPromise = {
      promise: null,
      resolve: null,
      reject: null
    };
    objectDeferredPromise.promise = new Promise((resolve2, reject) => {
      objectDeferredPromise.resolve = resolve2;
      objectDeferredPromise.reject = reject;
    });
    let objectStreamController = null;
    const updateUsageCount = (usage) => {
      this.#usageCount.inputTokens += parseInt(usage?.inputTokens?.toString() ?? "0", 10);
      this.#usageCount.outputTokens += parseInt(usage?.outputTokens?.toString() ?? "0", 10);
      this.#usageCount.totalTokens += parseInt(usage?.totalTokens?.toString() ?? "0", 10);
      this.#usageCount.reasoningTokens += parseInt(usage?.reasoningTokens?.toString() ?? "0", 10);
      this.#usageCount.cachedInputTokens += parseInt(usage?.cachedInputTokens?.toString() ?? "0", 10);
    };
    super({
      start: async (controller) => {
        try {
          const writer = new WritableStream({
            write: (chunk) => {
              if (chunk.type === "step-output" && chunk.payload?.output?.from === "AGENT" && chunk.payload?.output?.type === "finish" || chunk.type === "step-output" && chunk.payload?.output?.from === "WORKFLOW" && chunk.payload?.output?.type === "finish") {
                const output = chunk.payload?.output;
                if (output && "payload" in output && output.payload) {
                  const finishPayload = output.payload;
                  if ("usage" in finishPayload && finishPayload.usage) {
                    updateUsageCount(finishPayload.usage);
                  } else if ("output" in finishPayload && finishPayload.output) {
                    const outputPayload = finishPayload.output;
                    if ("usage" in outputPayload && outputPayload.usage) {
                      updateUsageCount(outputPayload.usage);
                    }
                  }
                }
              }
              controller.enqueue(chunk);
            }
          });
          const stream = await createStream(writer);
          const getInnerChunk = (chunk) => {
            if (chunk.type === "workflow-step-output") {
              return getInnerChunk(chunk.payload.output);
            }
            return chunk;
          };
          let objectResolved = false;
          for await (const chunk of stream) {
            if (chunk.type === "workflow-step-output") {
              const innerChunk = getInnerChunk(chunk);
              if (innerChunk.type === "routing-agent-end" || innerChunk.type === "agent-execution-end" || innerChunk.type === "workflow-execution-end") {
                if (innerChunk.payload?.usage) {
                  updateUsageCount(innerChunk.payload.usage);
                }
              }
              if (innerChunk.type === "network-object") {
                if (objectStreamController) {
                  objectStreamController.enqueue(innerChunk.payload?.object);
                }
                controller.enqueue(innerChunk);
              } else if (innerChunk.type === "network-object-result") {
                if (!objectResolved) {
                  objectResolved = true;
                  objectDeferredPromise.resolve(innerChunk.payload?.object);
                  if (objectStreamController) {
                    objectStreamController.close();
                  }
                }
                controller.enqueue(innerChunk);
              } else if (innerChunk.type === "network-execution-event-finish") {
                const finishPayload = {
                  ...innerChunk.payload,
                  usage: this.#usageCount
                };
                controller.enqueue({ ...innerChunk, payload: finishPayload });
              } else {
                controller.enqueue(innerChunk);
              }
            }
          }
          if (!objectResolved) {
            objectDeferredPromise.resolve(void 0);
            if (objectStreamController) {
              objectStreamController.close();
            }
          }
          controller.close();
          deferredPromise.resolve();
        } catch (error) {
          controller.error(error);
          deferredPromise.reject(error);
          objectDeferredPromise.reject(error);
          if (objectStreamController) {
            objectStreamController.error(error);
          }
        }
      }
    });
    this.#run = run;
    this.#streamPromise = deferredPromise;
    this.runId = run.runId;
    this.#objectPromise = objectDeferredPromise;
    this.#objectStream = new ReadableStream$1({
      start: (ctrl) => {
        objectStreamController = ctrl;
        this.#objectStreamController = ctrl;
      }
    });
  }
  get status() {
    return this.#streamPromise.promise.then(() => this.#run._getExecutionResults()).then((res) => res.status);
  }
  get result() {
    return this.#streamPromise.promise.then(() => this.#run._getExecutionResults());
  }
  get usage() {
    return this.#streamPromise.promise.then(() => this.#usageCount);
  }
  /**
   * Returns a promise that resolves to the structured output object.
   * Only available when structuredOutput option is provided to network().
   * Resolves to undefined if no structuredOutput was requested.
   */
  get object() {
    return this.#objectPromise.promise;
  }
  /**
   * Returns a ReadableStream of partial objects during structured output generation.
   * Useful for streaming partial results as they're being generated.
   */
  get objectStream() {
    return this.#objectStream;
  }
};

// src/stream/aisdk/v5/compat/delayed-promise.ts
var DelayedPromise = class {
  status = {
    type: "pending"
  };
  _promise;
  _resolve = void 0;
  _reject = void 0;
  get promise() {
    if (this._promise) {
      return this._promise;
    }
    this._promise = new Promise((resolve2, reject) => {
      if (this.status.type === "resolved") {
        resolve2(this.status.value);
      } else if (this.status.type === "rejected") {
        reject(this.status.error);
      }
      this._resolve = resolve2;
      this._reject = reject;
    });
    return this._promise;
  }
  resolve(value) {
    this.status = { type: "resolved", value };
    if (this._promise) {
      this._resolve?.(value);
    }
  }
  reject(error) {
    this.status = { type: "rejected", error };
    if (this._promise) {
      this._reject?.(error);
    }
  }
};

// src/stream/aisdk/v5/compat/prepare-tools.ts
function fixTypelessProperties(schema) {
  if (typeof schema !== "object" || schema === null) return schema;
  const result = { ...schema };
  if (result.properties && typeof result.properties === "object" && !Array.isArray(result.properties)) {
    result.properties = Object.fromEntries(
      Object.entries(result.properties).map(([key, value]) => {
        if (typeof value !== "object" || value === null || Array.isArray(value)) {
          return [key, value];
        }
        const propSchema = value;
        const hasType = "type" in propSchema;
        const hasRef = "$ref" in propSchema;
        const hasAnyOf = "anyOf" in propSchema;
        const hasOneOf = "oneOf" in propSchema;
        const hasAllOf = "allOf" in propSchema;
        if (!hasType && !hasRef && !hasAnyOf && !hasOneOf && !hasAllOf) {
          const { items: _items, ...rest } = propSchema;
          return [key, { ...rest, type: ["string", "number", "integer", "boolean", "object", "null"] }];
        }
        return [key, fixTypelessProperties(propSchema)];
      })
    );
  }
  if (result.items) {
    if (Array.isArray(result.items)) {
      result.items = result.items.map((item) => fixTypelessProperties(item));
    } else if (typeof result.items === "object") {
      result.items = fixTypelessProperties(result.items);
    }
  }
  return result;
}
function prepareToolsAndToolChoice({
  tools,
  toolChoice,
  activeTools,
  targetVersion = "v2"
}) {
  if (toolChoice === "none") {
    return {
      tools: void 0,
      toolChoice: { type: "none" }
    };
  }
  if (Object.keys(tools || {}).length === 0) {
    return {
      tools: void 0,
      toolChoice: void 0
    };
  }
  const filteredTools = activeTools != null ? Object.entries(tools || {}).filter(([name]) => activeTools.includes(name)) : Object.entries(tools || {});
  const providerToolType = targetVersion === "v3" ? "provider" : "provider-defined";
  return {
    tools: filteredTools.map(([name, tool2]) => {
      try {
        if (isProviderDefinedTool(tool2)) {
          const toolName = tool2.name ?? name;
          return {
            type: providerToolType,
            name: toolName,
            id: tool2.id,
            args: tool2.args ?? {}
          };
        }
        let inputSchema;
        if ("inputSchema" in tool2) {
          inputSchema = tool2.inputSchema;
        } else if ("parameters" in tool2) {
          inputSchema = tool2.parameters;
        }
        const sdkTool = tool({
          type: "function",
          ...tool2,
          inputSchema
        });
        const strict = "strict" in tool2 ? tool2.strict : void 0;
        const toolType = sdkTool?.type ?? "function";
        switch (toolType) {
          case void 0:
          case "dynamic":
          case "function":
            let parameters;
            if (sdkTool.inputSchema) {
              if ("$schema" in sdkTool.inputSchema && typeof sdkTool.inputSchema.$schema === "string" && sdkTool.inputSchema.$schema.startsWith("http://json-schema.org/")) {
                parameters = sdkTool.inputSchema;
              } else if (isStandardSchemaWithJSON(sdkTool.inputSchema)) {
                parameters = standardSchemaToJSONSchema(sdkTool.inputSchema, {
                  io: "input",
                  target: "draft-07"
                });
              } else {
                parameters = asSchema(sdkTool.inputSchema).jsonSchema;
              }
              if (parameters && typeof parameters === "object" && "$schema" in parameters && parameters.$schema !== "http://json-schema.org/draft-07/schema#") {
                parameters.$schema = "http://json-schema.org/draft-07/schema#";
              }
            } else {
              parameters = {
                type: "object",
                properties: {},
                additionalProperties: false
              };
            }
            return {
              type: "function",
              name,
              description: sdkTool.description,
              inputSchema: fixTypelessProperties(parameters),
              ...targetVersion === "v3" && strict != null ? { strict } : {},
              providerOptions: sdkTool.providerOptions
            };
          case "provider-defined": {
            const providerId = sdkTool.id;
            const providerName = sdkTool.name ?? name;
            return {
              type: providerToolType,
              name: providerName,
              id: providerId,
              args: sdkTool.args
            };
          }
          default: {
            const exhaustiveCheck = toolType;
            throw new Error(`Unsupported tool type: ${exhaustiveCheck}`);
          }
        }
      } catch (e) {
        console.error("Error preparing tool", e);
        return null;
      }
    }).filter((tool2) => tool2 !== null),
    toolChoice: toolChoice == null ? { type: "auto" } : typeof toolChoice === "string" ? { type: toolChoice } : { type: "tool", toolName: toolChoice.toolName }
  };
}

// src/stream/aisdk/v5/compat/consume-stream.ts
async function consumeStream({
  stream,
  onError,
  logger
}) {
  const reader = stream.getReader();
  try {
    while (true) {
      const { done } = await reader.read();
      if (done) break;
    }
  } catch (error) {
    logger?.error("consumeStream error", error);
    onError?.(error);
  } finally {
    reader.releaseLock();
  }
}

// src/processors/processors/structured-output.ts
var STRUCTURED_OUTPUT_PROCESSOR_NAME = "structured-output";
var StructuredOutputProcessor = class {
  id = STRUCTURED_OUTPUT_PROCESSOR_NAME;
  name = "Structured Output";
  schema;
  structuringAgent;
  errorStrategy;
  fallbackValue;
  isStructuringAgentStreamStarted = false;
  jsonPromptInjection;
  providerOptions;
  logger;
  constructor(options) {
    if (!options.schema) {
      throw new MastraError({
        id: "STRUCTURED_OUTPUT_PROCESSOR_SCHEMA_REQUIRED",
        domain: "AGENT" /* AGENT */,
        category: "USER" /* USER */,
        text: "StructuredOutputProcessor requires a schema to be provided"
      });
    }
    if (!options.model) {
      throw new MastraError({
        id: "STRUCTURED_OUTPUT_PROCESSOR_MODEL_REQUIRED",
        domain: "AGENT" /* AGENT */,
        category: "USER" /* USER */,
        text: "StructuredOutputProcessor requires a model to be provided either in options or as fallback"
      });
    }
    this.schema = options.schema;
    this.errorStrategy = options.errorStrategy ?? "strict";
    this.fallbackValue = options.fallbackValue;
    this.jsonPromptInjection = options.jsonPromptInjection;
    this.providerOptions = options.providerOptions;
    this.logger = options.logger;
    this.structuringAgent = new Agent({
      id: "structured-output-structurer",
      name: "structured-output-structurer",
      instructions: options.instructions || this.generateInstructions(),
      model: options.model
    });
  }
  __registerMastra(mastra) {
    this.structuringAgent.__registerMastra(mastra);
  }
  async processOutputStream(args) {
    const { part, state, streamParts, abort, ...rest } = args;
    const observabilityContext = resolveObservabilityContext(rest);
    const controller = state.controller;
    switch (part.type) {
      case "finish":
        await this.processAndEmitStructuredOutput(streamParts, controller, abort, observabilityContext);
        return part;
      default:
        return part;
    }
  }
  async processAndEmitStructuredOutput(streamParts, controller, abort, observabilityContext) {
    if (this.isStructuringAgentStreamStarted) return;
    this.isStructuringAgentStreamStarted = true;
    try {
      const structuringPrompt = this.buildStructuringPrompt(streamParts);
      const prompt = `Extract and structure the key information from the following text according to the specified schema. Keep the original meaning and details:

${structuringPrompt}`;
      const structuringAgentStream = await this.structuringAgent.stream(prompt, {
        structuredOutput: {
          schema: this.schema,
          jsonPromptInjection: this.jsonPromptInjection
        },
        providerOptions: this.providerOptions,
        ...observabilityContext
      });
      const excludedChunkTypes = [
        "start",
        "finish",
        "text-start",
        "text-delta",
        "text-end",
        "step-start",
        "step-finish"
      ];
      for await (const chunk of structuringAgentStream.fullStream) {
        if (excludedChunkTypes.includes(chunk.type) || chunk.type.startsWith("data-")) {
          continue;
        }
        if (chunk.type === "error") {
          this.handleError("Structuring failed", chunk.payload.error, abort);
          if (this.errorStrategy === "warn") {
            break;
          }
          if (this.errorStrategy === "fallback" && this.fallbackValue !== void 0) {
            const fallbackChunk = {
              runId: chunk.runId,
              from: "AGENT" /* AGENT */,
              type: "object-result",
              object: this.fallbackValue,
              metadata: {
                from: "structured-output",
                fallback: true
              }
            };
            controller.enqueue(fallbackChunk);
            break;
          }
        }
        const newChunk = {
          ...chunk,
          metadata: {
            from: "structured-output"
          }
        };
        controller.enqueue(newChunk);
      }
    } catch (error) {
      this.handleError("Structured output processing failed", error, abort);
    }
  }
  /**
   * Build a structured markdown prompt from stream parts
   * Collects chunks by type and formats them in a consistent structure
   */
  buildStructuringPrompt(streamParts) {
    const textChunks = [];
    const reasoningChunks = [];
    const toolCalls = [];
    const toolResults = [];
    for (const part of streamParts) {
      switch (part.type) {
        case "text-delta":
          textChunks.push(part.payload.text);
          break;
        case "reasoning-delta":
          reasoningChunks.push(part.payload.text);
          break;
        case "tool-call":
          toolCalls.push(part);
          break;
        case "tool-result":
          toolResults.push(part);
          break;
      }
    }
    const sections = [];
    if (reasoningChunks.length > 0) {
      sections.push(`# Assistant Reasoning
${reasoningChunks.join("")}`);
    }
    if (toolCalls.length > 0) {
      const toolCallsText = toolCalls.map((tc) => {
        const args = typeof tc.payload.args === "object" ? JSON.stringify(tc.payload.args, null) : tc.payload.args;
        const output = tc.payload.output !== void 0 ? `${typeof tc.payload.output === "object" ? JSON.stringify(tc.payload.output, null) : tc.payload.output}` : "";
        return `## ${tc.payload.toolName}
### Input: ${args}
### Output: ${output}`;
      }).join("\n");
      sections.push(`# Tool Calls
${toolCallsText}`);
    }
    if (toolResults.length > 0) {
      const resultsText = toolResults.map((tr) => {
        const result = tr.payload.result;
        if (result === void 0 || result === null) {
          return `${tr.payload.toolName}: null`;
        }
        return `${tr.payload.toolName}: ${typeof result === "object" ? JSON.stringify(result, null, 2) : result}`;
      }).join("\n");
      sections.push(`# Tool Results
${resultsText}`);
    }
    if (textChunks.length > 0) {
      sections.push(`# Assistant Response
${textChunks.join("")}`);
    }
    return sections.join("\n\n");
  }
  /**
   * Generate instructions for the structuring agent based on the schema
   */
  generateInstructions() {
    return `You are a data structuring specialist. Your job is to convert unstructured text into a specific JSON format.

TASK: Convert the provided unstructured text into valid JSON that matches the following schema:

REQUIREMENTS:
- Return ONLY valid JSON, no additional text or explanation
- Extract relevant information from the input text
- If information is missing, use reasonable defaults or null values
- Maintain data types as specified in the schema
- Be consistent and accurate in your conversions

The input text may be in any format (sentences, bullet points, paragraphs, etc.). Extract the relevant data and structure it according to the schema.`;
  }
  /**
   * Handle errors based on the configured strategy
   */
  handleError(context, error, abort) {
    const errorMessage = this.getErrorMessage(error);
    const message = `[StructuredOutputProcessor] ${context}: ${errorMessage}`;
    switch (this.errorStrategy) {
      case "strict":
        this.logger?.error(message, error);
        abort(message);
        break;
      case "warn":
        this.logger?.warn(message, error);
        break;
      case "fallback":
        this.logger?.info(`${message} (using fallback)`, error);
        break;
    }
  }
  getErrorMessage(error) {
    if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
      return error.message;
    }
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }
};

// src/agent/utils.ts
var supportedLanguageModelSpecifications = ["v2", "v3"];
var isSupportedLanguageModel = (model) => {
  return supportedLanguageModelSpecifications.includes(model.specificationVersion);
};
async function tryGenerateWithJsonFallback(agent, prompt, options) {
  if (!options.structuredOutput?.schema) {
    throw new MastraError({
      id: "STRUCTURED_OUTPUT_OPTIONS_REQUIRED",
      domain: "AGENT" /* AGENT */,
      category: "USER" /* USER */,
      text: "structuredOutput is required to use tryGenerateWithJsonFallback"
    });
  }
  try {
    return await agent.generate(prompt, options);
  } catch (error) {
    console.warn("Error in tryGenerateWithJsonFallback. Attempting fallback.", error);
    return await agent.generate(prompt, {
      ...options,
      structuredOutput: { ...options.structuredOutput, jsonPromptInjection: true }
    });
  }
}
async function tryStreamWithJsonFallback(agent, prompt, options) {
  if (!options.structuredOutput?.schema) {
    throw new MastraError({
      id: "STRUCTURED_OUTPUT_OPTIONS_REQUIRED",
      domain: "AGENT" /* AGENT */,
      category: "USER" /* USER */,
      text: "structuredOutput is required to use tryStreamWithJsonFallback"
    });
  }
  try {
    const result = await agent.stream(prompt, options);
    const object = await result.object;
    if (!object) {
      throw new MastraError({
        id: "STRUCTURED_OUTPUT_OBJECT_UNDEFINED",
        domain: "AGENT" /* AGENT */,
        category: "USER" /* USER */,
        text: "structuredOutput object is undefined"
      });
    }
    return result;
  } catch (error) {
    console.warn("Error in tryStreamWithJsonFallback. Attempting fallback.", error);
    return await agent.stream(prompt, {
      ...options,
      structuredOutput: { ...options.structuredOutput, jsonPromptInjection: true }
    });
  }
}
function resolveThreadIdFromArgs(args) {
  let resolved;
  if (args?.memory?.thread) {
    if (typeof args.memory.thread === "string") {
      resolved = { id: args.memory.thread };
    } else if (typeof args.memory.thread === "object" && args.memory.thread.id) {
      resolved = args.memory.thread;
    }
  }
  if (!resolved && args?.threadId) {
    resolved = { id: args.threadId };
  }
  if (args.overrideId) {
    return { ...resolved || {}, id: args.overrideId };
  }
  return resolved;
}
var CLAUDE_46_PATTERN = /[^0-9]4[.-]6/;
function isMaybeClaude46(model) {
  if (typeof model === "function") return true;
  if (Array.isArray(model)) {
    return model.some((m) => isMaybeClaude46(m.model ?? m));
  }
  if (typeof model === "string") {
    return model.startsWith("anthropic") && CLAUDE_46_PATTERN.test(model);
  }
  if (model && typeof model === "object" && "provider" in model && "modelId" in model) {
    const { provider, modelId } = model;
    return provider.startsWith("anthropic") && CLAUDE_46_PATTERN.test(modelId);
  }
  return true;
}
var TrailingAssistantGuard = class {
  id = "trailing-assistant-guard";
  name = "Trailing Assistant Guard";
  processInputStep({ messages, structuredOutput }) {
    const willUseResponseFormat = structuredOutput?.schema && !structuredOutput?.model && !structuredOutput?.jsonPromptInjection;
    if (!willUseResponseFormat) return;
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || lastMessage.role !== "assistant") return;
    return {
      messages: [
        ...messages,
        {
          id: randomUUID(),
          role: "user",
          content: {
            format: 2,
            parts: [{ type: "text", text: "Generate the structured response." }]
          },
          createdAt: /* @__PURE__ */ new Date()
        }
      ]
    };
  }
};

// src/processors/runner.ts
var ProcessorState = class {
  inputAccumulatedText = "";
  outputAccumulatedText = "";
  outputChunkCount = 0;
  customState = {};
  streamParts = [];
  span;
  constructor(options) {
    if (!options?.createSpan || !options.processorName) {
      return;
    }
    const currentSpan = options.tracingContext?.currentSpan;
    const parentSpan = currentSpan?.findParent("agent_run" /* AGENT_RUN */) || currentSpan?.parent || currentSpan;
    this.span = parentSpan?.createChildSpan({
      type: "processor_run" /* PROCESSOR_RUN */,
      name: `output stream processor: ${options.processorName}`,
      entityType: EntityType.OUTPUT_PROCESSOR,
      entityName: options.processorName,
      attributes: {
        processorExecutor: "legacy",
        processorIndex: options.processorIndex ?? 0
      },
      input: {
        totalChunks: 0
      }
    });
  }
  /** Track incoming chunk (before processor transformation) */
  addInputPart(part) {
    if (part.type === "text-delta") {
      this.inputAccumulatedText += part.payload.text;
    }
    this.streamParts.push(part);
    if (this.span) {
      this.span.input = {
        totalChunks: this.streamParts.length,
        accumulatedText: this.inputAccumulatedText
      };
    }
  }
  /** Track outgoing chunk (after processor transformation) */
  addOutputPart(part) {
    if (!part) return;
    this.outputChunkCount++;
    if (part.type === "text-delta") {
      this.outputAccumulatedText += part.payload.text;
    }
  }
  /** Get final output for span */
  getFinalOutput() {
    return {
      totalChunks: this.outputChunkCount,
      accumulatedText: this.outputAccumulatedText
    };
  }
};
var ProcessorRunner = class _ProcessorRunner {
  inputProcessors;
  outputProcessors;
  errorProcessors;
  logger;
  agentName;
  /**
   * Shared processor state that persists across loop iterations.
   * Used by all processor methods (input and output) to share state.
   * Keyed by processor ID.
   */
  processorStates;
  constructor({
    inputProcessors,
    outputProcessors,
    errorProcessors,
    logger,
    agentName,
    processorStates
  }) {
    this.inputProcessors = inputProcessors ?? [];
    this.outputProcessors = outputProcessors ?? [];
    this.errorProcessors = errorProcessors ?? [];
    this.logger = logger;
    this.agentName = agentName;
    this.processorStates = processorStates ?? /* @__PURE__ */ new Map();
  }
  /**
   * Get or create ProcessorState for the given processor ID.
   * This state persists across loop iterations and is shared between
   * all processor methods (input and output).
   */
  getProcessorState(processorId) {
    let state = this.processorStates.get(processorId);
    if (!state) {
      state = new ProcessorState();
      this.processorStates.set(processorId, state);
    }
    return state;
  }
  /**
   * Execute a workflow as a processor and handle the result.
   * Returns the processed messages and any tripwire information.
   */
  async executeWorkflowAsProcessor(workflow, input, observabilityContext, requestContext, writer, abortSignal) {
    const run = await workflow.createRun();
    const result = await run.start({
      // Cast to allow processorStates/abortSignal - passed through to workflow processor steps
      // but not part of the official ProcessorStepOutput schema
      inputData: {
        ...input,
        // Pass the processorStates map so workflow processor steps can access their state
        processorStates: this.processorStates,
        // Pass abortSignal so processors can cancel in-flight work
        abortSignal
      },
      ...observabilityContext,
      requestContext,
      outputWriter: writer ? (chunk) => writer.custom(chunk) : void 0
    });
    if (result.status === "tripwire") {
      const tripwireData = result.tripwire;
      throw new TripWire(
        tripwireData?.reason || `Tripwire triggered in workflow ${workflow.id}`,
        {
          retry: tripwireData?.retry,
          metadata: tripwireData?.metadata
        },
        tripwireData?.processorId || workflow.id
      );
    }
    if (result.status !== "success") {
      const details = [];
      if (result.status === "failed") {
        if (result.error) {
          details.push(result.error.message || JSON.stringify(result.error));
        }
        for (const [stepId, step] of Object.entries(result.steps)) {
          if (step.status === "failed" && step.error?.message) {
            details.push(`step ${stepId}: ${step.error.message}`);
          }
        }
      }
      const detailStr = details.length > 0 ? ` \u2014 ${details.join("; ")}` : "";
      throw new MastraError({
        category: "USER",
        domain: "AGENT",
        id: "PROCESSOR_WORKFLOW_FAILED",
        text: `Processor workflow ${workflow.id} failed with status: ${result.status}${detailStr}`
      });
    }
    const output = result.result;
    if (!output || typeof output !== "object") {
      return input;
    }
    if (!("phase" in output) || !("messages" in output || "part" in output || "messageList" in output)) {
      throw new MastraError({
        category: "USER",
        domain: "AGENT",
        id: "PROCESSOR_WORKFLOW_INVALID_OUTPUT",
        text: `Processor workflow ${workflow.id} returned invalid output format. Expected ProcessorStepOutput.`
      });
    }
    return output;
  }
  async runOutputProcessors(messageList, observabilityContext, requestContext, retryCount = 0, writer, result) {
    for (const [index, processorOrWorkflow] of this.outputProcessors.entries()) {
      const allNewMessages = messageList.get.response.db();
      let processableMessages = [...allNewMessages];
      const idsBeforeProcessing = processableMessages.map((m) => m.id);
      const check = messageList.makeMessageSourceChecker();
      if (isProcessorWorkflow(processorOrWorkflow)) {
        await this.executeWorkflowAsProcessor(
          processorOrWorkflow,
          {
            phase: "outputResult",
            messages: processableMessages,
            messageList,
            retryCount,
            result
          },
          observabilityContext,
          requestContext,
          writer
        );
        continue;
      }
      const processor = processorOrWorkflow;
      const abort = (reason, options) => {
        throw new TripWire(reason || `Tripwire triggered by ${processor.id}`, options, processor.id);
      };
      const processMethod = processor.processOutputResult?.bind(processor);
      if (!processMethod) {
        continue;
      }
      const currentSpan = observabilityContext?.tracingContext?.currentSpan;
      const parentSpan = currentSpan?.findParent("agent_run" /* AGENT_RUN */) || currentSpan?.parent || currentSpan;
      const processorSpan = parentSpan?.createChildSpan({
        type: "processor_run" /* PROCESSOR_RUN */,
        name: `output processor: ${processor.id}`,
        entityType: EntityType.OUTPUT_PROCESSOR,
        entityId: processor.id,
        entityName: processor.name,
        attributes: {
          processorExecutor: "legacy",
          processorIndex: index
        },
        input: processableMessages
      });
      messageList.startRecording();
      try {
        const processorState = this.getProcessorState(processor.id);
        const defaultResult = {
          text: "",
          usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
          finishReason: "unknown",
          steps: []
        };
        const processResult = await processMethod({
          messages: processableMessages,
          messageList,
          state: processorState.customState,
          result: result ?? defaultResult,
          abort,
          ...createObservabilityContext({ currentSpan: processorSpan }),
          requestContext,
          retryCount,
          writer
        });
        const mutations = messageList.stopRecording();
        if (processResult instanceof MessageList) {
          if (processResult !== messageList) {
            throw new MastraError({
              category: "USER",
              domain: "AGENT",
              id: "PROCESSOR_RETURNED_EXTERNAL_MESSAGE_LIST",
              text: `Processor ${processor.id} returned a MessageList instance other than the one that was passed in as an argument. New external message list instances are not supported. Use the messageList argument instead.`
            });
          }
          if (mutations.length > 0) {
            processableMessages = processResult.get.response.db();
          }
        } else {
          if (processResult) {
            const deletedIds = idsBeforeProcessing.filter(
              (i) => !processResult.some((m) => m.id === i)
            );
            if (deletedIds.length) {
              messageList.removeByIds(deletedIds);
            }
            processableMessages = processResult || [];
            for (const message of processResult) {
              messageList.removeByIds([message.id]);
              messageList.add(message, check.getSource(message) || "response");
            }
          }
        }
        processorSpan?.end({
          output: processableMessages,
          attributes: mutations.length > 0 ? { messageListMutations: mutations } : void 0
        });
      } catch (error) {
        messageList.stopRecording();
        if (error instanceof TripWire) {
          processorSpan?.error({
            error,
            endSpan: true,
            attributes: {
              tripwireAbort: {
                reason: error.message,
                retry: error.options?.retry,
                metadata: error.options?.metadata
              }
            }
          });
          throw error;
        }
        processorSpan?.error({ error, endSpan: true });
        throw error;
      }
    }
    return messageList;
  }
  /**
   * Process a stream part through all output processors with state management
   */
  async processPart(part, processorStates, observabilityContext, requestContext, messageList, retryCount = 0, writer) {
    if (!this.outputProcessors.length) {
      return { part, blocked: false };
    }
    try {
      let processedPart = part;
      const isFinishChunk = part.type === "finish";
      for (const [index, processorOrWorkflow] of this.outputProcessors.entries()) {
        if (isProcessorWorkflow(processorOrWorkflow)) {
          if (!processedPart) continue;
          const workflowId = processorOrWorkflow.id;
          let state = processorStates.get(workflowId);
          if (!state) {
            state = new ProcessorState();
            processorStates.set(workflowId, state);
          }
          state.addInputPart(processedPart);
          try {
            const result = await this.executeWorkflowAsProcessor(
              processorOrWorkflow,
              {
                phase: "outputStream",
                part: processedPart,
                streamParts: state.streamParts,
                state: state.customState,
                messageList,
                retryCount
              },
              observabilityContext,
              requestContext,
              writer
            );
            if ("part" in result) {
              processedPart = result.part;
            }
            state.addOutputPart(processedPart);
          } catch (error) {
            if (error instanceof TripWire) {
              return {
                part: null,
                blocked: true,
                reason: error.message,
                tripwireOptions: error.options,
                processorId: error.processorId || workflowId
              };
            }
            this.logger.error("Output processor workflow failed", { agent: this.agentName, workflowId, error });
          }
          continue;
        }
        const processor = processorOrWorkflow;
        try {
          if (processor.processOutputStream && processedPart) {
            let state = processorStates.get(processor.id);
            if (!state) {
              state = new ProcessorState({
                processorName: processor.name ?? processor.id,
                ...observabilityContext,
                processorIndex: index,
                createSpan: true
              });
              processorStates.set(processor.id, state);
            }
            state.addInputPart(processedPart);
            const result = await processor.processOutputStream({
              part: processedPart,
              streamParts: state.streamParts,
              state: state.customState,
              abort: (reason, options) => {
                throw new TripWire(reason || `Stream part blocked by ${processor.id}`, options, processor.id);
              },
              ...createObservabilityContext({ currentSpan: state.span }),
              requestContext,
              messageList,
              retryCount,
              writer
            });
            processedPart = result;
            state.addOutputPart(processedPart);
          }
        } catch (error) {
          if (error instanceof TripWire) {
            const state2 = processorStates.get(processor.id);
            state2?.span?.error({
              error,
              endSpan: true,
              attributes: {
                tripwireAbort: {
                  reason: error.message,
                  retry: error.options?.retry,
                  metadata: error.options?.metadata
                }
              }
            });
            return {
              part: null,
              blocked: true,
              reason: error.message,
              tripwireOptions: error.options,
              processorId: processor.id
            };
          }
          const state = processorStates.get(processor.id);
          state?.span?.error({ error, endSpan: true });
          this.logger.error("Output processor failed", { agent: this.agentName, processorId: processor.id, error });
        }
      }
      if (isFinishChunk) {
        for (const state of processorStates.values()) {
          if (state.span) {
            state.span.end({ output: state.getFinalOutput() });
          }
        }
      }
      return { part: processedPart, blocked: false };
    } catch (error) {
      this.logger.error("Stream part processing failed", { agent: this.agentName, error });
      for (const state of processorStates.values()) {
        state.span?.error({ error, endSpan: true });
      }
      return { part, blocked: false };
    }
  }
  async runOutputProcessorsForStream(streamResult, observabilityContext, writer) {
    return new ReadableStream({
      start: async (controller) => {
        const reader = streamResult.fullStream.getReader();
        const processorStates = /* @__PURE__ */ new Map();
        const streamWriter = writer ?? {
          custom: async (data) => controller.enqueue(data)
        };
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              controller.close();
              break;
            }
            const {
              part: processedPart,
              blocked,
              reason,
              tripwireOptions,
              processorId
            } = await this.processPart(
              value,
              processorStates,
              observabilityContext,
              void 0,
              void 0,
              0,
              streamWriter
            );
            if (blocked) {
              void this.logger.debug("Stream part blocked by output processor", {
                agent: this.agentName,
                reason,
                originalPart: value
              });
              controller.enqueue({
                type: "tripwire",
                payload: {
                  reason: reason || "Output processor blocked content",
                  retry: tripwireOptions?.retry,
                  metadata: tripwireOptions?.metadata,
                  processorId
                }
              });
              controller.close();
              break;
            } else if (processedPart !== null) {
              controller.enqueue(processedPart);
            }
          }
        } catch (error) {
          controller.error(error);
        }
      }
    });
  }
  async runInputProcessors(messageList, observabilityContext, requestContext, retryCount = 0) {
    for (const [index, processorOrWorkflow] of this.inputProcessors.entries()) {
      let processableMessages = messageList.get.input.db();
      const inputIds = processableMessages.map((m) => m.id);
      const check = messageList.makeMessageSourceChecker();
      if (isProcessorWorkflow(processorOrWorkflow)) {
        const currentSystemMessages = messageList.getAllSystemMessages();
        await this.executeWorkflowAsProcessor(
          processorOrWorkflow,
          {
            phase: "input",
            messages: processableMessages,
            messageList,
            systemMessages: currentSystemMessages,
            retryCount
          },
          observabilityContext,
          requestContext
        );
        continue;
      }
      const processor = processorOrWorkflow;
      const abort = (reason, options) => {
        throw new TripWire(reason || `Tripwire triggered by ${processor.id}`, options, processor.id);
      };
      const processMethod = processor.processInput?.bind(processor);
      if (!processMethod) {
        continue;
      }
      const currentSpan = observabilityContext?.tracingContext?.currentSpan;
      const parentSpan = currentSpan?.findParent("agent_run" /* AGENT_RUN */) || currentSpan?.parent || currentSpan;
      const processorSpan = parentSpan?.createChildSpan({
        type: "processor_run" /* PROCESSOR_RUN */,
        name: `input processor: ${processor.id}`,
        entityType: EntityType.INPUT_PROCESSOR,
        entityId: processor.id,
        entityName: processor.name,
        attributes: {
          processorExecutor: "legacy",
          processorIndex: index
        },
        input: processableMessages
      });
      messageList.startRecording();
      try {
        const currentSystemMessages = messageList.getAllSystemMessages();
        const processorState = this.getProcessorState(processor.id);
        const result = await processMethod({
          messages: processableMessages,
          systemMessages: currentSystemMessages,
          state: processorState.customState,
          abort,
          ...createObservabilityContext({ currentSpan: processorSpan }),
          messageList,
          requestContext,
          retryCount
        });
        let mutations;
        if (result instanceof MessageList) {
          if (result !== messageList) {
            throw new MastraError({
              category: "USER",
              domain: "AGENT",
              id: "PROCESSOR_RETURNED_EXTERNAL_MESSAGE_LIST",
              text: `Processor ${processor.id} returned a MessageList instance other than the one that was passed in as an argument. New external message list instances are not supported. Use the messageList argument instead.`
            });
          }
          mutations = messageList.stopRecording();
          if (mutations.length > 0) {
            processableMessages = messageList.get.input.db();
          }
        } else if (this.isProcessInputResultWithSystemMessages(result)) {
          mutations = messageList.stopRecording();
          messageList.replaceAllSystemMessages(result.systemMessages);
          const regularMessages = result.messages;
          if (regularMessages) {
            const deletedIds = inputIds.filter((i) => !regularMessages.some((m) => m.id === i));
            if (deletedIds.length) {
              messageList.removeByIds(deletedIds);
            }
            const newSystemMessages = regularMessages.filter((m) => m.role === "system");
            const nonSystemMessages = regularMessages.filter((m) => m.role !== "system");
            for (const sysMsg of newSystemMessages) {
              const systemText = sysMsg.content.content ?? sysMsg.content.parts?.map((p) => p.type === "text" ? p.text : "").join("\n") ?? "";
              messageList.addSystem(systemText);
            }
            if (nonSystemMessages.length > 0) {
              for (const message of nonSystemMessages) {
                messageList.removeByIds([message.id]);
                messageList.add(message, check.getSource(message) || "input");
              }
            }
          }
          processableMessages = messageList.get.input.db();
        } else {
          mutations = messageList.stopRecording();
          if (result) {
            const deletedIds = inputIds.filter((i) => !result.some((m) => m.id === i));
            if (deletedIds.length) {
              messageList.removeByIds(deletedIds);
            }
            const systemMessages = result.filter((m) => m.role === "system");
            const nonSystemMessages = result.filter((m) => m.role !== "system");
            for (const sysMsg of systemMessages) {
              const systemText = sysMsg.content.content ?? sysMsg.content.parts?.map((p) => p.type === "text" ? p.text : "").join("\n") ?? "";
              messageList.addSystem(systemText);
            }
            if (nonSystemMessages.length > 0) {
              for (const message of nonSystemMessages) {
                messageList.removeByIds([message.id]);
                messageList.add(message, check.getSource(message) || "input");
              }
            }
            processableMessages = messageList.get.input.db();
          }
        }
        processorSpan?.end({
          output: processableMessages,
          attributes: mutations.length > 0 ? { messageListMutations: mutations } : void 0
        });
      } catch (error) {
        messageList.stopRecording();
        if (error instanceof TripWire) {
          processorSpan?.error({
            error,
            endSpan: true,
            attributes: {
              tripwireAbort: {
                reason: error.message,
                retry: error.options?.retry,
                metadata: error.options?.metadata
              }
            }
          });
          throw error;
        }
        processorSpan?.error({ error, endSpan: true });
        throw error;
      }
    }
    return messageList;
  }
  /**
   * Run processInputStep for all processors that implement it.
   * Called at each step of the agentic loop, before the LLM is invoked.
   *
   * Unlike processInput which runs once at the start, this runs at every step
   * (including tool call continuations). This is useful for:
   * - Transforming message types between steps (e.g., AI SDK 'reasoning' -> Anthropic 'thinking')
   * - Modifying messages based on step context
   * - Implementing per-step message transformations
   *
   * @param args.messages - The current messages to be sent to the LLM (MastraDBMessage format)
   * @param args.messageList - MessageList instance for managing message sources
   * @param args.stepNumber - The current step number (0-indexed)
   * @param args.tracingContext - Optional tracing context for observability
   * @param args.requestContext - Optional runtime context with execution metadata
   *
   * @returns The processed MessageList
   */
  async runProcessInputStep(args) {
    const { messageList, stepNumber, steps, requestContext, writer } = args;
    const observabilityContext = resolveObservabilityContext(args);
    const stepInput = {
      messageId: args.messageId,
      tools: args.tools,
      toolChoice: args.toolChoice,
      model: args.model,
      activeTools: args.activeTools,
      providerOptions: args.providerOptions,
      modelSettings: args.modelSettings,
      structuredOutput: args.structuredOutput,
      retryCount: args.retryCount ?? 0
    };
    const processors = stepInput.model && isMaybeClaude46(stepInput.model) ? [...this.inputProcessors, new TrailingAssistantGuard()] : this.inputProcessors;
    for (const [index, processorOrWorkflow] of processors.entries()) {
      const processableMessages = messageList.get.all.db();
      const idsBeforeProcessing = processableMessages.map((m) => m.id);
      const check = messageList.makeMessageSourceChecker();
      if (isProcessorWorkflow(processorOrWorkflow)) {
        const currentSystemMessages2 = messageList.getAllSystemMessages();
        const result = await this.executeWorkflowAsProcessor(
          processorOrWorkflow,
          {
            phase: "inputStep",
            messages: processableMessages,
            messageList,
            stepNumber,
            steps,
            systemMessages: currentSystemMessages2,
            rotateResponseMessageId: args.rotateResponseMessageId ? () => {
              const nextMessageId = args.rotateResponseMessageId();
              stepInput.messageId = nextMessageId;
              return nextMessageId;
            } : void 0,
            ...stepInput
          },
          observabilityContext,
          requestContext,
          writer,
          args.abortSignal
        );
        Object.assign(stepInput, result);
        continue;
      }
      const processor = processorOrWorkflow;
      const processMethod = processor.processInputStep?.bind(processor);
      if (!processMethod) {
        continue;
      }
      const abort = (reason, options) => {
        throw new TripWire(reason || `Tripwire triggered by ${processor.id}`, options, processor.id);
      };
      const currentSystemMessages = messageList.getAllSystemMessages();
      const inputData = {
        messages: processableMessages,
        stepNumber,
        steps,
        messageId: stepInput.messageId,
        systemMessages: currentSystemMessages,
        tools: stepInput.tools,
        toolChoice: stepInput.toolChoice,
        model: stepInput.model,
        activeTools: stepInput.activeTools,
        providerOptions: stepInput.providerOptions,
        modelSettings: stepInput.modelSettings,
        structuredOutput: stepInput.structuredOutput,
        requestContext
      };
      const currentSpan = observabilityContext.tracingContext?.currentSpan;
      const processorSpan = currentSpan?.createChildSpan({
        type: "processor_run" /* PROCESSOR_RUN */,
        name: `input step processor: ${processor.id}`,
        entityType: EntityType.INPUT_STEP_PROCESSOR,
        entityId: processor.id,
        entityName: processor.name,
        attributes: {
          processorExecutor: "legacy",
          processorIndex: index
        },
        input: {
          ...inputData,
          model: {
            id: inputData.model.modelId,
            provider: inputData.model.provider,
            specificationVersion: inputData.model.specificationVersion
          }
        }
      });
      messageList.startRecording();
      try {
        const processorState = this.getProcessorState(processor.id);
        const processMethodArgs = {
          messageList,
          ...inputData,
          state: processorState.customState,
          abort,
          ...args.rotateResponseMessageId ? {
            rotateResponseMessageId: () => {
              const nextMessageId = args.rotateResponseMessageId();
              stepInput.messageId = nextMessageId;
              return nextMessageId;
            }
          } : {},
          ...createObservabilityContext({ currentSpan: processorSpan }),
          retryCount: args.retryCount ?? 0,
          writer,
          abortSignal: args.abortSignal
        };
        const result = await _ProcessorRunner.validateAndFormatProcessInputStepResult(
          await processMethod(processMethodArgs),
          {
            messageList,
            processor,
            stepNumber
          }
        );
        const { messages, systemMessages, ...rest } = result;
        if (messages) {
          _ProcessorRunner.applyMessagesToMessageList(messages, messageList, idsBeforeProcessing, check);
        }
        if (systemMessages) {
          messageList.replaceAllSystemMessages(systemMessages);
        }
        Object.assign(stepInput, rest);
        const mutations = messageList.stopRecording();
        processorSpan?.end({
          output: {
            ...stepInput,
            messages: messageList.get.all.db(),
            systemMessages: messageList.getAllSystemMessages(),
            model: stepInput.model ? {
              modelId: stepInput.model.modelId,
              provider: stepInput.model.provider,
              specificationVersion: stepInput.model.specificationVersion
            } : void 0
          },
          attributes: mutations.length > 0 ? { messageListMutations: mutations } : void 0
        });
      } catch (error) {
        messageList.stopRecording();
        if (error instanceof TripWire) {
          processorSpan?.error({
            error,
            endSpan: true,
            attributes: {
              tripwireAbort: {
                reason: error.message,
                retry: error.options?.retry,
                metadata: error.options?.metadata
              }
            }
          });
          throw error;
        }
        processorSpan?.error({ error, endSpan: true });
        throw error;
      }
    }
    return stepInput;
  }
  /**
   * Type guard to check if result is { messages, systemMessages }
   */
  isProcessInputResultWithSystemMessages(result) {
    return result !== null && typeof result === "object" && "messages" in result && "systemMessages" in result && Array.isArray(result.messages) && Array.isArray(result.systemMessages);
  }
  /**
   * Run processOutputStep for all processors that implement it.
   * Called after each LLM response in the agentic loop, before tool execution.
   *
   * Unlike processOutputResult which runs once at the end, this runs at every step.
   * This is the ideal place to implement guardrails that can trigger retries.
   *
   * @param args.messages - The current messages including the LLM response
   * @param args.messageList - MessageList instance for managing message sources
   * @param args.stepNumber - The current step number (0-indexed)
   * @param args.finishReason - The finish reason from the LLM
   * @param args.toolCalls - Tool calls made in this step (if any)
   * @param args.text - Generated text from this step
   * @param args.tracingContext - Optional tracing context for observability
   * @param args.requestContext - Optional runtime context with execution metadata
   * @param args.retryCount - Number of times processors have triggered retry
   *
   * @returns The processed MessageList
   */
  async runProcessOutputStep(args) {
    const {
      steps,
      messageList,
      stepNumber,
      finishReason,
      toolCalls,
      text,
      requestContext,
      retryCount = 0,
      writer
    } = args;
    const observabilityContext = resolveObservabilityContext(args);
    for (const [index, processorOrWorkflow] of this.outputProcessors.entries()) {
      const processableMessages = messageList.get.all.db();
      const idsBeforeProcessing = processableMessages.map((m) => m.id);
      const check = messageList.makeMessageSourceChecker();
      if (isProcessorWorkflow(processorOrWorkflow)) {
        const currentSystemMessages2 = messageList.getAllSystemMessages();
        await this.executeWorkflowAsProcessor(
          processorOrWorkflow,
          {
            phase: "outputStep",
            messages: processableMessages,
            messageList,
            stepNumber,
            finishReason,
            toolCalls,
            text,
            systemMessages: currentSystemMessages2,
            steps,
            retryCount
          },
          observabilityContext,
          requestContext,
          writer
        );
        continue;
      }
      const processor = processorOrWorkflow;
      const processMethod = processor.processOutputStep?.bind(processor);
      if (!processMethod) {
        continue;
      }
      const abort = (reason, options) => {
        throw new TripWire(reason || `Tripwire triggered by ${processor.id}`, options, processor.id);
      };
      const currentSpan = observabilityContext.tracingContext?.currentSpan;
      const parentSpan = currentSpan?.findParent("agent_run" /* AGENT_RUN */) || currentSpan?.parent || currentSpan;
      const processorSpan = parentSpan?.createChildSpan({
        type: "processor_run" /* PROCESSOR_RUN */,
        name: `output step processor: ${processor.id}`,
        entityType: EntityType.OUTPUT_STEP_PROCESSOR,
        entityId: processor.id,
        entityName: processor.name,
        attributes: {
          processorExecutor: "legacy",
          processorIndex: index
        },
        input: { messages: processableMessages, stepNumber, finishReason, toolCalls, text }
      });
      messageList.startRecording();
      const currentSystemMessages = messageList.getAllSystemMessages();
      const processorState = this.getProcessorState(processor.id);
      try {
        const result = await processMethod({
          messages: processableMessages,
          messageList,
          stepNumber,
          finishReason,
          toolCalls,
          text,
          systemMessages: currentSystemMessages,
          steps,
          state: processorState.customState,
          abort,
          ...createObservabilityContext({ currentSpan: processorSpan }),
          requestContext,
          retryCount,
          writer
        });
        const mutations = messageList.stopRecording();
        if (result instanceof MessageList) {
          if (result !== messageList) {
            throw new MastraError({
              category: "USER",
              domain: "AGENT",
              id: "PROCESSOR_RETURNED_EXTERNAL_MESSAGE_LIST",
              text: `Processor ${processor.id} returned a MessageList instance other than the one that was passed in as an argument. New external message list instances are not supported. Use the messageList argument instead.`
            });
          }
        } else if (result) {
          const deletedIds = idsBeforeProcessing.filter(
            (i) => !result.some((m) => m.id === i)
          );
          if (deletedIds.length) {
            messageList.removeByIds(deletedIds);
          }
          for (const message of result) {
            messageList.removeByIds([message.id]);
            if (message.role === "system") {
              const systemText = message.content.content ?? message.content.parts?.map((p) => p.type === "text" ? p.text : "").join("\n") ?? "";
              messageList.addSystem(systemText);
            } else {
              messageList.add(message, check.getSource(message) || "response");
            }
          }
        }
        processorSpan?.end({
          output: messageList.get.all.db(),
          attributes: mutations.length > 0 ? { messageListMutations: mutations } : void 0
        });
      } catch (error) {
        messageList.stopRecording();
        if (error instanceof TripWire) {
          processorSpan?.error({
            error,
            endSpan: true,
            attributes: {
              tripwireAbort: {
                reason: error.message,
                retry: error.options?.retry,
                metadata: error.options?.metadata
              }
            }
          });
          throw error;
        }
        processorSpan?.error({ error, endSpan: true });
        throw error;
      }
    }
    return messageList;
  }
  /**
   * Run processAPIError on all processors that implement it.
   * Called when an LLM API call fails with a non-retryable error.
   * Iterates through both input and output processors.
   *
   * @returns { retry: boolean } indicating whether to retry the LLM call
   */
  async runProcessAPIError(args) {
    const { error, messageList, stepNumber, steps, requestContext, retryCount = 0, writer, abortSignal } = args;
    const observabilityContext = resolveObservabilityContext(args);
    const allProcessors = [
      ...this.inputProcessors,
      ...this.outputProcessors,
      ...this.errorProcessors
    ];
    for (const [index, processorOrWorkflow] of allProcessors.entries()) {
      if (isProcessorWorkflow(processorOrWorkflow)) {
        continue;
      }
      const processor = processorOrWorkflow;
      const processMethod = processor.processAPIError?.bind(processor);
      if (!processMethod) {
        continue;
      }
      const abort = (reason, options) => {
        throw new TripWire(reason || `Tripwire triggered by ${processor.id}`, options, processor.id);
      };
      const currentSpan = observabilityContext.tracingContext?.currentSpan;
      const parentSpan = currentSpan?.findParent("agent_run" /* AGENT_RUN */) || currentSpan?.parent || currentSpan;
      const processorSpan = parentSpan?.createChildSpan({
        type: "processor_run" /* PROCESSOR_RUN */,
        name: `request error processor: ${processor.id}`,
        entityType: EntityType.OUTPUT_STEP_PROCESSOR,
        entityId: processor.id,
        entityName: processor.name,
        attributes: {
          processorExecutor: "legacy",
          processorIndex: index
        },
        input: { error: error instanceof Error ? error.message : String(error), stepNumber }
      });
      messageList.startRecording();
      const processableMessages = messageList.get.all.db();
      const processorState = this.getProcessorState(processor.id);
      try {
        const result = await processMethod({
          messages: processableMessages,
          messageList,
          stepNumber,
          steps,
          state: processorState.customState,
          error,
          abort,
          ...createObservabilityContext({ currentSpan: processorSpan }),
          requestContext,
          retryCount,
          writer,
          abortSignal,
          messageId: args.messageId,
          ...args.rotateResponseMessageId ? {
            rotateResponseMessageId: args.rotateResponseMessageId
          } : {}
        });
        const mutations = messageList.stopRecording();
        processorSpan?.end({
          output: { retry: result?.retry ?? false },
          attributes: mutations.length > 0 ? { messageListMutations: mutations } : void 0
        });
        if (result?.retry) {
          return { retry: true };
        }
      } catch (processorError) {
        messageList.stopRecording();
        if (processorError instanceof TripWire) {
          processorSpan?.error({
            error: processorError,
            endSpan: true,
            attributes: {
              tripwireAbort: {
                reason: processorError.message,
                retry: processorError.options?.retry,
                metadata: processorError.options?.metadata
              }
            }
          });
          throw processorError;
        }
        processorSpan?.error({ error: processorError, endSpan: true });
        this.logger.error(
          `[Agent:${this.agentName}] - Request error processor ${processor.id} failed:`,
          processorError
        );
      }
    }
    return { retry: false };
  }
  static applyMessagesToMessageList(messages, messageList, idsBeforeProcessing, check, defaultSource = "input") {
    const deletedIds = idsBeforeProcessing.filter((i) => !messages.some((m) => m.id === i));
    if (deletedIds.length) {
      messageList.removeByIds(deletedIds);
    }
    for (const message of messages) {
      messageList.removeByIds([message.id]);
      if (message.role === "system") {
        const systemText = message.content.content ?? message.content.parts?.map((p) => p.type === "text" ? p.text : "").join("\n") ?? "";
        messageList.addSystem(systemText);
      } else {
        messageList.add(message, check.getSource(message) || defaultSource);
      }
    }
  }
  static async validateAndFormatProcessInputStepResult(result, {
    messageList,
    processor,
    stepNumber
  }) {
    if (result instanceof MessageList) {
      if (result !== messageList) {
        throw new MastraError({
          category: "USER",
          domain: "AGENT",
          id: "PROCESSOR_RETURNED_EXTERNAL_MESSAGE_LIST",
          text: `Processor ${processor.id} returned a MessageList instance other than the one that was passed in as an argument. New external message list instances are not supported. Use the messageList argument instead.`
        });
      }
      return {
        messageList: result
      };
    } else if (Array.isArray(result)) {
      return {
        messages: result
      };
    } else if (result) {
      if (result.messageList && result.messageList !== messageList) {
        throw new MastraError({
          category: "USER",
          domain: "AGENT",
          id: "PROCESSOR_RETURNED_EXTERNAL_MESSAGE_LIST",
          text: `Processor ${processor.id} returned a MessageList instance other than the one that was passed in as an argument. New external message list instances are not supported. Use the messageList argument instead.`
        });
      }
      if (result.messages && result.messageList) {
        throw new MastraError({
          category: "USER",
          domain: "AGENT",
          id: "PROCESSOR_RETURNED_MESSAGES_AND_MESSAGE_LIST",
          text: `Processor ${processor.id} returned both messages and messageList. Only one of these is allowed.`
        });
      }
      const { model: _model, ...rest } = result;
      if (result.model) {
        const resolvedModel = await resolveModelConfig(result.model);
        const isSupported = isSupportedLanguageModel(resolvedModel);
        if (!isSupported) {
          throw new MastraError({
            category: "USER",
            domain: "AGENT",
            id: "PROCESSOR_RETURNED_UNSUPPORTED_MODEL",
            text: `Processor ${processor.id} returned an unsupported model version ${resolvedModel.specificationVersion} in step ${stepNumber}. Only ${supportedLanguageModelSpecifications.join(", ")} models are supported in processInputStep.`
          });
        }
        return {
          model: resolvedModel,
          ...rest
        };
      }
      return rest;
    }
    return {};
  }
};

// src/stream/base/input.ts
function safeEnqueue(controller, chunk) {
  try {
    controller.enqueue(chunk);
    return true;
  } catch {
    return false;
  }
}
function safeClose(controller) {
  try {
    controller.close();
    return true;
  } catch {
    return false;
  }
}
function safeError(controller, error) {
  try {
    controller.error(error);
    return true;
  } catch {
    return false;
  }
}
var MastraModelInput = class extends MastraBase {
  initialize({ runId, createStream, onResult }) {
    const self = this;
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const stream2 = await createStream();
          onResult({
            warnings: stream2.warnings,
            request: stream2.request,
            rawResponse: stream2.rawResponse || stream2.response || {}
          });
          await self.transform({
            runId,
            stream: stream2.stream,
            controller
          });
          safeClose(controller);
        } catch (error) {
          safeError(controller, error);
        }
      }
    });
    return stream;
  }
};

// src/stream/base/schema.ts
function asJsonSchema(schema) {
  if (!schema) {
    return void 0;
  }
  if (isStandardSchemaWithJSON(schema)) {
    const jsonSchema = standardSchemaToJSONSchema(schema, { io: "input", target: "draft-07" });
    return jsonSchema;
  }
  return schema;
}
function getTransformedSchema(schema) {
  const jsonSchema = asJsonSchema(schema);
  if (!jsonSchema) {
    return void 0;
  }
  const { $schema, ...itemSchema } = jsonSchema;
  if (itemSchema.type === "array") {
    const innerElement = itemSchema.items;
    const arrayOutputSchema = {
      $schema,
      type: "object",
      properties: {
        elements: { type: "array", items: innerElement }
      },
      required: ["elements"],
      additionalProperties: false
    };
    return {
      jsonSchema: arrayOutputSchema,
      outputFormat: "array"
    };
  }
  if (itemSchema.enum && Array.isArray(itemSchema.enum)) {
    const enumOutputSchema = {
      $schema,
      type: "object",
      properties: {
        result: { type: itemSchema.type || "string", enum: itemSchema.enum }
      },
      required: ["result"],
      additionalProperties: false
    };
    return {
      jsonSchema: enumOutputSchema,
      outputFormat: "enum"
    };
  }
  return {
    jsonSchema,
    outputFormat: jsonSchema.type
    // 'object'
  };
}
function getResponseFormat(schema) {
  if (schema) {
    const transformedSchema = getTransformedSchema(schema);
    return {
      type: "json",
      schema: transformedSchema?.jsonSchema
    };
  }
  return {
    type: "text"
  };
}

// src/stream/base/output-format-handlers.ts
function escapeUnescapedControlCharsInJsonStrings(text) {
  let result = "";
  let inString = false;
  let i = 0;
  while (i < text.length) {
    const char = text[i];
    if (char === "\\" && i + 1 < text.length) {
      result += char + text[i + 1];
      i += 2;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      result += char;
      i++;
      continue;
    }
    if (inString) {
      if (char === "\n") {
        result += "\\n";
        i++;
        continue;
      }
      if (char === "\r") {
        result += "\\r";
        i++;
        continue;
      }
      if (char === "	") {
        result += "\\t";
        i++;
        continue;
      }
    }
    result += char;
    i++;
  }
  return result;
}
var BaseFormatHandler = class {
  /**
   * The original user-provided schema (Zod, JSON Schema, or AI SDK Schema).
   */
  schema;
  /**
   * Validate partial chunks as they are streamed. @planned
   */
  validatePartialChunks = false;
  partialSchema;
  constructor(schema, options = {}) {
    this.schema = schema;
    if (options.validatePartialChunks && this.isZodSchema(schema) && "partial" in schema && typeof schema.partial === "function") {
      this.partialSchema = schema.partial();
      this.validatePartialChunks = true;
    }
  }
  /**
   * Checks if the original schema is a Zod schema with safeParse method.
   */
  isZodSchema(schema) {
    return isZodType(schema);
  }
  /**
   * Validates a value against the schema using StandardSchemaWithJSON's validate method.
   */
  async validateValue(value) {
    if (!this.schema) {
      return {
        success: true,
        value
      };
    }
    if (this.isZodSchema(this.schema)) {
      try {
        const ssResult = await this.schema["~standard"].validate(value);
        if (!ssResult.issues) {
          return {
            success: true,
            value: ssResult.value
          };
        }
        const errorMessages = ssResult.issues.map((e) => `- ${e.path?.join(".") || "root"}: ${e.message}`).join("\n");
        const zodResult = this.schema.safeParse(value);
        const zodError = !zodResult.success ? zodResult.error : void 0;
        return {
          success: false,
          error: new MastraError(
            {
              domain: "AGENT" /* AGENT */,
              category: "SYSTEM" /* SYSTEM */,
              id: "STRUCTURED_OUTPUT_SCHEMA_VALIDATION_FAILED",
              text: `Structured output validation failed: ${errorMessages}`,
              details: {
                value: typeof value === "object" ? JSON.stringify(value) : String(value)
              }
            },
            zodError
          )
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error : new Error("Zod validation failed", { cause: error })
        };
      }
    }
    try {
      const ssResult = await this.schema["~standard"].validate(value);
      if (!ssResult.issues) {
        return {
          success: true,
          value: ssResult.value
        };
      }
      const errorMessages = ssResult.issues.map((e) => `- ${e.path?.join(".") || "root"}: ${e.message}`).join("\n");
      return {
        success: false,
        error: new MastraError({
          domain: "AGENT" /* AGENT */,
          category: "SYSTEM" /* SYSTEM */,
          id: "STRUCTURED_OUTPUT_SCHEMA_VALIDATION_FAILED",
          text: `Structured output validation failed: ${errorMessages}`,
          details: {
            value: typeof value === "object" ? JSON.stringify(value) : String(value)
          }
        })
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error("Validation failed", { cause: error })
      };
    }
  }
  /**
   * Preprocesses accumulated text to handle LLMs that wrap JSON in code blocks
   * and fix common JSON formatting issues like unescaped newlines in strings.
   * Extracts content from the first complete valid ```json...``` code block or removes opening ```json prefix if no complete code block is found (streaming chunks).
   * @param accumulatedText - Raw accumulated text from streaming
   * @returns Processed text ready for JSON parsing
   */
  preprocessText(accumulatedText) {
    let processedText = accumulatedText;
    if (processedText.includes("<|message|>")) {
      const match = processedText.match(/<\|message\|>([\s\S]+)$/);
      if (match && match[1]) {
        processedText = match[1];
      }
    }
    const trimmedStart = processedText.trimStart();
    if (/^```json\b/.test(trimmedStart)) {
      const match = trimmedStart.match(/^```json\s*\n?([\s\S]*?)\n?\s*```\s*$/);
      if (match && match[1]) {
        processedText = match[1].trim();
      } else {
        processedText = trimmedStart.replace(/^```json\s*\n?/, "");
      }
    }
    processedText = escapeUnescapedControlCharsInJsonStrings(processedText);
    return processedText;
  }
};
var ObjectFormatHandler = class extends BaseFormatHandler {
  type = "object";
  async processPartialChunk({
    accumulatedText,
    previousObject
  }) {
    const processedAccumulatedText = this.preprocessText(accumulatedText);
    const { value: currentObjectJson, state } = await parsePartialJson(processedAccumulatedText);
    if (this.validatePartialChunks && this.partialSchema) {
      const result = this.partialSchema?.safeParse(currentObjectJson);
      if (result.success && result.data && result.data !== void 0 && !isDeepEqualData(previousObject, result.data)) {
        return {
          shouldEmit: true,
          emitValue: result.data,
          newPreviousResult: result.data
        };
      }
      return { shouldEmit: false };
    }
    if (currentObjectJson !== void 0 && currentObjectJson !== null && typeof currentObjectJson === "object" && !isDeepEqualData(previousObject, currentObjectJson)) {
      return {
        shouldEmit: ["successful-parse", "repaired-parse"].includes(state),
        emitValue: currentObjectJson,
        newPreviousResult: currentObjectJson
      };
    }
    return { shouldEmit: false };
  }
  async validateAndTransformFinal(finalRawValue) {
    if (!finalRawValue) {
      return {
        success: false,
        error: new Error("No object generated: could not parse the response.")
      };
    }
    const rawValue = this.preprocessText(finalRawValue);
    const { value } = await parsePartialJson(rawValue);
    return this.validateValue(value);
  }
};
var ArrayFormatHandler = class extends BaseFormatHandler {
  type = "array";
  /** Previously filtered array to track changes */
  textPreviousFilteredArray = [];
  /** Whether we've emitted the initial empty array */
  hasEmittedInitialArray = false;
  async processPartialChunk({
    accumulatedText,
    previousObject
  }) {
    const processedAccumulatedText = this.preprocessText(accumulatedText);
    const { value: currentObjectJson, state: parseState } = await parsePartialJson(processedAccumulatedText);
    if (currentObjectJson !== void 0 && !isDeepEqualData(previousObject, currentObjectJson)) {
      const rawElements = currentObjectJson && typeof currentObjectJson === "object" && "elements" in currentObjectJson && Array.isArray(currentObjectJson.elements) ? currentObjectJson.elements : [];
      const filteredElements = [];
      for (let i = 0; i < rawElements.length; i++) {
        const element = rawElements[i];
        if (i === rawElements.length - 1 && parseState !== "successful-parse") {
          if (element && typeof element === "object" && Object.keys(element).length > 0) {
            filteredElements.push(element);
          }
        } else {
          if (element && typeof element === "object" && Object.keys(element).length > 0) {
            filteredElements.push(element);
          }
        }
      }
      if (!this.hasEmittedInitialArray) {
        this.hasEmittedInitialArray = true;
        if (filteredElements.length === 0) {
          this.textPreviousFilteredArray = [];
          return {
            shouldEmit: true,
            emitValue: [],
            newPreviousResult: currentObjectJson
          };
        }
      }
      if (!isDeepEqualData(this.textPreviousFilteredArray, filteredElements)) {
        this.textPreviousFilteredArray = [...filteredElements];
        return {
          shouldEmit: true,
          emitValue: filteredElements,
          newPreviousResult: currentObjectJson
        };
      }
    }
    return { shouldEmit: false };
  }
  async validateAndTransformFinal(_finalValue) {
    const resultValue = this.textPreviousFilteredArray;
    if (!resultValue) {
      return {
        success: false,
        error: new Error("No object generated: could not parse the response.")
      };
    }
    return this.validateValue(resultValue);
  }
};
var EnumFormatHandler = class extends BaseFormatHandler {
  type = "enum";
  /** Previously emitted enum result to avoid duplicate emissions */
  textPreviousEnumResult;
  /**
   * Finds the best matching enum value for a partial result string.
   * If multiple values match, returns the partial string. If only one matches, returns that value.
   * @param partialResult - Partial enum string from streaming
   * @returns Best matching enum value or undefined if no matches
   */
  findBestEnumMatch(partialResult) {
    if (!this.schema) {
      return void 0;
    }
    const outputJsonSchema = standardSchemaToJSONSchema(this.schema);
    const enumValues = outputJsonSchema?.enum;
    if (!enumValues) {
      return void 0;
    }
    const possibleEnumValues = enumValues.filter((value) => typeof value === "string").filter((enumValue) => enumValue.startsWith(partialResult));
    if (possibleEnumValues.length === 0) {
      return void 0;
    }
    const firstMatch = possibleEnumValues[0];
    return possibleEnumValues.length === 1 && firstMatch !== void 0 ? firstMatch : partialResult;
  }
  async processPartialChunk({
    accumulatedText,
    previousObject
  }) {
    const processedAccumulatedText = this.preprocessText(accumulatedText);
    const { value: currentObjectJson } = await parsePartialJson(processedAccumulatedText);
    if (currentObjectJson !== void 0 && currentObjectJson !== null && typeof currentObjectJson === "object" && !Array.isArray(currentObjectJson) && "result" in currentObjectJson && typeof currentObjectJson.result === "string" && !isDeepEqualData(previousObject, currentObjectJson)) {
      const partialResult = currentObjectJson.result;
      const bestMatch = this.findBestEnumMatch(partialResult);
      if (partialResult.length > 0 && bestMatch && bestMatch !== this.textPreviousEnumResult) {
        this.textPreviousEnumResult = bestMatch;
        return {
          shouldEmit: true,
          emitValue: bestMatch,
          newPreviousResult: currentObjectJson
        };
      }
    }
    return { shouldEmit: false };
  }
  async validateAndTransformFinal(rawFinalValue) {
    const processedValue = this.preprocessText(rawFinalValue);
    const { value } = await parsePartialJson(processedValue);
    if (!(typeof value === "object" && value !== null && "result" in value)) {
      return {
        success: false,
        error: new Error("Invalid enum format: expected object with result property")
      };
    }
    const finalValue = value;
    if (!finalValue || typeof finalValue !== "object" || typeof finalValue.result !== "string") {
      return {
        success: false,
        error: new Error("Invalid enum format: expected object with result property")
      };
    }
    return this.validateValue(finalValue.result);
  }
};
function createOutputHandler({ schema }) {
  const normalizedSchema = schema ? toStandardSchema5(schema) : void 0;
  const transformedSchema = getTransformedSchema(normalizedSchema);
  switch (transformedSchema?.outputFormat) {
    case "array":
      return new ArrayFormatHandler(normalizedSchema);
    case "enum":
      return new EnumFormatHandler(normalizedSchema);
    case "object":
    default:
      return new ObjectFormatHandler(normalizedSchema);
  }
}
function createObjectStreamTransformer({
  structuredOutput,
  logger
}) {
  const handler = createOutputHandler({ schema: structuredOutput?.schema });
  let accumulatedText = "";
  let previousObject = void 0;
  let currentRunId;
  let finalResult;
  return new TransformStream({
    async transform(chunk, controller) {
      if (chunk.runId) {
        currentRunId = chunk.runId;
      }
      if (chunk.type === "text-delta" && typeof chunk.payload?.text === "string") {
        accumulatedText += chunk.payload.text;
        const result = await handler.processPartialChunk({
          accumulatedText,
          previousObject
        });
        if (result.shouldEmit) {
          previousObject = result.newPreviousResult ?? previousObject;
          const chunkData = {
            from: chunk.from,
            runId: chunk.runId,
            type: "object",
            object: result.emitValue
            // TODO: handle partial runtime type validation of json chunks
          };
          controller.enqueue(chunkData);
        }
      }
      if (chunk.type === "text-end") {
        controller.enqueue(chunk);
        if (accumulatedText?.trim() && !finalResult) {
          finalResult = await handler.validateAndTransformFinal(accumulatedText);
          if (finalResult.success) {
            controller.enqueue({
              from: "AGENT" /* AGENT */,
              runId: currentRunId ?? "",
              type: "object-result",
              object: finalResult.value
            });
          }
        }
        return;
      }
      controller.enqueue(chunk);
    },
    async flush(controller) {
      if (finalResult && !finalResult.success) {
        handleValidationError(finalResult.error, controller);
      }
      if (accumulatedText?.trim() && !finalResult) {
        finalResult = await handler.validateAndTransformFinal(accumulatedText);
        if (finalResult.success) {
          controller.enqueue({
            from: "AGENT" /* AGENT */,
            runId: currentRunId ?? "",
            type: "object-result",
            object: finalResult.value
          });
        } else {
          handleValidationError(finalResult.error, controller);
        }
      }
    }
  });
  function handleValidationError(error, controller) {
    if (structuredOutput?.errorStrategy === "warn") {
      logger?.warn(error.message);
    } else if (structuredOutput?.errorStrategy === "fallback") {
      controller.enqueue({
        from: "AGENT" /* AGENT */,
        runId: currentRunId ?? "",
        type: "object-result",
        object: structuredOutput.fallbackValue
      });
    } else {
      controller.enqueue({
        from: "AGENT" /* AGENT */,
        runId: currentRunId ?? "",
        type: "error",
        payload: {
          error
        }
      });
    }
  }
}
function createJsonTextStreamTransformer(schema) {
  let previousArrayLength = 0;
  let hasStartedArray = false;
  let chunkCount = 0;
  const outputSchema = getTransformedSchema(schema);
  return new TransformStream({
    transform(chunk, controller) {
      if (chunk.type !== "object" || !chunk.object) {
        return;
      }
      if (outputSchema?.outputFormat === "array" && Array.isArray(chunk.object)) {
        chunkCount++;
        if (chunkCount === 1) {
          if (chunk.object.length > 0) {
            controller.enqueue(JSON.stringify(chunk.object));
            previousArrayLength = chunk.object.length;
            hasStartedArray = true;
            return;
          }
        }
        if (!hasStartedArray) {
          controller.enqueue("[");
          hasStartedArray = true;
        }
        for (let i = previousArrayLength; i < chunk.object.length; i++) {
          const elementJson = JSON.stringify(chunk.object[i]);
          if (i > 0) {
            controller.enqueue("," + elementJson);
          } else {
            controller.enqueue(elementJson);
          }
        }
        previousArrayLength = chunk.object.length;
      } else {
        controller.enqueue(JSON.stringify(chunk.object));
      }
    },
    flush(controller) {
      if (hasStartedArray && outputSchema?.outputFormat === "array" && chunkCount > 1) {
        controller.enqueue("]");
      }
    }
  });
}

// src/stream/base/output.ts
function createDestructurableOutput(output) {
  return new Proxy(output, {
    get(target, prop, _receiver) {
      const originalValue = Reflect.get(target, prop, target);
      if (typeof originalValue === "function") {
        return originalValue.bind(target);
      }
      return originalValue;
    }
  });
}
var MastraModelOutput = class extends MastraBase {
  #status = "running";
  #error;
  #baseStream;
  #bufferedChunks = [];
  #streamFinished = false;
  #emitter = new eventsExports.EventEmitter();
  #bufferedSteps = [];
  #bufferedReasoningDetails = {};
  #bufferedByStep = {
    text: "",
    reasoning: [],
    sources: [],
    files: [],
    toolCalls: [],
    toolResults: [],
    dynamicToolCalls: [],
    dynamicToolResults: [],
    staticToolCalls: [],
    staticToolResults: [],
    content: [],
    usage: { inputTokens: void 0, outputTokens: void 0, totalTokens: void 0 },
    warnings: [],
    request: {},
    response: {
      id: "",
      timestamp: /* @__PURE__ */ new Date(),
      modelId: "",
      messages: [],
      uiMessages: []
    },
    reasoningText: "",
    providerMetadata: void 0,
    finishReason: void 0
  };
  #bufferedText = [];
  #bufferedObject;
  #bufferedTextChunks = {};
  #bufferedSources = [];
  #bufferedReasoning = [];
  #bufferedFiles = [];
  #toolCallArgsDeltas = {};
  #toolCallDeltaIdNameMap = {};
  #toolCallStreamingMeta = {};
  #toolCalls = [];
  #toolResults = [];
  #warnings = [];
  #finishReason = void 0;
  #request = {};
  #usageCount = {
    inputTokens: void 0,
    outputTokens: void 0,
    totalTokens: void 0
  };
  #tripwire = void 0;
  #transportRef;
  #transportClosed = false;
  #delayedPromises = {
    suspendPayload: new DelayedPromise(),
    resumeSchema: new DelayedPromise(),
    object: new DelayedPromise(),
    finishReason: new DelayedPromise(),
    usage: new DelayedPromise(),
    warnings: new DelayedPromise(),
    providerMetadata: new DelayedPromise(),
    response: new DelayedPromise(),
    request: new DelayedPromise(),
    text: new DelayedPromise(),
    reasoning: new DelayedPromise(),
    reasoningText: new DelayedPromise(),
    sources: new DelayedPromise(),
    files: new DelayedPromise(),
    toolCalls: new DelayedPromise(),
    toolResults: new DelayedPromise(),
    steps: new DelayedPromise(),
    totalUsage: new DelayedPromise(),
    content: new DelayedPromise()
  };
  #consumptionStarted = false;
  #returnScorerData = false;
  #structuredOutputMode = void 0;
  #model;
  /**
   * Unique identifier for this execution run.
   */
  runId;
  #options;
  /**
   * The processor runner for this stream.
   */
  processorRunner;
  /**
   * The message list for this stream.
   */
  messageList;
  /**
   * Trace ID for this execution.
   */
  traceId;
  /**
   * Root span ID for this execution, identifying the top-level span in the trace.
   */
  spanId;
  messageId;
  constructor({
    model: _model,
    stream,
    messageList,
    options,
    messageId,
    initialState
  }) {
    super({ component: "LLM", name: "MastraModelOutput" });
    this.#options = options;
    this.#transportRef = options.transportRef;
    this.#returnScorerData = !!options.returnScorerData;
    this.runId = options.runId;
    const resultSpan = getRootExportSpan(options.tracingContext?.currentSpan);
    this.traceId = resultSpan?.externalTraceId;
    this.spanId = resultSpan?.id;
    this.#model = _model;
    this.messageId = messageId;
    if (options.structuredOutput?.schema) {
      this.#structuredOutputMode = options.structuredOutput.model ? "processor" : "direct";
    }
    if (options.outputProcessors?.length) {
      this.processorRunner = new ProcessorRunner({
        inputProcessors: [],
        outputProcessors: options.outputProcessors,
        logger: this.logger,
        agentName: "MastraModelOutput",
        processorStates: options.processorStates
      });
    }
    this.messageList = messageList;
    const self = this;
    let processedStream = stream;
    const processorRunner = this.processorRunner;
    if (processorRunner && options.isLLMExecutionStep) {
      const processorStates = options.processorStates || /* @__PURE__ */ new Map();
      processedStream = stream.pipeThrough(
        new TransformStream({
          async transform(chunk, controller) {
            if (chunk.type === "finish" && chunk.payload?.stepResult?.reason === "tool-calls") {
              controller.enqueue(chunk);
              return;
            } else {
              if (!processorStates.has(STRUCTURED_OUTPUT_PROCESSOR_NAME)) {
                const processorIndex = processorRunner.outputProcessors.findIndex(
                  (p) => p.name === STRUCTURED_OUTPUT_PROCESSOR_NAME
                );
                if (processorIndex !== -1) {
                  const structuredOutputProcessorState = new ProcessorState({
                    processorName: STRUCTURED_OUTPUT_PROCESSOR_NAME,
                    tracingContext: options.tracingContext,
                    processorIndex,
                    createSpan: true
                  });
                  structuredOutputProcessorState.customState = { controller };
                  processorStates.set(STRUCTURED_OUTPUT_PROCESSOR_NAME, structuredOutputProcessorState);
                }
              } else {
                const structuredOutputProcessorState = processorStates.get(STRUCTURED_OUTPUT_PROCESSOR_NAME);
                if (structuredOutputProcessorState) {
                  structuredOutputProcessorState.customState.controller = controller;
                }
              }
              const streamWriter = {
                custom: async (data) => controller.enqueue(data)
              };
              const {
                part: processed,
                blocked,
                reason,
                tripwireOptions,
                processorId
              } = await processorRunner.processPart(
                chunk,
                processorStates,
                resolveObservabilityContext(options),
                options.requestContext,
                self.messageList,
                0,
                streamWriter
              );
              if (blocked) {
                controller.enqueue({
                  type: "tripwire",
                  payload: {
                    reason: reason || "Output processor blocked content",
                    retry: tripwireOptions?.retry,
                    metadata: tripwireOptions?.metadata,
                    processorId
                  }
                });
                return;
              }
              if (processed) {
                controller.enqueue(processed);
              }
            }
          }
        })
      );
    }
    if (self.#structuredOutputMode === "direct" && self.#options.isLLMExecutionStep) {
      processedStream = processedStream.pipeThrough(
        createObjectStreamTransformer({
          structuredOutput: self.#options.structuredOutput,
          logger: self.logger
        })
      );
    }
    this.#baseStream = processedStream.pipeThrough(
      new TransformStream({
        transform: async (chunk, controller) => {
          switch (chunk.type) {
            case "tool-call-suspended":
            case "tool-call-approval":
              self.#status = "suspended";
              self.#delayedPromises.suspendPayload.resolve(chunk.payload);
              self.#delayedPromises.resumeSchema.resolve(chunk.payload.resumeSchema);
              break;
            case "raw":
              if (!self.#options.includeRawChunks) {
                return;
              }
              break;
            case "object-result":
              self.#bufferedObject = chunk.object;
              if (self.#delayedPromises.object.status.type === "pending") {
                self.#delayedPromises.object.resolve(chunk.object);
              }
              break;
            case "source":
              self.#bufferedSources.push(chunk);
              self.#bufferedByStep.sources.push(chunk);
              break;
            case "text-delta":
              self.#bufferedText.push(chunk.payload.text);
              self.#bufferedByStep.text += chunk.payload.text;
              if (chunk.payload.id) {
                const ary = self.#bufferedTextChunks[chunk.payload.id] ?? [];
                ary.push(chunk.payload.text);
                self.#bufferedTextChunks[chunk.payload.id] = ary;
              }
              break;
            case "tool-call-input-streaming-start":
              self.#toolCallDeltaIdNameMap[chunk.payload.toolCallId] = chunk.payload.toolName;
              self.#toolCallStreamingMeta[chunk.payload.toolCallId] = {
                toolName: chunk.payload.toolName,
                providerExecuted: chunk.payload.providerExecuted,
                providerMetadata: chunk.payload.providerMetadata,
                dynamic: chunk.payload.dynamic
              };
              break;
            case "tool-call-input-streaming-end": {
              const toolCallId = chunk.payload.toolCallId;
              const meta = self.#toolCallStreamingMeta[toolCallId];
              const deltaParts = self.#toolCallArgsDeltas[toolCallId];
              let args = {};
              if (deltaParts?.length) {
                try {
                  const merged = deltaParts.join("");
                  args = typeof merged === "string" && merged.length > 0 ? JSON.parse(merged) : {};
                } catch {
                  args = {};
                }
              }
              delete self.#toolCallStreamingMeta[toolCallId];
              delete self.#toolCallArgsDeltas[toolCallId];
              delete self.#toolCallDeltaIdNameMap[toolCallId];
              if (meta) {
                const synthetic = {
                  type: "tool-call",
                  runId: chunk.runId,
                  from: chunk.from,
                  payload: {
                    toolCallId,
                    toolName: meta.toolName,
                    args,
                    providerExecuted: meta.providerExecuted,
                    providerMetadata: meta.providerMetadata,
                    dynamic: meta.dynamic
                  }
                };
                self.#toolCalls.push(synthetic);
                self.#bufferedByStep.toolCalls.push(synthetic);
                self.#emitChunk(chunk);
                controller.enqueue(chunk);
                self.#emitChunk(synthetic);
                controller.enqueue(synthetic);
                return;
              }
              break;
            }
            case "tool-call-delta":
              if (!self.#toolCallArgsDeltas[chunk.payload.toolCallId]) {
                self.#toolCallArgsDeltas[chunk.payload.toolCallId] = [];
              }
              self.#toolCallArgsDeltas?.[chunk.payload.toolCallId]?.push(chunk.payload.argsTextDelta);
              chunk.payload.toolName ||= self.#toolCallDeltaIdNameMap[chunk.payload.toolCallId];
              break;
            case "file":
              self.#bufferedFiles.push(chunk);
              self.#bufferedByStep.files.push(chunk);
              break;
            case "reasoning-start":
              self.#bufferedReasoningDetails[chunk.payload.id] = {
                type: "reasoning",
                runId: chunk.runId,
                from: chunk.from,
                payload: {
                  id: chunk.payload.id,
                  providerMetadata: chunk.payload.providerMetadata,
                  text: ""
                }
              };
              break;
            case "reasoning-delta": {
              self.#bufferedReasoning.push({
                type: "reasoning",
                runId: chunk.runId,
                from: chunk.from,
                payload: chunk.payload
              });
              self.#bufferedByStep.reasoning.push({
                type: "reasoning",
                runId: chunk.runId,
                from: chunk.from,
                payload: chunk.payload
              });
              const bufferedReasoning = self.#bufferedReasoningDetails[chunk.payload.id];
              if (bufferedReasoning) {
                bufferedReasoning.payload.text += chunk.payload.text;
                if (chunk.payload.providerMetadata) {
                  bufferedReasoning.payload.providerMetadata = chunk.payload.providerMetadata;
                }
              }
              break;
            }
            case "reasoning-end": {
              const bufferedReasoning = self.#bufferedReasoningDetails[chunk.payload.id];
              if (chunk.payload.providerMetadata && bufferedReasoning) {
                bufferedReasoning.payload.providerMetadata = chunk.payload.providerMetadata;
              }
              break;
            }
            case "tool-call": {
              const existingSynthetic = self.#toolCalls.find((tc) => tc.payload.toolCallId === chunk.payload.toolCallId);
              if (existingSynthetic) {
                if (chunk.payload.providerMetadata && !existingSynthetic.payload.providerMetadata) {
                  existingSynthetic.payload.providerMetadata = chunk.payload.providerMetadata;
                }
                if (chunk.payload.dynamic != null && existingSynthetic.payload.dynamic == null) {
                  existingSynthetic.payload.dynamic = chunk.payload.dynamic;
                }
                return;
              }
              self.#toolCalls.push(chunk);
              self.#bufferedByStep.toolCalls.push(chunk);
              const toolCallPayload = chunk.payload;
              if (toolCallPayload?.output?.from === "AGENT" && toolCallPayload?.output?.type === "finish") {
                const finishPayload = toolCallPayload.output.payload;
                if (finishPayload?.usage) {
                  self.updateUsageCount(finishPayload.usage);
                }
              }
              break;
            }
            case "tool-result":
              self.#toolResults.push(chunk);
              self.#bufferedByStep.toolResults.push(chunk);
              break;
            case "step-finish": {
              self.updateUsageCount(chunk.payload.output.usage);
              self.#warnings = chunk.payload.stepResult.warnings || [];
              if (chunk.payload.metadata.request) {
                self.#request = chunk.payload.metadata.request;
              }
              const { providerMetadata, request, ...otherMetadata } = chunk.payload.metadata;
              const payloadSteps = chunk.payload.output?.steps || [];
              const currentPayloadStep = payloadSteps[payloadSteps.length - 1];
              const stepTripwire = currentPayloadStep?.tripwire;
              const stepText = stepTripwire ? "" : self.#bufferedByStep.text;
              const stepResult = {
                stepType: self.#bufferedSteps.length === 0 ? "initial" : "tool-result",
                sources: self.#bufferedByStep.sources,
                files: self.#bufferedByStep.files,
                toolCalls: self.#bufferedByStep.toolCalls,
                toolResults: self.#bufferedByStep.toolResults,
                content: messageList.get.response.aiV5.modelContent(-1),
                text: stepText,
                // Include tripwire data if present
                tripwire: stepTripwire,
                reasoningText: self.#bufferedReasoning.map((reasoningPart) => reasoningPart.payload.text).join(""),
                reasoning: Object.values(self.#bufferedReasoningDetails),
                get staticToolCalls() {
                  return self.#bufferedByStep.toolCalls.filter(
                    (part) => part.type === "tool-call" && part.payload?.dynamic === false
                  );
                },
                get dynamicToolCalls() {
                  return self.#bufferedByStep.toolCalls.filter(
                    (part) => part.type === "tool-call" && part.payload?.dynamic === true
                  );
                },
                get staticToolResults() {
                  return self.#bufferedByStep.toolResults.filter(
                    (part) => part.type === "tool-result" && part.payload?.dynamic === false
                  );
                },
                get dynamicToolResults() {
                  return self.#bufferedByStep.toolResults.filter(
                    (part) => part.type === "tool-result" && part.payload?.dynamic === true
                  );
                },
                finishReason: chunk.payload.stepResult.reason,
                usage: chunk.payload.output.usage,
                warnings: self.#warnings,
                request: request || {},
                response: {
                  id: chunk.payload.id || "",
                  timestamp: chunk.payload.metadata?.timestamp || /* @__PURE__ */ new Date(),
                  modelId: chunk.payload.metadata?.modelId || chunk.payload.metadata?.model || "",
                  ...otherMetadata,
                  messages: chunk.payload.messages?.nonUser || [],
                  dbMessages: self.messageList.get.response.db(),
                  // We have to cast this until messageList can take generics also and type metadata, it was too
                  // complicated to do this in this PR, it will require a much bigger change.
                  uiMessages: messageList.get.response.aiV5.ui()
                },
                providerMetadata: providerMetadata ?? chunk.payload.providerMetadata
              };
              await options?.onStepFinish?.({
                ...self.#model.modelId && self.#model.provider && self.#model.version ? { model: self.#model } : {},
                ...stepResult
              });
              self.#bufferedSteps.push(stepResult);
              self.#bufferedByStep = {
                text: "",
                reasoning: [],
                sources: [],
                files: [],
                toolCalls: [],
                toolResults: [],
                dynamicToolCalls: [],
                dynamicToolResults: [],
                staticToolCalls: [],
                staticToolResults: [],
                content: [],
                usage: { inputTokens: void 0, outputTokens: void 0, totalTokens: void 0 },
                warnings: [],
                request: {},
                response: {
                  id: "",
                  timestamp: /* @__PURE__ */ new Date(),
                  modelId: "",
                  messages: [],
                  uiMessages: []
                },
                reasoningText: "",
                providerMetadata: void 0,
                finishReason: void 0
              };
              break;
            }
            case "tripwire":
              self.#tripwire = {
                reason: chunk.payload?.reason || "Content blocked",
                retry: chunk.payload?.retry,
                metadata: chunk.payload?.metadata,
                processorId: chunk.payload?.processorId
              };
              self.#finishReason = "other";
              self.#streamFinished = true;
              self.resolvePromises({
                text: self.#bufferedText.join(""),
                finishReason: "other",
                object: void 0,
                usage: self.#usageCount,
                warnings: self.#warnings,
                providerMetadata: void 0,
                response: {
                  dbMessages: self.messageList.get.response.db()
                },
                request: {},
                reasoning: [],
                reasoningText: void 0,
                sources: [],
                files: [],
                toolCalls: [],
                toolResults: [],
                steps: self.#bufferedSteps,
                totalUsage: self.#usageCount,
                content: [],
                suspendPayload: void 0,
                // Tripwire doesn't suspend, so resolve to undefined
                resumeSchema: void 0
              });
              self.#closeTransportIfNeeded();
              self.#emitChunk(chunk);
              controller.enqueue(chunk);
              self.#emitter.emit("finish");
              controller.terminate();
              return;
            case "finish":
              self.#status = "success";
              if (chunk.payload.stepResult.reason) {
                self.#finishReason = chunk.payload.stepResult.reason;
              }
              const finalProviderMetadata = chunk.payload.metadata?.providerMetadata ?? chunk.payload.providerMetadata;
              if (chunk.payload.stepResult.reason === "tripwire") {
                const outputSteps = chunk.payload.output?.steps;
                const lastStep = outputSteps?.[outputSteps?.length - 1];
                const stepTripwire = lastStep?.tripwire;
                self.#tripwire = {
                  reason: stepTripwire?.reason || "Processor tripwire triggered",
                  retry: stepTripwire?.retry,
                  metadata: stepTripwire?.metadata,
                  processorId: stepTripwire?.processorId
                };
              }
              if (self.#bufferedObject !== void 0) {
                const responseMessages = messageList.get.response.db();
                const lastAssistantMessage = [...responseMessages].reverse().find((m) => m.role === "assistant");
                if (lastAssistantMessage) {
                  if (!lastAssistantMessage.content.metadata) {
                    lastAssistantMessage.content.metadata = {};
                  }
                  lastAssistantMessage.content.metadata.structuredOutput = self.#bufferedObject;
                }
              }
              let response = {};
              if (chunk.payload.metadata) {
                const { providerMetadata, request, ...otherMetadata } = chunk.payload.metadata;
                response = {
                  ...otherMetadata,
                  messages: messageList.get.response.aiV5.model(),
                  uiMessages: messageList.get.response.aiV5.ui()
                };
              }
              this.populateUsageCount(chunk.payload.output.usage);
              chunk.payload.output.usage = {
                inputTokens: self.#usageCount.inputTokens ?? 0,
                outputTokens: self.#usageCount.outputTokens ?? 0,
                totalTokens: self.#usageCount.totalTokens ?? 0,
                ...self.#usageCount.reasoningTokens !== void 0 && {
                  reasoningTokens: self.#usageCount.reasoningTokens
                },
                ...self.#usageCount.cachedInputTokens !== void 0 && {
                  cachedInputTokens: self.#usageCount.cachedInputTokens
                }
              };
              try {
                if (self.processorRunner && !self.#options.isLLMExecutionStep) {
                  const lastStep = self.#bufferedSteps[self.#bufferedSteps.length - 1];
                  const originalText = lastStep?.text || "";
                  const outputResultWriter = {
                    custom: async (data) => {
                      self.#emitChunk(data);
                      controller.enqueue(data);
                    }
                  };
                  const outputResult = {
                    text: self.#bufferedText.join(""),
                    usage: chunk.payload.output.usage,
                    finishReason: self.#finishReason || "unknown",
                    steps: [...self.#bufferedSteps]
                  };
                  self.messageList = await self.processorRunner.runOutputProcessors(
                    self.messageList,
                    resolveObservabilityContext(options),
                    self.#options.requestContext,
                    0,
                    outputResultWriter,
                    outputResult
                  );
                  const responseMessages = self.messageList.get.response.aiV4.core();
                  const lastResponseMessage = responseMessages[responseMessages.length - 1];
                  const outputText = lastResponseMessage ? coreContentToString(lastResponseMessage.content) : "";
                  if (lastStep && outputText && outputText !== originalText) {
                    lastStep.text = outputText;
                  }
                  this.resolvePromises({
                    text: outputText || originalText,
                    finishReason: self.#finishReason
                  });
                  if (chunk.payload.metadata) {
                    const { providerMetadata, request, ...otherMetadata } = chunk.payload.metadata;
                    response = {
                      ...otherMetadata,
                      messages: messageList.get.response.aiV5.model(),
                      uiMessages: messageList.get.response.aiV5.ui()
                    };
                  }
                  chunk.payload.response = response;
                } else if (!self.#options.isLLMExecutionStep) {
                  this.resolvePromises({
                    text: self.#bufferedText.join(""),
                    finishReason: self.#finishReason
                  });
                }
              } catch (error2) {
                if (error2 instanceof TripWire) {
                  self.#tripwire = {
                    reason: error2.message,
                    retry: error2.options?.retry,
                    metadata: error2.options?.metadata,
                    processorId: error2.processorId
                  };
                  self.resolvePromises({
                    finishReason: "other",
                    text: ""
                  });
                } else {
                  self.#error = getErrorFromUnknown(error2, {
                    fallbackMessage: "Unknown error in stream"
                  });
                  self.resolvePromises({
                    finishReason: "error",
                    text: ""
                  });
                }
                if (self.#delayedPromises.object.status.type !== "resolved") {
                  self.#delayedPromises.object.resolve(void 0);
                }
              }
              const reasoningText = self.#bufferedReasoning.length > 0 ? self.#bufferedReasoning.map((reasoningPart) => reasoningPart.payload.text).join("") : void 0;
              const baseFinishStep = self.#bufferedSteps[self.#bufferedSteps.length - 1];
              if (baseFinishStep && baseFinishStep.providerMetadata === void 0 && finalProviderMetadata !== void 0) {
                baseFinishStep.providerMetadata = finalProviderMetadata;
              }
              this.resolvePromises({
                usage: self.#usageCount,
                warnings: self.#warnings,
                providerMetadata: finalProviderMetadata,
                response: { ...response, dbMessages: self.messageList.get.response.db() },
                request: self.#request || {},
                reasoningText,
                reasoning: Object.values(self.#bufferedReasoningDetails || {}),
                sources: self.#bufferedSources,
                files: self.#bufferedFiles,
                toolCalls: self.#toolCalls,
                toolResults: self.#toolResults,
                steps: self.#bufferedSteps,
                totalUsage: self.#getTotalUsage(),
                content: messageList.get.response.aiV5.stepContent(),
                suspendPayload: void 0,
                resumeSchema: void 0
              });
              if (baseFinishStep) {
                const onFinishPayload = {
                  // StepResult properties from baseFinishStep
                  providerMetadata: baseFinishStep.providerMetadata ?? finalProviderMetadata,
                  text: self.#bufferedText.join(""),
                  warnings: baseFinishStep.warnings ?? [],
                  finishReason: chunk.payload.stepResult.reason,
                  content: messageList.get.response.aiV5.stepContent(),
                  request: await self.request,
                  error: self.error,
                  reasoning: await self.reasoning,
                  reasoningText: await self.reasoningText,
                  sources: await self.sources,
                  files: await self.files,
                  steps: self.#bufferedSteps,
                  response: {
                    ...await self.response,
                    ...baseFinishStep.response,
                    messages: messageList.get.response.aiV5.model(),
                    dbMessages: self.messageList.get.response.db()
                  },
                  usage: chunk.payload.output.usage,
                  totalUsage: self.#getTotalUsage(),
                  toolCalls: await self.toolCalls,
                  toolResults: await self.toolResults,
                  staticToolCalls: (await self.toolCalls).filter((toolCall) => toolCall?.payload?.dynamic === false),
                  staticToolResults: (await self.toolResults).filter(
                    (toolResult) => toolResult?.payload?.dynamic === false
                  ),
                  dynamicToolCalls: (await self.toolCalls).filter((toolCall) => toolCall?.payload?.dynamic === true),
                  dynamicToolResults: (await self.toolResults).filter(
                    (toolResult) => toolResult?.payload?.dynamic === true
                  ),
                  // Custom properties (not part of standard callback)
                  ...self.#model.modelId && self.#model.provider && self.#model.version ? { model: self.#model } : {},
                  object: self.#delayedPromises.object.status.type === "rejected" ? void 0 : self.#delayedPromises.object.status.type === "resolved" ? self.#delayedPromises.object.status.value : self.#structuredOutputMode === "direct" && baseFinishStep.text ? (() => {
                    try {
                      return JSON.parse(baseFinishStep.text);
                    } catch {
                      return void 0;
                    }
                  })() : void 0
                };
                await options?.onFinish?.(onFinishPayload);
              }
              self.#closeTransportIfNeeded();
              break;
            case "error":
              const error = getErrorFromUnknown(chunk.payload.error, {
                fallbackMessage: "Unknown error chunk in stream"
              });
              self.#error = error;
              self.#status = "failed";
              self.#streamFinished = true;
              Object.values(self.#delayedPromises).forEach((promise) => {
                if (promise.status.type === "pending") {
                  promise.reject(self.#error);
                }
              });
              self.#closeTransportIfNeeded();
              break;
          }
          self.#emitChunk(chunk);
          controller.enqueue(chunk);
        },
        flush: () => {
          if (self.#delayedPromises.object.status.type === "pending") {
            self.#delayedPromises.object.resolve(void 0);
          }
          if (self.#status === "suspended") {
            const reasoningText = self.#bufferedReasoning.length > 0 ? self.#bufferedReasoning.map((reasoningPart) => reasoningPart.payload.text).join("") : void 0;
            self.resolvePromises({
              toolResults: self.#toolResults,
              toolCalls: self.#toolCalls,
              text: self.#bufferedText.join(""),
              reasoning: Object.values(self.#bufferedReasoningDetails || {}),
              reasoningText,
              sources: self.#bufferedSources,
              files: self.#bufferedFiles,
              steps: self.#bufferedSteps,
              usage: self.#usageCount,
              totalUsage: self.#getTotalUsage(),
              warnings: self.#warnings,
              finishReason: "suspended",
              content: self.messageList.get.response.aiV5.stepContent(),
              object: void 0,
              request: self.#request,
              response: {
                dbMessages: self.messageList.get.response.db()
              },
              providerMetadata: void 0
            });
          }
          Object.entries(self.#delayedPromises).forEach(([key, promise]) => {
            if (promise.status.type === "pending") {
              promise.reject(new Error(`promise '${key}' was not resolved or rejected when stream finished`));
            }
          });
          self.#closeTransportIfNeeded();
          self.#streamFinished = true;
          self.#emitter.emit("finish");
        }
      })
    );
    if (initialState) {
      this.deserializeState(initialState);
    }
  }
  resolvePromise(key, value) {
    if (!(key in this.#delayedPromises)) {
      throw new MastraError({
        id: "MASTRA_MODEL_OUTPUT_INVALID_PROMISE_KEY",
        domain: "LLM" /* LLM */,
        category: "SYSTEM" /* SYSTEM */,
        text: `Attempted to resolve invalid promise key '${key}' with value '${typeof value === "object" ? JSON.stringify(value, null, 2) : value}'`
      });
    }
    this.#delayedPromises[key].resolve(value);
  }
  resolvePromises(data) {
    for (const keyString in data) {
      const key = keyString;
      this.resolvePromise(key, data[key]);
    }
  }
  #closeTransportIfNeeded() {
    const transport = this.#transportRef?.current;
    if (!transport || !transport.closeOnFinish || this.#transportClosed) {
      return;
    }
    this.#transportClosed = true;
    try {
      transport.close();
    } catch {
    }
  }
  #getDelayedPromise(promise) {
    if (!this.#consumptionStarted) {
      void this.consumeStream();
    }
    return promise.promise;
  }
  /**
   * Resolves to the complete text response after streaming completes.
   */
  get text() {
    return this.#getDelayedPromise(this.#delayedPromises.text);
  }
  /**
   * Resolves to reasoning parts array for models that support reasoning.
   */
  get reasoning() {
    return this.#getDelayedPromise(this.#delayedPromises.reasoning);
  }
  /**
   * Resolves to complete reasoning text for models that support reasoning.
   */
  get reasoningText() {
    return this.#getDelayedPromise(this.#delayedPromises.reasoningText);
  }
  get sources() {
    return this.#getDelayedPromise(this.#delayedPromises.sources);
  }
  get files() {
    return this.#getDelayedPromise(this.#delayedPromises.files);
  }
  get steps() {
    return this.#getDelayedPromise(this.#delayedPromises.steps);
  }
  get suspendPayload() {
    return this.#getDelayedPromise(this.#delayedPromises.suspendPayload);
  }
  get resumeSchema() {
    return this.#getDelayedPromise(this.#delayedPromises.resumeSchema);
  }
  /**
   * Stream of all chunks. Provides complete control over stream processing.
   */
  get fullStream() {
    return this.#createEventedStream();
  }
  /**
   * Resolves to the reason generation finished.
   */
  get finishReason() {
    return this.#getDelayedPromise(this.#delayedPromises.finishReason);
  }
  /**
   * Resolves to array of all tool calls made during execution.
   */
  get toolCalls() {
    return this.#getDelayedPromise(this.#delayedPromises.toolCalls);
  }
  /**
   * Resolves to array of all tool execution results.
   */
  get toolResults() {
    return this.#getDelayedPromise(this.#delayedPromises.toolResults);
  }
  /**
   * Resolves to token usage statistics including inputTokens, outputTokens, and totalTokens.
   */
  get usage() {
    return this.#getDelayedPromise(this.#delayedPromises.usage);
  }
  /**
   * Resolves to array of all warnings generated during execution.
   */
  get warnings() {
    return this.#getDelayedPromise(this.#delayedPromises.warnings);
  }
  /**
   * Resolves to provider metadata generated during execution.
   */
  get providerMetadata() {
    return this.#getDelayedPromise(this.#delayedPromises.providerMetadata);
  }
  /**
   * Resolves to the complete response from the model.
   */
  get response() {
    return this.#getDelayedPromise(this.#delayedPromises.response);
  }
  /**
   * Resolves to the complete request sent to the model.
   */
  get request() {
    return this.#getDelayedPromise(this.#delayedPromises.request);
  }
  /**
   * Transport handle for the current stream (when available).
   */
  get transport() {
    return this.#transportRef?.current;
  }
  /**
   * Resolves to an error if an error occurred during streaming.
   */
  get error() {
    return this.#error;
  }
  updateUsageCount(usage) {
    if (!usage) {
      return;
    }
    if (usage.inputTokens !== void 0) {
      this.#usageCount.inputTokens = (this.#usageCount.inputTokens ?? 0) + usage.inputTokens;
    }
    if (usage.outputTokens !== void 0) {
      this.#usageCount.outputTokens = (this.#usageCount.outputTokens ?? 0) + usage.outputTokens;
    }
    if (usage.totalTokens !== void 0) {
      this.#usageCount.totalTokens = (this.#usageCount.totalTokens ?? 0) + usage.totalTokens;
    }
    if (usage.reasoningTokens !== void 0) {
      this.#usageCount.reasoningTokens = (this.#usageCount.reasoningTokens ?? 0) + usage.reasoningTokens;
    }
    if (usage.cachedInputTokens !== void 0) {
      this.#usageCount.cachedInputTokens = (this.#usageCount.cachedInputTokens ?? 0) + usage.cachedInputTokens;
    }
  }
  populateUsageCount(usage) {
    if (!usage) {
      return;
    }
    if (usage.inputTokens !== void 0 && this.#usageCount.inputTokens === void 0) {
      this.#usageCount.inputTokens = usage.inputTokens;
    }
    if (usage.outputTokens !== void 0 && this.#usageCount.outputTokens === void 0) {
      this.#usageCount.outputTokens = usage.outputTokens;
    }
    if (usage.totalTokens !== void 0 && this.#usageCount.totalTokens === void 0) {
      this.#usageCount.totalTokens = usage.totalTokens;
    }
    if (usage.reasoningTokens !== void 0 && this.#usageCount.reasoningTokens === void 0) {
      this.#usageCount.reasoningTokens = usage.reasoningTokens;
    }
    if (usage.cachedInputTokens !== void 0 && this.#usageCount.cachedInputTokens === void 0) {
      this.#usageCount.cachedInputTokens = usage.cachedInputTokens;
    }
  }
  async consumeStream(options) {
    if (this.#consumptionStarted) {
      return;
    }
    this.#consumptionStarted = true;
    try {
      await consumeStream({
        stream: this.#baseStream,
        onError: options?.onError,
        logger: this.logger
      });
    } catch (error) {
      options?.onError?.(error);
    }
  }
  /**
   * Returns complete output including text, usage, tool calls, and all metadata.
   */
  async getFullOutput() {
    await this.consumeStream({
      onError: (error) => {
        this.logger.error("Error consuming stream", error);
        throw error;
      }
    });
    let scoringData;
    if (this.#returnScorerData) {
      scoringData = {
        input: {
          inputMessages: this.messageList.getPersisted.input.db(),
          rememberedMessages: this.messageList.getPersisted.remembered.db(),
          systemMessages: this.messageList.getSystemMessages(),
          taggedSystemMessages: this.messageList.getPersisted.taggedSystemMessages
        },
        output: this.messageList.getPersisted.response.db()
      };
    }
    const steps = await this.steps;
    const textFromSteps = steps.map((step) => step.text || "").join("");
    const fullOutput = {
      text: textFromSteps,
      usage: await this.usage,
      steps,
      finishReason: await this.finishReason,
      warnings: await this.warnings,
      providerMetadata: await this.providerMetadata,
      request: await this.request,
      reasoning: await this.reasoning,
      reasoningText: await this.reasoningText,
      toolCalls: await this.toolCalls,
      toolResults: await this.toolResults,
      sources: await this.sources,
      files: await this.files,
      response: await this.response,
      totalUsage: await this.totalUsage,
      object: await this.object,
      error: this.error,
      tripwire: this.#tripwire,
      ...scoringData ? { scoringData } : {},
      traceId: this.traceId,
      spanId: this.spanId,
      runId: this.runId,
      suspendPayload: await this.suspendPayload,
      resumeSchema: await this.resumeSchema,
      // All messages from this execution (input + memory history + response)
      messages: this.messageList.get.all.db(),
      // Only messages loaded from memory (conversation history)
      rememberedMessages: this.messageList.get.remembered.db()
    };
    return fullOutput;
  }
  /**
   * Tripwire data if the stream was aborted due to an output processor blocking the content.
   * Returns undefined if no tripwire was triggered.
   */
  get tripwire() {
    return this.#tripwire;
  }
  /**
   * The total usage of the stream.
   */
  get totalUsage() {
    return this.#getDelayedPromise(this.#delayedPromises.totalUsage);
  }
  get content() {
    return this.#getDelayedPromise(this.#delayedPromises.content);
  }
  /**
   * Stream of valid JSON chunks. The final JSON result is validated against the output schema when the stream ends.
   *
   * @example
   * ```typescript
   * const stream = await agent.stream("Extract data", {
   *   structuredOutput: {
   *     schema: z.object({ name: z.string(), age: z.number() }),
   *     model: 'gpt-4o-mini' // optional to use a model for structuring json output
   *   }
   * });
   * // partial json chunks
   * for await (const data of stream.objectStream) {
   *   console.log(data); // { name: 'John' }, { name: 'John', age: 30 }
   * }
   * ```
   */
  get objectStream() {
    return this.#createEventedStream().pipeThrough(
      new TransformStream({
        transform(chunk, controller) {
          if (chunk.type === "object") {
            controller.enqueue(chunk.object);
          }
        }
      })
    );
  }
  /**
   * Stream of individual array elements when output schema is an array type.
   */
  get elementStream() {
    let publishedElements = 0;
    return this.#createEventedStream().pipeThrough(
      new TransformStream({
        transform(chunk, controller) {
          if (chunk.type === "object") {
            if (Array.isArray(chunk.object)) {
              for (; publishedElements < chunk.object.length; publishedElements++) {
                controller.enqueue(chunk.object[publishedElements]);
              }
            }
          }
        }
      })
    );
  }
  /**
   * Stream of only text content, filtering out metadata and other chunk types.
   */
  get textStream() {
    if (this.#structuredOutputMode === "direct") {
      const outputSchema = getTransformedSchema(this.#options.structuredOutput?.schema);
      if (outputSchema?.outputFormat === "array") {
        return this.#createEventedStream().pipeThrough(
          createJsonTextStreamTransformer(this.#options.structuredOutput?.schema)
        );
      }
    }
    return this.#createEventedStream().pipeThrough(
      new TransformStream({
        transform(chunk, controller) {
          if (chunk.type === "text-delta") {
            controller.enqueue(chunk.payload.text);
          }
        }
      })
    );
  }
  /**
   * Resolves to the complete object response from the model. Validated against the 'output' schema when the stream ends.
   *
   * @example
   * ```typescript
   * const stream = await agent.stream("Extract data", {
   *   structuredOutput: {
   *     schema: z.object({ name: z.string(), age: z.number() }),
   *     model: 'gpt-4o-mini' // optionally use a model for structuring json output
   *   }
   * });
   * // final validated json
   * const data = await stream.object // { name: 'John', age: 30 }
   * ```
   */
  get object() {
    if (!this.processorRunner && !this.#options.structuredOutput?.schema && this.#delayedPromises.object.status.type === "pending") {
      this.#delayedPromises.object.resolve(void 0);
    }
    return this.#getDelayedPromise(this.#delayedPromises.object);
  }
  // Internal methods for immediate values - used internally by Mastra (llm-execution.ts bailing on errors/abort signals with current state)
  // These are not part of the public API
  /** @internal */
  _getImmediateToolCalls() {
    return this.#toolCalls;
  }
  /** @internal */
  _getImmediateToolResults() {
    return this.#toolResults;
  }
  /** @internal */
  _getImmediateText() {
    return this.#bufferedText.join("");
  }
  /** @internal */
  _getImmediateObject() {
    return this.#bufferedObject;
  }
  /** @internal */
  _getImmediateUsage() {
    return this.#usageCount;
  }
  /** @internal */
  _getImmediateWarnings() {
    return this.#warnings;
  }
  /** @internal */
  _getImmediateFinishReason() {
    return this.#finishReason;
  }
  /** @internal  */
  _getBaseStream() {
    return this.#baseStream;
  }
  #getTotalUsage() {
    let total = this.#usageCount.totalTokens;
    if (total === void 0) {
      const input = this.#usageCount.inputTokens ?? 0;
      const output = this.#usageCount.outputTokens ?? 0;
      const reasoning = this.#usageCount.reasoningTokens ?? 0;
      total = input + output + reasoning;
    }
    return {
      inputTokens: this.#usageCount.inputTokens,
      outputTokens: this.#usageCount.outputTokens,
      totalTokens: total,
      reasoningTokens: this.#usageCount.reasoningTokens,
      cachedInputTokens: this.#usageCount.cachedInputTokens
    };
  }
  #emitChunk(chunk) {
    this.#bufferedChunks.push(chunk);
    this.#emitter.emit("chunk", chunk);
  }
  #createEventedStream() {
    const self = this;
    return new ReadableStream$1({
      start(controller) {
        self.#bufferedChunks.forEach((chunk) => {
          controller.enqueue(chunk);
        });
        if (self.#streamFinished) {
          controller.close();
          return;
        }
        const chunkHandler = (chunk) => {
          safeEnqueue(controller, chunk);
        };
        const finishHandler = () => {
          self.#emitter.off("chunk", chunkHandler);
          self.#emitter.off("finish", finishHandler);
          safeClose(controller);
        };
        self.#emitter.on("chunk", chunkHandler);
        self.#emitter.on("finish", finishHandler);
      },
      pull(_controller) {
        if (!self.#consumptionStarted) {
          void self.consumeStream();
        }
      },
      cancel() {
        self.#emitter.removeAllListeners();
      }
    });
  }
  get status() {
    return this.#status;
  }
  serializeState() {
    return {
      status: this.#status,
      bufferedSteps: this.#bufferedSteps,
      bufferedReasoningDetails: this.#bufferedReasoningDetails,
      bufferedByStep: this.#bufferedByStep,
      bufferedText: this.#bufferedText,
      bufferedTextChunks: this.#bufferedTextChunks,
      bufferedSources: this.#bufferedSources,
      bufferedReasoning: this.#bufferedReasoning,
      bufferedFiles: this.#bufferedFiles,
      toolCallArgsDeltas: this.#toolCallArgsDeltas,
      toolCallDeltaIdNameMap: this.#toolCallDeltaIdNameMap,
      toolCallStreamingMeta: this.#toolCallStreamingMeta,
      toolCalls: this.#toolCalls,
      toolResults: this.#toolResults,
      warnings: this.#warnings,
      finishReason: this.#finishReason,
      request: this.#request,
      usageCount: this.#usageCount,
      tripwire: this.#tripwire,
      messageList: this.messageList.serialize()
    };
  }
  deserializeState(state) {
    this.#status = state.status;
    this.#bufferedSteps = state.bufferedSteps;
    this.#bufferedReasoningDetails = state.bufferedReasoningDetails;
    this.#bufferedByStep = state.bufferedByStep;
    this.#bufferedText = state.bufferedText;
    this.#bufferedTextChunks = state.bufferedTextChunks;
    this.#bufferedSources = state.bufferedSources;
    this.#bufferedReasoning = state.bufferedReasoning;
    this.#bufferedFiles = state.bufferedFiles;
    this.#toolCallArgsDeltas = state.toolCallArgsDeltas;
    this.#toolCallDeltaIdNameMap = state.toolCallDeltaIdNameMap;
    this.#toolCallStreamingMeta = state.toolCallStreamingMeta ?? {};
    this.#toolCalls = state.toolCalls;
    this.#toolResults = state.toolResults;
    this.#warnings = state.warnings;
    this.#finishReason = state.finishReason;
    this.#request = state.request;
    this.#usageCount = state.usageCount;
    this.#tripwire = state.tripwire;
    this.messageList = this.messageList.deserialize(state.messageList);
  }
};

// src/stream/base/consume-stream.ts
async function consumeStream2({
  stream,
  onError
}) {
  const reader = stream.getReader();
  try {
    while (true) {
      const { done } = await reader.read();
      if (done) break;
    }
  } catch (error) {
    onError == null ? void 0 : onError(error);
  } finally {
    reader.releaseLock();
  }
}

// src/stream/RunOutput.ts
var WorkflowRunOutput = class {
  #status = "running";
  #tripwireData;
  #usageCount = {
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    cachedInputTokens: 0,
    reasoningTokens: 0
  };
  #consumptionStarted = false;
  #baseStream;
  #emitter = new EventEmitter$1();
  #bufferedChunks = [];
  #streamFinished = false;
  #streamError;
  #delayedPromises = {
    usage: new DelayedPromise(),
    result: new DelayedPromise()
  };
  /**
   * Unique identifier for this workflow run
   */
  runId;
  /**
   * Unique identifier for this workflow
   */
  workflowId;
  constructor({
    runId,
    workflowId,
    stream
  }) {
    const self = this;
    this.runId = runId;
    this.workflowId = workflowId;
    this.#baseStream = stream;
    stream.pipeTo(
      new WritableStream$1({
        start() {
          const chunk = {
            type: "workflow-start",
            runId: self.runId,
            from: "WORKFLOW" /* WORKFLOW */,
            payload: {
              workflowId: self.workflowId
            }
          };
          self.#bufferedChunks.push(chunk);
          self.#emitter.emit("chunk", chunk);
        },
        write(chunk) {
          if (chunk.type !== "workflow-step-finish") {
            self.#bufferedChunks.push(chunk);
            self.#emitter.emit("chunk", chunk);
          }
          if (chunk.type === "workflow-step-output") {
            if ("output" in chunk.payload && chunk.payload.output) {
              const output = chunk.payload.output;
              if (output.type === "finish") {
                if (output.payload && "usage" in output.payload && output.payload.usage) {
                  self.#updateUsageCount(output.payload.usage);
                } else if (output.payload && "output" in output.payload && output.payload.output) {
                  const outputPayload = output.payload.output;
                  if ("usage" in outputPayload && outputPayload.usage) {
                    self.#updateUsageCount(outputPayload.usage);
                  }
                }
              }
            }
          } else if (chunk.type === "workflow-canceled") {
            self.#status = "canceled";
          } else if (chunk.type === "workflow-step-suspended") {
            self.#status = "suspended";
          } else if (chunk.type === "workflow-step-result" && chunk.payload.status === "failed") {
            if (chunk.payload.tripwire) {
              self.#status = "tripwire";
              self.#tripwireData = chunk.payload.tripwire;
            } else {
              self.#status = "failed";
            }
          } else if (chunk.type === "workflow-paused") {
            self.#status = "paused";
          }
        },
        close() {
          if (self.#status === "running") {
            self.#status = "success";
          }
          self.#emitter.emit("chunk", {
            type: "workflow-finish",
            runId: self.runId,
            from: "WORKFLOW" /* WORKFLOW */,
            payload: {
              workflowStatus: self.#status,
              metadata: self.#streamError ? {
                error: self.#streamError,
                errorMessage: self.#streamError?.message
              } : {},
              output: {
                usage: self.#usageCount
              },
              // Include tripwire data when status is 'tripwire'
              ...self.#status === "tripwire" && self.#tripwireData ? { tripwire: self.#tripwireData } : {}
            }
          });
          self.#delayedPromises.usage.resolve(self.#usageCount);
          Object.entries(self.#delayedPromises).forEach(([key, promise]) => {
            if (promise.status.type === "pending") {
              promise.reject(new Error(`promise '${key}' was not resolved or rejected when stream finished`));
            }
          });
          self.#streamFinished = true;
          self.#emitter.emit("finish");
        }
      })
    ).catch((reason) => {
      console.log(" something went wrong", reason);
    });
  }
  #getDelayedPromise(promise) {
    if (!this.#consumptionStarted) {
      void this.consumeStream();
    }
    return promise.promise;
  }
  #updateUsageCount(usage) {
    let totalUsage = {
      inputTokens: this.#usageCount.inputTokens ?? 0,
      outputTokens: this.#usageCount.outputTokens ?? 0,
      totalTokens: this.#usageCount.totalTokens ?? 0,
      reasoningTokens: this.#usageCount.reasoningTokens ?? 0,
      cachedInputTokens: this.#usageCount.cachedInputTokens ?? 0
    };
    if ("inputTokens" in usage) {
      totalUsage.inputTokens += parseInt(usage?.inputTokens?.toString() ?? "0", 10);
      totalUsage.outputTokens += parseInt(usage?.outputTokens?.toString() ?? "0", 10);
    } else if ("promptTokens" in usage) {
      totalUsage.inputTokens += parseInt(usage?.promptTokens?.toString() ?? "0", 10);
      totalUsage.outputTokens += parseInt(usage?.completionTokens?.toString() ?? "0", 10);
    }
    totalUsage.totalTokens += parseInt(usage?.totalTokens?.toString() ?? "0", 10);
    totalUsage.reasoningTokens += parseInt(usage?.reasoningTokens?.toString() ?? "0", 10);
    totalUsage.cachedInputTokens += parseInt(usage?.cachedInputTokens?.toString() ?? "0", 10);
    this.#usageCount = totalUsage;
  }
  /**
   * @internal
   */
  updateResults(results) {
    this.#delayedPromises.result.resolve(results);
  }
  /**
   * @internal
   */
  rejectResults(error) {
    this.#delayedPromises.result.reject(error);
    this.#status = "failed";
    this.#streamError = error;
  }
  /**
   * @internal
   */
  resume(stream) {
    this.#baseStream = stream;
    this.#streamFinished = false;
    this.#consumptionStarted = false;
    this.#status = "running";
    this.#delayedPromises = {
      usage: new DelayedPromise(),
      result: new DelayedPromise()
    };
    const self = this;
    stream.pipeTo(
      new WritableStream$1({
        start() {
          const chunk = {
            type: "workflow-start",
            runId: self.runId,
            from: "WORKFLOW" /* WORKFLOW */,
            payload: {
              workflowId: self.workflowId
            }
          };
          self.#bufferedChunks.push(chunk);
          self.#emitter.emit("chunk", chunk);
        },
        write(chunk) {
          if (chunk.type !== "workflow-step-finish") {
            self.#bufferedChunks.push(chunk);
            self.#emitter.emit("chunk", chunk);
          }
          if (chunk.type === "workflow-step-output") {
            if ("output" in chunk.payload && chunk.payload.output) {
              const output = chunk.payload.output;
              if (output.type === "finish") {
                if (output.payload && "usage" in output.payload && output.payload.usage) {
                  self.#updateUsageCount(output.payload.usage);
                } else if (output.payload && "output" in output.payload && output.payload.output) {
                  const outputPayload = output.payload.output;
                  if ("usage" in outputPayload && outputPayload.usage) {
                    self.#updateUsageCount(outputPayload.usage);
                  }
                }
              }
            }
          } else if (chunk.type === "workflow-canceled") {
            self.#status = "canceled";
          } else if (chunk.type === "workflow-step-suspended") {
            self.#status = "suspended";
          } else if (chunk.type === "workflow-step-result" && chunk.payload.status === "failed") {
            if (chunk.payload.tripwire) {
              self.#status = "tripwire";
              self.#tripwireData = chunk.payload.tripwire;
            } else {
              self.#status = "failed";
            }
          } else if (chunk.type === "workflow-paused") {
            self.#status = "paused";
          }
        },
        close() {
          if (self.#status === "running") {
            self.#status = "success";
          }
          self.#emitter.emit("chunk", {
            type: "workflow-finish",
            runId: self.runId,
            from: "WORKFLOW" /* WORKFLOW */,
            payload: {
              workflowStatus: self.#status,
              metadata: self.#streamError ? {
                error: self.#streamError,
                errorMessage: self.#streamError?.message
              } : {},
              output: {
                usage: self.#usageCount
              },
              // Include tripwire data when status is 'tripwire'
              ...self.#status === "tripwire" && self.#tripwireData ? { tripwire: self.#tripwireData } : {}
            }
          });
          self.#streamFinished = true;
          self.#emitter.emit("finish");
        }
      })
    ).catch((reason) => {
      console.log(" something went wrong", reason);
    });
  }
  async consumeStream(options) {
    if (this.#consumptionStarted) {
      return;
    }
    this.#consumptionStarted = true;
    try {
      await consumeStream2({
        stream: this.#baseStream,
        onError: options?.onError
      });
    } catch (error) {
      options?.onError?.(error);
    }
  }
  get fullStream() {
    const self = this;
    return new ReadableStream$1({
      start(controller) {
        self.#bufferedChunks.forEach((chunk) => {
          controller.enqueue(chunk);
        });
        if (self.#streamFinished) {
          controller.close();
          return;
        }
        const chunkHandler = (chunk) => {
          controller.enqueue(chunk);
        };
        const finishHandler = () => {
          self.#emitter.off("chunk", chunkHandler);
          self.#emitter.off("finish", finishHandler);
          controller.close();
        };
        self.#emitter.on("chunk", chunkHandler);
        self.#emitter.on("finish", finishHandler);
      },
      pull(_controller) {
        if (!self.#consumptionStarted) {
          void self.consumeStream();
        }
      },
      cancel() {
        self.#emitter.removeAllListeners();
      }
    });
  }
  get status() {
    return this.#status;
  }
  get result() {
    return this.#getDelayedPromise(this.#delayedPromises.result);
  }
  get usage() {
    return this.#getDelayedPromise(this.#delayedPromises.usage);
  }
  /**
   * @deprecated Use `fullStream.locked` instead
   */
  get locked() {
    console.warn("WorkflowRunOutput.locked is deprecated. Use fullStream.locked instead.");
    return this.fullStream.locked;
  }
  /**
   * @deprecated Use `fullStream.cancel()` instead
   */
  cancel(reason) {
    console.warn("WorkflowRunOutput.cancel() is deprecated. Use fullStream.cancel() instead.");
    return this.fullStream.cancel(reason);
  }
  /**
   * @deprecated Use `fullStream.getReader()` instead
   */
  getReader(options) {
    console.warn("WorkflowRunOutput.getReader() is deprecated. Use fullStream.getReader() instead.");
    return this.fullStream.getReader(options);
  }
  /**
   * @deprecated Use `fullStream.pipeThrough()` instead
   */
  pipeThrough(transform, options) {
    console.warn("WorkflowRunOutput.pipeThrough() is deprecated. Use fullStream.pipeThrough() instead.");
    return this.fullStream.pipeThrough(transform, options);
  }
  /**
   * @deprecated Use `fullStream.pipeTo()` instead
   */
  pipeTo(destination, options) {
    console.warn("WorkflowRunOutput.pipeTo() is deprecated. Use fullStream.pipeTo() instead.");
    return this.fullStream.pipeTo(destination, options);
  }
  /**
   * @deprecated Use `fullStream.tee()` instead
   */
  tee() {
    console.warn("WorkflowRunOutput.tee() is deprecated. Use fullStream.tee() instead.");
    return this.fullStream.tee();
  }
  /**
   * @deprecated Use `fullStream[Symbol.asyncIterator]()` instead
   */
  [Symbol.asyncIterator]() {
    console.warn(
      "WorkflowRunOutput[Symbol.asyncIterator]() is deprecated. Use fullStream[Symbol.asyncIterator]() instead."
    );
    return this.fullStream[Symbol.asyncIterator]();
  }
  /**
   * Helper method to treat this object as a ReadableStream
   * @deprecated Use `fullStream` directly instead
   */
  toReadableStream() {
    console.warn("WorkflowRunOutput.toReadableStream() is deprecated. Use fullStream directly instead.");
    return this.fullStream;
  }
};

// src/stream/aisdk/v5/transform.ts
function sanitizeToolCallInput(input) {
  try {
    JSON.parse(input);
    return input;
  } catch {
    return input.replace(/[\s]*<\|[^|]*\|>[\s]*/g, "").trim();
  }
}
function tryRepairJson(input) {
  let repaired = input.trim();
  repaired = repaired.replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)"/g, (match, prefix, name) => {
    if (prefix.trimEnd().endsWith('"')) {
      return match;
    }
    return `${prefix}"${name}"`;
  });
  repaired = repaired.replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":');
  repaired = repaired.replace(/'/g, '"');
  repaired = repaired.replace(/,(\s*[}\]])/g, "$1");
  repaired = repaired.replace(/:\s*(\d{4}-\d{2}-\d{2}(?:T[\d:]+)?)\s*([,}])/g, ': "$1"$2');
  try {
    return JSON.parse(repaired);
  } catch {
    return null;
  }
}
function convertFullStreamChunkToMastra(value, ctx) {
  switch (value.type) {
    case "response-metadata":
      return {
        type: "response-metadata",
        runId: ctx.runId,
        from: "AGENT" /* AGENT */,
        payload: { ...value }
      };
    case "text-start":
      return {
        type: "text-start",
        runId: ctx.runId,
        from: "AGENT" /* AGENT */,
        payload: {
          id: value.id,
          providerMetadata: value.providerMetadata
        }
      };
    case "text-delta":
      if (value.delta) {
        return {
          type: "text-delta",
          runId: ctx.runId,
          from: "AGENT" /* AGENT */,
          payload: {
            id: value.id,
            providerMetadata: value.providerMetadata,
            text: value.delta
          }
        };
      }
      return;
    case "text-end":
      return {
        type: "text-end",
        runId: ctx.runId,
        from: "AGENT" /* AGENT */,
        payload: value
      };
    case "reasoning-start":
      return {
        type: "reasoning-start",
        runId: ctx.runId,
        from: "AGENT" /* AGENT */,
        payload: {
          id: value.id,
          providerMetadata: value.providerMetadata
        }
      };
    case "reasoning-delta":
      return {
        type: "reasoning-delta",
        runId: ctx.runId,
        from: "AGENT" /* AGENT */,
        payload: {
          id: value.id,
          providerMetadata: value.providerMetadata,
          text: value.delta
        }
      };
    case "reasoning-end":
      return {
        type: "reasoning-end",
        runId: ctx.runId,
        from: "AGENT" /* AGENT */,
        payload: {
          id: value.id,
          providerMetadata: value.providerMetadata
        }
      };
    case "source":
      return {
        type: "source",
        runId: ctx.runId,
        from: "AGENT" /* AGENT */,
        payload: {
          id: value.id,
          sourceType: value.sourceType,
          title: value.title || "",
          mimeType: value.sourceType === "document" ? value.mediaType : void 0,
          filename: value.sourceType === "document" ? value.filename : void 0,
          url: value.sourceType === "url" ? value.url : void 0,
          providerMetadata: value.providerMetadata
        }
      };
    case "file": {
      const pm = value.providerMetadata;
      return {
        type: "file",
        runId: ctx.runId,
        from: "AGENT" /* AGENT */,
        payload: {
          data: value.data,
          base64: typeof value.data === "string" ? value.data : void 0,
          mimeType: value.mediaType,
          ...pm != null ? { providerMetadata: pm } : {}
        }
      };
    }
    case "tool-call": {
      let toolCallInput = void 0;
      if (value.input) {
        const sanitized = sanitizeToolCallInput(value.input);
        if (sanitized) {
          try {
            toolCallInput = JSON.parse(sanitized);
          } catch {
            const repaired = tryRepairJson(sanitized);
            if (repaired) {
              toolCallInput = repaired;
            } else {
              console.error("Error converting tool call input to JSON", {
                input: value.input
              });
              toolCallInput = void 0;
            }
          }
        }
      }
      return {
        type: "tool-call",
        runId: ctx.runId,
        from: "AGENT" /* AGENT */,
        payload: {
          toolCallId: value.toolCallId,
          toolName: value.toolName,
          args: toolCallInput,
          providerExecuted: value.providerExecuted,
          providerMetadata: value.providerMetadata
        }
      };
    }
    case "tool-result":
      return {
        type: "tool-result",
        runId: ctx.runId,
        from: "AGENT" /* AGENT */,
        payload: {
          toolCallId: value.toolCallId,
          toolName: value.toolName,
          result: value.result,
          isError: value.isError,
          providerExecuted: value.providerExecuted,
          providerMetadata: value.providerMetadata
        }
      };
    case "tool-input-start":
      return {
        type: "tool-call-input-streaming-start",
        runId: ctx.runId,
        from: "AGENT" /* AGENT */,
        payload: {
          toolCallId: value.id,
          toolName: value.toolName,
          providerExecuted: value.providerExecuted,
          providerMetadata: value.providerMetadata,
          dynamic: value.dynamic
        }
      };
    case "tool-input-delta":
      if (value.delta) {
        return {
          type: "tool-call-delta",
          runId: ctx.runId,
          from: "AGENT" /* AGENT */,
          payload: {
            argsTextDelta: value.delta,
            toolCallId: value.id,
            providerMetadata: value.providerMetadata
          }
        };
      }
      return;
    case "tool-input-end":
      return {
        type: "tool-call-input-streaming-end",
        runId: ctx.runId,
        from: "AGENT" /* AGENT */,
        payload: {
          toolCallId: value.id,
          providerMetadata: value.providerMetadata
        }
      };
    case "finish":
      const { finishReason, usage, providerMetadata, messages, ...rest } = value;
      return {
        type: "finish",
        runId: ctx.runId,
        from: "AGENT" /* AGENT */,
        payload: {
          providerMetadata: value.providerMetadata,
          stepResult: {
            reason: normalizeFinishReason(value.finishReason)
          },
          output: {
            // Normalize usage to handle both V2 (flat) and V3 (nested) formats
            usage: normalizeUsage(value.usage)
          },
          metadata: {
            providerMetadata: value.providerMetadata
          },
          messages: messages ?? {
            all: [],
            user: [],
            nonUser: []
          },
          ...rest
        }
      };
    case "error":
      return {
        type: "error",
        runId: ctx.runId,
        from: "AGENT" /* AGENT */,
        payload: value
      };
    case "raw":
      return {
        type: "raw",
        runId: ctx.runId,
        from: "AGENT" /* AGENT */,
        payload: value.rawValue
      };
  }
  return;
}
function isV3Usage(usage) {
  if (!usage || typeof usage !== "object") return false;
  const u = usage;
  return typeof u.inputTokens === "object" && u.inputTokens !== null && "total" in u.inputTokens && typeof u.outputTokens === "object" && u.outputTokens !== null && "total" in u.outputTokens;
}
function normalizeUsage(usage) {
  if (!usage) {
    return {
      inputTokens: void 0,
      outputTokens: void 0,
      totalTokens: void 0,
      reasoningTokens: void 0,
      cachedInputTokens: void 0,
      raw: void 0
    };
  }
  if (isV3Usage(usage)) {
    const inputTokens = usage.inputTokens.total;
    const outputTokens = usage.outputTokens.total;
    return {
      inputTokens,
      outputTokens,
      totalTokens: (inputTokens ?? 0) + (outputTokens ?? 0),
      reasoningTokens: usage.outputTokens.reasoning,
      cachedInputTokens: usage.inputTokens.cacheRead,
      raw: usage
    };
  }
  const v2Usage = usage;
  return {
    inputTokens: v2Usage.inputTokens,
    outputTokens: v2Usage.outputTokens,
    totalTokens: v2Usage.totalTokens ?? (v2Usage.inputTokens ?? 0) + (v2Usage.outputTokens ?? 0),
    reasoningTokens: v2Usage.reasoningTokens,
    cachedInputTokens: v2Usage.cachedInputTokens,
    raw: usage
  };
}
function isV3FinishReason(finishReason) {
  return typeof finishReason === "object" && finishReason !== null && "unified" in finishReason;
}
function normalizeFinishReason(finishReason) {
  if (!finishReason) {
    return "other";
  }
  if (finishReason === "tripwire" || finishReason === "retry") {
    return finishReason;
  }
  if (isV3FinishReason(finishReason)) {
    return finishReason.unified;
  }
  return finishReason === "unknown" ? "other" : finishReason;
}

// src/agent/trip-wire.ts
var TripWire = class extends Error {
  options;
  processorId;
  constructor(reason, options = {}, processorId) {
    super(reason);
    this.options = options;
    this.processorId = processorId;
    Object.setPrototypeOf(this, new.target.prototype);
  }
};
var getModelOutputForTripwire = async ({
  tripwire,
  runId,
  options,
  model,
  messageList,
  ...rest
}) => {
  const observabilityContext = resolveObservabilityContext(rest);
  const tripwireStream = new ReadableStream$1({
    start(controller) {
      controller.enqueue({
        type: "tripwire",
        runId,
        from: "AGENT" /* AGENT */,
        payload: {
          reason: tripwire.reason || "",
          retry: tripwire.retry,
          metadata: tripwire.metadata,
          processorId: tripwire.processorId
        }
      });
      controller.close();
    }
  });
  const modelOutput = new MastraModelOutput({
    model: {
      modelId: model.modelId,
      provider: model.provider,
      version: model.specificationVersion
    },
    stream: tripwireStream,
    messageList,
    options: {
      runId,
      structuredOutput: options.structuredOutput,
      ...observabilityContext,
      onFinish: options.onFinish,
      // Fix these types after the types PR is merged
      onStepFinish: options.onStepFinish,
      returnScorerData: options.returnScorerData,
      requestContext: options.requestContext
    },
    messageId: randomUUID()
  });
  return modelOutput;
};

// src/channels/chat-lazy.ts
var cached;
var loading;
async function getChatModule() {
  if (cached) {
    return cached;
  }
  if (!loading) {
    loading = (async () => {
      const mod = "chat";
      const chatModule2 = await import(
        /* @vite-ignore */
        /* webpackIgnore: true */
        mod
      );
      cached = chatModule2;
      return chatModule2;
    })();
  }
  return loading;
}
function chatModule() {
  if (!cached) {
    throw new Error("chat module not loaded yet \u2014 call getChatModule() first");
  }
  return cached;
}

// src/channels/formatting.ts
var ui = () => chatModule();
var TOOL_PREFIXES = ["mastra_workspace_"];
var MAX_ARG_SUMMARY_LENGTH = 40;
var MAX_RESULT_LENGTH = 300;
function stripToolPrefix(name) {
  for (const prefix of TOOL_PREFIXES) {
    if (name.startsWith(prefix)) {
      return name.slice(prefix.length);
    }
  }
  return name;
}
function formatArgsSummary(args) {
  try {
    const obj = typeof args === "string" ? JSON.parse(args) : args;
    if (!obj || typeof obj !== "object") return "";
    const entries = Object.entries(obj).filter(
      ([key, val]) => key !== "__mastraMetadata" && val != null && val !== false && val !== ""
    );
    if (entries.length === 0) return "";
    const [, first] = entries[0];
    let display = typeof first === "string" ? first : JSON.stringify(first);
    if (display.length > MAX_ARG_SUMMARY_LENGTH) {
      display = display.slice(0, MAX_ARG_SUMMARY_LENGTH) + "\u2026";
    }
    return display;
  } catch {
    return "";
  }
}
function formatResult(result, isError) {
  const prefix = isError ? "Error: " : "";
  if (result == null) return `${prefix}(no output)`;
  let text = typeof result === "string" ? result : JSON.stringify(result, null, 2);
  text = text.trim();
  if (text.length > MAX_RESULT_LENGTH) {
    text = text.slice(0, MAX_RESULT_LENGTH) + "\u2026";
  }
  return `${prefix}${text}`;
}
function formatDuration(ms) {
  if (ms < 1e3) return `${ms}ms`;
  return `${(ms / 1e3).toFixed(1)}s`;
}
function formatToolHeader(toolName, argsSummary) {
  return argsSummary ? `*${toolName}* \`${argsSummary}\`` : `*${toolName}*`;
}
function formatToolRunning(toolName, argsSummary, useCards) {
  const header = formatToolHeader(toolName, argsSummary);
  if (useCards) {
    return ui().Card({ children: [ui().CardText(`${header} \u22EF`)] });
  }
  return `${header} \u22EF`;
}
function formatToolResult(toolName, argsSummary, resultText, isError, durationMs, useCards) {
  const status = durationMs != null ? `${formatDuration(durationMs)} ${isError ? "\u2717" : "\u2713"}` : isError ? "\u2717" : "\u2713";
  const header = formatToolHeader(toolName, argsSummary);
  if (useCards) {
    const headerWithStatus = `${header} \xB7 ${status}`;
    const resultBody2 = isError ? resultText : `\`\`\`
${resultText}
\`\`\``;
    return ui().Card({
      children: [ui().CardText(headerWithStatus), ui().CardText(resultBody2, { style: isError ? "bold" : "plain" })]
    });
  }
  const resultBody = isError && !resultText.startsWith("Error: ") ? `Error: ${resultText}` : resultText;
  return `${header} \xB7 ${status}
${resultBody}`;
}
function formatToolApproval(toolName, argsSummary, toolCallId, useCards) {
  const header = formatToolHeader(toolName, argsSummary);
  if (useCards) {
    return ui().Card({
      children: [
        ui().CardText(header),
        ui().CardText("Requires approval to run."),
        ui().Actions([
          ui().Button({ id: `tool_approve:${toolCallId}`, label: "Approve", style: "primary" }),
          ui().Button({ id: `tool_deny:${toolCallId}`, label: "Deny", style: "danger" })
        ])
      ]
    });
  }
  return `${header}
\u23F8 Requires approval to run. Reply "approve" or "deny".`;
}
function formatToolApproved(toolName, argsSummary, useCards) {
  const header = formatToolHeader(toolName, argsSummary);
  if (useCards) {
    return ui().Card({ children: [ui().CardText(`${header} \u22EF`), ui().CardText("\u2713 Approved")] });
  }
  return `${header} \u22EF
\u2713 Approved`;
}
function formatToolDenied(toolName, argsSummary, byUser, useCards) {
  const header = formatToolHeader(toolName, argsSummary);
  const suffix = byUser ? ` by ${byUser}` : "";
  if (useCards) {
    return ui().Card({ children: [ui().CardText(`${header} \u2717`), ui().CardText(`\u2717 Denied${suffix}`)] });
  }
  return `${header} \u2717
\u2717 Denied${suffix}`;
}

// src/channels/processor.ts
var ChatChannelProcessor = class {
  id = "chat-channel-context";
  processInputStep(args) {
    const ctx = args.requestContext?.get("channel");
    if (!ctx) return void 0;
    const lines = [`You are communicating via ${ctx.platform}.`];
    if (ctx.botUserName || ctx.botMention) {
      const parts = [];
      if (ctx.botUserName) parts.push(`"${ctx.botUserName}"`);
      if (ctx.botMention) parts.push(ctx.botMention);
      lines.push(
        `Your identity on this platform is ${parts.join(" / ")}. Messages containing these references are directed at you.`
      );
    }
    if (ctx.isDM) {
      lines.push("This is a direct message (DM) conversation.");
      if (ctx.userName || ctx.userId) {
        const identity = [];
        if (ctx.userName) identity.push(`name: "${ctx.userName}"`);
        if (ctx.userId) identity.push(`ID: ${ctx.userId}`);
        lines.push(`You are talking to a user (${identity.join(", ")}).`);
      }
    } else {
      lines.push(
        "You are in a public channel or thread.",
        "Not every message is directed at you. If users appear to be talking to each other, stay silent unless you are explicitly mentioned or your input is clearly needed. To stay silent, respond with an empty message."
      );
    }
    const systemMessage = { role: "system", content: lines.join("\n") };
    return { systemMessages: [...args.systemMessages, systemMessage] };
  }
};

// src/channels/state-adapter.ts
var MastraStateAdapter = class {
  memoryStore;
  connected = false;
  connectPromise = null;
  // In-memory ephemeral state (cache, locks, lists, queues)
  cache = /* @__PURE__ */ new Map();
  locks = /* @__PURE__ */ new Map();
  lists = /* @__PURE__ */ new Map();
  queues = /* @__PURE__ */ new Map();
  constructor(memoryStore) {
    this.memoryStore = memoryStore;
  }
  async connect() {
    if (this.connected) return;
    if (!this.connectPromise) {
      this.connectPromise = Promise.resolve().then(() => {
        this.connected = true;
      });
    }
    await this.connectPromise;
  }
  async disconnect() {
    this.connected = false;
    this.connectPromise = null;
    this.cache.clear();
    this.locks.clear();
    this.lists.clear();
    this.queues.clear();
  }
  // ---------------------------------------------------------------------------
  // Subscriptions — persisted via Mastra thread metadata
  // ---------------------------------------------------------------------------
  async subscribe(threadId) {
    const thread = await this.findThreadByExternalId(threadId);
    if (!thread) return;
    await this.memoryStore.updateThread({
      id: thread.id,
      title: thread.title ?? "",
      metadata: { ...thread.metadata, channel_subscribed: "true" }
    });
  }
  async unsubscribe(threadId) {
    const thread = await this.findThreadByExternalId(threadId);
    if (!thread) return;
    await this.memoryStore.updateThread({
      id: thread.id,
      title: thread.title ?? "",
      metadata: { ...thread.metadata ?? {}, channel_subscribed: "false" }
    });
  }
  async isSubscribed(threadId) {
    const thread = await this.findThreadByExternalId(threadId);
    if (!thread) return false;
    return thread.metadata?.channel_subscribed === "true";
  }
  // ---------------------------------------------------------------------------
  // Cache — in-memory with TTL
  // ---------------------------------------------------------------------------
  async get(key) {
    const cached2 = this.cache.get(key);
    if (!cached2) return null;
    if (cached2.expiresAt !== null && cached2.expiresAt <= Date.now()) {
      this.cache.delete(key);
      return null;
    }
    return cached2.value;
  }
  async set(key, value, ttlMs) {
    this.cache.set(key, {
      value,
      expiresAt: ttlMs ? Date.now() + ttlMs : null
    });
  }
  async setIfNotExists(key, value, ttlMs) {
    const existing = this.cache.get(key);
    if (existing) {
      if (existing.expiresAt !== null && existing.expiresAt <= Date.now()) {
        this.cache.delete(key);
      } else {
        return false;
      }
    }
    this.cache.set(key, {
      value,
      expiresAt: ttlMs ? Date.now() + ttlMs : null
    });
    return true;
  }
  async delete(key) {
    this.cache.delete(key);
  }
  // ---------------------------------------------------------------------------
  // Lists — in-memory with TTL
  // ---------------------------------------------------------------------------
  async appendToList(key, value, options) {
    let entry = this.lists.get(key);
    if (entry && entry.expiresAt !== null && entry.expiresAt <= Date.now()) {
      entry = void 0;
    }
    const values = entry?.values ?? [];
    values.push(value);
    if (options?.maxLength && values.length > options.maxLength) {
      values.splice(0, values.length - options.maxLength);
    }
    this.lists.set(key, {
      values,
      expiresAt: options?.ttlMs ? Date.now() + options.ttlMs : entry?.expiresAt ?? null
    });
  }
  async getList(key) {
    const entry = this.lists.get(key);
    if (!entry) return [];
    if (entry.expiresAt !== null && entry.expiresAt <= Date.now()) {
      this.lists.delete(key);
      return [];
    }
    return entry.values;
  }
  // ---------------------------------------------------------------------------
  // Locks — in-memory
  // ---------------------------------------------------------------------------
  async acquireLock(threadId, ttlMs) {
    this.cleanExpiredLocks();
    const existing = this.locks.get(threadId);
    if (existing && existing.expiresAt > Date.now()) return null;
    const lock = {
      threadId,
      token: crypto.randomUUID(),
      expiresAt: Date.now() + ttlMs
    };
    this.locks.set(threadId, lock);
    return lock;
  }
  async releaseLock(lock) {
    const existing = this.locks.get(lock.threadId);
    if (existing && existing.token === lock.token) {
      this.locks.delete(lock.threadId);
    }
  }
  async extendLock(lock, ttlMs) {
    const existing = this.locks.get(lock.threadId);
    if (!existing || existing.token !== lock.token) return false;
    if (existing.expiresAt < Date.now()) {
      this.locks.delete(lock.threadId);
      return false;
    }
    existing.expiresAt = Date.now() + ttlMs;
    return true;
  }
  async forceReleaseLock(threadId) {
    this.locks.delete(threadId);
  }
  // ---------------------------------------------------------------------------
  // Queue — in-memory (for concurrency strategies)
  // ---------------------------------------------------------------------------
  async enqueue(threadId, entry, maxSize) {
    let queue = this.queues.get(threadId);
    if (!queue) {
      queue = [];
      this.queues.set(threadId, queue);
    }
    queue.push(entry);
    if (queue.length > maxSize) {
      queue.splice(0, queue.length - maxSize);
    }
    return queue.length;
  }
  async dequeue(threadId) {
    const queue = this.queues.get(threadId);
    if (!queue || queue.length === 0) return null;
    return queue.shift();
  }
  async queueDepth(threadId) {
    return this.queues.get(threadId)?.length ?? 0;
  }
  // ---------------------------------------------------------------------------
  // Internal
  // ---------------------------------------------------------------------------
  cleanExpiredLocks() {
    const now = Date.now();
    for (const [id, lock] of this.locks) {
      if (lock.expiresAt <= now) this.locks.delete(id);
    }
  }
  /**
   * Find a Mastra thread by its external (SDK) thread ID.
   * External thread IDs are stored in `channel_externalThreadId` metadata.
   */
  async findThreadByExternalId(externalThreadId) {
    const { threads } = await this.memoryStore.listThreads({
      filter: { metadata: { channel_externalThreadId: externalThreadId } },
      perPage: 1
    });
    return threads[0] ?? null;
  }
};

// src/channels/agent-channels.ts
function buildInlineMediaCheck(config) {
  if (typeof config === "function") return config;
  const patterns = config ?? ["image/*"];
  return (mimeType) => {
    return patterns.some((pattern) => {
      if (pattern === "*" || pattern === "*/*") return true;
      if (pattern.endsWith("/*")) {
        return mimeType.startsWith(pattern.slice(0, -1));
      }
      return mimeType === pattern;
    });
  };
}
function normalizeInlineLinks(config) {
  if (config == null || config.length === 0) return void 0;
  return config.map(
    (entry) => typeof entry === "string" ? { match: entry } : { match: entry.match, forcedMimeType: entry.mimeType }
  );
}
function matchesDomain(url, pattern) {
  if (pattern === "*") return true;
  try {
    const hostname = new URL(url).hostname;
    return hostname === pattern || hostname.endsWith(`.${pattern}`);
  } catch {
    return false;
  }
}
function findInlineLinkRule(url, rules) {
  return rules.find((rule) => matchesDomain(url, rule.match));
}
var URL_REGEX = /https?:\/\/[^\s<>)"']+/gi;
function extractUrls(text) {
  return Array.from(text.matchAll(URL_REGEX), (m) => m[0]);
}
async function headContentType(url, logger) {
  try {
    const res = await fetch(url, { method: "HEAD", redirect: "follow" });
    if (!res.ok) return void 0;
    const ct = res.headers.get("content-type");
    return ct?.split(";")[0]?.trim() || void 0;
  } catch (e) {
    logger?.debug("[CHANNEL] HEAD request failed for link", { url, error: String(e) });
    return void 0;
  }
}
var AgentChannels = class {
  adapters;
  chat = null;
  /** Stored initialization promise so webhook handlers can await readiness on serverless cold starts. */
  initPromise = null;
  agent;
  logger;
  customState;
  stateAdapter;
  userName;
  /** Normalized per-adapter configs (gateway flags, hooks, etc.). */
  adapterConfigs;
  /** Handler overrides from config. */
  handlerOverrides;
  /** Additional Chat SDK options. */
  chatOptions;
  /** Thread context config for fetching prior messages. */
  threadContext;
  /** Determines whether a mime type should be sent inline to the model. */
  shouldInline;
  /** Inline-link rules for promoting URLs in message text to file parts. */
  inlineLinkRules;
  /** Whether channel tools (reactions, etc.) are enabled. */
  toolsEnabled;
  /** Channel tool names whose effects are already visible on the platform (skip rendering cards). */
  channelToolNames;
  constructor(config) {
    const adapters = {};
    const adapterConfigs = {};
    for (const [name, value] of Object.entries(config.adapters)) {
      if (value && typeof value === "object" && "adapter" in value) {
        const cfg = value;
        adapters[name] = cfg.adapter;
        adapterConfigs[name] = cfg;
      } else {
        adapters[name] = value;
        adapterConfigs[name] = { adapter: value };
      }
    }
    this.adapters = adapters;
    this.adapterConfigs = adapterConfigs;
    this.handlerOverrides = config.handlers ?? {};
    this.customState = config.state;
    this.userName = config.userName ?? "Mastra";
    this.chatOptions = config.chatOptions ?? {};
    this.threadContext = config.threadContext ?? {};
    this.shouldInline = buildInlineMediaCheck(config.inlineMedia);
    this.inlineLinkRules = normalizeInlineLinks(config.inlineLinks);
    this.toolsEnabled = config.tools !== false;
    this.channelToolNames = new Set(Object.keys(this.getTools()));
  }
  /**
   * Bind this AgentChannels to its owning agent. Called by Agent constructor.
   * @internal
   */
  __setAgent(agent) {
    this.agent = agent;
  }
  /**
   * Set the logger. Called by Mastra.addAgent.
   * @internal
   */
  __setLogger(logger) {
    this.logger = "child" in logger && typeof logger.child === "function" ? logger.child("CHANNEL") : logger;
  }
  /**
   * Get the underlying Chat SDK instance.
   * Available after Mastra initialization. Use this to register additional
   * event handlers or access adapter-specific methods.
   *
   * @example
   * ```ts
   * agent.channels.sdk.onReaction((thread, reaction) => {
   *   console.log('Reaction received:', reaction);
   * });
   * ```
   */
  get sdk() {
    return this.chat;
  }
  /**
   * Initialize the Chat SDK, register handlers, and start gateway listeners.
   * Called by Mastra.addAgent after the server is ready.
   */
  async initialize(mastra) {
    if (this.chat) return;
    if (this.initPromise) {
      return this.initPromise;
    }
    this.initPromise = (async () => {
      if (this.customState) {
        this.stateAdapter = this.customState;
      } else {
        const storage = mastra.getStorage();
        const memoryStore = storage ? await storage.getStore("memory") : void 0;
        if (!memoryStore) {
          throw new Error(
            "Channels require storage to be configured on the Mastra instance. Configure a storage provider like LibSQLStore."
          );
        }
        this.stateAdapter = new MastraStateAdapter(memoryStore);
        this.log("info", "Using MastraStateAdapter (subscriptions persist across restarts)");
      }
      const { Chat } = await getChatModule();
      const chat = new Chat({
        adapters: this.adapters,
        state: this.stateAdapter,
        userName: this.userName,
        concurrency: { strategy: "queue" },
        ...this.chatOptions
      });
      const defaultHandler = (sdkThread, message) => this.handleChatMessage(sdkThread, message, mastra);
      const { onDirectMessage, onMention, onSubscribedMessage } = this.handlerOverrides;
      if (onDirectMessage !== false) {
        chat.onDirectMessage((thread, message) => {
          if (typeof onDirectMessage === "function") {
            return onDirectMessage(thread, message, defaultHandler);
          }
          return defaultHandler(thread, message);
        });
      }
      if (onMention !== false) {
        chat.onNewMention((thread, message) => {
          if (typeof onMention === "function") {
            return onMention(thread, message, defaultHandler);
          }
          return defaultHandler(thread, message);
        });
      }
      if (onSubscribedMessage !== false) {
        chat.onSubscribedMessage((thread, message) => {
          if (typeof onSubscribedMessage === "function") {
            return onSubscribedMessage(thread, message, defaultHandler);
          }
          return defaultHandler(thread, message);
        });
      }
      chat.onAction(async (event) => {
        const { actionId } = event;
        if (!actionId.startsWith("tool_approve:") && !actionId.startsWith("tool_deny:")) return;
        try {
          const approved = actionId.startsWith("tool_approve:");
          const toolCallId = actionId.split(":")[1];
          const sdkThread = event.thread;
          if (!sdkThread) {
            this.log("info", `No thread in action event for toolCallId=${toolCallId}`);
            return;
          }
          const platform = event.adapter.name;
          const messageId = event.messageId;
          const adapter = this.adapters[platform];
          const adapterConfig = this.adapterConfigs[platform];
          if (!adapter) throw new Error(`No adapter for platform "${platform}"`);
          const externalThreadId = sdkThread.isDM ? sdkThread.channelId : sdkThread.id;
          const mastraThread = await this.getOrCreateThread({
            externalThreadId,
            channelId: sdkThread.channelId,
            platform,
            resourceId: `${platform}:${event.user.userId}`,
            mastra
          });
          const storage = mastra.getStorage();
          const memoryStore = storage ? await storage.getStore("memory") : void 0;
          if (!memoryStore) {
            throw new Error("Storage is required for tool approval lookups");
          }
          const { messages } = await memoryStore.listMessages({
            threadId: mastraThread.id,
            perPage: 50,
            orderBy: { field: "createdAt", direction: "DESC" }
          });
          let runId;
          let toolName;
          let toolArgs;
          for (const msg of messages) {
            const pending = msg.content?.metadata?.pendingToolApprovals;
            if (pending) {
              for (const toolData of Object.values(pending)) {
                if (toolData.toolCallId === toolCallId) {
                  runId = toolData.runId;
                  toolName = toolData.toolName;
                  toolArgs = toolData.args;
                  break;
                }
              }
              if (runId) break;
            }
          }
          if (!runId) {
            this.log("info", `No pending approval found for toolCallId=${toolCallId}`);
            return;
          }
          const displayName = toolName ? stripToolPrefix(toolName) : "tool";
          const argsSummary = toolArgs ? formatArgsSummary(toolArgs) : "";
          const useCards = adapterConfig?.cards !== false;
          if (!approved) {
            const byUser = sdkThread.isDM ? void 0 : event.user.fullName || event.user.userName || "User";
            try {
              await adapter.editMessage(
                sdkThread.id,
                messageId,
                formatToolDenied(displayName, argsSummary, byUser, useCards)
              );
            } catch (err) {
              this.log("debug", "Failed to edit denied card", err);
            }
            return;
          }
          try {
            await adapter.editMessage(sdkThread.id, messageId, formatToolApproved(displayName, argsSummary, useCards));
          } catch (err) {
            this.log("debug", "Failed to edit approved card", err);
          }
          const actionAdapter = this.adapters[platform];
          const actionBotUserId = actionAdapter.botUserId;
          const actionBotMention = actionBotUserId ? sdkThread.mentionUser(actionBotUserId) : void 0;
          const requestContext = new RequestContext();
          requestContext.set("channel", {
            platform,
            eventType: "action",
            isDM: sdkThread.isDM,
            threadId: sdkThread.id,
            channelId: sdkThread.channelId,
            messageId,
            userId: event.user.userId,
            userName: event.user.fullName || event.user.userName,
            botUserId: actionBotUserId,
            botUserName: actionAdapter.userName,
            botMention: actionBotMention
          });
          const resumedStream = await this.agent.approveToolCall({
            runId,
            toolCallId,
            requestContext
          });
          await this.consumeAgentStream(
            resumedStream,
            sdkThread,
            platform,
            toolCallId ? { toolCallId, messageId } : void 0
          );
        } catch (err) {
          const isStaleApproval = err instanceof Error && err.message.includes("No snapshot found");
          if (isStaleApproval) {
            this.log("info", `Ignoring stale tool approval action (runId already consumed)`);
            return;
          }
          this.log("error", "Error handling tool approval action", err);
          try {
            const thread = event.thread;
            if (thread) {
              const error = err instanceof Error ? err : new Error(String(err));
              const adapterConfig = this.adapterConfigs[event.adapter.name];
              const errorMessage = adapterConfig?.formatError ? adapterConfig.formatError(error) : `\u274C Error: ${error.message}`;
              await thread.post(errorMessage);
            }
          } catch (err2) {
            this.log("debug", "Failed to post error message for action", err2);
          }
        }
      });
      await chat.initialize();
      this.chat = chat;
      for (const [name, adapter] of Object.entries(this.adapters)) {
        if (!(this.adapterConfigs[name]?.gateway ?? true)) continue;
        const adapterAny = adapter;
        if (typeof adapterAny.startGatewayListener === "function") {
          const startGateway = adapterAny.startGatewayListener.bind(adapter);
          this.startGatewayLoop(name, startGateway);
        }
      }
    })();
    try {
      await this.initPromise;
    } catch (error) {
      this.initPromise = null;
      throw error;
    }
  }
  /**
   * Returns API routes for receiving webhook events from each adapter.
   * One POST route per adapter at `/api/agents/{agentId}/channels/{platform}/webhook`.
   */
  getWebhookRoutes() {
    if (!this.agent) return [];
    const agentId = this.agent.id;
    const routes = [];
    for (const platform of Object.keys(this.adapters)) {
      const self = this;
      routes.push({
        path: `/api/agents/${agentId}/channels/${platform}/webhook`,
        method: "POST",
        requiresAuth: false,
        createHandler: async () => {
          return async (c) => {
            if (self.initPromise) {
              try {
                await self.initPromise;
              } catch {
                return c.json({ error: "Chat initialization failed" }, 503);
              }
            }
            const sdkInstance = self.chat;
            if (!sdkInstance) {
              return c.json({ error: "Chat not initialized" }, 503);
            }
            const webhookHandler = sdkInstance.webhooks?.[platform];
            if (!webhookHandler) {
              return c.json({ error: `No webhook handler for ${platform}` }, 404);
            }
            const execCtx = c.executionCtx;
            const waitUntilFn = execCtx?.waitUntil?.bind(execCtx);
            return webhookHandler(c.req.raw, waitUntilFn ? { waitUntil: waitUntilFn } : void 0);
          };
        }
      });
    }
    return routes;
  }
  /**
   * Returns channel input processors (e.g. system prompt injection).
   * Skips if the user already added a processor with the same id.
   */
  getInputProcessors(configuredProcessors = []) {
    const hasProcessor = configuredProcessors.some((p) => !isProcessorWorkflow(p) && p.id === "chat-channel-context");
    if (hasProcessor) return [];
    return [new ChatChannelProcessor()];
  }
  /**
   * Returns generic channel tools (send_message, add_reaction, etc.)
   * that resolve the target adapter from the current request context.
   */
  getTools() {
    if (!this.toolsEnabled) return {};
    return this.makeChannelTools();
  }
  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------
  /**
   * Resolve the adapter for the current conversation from request context.
   */
  getAdapterFromContext(context) {
    const channel = context.requestContext?.get("channel");
    if (!channel?.platform || !channel?.threadId) {
      throw new Error("No channel context \u2014 cannot determine platform or thread");
    }
    const adapter = this.adapters[channel.platform];
    if (!adapter) {
      throw new Error(`No adapter registered for platform "${channel.platform}"`);
    }
    return { adapter, threadId: channel.threadId };
  }
  /**
   * Core handler wired to Chat SDK's onDirectMessage, onNewMention,
   * and onSubscribedMessage. Streams the Mastra agent response and
   * updates the channel message in real-time via edits.
   */
  async handleChatMessage(sdkThread, message, mastra) {
    try {
      await this.processChatMessage(sdkThread, message, mastra);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.log("error", `[${sdkThread.adapter.name}] Error handling message`, {
        messageId: message.id,
        authorId: message.author?.userId,
        error: String(err)
      });
      try {
        const adapterConfig = this.adapterConfigs[sdkThread.adapter.name];
        const errorMessage = adapterConfig?.formatError ? adapterConfig.formatError(error) : `\u274C Error: ${error.message}`;
        await sdkThread.post(errorMessage);
      } catch (postErr) {
        this.log("debug", "Failed to post error message to thread", postErr);
      }
    }
  }
  async processChatMessage(sdkThread, message, mastra) {
    const agent = this.agent;
    const platform = sdkThread.adapter.name;
    const externalThreadId = sdkThread.isDM ? sdkThread.channelId : sdkThread.id;
    const mastraThread = await this.getOrCreateThread({
      externalThreadId,
      channelId: sdkThread.channelId,
      platform,
      resourceId: `${platform}:${message.author.userId}`,
      mastra
    });
    const threadResourceId = mastraThread.resourceId;
    let historyBlock;
    const maxMessages = this.threadContext.maxMessages ?? 10;
    if (maxMessages > 0 && !sdkThread.isDM) {
      const alreadySubscribed = await sdkThread.isSubscribed();
      if (!alreadySubscribed) {
        this.logger?.debug?.(`Fetching thread history (max ${maxMessages}) for first mention in ${sdkThread.id}`);
        const history = await this.fetchThreadHistory(sdkThread, message.id, maxMessages);
        this.logger?.debug?.(`Fetched ${history.length} messages from thread history`);
        if (history.length > 0) {
          const lines = ["[Thread context \u2014 messages in this thread before you joined]"];
          for (const msg of history) {
            const mention = msg.userId ? sdkThread.mentionUser(msg.userId) : void 0;
            let prefix = mention ? msg.author ? `${msg.author} (${mention})` : mention : msg.author;
            if (msg.isBot) prefix += " (bot)";
            lines.push(`[${prefix}] (msg:${msg.id}): ${msg.text}`);
          }
          historyBlock = lines.join("\n");
        }
      } else {
        this.logger?.debug?.(`Skipping thread history fetch \u2014 already subscribed to ${sdkThread.id}`);
      }
    }
    const authorName = message.author.fullName || message.author.userName;
    const authorId = message.author.userId;
    const authorMention = authorId ? sdkThread.mentionUser(authorId) : void 0;
    const adapter = this.adapters[platform];
    const botUserId = adapter.botUserId;
    const botMention = botUserId ? sdkThread.mentionUser(botUserId) : void 0;
    const requestContext = new RequestContext();
    requestContext.set("channel", {
      platform,
      eventType: sdkThread.isDM ? "message" : "mention",
      isDM: sdkThread.isDM,
      threadId: sdkThread.id,
      channelId: sdkThread.channelId,
      messageId: message.id,
      userId: authorId,
      userName: authorName,
      botUserId,
      botUserName: adapter.userName,
      botMention
    });
    const textSegments = [];
    if (historyBlock) {
      textSegments.push(historyBlock);
    }
    if (sdkThread.isDM) {
      textSegments.push(message.text);
    } else {
      const reminderLines = [`Event: mention`, `Message ID: ${message.id}`];
      reminderLines.push("You were mentioned in this message. Respond to the user.");
      textSegments.push(`<system-reminder>
${reminderLines.join("\n")}
</system-reminder>`);
      let authorPrefix = "";
      if (authorMention) {
        authorPrefix = authorName ? `${authorName} (${authorMention})` : authorMention;
      } else if (authorName) {
        authorPrefix = authorName;
      }
      if (authorPrefix) {
        if (message.author.isBot) authorPrefix += " (bot)";
        textSegments.push(`[${authorPrefix}]: ${message.text}`);
      } else {
        textSegments.push(message.text);
      }
    }
    const rawText = textSegments.join("\n\n");
    const usableAttachments = message.attachments.filter((a) => a.url || a.fetchData);
    const parts = [{ type: "text", text: rawText }];
    this.logger?.debug("[CHANNEL] Attachments", {
      count: usableAttachments.length,
      attachments: usableAttachments.map((a) => ({
        type: a.type,
        mimeType: a.mimeType,
        url: a.url,
        hasData: !!a.fetchData
      }))
    });
    for (const att of usableAttachments) {
      if (!att.url && !att.fetchData) continue;
      const mimeType = att.mimeType || (att.type === "image" ? "image/png" : void 0);
      if (!mimeType) continue;
      const inline = this.shouldInline(mimeType);
      if (inline) {
        let data;
        if (att.fetchData) {
          try {
            const buf = await att.fetchData();
            const base64 = Buffer.from(buf).toString("base64");
            data = `data:${mimeType};base64,${base64}`;
          } catch (err) {
            this.logger?.warn("[CHANNEL] fetchData failed, falling back to URL", { mimeType, error: String(err) });
            data = att.url;
          }
        } else {
          data = att.url;
        }
        if (data) {
          parts.push({
            type: "file",
            data,
            mimeType
          });
        }
      } else {
        const filename = att.name || att.url?.split("/").pop() || "file";
        const description = `[Attached file: ${filename} (${mimeType})${att.url ? ` \u2014 ${att.url}` : ""}]`;
        parts.push({ type: "text", text: `
${description}` });
      }
    }
    if (this.inlineLinkRules && rawText) {
      const urls = extractUrls(rawText);
      for (const url of urls) {
        const rule = findInlineLinkRule(url, this.inlineLinkRules);
        if (!rule) continue;
        if (rule.forcedMimeType) {
          parts.push({ type: "file", data: url, mimeType: rule.forcedMimeType });
        } else {
          const contentType = await headContentType(url, this.logger);
          if (contentType && this.shouldInline(contentType)) {
            parts.push({ type: "file", data: url, mimeType: contentType });
          }
        }
      }
    }
    const streamInput = {
      id: crypto.randomUUID(),
      role: "user",
      createdAt: /* @__PURE__ */ new Date(),
      content: {
        format: 2,
        parts,
        metadata: {
          mastra: {
            channels: {
              [platform]: {
                messageId: message.id,
                author: {
                  userId: authorId,
                  userName: message.author.userName,
                  fullName: message.author.fullName,
                  mention: authorMention,
                  isBot: message.author.isBot
                }
              }
            }
          }
        }
      }
    };
    const adapterConfig = this.adapterConfigs[platform];
    const useCards = adapterConfig?.cards !== false;
    const stream = await agent.stream(streamInput, {
      requestContext,
      memory: {
        thread: mastraThread,
        resource: threadResourceId
      },
      // Without cards, we can't show approval buttons — auto-approve tools instead
      autoResumeSuspendedTools: useCards ? void 0 : true
    });
    await this.consumeAgentStream(stream, sdkThread, platform);
    await sdkThread.subscribe();
  }
  /**
   * Fetch recent messages from the platform thread to provide context.
   * Returns messages in chronological order (oldest first), excluding the
   * current triggering message.
   */
  async fetchThreadHistory(sdkThread, currentMessageId, maxMessages) {
    const messages = [];
    try {
      for await (const msg of sdkThread.messages) {
        if (msg.id === currentMessageId) continue;
        messages.push({
          id: msg.id,
          author: msg.author.fullName || msg.author.userName || "Unknown",
          userId: msg.author.userId,
          text: msg.text,
          isBot: msg.author.isBot === true
        });
        if (messages.length >= maxMessages) break;
      }
    } catch (err) {
      this.logger?.warn?.(`Failed to fetch thread history: ${err}`);
      return [];
    }
    return messages.reverse();
  }
  /**
   * Consume the agent stream and render all chunks to the chat platform.
   *
   * Iterates the outer `fullStream` to handle all chunk types:
   * - `text-delta`: Accumulates text and posts when flushed.
   * - `tool-call`: Posts a "Running…" card eagerly.
   * - `tool-result`: Edits the "Running…" card with the result.
   * - `tool-call-approval`: Edits the card to show Approve/Deny buttons.
   * - `step-finish` / `finish`: Flushes accumulated text.
   */
  async editOrPost(adapter, sdkThread, messageId, content) {
    if (messageId) {
      try {
        await adapter.editMessage(sdkThread.id, messageId, content);
      } catch {
        await sdkThread.post(content);
      }
    } else {
      await sdkThread.post(content);
    }
  }
  async consumeAgentStream(stream, sdkThread, platform, approvalContext) {
    const adapter = this.adapters[platform];
    const adapterConfig = this.adapterConfigs[platform];
    const useCards = adapterConfig?.cards !== false;
    let textBuffer = "";
    let typingStarted = false;
    const toolCalls = /* @__PURE__ */ new Map();
    if (approvalContext) {
      toolCalls.set(approvalContext.toolCallId, {
        displayName: "",
        argsSummary: "",
        startedAt: Date.now(),
        messageId: approvalContext.messageId
      });
    }
    let typingInterval;
    const ensureTyping = async () => {
      if (!typingStarted) {
        typingStarted = true;
        try {
          await sdkThread.startTyping();
        } catch (e) {
          this.logger?.debug("[CHANNEL] Typing indicator failed (best-effort)", { error: e });
        }
      }
    };
    const startTypingKeepalive = () => {
      if (typingInterval) return;
      typingInterval = setInterval(async () => {
        try {
          await sdkThread.startTyping();
        } catch {
        }
      }, 8e3);
    };
    const stopTypingKeepalive = () => {
      if (typingInterval) {
        clearInterval(typingInterval);
        typingInterval = void 0;
      }
    };
    const flushText = async () => {
      const cleanedText = textBuffer.replace(/[\u200B-\u200D\uFEFF]/g, "").trim();
      if (cleanedText) {
        await sdkThread.post(cleanedText);
        textBuffer = "";
      }
    };
    const typingFallbackTimer = setTimeout(async () => {
      if (!typingStarted) {
        await ensureTyping();
        startTypingKeepalive();
      }
    }, 3e3);
    try {
      for await (const chunk of stream.fullStream) {
        if (chunk.type === "text-delta") {
          if (chunk.payload.text) {
            await ensureTyping();
            startTypingKeepalive();
          }
          textBuffer += chunk.payload.text;
          continue;
        }
        if (chunk.type === "reasoning-delta") {
          await ensureTyping();
          startTypingKeepalive();
          continue;
        }
        if (chunk.type === "file") {
          await flushText();
          const { data, mimeType } = chunk.payload;
          this.logger?.debug("[CHANNEL] Received file chunk", {
            mimeType,
            dataType: typeof data,
            size: typeof data === "string" ? data.length : data?.byteLength
          });
          const ext = mimeType.split("/")[1]?.split(";")[0] || "bin";
          const filename = `generated.${ext}`;
          const binary = typeof data === "string" ? Buffer.from(data, "base64") : data instanceof Uint8Array ? Buffer.from(data) : data;
          try {
            await sdkThread.post({ markdown: " ", files: [{ data: binary, filename, mimeType }] });
          } catch (e) {
            this.logger?.debug("[CHANNEL] Failed to post file attachment", { error: e, mimeType, filename });
          }
          continue;
        }
        if (chunk.type === "step-finish" || chunk.type === "finish") {
          await flushText();
          continue;
        }
        if (chunk.type === "tool-call") {
          if (this.channelToolNames.has(chunk.payload.toolName)) continue;
          await ensureTyping();
          startTypingKeepalive();
          await flushText();
          const displayName = stripToolPrefix(chunk.payload.toolName);
          const rawArgs = typeof chunk.payload.args === "object" && chunk.payload.args != null ? chunk.payload.args : {};
          const argsSummary = formatArgsSummary(rawArgs);
          let messageId;
          if (!adapterConfig?.formatToolCall) {
            const sentMessage = await sdkThread.post(formatToolRunning(displayName, argsSummary, useCards));
            messageId = sentMessage?.id;
          }
          toolCalls.set(chunk.payload.toolCallId, {
            displayName,
            argsSummary,
            startedAt: Date.now(),
            messageId
          });
          continue;
        }
        if (chunk.type === "tool-result") {
          if (this.channelToolNames.has(chunk.payload.toolName)) continue;
          const tracked = toolCalls.get(chunk.payload.toolCallId);
          const displayName = tracked?.displayName || stripToolPrefix(chunk.payload.toolName);
          const argsSummary = tracked?.argsSummary || formatArgsSummary(chunk.payload.args ?? {});
          const resultText = formatResult(chunk.payload.result, chunk.payload.isError);
          const channelMsgId = tracked?.messageId;
          const durationMs = tracked?.startedAt != null ? Date.now() - tracked.startedAt : void 0;
          if (adapterConfig?.formatToolCall) {
            const custom = adapterConfig.formatToolCall({
              toolName: displayName,
              args: chunk.payload.args ?? {},
              result: chunk.payload.result,
              isError: chunk.payload.isError
            });
            if (custom != null) {
              await this.editOrPost(adapter, sdkThread, channelMsgId, custom);
            }
          } else {
            const resultMessage = formatToolResult(
              displayName,
              argsSummary,
              resultText,
              !!chunk.payload.isError,
              durationMs,
              useCards
            );
            await this.editOrPost(adapter, sdkThread, channelMsgId, resultMessage);
          }
          continue;
        }
        if (chunk.type === "tool-call-approval") {
          const { toolCallId, toolName, args: toolArgs } = chunk.payload;
          const tracked = toolCalls.get(toolCallId);
          const displayName = tracked?.displayName || stripToolPrefix(toolName);
          const argsSummary = tracked?.argsSummary || formatArgsSummary(toolArgs);
          const channelMsgId = tracked?.messageId;
          const approvalMessage = formatToolApproval(displayName, argsSummary, toolCallId, useCards);
          await this.editOrPost(adapter, sdkThread, channelMsgId, approvalMessage);
          continue;
        }
      }
    } finally {
      clearTimeout(typingFallbackTimer);
      stopTypingKeepalive();
    }
    if (stream.error) {
      const msg = stream.error.message;
      const display = msg.length > 500 ? msg.slice(0, 500) + "\u2026" : msg;
      this.log("error", `[${platform}] Stream completed with error`, { error: display });
      await sdkThread.post(`\u274C Error: ${display}`);
    }
  }
  /**
   * Resolves an existing Mastra thread for the given external IDs, or creates one.
   */
  async getOrCreateThread({
    externalThreadId,
    channelId,
    platform,
    resourceId,
    mastra
  }) {
    const storage = mastra.getStorage();
    if (!storage) {
      throw new Error("Storage is required for channel thread mapping. Configure storage in your Mastra instance.");
    }
    const memoryStore = await storage.getStore("memory");
    if (!memoryStore) {
      throw new Error(
        "Memory store is required for channel thread mapping. Configure storage in your Mastra instance."
      );
    }
    const metadata = {
      channel_platform: platform,
      channel_externalThreadId: externalThreadId,
      channel_externalChannelId: channelId
    };
    const { threads } = await memoryStore.listThreads({
      filter: { metadata },
      perPage: 1
    });
    if (threads.length > 0) {
      return threads[0];
    }
    return memoryStore.saveThread({
      thread: {
        id: crypto.randomUUID(),
        title: `${platform} conversation`,
        resourceId,
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date(),
        metadata
      }
    });
  }
  /**
   * Generate generic channel tools that resolve the adapter from request context.
   * Tool names are platform-agnostic (e.g. `send_message`, not `discord_send_message`).
   */
  makeChannelTools() {
    return {
      add_reaction: createTool({
        id: "add_reaction",
        description: "Add an emoji reaction to a message.",
        inputSchema: objectType({
          messageId: stringType().describe("The ID of the message to react to"),
          emoji: stringType().describe('The emoji to react with (e.g. "thumbsup")')
        }),
        execute: async ({ messageId, emoji }, context) => {
          const { adapter, threadId } = this.getAdapterFromContext(context);
          await adapter.addReaction(threadId, messageId, emoji);
          return { ok: true };
        }
      }),
      remove_reaction: createTool({
        id: "remove_reaction",
        description: "Remove an emoji reaction from a message.",
        inputSchema: objectType({
          messageId: stringType().describe("The ID of the message to remove reaction from"),
          emoji: stringType().describe("The emoji to remove")
        }),
        execute: async ({ messageId, emoji }, context) => {
          const { adapter, threadId } = this.getAdapterFromContext(context);
          await adapter.removeReaction(threadId, messageId, emoji);
          return { ok: true };
        }
      })
    };
  }
  /**
   * Persistent reconnection loop for Gateway-based adapters (e.g. Discord).
   */
  startGatewayLoop(name, startGateway) {
    const DURATION = 24 * 60 * 60 * 1e3;
    const RETRY_DELAY = 5e3;
    const reconnect = async () => {
      while (true) {
        try {
          let resolve2;
          let reject;
          const done = new Promise((res, rej) => {
            resolve2 = res;
            reject = rej;
          });
          await startGateway(
            {
              waitUntil: (p) => {
                void p.then(
                  () => resolve2(),
                  (err) => reject(err)
                );
              }
            },
            DURATION
          );
          await done;
          this.log("info", `[${name}] Gateway session ended, reconnecting...`);
        } catch (err) {
          this.log("error", `[${name}] Gateway error, retrying in ${RETRY_DELAY / 1e3}s`, err);
          await new Promise((r) => setTimeout(r, RETRY_DELAY));
        }
      }
    };
    void reconnect();
  }
  log(level, message, ...args) {
    if (!this.logger) return;
    if (level === "error") {
      this.logger.error(message, { args });
    } else if (level === "debug") {
      this.logger.debug(message, { args });
    } else {
      this.logger.info(message, { args });
    }
  }
};

// src/evals/hooks.ts
function runScorer({
  runId,
  scorerId,
  scorerObject,
  input,
  output,
  requestContext,
  entity,
  structuredOutput,
  source,
  entityType,
  threadId,
  resourceId,
  ...observabilityContext
}) {
  let shouldExecute = false;
  if (!scorerObject?.sampling || scorerObject?.sampling?.type === "none") {
    shouldExecute = true;
  }
  if (scorerObject?.sampling?.type) {
    switch (scorerObject?.sampling?.type) {
      case "ratio":
        shouldExecute = Math.random() < scorerObject?.sampling?.rate;
        break;
      default:
        shouldExecute = true;
    }
  }
  if (!shouldExecute) {
    return;
  }
  const payload = {
    scorer: {
      id: scorerObject.scorer?.id || scorerId,
      name: scorerObject.scorer?.name,
      description: scorerObject.scorer.description
    },
    input,
    output,
    requestContext: Object.fromEntries(requestContext.entries()),
    runId,
    source,
    entity,
    structuredOutput,
    entityType,
    threadId,
    resourceId,
    ...observabilityContext
  };
  executeHook("onScorerRun" /* ON_SCORER_RUN */, payload);
}
var TextPartSchema = object({
  type: literal("text"),
  text: string()
}).passthrough();
var ImagePartSchema = object({
  type: literal("image"),
  image: union([string(), _instanceof(URL), _instanceof(Uint8Array)]),
  mimeType: string().optional()
}).passthrough();
var FilePartSchema = object({
  type: literal("file"),
  data: union([string(), _instanceof(URL), _instanceof(Uint8Array)]),
  mimeType: string()
}).passthrough();
var ToolInvocationPartSchema = object({
  type: literal("tool-invocation"),
  toolInvocation: object({
    toolCallId: string(),
    toolName: string(),
    args: unknown(),
    state: _enum(["partial-call", "call", "result"]),
    result: unknown().optional()
  })
}).passthrough();
var ReasoningPartSchema = object({
  type: literal("reasoning"),
  reasoning: string(),
  details: array(
    object({
      type: _enum(["text", "redacted"]),
      text: string().optional(),
      data: string().optional()
    })
  )
}).passthrough();
var SourcePartSchema = object({
  type: literal("source"),
  source: object({
    sourceType: string(),
    id: string(),
    url: string().optional(),
    title: string().optional()
  })
}).passthrough();
var StepStartPartSchema = object({
  type: literal("step-start")
}).passthrough();
var DataPartSchema = object({
  type: string().refine((t) => t.startsWith("data-"), { message: 'Type must start with "data-"' }),
  id: string().optional(),
  data: unknown()
}).passthrough();
var MessagePartSchema = union([
  TextPartSchema,
  ImagePartSchema,
  FilePartSchema,
  ToolInvocationPartSchema,
  ReasoningPartSchema,
  SourcePartSchema,
  StepStartPartSchema,
  DataPartSchema
]);
object({
  /** Format version - 2 corresponds to AI SDK v4 UIMessage format */
  format: literal(2),
  /** Array of message parts (text, images, tool calls, etc.) */
  parts: array(MessagePartSchema),
  /** Legacy content field for backwards compatibility */
  content: string().optional(),
  /** Additional metadata */
  metadata: record(string(), unknown()).optional(),
  /** Provider-specific metadata */
  providerMetadata: record(string(), unknown()).optional()
});
var ProcessorMessageContentSchema = object({
  /** Format version - 2 corresponds to AI SDK v4 UIMessage format */
  format: literal(2),
  /** Array of message parts (text, images, tool calls, etc.) */
  parts: array(MessagePartSchema),
  /** Legacy content field for backwards compatibility */
  content: string().optional(),
  /** Additional metadata */
  metadata: record(string(), unknown()).optional(),
  /** Provider-specific metadata */
  providerMetadata: record(string(), unknown()).optional()
}).passthrough();
var ProcessorMessageSchema = object({
  /** Unique message identifier */
  id: string(),
  /** Message role */
  role: _enum(["user", "assistant", "system", "tool"]),
  /** When the message was created */
  createdAt: date(),
  /** Thread identifier for conversation grouping */
  threadId: string().optional(),
  /** Resource identifier */
  resourceId: string().optional(),
  /** Message type */
  type: string().optional(),
  /** Message content with parts */
  content: ProcessorMessageContentSchema
}).passthrough();
var messageListSchema = custom().describe("MessageList instance for managing message sources");
var messagesSchema = array(ProcessorMessageSchema);
var SystemMessageTextPartSchema = object({
  type: literal("text"),
  text: string()
}).passthrough();
object({
  role: literal("system"),
  content: union([string(), array(SystemMessageTextPartSchema)]),
  /** Optional experimental provider-specific extensions */
  experimental_providerMetadata: record(string(), unknown()).optional()
}).passthrough();
var CoreMessageSchema = object({
  role: _enum(["system", "user", "assistant", "tool"]),
  content: unknown()
}).passthrough();
var systemMessagesSchema = array(CoreMessageSchema);
var toolCallSchema = object({
  toolName: string(),
  toolCallId: string(),
  args: unknown()
});
var retryCountSchema = number().optional();
var ProcessorInputPhaseSchema = object({
  phase: literal("input"),
  messages: messagesSchema,
  messageList: messageListSchema,
  systemMessages: systemMessagesSchema.optional(),
  retryCount: retryCountSchema
});
var ProcessorInputStepPhaseSchema = object({
  phase: literal("inputStep"),
  messages: messagesSchema,
  messageList: messageListSchema,
  stepNumber: number().describe("The current step number (0-indexed)"),
  systemMessages: systemMessagesSchema.optional(),
  retryCount: retryCountSchema,
  messageId: string().optional().describe("The active assistant response message ID for this step"),
  rotateResponseMessageId: custom().optional().describe("Rotate the active assistant response message ID when supported by the caller"),
  // Model and tools configuration (can be modified by processors)
  model: custom().optional().describe("Current model for this step"),
  tools: custom().optional().describe("Current tools available for this step"),
  toolChoice: custom().optional().describe("Current tool choice setting"),
  activeTools: array(string()).optional().describe("Currently active tools"),
  providerOptions: custom().optional().describe("Provider-specific options"),
  modelSettings: custom().optional().describe("Model settings (temperature, etc.)"),
  structuredOutput: custom().optional().describe("Structured output configuration"),
  steps: custom().optional().describe("Results from previous steps")
});
var ProcessorOutputStreamPhaseSchema = object({
  phase: literal("outputStream"),
  part: unknown().nullable().describe("The current chunk being processed. Can be null to skip."),
  streamParts: array(unknown()).describe("All chunks seen so far"),
  state: record(string(), unknown()).describe("Mutable state object that persists across chunks"),
  messageList: messageListSchema.optional(),
  retryCount: retryCountSchema
});
var outputResultSchema = object({
  text: string().describe("The accumulated text from all steps"),
  usage: record(string(), unknown()).describe("Token usage (cumulative across all steps)"),
  finishReason: string().describe("Why the generation finished"),
  steps: array(unknown()).describe("All LLM step results")
});
var ProcessorOutputResultPhaseSchema = object({
  phase: literal("outputResult"),
  messages: messagesSchema,
  messageList: messageListSchema,
  retryCount: retryCountSchema,
  result: outputResultSchema.optional()
});
var ProcessorOutputStepPhaseSchema = object({
  phase: literal("outputStep"),
  messages: messagesSchema,
  messageList: messageListSchema,
  stepNumber: number().describe("The current step number (0-indexed)"),
  finishReason: string().optional().describe("The finish reason from the LLM (stop, tool-use, length, etc.)"),
  toolCalls: array(toolCallSchema).optional().describe("Tool calls made in this step (if any)"),
  text: string().optional().describe("Generated text from this step"),
  systemMessages: systemMessagesSchema.optional(),
  retryCount: retryCountSchema
});
var ProcessorStepInputSchema = discriminatedUnion("phase", [
  ProcessorInputPhaseSchema,
  ProcessorInputStepPhaseSchema,
  ProcessorOutputStreamPhaseSchema,
  ProcessorOutputResultPhaseSchema,
  ProcessorOutputStepPhaseSchema
]);
var ProcessorStepOutputSchema = object({
  // Phase field
  phase: _enum(["input", "inputStep", "outputStream", "outputResult", "outputStep"]),
  // Message-based fields (used by most phases)
  messages: messagesSchema.optional(),
  messageList: messageListSchema.optional(),
  systemMessages: systemMessagesSchema.optional(),
  // Step-based fields
  stepNumber: number().optional(),
  // Stream-based fields
  part: unknown().nullable().optional(),
  streamParts: array(unknown()).optional(),
  state: record(string(), unknown()).optional(),
  // Output result fields
  result: outputResultSchema.optional(),
  // Output step fields
  finishReason: string().optional(),
  toolCalls: array(toolCallSchema).optional(),
  text: string().optional(),
  // Retry count
  retryCount: number().optional(),
  // Model and tools configuration (for inputStep phase)
  model: custom().optional(),
  tools: custom().optional(),
  toolChoice: custom().optional(),
  activeTools: array(string()).optional(),
  providerOptions: custom().optional(),
  modelSettings: custom().optional(),
  structuredOutput: custom().optional(),
  steps: custom().optional(),
  messageId: string().optional(),
  rotateResponseMessageId: custom().optional()
});
var ProcessorStepSchema = ProcessorStepInputSchema;

// src/workflows/execution-engine.ts
var ExecutionEngine = class extends MastraBase {
  mastra;
  options;
  constructor({ mastra, options }) {
    super({ name: "ExecutionEngine", component: RegisteredLogger.WORKFLOW });
    this.mastra = mastra;
    this.options = options;
  }
  __registerMastra(mastra) {
    this.mastra = mastra;
    const logger = mastra?.getLogger();
    if (logger) {
      this.__setLogger(logger);
    }
  }
  getLogger() {
    return this.logger;
  }
  /**
   * Invokes the onFinish and onError lifecycle callbacks if they are defined.
   * Errors in callbacks are caught and logged, not propagated.
   * @param result The workflow result containing status, result, error, steps, tripwire info, and context
   */
  async invokeLifecycleCallbacks(result) {
    const { onFinish, onError } = this.options;
    const commonContext = {
      runId: result.runId,
      workflowId: result.workflowId,
      resourceId: result.resourceId,
      getInitData: () => result.input,
      mastra: this.mastra,
      requestContext: result.requestContext,
      logger: this.logger,
      state: result.state,
      stepExecutionPath: result.stepExecutionPath
    };
    if (onFinish) {
      try {
        await Promise.resolve(
          onFinish({
            status: result.status,
            result: result.result,
            error: result.error,
            steps: result.steps,
            tripwire: result.tripwire,
            ...commonContext
          })
        );
      } catch (err) {
        this.logger.error("Error in onFinish callback", { error: err });
      }
    }
    if (onError && (result.status === "failed" || result.status === "tripwire")) {
      try {
        await Promise.resolve(
          onError({
            status: result.status,
            error: result.error,
            steps: result.steps,
            tripwire: result.tripwire,
            ...commonContext
          })
        );
      } catch (err) {
        this.logger.error("Error in onError callback", { error: err });
      }
    }
  }
};

// src/workflows/step.ts
var getStepResult = (stepResults, step) => {
  let result;
  if (typeof step === "string") {
    result = stepResults[step];
  } else {
    if (!step?.id) {
      return null;
    }
    result = stepResults[step.id];
  }
  return result?.status === "success" ? result.output : null;
};
async function validateWithStandardSchema(schema, data) {
  const result = schema["~standard"].validate(data);
  const resolvedResult = result instanceof Promise ? await result : result;
  if ("issues" in resolvedResult && resolvedResult.issues) {
    return {
      success: false,
      issues: resolvedResult.issues.map((issue) => ({
        path: issue.path?.map(
          (p) => typeof p === "object" && "key" in p ? p.key : p
        ),
        message: issue.message
      }))
    };
  }
  return { success: true, data: resolvedResult.value };
}
async function validateStepInput({
  prevOutput,
  step,
  validateInputs
}) {
  let inputData = prevOutput;
  let validationError;
  const inputSchema = step.inputSchema;
  if (validateInputs && inputSchema) {
    const validatedInput = await validateWithStandardSchema(inputSchema, prevOutput);
    if (!validatedInput.success) {
      const errorMessages = validatedInput.issues.map((e) => `- ${e.path?.join(".")}: ${e.message}`).join("\n");
      validationError = new MastraError(
        {
          id: "WORKFLOW_STEP_INPUT_VALIDATION_FAILED",
          domain: "MASTRA_WORKFLOW" /* MASTRA_WORKFLOW */,
          category: "USER" /* USER */,
          text: "Step input validation failed: \n" + errorMessages
        },
        { issues: validatedInput.issues }
      );
    } else {
      const isEmptyData = isEmpty(validatedInput.data);
      inputData = isEmptyData ? prevOutput : validatedInput.data;
    }
  }
  return { inputData, validationError };
}
async function validateStepResumeData({ resumeData, step }) {
  if (!resumeData) {
    return { resumeData: void 0, validationError: void 0 };
  }
  let validationError;
  const resumeSchema = step.resumeSchema;
  if (resumeSchema) {
    const validatedResumeData = await validateWithStandardSchema(resumeSchema, resumeData);
    if (!validatedResumeData.success) {
      const errorMessages = validatedResumeData.issues.map((e) => `- ${e.path?.join(".")}: ${e.message}`).join("\n");
      validationError = new MastraError({
        id: "WORKFLOW_STEP_RESUME_DATA_VALIDATION_FAILED",
        domain: "MASTRA_WORKFLOW" /* MASTRA_WORKFLOW */,
        category: "USER" /* USER */,
        text: "Step resume data validation failed: \n" + errorMessages
      });
    } else {
      resumeData = validatedResumeData.data;
    }
  }
  return { resumeData, validationError };
}
async function validateStepSuspendData({
  suspendData,
  step,
  validateInputs
}) {
  if (!suspendData) {
    return { suspendData: void 0, validationError: void 0 };
  }
  let validationError;
  const suspendSchema = step.suspendSchema;
  if (suspendSchema && validateInputs) {
    const validatedSuspendData = await validateWithStandardSchema(suspendSchema, suspendData);
    if (!validatedSuspendData.success) {
      const errorMessages = validatedSuspendData.issues.map((e) => `- ${e.path?.join(".")}: ${e.message}`).join("\n");
      validationError = new MastraError({
        id: "WORKFLOW_STEP_SUSPEND_DATA_VALIDATION_FAILED",
        domain: "MASTRA_WORKFLOW" /* MASTRA_WORKFLOW */,
        category: "USER" /* USER */,
        text: "Step suspend data validation failed: \n" + errorMessages
      });
    } else {
      suspendData = validatedSuspendData.data;
    }
  }
  return { suspendData, validationError };
}
async function validateStepStateData({
  stateData,
  step,
  validateInputs
}) {
  if (!stateData) {
    return { stateData: void 0, validationError: void 0 };
  }
  let validationError;
  const stateSchema = step.stateSchema;
  if (stateSchema && validateInputs) {
    const validatedStateData = await validateWithStandardSchema(stateSchema, stateData);
    if (!validatedStateData.success) {
      const errorMessages = validatedStateData.issues.map((e) => `- ${e.path?.join(".")}: ${e.message}`).join("\n");
      validationError = new Error("Step state data validation failed: \n" + errorMessages);
    } else {
      stateData = validatedStateData.data;
    }
  }
  return { stateData, validationError };
}
async function validateStepRequestContext({
  requestContext,
  step,
  validateInputs
}) {
  let validationError;
  const requestContextSchema = step.requestContextSchema;
  if (requestContextSchema && validateInputs) {
    const contextValues = requestContext?.all ?? {};
    const validatedRequestContext = await validateWithStandardSchema(requestContextSchema, contextValues);
    if (!validatedRequestContext.success) {
      const errorMessages = validatedRequestContext.issues.map((e) => `- ${e.path?.join(".")}: ${e.message}`).join("\n");
      validationError = new MastraError({
        id: "WORKFLOW_STEP_REQUEST_CONTEXT_VALIDATION_FAILED",
        domain: "MASTRA_WORKFLOW" /* MASTRA_WORKFLOW */,
        category: "USER" /* USER */,
        text: `Step request context validation failed for step '${step.id}': 
` + errorMessages
      });
    }
  }
  return { validationError };
}
function getResumeLabelsByStepId(resumeLabels, stepId) {
  return Object.entries(resumeLabels).filter(([_, value]) => value.stepId === stepId).reduce(
    (acc, [key, value]) => {
      acc[key] = value;
      return acc;
    },
    {}
  );
}
var runCountDeprecationMessage = "Warning: 'runCount' is deprecated and will be removed on November 4th, 2025. Please use 'retryCount' instead.";
var shownWarnings = /* @__PURE__ */ new Set();
function createDeprecationProxy(params, {
  paramName,
  deprecationMessage,
  logger
}) {
  return new Proxy(params, {
    get(target, prop, receiver) {
      if (prop === paramName && !shownWarnings.has(paramName)) {
        shownWarnings.add(paramName);
        if (logger) {
          logger.warn("\x1B[33m%s\x1B[0m", deprecationMessage);
        } else {
          console.warn("\x1B[33m%s\x1B[0m", deprecationMessage);
        }
      }
      return Reflect.get(target, prop, receiver);
    }
  });
}
var getStepIds = (entry) => {
  if (entry.type === "step" || entry.type === "foreach" || entry.type === "loop") {
    return [entry.step.id];
  }
  if (entry.type === "parallel" || entry.type === "conditional") {
    return entry.steps.map((s) => s.step.id);
  }
  if (entry.type === "sleep" || entry.type === "sleepUntil") {
    return [entry.id];
  }
  return [];
};
var createTimeTravelExecutionParams = (params) => {
  const { steps, inputData, resumeData, context, nestedStepsContext, snapshot, initialState, graph, perStep } = params;
  const firstStepId = steps[0];
  let executionPath = [];
  const stepResults = {};
  const snapshotContext = snapshot.context;
  for (const [index, entry] of graph.steps.entries()) {
    const currentExecPathLength = executionPath.length;
    if (currentExecPathLength > 0 && !resumeData) {
      break;
    }
    const stepIds = getStepIds(entry);
    if (stepIds.includes(firstStepId)) {
      const innerExecutionPath = stepIds?.length > 1 ? [stepIds?.findIndex((s) => s === firstStepId)] : [];
      executionPath = [index, ...innerExecutionPath];
    }
    const prevStep = graph.steps[index - 1];
    let stepPayload = void 0;
    if (prevStep) {
      const prevStepIds = getStepIds(prevStep);
      if (prevStepIds.length > 0) {
        if (prevStepIds.length === 1) {
          stepPayload = stepResults?.[prevStepIds[0]]?.output ?? {};
        } else {
          stepPayload = prevStepIds.reduce(
            (acc, stepId) => {
              acc[stepId] = stepResults?.[stepId]?.output ?? {};
              return acc;
            },
            {}
          );
        }
      }
    }
    if (index === 0 && stepIds.includes(firstStepId)) {
      stepResults.input = context?.[firstStepId]?.payload ?? inputData ?? snapshotContext?.input;
    } else if (index === 0) {
      stepResults.input = stepIds?.reduce((acc, stepId) => {
        if (acc) return acc;
        return context?.[stepId]?.payload ?? snapshotContext?.[stepId]?.payload;
      }, null) ?? snapshotContext?.input ?? {};
    }
    let stepOutput = void 0;
    const nextStep = graph.steps[index + 1];
    if (nextStep) {
      const nextStepIds = getStepIds(nextStep);
      if (nextStepIds.length > 0 && inputData && nextStepIds.includes(firstStepId) && steps.length === 1) {
        stepOutput = inputData;
      }
    }
    stepIds.forEach((stepId) => {
      let result;
      const stepContext = context?.[stepId] ?? snapshotContext[stepId];
      const defaultStepStatus = steps?.includes(stepId) ? "running" : "success";
      const status = ["failed", "canceled"].includes(stepContext?.status) ? defaultStepStatus : stepContext?.status ?? defaultStepStatus;
      const isCompleteStatus = ["success", "failed", "canceled"].includes(status);
      result = {
        status,
        payload: context?.[stepId]?.payload ?? stepPayload ?? snapshotContext[stepId]?.payload ?? {},
        output: isCompleteStatus ? context?.[stepId]?.output ?? stepOutput ?? snapshotContext[stepId]?.output ?? {} : void 0,
        resumePayload: stepContext?.resumePayload,
        suspendPayload: stepContext?.suspendPayload,
        suspendOutput: stepContext?.suspendOutput,
        startedAt: stepContext?.startedAt ?? Date.now(),
        endedAt: isCompleteStatus ? stepContext?.endedAt ?? Date.now() : void 0,
        suspendedAt: stepContext?.suspendedAt,
        resumedAt: stepContext?.resumedAt
      };
      const execPathLengthToUse = perStep ? executionPath.length : currentExecPathLength;
      if (execPathLengthToUse > 0 && !steps?.includes(stepId) && !context?.[stepId] && (!snapshotContext[stepId] || snapshotContext[stepId] && snapshotContext[stepId].status !== "suspended")) {
        result = void 0;
      }
      if (result) {
        const formattedResult = removeUndefinedValues(result);
        stepResults[stepId] = formattedResult;
      }
    });
  }
  if (!executionPath.length) {
    throw new Error(
      `Time travel target step not found in execution graph: '${steps?.join(".")}'. Verify the step id/path.`
    );
  }
  const timeTravelData = {
    inputData,
    executionPath,
    steps,
    stepResults,
    nestedStepResults: nestedStepsContext,
    state: initialState ?? snapshot.value ?? {},
    resumeData,
    stepExecutionPath: snapshot?.stepExecutionPath
  };
  return timeTravelData;
};
function hydrateSerializedStepErrors(steps) {
  if (steps) {
    for (const step of Object.values(steps)) {
      if (step.status === "failed" && "error" in step && step.error) {
        step.error = getErrorFromUnknown(step.error, { serializeStack: false });
      }
    }
  }
  return steps;
}
function cleanSingleResult(result) {
  const { __state: _state, metadata, ...rest } = result;
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
    const { nestedRunId: _nestedRunId, ...userMetadata } = metadata;
    if (Object.keys(userMetadata).length > 0) {
      return { ...rest, metadata: userMetadata };
    }
  }
  return rest;
}
function cleanStepResult(stepResult) {
  if (stepResult === null || stepResult === void 0) {
    return stepResult;
  }
  if (typeof stepResult !== "object") {
    return stepResult;
  }
  if (Array.isArray(stepResult)) {
    return stepResult.map((item) => {
      if (item && typeof item === "object" && !Array.isArray(item)) {
        return cleanSingleResult(item);
      }
      return item;
    });
  }
  const result = stepResult;
  const cleaned = cleanSingleResult(result);
  if (Array.isArray(cleaned.output)) {
    cleaned.output = cleaned.output.map((item) => {
      if (item && typeof item === "object" && !Array.isArray(item)) {
        return cleanSingleResult(item);
      }
      return item;
    });
  }
  return cleaned;
}

// src/workflows/handlers/control-flow.ts
async function executeParallel(engine, params) {
  const {
    workflowId,
    runId,
    resourceId,
    entry,
    prevStep,
    serializedStepGraph,
    stepResults,
    resume,
    restart,
    timeTravel,
    executionContext,
    pubsub,
    abortController,
    requestContext,
    outputWriter,
    disableScorers,
    perStep,
    ...rest
  } = params;
  const observabilityContext = resolveObservabilityContext(rest);
  const parallelSpan = await engine.createChildSpan({
    parentSpan: observabilityContext.tracingContext.currentSpan,
    operationId: `workflow.${workflowId}.run.${runId}.parallel.${executionContext.executionPath.join("-")}.span.start`,
    options: {
      type: "workflow_parallel" /* WORKFLOW_PARALLEL */,
      name: `parallel: '${entry.steps.length} branches'`,
      input: engine.getStepOutput(stepResults, prevStep),
      attributes: {
        branchCount: entry.steps.length,
        parallelSteps: entry.steps.map((s) => s.type === "step" ? s.step.id : `control-${s.type}`)
      },
      tracingPolicy: engine.options?.tracingPolicy
    },
    executionContext
  });
  const prevOutput = engine.getStepOutput(stepResults, prevStep);
  for (const [stepIndex, step] of entry.steps.entries()) {
    let makeStepRunning = true;
    if (restart) {
      makeStepRunning = !!restart.activeStepsPath[step.step.id];
    }
    if (timeTravel && timeTravel.executionPath.length > 0) {
      makeStepRunning = timeTravel.steps[0] === step.step.id;
    }
    if (!makeStepRunning) {
      break;
    }
    const startTime = resume?.steps[0] === step.step.id ? void 0 : Date.now();
    const resumeTime = resume?.steps[0] === step.step.id ? Date.now() : void 0;
    stepResults[step.step.id] = {
      ...stepResults[step.step.id],
      status: "running",
      ...resumeTime ? { resumePayload: resume?.resumePayload } : { payload: prevOutput },
      ...startTime ? { startedAt: startTime } : {},
      ...resumeTime ? { resumedAt: resumeTime } : {}
    };
    executionContext.activeStepsPath[step.step.id] = [...executionContext.executionPath, stepIndex];
    if (perStep) {
      break;
    }
  }
  if (timeTravel && timeTravel.executionPath.length > 0) {
    timeTravel.executionPath.shift();
  }
  let execResults;
  const results = await Promise.all(
    entry.steps.map(async (step, i) => {
      const currStepResult = stepResults[step.step.id];
      if (currStepResult && currStepResult.status !== "running") {
        return currStepResult;
      }
      if (!currStepResult && (perStep || timeTravel)) {
        return {};
      }
      const stepExecResult = await engine.executeStep({
        workflowId,
        runId,
        resourceId,
        step: step.step,
        prevOutput,
        stepResults,
        serializedStepGraph,
        restart,
        timeTravel,
        resume,
        executionContext: {
          activeStepsPath: executionContext.activeStepsPath,
          workflowId,
          runId,
          executionPath: [...executionContext.executionPath, i],
          stepExecutionPath: executionContext.stepExecutionPath,
          suspendedPaths: executionContext.suspendedPaths,
          resumeLabels: executionContext.resumeLabels,
          retryConfig: executionContext.retryConfig,
          state: executionContext.state,
          tracingIds: executionContext.tracingIds
        },
        ...createObservabilityContext({ currentSpan: parallelSpan }),
        pubsub,
        abortController,
        requestContext,
        outputWriter,
        disableScorers,
        perStep
      });
      engine.applyMutableContext(executionContext, stepExecResult.mutableContext);
      Object.assign(stepResults, stepExecResult.stepResults);
      return stepExecResult.result;
    })
  );
  const hasFailed = results.find((result) => result.status === "failed");
  const hasSuspended = results.find((result) => result.status === "suspended");
  if (hasFailed) {
    execResults = {
      status: "failed",
      error: hasFailed.error,
      tripwire: hasFailed.tripwire
    };
  } else if (hasSuspended) {
    execResults = {
      status: "suspended",
      suspendPayload: hasSuspended.suspendPayload,
      ...hasSuspended.suspendOutput ? { suspendOutput: hasSuspended.suspendOutput } : {}
    };
  } else if (abortController?.signal?.aborted) {
    execResults = { status: "canceled" };
  } else {
    execResults = {
      status: "success",
      output: results.reduce((acc, result, index) => {
        if (result.status === "success") {
          acc[entry.steps[index].step.id] = result.output;
        }
        return acc;
      }, {})
    };
  }
  if (execResults.status === "failed") {
    await engine.errorChildSpan({
      span: parallelSpan,
      operationId: `workflow.${workflowId}.run.${runId}.parallel.${executionContext.executionPath.join("-")}.span.error`,
      errorOptions: { error: execResults.error }
    });
  } else {
    await engine.endChildSpan({
      span: parallelSpan,
      operationId: `workflow.${workflowId}.run.${runId}.parallel.${executionContext.executionPath.join("-")}.span.end`,
      endOptions: { output: execResults.output || execResults }
    });
  }
  return execResults;
}
async function executeConditional(engine, params) {
  const {
    workflowId,
    runId,
    resourceId,
    entry,
    prevOutput,
    serializedStepGraph,
    stepResults,
    resume,
    restart,
    timeTravel,
    executionContext,
    pubsub,
    abortController,
    requestContext,
    outputWriter,
    disableScorers,
    perStep,
    ...rest
  } = params;
  const observabilityContext = resolveObservabilityContext(rest);
  const conditionalSpan = await engine.createChildSpan({
    parentSpan: observabilityContext.tracingContext.currentSpan,
    operationId: `workflow.${workflowId}.run.${runId}.conditional.${executionContext.executionPath.join("-")}.span.start`,
    options: {
      type: "workflow_conditional" /* WORKFLOW_CONDITIONAL */,
      name: `conditional: '${entry.conditions.length} conditions'`,
      input: prevOutput,
      attributes: {
        conditionCount: entry.conditions.length
      },
      tracingPolicy: engine.options?.tracingPolicy
    },
    executionContext
  });
  let execResults;
  const truthyIndexes = (await Promise.all(
    entry.conditions.map(async (cond, index) => {
      const evalSpan = await engine.createChildSpan({
        parentSpan: conditionalSpan,
        operationId: `workflow.${workflowId}.run.${runId}.conditional.${executionContext.executionPath.join("-")}.eval.${index}.span.start`,
        options: {
          type: "workflow_conditional_eval" /* WORKFLOW_CONDITIONAL_EVAL */,
          name: `condition '${index}'`,
          input: prevOutput,
          attributes: {
            conditionIndex: index
          },
          tracingPolicy: engine.options?.tracingPolicy
        },
        executionContext
      });
      const operationId = `workflow.${workflowId}.conditional.${index}`;
      const context = createDeprecationProxy(
        {
          runId,
          workflowId,
          mastra: engine.mastra,
          requestContext,
          inputData: prevOutput,
          state: executionContext.state,
          retryCount: -1,
          ...createObservabilityContext({ currentSpan: evalSpan }),
          getInitData: () => stepResults?.input,
          getStepResult: getStepResult.bind(null, stepResults),
          bail: (() => {
          }),
          abort: () => {
            abortController?.abort();
          },
          [PUBSUB_SYMBOL]: pubsub,
          [STREAM_FORMAT_SYMBOL]: executionContext.format,
          engine: engine.getEngineContext(),
          abortSignal: abortController?.signal,
          writer: new ToolStream(
            {
              prefix: "workflow-step",
              callId: randomUUID(),
              name: "conditional",
              runId
            },
            outputWriter
          )
        },
        {
          paramName: "runCount",
          deprecationMessage: runCountDeprecationMessage,
          logger: engine.getLogger()
        }
      );
      try {
        const result = await engine.evaluateCondition(cond, index, context, operationId);
        await engine.endChildSpan({
          span: evalSpan,
          operationId: `workflow.${workflowId}.run.${runId}.conditional.${executionContext.executionPath.join("-")}.eval.${index}.span.end`,
          endOptions: {
            output: result !== null,
            attributes: {
              result: result !== null
            }
          }
        });
        return result;
      } catch (e) {
        const errorInstance = getErrorFromUnknown(e, { serializeStack: false });
        const mastraError = new MastraError(
          {
            id: "WORKFLOW_CONDITION_EVALUATION_FAILED",
            domain: "MASTRA_WORKFLOW" /* MASTRA_WORKFLOW */,
            category: "USER" /* USER */,
            details: { workflowId, runId }
          },
          errorInstance
        );
        engine.getLogger()?.trackException(mastraError);
        engine.getLogger()?.error("Error evaluating condition: " + errorInstance.stack);
        await engine.errorChildSpan({
          span: evalSpan,
          operationId: `workflow.${workflowId}.run.${runId}.conditional.${executionContext.executionPath.join("-")}.eval.${index}.span.error`,
          errorOptions: {
            error: mastraError,
            attributes: {
              result: false
            }
          }
        });
        return null;
      }
    })
  )).filter((index) => index !== null);
  let stepsToRun = entry.steps.filter((_, index) => truthyIndexes.includes(index));
  if (perStep || timeTravel && timeTravel.executionPath.length > 0) {
    const possibleStepsToRun = stepsToRun.filter((s) => {
      const currStepResult = stepResults[s.step.id];
      if (timeTravel && timeTravel.executionPath.length > 0) {
        return timeTravel.steps[0] === s.step.id;
      }
      return !currStepResult;
    });
    const possibleStepToRun = possibleStepsToRun?.[0];
    stepsToRun = possibleStepToRun ? [possibleStepToRun] : stepsToRun;
  }
  conditionalSpan?.update({
    attributes: {
      truthyIndexes,
      selectedSteps: stepsToRun.map((s) => s.type === "step" ? s.step.id : `control-${s.type}`)
    }
  });
  const results = await Promise.all(
    stepsToRun.map(async (step) => {
      const currStepResult = stepResults[step.step.id];
      const isRestartStep = restart ? !!restart.activeStepsPath[step.step.id] : void 0;
      if (currStepResult && timeTravel && timeTravel.executionPath.length > 0) {
        if (timeTravel.steps[0] !== step.step.id) {
          return currStepResult;
        }
      }
      if (currStepResult && ["success", "failed"].includes(currStepResult.status) && isRestartStep === void 0) {
        return currStepResult;
      }
      const stepExecResult = await engine.executeStep({
        workflowId,
        runId,
        resourceId,
        step: step.step,
        prevOutput,
        stepResults,
        serializedStepGraph,
        resume,
        restart,
        timeTravel,
        executionContext: {
          workflowId,
          runId,
          executionPath: [...executionContext.executionPath, entry.steps.indexOf(step)],
          stepExecutionPath: executionContext.stepExecutionPath,
          activeStepsPath: executionContext.activeStepsPath,
          suspendedPaths: executionContext.suspendedPaths,
          resumeLabels: executionContext.resumeLabels,
          retryConfig: executionContext.retryConfig,
          state: executionContext.state,
          tracingIds: executionContext.tracingIds
        },
        ...createObservabilityContext({ currentSpan: conditionalSpan }),
        pubsub,
        abortController,
        requestContext,
        outputWriter,
        disableScorers,
        perStep
      });
      engine.applyMutableContext(executionContext, stepExecResult.mutableContext);
      Object.assign(stepResults, stepExecResult.stepResults);
      return stepExecResult.result;
    })
  );
  const hasFailed = results.find((result) => result.status === "failed");
  const hasSuspended = results.find((result) => result.status === "suspended");
  if (hasFailed) {
    execResults = {
      status: "failed",
      error: hasFailed.error,
      tripwire: hasFailed.tripwire
    };
  } else if (hasSuspended) {
    execResults = {
      status: "suspended",
      suspendPayload: hasSuspended.suspendPayload,
      ...hasSuspended.suspendOutput ? { suspendOutput: hasSuspended.suspendOutput } : {},
      suspendedAt: hasSuspended.suspendedAt
    };
  } else if (abortController?.signal?.aborted) {
    execResults = { status: "canceled" };
  } else {
    execResults = {
      status: "success",
      output: results.reduce((acc, result, index) => {
        if (result.status === "success") {
          acc[stepsToRun[index].step.id] = result.output;
        }
        return acc;
      }, {})
    };
  }
  if (execResults.status === "failed") {
    await engine.errorChildSpan({
      span: conditionalSpan,
      operationId: `workflow.${workflowId}.run.${runId}.conditional.${executionContext.executionPath.join("-")}.span.error`,
      errorOptions: { error: execResults.error }
    });
  } else {
    await engine.endChildSpan({
      span: conditionalSpan,
      operationId: `workflow.${workflowId}.run.${runId}.conditional.${executionContext.executionPath.join("-")}.span.end`,
      endOptions: { output: execResults.output || execResults }
    });
  }
  return execResults;
}
async function executeLoop(engine, params) {
  const {
    workflowId,
    runId,
    resourceId,
    entry,
    prevOutput,
    stepResults,
    resume,
    restart,
    timeTravel,
    executionContext,
    pubsub,
    abortController,
    requestContext,
    outputWriter,
    disableScorers,
    serializedStepGraph,
    perStep,
    ...rest
  } = params;
  const observabilityContext = resolveObservabilityContext(rest);
  const { step, condition } = entry;
  const loopSpan = await engine.createChildSpan({
    parentSpan: observabilityContext.tracingContext.currentSpan,
    operationId: `workflow.${workflowId}.run.${runId}.loop.${executionContext.executionPath.join("-")}.span.start`,
    options: {
      type: "workflow_loop" /* WORKFLOW_LOOP */,
      name: `loop: '${entry.loopType}'`,
      input: prevOutput,
      attributes: {
        loopType: entry.loopType
      },
      tracingPolicy: engine.options?.tracingPolicy
    },
    executionContext
  });
  let isTrue = true;
  const prevIterationCount = stepResults[step.id]?.metadata?.iterationCount;
  let iteration = prevIterationCount ? prevIterationCount - 1 : 0;
  const prevPayload = stepResults[step.id]?.payload;
  let result = { status: "success", output: prevPayload ?? prevOutput };
  let currentResume = resume;
  let currentRestart = restart;
  let currentTimeTravel = timeTravel;
  do {
    const stepExecResult = await engine.executeStep({
      workflowId,
      runId,
      resourceId,
      step,
      stepResults,
      executionContext,
      restart: currentRestart,
      resume: currentResume,
      timeTravel: currentTimeTravel,
      prevOutput: result.output,
      ...createObservabilityContext({ currentSpan: loopSpan }),
      pubsub,
      abortController,
      requestContext,
      outputWriter,
      disableScorers,
      serializedStepGraph,
      iterationCount: iteration + 1,
      perStep
    });
    engine.applyMutableContext(executionContext, stepExecResult.mutableContext);
    Object.assign(stepResults, stepExecResult.stepResults);
    result = stepExecResult.result;
    currentRestart = void 0;
    currentTimeTravel = void 0;
    if (currentResume && result.status !== "suspended") {
      currentResume = void 0;
    }
    if (result.status !== "success") {
      await engine.endChildSpan({
        span: loopSpan,
        operationId: `workflow.${workflowId}.run.${runId}.loop.${executionContext.executionPath.join("-")}.span.end.early`,
        endOptions: {
          attributes: {
            totalIterations: iteration
          }
        }
      });
      return result;
    }
    const evalSpan = await engine.createChildSpan({
      parentSpan: loopSpan,
      operationId: `workflow.${workflowId}.run.${runId}.loop.${executionContext.executionPath.join("-")}.eval.${iteration}.span.start`,
      options: {
        type: "workflow_conditional_eval" /* WORKFLOW_CONDITIONAL_EVAL */,
        name: `condition: '${entry.loopType}'`,
        input: selectFields(result.output, ["stepResult", "output.text", "output.object", "messages"]),
        attributes: {
          conditionIndex: iteration
        },
        tracingPolicy: engine.options?.tracingPolicy
      },
      executionContext
    });
    isTrue = await condition(
      createDeprecationProxy(
        {
          workflowId,
          runId,
          mastra: engine.mastra,
          requestContext,
          inputData: result.output,
          state: executionContext.state,
          retryCount: -1,
          ...createObservabilityContext({ currentSpan: evalSpan }),
          iterationCount: iteration + 1,
          getInitData: () => stepResults?.input,
          getStepResult: getStepResult.bind(null, stepResults),
          bail: (() => {
          }),
          abort: () => {
            abortController?.abort();
          },
          [PUBSUB_SYMBOL]: pubsub,
          [STREAM_FORMAT_SYMBOL]: executionContext.format,
          engine: engine.getEngineContext(),
          abortSignal: abortController?.signal,
          writer: new ToolStream(
            {
              prefix: "workflow-step",
              callId: randomUUID(),
              name: "loop",
              runId
            },
            outputWriter
          )
        },
        {
          paramName: "runCount",
          deprecationMessage: runCountDeprecationMessage,
          logger: engine.getLogger()
        }
      )
    );
    await engine.endChildSpan({
      span: evalSpan,
      operationId: `workflow.${workflowId}.run.${runId}.loop.${executionContext.executionPath.join("-")}.eval.${iteration}.span.end`,
      endOptions: {
        output: isTrue
      }
    });
    iteration++;
  } while (entry.loopType === "dowhile" ? isTrue : !isTrue);
  await engine.endChildSpan({
    span: loopSpan,
    operationId: `workflow.${workflowId}.run.${runId}.loop.${executionContext.executionPath.join("-")}.span.end`,
    endOptions: {
      output: result.output,
      attributes: {
        totalIterations: iteration
      }
    }
  });
  return result;
}
async function executeForeach(engine, params) {
  const {
    workflowId,
    runId,
    resourceId,
    entry,
    prevOutput,
    stepResults,
    restart,
    resume,
    timeTravel,
    executionContext,
    pubsub,
    abortController,
    requestContext,
    outputWriter,
    disableScorers,
    serializedStepGraph,
    perStep,
    ...rest
  } = params;
  const observabilityContext = resolveObservabilityContext(rest);
  const { step, opts } = entry;
  const results = [];
  const concurrency = opts.concurrency;
  const startTime = resume?.steps[0] === step.id ? void 0 : Date.now();
  const resumeTime = resume?.steps[0] === step.id ? Date.now() : void 0;
  const stepInfo = {
    ...stepResults[step.id],
    ...resume?.steps[0] === step.id ? { resumePayload: resume?.resumePayload } : { payload: prevOutput },
    ...startTime ? { startedAt: startTime } : {},
    ...resumeTime ? { resumedAt: resumeTime } : {}
  };
  const loopSpan = await engine.createChildSpan({
    parentSpan: observabilityContext.tracingContext.currentSpan,
    operationId: `workflow.${workflowId}.run.${runId}.foreach.${executionContext.executionPath.join("-")}.span.start`,
    options: {
      type: "workflow_loop" /* WORKFLOW_LOOP */,
      name: `loop: 'foreach'`,
      input: prevOutput,
      attributes: {
        loopType: "foreach",
        concurrency
      },
      tracingPolicy: engine.options?.tracingPolicy
    },
    executionContext
  });
  await pubsub.publish(`workflow.events.v2.${runId}`, {
    type: "watch",
    runId,
    data: {
      type: "workflow-step-start",
      payload: {
        id: step.id,
        ...stepInfo,
        status: "running"
      }
    }
  });
  const prevPayload = stepResults[step.id];
  const foreachIndexObj = {};
  const resumeIndex = prevPayload?.status === "suspended" ? prevPayload?.suspendPayload?.__workflow_meta?.foreachIndex || 0 : 0;
  const prevForeachOutput = prevPayload?.suspendPayload?.__workflow_meta?.foreachOutput || [];
  const prevResumeLabels = prevPayload?.suspendPayload?.__workflow_meta?.resumeLabels || {};
  const resumeLabels = getResumeLabelsByStepId(prevResumeLabels, step.id);
  const totalCount = prevOutput.length;
  let completedCount = 0;
  for (let i = 0; i < prevOutput.length; i += concurrency) {
    const items = prevOutput.slice(i, i + concurrency);
    const itemsResults = await Promise.all(
      items.map(async (item, j) => {
        const k = i + j;
        const prevItemResult = prevForeachOutput[k];
        if (prevItemResult?.status === "success" || prevItemResult?.status === "suspended" && resume?.forEachIndex !== k && resume?.forEachIndex !== void 0) {
          return prevItemResult;
        }
        let resumeToUse = void 0;
        if (resume?.forEachIndex !== void 0) {
          resumeToUse = resume.forEachIndex === k ? resume : void 0;
        } else {
          const isIndexSuspended = prevItemResult?.status === "suspended" || resumeIndex === k;
          if (isIndexSuspended) {
            resumeToUse = resume;
          }
        }
        const stepExecResult = await engine.executeStep({
          workflowId,
          runId,
          resourceId,
          step,
          stepResults,
          restart,
          timeTravel,
          executionContext: { ...executionContext, foreachIndex: k },
          resume: resumeToUse,
          prevOutput: item,
          ...createObservabilityContext({ currentSpan: loopSpan }),
          pubsub,
          abortController,
          requestContext,
          skipEmits: true,
          outputWriter,
          disableScorers,
          serializedStepGraph,
          perStep
        });
        engine.applyMutableContext(executionContext, stepExecResult.mutableContext);
        Object.assign(stepResults, stepExecResult.stepResults);
        return stepExecResult.result;
      })
    );
    for (const [resultIndex, result] of itemsResults.entries()) {
      if (result.status !== "success") {
        const { status, error, suspendPayload, suspendedAt, endedAt, output } = result;
        const execResults = { status, error, suspendPayload, suspendedAt, endedAt, output };
        if (execResults.status === "suspended") {
          foreachIndexObj[i + resultIndex] = execResults;
          await pubsub.publish(`workflow.events.v2.${runId}`, {
            type: "watch",
            runId,
            data: {
              type: "workflow-step-progress",
              payload: {
                id: step.id,
                completedCount,
                totalCount,
                currentIndex: i + resultIndex,
                iterationStatus: "suspended"
              }
            }
          });
        } else {
          completedCount++;
          await pubsub.publish(`workflow.events.v2.${runId}`, {
            type: "watch",
            runId,
            data: {
              type: "workflow-step-progress",
              payload: {
                id: step.id,
                completedCount,
                totalCount,
                currentIndex: i + resultIndex,
                iterationStatus: "failed"
              }
            }
          });
          await pubsub.publish(`workflow.events.v2.${runId}`, {
            type: "watch",
            runId,
            data: {
              type: "workflow-step-result",
              payload: {
                id: step.id,
                ...execResults
              }
            }
          });
          await pubsub.publish(`workflow.events.v2.${runId}`, {
            type: "watch",
            runId,
            data: {
              type: "workflow-step-finish",
              payload: {
                id: step.id,
                metadata: {}
              }
            }
          });
          return result;
        }
      } else {
        completedCount++;
        await pubsub.publish(`workflow.events.v2.${runId}`, {
          type: "watch",
          runId,
          data: {
            type: "workflow-step-progress",
            payload: {
              id: step.id,
              completedCount,
              totalCount,
              currentIndex: i + resultIndex,
              iterationStatus: "success",
              iterationOutput: result?.output
            }
          }
        });
        const indexResumeLabel = Object.keys(resumeLabels).find(
          (key) => resumeLabels[key]?.foreachIndex === i + resultIndex
        );
        delete resumeLabels[indexResumeLabel];
      }
      if (result?.output) {
        results[i + resultIndex] = result?.output;
      }
      prevForeachOutput[i + resultIndex] = { ...result, suspendPayload: {} };
    }
    if (Object.keys(foreachIndexObj).length > 0) {
      const suspendedIndices = Object.keys(foreachIndexObj).map(Number);
      const foreachIndex = suspendedIndices[0];
      await pubsub.publish(`workflow.events.v2.${runId}`, {
        type: "watch",
        runId,
        data: {
          type: "workflow-step-suspended",
          payload: {
            id: step.id,
            ...foreachIndexObj[foreachIndex]
          }
        }
      });
      executionContext.suspendedPaths[step.id] = executionContext.executionPath;
      executionContext.resumeLabels = { ...resumeLabels, ...executionContext.resumeLabels };
      return {
        ...stepInfo,
        suspendedAt: Date.now(),
        status: "suspended",
        ...foreachIndexObj[foreachIndex].suspendOutput ? { suspendOutput: foreachIndexObj[foreachIndex].suspendOutput } : {},
        suspendPayload: {
          ...foreachIndexObj[foreachIndex].suspendPayload,
          __workflow_meta: {
            ...foreachIndexObj[foreachIndex].suspendPayload?.__workflow_meta,
            foreachIndex,
            foreachOutput: prevForeachOutput,
            resumeLabels: executionContext.resumeLabels
          }
        }
      };
    }
  }
  await pubsub.publish(`workflow.events.v2.${runId}`, {
    type: "watch",
    runId,
    data: {
      type: "workflow-step-result",
      payload: {
        id: step.id,
        status: "success",
        output: results,
        endedAt: Date.now()
      }
    }
  });
  await pubsub.publish(`workflow.events.v2.${runId}`, {
    type: "watch",
    runId,
    data: {
      type: "workflow-step-finish",
      payload: {
        id: step.id,
        metadata: {}
      }
    }
  });
  await engine.endChildSpan({
    span: loopSpan,
    operationId: `workflow.${workflowId}.run.${runId}.foreach.${executionContext.executionPath.join("-")}.span.end`,
    endOptions: {
      output: results
    }
  });
  return {
    ...stepInfo,
    status: "success",
    output: results,
    endedAt: Date.now()
  };
}

// src/workflows/handlers/entry.ts
function buildResumedBlockResult(entrySteps, stepResults, executionContext, opts) {
  const stepsToCheck = opts?.onlyExecutedSteps ? entrySteps.filter((s) => s.type === "step" && stepResults[s.step.id] !== void 0) : entrySteps;
  const allComplete = stepsToCheck.every((s) => {
    if (s.type === "step") {
      const r = stepResults[s.step.id];
      return r && r.status === "success";
    }
    return true;
  });
  let result;
  if (allComplete) {
    result = {
      status: "success",
      output: entrySteps.reduce((acc, s) => {
        if (s.type === "step") {
          const r = stepResults[s.step.id];
          if (r && r.status === "success") {
            acc[s.step.id] = r.output;
          }
        }
        return acc;
      }, {})
    };
  } else {
    const stillSuspended = entrySteps.find((s) => s.type === "step" && stepResults[s.step.id]?.status === "suspended");
    const suspendData = stillSuspended && stillSuspended.type === "step" ? stepResults[stillSuspended.step.id]?.suspendPayload : {};
    result = {
      status: "suspended",
      payload: suspendData,
      suspendPayload: suspendData,
      suspendedAt: Date.now()
    };
  }
  if (result.status === "suspended") {
    entrySteps.forEach((s, stepIndex) => {
      if (s.type === "step" && stepResults[s.step.id]?.status === "suspended") {
        executionContext.suspendedPaths[s.step.id] = [...executionContext.executionPath, stepIndex];
      }
    });
  }
  return result;
}
async function persistStepUpdate(engine, params) {
  const {
    workflowId,
    runId,
    resourceId,
    stepResults,
    serializedStepGraph,
    executionContext,
    workflowStatus,
    result,
    error,
    requestContext,
    tracingContext
  } = params;
  const operationId = `workflow.${workflowId}.run.${runId}.path.${JSON.stringify(executionContext.executionPath)}.stepUpdate`;
  await engine.wrapDurableOperation(operationId, async () => {
    const shouldPersistSnapshot = engine.options?.shouldPersistSnapshot?.({ stepResults, workflowStatus });
    if (!shouldPersistSnapshot) {
      return;
    }
    const ctx = requestContext instanceof RequestContext ? requestContext : new RequestContext(requestContext);
    const requestContextObj = ctx.toJSON();
    const workflowsStore = await engine.mastra?.getStorage()?.getStore("workflows");
    await workflowsStore?.persistWorkflowSnapshot({
      workflowName: workflowId,
      runId,
      resourceId,
      snapshot: {
        runId,
        status: workflowStatus,
        value: executionContext.state,
        context: stepResults,
        activePaths: executionContext.executionPath,
        stepExecutionPath: executionContext.stepExecutionPath,
        activeStepsPath: executionContext.activeStepsPath,
        serializedStepGraph,
        suspendedPaths: executionContext.suspendedPaths,
        waitingPaths: {},
        resumeLabels: executionContext.resumeLabels,
        result,
        error,
        requestContext: requestContextObj,
        timestamp: Date.now(),
        // Persist tracing context for span continuity on resume
        tracingContext
      }
    });
  });
}
async function executeEntry(engine, params) {
  const {
    workflowId,
    runId,
    resourceId,
    entry,
    prevStep,
    serializedStepGraph,
    stepResults,
    restart,
    timeTravel,
    resume,
    executionContext,
    pubsub,
    abortController,
    requestContext,
    outputWriter,
    disableScorers,
    perStep,
    ...rest
  } = params;
  const observabilityContext = resolveObservabilityContext(rest);
  const prevOutput = engine.getStepOutput(stepResults, prevStep);
  let execResults;
  let entryRequestContext;
  if (entry.type === "step") {
    const isResumedStep = resume?.steps?.includes(entry.step.id) ?? false;
    if (!isResumedStep) {
      executionContext.stepExecutionPath?.push(entry.step.id);
    }
    const { step } = entry;
    const stepExecResult = await engine.executeStep({
      workflowId,
      runId,
      resourceId,
      step,
      stepResults,
      executionContext,
      timeTravel,
      restart,
      resume,
      prevOutput,
      ...observabilityContext,
      pubsub,
      abortController,
      requestContext,
      outputWriter,
      disableScorers,
      serializedStepGraph,
      perStep
    });
    execResults = stepExecResult.result;
    engine.applyMutableContext(executionContext, stepExecResult.mutableContext);
    Object.assign(stepResults, stepExecResult.stepResults);
    entryRequestContext = stepExecResult.requestContext;
  } else if (resume?.resumePath?.length && entry.type === "parallel") {
    const idx = resume.resumePath.shift();
    const resumedStepResult = await executeEntry(engine, {
      workflowId,
      runId,
      resourceId,
      entry: entry.steps[idx],
      prevStep,
      serializedStepGraph,
      stepResults,
      resume,
      executionContext: {
        workflowId,
        runId,
        executionPath: [...executionContext.executionPath, idx],
        stepExecutionPath: executionContext.stepExecutionPath ? [...executionContext.stepExecutionPath] : void 0,
        suspendedPaths: executionContext.suspendedPaths,
        resumeLabels: executionContext.resumeLabels,
        retryConfig: executionContext.retryConfig,
        activeStepsPath: executionContext.activeStepsPath,
        state: executionContext.state
      },
      ...observabilityContext,
      pubsub,
      abortController,
      requestContext,
      outputWriter,
      disableScorers,
      perStep
    });
    engine.applyMutableContext(executionContext, resumedStepResult.mutableContext);
    Object.assign(stepResults, resumedStepResult.stepResults);
    execResults = buildResumedBlockResult(entry.steps, stepResults, executionContext);
    return {
      result: execResults,
      stepResults,
      mutableContext: engine.buildMutableContext(executionContext),
      requestContext: resumedStepResult.requestContext
    };
  } else if (entry.type === "parallel") {
    execResults = await engine.executeParallel({
      workflowId,
      runId,
      resourceId,
      entry,
      prevStep,
      stepResults,
      serializedStepGraph,
      timeTravel,
      restart,
      resume,
      executionContext,
      ...observabilityContext,
      pubsub,
      abortController,
      requestContext,
      outputWriter,
      disableScorers,
      perStep
    });
  } else if (resume?.resumePath?.length && entry.type === "conditional") {
    const idx = resume.resumePath.shift();
    const branchStep = entry.steps[idx];
    let branchResult;
    if (branchStep.type !== "step") {
      branchResult = await executeEntry(engine, {
        workflowId,
        runId,
        resourceId,
        entry: branchStep,
        prevStep,
        serializedStepGraph,
        stepResults,
        resume,
        executionContext: {
          workflowId,
          runId,
          executionPath: [...executionContext.executionPath, idx],
          stepExecutionPath: executionContext.stepExecutionPath ? [...executionContext.stepExecutionPath] : void 0,
          suspendedPaths: executionContext.suspendedPaths,
          resumeLabels: executionContext.resumeLabels,
          retryConfig: executionContext.retryConfig,
          activeStepsPath: executionContext.activeStepsPath,
          state: executionContext.state
        },
        ...observabilityContext,
        pubsub,
        abortController,
        requestContext,
        outputWriter,
        disableScorers,
        perStep
      });
    } else {
      const resumePrevOutput = stepResults[branchStep.step.id]?.payload ?? prevOutput;
      branchResult = await engine.executeStep({
        workflowId,
        runId,
        resourceId,
        step: branchStep.step,
        prevOutput: resumePrevOutput,
        stepResults,
        serializedStepGraph,
        resume,
        restart,
        timeTravel,
        executionContext: {
          workflowId,
          runId,
          executionPath: [...executionContext.executionPath, idx],
          stepExecutionPath: executionContext.stepExecutionPath ? [...executionContext.stepExecutionPath] : void 0,
          suspendedPaths: executionContext.suspendedPaths,
          resumeLabels: executionContext.resumeLabels,
          retryConfig: executionContext.retryConfig,
          activeStepsPath: executionContext.activeStepsPath,
          state: executionContext.state
        },
        ...observabilityContext,
        pubsub,
        abortController,
        requestContext,
        outputWriter,
        disableScorers,
        perStep
      });
    }
    engine.applyMutableContext(executionContext, branchResult.mutableContext);
    Object.assign(stepResults, branchResult.stepResults);
    execResults = buildResumedBlockResult(entry.steps, stepResults, executionContext, { onlyExecutedSteps: true });
    return {
      result: execResults,
      stepResults,
      mutableContext: engine.buildMutableContext(executionContext),
      requestContext: branchResult.requestContext
    };
  } else if (entry.type === "conditional") {
    execResults = await engine.executeConditional({
      workflowId,
      runId,
      resourceId,
      entry,
      prevOutput,
      stepResults,
      serializedStepGraph,
      timeTravel,
      restart,
      resume,
      executionContext,
      ...observabilityContext,
      pubsub,
      abortController,
      requestContext,
      outputWriter,
      disableScorers,
      perStep
    });
  } else if (entry.type === "loop") {
    execResults = await engine.executeLoop({
      workflowId,
      runId,
      resourceId,
      entry,
      prevStep,
      prevOutput,
      stepResults,
      timeTravel,
      restart,
      resume,
      executionContext,
      ...observabilityContext,
      pubsub,
      abortController,
      requestContext,
      outputWriter,
      disableScorers,
      serializedStepGraph,
      perStep
    });
  } else if (entry.type === "foreach") {
    execResults = await engine.executeForeach({
      workflowId,
      runId,
      resourceId,
      entry,
      prevStep,
      prevOutput,
      stepResults,
      timeTravel,
      restart,
      resume,
      executionContext,
      ...observabilityContext,
      pubsub,
      abortController,
      requestContext,
      outputWriter,
      disableScorers,
      serializedStepGraph,
      perStep
    });
  } else if (entry.type === "sleep") {
    executionContext.stepExecutionPath?.push(entry.id);
    const startedAt = Date.now();
    const sleepWaitingOperationId = `workflow.${workflowId}.run.${runId}.sleep.${entry.id}.waiting_ev`;
    await engine.wrapDurableOperation(sleepWaitingOperationId, async () => {
      await pubsub.publish(`workflow.events.v2.${runId}`, {
        type: "watch",
        runId,
        data: {
          type: "workflow-step-waiting",
          payload: {
            id: entry.id,
            payload: prevOutput,
            startedAt,
            status: "waiting"
          }
        }
      });
    });
    stepResults[entry.id] = {
      status: "waiting",
      payload: prevOutput,
      startedAt
    };
    executionContext.activeStepsPath[entry.id] = executionContext.executionPath;
    await engine.persistStepUpdate({
      workflowId,
      runId,
      resourceId,
      serializedStepGraph,
      stepResults,
      executionContext,
      workflowStatus: "waiting",
      requestContext
    });
    await engine.executeSleep({
      workflowId,
      runId,
      entry,
      prevStep,
      prevOutput,
      stepResults,
      serializedStepGraph,
      resume,
      executionContext,
      ...observabilityContext,
      pubsub,
      abortController,
      requestContext,
      outputWriter
    });
    delete executionContext.activeStepsPath[entry.id];
    await engine.persistStepUpdate({
      workflowId,
      runId,
      resourceId,
      serializedStepGraph,
      stepResults,
      executionContext,
      workflowStatus: "running",
      requestContext
    });
    const endedAt = Date.now();
    const stepInfo = {
      payload: prevOutput,
      startedAt,
      endedAt
    };
    execResults = { ...stepInfo, status: "success", output: prevOutput };
    stepResults[entry.id] = { ...stepInfo, status: "success", output: prevOutput };
    const sleepResultOperationId = `workflow.${workflowId}.run.${runId}.sleep.${entry.id}.result_ev`;
    await engine.wrapDurableOperation(sleepResultOperationId, async () => {
      await pubsub.publish(`workflow.events.v2.${runId}`, {
        type: "watch",
        runId,
        data: {
          type: "workflow-step-result",
          payload: {
            id: entry.id,
            endedAt,
            status: "success",
            output: prevOutput
          }
        }
      });
      await pubsub.publish(`workflow.events.v2.${runId}`, {
        type: "watch",
        runId,
        data: {
          type: "workflow-step-finish",
          payload: {
            id: entry.id,
            metadata: {}
          }
        }
      });
    });
  } else if (entry.type === "sleepUntil") {
    executionContext.stepExecutionPath?.push(entry.id);
    const startedAt = Date.now();
    const sleepUntilWaitingOperationId = `workflow.${workflowId}.run.${runId}.sleepUntil.${entry.id}.waiting_ev`;
    await engine.wrapDurableOperation(sleepUntilWaitingOperationId, async () => {
      await pubsub.publish(`workflow.events.v2.${runId}`, {
        type: "watch",
        runId,
        data: {
          type: "workflow-step-waiting",
          payload: {
            id: entry.id,
            payload: prevOutput,
            startedAt,
            status: "waiting"
          }
        }
      });
    });
    stepResults[entry.id] = {
      status: "waiting",
      payload: prevOutput,
      startedAt
    };
    executionContext.activeStepsPath[entry.id] = executionContext.executionPath;
    await engine.persistStepUpdate({
      workflowId,
      runId,
      resourceId,
      serializedStepGraph,
      stepResults,
      executionContext,
      workflowStatus: "waiting",
      requestContext
    });
    await engine.executeSleepUntil({
      workflowId,
      runId,
      entry,
      prevStep,
      prevOutput,
      stepResults,
      serializedStepGraph,
      resume,
      executionContext,
      ...observabilityContext,
      pubsub,
      abortController,
      requestContext,
      outputWriter
    });
    delete executionContext.activeStepsPath[entry.id];
    await engine.persistStepUpdate({
      workflowId,
      runId,
      resourceId,
      serializedStepGraph,
      stepResults,
      executionContext,
      workflowStatus: "running",
      requestContext
    });
    const endedAt = Date.now();
    const stepInfo = {
      payload: prevOutput,
      startedAt,
      endedAt
    };
    execResults = { ...stepInfo, status: "success", output: prevOutput };
    stepResults[entry.id] = { ...stepInfo, status: "success", output: prevOutput };
    const sleepUntilResultOperationId = `workflow.${workflowId}.run.${runId}.sleepUntil.${entry.id}.result_ev`;
    await engine.wrapDurableOperation(sleepUntilResultOperationId, async () => {
      await pubsub.publish(`workflow.events.v2.${runId}`, {
        type: "watch",
        runId,
        data: {
          type: "workflow-step-result",
          payload: {
            id: entry.id,
            endedAt,
            status: "success",
            output: prevOutput
          }
        }
      });
      await pubsub.publish(`workflow.events.v2.${runId}`, {
        type: "watch",
        runId,
        data: {
          type: "workflow-step-finish",
          payload: {
            id: entry.id,
            metadata: {}
          }
        }
      });
    });
  }
  if (entry.type === "step" || entry.type === "loop" || entry.type === "foreach") {
    stepResults[entry.step.id] = execResults;
  }
  if (abortController?.signal?.aborted) {
    execResults = { ...execResults, status: "canceled" };
  }
  await engine.persistStepUpdate({
    workflowId,
    runId,
    resourceId,
    serializedStepGraph,
    stepResults,
    executionContext,
    workflowStatus: execResults.status === "success" ? "running" : execResults.status,
    requestContext
  });
  if (execResults.status === "canceled") {
    await pubsub.publish(`workflow.events.v2.${runId}`, {
      type: "watch",
      runId,
      data: { type: "workflow-canceled", payload: {} }
    });
  }
  return {
    result: execResults,
    stepResults,
    mutableContext: engine.buildMutableContext(executionContext),
    requestContext: entryRequestContext ?? engine.serializeRequestContext(requestContext)
  };
}
async function executeSleep(engine, params) {
  const {
    workflowId,
    runId,
    entry,
    prevOutput,
    stepResults,
    pubsub,
    abortController,
    requestContext,
    executionContext,
    outputWriter,
    ...rest
  } = params;
  const observabilityContext = resolveObservabilityContext(rest);
  let { duration, fn } = entry;
  const sleepSpan = await engine.createChildSpan({
    parentSpan: observabilityContext.tracingContext.currentSpan,
    operationId: `workflow.${workflowId}.run.${runId}.sleep.${entry.id}.span.start`,
    options: {
      type: "workflow_sleep" /* WORKFLOW_SLEEP */,
      name: `sleep: ${duration ? `${duration}ms` : "dynamic"}`,
      attributes: {
        durationMs: duration,
        sleepType: fn ? "dynamic" : "fixed"
      }
    },
    executionContext
  });
  if (fn) {
    const stepCallId = randomUUID();
    duration = await engine.wrapDurableOperation(`workflow.${workflowId}.sleep.${entry.id}`, async () => {
      return fn({
        runId,
        workflowId,
        mastra: engine.mastra,
        requestContext,
        inputData: prevOutput,
        state: executionContext.state,
        setState: async (state) => {
          executionContext.state = state;
        },
        retryCount: -1,
        ...createObservabilityContext({ currentSpan: sleepSpan }),
        getInitData: () => stepResults?.input,
        getStepResult: getStepResult.bind(null, stepResults),
        // TODO: this function shouldn't have suspend probably?
        suspend: async (_suspendPayload) => {
        },
        bail: (() => {
        }),
        abort: () => {
          abortController?.abort();
        },
        [PUBSUB_SYMBOL]: pubsub,
        [STREAM_FORMAT_SYMBOL]: executionContext.format,
        engine: engine.getEngineContext(),
        abortSignal: abortController?.signal,
        writer: new ToolStream(
          {
            prefix: "workflow-step",
            callId: stepCallId,
            name: "sleep",
            runId
          },
          outputWriter
        )
      });
    });
    sleepSpan?.update({
      attributes: {
        durationMs: duration
      }
    });
  }
  try {
    await engine.executeSleepDuration(!duration || duration < 0 ? 0 : duration, entry.id, workflowId);
    await engine.endChildSpan({
      span: sleepSpan,
      operationId: `workflow.${workflowId}.run.${runId}.sleep.${entry.id}.span.end`
    });
  } catch (e) {
    await engine.errorChildSpan({
      span: sleepSpan,
      operationId: `workflow.${workflowId}.run.${runId}.sleep.${entry.id}.span.error`,
      errorOptions: { error: e }
    });
    throw e;
  }
}
async function executeSleepUntil(engine, params) {
  const {
    workflowId,
    runId,
    entry,
    prevOutput,
    stepResults,
    pubsub,
    abortController,
    requestContext,
    executionContext,
    outputWriter,
    ...rest
  } = params;
  const observabilityContext = resolveObservabilityContext(rest);
  let { date, fn } = entry;
  const sleepUntilSpan = await engine.createChildSpan({
    parentSpan: observabilityContext.tracingContext.currentSpan,
    operationId: `workflow.${workflowId}.run.${runId}.sleepUntil.${entry.id}.span.start`,
    options: {
      type: "workflow_sleep" /* WORKFLOW_SLEEP */,
      name: `sleepUntil: ${date ? date.toISOString() : "dynamic"}`,
      attributes: {
        untilDate: date,
        durationMs: date ? Math.max(0, date.getTime() - Date.now()) : void 0,
        sleepType: fn ? "dynamic" : "fixed"
      }
    },
    executionContext
  });
  if (fn) {
    const stepCallId = randomUUID();
    const dateResult = await engine.wrapDurableOperation(`workflow.${workflowId}.sleepUntil.${entry.id}`, async () => {
      return fn({
        runId,
        workflowId,
        mastra: engine.mastra,
        requestContext,
        inputData: prevOutput,
        state: executionContext.state,
        setState: async (state) => {
          executionContext.state = state;
        },
        retryCount: -1,
        ...createObservabilityContext({ currentSpan: sleepUntilSpan }),
        getInitData: () => stepResults?.input,
        getStepResult: getStepResult.bind(null, stepResults),
        // TODO: this function shouldn't have suspend probably?
        suspend: async (_suspendPayload) => {
        },
        bail: (() => {
        }),
        abort: () => {
          abortController?.abort();
        },
        [PUBSUB_SYMBOL]: pubsub,
        [STREAM_FORMAT_SYMBOL]: executionContext.format,
        engine: engine.getEngineContext(),
        abortSignal: abortController?.signal,
        writer: new ToolStream(
          {
            prefix: "workflow-step",
            callId: stepCallId,
            name: "sleepUntil",
            runId
          },
          outputWriter
        )
      });
    });
    date = dateResult instanceof Date ? dateResult : new Date(dateResult);
    const time = !date ? 0 : date.getTime() - Date.now();
    sleepUntilSpan?.update({
      attributes: {
        durationMs: Math.max(0, time)
      }
    });
  }
  if (!date) {
    await engine.endChildSpan({
      span: sleepUntilSpan,
      operationId: `workflow.${workflowId}.run.${runId}.sleepUntil.${entry.id}.span.end.nodate`
    });
    return;
  }
  try {
    await engine.executeSleepUntilDate(date, entry.id, workflowId);
    await engine.endChildSpan({
      span: sleepUntilSpan,
      operationId: `workflow.${workflowId}.run.${runId}.sleepUntil.${entry.id}.span.end`
    });
  } catch (e) {
    await engine.errorChildSpan({
      span: sleepUntilSpan,
      operationId: `workflow.${workflowId}.run.${runId}.sleepUntil.${entry.id}.span.error`,
      errorOptions: { error: e }
    });
    throw e;
  }
}
async function executeStep(engine, params) {
  const {
    workflowId,
    runId,
    resourceId,
    step,
    stepResults,
    executionContext,
    restart,
    resume,
    timeTravel,
    prevOutput,
    pubsub,
    abortController,
    requestContext,
    skipEmits = false,
    outputWriter,
    disableScorers,
    serializedStepGraph,
    iterationCount,
    perStep,
    ...rest
  } = params;
  const observabilityContext = resolveObservabilityContext(rest);
  const stepCallId = randomUUID();
  const { inputData, validationError: inputValidationError } = await validateStepInput({
    prevOutput,
    step,
    validateInputs: engine.options?.validateInputs ?? true
  });
  const { validationError: requestContextValidationError } = await validateStepRequestContext({
    requestContext,
    step,
    validateInputs: engine.options?.validateInputs ?? true
  });
  const validationError = inputValidationError || requestContextValidationError;
  const { resumeData: timeTravelResumeData, validationError: timeTravelResumeValidationError } = await validateStepResumeData({
    resumeData: timeTravel?.stepResults[step.id]?.status === "suspended" ? timeTravel?.resumeData : void 0,
    step
  });
  let resumeDataToUse;
  if (timeTravelResumeData && !timeTravelResumeValidationError) {
    resumeDataToUse = timeTravelResumeData;
  } else if (timeTravelResumeData && timeTravelResumeValidationError) {
    engine.getLogger().warn("Time travel resume data validation failed", {
      stepId: step.id,
      error: timeTravelResumeValidationError.message
    });
  } else if (resume?.steps[0] === step.id) {
    resumeDataToUse = resume?.resumePayload;
  }
  let suspendDataToUse = stepResults[step.id]?.status === "suspended" ? stepResults[step.id]?.suspendPayload : void 0;
  if (suspendDataToUse && "__workflow_meta" in suspendDataToUse) {
    const { __workflow_meta, ...userSuspendData } = suspendDataToUse;
    suspendDataToUse = userSuspendData;
  }
  const startTime = resumeDataToUse ? void 0 : Date.now();
  const resumeTime = resumeDataToUse ? Date.now() : void 0;
  const stepInfo = {
    ...stepResults[step.id],
    ...resumeDataToUse ? { resumePayload: resumeDataToUse } : { payload: inputData },
    ...startTime ? { startedAt: startTime } : {},
    ...resumeTime ? { resumedAt: resumeTime } : {},
    status: "running",
    ...iterationCount ? { metadata: { iterationCount } } : {}
  };
  executionContext.activeStepsPath[step.id] = executionContext.executionPath;
  const stepSpan = await engine.createStepSpan({
    parentSpan: observabilityContext.tracingContext.currentSpan,
    stepId: step.id,
    operationId: `workflow.${workflowId}.run.${runId}.step.${step.id}.span.start`,
    options: {
      name: `workflow step: '${step.id}'`,
      type: "workflow_step" /* WORKFLOW_STEP */,
      entityType: EntityType.WORKFLOW_STEP,
      entityId: step.id,
      input: inputData,
      tracingPolicy: engine.options?.tracingPolicy,
      requestContext
    },
    executionContext
  });
  const operationId = `workflow.${workflowId}.run.${runId}.step.${step.id}.running_ev`;
  await engine.onStepExecutionStart({
    step,
    inputData,
    pubsub,
    executionContext,
    stepCallId,
    stepInfo,
    operationId,
    skipEmits
  });
  await engine.persistStepUpdate({
    workflowId,
    runId,
    resourceId,
    serializedStepGraph,
    stepResults: {
      ...stepResults,
      [step.id]: stepInfo
    },
    executionContext,
    workflowStatus: "running",
    requestContext
  });
  if (engine.isNestedWorkflowStep(step)) {
    const workflowResult = await engine.executeWorkflowStep({
      step,
      stepResults,
      executionContext,
      resume,
      timeTravel,
      prevOutput,
      inputData,
      pubsub,
      startedAt: startTime ?? Date.now(),
      abortController,
      requestContext,
      ...observabilityContext,
      outputWriter,
      stepSpan,
      perStep
    });
    if (workflowResult !== null) {
      if (stepSpan) {
        if (workflowResult.status === "failed") {
          await engine.errorStepSpan({
            span: stepSpan,
            operationId: `workflow.${workflowId}.run.${runId}.step.${step.id}.span.error`,
            errorOptions: {
              error: workflowResult.error instanceof Error ? workflowResult.error : new Error(String(workflowResult.error)),
              attributes: { status: "failed" }
            }
          });
        } else {
          const output = workflowResult.status === "success" ? workflowResult.output : workflowResult.suspendOutput;
          await engine.endStepSpan({
            span: stepSpan,
            operationId: `workflow.${workflowId}.run.${runId}.step.${step.id}.span.end`,
            endOptions: {
              output,
              attributes: { status: workflowResult.status }
            }
          });
        }
      }
      const stepResult2 = { ...stepInfo, ...workflowResult };
      return {
        result: stepResult2,
        stepResults: { [step.id]: stepResult2 },
        mutableContext: engine.buildMutableContext(executionContext),
        requestContext: engine.serializeRequestContext(requestContext)
      };
    }
  }
  const runStep = async (data) => {
    const proxiedData = createDeprecationProxy(data, {
      paramName: "runCount",
      deprecationMessage: runCountDeprecationMessage,
      logger: engine.getLogger()
    });
    return executeWithContext({ span: stepSpan, fn: () => step.execute(proxiedData) });
  };
  let execResults;
  const retries = step.retries ?? executionContext.retryConfig.attempts ?? 0;
  const delay2 = executionContext.retryConfig.delay ?? 0;
  const stepRetryResult = await engine.executeStepWithRetry(
    `workflow.${workflowId}.step.${step.id}`,
    async () => {
      if (validationError) {
        throw validationError;
      }
      const retryCount = engine.getOrGenerateRetryCount(step.id);
      let timeTravelSteps = [];
      if (timeTravel && timeTravel.steps.length > 0) {
        timeTravelSteps = timeTravel.steps[0] === step.id ? timeTravel.steps.slice(1) : [];
      }
      let suspended;
      let bailed;
      const contextMutations = {
        suspendedPaths: {},
        resumeLabels: {},
        stateUpdate: null,
        requestContextUpdate: null
      };
      const isNestedWorkflow = step.component === "WORKFLOW";
      const mastraForStep = engine.mastra ? isNestedWorkflow ? engine.mastra : wrapMastra(engine.mastra, { currentSpan: stepSpan }) : void 0;
      const output = await runStep({
        runId,
        resourceId,
        workflowId,
        mastra: mastraForStep,
        requestContext,
        inputData,
        state: executionContext.state,
        setState: async (state) => {
          const { stateData, validationError: stateValidationError } = await validateStepStateData({
            stateData: state,
            step,
            validateInputs: engine.options?.validateInputs ?? true
          });
          if (stateValidationError) {
            throw stateValidationError;
          }
          contextMutations.stateUpdate = stateData;
        },
        retryCount,
        resumeData: resumeDataToUse,
        suspendData: suspendDataToUse,
        ...createObservabilityContext({ currentSpan: stepSpan }),
        getInitData: () => stepResults?.input,
        getStepResult: getStepResult.bind(null, stepResults),
        suspend: async (suspendPayload, suspendOptions) => {
          const { suspendData, validationError: suspendValidationError } = await validateStepSuspendData({
            suspendData: suspendPayload,
            step,
            validateInputs: engine.options?.validateInputs ?? true
          });
          if (suspendValidationError) {
            throw suspendValidationError;
          }
          contextMutations.suspendedPaths[step.id] = executionContext.executionPath;
          executionContext.suspendedPaths[step.id] = executionContext.executionPath;
          if (suspendOptions?.resumeLabel) {
            const resumeLabel = Array.isArray(suspendOptions.resumeLabel) ? suspendOptions.resumeLabel : [suspendOptions.resumeLabel];
            for (const label of resumeLabel) {
              const labelData = {
                stepId: step.id,
                foreachIndex: executionContext.foreachIndex
              };
              contextMutations.resumeLabels[label] = labelData;
              executionContext.resumeLabels[label] = labelData;
            }
          }
          suspended = { payload: suspendData };
        },
        bail: (result) => {
          bailed = { payload: result };
        },
        abort: () => {
          abortController?.abort();
        },
        // Only pass resume data if this step was actually suspended before
        // This prevents pending nested workflows from trying to resume instead of start
        resume: stepResults[step.id]?.status === "suspended" ? {
          steps: resume?.steps?.slice(1) || [],
          resumePayload: resume?.resumePayload,
          runId: stepResults[step.id]?.suspendPayload?.__workflow_meta?.runId,
          label: resume?.label,
          forEachIndex: resume?.forEachIndex
        } : void 0,
        // Only pass restart data if this step is part of activeStepsPath
        // This prevents pending nested workflows from trying to restart instead of start
        restart: !!restart?.activeStepsPath?.[step.id],
        timeTravel: timeTravelSteps.length > 0 ? {
          inputData: timeTravel?.inputData,
          steps: timeTravelSteps,
          nestedStepResults: timeTravel?.nestedStepResults,
          resumeData: timeTravel?.resumeData
        } : void 0,
        [PUBSUB_SYMBOL]: pubsub,
        [STREAM_FORMAT_SYMBOL]: executionContext.format,
        engine: engine.getEngineContext(),
        abortSignal: abortController?.signal,
        writer: new ToolStream(
          {
            prefix: "workflow-step",
            callId: stepCallId,
            name: step.id,
            runId
          },
          outputWriter
        ),
        outputWriter,
        // Disable scorers must be explicitly set to false they are on by default
        scorers: disableScorers === false ? void 0 : step.scorers,
        validateInputs: engine.options?.validateInputs,
        perStep
      });
      if (engine.requiresDurableContextSerialization()) {
        contextMutations.requestContextUpdate = engine.serializeRequestContext(requestContext);
      }
      const isNestedWorkflowStep = step.component === "WORKFLOW";
      const nestedWflowStepPaused = isNestedWorkflowStep && perStep;
      return { output, suspended, bailed, contextMutations, nestedWflowStepPaused };
    },
    { retries, delay: delay2, stepSpan, workflowId, runId }
  );
  if (!stepRetryResult.ok) {
    execResults = stepRetryResult.error;
  } else {
    const { result: durableResult } = stepRetryResult;
    Object.assign(executionContext.suspendedPaths, durableResult.contextMutations.suspendedPaths);
    Object.assign(executionContext.resumeLabels, durableResult.contextMutations.resumeLabels);
    if (engine.requiresDurableContextSerialization() && durableResult.contextMutations.requestContextUpdate) {
      requestContext.clear();
      for (const [key, value] of Object.entries(durableResult.contextMutations.requestContextUpdate)) {
        requestContext.set(key, value);
      }
    }
    if (step.scorers) {
      await runScorersForStep({
        engine,
        scorers: step.scorers,
        runId,
        input: inputData,
        output: durableResult.output,
        workflowId,
        stepId: step.id,
        requestContext,
        disableScorers,
        ...createObservabilityContext({ currentSpan: stepSpan })
      });
    }
    if (durableResult.suspended) {
      execResults = {
        status: "suspended",
        suspendPayload: durableResult.suspended.payload,
        ...durableResult.output ? { suspendOutput: durableResult.output } : {},
        suspendedAt: Date.now()
      };
    } else if (durableResult.bailed) {
      execResults = { status: "bailed", output: durableResult.bailed.payload, endedAt: Date.now() };
    } else if (durableResult.nestedWflowStepPaused) {
      execResults = { status: "paused" };
    } else {
      execResults = { status: "success", output: durableResult.output, endedAt: Date.now() };
    }
  }
  delete executionContext.activeStepsPath[step.id];
  if (!skipEmits) {
    const emitOperationId = `workflow.${workflowId}.run.${runId}.step.${step.id}.emit_result`;
    await engine.wrapDurableOperation(emitOperationId, async () => {
      await emitStepResultEvents({
        stepId: step.id,
        stepCallId,
        execResults: { ...stepInfo, ...execResults },
        pubsub,
        runId
      });
    });
  }
  if (execResults.status != "failed") {
    await engine.endStepSpan({
      span: stepSpan,
      operationId: `workflow.${workflowId}.run.${runId}.step.${step.id}.span.end`,
      endOptions: {
        output: execResults.output,
        attributes: {
          status: execResults.status
        }
      }
    });
  }
  const stepResult = { ...stepInfo, ...execResults };
  return {
    result: stepResult,
    stepResults: { [step.id]: stepResult },
    mutableContext: engine.buildMutableContext({
      ...executionContext,
      state: stepRetryResult.ok ? stepRetryResult.result.contextMutations.stateUpdate ?? executionContext.state : executionContext.state
    }),
    requestContext: engine.serializeRequestContext(requestContext)
  };
}
async function runScorersForStep(params) {
  const { engine, scorers, runId, input, output, workflowId, stepId, requestContext, disableScorers, ...rest } = params;
  const observabilityContext = resolveObservabilityContext(rest);
  let scorersToUse = scorers;
  if (typeof scorersToUse === "function") {
    try {
      scorersToUse = await scorersToUse({
        requestContext
      });
    } catch (e) {
      const errorInstance = getErrorFromUnknown(e, { serializeStack: false });
      const mastraError = new MastraError(
        {
          id: "WORKFLOW_FAILED_TO_FETCH_SCORERS",
          domain: "MASTRA_WORKFLOW" /* MASTRA_WORKFLOW */,
          category: "USER" /* USER */,
          details: {
            runId,
            workflowId,
            stepId
          }
        },
        errorInstance
      );
      engine.getLogger()?.trackException(mastraError);
      engine.getLogger()?.error("Error fetching scorers: " + errorInstance?.stack);
    }
  }
  if (!disableScorers && scorersToUse && Object.keys(scorersToUse || {}).length > 0) {
    for (const [_id, scorerObject] of Object.entries(scorersToUse || {})) {
      runScorer({
        scorerId: scorerObject.name,
        scorerObject,
        runId,
        input,
        output,
        requestContext,
        entity: {
          id: workflowId,
          stepId
        },
        structuredOutput: true,
        source: "LIVE",
        entityType: "WORKFLOW",
        ...observabilityContext
      });
    }
  }
}
async function emitStepResultEvents(params) {
  const { stepId, stepCallId, execResults, pubsub, runId } = params;
  const payloadBase = stepCallId ? { id: stepId, stepCallId } : { id: stepId };
  if (execResults.status === "suspended") {
    await pubsub.publish(`workflow.events.v2.${runId}`, {
      type: "watch",
      runId,
      data: { type: "workflow-step-suspended", payload: { ...payloadBase, ...execResults } }
    });
  } else {
    await pubsub.publish(`workflow.events.v2.${runId}`, {
      type: "watch",
      runId,
      data: { type: "workflow-step-result", payload: { ...payloadBase, ...execResults } }
    });
    await pubsub.publish(`workflow.events.v2.${runId}`, {
      type: "watch",
      runId,
      data: { type: "workflow-step-finish", payload: { ...payloadBase, metadata: {} } }
    });
  }
}

// src/workflows/default.ts
var DefaultExecutionEngine = class extends ExecutionEngine {
  /**
   * The retryCounts map is used to keep track of the retry count for each step.
   * The step id is used as the key and the retry count is the value.
   */
  retryCounts = /* @__PURE__ */ new Map();
  /**
   * Get or generate the retry count for a step.
   * If the step id is not in the map, it will be added and the retry count will be 0.
   * If the step id is in the map, it will return the retry count.
   *
   * @param stepId - The id of the step.
   * @returns The retry count for the step.
   */
  getOrGenerateRetryCount(stepId) {
    if (this.retryCounts.has(stepId)) {
      const currentRetryCount = this.retryCounts.get(stepId);
      const nextRetryCount = currentRetryCount + 1;
      this.retryCounts.set(stepId, nextRetryCount);
      return nextRetryCount;
    }
    const retryCount = 0;
    this.retryCounts.set(stepId, retryCount);
    return retryCount;
  }
  // =============================================================================
  // Execution Engine Hooks
  // These methods can be overridden by subclasses to customize execution behavior
  // =============================================================================
  /**
   * Check if a step is a nested workflow that requires special handling.
   * Override this in subclasses to detect platform-specific workflow types.
   *
   * @param _step - The step to check
   * @returns true if the step is a nested workflow, false otherwise
   */
  isNestedWorkflowStep(_step) {
    return false;
  }
  /**
   * Execute the sleep duration. Override to use platform-specific sleep primitives.
   *
   * @param duration - The duration to sleep in milliseconds
   * @param _sleepId - Unique identifier for this sleep operation
   * @param _workflowId - The workflow ID (for constructing platform-specific IDs)
   */
  async executeSleepDuration(duration, _sleepId, _workflowId) {
    await new Promise((resolve2) => setTimeout(resolve2, duration < 0 ? 0 : duration));
  }
  /**
   * Execute sleep until a specific date. Override to use platform-specific sleep primitives.
   *
   * @param date - The date to sleep until
   * @param _sleepUntilId - Unique identifier for this sleep operation
   * @param _workflowId - The workflow ID (for constructing platform-specific IDs)
   */
  async executeSleepUntilDate(date, _sleepUntilId, _workflowId) {
    const time = date.getTime() - Date.now();
    await new Promise((resolve2) => setTimeout(resolve2, time < 0 ? 0 : time));
  }
  /**
   * Wrap a durable operation (like dynamic sleep function evaluation).
   * Override to add platform-specific durability.
   *
   * @param _operationId - Unique identifier for this operation
   * @param operationFn - The function to execute
   * @returns The result of the operation
   */
  async wrapDurableOperation(_operationId, operationFn) {
    return operationFn();
  }
  /**
   * Get the engine context to pass to step execution functions.
   * Override to provide platform-specific engine primitives (e.g., Inngest step).
   *
   * @returns An object containing engine-specific context
   */
  getEngineContext() {
    return {};
  }
  /**
   * Evaluate a single condition for conditional execution.
   * Override to add platform-specific durability (e.g., Inngest step.run wrapper).
   *
   * @param conditionFn - The condition function to evaluate
   * @param index - The index of this condition
   * @param context - The execution context for the condition
   * @param operationId - Unique identifier for this operation
   * @returns The index if condition is truthy, null otherwise
   */
  async evaluateCondition(conditionFn, index, context, operationId) {
    return this.wrapDurableOperation(operationId, async () => {
      const result = await conditionFn(context);
      return result ? index : null;
    });
  }
  /**
   * Handle step execution start - emit events and return start timestamp.
   * Override to add platform-specific durability (e.g., Inngest step.run wrapper).
   *
   * @param params - Parameters for step start
   * @returns The start timestamp (used by some engines like Inngest)
   */
  async onStepExecutionStart(params) {
    return this.wrapDurableOperation(params.operationId, async () => {
      const startedAt = Date.now();
      if (!params.skipEmits) {
        await params.pubsub.publish(`workflow.events.v2.${params.executionContext.runId}`, {
          type: "watch",
          runId: params.executionContext.runId,
          data: {
            type: "workflow-step-start",
            payload: {
              id: params.step.id,
              stepCallId: params.stepCallId,
              ...params.stepInfo
            }
          }
        });
      }
      return startedAt;
    });
  }
  /**
   * Execute a nested workflow step. Override to use platform-specific workflow invocation.
   * This hook is called when isNestedWorkflowStep returns true.
   *
   * Default behavior: returns null to indicate the base executeStep should handle it normally.
   * Inngest overrides this to use inngestStep.invoke() for nested workflows.
   *
   * @param params - Parameters for nested workflow execution
   * @returns StepResult if handled, null if should use default execution
   */
  async executeWorkflowStep(_params) {
    return null;
  }
  // =============================================================================
  // Span Lifecycle Hooks
  // These methods can be overridden by subclasses (e.g., Inngest) to make span
  // creation/end durable across workflow replays.
  // =============================================================================
  /**
   * Create a child span for a workflow step.
   * Override to add durability (e.g., Inngest memoization).
   *
   * Default: creates span directly via parent span's createChildSpan.
   *
   * @param params - Parameters for span creation
   * @returns The created span, or undefined if no parent span or tracing disabled
   */
  async createStepSpan(params) {
    return params.parentSpan?.createChildSpan(params.options);
  }
  /**
   * End a workflow step span.
   * Override to add durability (e.g., Inngest memoization).
   *
   * Default: calls span.end() directly.
   *
   * @param params - Parameters for ending the span
   */
  async endStepSpan(params) {
    params.span?.end(params.endOptions);
  }
  /**
   * Record an error on a workflow step span.
   * Override to add durability (e.g., Inngest memoization).
   *
   * Default: calls span.error() directly.
   *
   * @param params - Parameters for recording the error
   */
  async errorStepSpan(params) {
    params.span?.error(params.errorOptions);
  }
  /**
   * Create a generic child span (for control-flow operations like parallel, conditional, loop).
   * Override to add durability (e.g., Inngest memoization).
   *
   * Default: creates span directly via parent span's createChildSpan.
   *
   * @param params - Parameters for span creation
   * @returns The created span, or undefined if no parent span or tracing disabled
   */
  async createChildSpan(params) {
    return params.parentSpan?.createChildSpan(params.options);
  }
  /**
   * End a generic child span (for control-flow operations).
   * Override to add durability (e.g., Inngest memoization).
   *
   * Default: calls span.end() directly.
   *
   * @param params - Parameters for ending the span
   */
  async endChildSpan(params) {
    params.span?.end(params.endOptions);
  }
  /**
   * Record an error on a generic child span (for control-flow operations).
   * Override to add durability (e.g., Inngest memoization).
   *
   * Default: calls span.error() directly.
   *
   * @param params - Parameters for recording the error
   */
  async errorChildSpan(params) {
    params.span?.error(params.errorOptions);
  }
  /**
   * Execute a step with retry logic.
   * Default engine: handles retries internally with a loop.
   * Inngest engine: overrides to throw RetryAfterError for external retry handling.
   *
   * @param stepId - Unique identifier for the step (used for durability)
   * @param runStep - The step execution function to run
   * @param params - Retry parameters and context
   * @returns Discriminated union: { ok: true, result: T } or { ok: false, error: ... }
   */
  async executeStepWithRetry(stepId, runStep, params) {
    for (let i = 0; i < params.retries + 1; i++) {
      if (i > 0 && params.delay) {
        await new Promise((resolve2) => setTimeout(resolve2, params.delay));
      }
      try {
        const result = await this.wrapDurableOperation(stepId, runStep);
        return { ok: true, result };
      } catch (e) {
        if (i === params.retries) {
          const errorInstance = getErrorFromUnknown(e, {
            serializeStack: false,
            fallbackMessage: "Unknown step execution error"
          });
          const mastraError = new MastraError(
            {
              id: "WORKFLOW_STEP_INVOKE_FAILED",
              domain: "MASTRA_WORKFLOW" /* MASTRA_WORKFLOW */,
              category: "USER" /* USER */,
              details: { workflowId: params.workflowId, runId: params.runId, stepId }
            },
            errorInstance
          );
          this.logger?.trackException(mastraError);
          this.logger?.error(`Error executing step ${stepId}: ` + errorInstance?.stack);
          params.stepSpan?.error({
            error: mastraError,
            attributes: { status: "failed" }
          });
          return {
            ok: false,
            error: {
              status: "failed",
              error: errorInstance,
              endedAt: Date.now(),
              // Preserve TripWire data as plain object for proper serialization
              tripwire: e instanceof TripWire ? {
                reason: e.message,
                retry: e.options?.retry,
                metadata: e.options?.metadata,
                processorId: e.processorId
              } : void 0
            }
          };
        }
      }
    }
    return { ok: false, error: { status: "failed", error: new Error("Unknown error"), endedAt: Date.now() } };
  }
  /**
   * Format an error for the workflow result.
   * Override to customize error formatting (e.g., include stack traces).
   */
  formatResultError(error, lastOutput) {
    const outputError = lastOutput?.error;
    const errorSource = error || outputError;
    const errorInstance = getErrorFromUnknown(errorSource, {
      serializeStack: false,
      fallbackMessage: "Unknown workflow error"
    });
    return errorInstance.toJSON();
  }
  async fmtReturnValue(_pubsub, stepResults, lastOutput, error, stepExecutionPath) {
    const cleanStepResults = {};
    for (const [stepId, stepResult] of Object.entries(stepResults)) {
      if (stepResult && typeof stepResult === "object" && !Array.isArray(stepResult) && "metadata" in stepResult) {
        const { metadata, ...rest } = stepResult;
        if (metadata) {
          const { nestedRunId: _nestedRunId, ...userMetadata } = metadata;
          if (Object.keys(userMetadata).length > 0) {
            cleanStepResults[stepId] = { ...rest, metadata: userMetadata };
          } else {
            cleanStepResults[stepId] = rest;
          }
        } else {
          cleanStepResults[stepId] = stepResult;
        }
      } else {
        cleanStepResults[stepId] = stepResult;
      }
    }
    const base = {
      status: lastOutput.status,
      steps: cleanStepResults,
      input: cleanStepResults.input
    };
    if (stepExecutionPath) {
      base.stepExecutionPath = stepExecutionPath;
      const optimizedSteps = { ...cleanStepResults };
      let previousOutput;
      let hasPreviousOutput = "input" in cleanStepResults;
      if (hasPreviousOutput) {
        previousOutput = cleanStepResults.input;
      }
      for (const stepId of stepExecutionPath) {
        const originalStep = cleanStepResults[stepId];
        if (!originalStep) continue;
        const optimizedStep = { ...originalStep };
        let payloadMatchesPrevious = false;
        if (hasPreviousOutput) {
          try {
            payloadMatchesPrevious = optimizedStep.payload === previousOutput || JSON.stringify(optimizedStep.payload) === JSON.stringify(previousOutput);
          } catch {
          }
        }
        if (payloadMatchesPrevious) {
          delete optimizedStep.payload;
        }
        if (optimizedStep.status === "success") {
          previousOutput = optimizedStep.output;
          hasPreviousOutput = true;
        }
        optimizedSteps[stepId] = optimizedStep;
      }
      base.steps = optimizedSteps;
    }
    if (lastOutput.status === "success") {
      base.result = lastOutput.output;
    } else if (lastOutput.status === "failed") {
      const tripwireData = lastOutput?.tripwire;
      if (tripwireData instanceof TripWire) {
        base.status = "tripwire";
        base.tripwire = {
          reason: tripwireData.message,
          retry: tripwireData.options?.retry,
          metadata: tripwireData.options?.metadata,
          processorId: tripwireData.processorId
        };
      } else if (tripwireData && typeof tripwireData === "object" && "reason" in tripwireData) {
        base.status = "tripwire";
        base.tripwire = tripwireData;
      } else {
        base.error = this.formatResultError(error, lastOutput);
      }
    } else if (lastOutput.status === "suspended") {
      const suspendPayload = {};
      const suspendedStepIds = Object.entries(stepResults).flatMap(([stepId, stepResult]) => {
        if (stepResult?.status === "suspended") {
          const { __workflow_meta, ...rest } = stepResult?.suspendPayload ?? {};
          suspendPayload[stepId] = rest;
          const nestedPath = __workflow_meta?.path;
          return nestedPath ? [[stepId, ...nestedPath]] : [[stepId]];
        }
        return [];
      });
      base.suspended = suspendedStepIds;
      base.suspendPayload = suspendPayload;
    }
    return base;
  }
  // =============================================================================
  // Context Serialization Helpers
  // =============================================================================
  /**
   * Serialize a RequestContext Map to a plain object for JSON serialization.
   * Used by durable execution engines to persist context across step replays.
   */
  serializeRequestContext(requestContext) {
    const obj = {};
    requestContext.forEach((value, key) => {
      obj[key] = value;
    });
    return obj;
  }
  /**
   * Deserialize a plain object back to a RequestContext instance.
   * Used to restore context after durable execution replay.
   */
  deserializeRequestContext(obj) {
    const ctx = new RequestContext();
    for (const [key, value] of Object.entries(obj)) {
      ctx.set(key, value);
    }
    return ctx;
  }
  /**
   * Whether this engine requires requestContext to be serialized for durable operations.
   * Default engine passes by reference (no serialization needed).
   * Inngest engine overrides to return true (serialization required for memoization).
   */
  requiresDurableContextSerialization() {
    return false;
  }
  /**
   * Build MutableContext from current execution state.
   * This extracts only the fields that can change during step execution.
   */
  buildMutableContext(executionContext) {
    return {
      state: executionContext.state,
      suspendedPaths: executionContext.suspendedPaths,
      resumeLabels: executionContext.resumeLabels
    };
  }
  /**
   * Apply mutable context changes back to the execution context.
   */
  applyMutableContext(executionContext, mutableContext) {
    Object.assign(executionContext.state, mutableContext.state);
    Object.assign(executionContext.suspendedPaths, mutableContext.suspendedPaths);
    Object.assign(executionContext.resumeLabels, mutableContext.resumeLabels);
  }
  /**
   * Executes a workflow run with the provided execution graph and input
   * @param graph The execution graph to execute
   * @param input The input data for the workflow
   * @returns A promise that resolves to the workflow output
   */
  async execute(params) {
    const {
      workflowId,
      runId,
      resourceId,
      graph,
      input,
      initialState,
      resume,
      retryConfig,
      workflowSpan,
      disableScorers,
      restart,
      timeTravel,
      perStep
    } = params;
    const { attempts = 0, delay: delay2 = 0 } = retryConfig ?? {};
    const steps = graph.steps;
    this.retryCounts.clear();
    if (steps.length === 0) {
      const empty_graph_error = new MastraError({
        id: "WORKFLOW_EXECUTE_EMPTY_GRAPH",
        text: "Workflow must have at least one step",
        domain: "MASTRA_WORKFLOW" /* MASTRA_WORKFLOW */,
        category: "USER" /* USER */
      });
      workflowSpan?.error({ error: empty_graph_error });
      throw empty_graph_error;
    }
    let startIdx = 0;
    if (timeTravel) {
      startIdx = timeTravel.executionPath[0];
      timeTravel.executionPath.shift();
    } else if (restart) {
      startIdx = restart.activePaths[0];
      restart.activePaths.shift();
    } else if (resume?.resumePath) {
      startIdx = resume.resumePath[0];
      resume.resumePath.shift();
    }
    const stepResults = timeTravel?.stepResults || restart?.stepResults || resume?.stepResults || { input };
    let stepExecutionPath = timeTravel?.stepExecutionPath || restart?.stepExecutionPath || resume?.stepExecutionPath || [];
    let lastOutput;
    let lastState = timeTravel?.state ?? restart?.state ?? initialState ?? {};
    let lastExecutionContext;
    let currentRequestContext = params.requestContext;
    for (let i = startIdx; i < steps.length; i++) {
      const entry = steps[i];
      const executionContext = {
        workflowId,
        runId,
        executionPath: [i],
        stepExecutionPath,
        activeStepsPath: {},
        suspendedPaths: {},
        resumeLabels: {},
        retryConfig: { attempts, delay: delay2 },
        format: params.format,
        state: lastState ?? initialState,
        // Tracing IDs for durable span operations (Inngest)
        tracingIds: params.tracingIds
      };
      lastExecutionContext = executionContext;
      lastOutput = await this.executeEntry({
        workflowId,
        runId,
        resourceId,
        entry,
        executionContext,
        serializedStepGraph: params.serializedStepGraph,
        prevStep: steps[i - 1],
        stepResults,
        resume,
        timeTravel,
        restart,
        ...createObservabilityContext({ currentSpan: workflowSpan }),
        abortController: params.abortController,
        pubsub: params.pubsub,
        requestContext: currentRequestContext,
        outputWriter: params.outputWriter,
        disableScorers,
        perStep
      });
      this.applyMutableContext(executionContext, lastOutput.mutableContext);
      lastState = lastOutput.mutableContext.state;
      if (this.requiresDurableContextSerialization() && lastOutput.requestContext) {
        currentRequestContext = this.deserializeRequestContext(lastOutput.requestContext);
      }
      if (lastOutput.result.status !== "success") {
        if (lastOutput.result.status === "bailed") {
          lastOutput.result.status = "success";
        }
        const result2 = await this.fmtReturnValue(
          params.pubsub,
          stepResults,
          lastOutput.result,
          void 0,
          stepExecutionPath
        );
        const persistTracingContext = result2.status === "suspended" && workflowSpan ? {
          traceId: workflowSpan.traceId,
          spanId: workflowSpan.id,
          parentSpanId: workflowSpan.getParentSpanId()
        } : {};
        await this.persistStepUpdate({
          workflowId,
          runId,
          resourceId,
          stepResults: lastOutput.stepResults,
          serializedStepGraph: params.serializedStepGraph,
          executionContext,
          workflowStatus: result2.status,
          result: result2.result,
          error: result2.error,
          requestContext: currentRequestContext,
          tracingContext: persistTracingContext
        });
        if (result2.error) {
          workflowSpan?.error({
            error: result2.error,
            attributes: {
              status: result2.status
            }
          });
        } else {
          workflowSpan?.end({
            output: result2.result,
            attributes: {
              status: result2.status
            }
          });
        }
        if (lastOutput.result.status !== "paused") {
          await this.invokeLifecycleCallbacks({
            status: result2.status,
            result: result2.result,
            error: result2.error,
            steps: result2.steps,
            tripwire: result2.tripwire,
            runId,
            workflowId,
            resourceId,
            input,
            requestContext: currentRequestContext,
            state: lastState,
            stepExecutionPath
          });
        }
        if (lastOutput.result.status === "paused") {
          await params.pubsub.publish(`workflow.events.v2.${runId}`, {
            type: "watch",
            runId,
            data: { type: "workflow-paused", payload: {} }
          });
        }
        return {
          ...result2,
          ...lastOutput.result.status === "suspended" && params.outputOptions?.includeResumeLabels ? { resumeLabels: lastOutput.mutableContext.resumeLabels } : {},
          ...params.outputOptions?.includeState ? { state: lastState } : {}
        };
      }
      if (perStep) {
        const result2 = await this.fmtReturnValue(
          params.pubsub,
          stepResults,
          lastOutput.result,
          void 0,
          stepExecutionPath
        );
        await this.persistStepUpdate({
          workflowId,
          runId,
          resourceId,
          stepResults: lastOutput.stepResults,
          serializedStepGraph: params.serializedStepGraph,
          executionContext: lastExecutionContext,
          workflowStatus: "paused",
          requestContext: currentRequestContext
        });
        await params.pubsub.publish(`workflow.events.v2.${runId}`, {
          type: "watch",
          runId,
          data: { type: "workflow-paused", payload: {} }
        });
        workflowSpan?.end({
          attributes: {
            status: "paused"
          }
        });
        delete result2.result;
        return { ...result2, status: "paused", ...params.outputOptions?.includeState ? { state: lastState } : {} };
      }
    }
    const result = await this.fmtReturnValue(
      params.pubsub,
      stepResults,
      lastOutput.result,
      void 0,
      stepExecutionPath
    );
    await this.persistStepUpdate({
      workflowId,
      runId,
      resourceId,
      stepResults: lastOutput.stepResults,
      serializedStepGraph: params.serializedStepGraph,
      executionContext: lastExecutionContext,
      workflowStatus: result.status,
      result: result.result,
      error: result.error,
      requestContext: currentRequestContext
    });
    workflowSpan?.end({
      output: result.result,
      attributes: {
        status: result.status
      }
    });
    await this.invokeLifecycleCallbacks({
      status: result.status,
      result: result.result,
      error: result.error,
      steps: result.steps,
      tripwire: result.tripwire,
      runId,
      workflowId,
      resourceId,
      input,
      requestContext: currentRequestContext,
      state: lastState,
      stepExecutionPath
    });
    if (params.outputOptions?.includeState) {
      return { ...result, state: lastState };
    }
    return result;
  }
  getStepOutput(stepResults, step) {
    if (!step) {
      return stepResults.input;
    } else if (step.type === "step") {
      return stepResults[step.step.id]?.output;
    } else if (step.type === "sleep" || step.type === "sleepUntil") {
      return stepResults[step.id]?.output;
    } else if (step.type === "parallel" || step.type === "conditional") {
      return step.steps.reduce(
        (acc, entry) => {
          acc[entry.step.id] = stepResults[entry.step.id]?.output;
          return acc;
        },
        {}
      );
    } else if (step.type === "loop") {
      return stepResults[step.step.id]?.output;
    } else if (step.type === "foreach") {
      return stepResults[step.step.id]?.output;
    }
  }
  async executeSleep(params) {
    return executeSleep(this, params);
  }
  async executeSleepUntil(params) {
    return executeSleepUntil(this, params);
  }
  async executeStep(params) {
    return executeStep(this, params);
  }
  async executeParallel(params) {
    return executeParallel(this, params);
  }
  async executeConditional(params) {
    return executeConditional(this, params);
  }
  async executeLoop(params) {
    return executeLoop(this, params);
  }
  async executeForeach(params) {
    return executeForeach(this, params);
  }
  async persistStepUpdate(params) {
    return persistStepUpdate(this, params);
  }
  async executeEntry(params) {
    return executeEntry(this, params);
  }
};

// src/workflows/stream-utils.ts
async function forwardAgentStreamChunk({
  writer,
  chunk
}) {
  if (!writer) {
    return;
  }
  await writer.write(chunk);
}
function isAgent(input) {
  return input instanceof Agent;
}
function isToolStep(input) {
  return input instanceof Tool;
}
function isStepParams(input) {
  return input !== null && typeof input === "object" && "id" in input && "execute" in input && !(input instanceof Agent) && !(input instanceof Tool);
}
function findStepInGraph(graph, stepId) {
  for (const entry of graph) {
    if ("step" in entry && entry.step?.id === stepId) return entry;
    if ((entry.type === "conditional" || entry.type === "parallel") && "steps" in entry) {
      const found = findStepInGraph(entry.steps, stepId);
      if (found) return found;
    }
  }
  return void 0;
}
function createStep(params, agentOrToolOptions) {
  if (isAgent(params)) {
    return createStepFromAgent(params, agentOrToolOptions);
  }
  if (isToolStep(params)) {
    return createStepFromTool(params, agentOrToolOptions);
  }
  if (isStepParams(params)) {
    return createStepFromParams(params);
  }
  if (isProcessor(params)) {
    return createStepFromProcessor(params);
  }
  throw new Error("Invalid input: expected StepParams, Agent, ToolStep, or Processor");
}
function createStepFromParams(params) {
  return {
    id: params.id,
    description: params.description,
    inputSchema: params.inputSchema ? toStandardSchema5(params.inputSchema) : params.inputSchema,
    stateSchema: params.stateSchema ? toStandardSchema5(params.stateSchema) : void 0,
    outputSchema: params.outputSchema ? toStandardSchema5(params.outputSchema) : params.outputSchema,
    resumeSchema: params.resumeSchema ? toStandardSchema5(params.resumeSchema) : void 0,
    suspendSchema: params.suspendSchema ? toStandardSchema5(params.suspendSchema) : void 0,
    requestContextSchema: params.requestContextSchema ? toStandardSchema5(params.requestContextSchema) : void 0,
    scorers: params.scorers,
    retries: params.retries,
    metadata: params.metadata,
    execute: params.execute.bind(params)
  };
}
function createStepFromAgent(params, agentOrToolOptions) {
  const options = agentOrToolOptions ?? {};
  const outputSchema = toStandardSchema5(
    options?.structuredOutput?.schema ?? object({ text: string() })
  );
  const { retries, scorers, metadata, ...agentOptions } = options ?? {};
  return {
    id: params.id,
    description: params.getDescription(),
    inputSchema: toStandardSchema5(
      object({
        prompt: string()
      })
    ),
    outputSchema: toStandardSchema5(outputSchema),
    retries,
    scorers,
    metadata,
    execute: async ({
      inputData,
      runId,
      [PUBSUB_SYMBOL]: pubsub,
      [STREAM_FORMAT_SYMBOL]: streamFormat,
      requestContext,
      abortSignal,
      abort,
      writer,
      ...rest
    }) => {
      const observabilityContext = resolveObservabilityContext(rest);
      let streamPromise = {};
      streamPromise.promise = new Promise((resolve2, reject) => {
        streamPromise.resolve = resolve2;
        streamPromise.reject = reject;
      });
      let structuredResult = null;
      const toolData = {
        name: params.name,
        args: inputData
      };
      let stream;
      if ((await params.getModel()).specificationVersion === "v1") {
        const { fullStream } = await params.streamLegacy(inputData.prompt, {
          ...agentOptions,
          requestContext,
          ...observabilityContext,
          onFinish: (result) => {
            const resultWithObject = result;
            if (agentOptions?.structuredOutput?.schema && resultWithObject.object) {
              structuredResult = resultWithObject.object;
            }
            streamPromise.resolve(result.text);
            void agentOptions?.onFinish?.(result);
          },
          abortSignal
        });
        stream = fullStream;
      } else {
        const modelOutput = await params.stream(inputData.prompt, {
          ...agentOptions,
          requestContext,
          ...observabilityContext,
          onFinish: (result) => {
            const resultWithObject = result;
            if (agentOptions?.structuredOutput?.schema && resultWithObject.object) {
              structuredResult = resultWithObject.object;
            }
            streamPromise.resolve(result.text);
            void agentOptions?.onFinish?.(result);
          },
          abortSignal
        });
        stream = modelOutput.fullStream;
      }
      let tripwireChunk = null;
      if (streamFormat === "legacy") {
        await pubsub.publish(`workflow.events.v2.${runId}`, {
          type: "watch",
          runId,
          data: { type: "tool-call-streaming-start", ...toolData ?? {} }
        });
        for await (const chunk of stream) {
          if (chunk.type === "tripwire") {
            tripwireChunk = chunk;
            break;
          }
          if (chunk.type === "text-delta") {
            await pubsub.publish(`workflow.events.v2.${runId}`, {
              type: "watch",
              runId,
              data: { type: "tool-call-delta", ...toolData ?? {}, argsTextDelta: chunk.textDelta }
            });
          }
        }
        await pubsub.publish(`workflow.events.v2.${runId}`, {
          type: "watch",
          runId,
          data: { type: "tool-call-streaming-finish", ...toolData ?? {} }
        });
      } else {
        for await (const chunk of stream) {
          await forwardAgentStreamChunk({ writer, chunk });
          if (chunk.type === "tripwire") {
            tripwireChunk = chunk;
            break;
          }
        }
      }
      if (tripwireChunk) {
        throw new TripWire(
          tripwireChunk.payload?.reason || "Agent tripwire triggered",
          {
            retry: tripwireChunk.payload?.retry,
            metadata: tripwireChunk.payload?.metadata
          },
          tripwireChunk.payload?.processorId
        );
      }
      if (abortSignal.aborted) {
        return abort();
      }
      if (structuredResult !== null) {
        return structuredResult;
      }
      return {
        text: await streamPromise.promise
      };
    },
    component: params.component
  };
}
function createStepFromTool(params, toolOpts) {
  if (!params.inputSchema || !params.outputSchema) {
    throw new Error("Tool must have input and output schemas defined");
  }
  return {
    id: params.id,
    description: params.description,
    inputSchema: params.inputSchema,
    outputSchema: params.outputSchema,
    resumeSchema: params.resumeSchema,
    suspendSchema: params.suspendSchema,
    retries: toolOpts?.retries,
    scorers: toolOpts?.scorers,
    metadata: toolOpts?.metadata,
    execute: async ({
      inputData,
      mastra,
      requestContext,
      suspend,
      resumeData,
      runId,
      workflowId,
      state,
      setState,
      ...rest
    }) => {
      const observabilityContext = resolveObservabilityContext(rest);
      const toolContext = {
        mastra,
        requestContext,
        ...observabilityContext,
        resumeData,
        workflow: {
          runId,
          suspend,
          resumeData,
          workflowId,
          state,
          setState
        }
      };
      return params.execute(inputData, toolContext);
    },
    component: "TOOL"
  };
}
function createStepFromProcessor(processor) {
  const getProcessorEntityType = (phase) => {
    switch (phase) {
      case "input":
        return EntityType.INPUT_PROCESSOR;
      case "inputStep":
        return EntityType.INPUT_STEP_PROCESSOR;
      case "outputStream":
      case "outputResult":
        return EntityType.OUTPUT_PROCESSOR;
      case "outputStep":
        return EntityType.OUTPUT_STEP_PROCESSOR;
      default:
        return EntityType.OUTPUT_PROCESSOR;
    }
  };
  const getSpanNamePrefix = (phase) => {
    switch (phase) {
      case "input":
        return "input processor";
      case "inputStep":
        return "input step processor";
      case "outputStream":
        return "output stream processor";
      case "outputResult":
        return "output processor";
      case "outputStep":
        return "output step processor";
      default:
        return "processor";
    }
  };
  const hasPhaseMethod = (phase) => {
    switch (phase) {
      case "input":
        return !!processor.processInput;
      case "inputStep":
        return !!processor.processInputStep;
      case "outputStream":
        return !!processor.processOutputStream;
      case "outputResult":
        return !!processor.processOutputResult;
      case "outputStep":
        return !!processor.processOutputStep;
      default:
        return false;
    }
  };
  return {
    id: `processor:${processor.id}`,
    description: processor.name ?? `Processor ${processor.id}`,
    inputSchema: toStandardSchema5(ProcessorStepInputSchema),
    outputSchema: toStandardSchema5(ProcessorStepOutputSchema),
    execute: async ({ inputData, requestContext, tracingContext, outputWriter }) => {
      const input = inputData;
      const {
        phase,
        messages,
        messageList,
        stepNumber,
        systemMessages,
        part,
        streamParts,
        state,
        result: outputResult,
        finishReason,
        toolCalls,
        text,
        retryCount,
        // inputStep phase fields for model/tools configuration
        model,
        tools,
        toolChoice,
        activeTools,
        providerOptions,
        modelSettings,
        structuredOutput,
        steps,
        messageId,
        rotateResponseMessageId,
        // Shared processor states map for accessing persisted state
        processorStates,
        // Abort signal for cancelling in-flight processor work (e.g. OM observations)
        abortSignal
      } = input;
      const abort = (reason, options) => {
        throw new TripWire(reason || `Tripwire triggered by ${processor.id}`, options, processor.id);
      };
      let currentMessageId = messageId;
      const rotateCurrentResponseMessageId = rotateResponseMessageId ? () => {
        currentMessageId = rotateResponseMessageId();
        return currentMessageId;
      } : void 0;
      if (!hasPhaseMethod(phase)) {
        return input;
      }
      const currentSpan = tracingContext?.currentSpan;
      const parentSpan = phase === "inputStep" || phase === "outputStep" ? currentSpan?.findParent("model_step" /* MODEL_STEP */) || currentSpan : currentSpan?.findParent("agent_run" /* AGENT_RUN */) || currentSpan;
      const processorSpan = phase !== "outputStream" ? parentSpan?.createChildSpan({
        type: "processor_run" /* PROCESSOR_RUN */,
        name: `${getSpanNamePrefix(phase)}: ${processor.id}`,
        entityType: getProcessorEntityType(phase),
        entityId: processor.id,
        entityName: processor.name ?? processor.id,
        input: { phase, messageCount: messages?.length },
        attributes: {
          processorExecutor: "workflow",
          // Read processorIndex from processor (set in combineProcessorsIntoWorkflow)
          processorIndex: processor.processorIndex
        }
      }) : void 0;
      const processorObservabilityContext = createObservabilityContext(
        processorSpan ? { currentSpan: processorSpan } : tracingContext
      );
      const processorWriter = outputWriter ? {
        custom: async (data) => {
          await outputWriter(data);
        }
      } : void 0;
      let processorState;
      if (processorStates) {
        let ps = processorStates.get(processor.id);
        if (!ps) {
          ps = new ProcessorState();
          processorStates.set(processor.id, ps);
        }
        processorState = ps.customState;
      } else {
        processorState = state ?? {};
      }
      const baseContext = {
        abort,
        retryCount: retryCount ?? 0,
        requestContext,
        ...processorObservabilityContext,
        state: processorState,
        writer: processorWriter,
        abortSignal,
        messageId: currentMessageId,
        rotateResponseMessageId: rotateCurrentResponseMessageId
      };
      const passThrough = {
        phase,
        // Auto-create MessageList from messages if not provided
        // This enables running processor workflows from the UI where messageList can't be serialized
        messageList: messageList ?? (Array.isArray(messages) ? new MessageList().add(messages, "input").addSystem(systemMessages ?? []) : void 0),
        stepNumber,
        systemMessages,
        streamParts,
        state,
        result: outputResult,
        finishReason,
        toolCalls,
        text,
        retryCount,
        // inputStep phase fields for model/tools configuration
        model,
        tools,
        toolChoice,
        activeTools,
        providerOptions,
        modelSettings,
        structuredOutput,
        steps,
        messageId: currentMessageId,
        rotateResponseMessageId: rotateCurrentResponseMessageId
      };
      const executePhaseWithSpan = async (fn) => {
        try {
          const result = await executeWithContext({ span: processorSpan, fn });
          processorSpan?.end({ output: result });
          return result;
        } catch (error) {
          if (error instanceof TripWire) {
            processorSpan?.end({ output: { tripwire: error.message } });
          } else {
            processorSpan?.error({ error, endSpan: true });
          }
          throw error;
        }
      };
      return executePhaseWithSpan(async () => {
        switch (phase) {
          case "input": {
            if (processor.processInput) {
              if (!passThrough.messageList) {
                throw new MastraError({
                  category: "USER" /* USER */,
                  domain: "MASTRA_WORKFLOW" /* MASTRA_WORKFLOW */,
                  id: "PROCESSOR_MISSING_MESSAGE_LIST",
                  text: `Processor ${processor.id} requires messageList or messages for processInput phase`
                });
              }
              const checkedMessageList = passThrough.messageList;
              const idsBeforeProcessing = messages.map((m) => m.id);
              const check = checkedMessageList.makeMessageSourceChecker();
              const result = await processor.processInput({
                ...baseContext,
                messages,
                messageList: checkedMessageList,
                systemMessages: systemMessages ?? []
              });
              if (result instanceof MessageList) {
                if (result !== checkedMessageList) {
                  throw new MastraError({
                    category: "USER" /* USER */,
                    domain: "MASTRA_WORKFLOW" /* MASTRA_WORKFLOW */,
                    id: "PROCESSOR_RETURNED_EXTERNAL_MESSAGE_LIST",
                    text: `Processor ${processor.id} returned a MessageList instance other than the one passed in. Use the messageList argument instead.`
                  });
                }
                return {
                  ...passThrough,
                  messages: result.get.all.db(),
                  systemMessages: result.getAllSystemMessages()
                };
              } else if (Array.isArray(result)) {
                ProcessorRunner.applyMessagesToMessageList(
                  result,
                  checkedMessageList,
                  idsBeforeProcessing,
                  check,
                  "input"
                );
                return { ...passThrough, messages: result };
              } else if (result && "messages" in result && "systemMessages" in result) {
                const typedResult = result;
                ProcessorRunner.applyMessagesToMessageList(
                  typedResult.messages,
                  checkedMessageList,
                  idsBeforeProcessing,
                  check,
                  "input"
                );
                checkedMessageList.replaceAllSystemMessages(typedResult.systemMessages);
                return {
                  ...passThrough,
                  messages: typedResult.messages,
                  systemMessages: typedResult.systemMessages
                };
              }
              return { ...passThrough, messages };
            }
            return { ...passThrough, messages };
          }
          case "inputStep": {
            if (processor.processInputStep) {
              if (!passThrough.messageList) {
                throw new MastraError({
                  category: "USER" /* USER */,
                  domain: "MASTRA_WORKFLOW" /* MASTRA_WORKFLOW */,
                  id: "PROCESSOR_MISSING_MESSAGE_LIST",
                  text: `Processor ${processor.id} requires messageList or messages for processInputStep phase`
                });
              }
              const checkedMessageList = passThrough.messageList;
              const idsBeforeProcessing = messages.map((m) => m.id);
              const check = checkedMessageList.makeMessageSourceChecker();
              const result = await processor.processInputStep({
                ...baseContext,
                messages,
                messageList: checkedMessageList,
                stepNumber: stepNumber ?? 0,
                systemMessages: systemMessages ?? [],
                // Pass model/tools configuration fields - types match ProcessInputStepArgs
                model,
                tools,
                toolChoice,
                activeTools,
                providerOptions,
                modelSettings,
                structuredOutput,
                steps: steps ?? [],
                messageId: currentMessageId,
                rotateResponseMessageId: rotateCurrentResponseMessageId
              });
              const validatedResult = await ProcessorRunner.validateAndFormatProcessInputStepResult(result, {
                messageList: checkedMessageList,
                processor,
                stepNumber: stepNumber ?? 0
              });
              if (validatedResult.messages) {
                ProcessorRunner.applyMessagesToMessageList(
                  validatedResult.messages,
                  checkedMessageList,
                  idsBeforeProcessing,
                  check
                );
              }
              if (validatedResult.systemMessages) {
                checkedMessageList.replaceAllSystemMessages(validatedResult.systemMessages);
              }
              return {
                ...passThrough,
                messages,
                ...validatedResult,
                ...currentMessageId ? { messageId: validatedResult.messageId ?? currentMessageId } : {}
              };
            }
            return { ...passThrough, messages };
          }
          case "outputStream": {
            if (part && part.type.startsWith("data-") && !processor.processDataParts) {
              return { ...passThrough, part };
            }
            if (processor.processOutputStream && part) {
              const spanKey = `__outputStreamSpan_${processor.id}`;
              const mutableState = processorState;
              let processorSpan2 = mutableState[spanKey];
              if (!processorSpan2 && parentSpan) {
                processorSpan2 = parentSpan.createChildSpan({
                  type: "processor_run" /* PROCESSOR_RUN */,
                  name: `output stream processor: ${processor.id}`,
                  entityType: EntityType.OUTPUT_PROCESSOR,
                  entityId: processor.id,
                  entityName: processor.name ?? processor.id,
                  input: { phase, totalChunks: 0 },
                  attributes: {
                    processorExecutor: "workflow",
                    processorIndex: processor.processorIndex
                  }
                });
                mutableState[spanKey] = processorSpan2;
              }
              if (processorSpan2) {
                processorSpan2.input = {
                  phase,
                  totalChunks: (streamParts ?? []).length
                };
              }
              const processorObservabilityContext2 = createObservabilityContext(
                processorSpan2 ? { currentSpan: processorSpan2 } : baseContext.tracingContext
              );
              let result;
              try {
                result = await processor.processOutputStream({
                  ...baseContext,
                  ...processorObservabilityContext2,
                  part,
                  streamParts: streamParts ?? [],
                  state: mutableState,
                  messageList: passThrough.messageList
                  // Optional for stream processing
                });
                if (part && part.type === "finish") {
                  processorSpan2?.end({ output: { totalChunks: (streamParts ?? []).length } });
                  delete mutableState[spanKey];
                }
              } catch (error) {
                if (error instanceof TripWire) {
                  processorSpan2?.end({ output: { tripwire: error.message } });
                } else {
                  processorSpan2?.error({ error, endSpan: true });
                }
                delete mutableState[spanKey];
                throw error;
              }
              return { ...passThrough, state: mutableState, part: result };
            }
            return { ...passThrough, part };
          }
          case "outputResult": {
            if (processor.processOutputResult) {
              if (!passThrough.messageList) {
                throw new MastraError({
                  category: "USER" /* USER */,
                  domain: "MASTRA_WORKFLOW" /* MASTRA_WORKFLOW */,
                  id: "PROCESSOR_MISSING_MESSAGE_LIST",
                  text: `Processor ${processor.id} requires messageList or messages for processOutputResult phase`
                });
              }
              const idsBeforeProcessing = messages.map((m) => m.id);
              const check = passThrough.messageList.makeMessageSourceChecker();
              const defaultResult = {
                text: "",
                usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
                finishReason: "unknown",
                steps: []
              };
              const result = await processor.processOutputResult({
                ...baseContext,
                messages,
                messageList: passThrough.messageList,
                result: passThrough.result ?? defaultResult
              });
              if (result instanceof MessageList) {
                if (result !== passThrough.messageList) {
                  throw new MastraError({
                    category: "USER" /* USER */,
                    domain: "MASTRA_WORKFLOW" /* MASTRA_WORKFLOW */,
                    id: "PROCESSOR_RETURNED_EXTERNAL_MESSAGE_LIST",
                    text: `Processor ${processor.id} returned a MessageList instance other than the one passed in. Use the messageList argument instead.`
                  });
                }
                return {
                  ...passThrough,
                  messages: result.get.all.db(),
                  systemMessages: result.getAllSystemMessages()
                };
              } else if (Array.isArray(result)) {
                ProcessorRunner.applyMessagesToMessageList(
                  result,
                  passThrough.messageList,
                  idsBeforeProcessing,
                  check,
                  "response"
                );
                return { ...passThrough, messages: result };
              } else if (result && "messages" in result && "systemMessages" in result) {
                const typedResult = result;
                ProcessorRunner.applyMessagesToMessageList(
                  typedResult.messages,
                  passThrough.messageList,
                  idsBeforeProcessing,
                  check,
                  "response"
                );
                passThrough.messageList.replaceAllSystemMessages(typedResult.systemMessages);
                return {
                  ...passThrough,
                  messages: typedResult.messages,
                  systemMessages: typedResult.systemMessages
                };
              }
              return { ...passThrough, messages };
            }
            return { ...passThrough, messages };
          }
          case "outputStep": {
            if (processor.processOutputStep) {
              if (!passThrough.messageList) {
                throw new MastraError({
                  category: "USER" /* USER */,
                  domain: "MASTRA_WORKFLOW" /* MASTRA_WORKFLOW */,
                  id: "PROCESSOR_MISSING_MESSAGE_LIST",
                  text: `Processor ${processor.id} requires messageList or messages for processOutputStep phase`
                });
              }
              const checkedMessageList = passThrough.messageList;
              const idsBeforeProcessing = messages.map((m) => m.id);
              const check = checkedMessageList.makeMessageSourceChecker();
              const result = await processor.processOutputStep({
                ...baseContext,
                messages,
                messageList: checkedMessageList,
                stepNumber: stepNumber ?? 0,
                finishReason,
                toolCalls,
                text,
                systemMessages: systemMessages ?? [],
                steps: steps ?? []
              });
              if (result instanceof MessageList) {
                if (result !== checkedMessageList) {
                  throw new MastraError({
                    category: "USER" /* USER */,
                    domain: "MASTRA_WORKFLOW" /* MASTRA_WORKFLOW */,
                    id: "PROCESSOR_RETURNED_EXTERNAL_MESSAGE_LIST",
                    text: `Processor ${processor.id} returned a MessageList instance other than the one passed in. Use the messageList argument instead.`
                  });
                }
                return {
                  ...passThrough,
                  messages: result.get.all.db(),
                  systemMessages: result.getAllSystemMessages()
                };
              } else if (Array.isArray(result)) {
                ProcessorRunner.applyMessagesToMessageList(
                  result,
                  checkedMessageList,
                  idsBeforeProcessing,
                  check,
                  "response"
                );
                return { ...passThrough, messages: result };
              } else if (result && "messages" in result && "systemMessages" in result) {
                const typedResult = result;
                ProcessorRunner.applyMessagesToMessageList(
                  typedResult.messages,
                  checkedMessageList,
                  idsBeforeProcessing,
                  check,
                  "response"
                );
                checkedMessageList.replaceAllSystemMessages(typedResult.systemMessages);
                return {
                  ...passThrough,
                  messages: typedResult.messages,
                  systemMessages: typedResult.systemMessages
                };
              }
              return { ...passThrough, messages };
            }
            return { ...passThrough, messages };
          }
          default:
            return { ...passThrough, messages };
        }
      });
    },
    component: "PROCESSOR"
  };
}
function isProcessor(obj) {
  return obj !== null && typeof obj === "object" && "id" in obj && typeof obj.id === "string" && !(obj instanceof Agent) && !(obj instanceof Tool) && (typeof obj.processInput === "function" || typeof obj.processInputStep === "function" || typeof obj.processOutputStream === "function" || typeof obj.processOutputResult === "function" || typeof obj.processOutputStep === "function" || typeof obj.processAPIError === "function");
}
function createWorkflow(params) {
  return new Workflow(params);
}
var Workflow = class extends MastraBase {
  id;
  description;
  inputSchema;
  outputSchema;
  stateSchema;
  requestContextSchema;
  steps;
  stepDefs;
  engineType = "default";
  /** Type of workflow - 'processor' for processor workflows, 'default' otherwise */
  type = "default";
  #nestedWorkflowInput;
  committed = false;
  stepFlow;
  serializedStepFlow;
  executionEngine;
  executionGraph;
  #options;
  retryConfig;
  #mastra;
  #runs = /* @__PURE__ */ new Map();
  constructor({
    mastra,
    id,
    inputSchema,
    outputSchema,
    stateSchema,
    requestContextSchema,
    description,
    executionEngine,
    retryConfig,
    steps,
    options = {},
    type
  }) {
    super({ name: id, component: RegisteredLogger.WORKFLOW });
    this.id = id;
    this.description = description;
    this.inputSchema = inputSchema ? toStandardSchema5(inputSchema) : inputSchema;
    this.outputSchema = outputSchema ? toStandardSchema5(outputSchema) : outputSchema;
    this.stateSchema = stateSchema ? toStandardSchema5(stateSchema) : void 0;
    this.requestContextSchema = requestContextSchema ? toStandardSchema5(requestContextSchema) : void 0;
    this.retryConfig = retryConfig ?? { attempts: 0, delay: 0 };
    this.executionGraph = this.buildExecutionGraph();
    this.stepFlow = [];
    this.serializedStepFlow = [];
    this.#mastra = mastra;
    this.steps = {};
    this.stepDefs = steps;
    this.type = type ?? "default";
    this.#options = {
      validateInputs: options.validateInputs ?? true,
      shouldPersistSnapshot: options.shouldPersistSnapshot ?? (() => true),
      tracingPolicy: options.tracingPolicy,
      onFinish: options.onFinish,
      onError: options.onError
    };
    if (!executionEngine) {
      this.executionEngine = new DefaultExecutionEngine({
        mastra: this.#mastra,
        options: this.#options
      });
    } else {
      this.executionEngine = executionEngine;
    }
    this.engineType = "default";
    this.#runs = /* @__PURE__ */ new Map();
  }
  get runs() {
    return this.#runs;
  }
  get mastra() {
    return this.#mastra;
  }
  get options() {
    return this.#options;
  }
  __registerMastra(mastra) {
    this.#mastra = mastra;
    this.executionEngine.__registerMastra(mastra);
  }
  __registerPrimitives(p) {
    if (p.logger) {
      this.__setLogger(p.logger);
    }
  }
  __setLogger(logger) {
    super.__setLogger(logger);
    this.executionEngine.__setLogger(logger);
  }
  setStepFlow(stepFlow) {
    this.stepFlow = stepFlow;
  }
  /**
   * Adds a step to the workflow
   * @param step The step to add to the workflow
   * @returns The workflow instance for chaining
   *
   * The step's inputSchema must be satisfied by the previous step's output (or workflow input for first step).
   * This means: TPrevSchema must be assignable to TStepInput
   */
  then(step) {
    this.stepFlow.push({ type: "step", step });
    this.serializedStepFlow.push({
      type: "step",
      step: {
        id: step.id,
        description: step.description,
        metadata: step.metadata,
        component: step.component,
        serializedStepFlow: step.serializedStepFlow,
        canSuspend: Boolean(step.suspendSchema || step.resumeSchema)
      }
    });
    this.steps[step.id] = step;
    return this;
  }
  /**
   * Adds a sleep step to the workflow
   * @param duration The duration to sleep for
   * @returns The workflow instance for chaining
   */
  sleep(duration) {
    const id = `sleep_${this.#mastra?.generateId({ idType: "step", source: "workflow", entityId: this.id, stepType: "sleep" }) || randomUUID()}`;
    const opts = typeof duration === "function" ? { type: "sleep", id, fn: duration } : { type: "sleep", id, duration };
    const serializedOpts = typeof duration === "function" ? { type: "sleep", id, fn: duration.toString() } : { type: "sleep", id, duration };
    this.stepFlow.push(opts);
    this.serializedStepFlow.push(serializedOpts);
    this.steps[id] = createStep({
      id,
      inputSchema: object({}),
      outputSchema: object({}),
      execute: async () => {
        return {};
      }
    });
    return this;
  }
  /**
   * Adds a sleep until step to the workflow
   * @param date The date to sleep until
   * @returns The workflow instance for chaining
   */
  sleepUntil(date) {
    const id = `sleep_${this.#mastra?.generateId({ idType: "step", source: "workflow", entityId: this.id, stepType: "sleep-until" }) || randomUUID()}`;
    const opts = typeof date === "function" ? { type: "sleepUntil", id, fn: date } : { type: "sleepUntil", id, date };
    const serializedOpts = typeof date === "function" ? { type: "sleepUntil", id, fn: date.toString() } : { type: "sleepUntil", id, date };
    this.stepFlow.push(opts);
    this.serializedStepFlow.push(serializedOpts);
    this.steps[id] = createStep({
      id,
      inputSchema: object({}),
      outputSchema: object({}),
      execute: async () => {
        return {};
      }
    });
    return this;
  }
  /**
   * @deprecated waitForEvent has been removed. Please use suspend/resume instead.
   */
  waitForEvent(_event, _step, _opts) {
    throw new MastraError({
      id: "WORKFLOW_WAIT_FOR_EVENT_REMOVED",
      domain: "MASTRA_WORKFLOW" /* MASTRA_WORKFLOW */,
      category: "USER" /* USER */,
      text: "waitForEvent has been removed. Please use suspend & resume flow instead. See https://mastra.ai/en/docs/workflows/suspend-and-resume for more details."
    });
  }
  map(mappingConfig, stepOptions) {
    if (typeof mappingConfig === "function") {
      const mappingStep2 = createStep({
        id: stepOptions?.id || `mapping_${this.#mastra?.generateId({ idType: "step", source: "workflow", entityId: this.id, stepType: "mapping" }) || randomUUID()}`,
        inputSchema: any(),
        outputSchema: any(),
        execute: mappingConfig
      });
      this.stepFlow.push({ type: "step", step: mappingStep2 });
      this.serializedStepFlow.push({
        type: "step",
        step: {
          id: mappingStep2.id,
          mapConfig: mappingConfig.toString()?.length > 1e3 ? mappingConfig.toString().slice(0, 1e3) + "...\n}" : mappingConfig.toString()
        }
      });
      return this;
    }
    const newMappingConfig = Object.entries(mappingConfig).reduce(
      (a, [key, mapping]) => {
        const m = mapping;
        if (m.value !== void 0) {
          a[key] = m;
        } else if (m.fn !== void 0) {
          a[key] = {
            fn: m.fn.toString(),
            schema: m.schema
          };
        } else if (m.requestContextPath) {
          a[key] = {
            requestContextPath: m.requestContextPath,
            schema: m.schema
          };
        } else {
          a[key] = m;
        }
        return a;
      },
      {}
    );
    const mappingStep = createStep({
      id: stepOptions?.id || `mapping_${this.#mastra?.generateId({ idType: "step", source: "workflow", entityId: this.id, stepType: "mapping" }) || randomUUID()}`,
      inputSchema: any(),
      outputSchema: any(),
      execute: async (ctx) => {
        const { getStepResult: getStepResult2, getInitData, requestContext } = ctx;
        const result = {};
        for (const [key, mapping] of Object.entries(mappingConfig)) {
          const m = mapping;
          if (m.value !== void 0) {
            result[key] = m.value;
            continue;
          }
          if (m.fn !== void 0) {
            result[key] = await m.fn(ctx);
            continue;
          }
          if (m.requestContextPath) {
            result[key] = requestContext.get(m.requestContextPath);
            continue;
          }
          const stepResult = m.initData ? getInitData() : getStepResult2(
            Array.isArray(m.step) ? m.step.find((s) => {
              const result2 = getStepResult2(s);
              if (typeof result2 === "object" && result2 !== null) {
                return Object.keys(result2).length > 0;
              }
              return result2;
            }) : m.step
          );
          if (m.path === ".") {
            result[key] = stepResult;
            continue;
          }
          const pathParts = m.path.split(".");
          let value = stepResult;
          for (const part of pathParts) {
            if (typeof value === "object" && value !== null) {
              value = value[part];
            } else {
              throw new Error(`Invalid path ${m.path} in step ${m?.step?.id ?? "initData"}`);
            }
          }
          result[key] = value;
        }
        return result;
      }
    });
    this.stepFlow.push({ type: "step", step: mappingStep });
    this.serializedStepFlow.push({
      type: "step",
      step: {
        id: mappingStep.id,
        mapConfig: JSON.stringify(newMappingConfig, null, 2)?.length > 1e3 ? JSON.stringify(newMappingConfig, null, 2).slice(0, 1e3) + "...\n}" : JSON.stringify(newMappingConfig, null, 2)
      }
    });
    return this;
  }
  // TODO: make typing better here
  parallel(steps) {
    this.stepFlow.push({ type: "parallel", steps: steps.map((step) => ({ type: "step", step })) });
    this.serializedStepFlow.push({
      type: "parallel",
      steps: steps.map((step) => ({
        type: "step",
        step: {
          id: step.id,
          description: step.description,
          metadata: step.metadata,
          component: step.component,
          serializedStepFlow: step.serializedStepFlow,
          canSuspend: Boolean(step.suspendSchema || step.resumeSchema)
        }
      }))
    });
    steps.forEach((step) => {
      this.steps[step.id] = step;
    });
    return this;
  }
  // TODO: make typing better here
  // TODO: add state schema to the type, this is currently broken
  branch(steps) {
    this.stepFlow.push({
      type: "conditional",
      steps: steps.map(([_cond, step]) => ({ type: "step", step })),
      conditions: steps.map(([cond]) => cond),
      serializedConditions: steps.map(([cond, _step]) => ({ id: `${_step.id}-condition`, fn: cond.toString() }))
    });
    this.serializedStepFlow.push({
      type: "conditional",
      steps: steps.map(([_cond, step]) => ({
        type: "step",
        step: {
          id: step.id,
          description: step.description,
          metadata: step.metadata,
          component: step.component,
          serializedStepFlow: step.serializedStepFlow,
          canSuspend: Boolean(step.suspendSchema || step.resumeSchema)
        }
      })),
      serializedConditions: steps.map(([cond, _step]) => ({ id: `${_step.id}-condition`, fn: cond.toString() }))
    });
    steps.forEach(([_, step]) => {
      this.steps[step.id] = step;
    });
    return this;
  }
  dowhile(step, condition) {
    this.stepFlow.push({
      type: "loop",
      step,
      condition,
      loopType: "dowhile",
      serializedCondition: { id: `${step.id}-condition`, fn: condition.toString() }
    });
    this.serializedStepFlow.push({
      type: "loop",
      step: {
        id: step.id,
        description: step.description,
        metadata: step.metadata,
        component: step.component,
        serializedStepFlow: step.serializedStepFlow,
        canSuspend: Boolean(step.suspendSchema || step.resumeSchema)
      },
      serializedCondition: { id: `${step.id}-condition`, fn: condition.toString() },
      loopType: "dowhile"
    });
    this.steps[step.id] = step;
    return this;
  }
  dountil(step, condition) {
    this.stepFlow.push({
      type: "loop",
      step,
      condition,
      loopType: "dountil",
      serializedCondition: { id: `${step.id}-condition`, fn: condition.toString() }
    });
    this.serializedStepFlow.push({
      type: "loop",
      step: {
        id: step.id,
        description: step.description,
        metadata: step.metadata,
        component: step.component,
        serializedStepFlow: step.serializedStepFlow,
        canSuspend: Boolean(step.suspendSchema || step.resumeSchema)
      },
      serializedCondition: { id: `${step.id}-condition`, fn: condition.toString() },
      loopType: "dountil"
    });
    this.steps[step.id] = step;
    return this;
  }
  foreach(step, opts) {
    const actualStep = step;
    this.stepFlow.push({ type: "foreach", step, opts: opts ?? { concurrency: 1 } });
    this.serializedStepFlow.push({
      type: "foreach",
      step: {
        id: step.id,
        description: step.description,
        metadata: step.metadata,
        component: step.component,
        serializedStepFlow: step.serializedStepFlow,
        canSuspend: Boolean(actualStep.suspendSchema || actualStep.resumeSchema)
      },
      opts: opts ?? { concurrency: 1 }
    });
    this.steps[step.id] = step;
    return this;
  }
  /**
   * Builds the execution graph for this workflow
   * @returns The execution graph that can be used to execute the workflow
   */
  buildExecutionGraph() {
    return {
      id: this.id,
      steps: this.stepFlow
    };
  }
  /**
   * Finalizes the workflow definition and prepares it for execution
   * This method should be called after all steps have been added to the workflow
   * @returns A built workflow instance ready for execution
   */
  commit() {
    this.executionGraph = this.buildExecutionGraph();
    this.committed = true;
    return this;
  }
  get stepGraph() {
    return this.stepFlow;
  }
  get serializedStepGraph() {
    return this.serializedStepFlow;
  }
  /**
   * Creates a new workflow run instance and stores a snapshot of the workflow in the storage
   * @param options Optional configuration for the run
   * @param options.runId Optional custom run ID, defaults to a random UUID
   * @param options.resourceId Optional resource ID to associate with this run
   * @param options.disableScorers Optional flag to disable scorers for this run
   * @returns A Run instance that can be used to execute the workflow
   */
  async createRun(options) {
    if (this.stepFlow.length === 0) {
      throw new Error(
        "Execution flow of workflow is not defined. Add steps to the workflow via .then(), .branch(), etc."
      );
    }
    if (!this.executionGraph.steps) {
      throw new Error("Uncommitted step flow changes detected. Call .commit() to register the steps.");
    }
    const runIdToUse = options?.runId || this.#mastra?.generateId({
      idType: "run",
      source: "workflow",
      entityId: this.id,
      resourceId: options?.resourceId
    }) || randomUUID();
    const run = this.#runs.get(runIdToUse) ?? new Run({
      workflowId: this.id,
      stateSchema: this.stateSchema,
      inputSchema: this.inputSchema,
      requestContextSchema: this.requestContextSchema,
      runId: runIdToUse,
      resourceId: options?.resourceId,
      executionEngine: this.executionEngine,
      executionGraph: this.executionGraph,
      mastra: this.#mastra,
      retryConfig: this.retryConfig,
      serializedStepGraph: this.serializedStepGraph,
      disableScorers: options?.disableScorers,
      cleanup: () => this.#runs.delete(runIdToUse),
      tracingPolicy: this.#options?.tracingPolicy,
      workflowSteps: this.steps,
      validateInputs: this.#options?.validateInputs,
      workflowEngineType: this.engineType
    });
    this.#runs.set(runIdToUse, run);
    const shouldPersistSnapshot = this.#options.shouldPersistSnapshot({
      workflowStatus: run.workflowRunStatus,
      stepResults: {}
    });
    const existingRun = await this.getWorkflowRunById(runIdToUse, {
      withNestedWorkflows: false
    });
    const existsInStorage = existingRun && !existingRun.isFromInMemory;
    if (existsInStorage && existingRun.status) {
      run.workflowRunStatus = existingRun.status;
    }
    if (!existsInStorage && shouldPersistSnapshot) {
      const workflowsStore = await this.mastra?.getStorage()?.getStore("workflows");
      await workflowsStore?.persistWorkflowSnapshot({
        workflowName: this.id,
        runId: runIdToUse,
        resourceId: options?.resourceId,
        snapshot: {
          runId: runIdToUse,
          status: "pending",
          value: {},
          // @ts-expect-error - context type mismatch
          context: this.#nestedWorkflowInput ? { input: this.#nestedWorkflowInput } : {},
          activePaths: [],
          activeStepsPath: {},
          serializedStepGraph: this.serializedStepGraph,
          suspendedPaths: {},
          resumeLabels: {},
          waitingPaths: {},
          result: void 0,
          error: void 0,
          timestamp: Date.now()
        }
      });
    }
    return run;
  }
  async listScorers({
    requestContext = new RequestContext()
  } = {}) {
    const steps = this.steps;
    if (!steps || Object.keys(steps).length === 0) {
      return {};
    }
    const scorers = {};
    for (const step of Object.values(steps)) {
      if (step.scorers) {
        let scorersToUse = step.scorers;
        if (typeof scorersToUse === "function") {
          scorersToUse = await scorersToUse({ requestContext });
        }
        for (const [id, scorer] of Object.entries(scorersToUse)) {
          scorers[id] = scorer;
        }
      }
    }
    return scorers;
  }
  // This method should only be called internally for nested workflow execution, as well as from mastra server handlers
  // To run a workflow use `.createRun` and then `.start` or `.resume`
  async execute({
    runId,
    inputData,
    resumeData,
    state,
    setState,
    suspend,
    restart,
    resume,
    timeTravel,
    [PUBSUB_SYMBOL]: pubsub,
    mastra,
    requestContext,
    abort,
    abortSignal,
    retryCount,
    outputWriter,
    validateInputs,
    perStep,
    engine: _engine,
    bail: _bail,
    ...rest
  }) {
    const observabilityContext = resolveObservabilityContext(rest);
    this.__registerMastra(mastra);
    const effectiveValidateInputs = validateInputs ?? this.#options.validateInputs ?? true;
    this.#options = {
      ...this.#options || {},
      validateInputs: effectiveValidateInputs
    };
    this.executionEngine.options = {
      ...this.executionEngine.options || {},
      validateInputs: effectiveValidateInputs
    };
    const isResume = !!(resume?.steps && resume.steps.length > 0) || !!resume?.label || !!(resume?.steps && resume.steps.length === 0 && (!retryCount || retryCount === 0));
    if (!restart && !isResume) {
      this.#nestedWorkflowInput = inputData;
    }
    const isTimeTravel = !!(timeTravel && timeTravel.steps.length > 0);
    const run = isResume ? await this.createRun({ runId: resume.runId }) : await this.createRun({ runId });
    const nestedAbortCb = () => {
      abort();
    };
    run.abortController.signal.addEventListener("abort", nestedAbortCb);
    abortSignal.addEventListener("abort", async () => {
      run.abortController.signal.removeEventListener("abort", nestedAbortCb);
      await run.cancel();
    });
    const unwatch = run.watch((event) => {
      void pubsub.publish("nested-watch", {
        type: "nested-watch",
        runId: run.runId,
        data: { event, workflowId: this.id }
      });
    });
    if (retryCount && retryCount > 0 && isResume && requestContext) {
      requestContext.set("__mastraWorflowInputData", inputData);
    }
    let res;
    if (isTimeTravel) {
      res = await run.timeTravel({
        inputData: timeTravel?.inputData,
        resumeData: timeTravel?.resumeData,
        initialState: state,
        step: timeTravel?.steps,
        context: timeTravel?.nestedStepResults?.[this.id] ?? {},
        nestedStepsContext: timeTravel?.nestedStepResults,
        requestContext,
        ...observabilityContext,
        outputWriter,
        outputOptions: { includeState: true, includeResumeLabels: true },
        perStep
      });
    } else if (restart) {
      res = await run.restart({ requestContext, ...observabilityContext, outputWriter });
    } else if (isResume) {
      res = await run.resume({
        resumeData,
        step: resume.steps?.length > 0 ? resume.steps : void 0,
        requestContext,
        ...observabilityContext,
        outputWriter,
        outputOptions: { includeState: true, includeResumeLabels: true },
        label: resume.label,
        perStep
      });
    } else {
      res = await run.start({
        inputData,
        requestContext,
        ...observabilityContext,
        outputWriter,
        initialState: state,
        outputOptions: { includeState: true, includeResumeLabels: true },
        perStep
      });
    }
    unwatch();
    const suspendedSteps = Object.entries(res.steps).filter(([_stepName, stepResult]) => {
      const stepRes = stepResult;
      return stepRes?.status === "suspended";
    });
    if (res.state) {
      await setState(res.state);
    }
    if (suspendedSteps?.length) {
      for (const [stepName, stepResult] of suspendedSteps) {
        const suspendPath = [stepName, ...stepResult?.suspendPayload?.__workflow_meta?.path ?? []];
        await suspend(
          {
            ...stepResult?.suspendPayload,
            __workflow_meta: { runId: run.runId, path: suspendPath }
          },
          {
            resumeLabel: Object.keys(res.resumeLabels ?? {})
          }
        );
      }
    }
    if (res.status === "failed") {
      throw res.error;
    }
    if (res.status === "tripwire") {
      const tripwire = res.tripwire;
      throw new TripWire(
        tripwire?.reason || "Processor tripwire triggered",
        {
          retry: tripwire?.retry,
          metadata: tripwire?.metadata
        },
        tripwire?.processorId
      );
    }
    return res.status === "success" ? res.result : void 0;
  }
  async listWorkflowRuns(args) {
    const storage = this.#mastra?.getStorage();
    if (!storage) {
      this.logger.debug("Cannot get workflow runs. Mastra storage is not initialized");
      return { runs: [], total: 0 };
    }
    const workflowsStore = await storage.getStore("workflows");
    if (!workflowsStore) {
      this.logger.debug("Cannot get workflow runs. Workflows storage domain is not available");
      return { runs: [], total: 0 };
    }
    return workflowsStore.listWorkflowRuns({ workflowName: this.id, ...args ?? {} });
  }
  async listActiveWorkflowRuns() {
    const runningRuns = await this.listWorkflowRuns({ status: "running" });
    const waitingRuns = await this.listWorkflowRuns({ status: "waiting" });
    return {
      runs: [...runningRuns.runs, ...waitingRuns.runs],
      total: runningRuns.total + waitingRuns.total
    };
  }
  async restartAllActiveWorkflowRuns() {
    if (this.engineType !== "default") {
      this.logger.debug("Cannot restart active workflow runs for engine type", { engineType: this.engineType });
      return;
    }
    const activeRuns = await this.listActiveWorkflowRuns();
    if (activeRuns.runs.length > 0) {
      this.logger.debug("Restarting active workflow runs", { count: activeRuns.runs.length });
    }
    for (const runSnapshot of activeRuns.runs) {
      try {
        const run = await this.createRun({ runId: runSnapshot.runId });
        await run.restart();
        this.logger.debug("Restarted workflow run", { workflowId: this.id, runId: runSnapshot.runId });
      } catch (error) {
        this.logger.error("Failed to restart workflow run", { workflowId: this.id, runId: runSnapshot.runId, error });
      }
    }
  }
  async deleteWorkflowRunById(runId) {
    const storage = this.#mastra?.getStorage();
    if (!storage) {
      this.logger.debug("Cannot delete workflow run by ID. Mastra storage is not initialized");
      return;
    }
    const workflowsStore = await storage.getStore("workflows");
    if (!workflowsStore) {
      this.logger.debug("Cannot delete workflow run. Workflows storage domain is not available");
      return;
    }
    await workflowsStore.deleteWorkflowRunById({ runId, workflowName: this.id });
    this.#runs.delete(runId);
  }
  async getWorkflowRunSteps({ runId, workflowId }) {
    const storage = this.#mastra?.getStorage();
    if (!storage) {
      this.logger.debug("Cannot get workflow run steps. Mastra storage is not initialized");
      return {};
    }
    const workflowsStore = await storage.getStore("workflows");
    if (!workflowsStore) {
      this.logger.debug("Cannot get workflow run steps. Workflows storage domain is not available");
      return {};
    }
    const run = await workflowsStore.getWorkflowRunById({ runId, workflowName: workflowId });
    let snapshot = run?.snapshot;
    if (!snapshot) {
      return {};
    }
    if (typeof snapshot === "string") {
      try {
        snapshot = JSON.parse(snapshot);
      } catch (e) {
        this.logger.debug("Cannot get workflow run execution result. Snapshot is not a valid JSON string", {
          error: e
        });
        return {};
      }
    }
    const { serializedStepGraph, context } = snapshot;
    const { input, ...steps } = context;
    let finalSteps = {};
    for (const step of Object.keys(steps)) {
      const stepGraph = findStepInGraph(serializedStepGraph, step);
      finalSteps[step] = steps[step];
      if (stepGraph && stepGraph?.step?.component === "WORKFLOW") {
        const stepResult = steps[step];
        const nestedRunId = stepResult?.metadata?.nestedRunId ?? runId;
        const nestedSteps = await this.getWorkflowRunSteps({ runId: nestedRunId, workflowId: step });
        if (nestedSteps) {
          const updatedNestedSteps = Object.entries(nestedSteps).reduce(
            (acc, [key, value]) => {
              acc[`${step}.${key}`] = value;
              return acc;
            },
            {}
          );
          finalSteps = { ...finalSteps, ...updatedNestedSteps };
        }
      }
    }
    return finalSteps;
  }
  /**
   * Converts an in-memory Run to a WorkflowState for API responses.
   * Used as a fallback when storage is not available.
   *
   * Limitations of in-memory fallback:
   * - createdAt/updatedAt are set to current time (approximate values)
   * - steps is empty {} because in-memory Run objects don't maintain step results
   *   in the WorkflowState format - step data is only available from persisted snapshots
   *
   * The returned object includes `isFromInMemory: true` so callers can distinguish
   * between persisted and in-memory runs.
   */
  #getInMemoryRunAsWorkflowState(runId) {
    const inMemoryRun = this.#runs.get(runId);
    if (!inMemoryRun) return null;
    return {
      runId,
      workflowName: this.id,
      resourceId: inMemoryRun.resourceId,
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date(),
      isFromInMemory: true,
      status: inMemoryRun.workflowRunStatus,
      steps: {}
    };
  }
  /**
   * Get a workflow run by ID with processed execution state and metadata.
   *
   * @param runId - The unique identifier of the workflow run
   * @param options - Configuration options for the result
   * @param options.withNestedWorkflows - Whether to include nested workflow steps (default: true)
   * @param options.fields - Specific fields to return (for performance optimization)
   * @returns The workflow run result with metadata and processed execution state, or null if not found
   */
  async getWorkflowRunById(runId, options = {}) {
    const { withNestedWorkflows = true, fields } = options;
    const storage = this.#mastra?.getStorage();
    if (!storage) {
      this.logger.debug("Cannot get workflow run. Mastra storage is not initialized");
      return this.#getInMemoryRunAsWorkflowState(runId);
    }
    const workflowsStore = await storage.getStore("workflows");
    if (!workflowsStore) {
      this.logger.debug("Cannot get workflow run. Workflows storage domain is not available");
      return this.#getInMemoryRunAsWorkflowState(runId);
    }
    const run = await workflowsStore.getWorkflowRunById({ runId, workflowName: this.id });
    if (!run) {
      return this.#getInMemoryRunAsWorkflowState(runId);
    }
    let snapshot = run.snapshot;
    if (typeof snapshot === "string") {
      try {
        snapshot = JSON.parse(snapshot);
      } catch (e) {
        this.logger.debug("Cannot parse workflow run snapshot. Snapshot is not valid JSON", { error: e });
        return null;
      }
    }
    const snapshotState = snapshot;
    const includeAllFields = !fields || fields.length === 0;
    const fieldsSet = new Set(fields ?? []);
    let steps = {};
    if (includeAllFields || fieldsSet.has("steps")) {
      let rawSteps;
      if (withNestedWorkflows) {
        rawSteps = await this.getWorkflowRunSteps({ runId, workflowId: this.id });
      } else {
        const { input, ...stepsOnly } = snapshotState.context || {};
        rawSteps = stepsOnly;
      }
      const { __state: _removedTopLevelState, ...stepsWithoutTopLevelState } = rawSteps;
      for (const [stepId, stepResult] of Object.entries(stepsWithoutTopLevelState)) {
        steps[stepId] = cleanStepResult(stepResult);
      }
    }
    const result = {
      // Metadata - always include these core fields
      runId: run.runId,
      workflowName: run.workflowName,
      resourceId: run.resourceId,
      createdAt: run.createdAt,
      updatedAt: run.updatedAt,
      // Execution state
      status: snapshotState.status,
      initialState: Object.keys(snapshotState.value).length > 0 ? snapshotState.value : void 0,
      result: includeAllFields || fieldsSet.has("result") ? snapshotState.result : void 0,
      error: includeAllFields || fieldsSet.has("error") ? snapshotState.error : void 0,
      payload: includeAllFields || fieldsSet.has("payload") ? snapshotState.context?.input : void 0,
      steps,
      // Optional detailed fields
      activeStepsPath: includeAllFields || fieldsSet.has("activeStepsPath") ? snapshotState.activeStepsPath : void 0,
      serializedStepGraph: includeAllFields || fieldsSet.has("serializedStepGraph") ? snapshotState.serializedStepGraph : void 0
    };
    if (fields && fields.length > 0) {
      if (result.initialState === void 0) delete result.initialState;
      if (result.result === void 0) delete result.result;
      if (result.error === void 0) delete result.error;
      if (result.payload === void 0) delete result.payload;
      if (!fieldsSet.has("steps")) delete result.steps;
      if (result.activeStepsPath === void 0) delete result.activeStepsPath;
      if (result.serializedStepGraph === void 0) delete result.serializedStepGraph;
    }
    return result;
  }
};
var Run = class {
  #abortController;
  pubsub;
  /**
   * Unique identifier for this workflow
   */
  workflowId;
  /**
   * Unique identifier for this run
   */
  runId;
  /**
   * Unique identifier for the resource this run is associated with
   */
  resourceId;
  /**
   * Whether to disable scorers for this run
   */
  disableScorers;
  /**
   * Options around how to trace this run
   */
  tracingPolicy;
  /**
   * Options around how to trace this run
   */
  validateInputs;
  /**
   * Internal state of the workflow run
   */
  state = {};
  /**
   * The execution engine for this run
   */
  executionEngine;
  /**
   * The execution graph for this run
   */
  executionGraph;
  /**
   * The serialized step graph for this run
   */
  serializedStepGraph;
  /**
   * The steps for this workflow
   */
  workflowSteps;
  workflowRunStatus;
  workflowEngineType;
  /**
   * The storage for this run
   */
  #mastra;
  #observerHandlers = [];
  get mastra() {
    return this.#mastra;
  }
  streamOutput;
  closeStreamAction;
  executionResults;
  stateSchema;
  inputSchema;
  requestContextSchema;
  cleanup;
  retryConfig;
  constructor(params) {
    this.workflowId = params.workflowId;
    this.runId = params.runId;
    this.resourceId = params.resourceId;
    this.serializedStepGraph = params.serializedStepGraph;
    this.executionEngine = params.executionEngine;
    this.executionGraph = params.executionGraph;
    this.#mastra = params.mastra;
    this.pubsub = new EventEmitterPubSub();
    this.retryConfig = params.retryConfig;
    this.cleanup = params.cleanup;
    this.disableScorers = params.disableScorers;
    this.tracingPolicy = params.tracingPolicy;
    this.workflowSteps = params.workflowSteps;
    this.validateInputs = params.validateInputs;
    this.stateSchema = params.stateSchema;
    this.inputSchema = params.inputSchema;
    this.requestContextSchema = params.requestContextSchema;
    this.workflowRunStatus = "pending";
    this.workflowEngineType = params.workflowEngineType;
  }
  get abortController() {
    if (!this.#abortController) {
      this.#abortController = new AbortController();
    }
    return this.#abortController;
  }
  /**
   * Cancels the workflow execution.
   * This aborts any running execution and updates the workflow status to 'canceled' in storage.
   */
  async cancel() {
    this.abortController.abort();
    this.workflowRunStatus = "canceled";
    try {
      const workflowsStore = await this.mastra?.getStorage()?.getStore("workflows");
      await workflowsStore?.updateWorkflowState({
        workflowName: this.workflowId,
        runId: this.runId,
        opts: {
          status: "canceled"
        }
      });
    } catch {
    }
  }
  async #validateSchema(schema, data, type) {
    const validatedInputData = await schema["~standard"].validate(data);
    if (validatedInputData.issues) {
      throw new Error(
        `Invalid ${type}: 
` + validatedInputData.issues.map((e) => `- ${e.path?.join(".")}: ${e.message}`).join("\n")
      );
    }
    return validatedInputData.value;
  }
  async _validateInput(inputData) {
    if (!this.validateInputs || !this.inputSchema) {
      return inputData;
    }
    return this.#validateSchema(this.inputSchema, inputData, "input data");
  }
  async _validateInitialState(initialState) {
    if (!this.validateInputs || !this.stateSchema) {
      return initialState;
    }
    return this.#validateSchema(this.stateSchema, initialState, "initial data");
  }
  async _validateRequestContext(requestContext) {
    if (this.validateInputs && this.requestContextSchema) {
      const contextValues = requestContext?.all ?? {};
      const validation = this.requestContextSchema["~standard"].validate(contextValues);
      if (validation instanceof Promise) {
        throw new Error("Your schema is async, which is not supported. Please use a sync schema.");
      }
      if (!("value" in validation)) {
        const errors = validation.issues;
        throw new Error(
          `Request context validation failed for workflow '${this.workflowId}': 
` + errors.map((e) => {
            const pathStr = e.path?.map((p) => typeof p === "object" ? p.key : p).join(".");
            return `- ${pathStr}: ${e.message}`;
          }).join("\n")
        );
      }
    }
  }
  async _validateResumeData(resumeData, suspendedStep) {
    if (!this.validateInputs || !suspendedStep?.resumeSchema) {
      return resumeData;
    }
    return this.#validateSchema(suspendedStep.resumeSchema, resumeData, "resume data");
  }
  async _validateTimetravelInputData(inputData, step) {
    if (!this.validateInputs || !step?.inputSchema) {
      return inputData;
    }
    return this.#validateSchema(step.inputSchema, inputData, "inputData");
  }
  async _start({
    inputData,
    initialState,
    requestContext,
    outputWriter,
    tracingOptions,
    format,
    outputOptions,
    perStep,
    ...rest
  }) {
    const observabilityContext = resolveObservabilityContext(rest);
    const workflowSpan = getOrCreateSpan({
      type: "workflow_run" /* WORKFLOW_RUN */,
      name: `workflow run: '${this.workflowId}'`,
      entityType: EntityType.WORKFLOW_RUN,
      entityId: this.workflowId,
      entityName: this.workflowId,
      input: inputData,
      metadata: {
        resourceId: this.resourceId,
        runId: this.runId
      },
      tracingPolicy: this.tracingPolicy,
      tracingOptions,
      tracingContext: observabilityContext.tracingContext,
      requestContext,
      mastra: this.#mastra
    });
    const traceId = workflowSpan?.externalTraceId;
    const spanId = workflowSpan?.id;
    const inputDataToUse = await this._validateInput(inputData);
    const initialStateToUse = await this._validateInitialState(initialState ?? {});
    await this._validateRequestContext(requestContext);
    const result = await this.executionEngine.execute({
      workflowId: this.workflowId,
      runId: this.runId,
      resourceId: this.resourceId,
      disableScorers: this.disableScorers,
      graph: this.executionGraph,
      serializedStepGraph: this.serializedStepGraph,
      input: inputDataToUse,
      initialState: initialStateToUse,
      pubsub: this.pubsub,
      retryConfig: this.retryConfig,
      requestContext: requestContext ?? new RequestContext(),
      abortController: this.abortController,
      outputWriter,
      workflowSpan,
      format,
      outputOptions,
      perStep
    });
    if (result.status !== "suspended") {
      this.cleanup?.();
    }
    result.traceId = traceId;
    result.spanId = spanId;
    return result;
  }
  /**
   * Starts the workflow execution with the provided input
   * @param input The input data for the workflow
   * @returns A promise that resolves to the workflow output
   */
  async start(args) {
    return this._start(args);
  }
  /**
   * Starts the workflow execution without waiting for completion (fire-and-forget).
   * Returns immediately with the runId. The workflow executes in the background.
   * Use this when you don't need to wait for the result or want to avoid polling failures.
   * @param args The input data and configuration for the workflow
   * @returns A promise that resolves immediately with the runId
   */
  async startAsync(args) {
    this._start(args).catch((err) => {
      this.mastra?.getLogger()?.error(`[Workflow ${this.workflowId}] Background execution failed:`, err);
    });
    return { runId: this.runId };
  }
  /**
   * Starts the workflow execution with the provided input as a stream
   * @param input The input data for the workflow
   * @returns A promise that resolves to the workflow output
   */
  streamLegacy({
    inputData,
    requestContext,
    onChunk,
    tracingOptions,
    ...rest
  } = {}) {
    const observabilityContext = resolveObservabilityContext(rest);
    if (this.closeStreamAction) {
      return {
        stream: this.observeStreamLegacy().stream,
        getWorkflowState: () => this.executionResults
      };
    }
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const unwatch = this.watch(async (event) => {
      try {
        const e = {
          ...event,
          type: event.type.replace("workflow-", "")
        };
        await writer.write(e);
        if (onChunk) {
          await onChunk(e);
        }
      } catch {
      }
    });
    this.closeStreamAction = async () => {
      await this.pubsub.publish(`workflow.events.v2.${this.runId}`, {
        type: "watch",
        runId: this.runId,
        data: { type: "workflow-finish", payload: { runId: this.runId } }
      });
      unwatch();
      await Promise.all(this.#observerHandlers.map((handler) => handler()));
      this.#observerHandlers = [];
      try {
        await writer.close();
      } catch (err) {
        this.mastra?.getLogger()?.error("Error closing stream:", err);
      } finally {
        writer.releaseLock();
      }
    };
    void this.pubsub.publish(`workflow.events.v2.${this.runId}`, {
      type: "watch",
      runId: this.runId,
      data: { type: "workflow-start", payload: { runId: this.runId } }
    });
    this.executionResults = this._start({
      inputData,
      requestContext,
      format: "legacy",
      ...observabilityContext,
      tracingOptions
    }).then((result) => {
      if (result.status !== "suspended") {
        this.closeStreamAction?.().catch(() => {
        });
      }
      return result;
    });
    return {
      stream: readable,
      getWorkflowState: () => this.executionResults
    };
  }
  /**
   * Observe the workflow stream
   * @returns A readable stream of the workflow events
   */
  observeStreamLegacy() {
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const unwatch = this.watch(async (event) => {
      try {
        const e = {
          ...event,
          type: event.type.replace("workflow-", "")
        };
        await writer.write(e);
      } catch {
      }
    });
    this.#observerHandlers.push(async () => {
      unwatch();
      try {
        await writer.close();
      } catch (err) {
        this.mastra?.getLogger()?.error("Error closing stream:", err);
      } finally {
        writer.releaseLock();
      }
    });
    return {
      stream: readable
    };
  }
  /**
   * Observe the workflow stream
   * @returns A readable stream of the workflow events
   */
  observeStream() {
    if (!this.streamOutput) {
      return new ReadableStream$1({
        pull(controller) {
          controller.close();
        },
        cancel(controller) {
          controller.close();
        }
      });
    }
    return this.streamOutput.fullStream;
  }
  /**
   * Starts the workflow execution with the provided input as a stream
   * @param input The input data for the workflow
   * @returns A promise that resolves to the workflow output
   */
  stream({
    inputData,
    requestContext,
    tracingOptions,
    closeOnSuspend = true,
    initialState,
    outputOptions,
    perStep,
    ...rest
  }) {
    const observabilityContext = resolveObservabilityContext(rest);
    if (this.closeStreamAction && this.streamOutput) {
      return this.streamOutput;
    }
    this.closeStreamAction = async () => {
    };
    const self = this;
    const stream = new ReadableStream$1({
      async start(controller) {
        const unwatch = self.watch(async (event) => {
          const { type, from = "WORKFLOW" /* WORKFLOW */, payload, data, ...rest2 } = event;
          if (data !== void 0 && payload === void 0) {
            controller.enqueue({
              type,
              runId: self.runId,
              from,
              data,
              ...rest2
            });
          } else {
            controller.enqueue({
              type,
              runId: self.runId,
              from,
              payload: {
                stepName: payload?.id,
                ...payload
              }
            });
          }
        });
        self.closeStreamAction = async () => {
          unwatch();
          try {
            if (controller.desiredSize !== null) {
              controller.close();
            }
          } catch (err) {
            self.mastra?.getLogger()?.error("Error closing stream:", err);
          }
        };
        const executionResultsPromise = self._start({
          inputData,
          requestContext,
          ...observabilityContext,
          tracingOptions,
          initialState,
          outputOptions,
          outputWriter: async (chunk) => {
            void self.pubsub.publish(`workflow.events.v2.${self.runId}`, {
              type: "watch",
              runId: self.runId,
              data: chunk
            });
          },
          perStep
        });
        let executionResults;
        try {
          executionResults = await executionResultsPromise;
          if (closeOnSuspend) {
            self.closeStreamAction?.().catch(() => {
            });
          } else if (executionResults.status !== "suspended") {
            self.closeStreamAction?.().catch(() => {
            });
          }
          if (self.streamOutput) {
            self.streamOutput.updateResults(
              executionResults
            );
          }
        } catch (err) {
          self.streamOutput?.rejectResults(err);
          self.closeStreamAction?.().catch(() => {
          });
        }
      }
    });
    this.streamOutput = new WorkflowRunOutput({
      runId: this.runId,
      workflowId: this.workflowId,
      stream
    });
    return this.streamOutput;
  }
  /**
   * Resumes the workflow execution with the provided input as a stream
   * @param input The input data for the workflow
   * @returns A promise that resolves to the workflow output
   */
  resumeStream({
    step,
    resumeData,
    requestContext,
    tracingOptions,
    forEachIndex,
    outputOptions,
    perStep,
    ...rest
  } = {}) {
    const observabilityContext = resolveObservabilityContext(rest);
    this.closeStreamAction = async () => {
    };
    const self = this;
    const stream = new ReadableStream$1({
      async start(controller) {
        const unwatch = self.watch(async (event) => {
          const { type, from = "WORKFLOW" /* WORKFLOW */, payload, data, ...rest2 } = event;
          if (data !== void 0 && payload === void 0) {
            controller.enqueue({
              type,
              runId: self.runId,
              from,
              data,
              ...rest2
            });
          } else {
            controller.enqueue({
              type,
              runId: self.runId,
              from,
              payload: {
                stepName: payload?.id,
                ...payload
              }
            });
          }
        });
        self.closeStreamAction = async () => {
          unwatch();
          try {
            if (controller.desiredSize !== null) {
              controller.close();
            }
          } catch (err) {
            self.mastra?.getLogger()?.error("Error closing stream:", err);
          }
        };
        const executionResultsPromise = self._resume({
          resumeData,
          step,
          requestContext,
          ...observabilityContext,
          tracingOptions,
          outputWriter: async (chunk) => {
            void controller.enqueue(chunk);
          },
          isVNext: true,
          forEachIndex,
          outputOptions,
          perStep
        });
        self.executionResults = executionResultsPromise;
        let executionResults;
        try {
          executionResults = await executionResultsPromise;
          self.closeStreamAction?.().catch(() => {
          });
          if (self.streamOutput) {
            self.streamOutput.updateResults(executionResults);
          }
        } catch (err) {
          self.streamOutput?.rejectResults(err);
          self.closeStreamAction?.().catch(() => {
          });
        }
      }
    });
    this.streamOutput = new WorkflowRunOutput({
      runId: this.runId,
      workflowId: this.workflowId,
      stream
    });
    return this.streamOutput;
  }
  /**
   * @internal
   */
  watch(cb) {
    const wrappedCb = (event) => {
      if (event.runId === this.runId) {
        cb(event.data);
      }
    };
    const nestedWatchCb = (event) => {
      if (event.runId === this.runId) {
        const { event: nestedEvent, workflowId } = event.data;
        if (nestedEvent.type.startsWith("data-") && nestedEvent.data !== void 0) {
          void this.pubsub.publish(`workflow.events.v2.${this.runId}`, {
            type: "watch",
            runId: this.runId,
            data: nestedEvent
          });
        } else {
          void this.pubsub.publish(`workflow.events.v2.${this.runId}`, {
            type: "watch",
            runId: this.runId,
            data: {
              ...nestedEvent,
              ...nestedEvent.payload?.id ? { payload: { ...nestedEvent.payload, id: `${workflowId}.${nestedEvent.payload.id}` } } : {}
            }
          });
        }
      }
    };
    void this.pubsub.subscribe(`workflow.events.v2.${this.runId}`, wrappedCb);
    void this.pubsub.subscribe("nested-watch", nestedWatchCb);
    return () => {
      void this.pubsub.unsubscribe(`workflow.events.v2.${this.runId}`, wrappedCb);
      void this.pubsub.unsubscribe("nested-watch", nestedWatchCb);
    };
  }
  /**
   * @internal
   */
  async watchAsync(cb) {
    return this.watch(cb);
  }
  async resume(params) {
    return this._resume(params);
  }
  /**
   * Restarts the workflow execution that was previously active
   * @returns A promise that resolves to the workflow output
   */
  async restart(args = {}) {
    return this._restart(args);
  }
  async _resume(params) {
    const observabilityContext = resolveObservabilityContext(params);
    const workflowsStore = await this.#mastra?.getStorage()?.getStore("workflows");
    const snapshot = await workflowsStore?.loadWorkflowSnapshot({
      workflowName: this.workflowId,
      runId: this.runId
    });
    if (!snapshot) {
      throw new Error("No snapshot found for this workflow run: " + this.workflowId + " " + this.runId);
    }
    if (snapshot.status !== "suspended") {
      throw new Error("This workflow run was not suspended");
    }
    const snapshotResumeLabel = params.label ? snapshot?.resumeLabels?.[params.label] : void 0;
    const stepParam = snapshotResumeLabel?.stepId ?? params.step;
    let steps;
    if (stepParam) {
      let newStepParam = stepParam;
      if (typeof stepParam === "string") {
        newStepParam = stepParam.split(".");
      }
      steps = (Array.isArray(newStepParam) ? newStepParam : [newStepParam]).map(
        (step) => typeof step === "string" ? step : step?.id
      );
    } else {
      const suspendedStepPaths = [];
      Object.entries(snapshot?.suspendedPaths ?? {}).forEach(([stepId, _executionPath]) => {
        const stepResult = snapshot?.context?.[stepId];
        if (stepResult && typeof stepResult === "object" && "status" in stepResult) {
          const stepRes = stepResult;
          if (stepRes.status === "suspended") {
            const nestedPath = stepRes.suspendPayload?.__workflow_meta?.path;
            if (nestedPath && Array.isArray(nestedPath)) {
              suspendedStepPaths.push([stepId, ...nestedPath]);
            } else {
              suspendedStepPaths.push([stepId]);
            }
          }
        }
      });
      if (suspendedStepPaths.length === 0) {
        throw new Error("No suspended steps found in this workflow run");
      }
      if (suspendedStepPaths.length === 1) {
        steps = suspendedStepPaths[0];
      } else {
        const pathStrings = suspendedStepPaths.map((path) => `[${path.join(", ")}]`);
        throw new Error(
          `Multiple suspended steps found: ${pathStrings.join(", ")}. Please specify which step to resume using the "step" parameter.`
        );
      }
    }
    if (!params.retryCount) {
      const suspendedStepIds = Object.keys(snapshot?.suspendedPaths ?? {});
      const isStepSuspended = suspendedStepIds.includes(steps?.[0] ?? "");
      if (!isStepSuspended) {
        throw new Error(
          `This workflow step "${steps?.[0]}" was not suspended. Available suspended steps: [${suspendedStepIds.join(", ")}]`
        );
      }
    }
    const suspendedStep = this.workflowSteps[steps?.[0] ?? ""];
    const resumeDataToUse = await this._validateResumeData(params.resumeData, suspendedStep);
    let requestContextInput;
    if (params.retryCount && params.retryCount > 0 && params.requestContext) {
      requestContextInput = params.requestContext.get("__mastraWorflowInputData");
      params.requestContext.delete("__mastraWorflowInputData");
    }
    const stepResults = { ...snapshot?.context ?? {}, input: requestContextInput ?? snapshot?.context?.input };
    const requestContextToUse = params.requestContext ?? new RequestContext();
    Object.entries(snapshot?.requestContext ?? {}).forEach(([key, value]) => {
      if (!requestContextToUse.has(key)) {
        requestContextToUse.set(key, value);
      }
    });
    const persistedTracingContext = snapshot?.tracingContext;
    const userProvidedTraceId = params.tracingOptions?.traceId;
    const userProvidedParentSpanId = params.tracingOptions?.parentSpanId;
    const effectiveTraceId = userProvidedTraceId ?? (!userProvidedParentSpanId ? persistedTracingContext?.traceId : void 0);
    const shouldUsePersistedParentSpan = !userProvidedParentSpanId && (!userProvidedTraceId || userProvidedTraceId === persistedTracingContext?.traceId);
    const resumeTracingOptions = {
      ...params.tracingOptions,
      traceId: effectiveTraceId,
      parentSpanId: shouldUsePersistedParentSpan ? persistedTracingContext?.spanId : params.tracingOptions?.parentSpanId
    };
    const workflowSpan = getOrCreateSpan({
      type: "workflow_run" /* WORKFLOW_RUN */,
      name: `workflow run: '${this.workflowId}' (resumed)`,
      entityType: EntityType.WORKFLOW_RUN,
      entityId: this.workflowId,
      entityName: this.workflowId,
      input: resumeDataToUse,
      metadata: {
        resourceId: this.resourceId,
        runId: this.runId,
        resumed: true,
        resumedFromSpanId: persistedTracingContext?.spanId
      },
      tracingPolicy: this.tracingPolicy,
      tracingOptions: resumeTracingOptions,
      tracingContext: observabilityContext.tracingContext,
      requestContext: requestContextToUse,
      mastra: this.#mastra
    });
    const traceId = workflowSpan?.externalTraceId;
    const spanId = workflowSpan?.id;
    const executionResultPromise = this.executionEngine.execute({
      workflowId: this.workflowId,
      runId: this.runId,
      resourceId: this.resourceId,
      graph: this.executionGraph,
      serializedStepGraph: this.serializedStepGraph,
      input: snapshot?.context?.input,
      initialState: snapshot?.value ?? {},
      resume: {
        steps,
        stepResults,
        resumePayload: resumeDataToUse,
        // @ts-expect-error - context type mismatch
        resumePath: snapshot?.suspendedPaths?.[steps?.[0]],
        stepExecutionPath: snapshot?.stepExecutionPath,
        forEachIndex: params.forEachIndex ?? snapshotResumeLabel?.foreachIndex,
        label: params.label
      },
      format: params.format,
      pubsub: this.pubsub,
      requestContext: requestContextToUse,
      abortController: this.abortController,
      workflowSpan,
      outputOptions: params.outputOptions,
      outputWriter: params.outputWriter,
      perStep: params.perStep
    }).then((result) => {
      if (!params.isVNext && result.status !== "suspended") {
        this.closeStreamAction?.().catch(() => {
        });
      }
      result.traceId = traceId;
      result.spanId = spanId;
      return result;
    });
    this.executionResults = executionResultPromise;
    return executionResultPromise.then((result) => {
      this.streamOutput?.updateResults(result);
      return result;
    });
  }
  async _restart({
    requestContext,
    outputWriter,
    tracingOptions,
    ...rest
  }) {
    const observabilityContext = resolveObservabilityContext(rest);
    if (this.workflowEngineType !== "default") {
      throw new Error(`restart() is not supported on ${this.workflowEngineType} workflows`);
    }
    const workflowsStore = await this.#mastra?.getStorage()?.getStore("workflows");
    const snapshot = await workflowsStore?.loadWorkflowSnapshot({
      workflowName: this.workflowId,
      runId: this.runId
    });
    let nestedWorkflowPending = false;
    if (!snapshot) {
      throw new Error(`Snapshot not found for run ${this.runId}`);
    }
    if (snapshot.status !== "running" && snapshot.status !== "waiting") {
      if (snapshot.status === "pending" && !!snapshot.context.input) {
        nestedWorkflowPending = true;
      } else {
        throw new Error("This workflow run was not active");
      }
    }
    let nestedWorkflowActiveStepsPath = {};
    const firstEntry = this.executionGraph.steps[0];
    if (firstEntry.type === "step" || firstEntry.type === "foreach" || firstEntry.type === "loop") {
      nestedWorkflowActiveStepsPath = {
        [firstEntry.step.id]: [0]
      };
    } else if (firstEntry.type === "sleep" || firstEntry.type === "sleepUntil") {
      nestedWorkflowActiveStepsPath = {
        [firstEntry.id]: [0]
      };
    } else if (firstEntry.type === "conditional" || firstEntry.type === "parallel") {
      nestedWorkflowActiveStepsPath = firstEntry.steps.reduce(
        (acc, step) => {
          acc[step.step.id] = [0];
          return acc;
        },
        {}
      );
    }
    const restartData = {
      activePaths: nestedWorkflowPending ? [0] : snapshot.activePaths,
      activeStepsPath: nestedWorkflowPending ? nestedWorkflowActiveStepsPath : snapshot.activeStepsPath,
      stepResults: snapshot.context,
      state: snapshot.value,
      stepExecutionPath: snapshot?.stepExecutionPath
    };
    const requestContextToUse = requestContext ?? new RequestContext();
    for (const [key, value] of Object.entries(snapshot.requestContext ?? {})) {
      if (!requestContextToUse.has(key)) {
        requestContextToUse.set(key, value);
      }
    }
    const workflowSpan = getOrCreateSpan({
      type: "workflow_run" /* WORKFLOW_RUN */,
      name: `workflow run: '${this.workflowId}'`,
      entityType: EntityType.WORKFLOW_RUN,
      entityId: this.workflowId,
      entityName: this.workflowId,
      metadata: {
        resourceId: this.resourceId,
        runId: this.runId
      },
      tracingPolicy: this.tracingPolicy,
      tracingOptions,
      tracingContext: observabilityContext.tracingContext,
      requestContext: requestContextToUse,
      mastra: this.#mastra
    });
    const traceId = workflowSpan?.externalTraceId;
    const spanId = workflowSpan?.id;
    const result = await this.executionEngine.execute({
      workflowId: this.workflowId,
      runId: this.runId,
      resourceId: this.resourceId,
      disableScorers: this.disableScorers,
      graph: this.executionGraph,
      serializedStepGraph: this.serializedStepGraph,
      restart: restartData,
      pubsub: this.pubsub,
      retryConfig: this.retryConfig,
      requestContext: requestContextToUse,
      abortController: this.abortController,
      outputWriter,
      workflowSpan
    });
    if (result.status !== "suspended") {
      this.cleanup?.();
    }
    result.traceId = traceId;
    result.spanId = spanId;
    return result;
  }
  async _timeTravel({
    inputData,
    resumeData,
    initialState,
    step: stepParam,
    context,
    nestedStepsContext,
    requestContext,
    outputWriter,
    tracingOptions,
    outputOptions,
    perStep,
    ...rest
  }) {
    const observabilityContext = resolveObservabilityContext(rest);
    if (!stepParam || Array.isArray(stepParam) && stepParam.length === 0) {
      throw new Error("Step is required and must be a valid step or array of steps");
    }
    const workflowsStore = await this.#mastra?.getStorage()?.getStore("workflows");
    const snapshot = await workflowsStore?.loadWorkflowSnapshot({
      workflowName: this.workflowId,
      runId: this.runId
    });
    if (!snapshot) {
      throw new Error(`Snapshot not found for run ${this.runId}`);
    }
    if (snapshot.status === "running") {
      throw new Error("This workflow run is still running, cannot time travel");
    }
    let steps;
    let newStepParam = stepParam;
    if (typeof stepParam === "string") {
      newStepParam = stepParam.split(".");
    }
    steps = (Array.isArray(newStepParam) ? newStepParam : [newStepParam]).map(
      (step) => typeof step === "string" ? step : step?.id
    );
    let inputDataToUse = inputData;
    if (inputDataToUse && steps.length === 1) {
      inputDataToUse = await this._validateTimetravelInputData(inputData, this.workflowSteps[steps[0]]);
    }
    const timeTravelData = createTimeTravelExecutionParams({
      steps,
      inputData: inputDataToUse,
      resumeData,
      context,
      nestedStepsContext,
      snapshot,
      initialState,
      graph: this.executionGraph,
      perStep
    });
    const requestContextToUse = requestContext ?? new RequestContext();
    for (const [key, value] of Object.entries(snapshot.requestContext ?? {})) {
      if (!requestContextToUse.has(key)) {
        requestContextToUse.set(key, value);
      }
    }
    const workflowSpan = getOrCreateSpan({
      type: "workflow_run" /* WORKFLOW_RUN */,
      name: `workflow run: '${this.workflowId}'`,
      input: inputData,
      entityType: EntityType.WORKFLOW_RUN,
      entityId: this.workflowId,
      entityName: this.workflowId,
      metadata: {
        resourceId: this.resourceId,
        runId: this.runId
      },
      tracingPolicy: this.tracingPolicy,
      tracingOptions,
      tracingContext: observabilityContext.tracingContext,
      requestContext: requestContextToUse,
      mastra: this.#mastra
    });
    const traceId = workflowSpan?.externalTraceId;
    const spanId = workflowSpan?.id;
    const result = await this.executionEngine.execute({
      workflowId: this.workflowId,
      runId: this.runId,
      resourceId: this.resourceId,
      disableScorers: this.disableScorers,
      graph: this.executionGraph,
      timeTravel: timeTravelData,
      serializedStepGraph: this.serializedStepGraph,
      pubsub: this.pubsub,
      retryConfig: this.retryConfig,
      requestContext: requestContextToUse,
      abortController: this.abortController,
      outputWriter,
      workflowSpan,
      outputOptions,
      perStep
    });
    if (result.status !== "suspended") {
      this.cleanup?.();
    }
    result.traceId = traceId;
    result.spanId = spanId;
    return result;
  }
  async timeTravel(args) {
    return this._timeTravel(args);
  }
  timeTravelStream({
    inputData,
    resumeData,
    initialState,
    step,
    context,
    nestedStepsContext,
    requestContext,
    tracingOptions,
    outputOptions,
    perStep,
    ...rest
  }) {
    const observabilityContext = resolveObservabilityContext(rest);
    this.closeStreamAction = async () => {
    };
    const self = this;
    const stream = new ReadableStream$1({
      async start(controller) {
        const unwatch = self.watch(async ({ type, from = "WORKFLOW" /* WORKFLOW */, payload }) => {
          controller.enqueue({
            type,
            runId: self.runId,
            from,
            payload: {
              stepName: payload.id,
              ...payload
            }
          });
        });
        self.closeStreamAction = async () => {
          unwatch();
          try {
            if (controller.desiredSize !== null) {
              controller.close();
            }
          } catch (err) {
            self.mastra?.getLogger()?.error("Error closing stream:", err);
          }
        };
        const executionResultsPromise = self._timeTravel({
          inputData,
          step,
          context,
          nestedStepsContext,
          resumeData,
          initialState,
          requestContext,
          ...observabilityContext,
          tracingOptions,
          outputWriter: async (chunk) => {
            void controller.enqueue(chunk);
          },
          outputOptions,
          perStep
        });
        self.executionResults = executionResultsPromise;
        let executionResults;
        try {
          executionResults = await executionResultsPromise;
          self.closeStreamAction?.().catch(() => {
          });
          if (self.streamOutput) {
            self.streamOutput.updateResults(executionResults);
          }
        } catch (err) {
          self.streamOutput?.rejectResults(err);
          self.closeStreamAction?.().catch(() => {
          });
        }
      }
    });
    this.streamOutput = new WorkflowRunOutput({
      runId: this.runId,
      workflowId: this.workflowId,
      stream
    });
    return this.streamOutput;
  }
  /**
   * @access private
   * @returns The execution results of the workflow run
   */
  _getExecutionResults() {
    return this.executionResults ?? this.streamOutput?.result;
  }
};
var languageModelUsageSchema = object({
  inputTokens: number().optional(),
  outputTokens: number().optional(),
  totalTokens: number().optional(),
  reasoningTokens: number().optional(),
  cachedInputTokens: number().optional()
});
var llmIterationStepResultSchema = object({
  reason: string(),
  warnings: array(any()),
  isContinued: boolean(),
  logprobs: any().optional(),
  totalUsage: languageModelUsageSchema.optional(),
  headers: record(string(), string()).optional(),
  messageId: string().optional(),
  request: record(string(), any()).optional()
});
var llmIterationOutputSchema = object({
  messageId: string(),
  messages: object({
    all: array(any()),
    // ModelMessage[] but too complex to validate at runtime
    user: array(any()),
    nonUser: array(any())
  }),
  output: object({
    text: string().optional(),
    reasoning: array(any()).optional(),
    reasoningText: string().optional(),
    files: array(any()).optional(),
    // GeneratedFile[]
    toolCalls: array(any()).optional(),
    // TypedToolCall[]
    toolResults: array(any()).optional(),
    // TypedToolResult[]
    sources: array(any()).optional(),
    // LanguageModelV2Source[]
    staticToolCalls: array(any()).optional(),
    dynamicToolCalls: array(any()).optional(),
    staticToolResults: array(any()).optional(),
    dynamicToolResults: array(any()).optional(),
    usage: languageModelUsageSchema,
    steps: array(any())
    // StepResult[]
  }),
  metadata: object({
    id: string().optional(),
    model: string().optional(),
    modelId: string().optional(),
    modelMetadata: object({
      modelId: string(),
      modelVersion: string(),
      modelProvider: string()
    }).optional(),
    timestamp: date$1().optional(),
    providerMetadata: record(string(), any()).optional(),
    headers: record(string(), string()).optional(),
    request: record(string(), any()).optional()
  }),
  stepResult: llmIterationStepResultSchema,
  processorRetryCount: number().optional(),
  fallbackModelIndex: number().optional(),
  processorRetryFeedback: string().optional(),
  isTaskCompleteCheckFailed: boolean().optional()
  //true if the isTaskComplete check failed and LLM has to run again
});
var toolCallInputSchema = object({
  toolCallId: string(),
  toolName: string(),
  args: record(string(), any()),
  providerMetadata: record(string(), any()).optional(),
  providerExecuted: boolean().optional(),
  output: any().optional()
});
var toolCallOutputSchema = toolCallInputSchema.extend({
  result: any().optional(),
  error: any().optional()
});

// src/loop/network/validation.ts
async function runSingleScorer(scorer, context) {
  const start = Date.now();
  try {
    const result = await scorer.run({
      runId: context.runId,
      input: context,
      output: context.primitiveResult,
      requestContext: context.customContext
    });
    const score = typeof result.score === "number" ? result.score : 0;
    const reason = typeof result.reason === "string" ? result.reason : void 0;
    return {
      score,
      passed: score === 1,
      reason,
      scorerId: scorer.id,
      scorerName: scorer.name ?? scorer.id,
      duration: Date.now() - start
    };
  } catch (error) {
    return {
      score: 0,
      passed: false,
      reason: `Scorer threw an error: ${error.message}`,
      scorerId: scorer.id,
      scorerName: scorer.name ?? scorer.id,
      duration: Date.now() - start
    };
  }
}
async function runCompletionScorers(scorers, context, options) {
  const strategy = options?.strategy ?? "all";
  const parallel = options?.parallel ?? true;
  const timeout = options?.timeout ?? 6e5;
  const startTime = Date.now();
  const results = [];
  let timedOut = false;
  const timeoutPromise = new Promise((resolve2) => {
    setTimeout(() => resolve2("timeout"), timeout);
  });
  if (parallel) {
    const scorerPromises = scorers.map((scorer) => runSingleScorer(scorer, context));
    const raceResult = await Promise.race([Promise.all(scorerPromises), timeoutPromise]);
    if (raceResult === "timeout") {
      timedOut = true;
      const settledResults = await Promise.allSettled(scorerPromises);
      for (const settled of settledResults) {
        if (settled.status === "fulfilled") {
          results.push(settled.value);
        }
      }
    } else {
      results.push(...raceResult);
    }
  } else {
    for (const scorer of scorers) {
      if (Date.now() - startTime > timeout) {
        timedOut = true;
        break;
      }
      const result = await runSingleScorer(scorer, context);
      results.push(result);
      if (strategy === "all" && !result.passed) break;
      if (strategy === "any" && result.passed) break;
    }
  }
  const complete = strategy === "all" ? results.length === scorers.length && results.every((r) => r.passed) : results.some((r) => r.passed);
  const relevantScorer = results.find((r) => r.passed) || results[0];
  const completionReason = relevantScorer?.reason;
  return {
    complete,
    completionReason,
    scorers: results,
    totalDuration: Date.now() - startTime,
    timedOut
  };
}
async function runValidation(config, context) {
  const result = await runCompletionScorers(config.scorers || [], context, {
    strategy: config.strategy,
    parallel: config.parallel,
    timeout: config.timeout
  });
  await config.onComplete?.(result);
  return result;
}
function formatCompletionFeedback(result, maxIterationReached) {
  const lines = [];
  lines.push("#### Completion Check Results");
  lines.push("");
  lines.push(`Overall: ${result.complete ? "\u2705 COMPLETE" : "\u274C NOT COMPLETE"}`);
  lines.push(`Duration: ${result.totalDuration}ms`);
  if (result.timedOut) {
    lines.push("\u26A0\uFE0F Scoring timed out");
  }
  lines.push("");
  for (const scorer of result.scorers) {
    lines.push(`###### ${scorer.scorerName} (${scorer.scorerId})`);
    lines.push(`Score: ${scorer.score} ${scorer.passed ? "\u2705" : "\u274C"}`);
    if (scorer.reason) {
      lines.push(`Reason: ${scorer.reason}`);
    }
    lines.push("");
  }
  if (result.complete) {
    lines.push("\n\n\u2705 The task is complete.");
  } else if (maxIterationReached) {
    lines.push("\n\n\u26A0\uFE0F Max iterations reached.");
  } else {
    lines.push("\n\n\u{1F504} Will continue working on the task.");
  }
  return lines.join("\n");
}
var defaultCompletionSchema = object({
  isComplete: boolean().describe("Whether the task is complete"),
  completionReason: string().describe("Explanation of why the task is or is not complete"),
  finalResult: string().optional().describe("The final result text to return to the user. omit if primitive result is sufficient")
});
async function runDefaultCompletionCheck(agent, context, streamContext, abortSignal, onAbort) {
  const start = Date.now();
  const completedPrimitives = context.messages.map((m) => {
    try {
      if (typeof m.content === "string") return null;
      const text = m.content.parts?.[0]?.type === "text" ? m.content.parts?.[0]?.text : null;
      if (text?.includes('"isNetwork":true')) {
        const parsed = JSON.parse(text);
        if (parsed.isNetwork) {
          return `${parsed.primitiveType} "${parsed.primitiveId}"`;
        }
      }
    } catch {
    }
    return null;
  }).filter(Boolean);
  const completedSection = completedPrimitives.length > 0 ? `

Primitives already executed: ${completedPrimitives.join(", ")}` : "";
  const completionPrompt = `
    The ${context.selectedPrimitive.type} ${context.selectedPrimitive.id} has contributed to the task.
    This is the result: ${safeStringify(context.primitiveResult)}
    
    ${completedSection}

    You need to evaluate if the task is complete. Pay very close attention to the SYSTEM INSTRUCTIONS for when the task is considered complete. 
    Only return true if the task is complete according to the system instructions.
    Original task: ${context.originalTask}

    If no primitive (type = 'none'), the task is complete because we can't run any primitive to further task completion.

    Also, if the ${context.selectedPrimitive.type} ${context.selectedPrimitive.id} has declined the tool call in its response, then the task is complete as the primitive tool-call was declined by the user.

    IMPORTANT: If the above result is from an AGENT PRIMITIVE and it is a suitable final result itself considering the original task, then finalResult should be an empty string or undefined.
    
    If the task is complete and the result is not from an AGENT PRIMITIVE, always generate a finalResult.
    IF the task is complete and the result is from an AGENT PRIMITIVE, but the AGENT PRIMITIVE response is not comprehensive enough to accomplish the user's original task, then generate a finalResult.

    IMPORTANT: The generated finalResult should not be the exact primitive result. You should craft a comprehensive response based on the message history.
    The finalResult field should be written in natural language.

    You must return this JSON shape:
    {
      "isComplete": boolean,
      "completionReason": string,
      "finalResult": string,
    }
  `;
  try {
    const stream = await agent.stream(completionPrompt, {
      maxSteps: 1,
      structuredOutput: {
        schema: defaultCompletionSchema
      },
      abortSignal,
      onAbort
    });
    let currentText = "";
    let currentTextIdx = 0;
    const { writer, stepId, runId: streamRunId } = streamContext ?? {};
    const canStream = writer && stepId && streamRunId;
    if (canStream) {
      await writer.write({
        type: "routing-agent-text-start",
        payload: { runId: stepId },
        from: "NETWORK" /* NETWORK */,
        runId: streamRunId
      });
    }
    for await (const chunk of stream.objectStream) {
      if (chunk?.finalResult) {
        currentText = chunk.finalResult;
      }
      if (canStream) {
        const currentSlice = currentText.slice(currentTextIdx);
        if (chunk?.isComplete && currentSlice.length) {
          await writer.write({
            type: "routing-agent-text-delta",
            payload: { text: currentSlice },
            from: "NETWORK" /* NETWORK */,
            runId: streamRunId
          });
          currentTextIdx = currentText.length;
        }
      }
    }
    const result = await stream.getFullOutput();
    const output = result.object;
    return {
      score: output?.isComplete ? 1 : 0,
      passed: output?.isComplete ?? false,
      reason: output?.completionReason,
      finalResult: output?.finalResult,
      scorerId: "default-completion",
      scorerName: "Default LLM Completion",
      duration: Date.now() - start
    };
  } catch (error) {
    return {
      score: 0,
      passed: false,
      reason: `LLM completion check failed: ${error.message}`,
      scorerId: "default-completion",
      scorerName: "Default LLM Completion",
      duration: Date.now() - start
    };
  }
}
var finalResultSchema = object({
  finalResult: string().optional().describe("The final result text to return to the user, omit if primitive result is sufficient")
});
async function generateFinalResult(agent, context, streamContext, abortSignal, onAbort) {
  const prompt = `
    The task has been completed successfully.
    Original task: ${context.originalTask}

    The ${context.selectedPrimitive.type} ${context.selectedPrimitive.id} produced this result:
    ${safeStringify(context.primitiveResult)}

    IMPORTANT: If the above result is from an AGENT PRIMITIVE and it is a suitable final result itself considering the original task, then finalResult should be an empty string or undefined.
    You should evaluate if the above result is comprehensive enough to accomplish the user's original task.
    Otherwise, generate the finalResult object. If the result is not from an AGENT PRIMITIVE, always generate a finalResult.

    The generated finalResult should not be the exact primitive result. You should craft a comprehensive response based on the message history.
    The response should be written in natural language.

    Return JSON:
    {
      "finalResult": string,
    }
  `;
  const stream = await agent.stream(prompt, {
    maxSteps: 1,
    structuredOutput: { schema: finalResultSchema },
    abortSignal,
    onAbort
  });
  let currentText = "";
  let currentTextIdx = 0;
  const { writer, stepId, runId: streamRunId } = streamContext ?? {};
  const canStream = writer && stepId && streamRunId;
  if (canStream) {
    await writer.write({
      type: "routing-agent-text-start",
      payload: { runId: stepId },
      from: "NETWORK" /* NETWORK */,
      runId: streamRunId
    });
  }
  for await (const chunk of stream.objectStream) {
    if (chunk?.finalResult) {
      currentText = chunk.finalResult;
    }
    if (canStream) {
      const currentSlice = currentText.slice(currentTextIdx);
      if (currentSlice.length) {
        await writer.write({
          type: "routing-agent-text-delta",
          payload: { text: currentSlice },
          from: "NETWORK" /* NETWORK */,
          runId: streamRunId
        });
        currentTextIdx = currentText.length;
      }
    }
  }
  const result = await stream.getFullOutput();
  return result.object?.finalResult;
}
async function generateStructuredFinalResult(agent, context, structuredOutputOptions, streamContext, abortSignal, onAbort) {
  const prompt = `
    The task has been completed successfully.
    Original task: ${context.originalTask}

    The ${context.selectedPrimitive.type} ${context.selectedPrimitive.id} produced this result:
    ${safeStringify(context.primitiveResult)}

    Based on the task and result above, generate a structured response according to the provided schema.
    Use the conversation history and primitive results to craft the response.
  `;
  const stream = await agent.stream(prompt, {
    maxSteps: 1,
    structuredOutput: structuredOutputOptions,
    abortSignal,
    onAbort
  });
  const { writer, stepId, runId: streamRunId } = streamContext ?? {};
  const canStream = writer && stepId && streamRunId;
  for await (const partialObject of stream.objectStream) {
    if (canStream && partialObject) {
      await writer.write({
        type: "network-object",
        payload: { object: partialObject },
        from: "NETWORK" /* NETWORK */,
        runId: streamRunId
      });
    }
  }
  const result = await stream.getFullOutput();
  const finalObject = result.object;
  if (canStream && finalObject) {
    await writer.write({
      type: "network-object-result",
      payload: { object: finalObject },
      from: "NETWORK" /* NETWORK */,
      runId: streamRunId
    });
  }
  return {
    text: finalObject ? JSON.stringify(finalObject) : void 0,
    object: finalObject
  };
}
async function runStreamCompletionScorers(scorers, context, options) {
  const adaptedContext = {
    iteration: context.iteration,
    maxIterations: context.maxIterations,
    messages: context.messages,
    originalTask: context.originalTask,
    selectedPrimitive: {
      id: "stream",
      type: "agent"
    },
    primitivePrompt: context.originalTask,
    primitiveResult: context.currentText,
    networkName: context.agentName || context.agentId || "stream",
    runId: context.runId,
    threadId: context.threadId,
    resourceId: context.resourceId,
    customContext: {
      ...context.customContext,
      // Include stream-specific data in custom context for scorers that need it
      toolCalls: context.toolCalls,
      toolResults: context.toolResults,
      agentId: context.agentId,
      agentName: context.agentName
    }
  };
  return runCompletionScorers(scorers, adaptedContext, options);
}
function formatStreamCompletionFeedback(result, maxIterationReached) {
  const lines = [];
  lines.push("#### Completion Check Results");
  lines.push("");
  lines.push(`Overall: ${result.complete ? "\u2705 COMPLETE" : "\u274C NOT COMPLETE"}`);
  lines.push(`Duration: ${result.totalDuration}ms`);
  if (result.timedOut) {
    lines.push("\u26A0\uFE0F Scoring timed out");
  }
  lines.push("");
  for (const scorer of result.scorers) {
    lines.push(`**${scorer.scorerName}** (${scorer.scorerId})`);
    lines.push(`Score: ${scorer.score} ${scorer.passed ? "\u2705" : "\u274C"}`);
    if (scorer.reason) {
      lines.push(`Reason: ${scorer.reason}`);
    }
    lines.push("");
  }
  if (result.complete) {
    lines.push("\u2705 The task is complete.");
  } else if (maxIterationReached) {
    lines.push("\u26A0\uFE0F Max iterations reached.");
  } else {
    lines.push("\u{1F504} The task is not yet complete. Please continue working based on the feedback above.");
  }
  return lines.join("\n");
}

// src/loop/workflows/agentic-execution/is-task-complete-step.ts
function createIsTaskCompleteStep(params) {
  const {
    isTaskComplete,
    maxSteps,
    messageList,
    requestContext,
    mastra,
    controller,
    runId,
    _internal,
    agentId,
    agentName
  } = params;
  let currentIteration = 0;
  return createStep({
    id: "isTaskCompleteStep",
    inputSchema: llmIterationOutputSchema,
    outputSchema: llmIterationOutputSchema,
    execute: async ({ inputData }) => {
      currentIteration++;
      const hasIsTaskCompleteScorers = isTaskComplete?.scorers && isTaskComplete.scorers.length > 0;
      if (!hasIsTaskCompleteScorers || inputData.stepResult?.isContinued) {
        return inputData;
      }
      const userMessages = messageList.get.input.db();
      const firstUserMessage = userMessages[0];
      let originalTask = "Unknown task";
      if (firstUserMessage) {
        if (typeof firstUserMessage.content === "string") {
          originalTask = firstUserMessage.content;
        } else if (firstUserMessage.content?.parts?.[0]?.type === "text") {
          originalTask = firstUserMessage.content.parts[0].text;
        }
      }
      const toolCalls = inputData.output.toolCalls || [];
      const toolResults = inputData.output.toolResults || [];
      const isTaskCompleteContext = {
        iteration: currentIteration,
        maxIterations: maxSteps,
        originalTask,
        currentText: inputData.output.text || "",
        toolCalls: toolCalls.map((tc) => ({
          name: tc.toolName,
          args: tc.args || {}
        })),
        messages: messageList.get.all.db(),
        toolResults: toolResults.map((tr) => ({
          name: tr.toolName,
          result: tr.result
        })),
        agentId: agentId || "",
        agentName: agentName || "",
        runId,
        threadId: _internal?.threadId,
        resourceId: _internal?.resourceId,
        customContext: requestContext ? Object.fromEntries(requestContext.entries()) : void 0
      };
      const isTaskCompleteResult = await runStreamCompletionScorers(
        isTaskComplete.scorers,
        isTaskCompleteContext,
        {
          strategy: isTaskComplete.strategy,
          parallel: isTaskComplete.parallel,
          timeout: isTaskComplete.timeout
        }
      );
      if (isTaskComplete.onComplete) {
        await isTaskComplete.onComplete(isTaskCompleteResult);
      }
      if (isTaskCompleteResult.complete) {
        if (inputData.stepResult) {
          inputData.stepResult.isContinued = false;
        }
      } else {
        if (inputData.stepResult) {
          inputData.stepResult.isContinued = true;
        }
      }
      const maxIterationReached = maxSteps ? currentIteration >= maxSteps : false;
      const feedback = formatStreamCompletionFeedback(isTaskCompleteResult, maxIterationReached);
      messageList.add(
        {
          id: mastra?.generateId(),
          createdAt: /* @__PURE__ */ new Date(),
          type: "text",
          role: "assistant",
          content: {
            parts: [
              {
                type: "text",
                text: feedback
              }
            ],
            metadata: {
              mode: "stream",
              completionResult: {
                passed: isTaskCompleteResult.complete,
                suppressFeedback: !!isTaskComplete.suppressFeedback
              }
            },
            format: 2
          }
        },
        "response"
      );
      controller.enqueue({
        type: "is-task-complete",
        runId,
        from: "AGENT" /* AGENT */,
        payload: {
          iteration: currentIteration,
          passed: isTaskCompleteResult.complete,
          results: isTaskCompleteResult.scorers,
          duration: isTaskCompleteResult.totalDuration,
          timedOut: isTaskCompleteResult.timedOut,
          reason: isTaskCompleteResult.completionReason,
          maxIterationReached: !!maxIterationReached,
          suppressFeedback: !!isTaskComplete.suppressFeedback
        }
      });
      return { ...inputData, isTaskCompleteCheckFailed: !isTaskCompleteResult.complete };
    }
  });
}

// src/processors/processors/prepare-step.ts
var PrepareStepProcessor = class {
  id = "prepare-step";
  name = "Prepare Step Processor";
  prepareStep;
  constructor(options) {
    this.prepareStep = options.prepareStep;
  }
  async processInputStep(args) {
    return this.prepareStep(args);
  }
};

// src/stream/aisdk/v5/input.ts
function isNumericId(id) {
  return /^\d+$/.test(id);
}
var AISDKV5InputStream = class extends MastraModelInput {
  #generateId;
  constructor({
    component,
    name,
    generateId: generateId2
  }) {
    super({ component, name });
    this.#generateId = generateId2 ?? generateId;
  }
  async transform({
    runId,
    stream,
    controller
  }) {
    const idMap = /* @__PURE__ */ new Map();
    for await (const chunk of stream) {
      const rawChunk = chunk;
      if (rawChunk.type === "stream-start") {
        idMap.clear();
      }
      const transformedChunk = convertFullStreamChunkToMastra(rawChunk, { runId });
      if (transformedChunk) {
        if ((transformedChunk.type === "text-start" || transformedChunk.type === "text-delta" || transformedChunk.type === "text-end") && transformedChunk.payload?.id && isNumericId(transformedChunk.payload.id)) {
          const originalId = transformedChunk.payload.id;
          if (!idMap.has(originalId)) {
            idMap.set(originalId, this.#generateId());
          }
          transformedChunk.payload.id = idMap.get(originalId);
        }
        safeEnqueue(controller, transformedChunk);
      }
    }
  }
};

// src/stream/aisdk/v5/execute.ts
function omit(obj, keys) {
  const newObj = { ...obj };
  for (const key of keys) {
    delete newObj[key];
  }
  return newObj;
}
function execute({
  runId,
  model,
  providerOptions,
  inputMessages,
  tools,
  toolChoice,
  activeTools,
  options,
  onResult,
  includeRawChunks,
  modelSettings,
  structuredOutput,
  headers,
  shouldThrowError,
  methodType,
  generateId: generateId2
}) {
  const v5 = new AISDKV5InputStream({
    component: "LLM",
    name: model.modelId,
    generateId: generateId2
  });
  const targetVersion = model.specificationVersion === "v3" ? "v3" : "v2";
  const toolsAndToolChoice = prepareToolsAndToolChoice({
    tools,
    toolChoice,
    activeTools,
    targetVersion
  });
  const structuredOutputMode = structuredOutput?.schema ? structuredOutput?.model ? "processor" : "direct" : void 0;
  const responseFormat = structuredOutput?.schema ? getResponseFormat(structuredOutput?.schema) : void 0;
  let prompt = inputMessages;
  if (structuredOutputMode === "direct" && responseFormat?.type === "json" && structuredOutput?.jsonPromptInjection) {
    prompt = injectJsonInstructionIntoMessages({
      messages: inputMessages,
      schema: responseFormat.schema
    });
  }
  if (structuredOutputMode === "processor" && responseFormat?.type === "json" && responseFormat?.schema) {
    prompt = injectJsonInstructionIntoMessages({
      messages: inputMessages,
      schema: responseFormat.schema,
      schemaPrefix: `Your response will be processed by another agent to extract structured data. Please ensure your response contains comprehensive information for all the following fields that will be extracted:
`,
      schemaSuffix: `

You don't need to format your response as JSON unless the user asks you to. Just ensure your natural language response includes relevant information for each field in the schema above.`
    });
  }
  const isOpenAIStrictMode = model.provider.startsWith("openai") && responseFormat?.type === "json" && !structuredOutput?.jsonPromptInjection;
  if (isOpenAIStrictMode && responseFormat?.schema) {
    responseFormat.schema = prepareJsonSchemaForOpenAIStrictMode(responseFormat.schema);
  }
  const providerOptionsToUse = isOpenAIStrictMode ? {
    ...providerOptions ?? {},
    openai: {
      strictJsonSchema: true,
      ...providerOptions?.openai ?? {}
    }
  } : providerOptions;
  const stream = v5.initialize({
    runId,
    onResult,
    createStream: async () => {
      try {
        const filteredModelSettings = omit(modelSettings || {}, ["maxRetries", "headers"]);
        const abortSignal = options?.abortSignal;
        const pRetry = await import('./index3.mjs');
        return await pRetry.default(
          async () => {
            const fn = (methodType === "stream" ? model.doStream : model.doGenerate).bind(model);
            const streamResult = await fn({
              ...toolsAndToolChoice,
              prompt,
              providerOptions: providerOptionsToUse,
              abortSignal,
              includeRawChunks,
              responseFormat: structuredOutputMode === "direct" && !structuredOutput?.jsonPromptInjection ? responseFormat : void 0,
              ...filteredModelSettings,
              headers
            });
            return streamResult;
          },
          {
            retries: modelSettings?.maxRetries ?? 2,
            signal: abortSignal,
            shouldRetry(context) {
              if (APICallError.isInstance(context.error)) {
                return context.error.isRetryable;
              }
              return true;
            }
          }
        );
      } catch (error) {
        if (shouldThrowError) {
          throw error;
        }
        return {
          stream: new ReadableStream({
            start: async (controller) => {
              controller.enqueue({
                type: "error",
                error
              });
              controller.close();
            }
          }),
          warnings: [],
          request: {},
          rawResponse: {}
        };
      }
    }
  });
  return stream;
}

// src/stream/aisdk/v5/output-helpers.ts
var DefaultStepResult = class {
  content;
  finishReason;
  usage;
  warnings;
  request;
  response;
  providerMetadata;
  /** Tripwire data if this step was rejected by a processor */
  tripwire;
  constructor({
    content,
    finishReason,
    usage,
    warnings,
    request,
    response,
    providerMetadata,
    tripwire
  }) {
    this.content = content;
    this.finishReason = finishReason;
    this.usage = usage;
    this.warnings = warnings;
    this.request = request;
    this.response = response;
    this.providerMetadata = providerMetadata;
    this.tripwire = tripwire;
  }
  get text() {
    if (this.tripwire) {
      return "";
    }
    return this.content.filter((part) => part.type === "text").map((part) => part.text).join("");
  }
  get reasoning() {
    return this.content.filter((part) => part.type === "reasoning");
  }
  get reasoningText() {
    return this.reasoning.length === 0 ? void 0 : this.reasoning.map((part) => part.text).join("");
  }
  get files() {
    return this.content.filter((part) => part.type === "file").map((part) => part.file);
  }
  get sources() {
    return this.content.filter((part) => part.type === "source");
  }
  get toolCalls() {
    return this.content.filter((part) => part.type === "tool-call");
  }
  get staticToolCalls() {
    return this.toolCalls.filter((toolCall) => toolCall.dynamic === false);
  }
  get dynamicToolCalls() {
    return this.toolCalls.filter((toolCall) => toolCall.dynamic === true);
  }
  get toolResults() {
    return this.content.filter((part) => part.type === "tool-result");
  }
  get staticToolResults() {
    return this.toolResults.filter((toolResult) => toolResult.dynamic === false);
  }
  get dynamicToolResults() {
    return this.toolResults.filter((toolResult) => toolResult.dynamic === true);
  }
};

// src/tools/provider-tool-utils.ts
function findProviderToolByName(tools, toolName) {
  if (!tools) return void 0;
  return Object.values(tools).find(
    (t) => isProviderTool(t) && (getProviderToolName(t.id) === toolName || t.name === toolName)
  );
}
function inferProviderExecuted(providerExecuted, tool2) {
  if (providerExecuted !== void 0) return providerExecuted;
  return isProviderTool(tool2) ? true : void 0;
}

// src/loop/workflows/run-state.ts
var AgenticRunState = class {
  #state;
  constructor({ _internal, model }) {
    this.#state = {
      responseMetadata: {
        id: _internal?.generateId?.(),
        timestamp: _internal?.currentDate?.(),
        modelId: model.modelId,
        modelVersion: model.specificationVersion,
        modelProvider: model.provider,
        headers: void 0
      },
      modelMetadata: {
        modelId: model.modelId,
        modelVersion: model.specificationVersion,
        modelProvider: model.provider
      },
      isReasoning: false,
      isStreaming: false,
      providerOptions: void 0,
      hasToolCallStreaming: false,
      hasErrored: false,
      apiError: void 0,
      deferredErrorChunk: void 0,
      reasoningBuffers: /* @__PURE__ */ new Map(),
      textDeltas: [],
      stepResult: void 0
    };
  }
  setState(state) {
    this.#state = {
      ...this.#state,
      ...state
    };
  }
  get state() {
    return this.#state;
  }
};

// src/loop/workflows/agentic-execution/llm-execution-step.ts
function buildResponseModelMetadata(runState) {
  const modelId = runState.state.responseMetadata?.modelId;
  return modelId ? { metadata: { modelId } } : void 0;
}
function flushReasoningBuffer({
  buffer,
  messageId,
  messageList,
  runState
}) {
  const message = {
    id: messageId,
    role: "assistant",
    content: {
      format: 2,
      parts: [
        {
          type: "reasoning",
          reasoning: "",
          details: [{ type: "text", text: buffer.deltas.join("") }],
          providerMetadata: buffer.providerMetadata
        }
      ],
      ...buildResponseModelMetadata(runState)
    },
    createdAt: /* @__PURE__ */ new Date()
  };
  messageList.add(message, "response");
}
async function processOutputStream({
  tools,
  messageId,
  messageList,
  outputStream,
  runState,
  options,
  controller,
  responseFromModel,
  includeRawChunks,
  logger,
  transportRef,
  transportResolver
}) {
  let transportSet = false;
  for await (const chunk of outputStream._getBaseStream()) {
    if (options?.abortSignal?.aborted) {
      break;
    }
    if (!chunk) {
      continue;
    }
    if (!transportSet && transportRef && transportResolver) {
      const transport = transportResolver();
      if (transport) {
        transportRef.current = transport;
        transportSet = true;
      }
    }
    if (chunk.type == "object" || chunk.type == "object-result") {
      controller.enqueue(chunk);
      continue;
    }
    if (chunk.type !== "text-delta" && // not 100% sure about this being the right fix.
    // basically for some llm providers they add response-metadata after each text-delta
    // we then flush the chunks by calling messageList.add (a few lines down)
    // this results in a bunch of weird separated text chunks on the message instead of combined chunks
    // easiest solution here is to just not flush for response-metadata
    // BUT does this cause other issues?
    // Alternative solution: in message list allow combining text deltas together when the message source is "response" and the text parts are directly next to each other
    // simple solution for now is to not flush text deltas on response-metadata
    chunk.type !== "response-metadata" && // Don't flush on source chunks - OpenAI web search interleaves source citations
    // with text-deltas, all sharing the same itemId. Flushing creates multiple parts
    // with duplicate itemIds, causing "Duplicate item found" errors on the next request.
    chunk.type !== "source" && runState.state.isStreaming) {
      if (runState.state.textDeltas.length) {
        const textStartPayload = chunk.payload;
        const providerMetadata = textStartPayload.providerMetadata ?? runState.state.providerOptions;
        const message = {
          id: messageId,
          role: "assistant",
          content: {
            format: 2,
            parts: [
              {
                type: "text",
                text: runState.state.textDeltas.join(""),
                ...providerMetadata ? { providerMetadata } : {}
              }
            ],
            ...buildResponseModelMetadata(runState)
          },
          createdAt: /* @__PURE__ */ new Date()
        };
        messageList.add(message, "response");
      }
      runState.setState({
        isStreaming: false,
        textDeltas: []
      });
    }
    if (chunk.type !== "reasoning-start" && chunk.type !== "reasoning-delta" && chunk.type !== "reasoning-end" && chunk.type !== "redacted-reasoning" && chunk.type !== "reasoning-signature" && chunk.type !== "response-metadata" && chunk.type !== "text-start" && runState.state.isReasoning) {
      for (const buffer of runState.state.reasoningBuffers.values()) {
        flushReasoningBuffer({
          buffer,
          messageId,
          messageList,
          runState
        });
      }
      runState.setState({
        isReasoning: false,
        reasoningBuffers: /* @__PURE__ */ new Map(),
        providerOptions: void 0
      });
    }
    switch (chunk.type) {
      case "response-metadata":
        runState.setState({
          responseMetadata: {
            id: chunk.payload.id,
            timestamp: chunk.payload.timestamp,
            modelId: chunk.payload.modelId,
            headers: chunk.payload.headers
          }
        });
        break;
      case "text-start": {
        if (chunk.payload.providerMetadata) {
          runState.setState({
            providerOptions: chunk.payload.providerMetadata
          });
        }
        safeEnqueue(controller, chunk);
        break;
      }
      case "text-delta": {
        const textDeltasFromState = runState.state.textDeltas;
        textDeltasFromState.push(chunk.payload.text);
        runState.setState({
          textDeltas: textDeltasFromState,
          isStreaming: true
        });
        safeEnqueue(controller, chunk);
        break;
      }
      case "text-end": {
        runState.setState({
          providerOptions: void 0
        });
        safeEnqueue(controller, chunk);
        break;
      }
      case "tool-call-input-streaming-start": {
        const tool2 = tools?.[chunk.payload.toolName] || Object.values(tools || {})?.find((tool3) => `id` in tool3 && tool3.id === chunk.payload.toolName);
        if (tool2 && "onInputStart" in tool2) {
          try {
            await tool2?.onInputStart?.({
              toolCallId: chunk.payload.toolCallId,
              messages: messageList.get.input.aiV5.model(),
              abortSignal: options?.abortSignal
            });
          } catch (error) {
            logger?.error("Error calling onInputStart", error);
          }
        }
        safeEnqueue(controller, chunk);
        break;
      }
      case "tool-call-delta": {
        const tool2 = tools?.[chunk.payload.toolName || ""] || Object.values(tools || {})?.find((tool3) => `id` in tool3 && tool3.id === chunk.payload.toolName);
        if (tool2 && "onInputDelta" in tool2) {
          try {
            await tool2?.onInputDelta?.({
              inputTextDelta: chunk.payload.argsTextDelta,
              toolCallId: chunk.payload.toolCallId,
              messages: messageList.get.input.aiV5.model(),
              abortSignal: options?.abortSignal
            });
          } catch (error) {
            logger?.error("Error calling onInputDelta", error);
          }
        }
        safeEnqueue(controller, chunk);
        break;
      }
      case "tool-call-input-streaming-end": {
        safeEnqueue(controller, chunk);
        break;
      }
      case "reasoning-start": {
        const reasoningBuffers = new Map(runState.state.reasoningBuffers);
        reasoningBuffers.set(chunk.payload.id, {
          deltas: reasoningBuffers.get(chunk.payload.id)?.deltas ?? [],
          providerMetadata: chunk.payload.providerMetadata ?? reasoningBuffers.get(chunk.payload.id)?.providerMetadata
        });
        runState.setState({
          isReasoning: true,
          reasoningBuffers,
          providerOptions: chunk.payload.providerMetadata ?? runState.state.providerOptions
        });
        if (Object.values(chunk.payload.providerMetadata || {}).find((v) => v?.redactedData)) {
          const message = {
            id: messageId,
            role: "assistant",
            content: {
              format: 2,
              parts: [
                {
                  type: "reasoning",
                  reasoning: "",
                  details: [{ type: "redacted", data: "" }],
                  providerMetadata: chunk.payload.providerMetadata ?? runState.state.providerOptions
                }
              ],
              ...buildResponseModelMetadata(runState)
            },
            createdAt: /* @__PURE__ */ new Date()
          };
          messageList.add(message, "response");
          safeEnqueue(controller, chunk);
          break;
        }
        safeEnqueue(controller, chunk);
        break;
      }
      case "reasoning-delta": {
        const reasoningBuffers = new Map(runState.state.reasoningBuffers);
        const existingBuffer = reasoningBuffers.get(chunk.payload.id);
        const buffer = {
          deltas: [...existingBuffer?.deltas ?? [], chunk.payload.text],
          providerMetadata: chunk.payload.providerMetadata ?? existingBuffer?.providerMetadata
        };
        reasoningBuffers.set(chunk.payload.id, buffer);
        runState.setState({
          isReasoning: true,
          reasoningBuffers,
          providerOptions: chunk.payload.providerMetadata ?? runState.state.providerOptions
        });
        safeEnqueue(controller, chunk);
        break;
      }
      case "reasoning-end": {
        if (!runState.state.isReasoning) {
          safeEnqueue(controller, chunk);
          break;
        }
        const reasoningBuffers = new Map(runState.state.reasoningBuffers);
        const buffer = reasoningBuffers.get(chunk.payload.id);
        if (!buffer) {
          safeEnqueue(controller, chunk);
          break;
        }
        flushReasoningBuffer({
          buffer: {
            deltas: buffer.deltas,
            providerMetadata: chunk.payload.providerMetadata ?? buffer.providerMetadata
          },
          messageId,
          messageList,
          runState
        });
        reasoningBuffers.delete(chunk.payload.id);
        const nextProviderOptions = Array.from(reasoningBuffers.values()).at(-1)?.providerMetadata;
        runState.setState({
          isReasoning: reasoningBuffers.size > 0,
          reasoningBuffers,
          providerOptions: nextProviderOptions
        });
        safeEnqueue(controller, chunk);
        break;
      }
      case "file":
        {
          const message = {
            id: messageId,
            role: "assistant",
            content: {
              format: 2,
              parts: [
                {
                  type: "file",
                  // @ts-expect-error - data type mismatch, see TODO
                  data: chunk.payload.data,
                  // TODO: incorrect string type
                  mimeType: chunk.payload.mimeType,
                  ...chunk.payload.providerMetadata ? { providerMetadata: chunk.payload.providerMetadata } : {}
                }
              ],
              ...buildResponseModelMetadata(runState)
            },
            createdAt: /* @__PURE__ */ new Date()
          };
          messageList.add(message, "response");
          safeEnqueue(controller, chunk);
        }
        break;
      case "source":
        {
          const message = {
            id: messageId,
            role: "assistant",
            content: {
              format: 2,
              parts: [
                {
                  type: "source",
                  source: {
                    sourceType: "url",
                    id: chunk.payload.id,
                    url: chunk.payload.url || "",
                    title: chunk.payload.title,
                    providerMetadata: chunk.payload.providerMetadata
                  }
                }
              ],
              ...buildResponseModelMetadata(runState)
            },
            createdAt: /* @__PURE__ */ new Date()
          };
          messageList.add(message, "response");
          safeEnqueue(controller, chunk);
        }
        break;
      case "finish":
        runState.setState({
          providerOptions: chunk.payload.metadata?.providerMetadata ?? chunk.payload.providerMetadata,
          stepResult: {
            reason: chunk.payload.reason,
            logprobs: chunk.payload.logprobs,
            warnings: responseFromModel.warnings,
            totalUsage: chunk.payload.totalUsage,
            headers: responseFromModel.rawResponse?.headers,
            messageId,
            isContinued: !["stop", "error", "length"].includes(chunk.payload.stepResult.reason),
            request: responseFromModel.request
          }
        });
        break;
      case "error":
        if (isAbortError(chunk.payload.error) && options?.abortSignal?.aborted) {
          break;
        }
        runState.setState({
          hasErrored: true,
          apiError: chunk.payload.error
        });
        runState.setState({
          stepResult: {
            isContinued: false,
            reason: "error"
          }
        });
        runState.setState({
          deferredErrorChunk: chunk
        });
        break;
      // Provider-executed tool results (e.g. web_search). Client tool results
      // are handled by llm-mapping-step after execution.
      case "tool-result": {
        if (chunk.payload.result != null) {
          const resultToolDef = tools?.[chunk.payload.toolName] || findProviderToolByName(tools, chunk.payload.toolName);
          messageList.updateToolInvocation({
            type: "tool-invocation",
            toolInvocation: {
              state: "result",
              toolCallId: chunk.payload.toolCallId,
              toolName: chunk.payload.toolName,
              args: chunk.payload.args,
              result: chunk.payload.result
            },
            providerMetadata: chunk.payload.providerMetadata,
            providerExecuted: inferProviderExecuted(chunk.payload.providerExecuted, resultToolDef)
          });
        }
        safeEnqueue(controller, chunk);
        break;
      }
      case "tool-call": {
        const toolDef = tools?.[chunk.payload.toolName] || findProviderToolByName(tools, chunk.payload.toolName);
        const inferredProviderExecuted = inferProviderExecuted(chunk.payload.providerExecuted, toolDef);
        const toolCallPart = {
          type: "tool-invocation",
          toolInvocation: {
            state: "call",
            toolCallId: chunk.payload.toolCallId,
            toolName: chunk.payload.toolName,
            args: chunk.payload.args
          },
          providerMetadata: chunk.payload.providerMetadata,
          providerExecuted: inferredProviderExecuted
        };
        const message = {
          id: messageId,
          role: "assistant",
          content: {
            format: 2,
            parts: [toolCallPart],
            ...buildResponseModelMetadata(runState)
          },
          createdAt: /* @__PURE__ */ new Date()
        };
        messageList.add(message, "response");
        safeEnqueue(controller, chunk);
        break;
      }
      default:
        safeEnqueue(controller, chunk);
    }
    if ([
      "text-delta",
      "reasoning-delta",
      "source",
      "tool-call",
      "tool-call-input-streaming-start",
      "tool-call-delta",
      "tool-call-input-streaming-end",
      "raw"
    ].includes(chunk.type)) {
      if (chunk.type === "raw" && !includeRawChunks) {
        continue;
      }
      await options?.onChunk?.(chunk);
    }
    if (runState.state.hasErrored) {
      break;
    }
  }
}
function executeStreamWithFallbackModels(models, logger, startIndex = 0) {
  return async (callback) => {
    let index = startIndex;
    let finalResult;
    let done = false;
    let lastError;
    for (const modelConfig of models.slice(startIndex)) {
      index++;
      if (done) {
        break;
      }
      try {
        const isLastModel = index === models.length;
        const result = await callback(modelConfig, isLastModel);
        finalResult = result;
        done = true;
      } catch (err) {
        if (err instanceof TripWire) {
          throw err;
        }
        lastError = err;
        logger?.error(`Error executing model ${modelConfig.model.modelId}`, err);
      }
    }
    if (typeof finalResult === "undefined") {
      const lastErrMsg = lastError instanceof Error ? lastError.message : String(lastError);
      const errorMessage = `Exhausted all fallback models. Last error: ${lastErrMsg}`;
      logger?.error(errorMessage);
      throw new Error(errorMessage, { cause: lastError });
    }
    return finalResult;
  };
}
function createLLMExecutionStep({
  models,
  _internal,
  messageId: messageIdPassed,
  runId,
  tools,
  toolChoice,
  activeTools,
  messageList,
  includeRawChunks,
  modelSettings,
  providerOptions,
  options,
  toolCallStreaming,
  controller,
  structuredOutput,
  outputProcessors,
  inputProcessors,
  errorProcessors,
  logger,
  agentId,
  downloadRetries,
  downloadConcurrency,
  processorStates,
  requestContext,
  methodType,
  modelSpanTracker,
  autoResumeSuspendedTools,
  maxProcessorRetries,
  workspace,
  outputWriter
}) {
  const initialSystemMessages = messageList.getAllSystemMessages();
  let currentIteration = 0;
  return createStep({
    id: "llm-execution",
    inputSchema: llmIterationOutputSchema,
    outputSchema: llmIterationOutputSchema,
    execute: async ({ inputData, bail, tracingContext }) => {
      currentIteration++;
      if (currentIteration > 1) {
        messageList.stepStart();
      }
      let currentMessageId = inputData.isTaskCompleteCheckFailed ? `${messageIdPassed}-${currentIteration}` : inputData.messageId || messageIdPassed;
      modelSpanTracker?.startStep();
      let modelResult;
      let warnings;
      let request;
      let rawResponse;
      let activeFallbackModelIndex = inputData.fallbackModelIndex || 0;
      const maxErrorProcessorRetries = maxProcessorRetries ?? (errorProcessors?.length ? 10 : void 0);
      const { outputStream, callBail, runState, stepTools, stepWorkspace, processAPIErrorRetry } = await executeStreamWithFallbackModels(
        models,
        logger,
        activeFallbackModelIndex
      )(async (modelConfig, isLastModel) => {
        activeFallbackModelIndex = models.findIndex((candidate) => candidate.id === modelConfig.id);
        const model = modelConfig.model;
        const modelHeaders = modelConfig.headers;
        if (initialSystemMessages) {
          messageList.replaceAllSystemMessages(initialSystemMessages);
        }
        if (inputData.processorRetryFeedback) {
          messageList.addSystem(inputData.processorRetryFeedback, "processor-retry-feedback");
        }
        const currentStep = {
          messageId: currentMessageId,
          model,
          tools,
          toolChoice,
          activeTools,
          providerOptions,
          modelSettings,
          structuredOutput,
          workspace
        };
        const inputStepProcessors = [
          ...inputProcessors || [],
          ...options?.prepareStep ? [new PrepareStepProcessor({ prepareStep: options.prepareStep })] : []
        ];
        if (inputStepProcessors && inputStepProcessors.length > 0) {
          const processorRunner = new ProcessorRunner({
            inputProcessors: inputStepProcessors,
            outputProcessors: [],
            logger: logger || new ConsoleLogger({ level: "error" }),
            agentName: agentId || "unknown",
            processorStates
          });
          try {
            const stepTracingContext = modelSpanTracker?.getTracingContext() ?? tracingContext;
            const inputStepWriter = outputWriter ? { custom: async (data) => outputWriter(data) } : void 0;
            const processInputStepResult = await processorRunner.runProcessInputStep({
              messageList,
              stepNumber: inputData.output?.steps?.length || 0,
              ...createObservabilityContext(stepTracingContext),
              requestContext,
              model,
              steps: inputData.output?.steps || [],
              messageId: currentStep.messageId,
              rotateResponseMessageId: () => {
                currentMessageId = _internal?.generateId?.() ?? generateId();
                currentStep.messageId = currentMessageId;
                return currentMessageId;
              },
              tools,
              toolChoice,
              activeTools,
              providerOptions,
              modelSettings,
              structuredOutput,
              retryCount: inputData.processorRetryCount || 0,
              writer: inputStepWriter,
              abortSignal: options?.abortSignal
            });
            Object.assign(currentStep, processInputStepResult);
            const modelChanged = processInputStepResult.model && processInputStepResult.model !== model;
            const modelSettingsChanged = processInputStepResult.modelSettings && processInputStepResult.modelSettings !== modelSettings;
            if (modelSpanTracker && (modelChanged || modelSettingsChanged)) {
              modelSpanTracker.updateGeneration({
                ...modelChanged ? { name: `llm: '${currentStep.model.modelId}'` } : {},
                attributes: {
                  ...modelChanged ? {
                    model: currentStep.model.modelId,
                    provider: currentStep.model.provider
                  } : {},
                  ...modelSettingsChanged ? { parameters: currentStep.modelSettings } : {}
                }
              });
            }
            const toolsChanged = processInputStepResult.tools && processInputStepResult.tools !== tools;
            const activeToolsChanged = processInputStepResult.activeTools && processInputStepResult.activeTools !== activeTools;
            if (toolsChanged || activeToolsChanged) {
              const agentSpan = tracingContext?.currentSpan?.findParent("agent_run" /* AGENT_RUN */);
              if (agentSpan) {
                const toolNames = activeToolsChanged ? processInputStepResult.activeTools : currentStep.tools ? Object.keys(currentStep.tools) : void 0;
                if (toolNames !== void 0) {
                  agentSpan.update({
                    attributes: {
                      availableTools: toolNames
                    }
                  });
                }
              }
            }
            if (processInputStepResult.tools && currentStep.tools) {
              const convertedTools = {};
              for (const [name, tool2] of Object.entries(currentStep.tools)) {
                if (isMastraTool(tool2)) {
                  convertedTools[name] = makeCoreTool(
                    tool2,
                    {
                      name,
                      runId,
                      threadId: _internal?.threadId,
                      resourceId: _internal?.resourceId,
                      logger,
                      agentName: agentId,
                      requestContext: requestContext || new RequestContext(),
                      outputWriter,
                      workspace: currentStep.workspace
                    },
                    void 0,
                    autoResumeSuspendedTools
                  );
                } else {
                  convertedTools[name] = tool2;
                }
              }
              currentStep.tools = convertedTools;
            }
          } catch (error) {
            if (error instanceof TripWire) {
              logger?.warn("Streaming input processor tripwire triggered", {
                reason: error.message,
                processorId: error.processorId,
                retry: error.options?.retry
              });
              safeEnqueue(controller, {
                type: "tripwire",
                runId,
                from: "AGENT" /* AGENT */,
                payload: {
                  reason: error.message,
                  retry: error.options?.retry,
                  metadata: error.options?.metadata,
                  processorId: error.processorId
                }
              });
              const runState3 = new AgenticRunState({
                _internal,
                model
              });
              return {
                callBail: true,
                outputStream: new MastraModelOutput({
                  model: {
                    modelId: model.modelId,
                    provider: model.provider,
                    version: model.specificationVersion
                  },
                  stream: new ReadableStream$1({
                    start(c) {
                      c.close();
                    }
                  }),
                  messageList,
                  messageId: currentStep.messageId,
                  options: { runId }
                }),
                runState: runState3,
                stepTools: tools
              };
            }
            logger?.error("Error in processInputStep processors:", error);
            throw error;
          }
        }
        if (_internal) {
          _internal.stepActiveTools = currentStep.activeTools;
        }
        const runState2 = new AgenticRunState({
          _internal,
          model: currentStep.model
        });
        let resolvedSupportedUrls;
        const modelSupportedUrls = currentStep.model?.supportedUrls;
        if (modelSupportedUrls) {
          if (typeof modelSupportedUrls.then === "function") {
            resolvedSupportedUrls = await modelSupportedUrls;
          } else {
            resolvedSupportedUrls = modelSupportedUrls;
          }
        }
        const messageListPromptArgs = {
          downloadRetries,
          downloadConcurrency,
          supportedUrls: resolvedSupportedUrls
        };
        let inputMessages = await messageList.get.all.aiV5.llmPrompt(messageListPromptArgs);
        if (autoResumeSuspendedTools) {
          const messages2 = messageList.get.all.db();
          const assistantMessages = [...messages2].reverse().filter((message) => message.role === "assistant");
          const suspendedToolsMessage = assistantMessages.find((message) => {
            const pendingOrSuspendedTools = message.content.metadata?.suspendedTools || message.content.metadata?.pendingToolApprovals;
            if (pendingOrSuspendedTools) {
              return true;
            }
            const dataToolSuspendedParts = message.content.parts?.filter(
              (part) => (part.type === "data-tool-call-suspended" || part.type === "data-tool-call-approval") && !part.data.resumed
            );
            if (dataToolSuspendedParts && dataToolSuspendedParts.length > 0) {
              return true;
            }
            return false;
          });
          if (suspendedToolsMessage) {
            const metadata = suspendedToolsMessage.content.metadata;
            let suspendedToolObj = metadata?.suspendedTools || metadata?.pendingToolApprovals;
            if (!suspendedToolObj) {
              suspendedToolObj = suspendedToolsMessage.content.parts?.filter((part) => part.type === "data-tool-call-suspended" || part.type === "data-tool-call-approval")?.reduce(
                (acc, part) => {
                  if ((part.type === "data-tool-call-suspended" || part.type === "data-tool-call-approval") && !part.data.resumed) {
                    acc[part.data.toolName] = part.data;
                  }
                  return acc;
                },
                {}
              );
            }
            const suspendedTools = Object.values(suspendedToolObj);
            if (suspendedTools.length > 0) {
              inputMessages = inputMessages.map((message, index) => {
                if (message.role === "system" && index === 0) {
                  message.content = message.content + `

Analyse the suspended tools: ${JSON.stringify(suspendedTools)}, using the messages available to you and the resumeSchema of each suspended tool, find the tool whose resumeData you can construct properly.
                      resumeData can not be an empty object nor null/undefined.
                      When you find that and call that tool, add the resumeData to the tool call arguments/input.
                      Also, add the runId of the suspended tool as suspendedToolRunId to the tool call arguments/input.
                      If the suspendedTool.type is 'approval', resumeData will be an object that contains 'approved' which can either be true or false depending on the user's message. If you can't construct resumeData from the message for approval type, set approved to true and add resumeData: { approved: true } to the tool call arguments/input.

                      IMPORTANT: If you're able to construct resumeData and get suspendedToolRunId, get the previous arguments/input of the tool call from args in the suspended tool, and spread it in the new arguments/input created, do not add duplicate data. 
                      `;
                }
                return message;
              });
            }
          }
        }
        if (isSupportedLanguageModel(currentStep.model)) {
          modelResult = executeWithContextSync({
            span: modelSpanTracker?.getTracingContext()?.currentSpan,
            fn: () => execute({
              runId,
              model: currentStep.model,
              providerOptions: currentStep.providerOptions,
              inputMessages,
              tools: currentStep.tools,
              toolChoice: currentStep.toolChoice,
              activeTools: currentStep.activeTools,
              options,
              // Per-model maxRetries takes precedence over global modelSettings.maxRetries
              // This ensures p-retry uses the correct retry count for each model in the fallback chain
              modelSettings: { ...currentStep.modelSettings, maxRetries: modelConfig.maxRetries },
              includeRawChunks,
              structuredOutput: currentStep.structuredOutput,
              // Merge headers: memory context first, then modelConfig headers, then modelSettings overrides
              // x-thread-id / x-resource-id enable server-side memory enrichment (e.g. Memory Gateway)
              headers: (() => {
                const memoryHeaders = {};
                if (_internal?.threadId) memoryHeaders["x-thread-id"] = _internal.threadId;
                if (_internal?.resourceId) memoryHeaders["x-resource-id"] = _internal.resourceId;
                const merged = {
                  ...memoryHeaders,
                  ...modelHeaders,
                  ...currentStep.modelSettings?.headers
                };
                return Object.keys(merged).length > 0 ? merged : void 0;
              })(),
              methodType,
              generateId: _internal?.generateId,
              onResult: ({
                warnings: warningsFromStream,
                request: requestFromStream,
                rawResponse: rawResponseFromStream
              }) => {
                warnings = warningsFromStream;
                request = requestFromStream || {};
                rawResponse = rawResponseFromStream;
                safeEnqueue(controller, {
                  runId,
                  from: "AGENT" /* AGENT */,
                  type: "step-start",
                  payload: {
                    request: request || {},
                    warnings: warnings || [],
                    messageId: currentStep.messageId
                  }
                });
              },
              shouldThrowError: !isLastModel
            })
          });
        } else {
          throw new Error(
            `Unsupported model version: ${currentStep.model.specificationVersion}. Supported versions: ${supportedLanguageModelSpecifications.join(", ")}`
          );
        }
        const outputStream2 = new MastraModelOutput({
          model: {
            modelId: currentStep.model.modelId,
            provider: currentStep.model.provider,
            version: currentStep.model.specificationVersion
          },
          stream: modelResult,
          messageList,
          messageId: currentStep.messageId,
          options: {
            runId,
            toolCallStreaming,
            includeRawChunks,
            structuredOutput: currentStep.structuredOutput,
            outputProcessors,
            isLLMExecutionStep: true,
            tracingContext,
            processorStates,
            requestContext
          }
        });
        let transportResolver;
        if (currentStep.model instanceof ModelRouterLanguageModel) {
          const routerModel = currentStep.model;
          transportResolver = () => routerModel._getStreamTransport();
        }
        try {
          await processOutputStream({
            outputStream: outputStream2,
            includeRawChunks,
            tools: currentStep.tools,
            messageId: currentStep.messageId,
            messageList,
            runState: runState2,
            options,
            controller,
            responseFromModel: {
              warnings,
              request,
              rawResponse
            },
            logger,
            transportRef: _internal?.transportRef,
            transportResolver
          });
        } catch (error) {
          const provider = model?.provider;
          const modelIdStr = model?.modelId;
          const isUpstreamError = APICallError.isInstance(error);
          if (isUpstreamError) {
            const providerInfo = provider ? ` from ${provider}` : "";
            const modelInfo = modelIdStr ? ` (model: ${modelIdStr})` : "";
            logger?.error(`Upstream LLM API error${providerInfo}${modelInfo}`, {
              error,
              runId,
              ...provider && { provider },
              ...modelIdStr && { modelId: modelIdStr }
            });
          } else {
            logger?.error("Error in LLM execution", {
              error,
              runId,
              ...provider && { provider },
              ...modelIdStr && { modelId: modelIdStr }
            });
          }
          if (isAbortError(error) && options?.abortSignal?.aborted) {
            await options?.onAbort?.({
              steps: inputData?.output?.steps ?? []
            });
            safeEnqueue(controller, { type: "abort", runId, from: "AGENT" /* AGENT */, payload: {} });
            return { callBail: true, outputStream: outputStream2, runState: runState2, stepTools: currentStep.tools };
          }
          if (isLastModel) {
            runState2.setState({
              hasErrored: true,
              apiError: error,
              deferredErrorChunk: {
                type: "error",
                runId,
                from: "AGENT" /* AGENT */,
                payload: { error }
              },
              stepResult: {
                isContinued: false,
                reason: "error"
              }
            });
          } else {
            const processorRunner = new ProcessorRunner({
              inputProcessors: inputProcessors || [],
              outputProcessors: outputProcessors || [],
              errorProcessors: errorProcessors || [],
              logger: logger || new ConsoleLogger({ level: "error" }),
              agentName: agentId || "unknown",
              processorStates
            });
            const currentRetryCount = inputData.processorRetryCount || 0;
            const canRetryError = maxErrorProcessorRetries !== void 0 && currentRetryCount < maxErrorProcessorRetries;
            const apiErrorWriter = outputWriter ? { custom: async (data) => outputWriter(data) } : void 0;
            const errorResult = await processorRunner.runProcessAPIError({
              error,
              messages: messageList.get.all.db(),
              messageList,
              stepNumber: inputData.output?.steps?.length || 0,
              steps: inputData.output?.steps || [],
              retryCount: currentRetryCount,
              requestContext,
              writer: apiErrorWriter,
              abortSignal: options?.abortSignal,
              messageId: currentMessageId,
              rotateResponseMessageId: () => {
                currentMessageId = _internal?.generateId?.() ?? generateId();
                return currentMessageId;
              }
            });
            if (errorResult.retry && canRetryError) {
              runState2.setState({
                hasErrored: false,
                apiError: void 0
              });
              return {
                outputStream: outputStream2,
                callBail: false,
                runState: runState2,
                stepTools: currentStep.tools,
                stepWorkspace: currentStep.workspace,
                processAPIErrorRetry: {
                  retry: true
                }
              };
            }
            throw error;
          }
        }
        if (options?.abortSignal?.aborted) {
          await options?.onAbort?.({
            steps: inputData?.output?.steps ?? []
          });
          safeEnqueue(controller, { type: "abort", runId, from: "AGENT" /* AGENT */, payload: {} });
          return { callBail: true, outputStream: outputStream2, runState: runState2, stepTools: currentStep.tools };
        }
        return {
          outputStream: outputStream2,
          callBail: false,
          runState: runState2,
          stepTools: currentStep.tools,
          stepWorkspace: currentStep.workspace
        };
      });
      if (_internal) {
        _internal.stepTools = stepTools;
        _internal.stepWorkspace = stepWorkspace ?? _internal.stepWorkspace;
      }
      if (callBail) {
        const usage2 = outputStream._getImmediateUsage();
        const responseMetadata2 = runState.state.responseMetadata;
        const text2 = outputStream._getImmediateText();
        return bail({
          messageId: outputStream.messageId,
          stepResult: {
            reason: "tripwire",
            warnings,
            isContinued: false
          },
          metadata: {
            providerMetadata: runState.state.providerOptions,
            ...responseMetadata2,
            modelMetadata: runState.state.modelMetadata,
            headers: rawResponse?.headers,
            request
          },
          output: {
            text: text2,
            toolCalls: [],
            usage: usage2 ?? inputData.output.usage,
            steps: []
          },
          messages: {
            all: messageList.get.all.aiV5.model(),
            user: messageList.get.input.aiV5.model(),
            nonUser: messageList.get.response.aiV5.model()
          }
        });
      }
      let apiErrorRetryResult = processAPIErrorRetry;
      if (!apiErrorRetryResult && runState.state.hasErrored && runState.state.apiError) {
        const currentRetryCount = inputData.processorRetryCount || 0;
        const canRetryError = maxErrorProcessorRetries !== void 0 && currentRetryCount < maxErrorProcessorRetries;
        const processorRunner = new ProcessorRunner({
          inputProcessors: inputProcessors || [],
          outputProcessors: outputProcessors || [],
          errorProcessors: errorProcessors || [],
          logger: logger || new ConsoleLogger({ level: "error" }),
          agentName: agentId || "unknown",
          processorStates
        });
        const apiErrorWriter2 = outputWriter ? { custom: async (data) => outputWriter(data) } : void 0;
        const errorResult = await processorRunner.runProcessAPIError({
          error: runState.state.apiError,
          messages: messageList.get.all.db(),
          messageList,
          stepNumber: inputData.output?.steps?.length || 0,
          steps: inputData.output?.steps || [],
          retryCount: currentRetryCount,
          requestContext,
          writer: apiErrorWriter2,
          abortSignal: options?.abortSignal,
          messageId: currentMessageId,
          rotateResponseMessageId: () => {
            currentMessageId = _internal?.generateId?.() ?? generateId();
            return currentMessageId;
          }
        });
        if (errorResult.retry && canRetryError) {
          apiErrorRetryResult = errorResult;
          runState.setState({
            hasErrored: false,
            apiError: void 0,
            deferredErrorChunk: void 0
          });
        }
      }
      if (apiErrorRetryResult?.retry) {
        const currentProcessorRetryCount2 = inputData.processorRetryCount || 0;
        const steps2 = inputData.output?.steps || [];
        const nextProcessorRetryCount2 = currentProcessorRetryCount2 + 1;
        const messages2 = {
          all: messageList.get.all.aiV5.model(),
          user: messageList.get.input.aiV5.model(),
          // Keep assistant messages out of the retry payload so agentic-execution/index.ts
          // does not replay failed step output back into messageList. Error processors own
          // any cleanup or replacement of assistant responses before the next attempt.
          nonUser: []
        };
        return {
          messageId: outputStream.messageId,
          stepResult: {
            reason: "retry",
            warnings,
            isContinued: true
          },
          metadata: {
            providerMetadata: runState.state.providerOptions,
            ...runState.state.responseMetadata,
            modelMetadata: runState.state.modelMetadata,
            headers: rawResponse?.headers,
            request
          },
          output: {
            text: "",
            toolCalls: [],
            usage: outputStream._getImmediateUsage() ?? inputData.output?.usage,
            steps: steps2
          },
          messages: messages2,
          processorRetryCount: nextProcessorRetryCount2,
          ...activeFallbackModelIndex > 0 ? { fallbackModelIndex: activeFallbackModelIndex } : {}
        };
      }
      if (runState.state.deferredErrorChunk && runState.state.hasErrored) {
        const deferredChunk = runState.state.deferredErrorChunk;
        const deferredError = getErrorFromUnknown(deferredChunk.payload.error, {
          fallbackMessage: "Unknown error in agent stream"
        });
        safeEnqueue(controller, { ...deferredChunk, payload: { ...deferredChunk.payload, error: deferredError } });
        await options?.onError?.({ error: deferredError });
        runState.setState({ deferredErrorChunk: void 0 });
      }
      if (outputStream.tripwire) {
        runState.setState({
          stepResult: {
            isContinued: false,
            reason: "tripwire"
          }
        });
      }
      const toolCalls = (outputStream._getImmediateToolCalls() ?? []).map((chunk) => {
        const tool2 = stepTools?.[chunk.payload.toolName] || findProviderToolByName(stepTools, chunk.payload.toolName);
        return {
          ...chunk.payload,
          providerExecuted: inferProviderExecuted(chunk.payload.providerExecuted, tool2)
        };
      });
      let processOutputStepTripwire = null;
      if (outputProcessors && outputProcessors.length > 0) {
        const processorRunner = new ProcessorRunner({
          inputProcessors: [],
          outputProcessors,
          logger: logger || new ConsoleLogger({ level: "error" }),
          agentName: agentId || "unknown",
          processorStates
        });
        try {
          const stepNumber = inputData.output?.steps?.length || 0;
          const immediateText = outputStream._getImmediateText();
          const immediateFinishReason = outputStream._getImmediateFinishReason();
          const toolCallInfos = toolCalls.map((tc) => ({
            toolName: tc.toolName,
            toolCallId: tc.toolCallId,
            args: tc.args
          }));
          const currentRetryCount = inputData.processorRetryCount || 0;
          const outputStepTracingContext = modelSpanTracker?.getTracingContext() ?? tracingContext;
          const processorWriter = outputWriter ? { custom: async (data) => outputWriter(data) } : void 0;
          await processorRunner.runProcessOutputStep({
            steps: inputData.output?.steps ?? [],
            messages: messageList.get.all.db(),
            messageList,
            stepNumber,
            finishReason: immediateFinishReason,
            toolCalls: toolCallInfos.length > 0 ? toolCallInfos : void 0,
            text: immediateText,
            ...createObservabilityContext(outputStepTracingContext),
            requestContext,
            retryCount: currentRetryCount,
            writer: processorWriter
          });
        } catch (error) {
          if (error instanceof TripWire) {
            processOutputStepTripwire = error;
            logger?.warn("Output step processor tripwire triggered", {
              reason: error.message,
              processorId: error.processorId,
              retry: error.options?.retry
            });
          } else {
            logger?.error("Error in processOutputStep processors:", error);
            throw error;
          }
        }
      }
      const finishReason = runState?.state?.stepResult?.reason ?? outputStream._getImmediateFinishReason();
      const hasErrored = runState.state.hasErrored;
      const usage = outputStream._getImmediateUsage();
      const responseMetadata = runState.state.responseMetadata;
      const text = outputStream._getImmediateText();
      const object = outputStream._getImmediateObject();
      const tripwireTriggered = outputStream.tripwire || processOutputStepTripwire !== null;
      const currentProcessorRetryCount = inputData.processorRetryCount || 0;
      const retryRequested = processOutputStepTripwire?.options?.retry === true;
      const canRetry = maxProcessorRetries !== void 0 && currentProcessorRetryCount < maxProcessorRetries;
      const shouldRetry = retryRequested && canRetry;
      if (retryRequested && !canRetry) {
        if (maxProcessorRetries === void 0) {
          logger?.warn?.(`Processor requested retry but maxProcessorRetries is not set. Treating as abort.`);
        } else {
          logger?.warn?.(
            `Processor requested retry but maxProcessorRetries (${maxProcessorRetries}) exceeded. Current count: ${currentProcessorRetryCount}. Treating as abort.`
          );
        }
      }
      const steps = inputData.output?.steps || [];
      const existingResponseCount = inputData.messages?.nonUser?.length || 0;
      const allResponseContent = messageList.get.response.aiV5.modelContent(steps.length);
      const currentIterationContent = allResponseContent.slice(existingResponseCount);
      const stepTripwireData = processOutputStepTripwire ? {
        reason: processOutputStepTripwire.message,
        retry: processOutputStepTripwire.options?.retry,
        metadata: processOutputStepTripwire.options?.metadata,
        processorId: processOutputStepTripwire.processorId
      } : void 0;
      steps.push(
        new DefaultStepResult({
          warnings: outputStream._getImmediateWarnings(),
          providerMetadata: runState.state.providerOptions,
          finishReason: runState.state.stepResult?.reason,
          content: currentIterationContent,
          response: { ...responseMetadata, ...rawResponse, messages: messageList.get.response.aiV5.model() },
          request,
          usage: outputStream._getImmediateUsage(),
          tripwire: stepTripwireData
        })
      );
      if (shouldRetry) {
        messageList.removeByIds([outputStream.messageId]);
      }
      const retryFeedbackText = shouldRetry && processOutputStepTripwire ? `[Processor Feedback] Your previous response was not accepted: ${processOutputStepTripwire.message}. Please try again with the feedback in mind.` : void 0;
      const messages = {
        all: messageList.get.all.aiV5.model(),
        user: messageList.get.input.aiV5.model(),
        nonUser: messageList.get.response.aiV5.model()
      };
      const stepReason = shouldRetry ? "retry" : tripwireTriggered ? "tripwire" : hasErrored ? "error" : finishReason;
      const nextFallbackModelIndex = shouldRetry ? activeFallbackModelIndex : 0;
      const hasPendingToolCalls = toolCalls && toolCalls.some((tc) => !tc.providerExecuted);
      const shouldContinue = shouldRetry || !tripwireTriggered && (hasPendingToolCalls || !["stop", "error", "length"].includes(finishReason));
      const nextProcessorRetryCount = shouldRetry ? currentProcessorRetryCount + 1 : 0;
      return {
        messageId: outputStream.messageId,
        stepResult: {
          reason: stepReason,
          warnings,
          isContinued: shouldContinue,
          // Pass retry metadata for tracking
          ...shouldRetry && processOutputStepTripwire ? {
            retryReason: processOutputStepTripwire.message,
            retryMetadata: processOutputStepTripwire.options?.metadata,
            retryProcessorId: processOutputStepTripwire.processorId
          } : {}
        },
        metadata: {
          providerMetadata: runState.state.providerOptions,
          ...responseMetadata,
          ...rawResponse,
          modelMetadata: runState.state.modelMetadata,
          headers: rawResponse?.headers,
          request
        },
        output: {
          text,
          toolCalls: shouldRetry ? [] : toolCalls,
          // Clear tool calls on retry
          usage: usage ?? inputData.output?.usage,
          steps,
          ...object ? { object } : {}
        },
        messages,
        // Track processor retry count for next iteration
        processorRetryCount: nextProcessorRetryCount,
        processorRetryFeedback: retryFeedbackText,
        ...nextFallbackModelIndex > 0 ? { fallbackModelIndex: nextFallbackModelIndex } : {}
      };
    }
  });
}
function createLLMMappingStep({ models, _internal, ...rest }, llmExecutionStep) {
  const processorRunner = rest.outputProcessors?.length && rest.logger ? new ProcessorRunner({
    inputProcessors: [],
    outputProcessors: rest.outputProcessors,
    logger: rest.logger,
    agentName: "LLMMappingStep",
    processorStates: rest.processorStates
  }) : void 0;
  const observabilityContext = createObservabilityContext(rest.modelSpanTracker?.getTracingContext());
  const streamWriter = rest.outputWriter ? { custom: async (data) => rest.outputWriter(data) } : void 0;
  async function processAndEnqueueChunk(chunk) {
    if (processorRunner && rest.processorStates) {
      const {
        part: processed,
        blocked,
        reason,
        tripwireOptions,
        processorId
      } = await processorRunner.processPart(
        chunk,
        rest.processorStates,
        observabilityContext,
        rest.requestContext,
        rest.messageList,
        0,
        streamWriter
      );
      if (blocked) {
        rest.controller.enqueue({
          type: "tripwire",
          payload: {
            reason: reason || "Output processor blocked content",
            retry: tripwireOptions?.retry,
            metadata: tripwireOptions?.metadata,
            processorId
          }
        });
        return null;
      }
      if (processed) {
        rest.controller.enqueue(processed);
        return processed;
      }
      return null;
    } else {
      rest.controller.enqueue(chunk);
      return chunk;
    }
  }
  return createStep({
    id: "llmExecutionMappingStep",
    inputSchema: array(toolCallOutputSchema),
    outputSchema: llmIterationOutputSchema,
    execute: async ({ inputData, getStepResult: getStepResult2, bail }) => {
      const initialResult = getStepResult2(llmExecutionStep);
      async function getProviderMetadataWithModelOutput(toolCall) {
        const tool2 = rest.tools?.[toolCall.toolName];
        let modelOutput;
        if (tool2?.toModelOutput && toolCall.result != null) {
          modelOutput = await tool2.toModelOutput(toolCall.result);
        }
        const existingMastra = toolCall.providerMetadata?.mastra;
        const providerMetadata = {
          ...toolCall.providerMetadata,
          ...modelOutput != null ? { mastra: { ...existingMastra, modelOutput } } : {}
        };
        const hasMetadata = Object.keys(providerMetadata).length > 0;
        return hasMetadata ? providerMetadata : void 0;
      }
      if (inputData?.some((toolCall) => toolCall?.result === void 0 && !toolCall.providerExecuted)) {
        const errorResults = inputData.filter((toolCall) => toolCall?.error && !toolCall.providerExecuted);
        if (errorResults?.length) {
          for (const toolCall of errorResults) {
            const chunk = {
              type: "tool-error",
              runId: rest.runId,
              from: "AGENT" /* AGENT */,
              payload: {
                error: toolCall.error,
                args: toolCall.args,
                toolCallId: toolCall.toolCallId,
                toolName: toolCall.toolName,
                providerMetadata: toolCall.providerMetadata
              }
            };
            const processed = await processAndEnqueueChunk(chunk);
            if (processed) await rest.options?.onChunk?.(processed);
            rest.messageList.updateToolInvocation({
              type: "tool-invocation",
              toolInvocation: {
                state: "result",
                toolCallId: toolCall.toolCallId,
                toolName: sanitizeToolName(toolCall.toolName),
                args: toolCall.args,
                result: toolCall.error?.message ?? toolCall.error
              },
              ...toolCall.providerMetadata ? { providerMetadata: toolCall.providerMetadata } : {}
            });
          }
        }
        const hasPendingHITL = inputData.some((tc) => tc.result === void 0 && !tc.error && !tc.providerExecuted);
        if (errorResults?.length > 0 && !hasPendingHITL) {
          const successfulResults = inputData.filter((tc) => tc.result !== void 0);
          if (successfulResults.length) {
            for (const toolCall of successfulResults) {
              const chunk = {
                type: "tool-result",
                runId: rest.runId,
                from: "AGENT" /* AGENT */,
                payload: {
                  args: toolCall.args,
                  toolCallId: toolCall.toolCallId,
                  toolName: toolCall.toolName,
                  result: toolCall.result,
                  providerMetadata: toolCall.providerMetadata,
                  providerExecuted: toolCall.providerExecuted
                }
              };
              const processed = await processAndEnqueueChunk(chunk);
              if (processed) await rest.options?.onChunk?.(processed);
              if (!toolCall.providerExecuted) {
                const providerMetadata = await getProviderMetadataWithModelOutput(toolCall);
                rest.messageList.updateToolInvocation({
                  type: "tool-invocation",
                  toolInvocation: {
                    state: "result",
                    toolCallId: toolCall.toolCallId,
                    toolName: sanitizeToolName(toolCall.toolName),
                    args: toolCall.args,
                    result: toolCall.result
                  },
                  ...providerMetadata ? { providerMetadata } : {}
                });
              }
            }
          }
          initialResult.stepResult.isContinued = true;
          initialResult.stepResult.reason = "tool-calls";
          return {
            ...initialResult,
            messages: {
              all: rest.messageList.get.all.aiV5.model(),
              user: rest.messageList.get.input.aiV5.model(),
              nonUser: rest.messageList.get.response.aiV5.model()
            }
          };
        }
        if (initialResult.stepResult.reason !== "retry") {
          initialResult.stepResult.isContinued = false;
        }
        return bail({
          ...initialResult,
          messages: {
            all: rest.messageList.get.all.aiV5.model(),
            user: rest.messageList.get.input.aiV5.model(),
            nonUser: rest.messageList.get.response.aiV5.model()
          }
        });
      }
      if (inputData?.length) {
        for (const toolCall of inputData) {
          if (toolCall.result === void 0) continue;
          const chunk = {
            type: "tool-result",
            runId: rest.runId,
            from: "AGENT" /* AGENT */,
            payload: {
              args: toolCall.args,
              toolCallId: toolCall.toolCallId,
              toolName: toolCall.toolName,
              result: toolCall.result,
              providerMetadata: toolCall.providerMetadata,
              providerExecuted: toolCall.providerExecuted
            }
          };
          const processed = await processAndEnqueueChunk(chunk);
          if (processed) await rest.options?.onChunk?.(processed);
          if (!toolCall.providerExecuted) {
            const providerMetadata = await getProviderMetadataWithModelOutput(toolCall);
            rest.messageList.updateToolInvocation({
              type: "tool-invocation",
              toolInvocation: {
                state: "result",
                toolCallId: toolCall.toolCallId,
                toolName: sanitizeToolName(toolCall.toolName),
                args: toolCall.args,
                result: toolCall.result
              },
              ...providerMetadata ? { providerMetadata } : {}
            });
          }
        }
        if (rest.requestContext?.get("__mastra_delegationBailed") && _internal) {
          _internal._delegationBailed = true;
          rest.requestContext.set("__mastra_delegationBailed", false);
        }
        return {
          ...initialResult,
          messages: {
            all: rest.messageList.get.all.aiV5.model(),
            user: rest.messageList.get.input.aiV5.model(),
            nonUser: rest.messageList.get.response.aiV5.model()
          }
        };
      }
      return initialResult;
    }
  });
}

// src/loop/workflows/errors.ts
var ToolNotFoundError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "ToolNotFoundError";
  }
};

// src/loop/workflows/agentic-execution/tool-call-step.ts
function createToolCallStep({
  tools,
  messageList,
  options,
  outputWriter,
  controller,
  runId,
  streamState,
  modelSpanTracker,
  _internal,
  logger
}) {
  return createStep({
    id: "toolCallStep",
    inputSchema: toolCallInputSchema,
    outputSchema: toolCallOutputSchema,
    execute: async ({ inputData, suspend, resumeData: workflowResumeData, requestContext }) => {
      const stepTools = _internal?.stepTools || tools;
      const stepActiveTools = _internal?.stepActiveTools;
      const tool2 = stepTools?.[inputData.toolName] || findProviderToolByName(stepTools, inputData.toolName) || Object.values(stepTools || {})?.find((t) => `id` in t && t.id === inputData.toolName);
      const addToolMetadata = ({
        toolCallId,
        toolName,
        args,
        suspendPayload,
        resumeSchema,
        type,
        suspendedToolRunId
      }) => {
        const metadataKey = type === "suspension" ? "suspendedTools" : "pendingToolApprovals";
        const responseMessages = messageList.get.response.db();
        const lastAssistantMessage = [...responseMessages].reverse().find((msg) => msg.role === "assistant");
        if (lastAssistantMessage) {
          const content = lastAssistantMessage.content;
          if (!content) return;
          const metadata = typeof lastAssistantMessage.content.metadata === "object" && lastAssistantMessage.content.metadata !== null ? lastAssistantMessage.content.metadata : {};
          metadata[metadataKey] = metadata[metadataKey] || {};
          metadata[metadataKey][toolName] = {
            toolCallId,
            toolName,
            args,
            type,
            runId: suspendedToolRunId ?? runId,
            // Store the runId so we can resume after page refresh
            ...type === "suspension" ? { suspendPayload } : {},
            resumeSchema
          };
          lastAssistantMessage.content.metadata = metadata;
        }
      };
      const removeToolMetadata = async (toolName, type) => {
        const { saveQueueManager, memoryConfig, threadId } = _internal || {};
        if (!saveQueueManager || !threadId) {
          return;
        }
        const getMetadata = (message) => {
          const content = message.content;
          if (!content) return void 0;
          const metadata = typeof content.metadata === "object" && content.metadata !== null ? content.metadata : void 0;
          return metadata;
        };
        const metadataKey = type === "suspension" ? "suspendedTools" : "pendingToolApprovals";
        const allMessages = messageList.get.all.db();
        const lastAssistantMessage = [...allMessages].reverse().find((msg) => {
          const metadata = getMetadata(msg);
          const suspendedTools = metadata?.[metadataKey];
          const foundTool = !!suspendedTools?.[toolName];
          if (foundTool) {
            return true;
          }
          const dataToolSuspendedParts = msg.content.parts?.filter(
            (part) => part.type === "data-tool-call-suspended" || part.type === "data-tool-call-approval"
          );
          if (dataToolSuspendedParts && dataToolSuspendedParts.length > 0) {
            const foundTool2 = dataToolSuspendedParts.find((part) => part.data.toolName === toolName);
            if (foundTool2) {
              return true;
            }
          }
          return false;
        });
        if (lastAssistantMessage) {
          const metadata = getMetadata(lastAssistantMessage);
          let suspendedTools = metadata?.[metadataKey];
          if (!suspendedTools) {
            suspendedTools = lastAssistantMessage.content.parts?.filter((part) => part.type === "data-tool-call-suspended" || part.type === "data-tool-call-approval")?.reduce(
              (acc, part) => {
                if (part.type === "data-tool-call-suspended" || part.type === "data-tool-call-approval") {
                  acc[part.data.toolName] = part.data;
                }
                return acc;
              },
              {}
            );
          }
          if (suspendedTools && typeof suspendedTools === "object") {
            if (metadata) {
              delete suspendedTools[toolName];
            } else {
              lastAssistantMessage.content.parts = lastAssistantMessage.content.parts?.map((part) => {
                if (part.type === "data-tool-call-suspended" || part.type === "data-tool-call-approval") {
                  if (part.data.toolName === toolName) {
                    return {
                      ...part,
                      data: {
                        ...part.data,
                        resumed: true
                      }
                    };
                  }
                }
                return part;
              });
            }
            if (metadata && Object.keys(suspendedTools).length === 0) {
              delete metadata[metadataKey];
            }
            try {
              await saveQueueManager.flushMessages(messageList, threadId, memoryConfig);
            } catch (error) {
              logger?.error("Error removing tool suspension metadata:", error);
            }
          }
        }
      };
      const flushMessagesBeforeSuspension = async () => {
        const { saveQueueManager, memoryConfig, threadId, resourceId, memory } = _internal || {};
        if (!saveQueueManager || !threadId) {
          return;
        }
        try {
          if (memory && !_internal.threadExists && resourceId) {
            const thread = await memory.getThreadById?.({ threadId });
            if (!thread) {
              await memory.createThread?.({
                threadId,
                resourceId,
                memoryConfig
              });
            }
            _internal.threadExists = true;
          }
          await saveQueueManager.flushMessages(messageList, threadId, memoryConfig);
        } catch (error) {
          logger?.error("Error flushing messages before suspension:", error);
        }
      };
      if (inputData.providerExecuted) {
        return inputData;
      }
      const toolKey = stepTools?.[inputData.toolName] ? inputData.toolName : Object.entries(stepTools || {}).find(([_, t]) => t === tool2)?.[0];
      const isHiddenByActiveTools = stepActiveTools && toolKey && !stepActiveTools.includes(toolKey);
      if (!tool2 || isHiddenByActiveTools) {
        const availableToolNames = stepActiveTools ?? Object.keys(stepTools || {});
        const availableToolsStr = availableToolNames.length > 0 ? ` Available tools: ${availableToolNames.join(", ")}` : "";
        return {
          error: new ToolNotFoundError(
            `Tool "${inputData.toolName}" not found.${availableToolsStr}. Call tools by their exact name only \u2014 never add prefixes, namespaces, or colons.`
          ),
          ...inputData
        };
      }
      if (tool2 && "onInputAvailable" in tool2) {
        try {
          await tool2?.onInputAvailable?.({
            toolCallId: inputData.toolCallId,
            input: inputData.args,
            messages: messageList.get.input.aiV5.model(),
            abortSignal: options?.abortSignal
          });
        } catch (error) {
          logger?.error("Error calling onInputAvailable", error);
        }
      }
      if (!tool2.execute) {
        return inputData;
      }
      try {
        const requireToolApproval = requestContext.get("__mastra_requireToolApproval");
        let resumeDataFromArgs = void 0;
        let args = inputData.args;
        if (typeof inputData.args === "object" && inputData.args !== null) {
          const { resumeData: resumeDataFromInput, ...argsFromInput } = inputData.args;
          args = argsFromInput;
          resumeDataFromArgs = resumeDataFromInput;
        }
        const resumeData = resumeDataFromArgs ?? workflowResumeData;
        const isResumeToolCall = !!resumeDataFromArgs;
        let toolRequiresApproval = requireToolApproval || tool2.requireApproval;
        if (tool2.needsApprovalFn) {
          try {
            const needsApprovalResult = await tool2.needsApprovalFn(args, {
              requestContext: requestContext ? Object.fromEntries(requestContext.entries()) : {},
              workspace: _internal?.stepWorkspace
            });
            toolRequiresApproval = needsApprovalResult;
          } catch (error) {
            logger?.error(`Error evaluating needsApprovalFn for tool ${inputData.toolName}:`, error);
            toolRequiresApproval = true;
          }
        }
        const approvalSchema = toStandardSchema5(
          object({
            approved: boolean().describe(
              "Controls if the tool call is approved or not, should be true when approved and false when declined"
            )
          })
        );
        if (toolRequiresApproval) {
          if (!resumeData) {
            controller.enqueue({
              type: "tool-call-approval",
              runId,
              from: "AGENT" /* AGENT */,
              payload: {
                toolCallId: inputData.toolCallId,
                toolName: inputData.toolName,
                args: inputData.args,
                resumeSchema: JSON.stringify(standardSchemaToJSONSchema(approvalSchema))
              }
            });
            addToolMetadata({
              toolCallId: inputData.toolCallId,
              toolName: inputData.toolName,
              args: inputData.args,
              type: "approval",
              resumeSchema: JSON.stringify(standardSchemaToJSONSchema(approvalSchema))
            });
            await flushMessagesBeforeSuspension();
            return suspend(
              {
                requireToolApproval: {
                  toolCallId: inputData.toolCallId,
                  toolName: inputData.toolName,
                  args: inputData.args
                },
                __streamState: streamState.serialize()
              },
              {
                resumeLabel: inputData.toolCallId
              }
            );
          } else {
            await removeToolMetadata(inputData.toolName, "approval");
            if (!resumeData.approved) {
              return {
                result: "Tool call was not approved by the user",
                ...inputData
              };
            }
          }
        } else if (isResumeToolCall) {
          await removeToolMetadata(inputData.toolName, "suspension");
        }
        const isAgentTool = inputData.toolName?.startsWith("agent-");
        const isWorkflowTool = inputData.toolName?.startsWith("workflow-");
        const resumeDataToPassToToolOptions = !isAgentTool && toolRequiresApproval && Object.keys(resumeData).length === 1 && "approved" in resumeData ? void 0 : resumeData;
        const toolOptions = {
          abortSignal: options?.abortSignal,
          toolCallId: inputData.toolCallId,
          // Pass all messages (input + response + memory) so sub-agents (agent-* tools) receive
          // the full conversation context and can make better decisions. Each sub-agent invocation
          // uses a fresh unique thread, so storing this context in that thread is scoped and safe.
          messages: isAgentTool ? messageList.get.all.aiV5.model() : messageList.get.input.aiV5.model(),
          outputWriter,
          // Pass current step span as parent for tool call spans
          tracingContext: modelSpanTracker?.getTracingContext(),
          // Pass workspace from _internal (set by llmExecutionStep via prepareStep/processInputStep)
          workspace: _internal?.stepWorkspace,
          // Forward requestContext so tools receive values set by the workflow step
          requestContext,
          suspend: async (suspendPayload, options2) => {
            if (options2?.requireToolApproval) {
              controller.enqueue({
                type: "tool-call-approval",
                runId,
                from: "AGENT" /* AGENT */,
                payload: {
                  toolCallId: inputData.toolCallId,
                  toolName: inputData.toolName,
                  args: inputData.args,
                  resumeSchema: JSON.stringify(
                    standardSchemaToJSONSchema(
                      toStandardSchema5(
                        object({
                          approved: boolean().describe(
                            "Controls if the tool call is approved or not, should be true when approved and false when declined"
                          )
                        })
                      )
                    )
                  )
                }
              });
              addToolMetadata({
                toolCallId: inputData.toolCallId,
                toolName: inputData.toolName,
                args: inputData.args,
                type: "approval",
                suspendedToolRunId: options2.runId,
                resumeSchema: JSON.stringify(
                  standardSchemaToJSONSchema(
                    toStandardSchema5(
                      object({
                        approved: boolean().describe(
                          "Controls if the tool call is approved or not, should be true when approved and false when declined"
                        )
                      })
                    )
                  )
                )
              });
              await flushMessagesBeforeSuspension();
              return suspend(
                {
                  requireToolApproval: {
                    toolCallId: inputData.toolCallId,
                    toolName: inputData.toolName,
                    args: inputData.args
                  },
                  __streamState: streamState.serialize()
                },
                {
                  resumeLabel: inputData.toolCallId
                }
              );
            } else {
              controller.enqueue({
                type: "tool-call-suspended",
                runId,
                from: "AGENT" /* AGENT */,
                payload: {
                  toolCallId: inputData.toolCallId,
                  toolName: inputData.toolName,
                  suspendPayload,
                  args: inputData.args,
                  resumeSchema: options2?.resumeSchema
                }
              });
              addToolMetadata({
                toolCallId: inputData.toolCallId,
                toolName: inputData.toolName,
                args,
                suspendPayload,
                suspendedToolRunId: options2?.runId,
                type: "suspension",
                resumeSchema: options2?.resumeSchema
              });
              await flushMessagesBeforeSuspension();
              return await suspend(
                {
                  toolCallSuspended: suspendPayload,
                  __streamState: streamState.serialize(),
                  toolName: inputData.toolName,
                  resumeLabel: options2?.resumeLabel
                },
                {
                  resumeLabel: inputData.toolCallId
                }
              );
            }
          },
          resumeData: resumeDataToPassToToolOptions
        };
        const needsRunIdLookup = resumeDataToPassToToolOptions && (isAgentTool || isWorkflowTool) && (!isResumeToolCall || !args.suspendedToolRunId);
        if (needsRunIdLookup) {
          let suspendedToolRunId = "";
          const messages = messageList.get.all.db();
          const assistantMessages = [...messages].reverse().filter((message) => message.role === "assistant");
          for (const message of assistantMessages) {
            const pendingOrSuspendedTools = message.content.metadata?.suspendedTools || message.content.metadata?.pendingToolApprovals;
            if (pendingOrSuspendedTools && pendingOrSuspendedTools[inputData.toolName]) {
              suspendedToolRunId = pendingOrSuspendedTools[inputData.toolName].runId;
              break;
            }
            const dataToolSuspendedParts = message.content.parts?.filter(
              (part) => (part.type === "data-tool-call-suspended" || part.type === "data-tool-call-approval") && !part.data.resumed
            );
            if (dataToolSuspendedParts && dataToolSuspendedParts.length > 0) {
              const foundTool = dataToolSuspendedParts.find((part) => part.data.toolName === inputData.toolName);
              if (foundTool) {
                suspendedToolRunId = foundTool.data.runId;
                break;
              }
            }
          }
          if (suspendedToolRunId) {
            args.suspendedToolRunId = suspendedToolRunId;
          }
        }
        if (args === null || args === void 0) {
          return {
            error: new Error(
              `Tool "${inputData.toolName}" received invalid arguments \u2014 the provided JSON could not be parsed. Please provide valid JSON arguments.`
            ),
            ...inputData
          };
        }
        if (isAgentTool) {
          if (typeof args === "object" && args !== null && "prompt" in args) {
            args.threadId = _internal?.threadId;
            args.resourceId = _internal?.resourceId;
          }
        }
        const rawResult = await tool2.execute(args, toolOptions);
        const result = ensureSerializable(rawResult);
        if (tool2 && "onOutput" in tool2 && typeof tool2.onOutput === "function") {
          try {
            await tool2.onOutput({
              toolCallId: inputData.toolCallId,
              toolName: inputData.toolName,
              output: result,
              abortSignal: options?.abortSignal
            });
          } catch (error) {
            logger?.error("Error calling onOutput", error);
          }
        }
        return { result, ...inputData };
      } catch (error) {
        return {
          error,
          ...inputData
        };
      }
    }
  });
}

// src/loop/workflows/agentic-execution/index.ts
function createAgenticExecutionWorkflow({
  models,
  _internal,
  ...rest
}) {
  let existingResponseModelCount = 0;
  const llmExecutionStep = createLLMExecutionStep({
    models,
    _internal,
    ...rest
  });
  const toolCallStep = createToolCallStep({
    _internal,
    ...rest
  });
  const llmMappingStep = createLLMMappingStep(
    {
      models,
      _internal,
      ...rest
    },
    llmExecutionStep
  );
  const isTaskCompleteStep = createIsTaskCompleteStep({
    _internal,
    ...rest
  });
  let toolCallConcurrency = 10;
  if (rest?.toolCallConcurrency) {
    toolCallConcurrency = rest.toolCallConcurrency > 0 ? rest.toolCallConcurrency : 10;
  }
  const hasRequireToolApproval = !!rest.requireToolApproval;
  let hasSuspendSchema = false;
  let hasRequireApproval = false;
  if (rest.tools) {
    for (const tool2 of Object.values(rest.tools)) {
      if (tool2?.hasSuspendSchema) {
        hasSuspendSchema = true;
      }
      if (tool2?.requireApproval) {
        hasRequireApproval = true;
      }
      if (hasSuspendSchema || hasRequireApproval) break;
    }
  }
  const sequentialExecutionRequired = hasRequireToolApproval || hasSuspendSchema || hasRequireApproval;
  return createWorkflow({
    id: "executionWorkflow",
    inputSchema: llmIterationOutputSchema,
    outputSchema: llmIterationOutputSchema,
    options: {
      tracingPolicy: {
        // mark all workflow spans related to the
        // VNext execution as internal
        internal: 1 /* WORKFLOW */
      },
      shouldPersistSnapshot: ({ workflowStatus }) => workflowStatus === "suspended",
      validateInputs: false
    }
  }).map(
    async ({ inputData }) => {
      existingResponseModelCount = rest.messageList.get.response.aiV5.model().length;
      return inputData;
    },
    { id: "capture-response-count" }
  ).then(llmExecutionStep).map(
    async ({ inputData }) => {
      const typedInputData = inputData;
      const responseMessages = typedInputData.messages.nonUser;
      const newMessages = responseMessages ? responseMessages.slice(existingResponseModelCount) : [];
      if (newMessages.length > 0) {
        rest.messageList.add(newMessages, "response");
      }
      return typedInputData;
    },
    { id: "add-response-to-messagelist" }
  ).map(
    async ({ inputData }) => {
      const typedInputData = inputData;
      return typedInputData.output.toolCalls || [];
    },
    { id: "map-tool-calls" }
  ).foreach(toolCallStep, { concurrency: sequentialExecutionRequired ? 1 : toolCallConcurrency }).then(llmMappingStep).then(isTaskCompleteStep).commit();
}

// src/loop/workflows/agentic-loop/index.ts
function createAgenticLoopWorkflow(params) {
  const {
    models,
    _internal,
    messageId,
    runId,
    toolChoice,
    messageList,
    modelSettings,
    controller,
    outputWriter,
    ...rest
  } = params;
  const accumulatedSteps = [];
  let previousContentLength = 0;
  let pendingFeedbackStop = false;
  const agenticExecutionWorkflow = createAgenticExecutionWorkflow({
    messageId,
    models,
    _internal,
    modelSettings,
    toolChoice,
    controller,
    outputWriter,
    messageList,
    runId,
    ...rest
  });
  return createWorkflow({
    id: "agentic-loop",
    inputSchema: llmIterationOutputSchema,
    outputSchema: llmIterationOutputSchema,
    options: {
      tracingPolicy: {
        // mark all workflow spans related to the
        // VNext execution as internal
        internal: 1 /* WORKFLOW */
      },
      shouldPersistSnapshot: (params2) => {
        return params2.workflowStatus === "suspended";
      },
      validateInputs: false
    }
  }).dowhile(agenticExecutionWorkflow, async ({ inputData }) => {
    const typedInputData = inputData;
    let hasFinishedSteps = false;
    if (pendingFeedbackStop) {
      hasFinishedSteps = true;
      pendingFeedbackStop = false;
    }
    const allContent = typedInputData.messages.nonUser.flatMap(
      (message) => message.content
    );
    const currentContent = allContent.slice(previousContentLength);
    previousContentLength = allContent.length;
    const toolResultParts = currentContent.filter((part) => part.type === "tool-result");
    const currentStep = {
      content: currentContent,
      usage: typedInputData.output.usage || { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      // we need to cast this because we add 'tripwire' and 'retry' for processor scenarios
      finishReason: typedInputData.stepResult?.reason || "unknown",
      warnings: typedInputData.stepResult?.warnings || [],
      request: typedInputData.metadata?.request || {},
      response: {
        ...typedInputData.metadata,
        modelId: typedInputData.metadata?.modelId || typedInputData.metadata?.model || "",
        messages: []
      },
      text: typedInputData.output.text || "",
      reasoning: typedInputData.output.reasoning || [],
      reasoningText: typedInputData.output.reasoningText || "",
      files: typedInputData.output.files || [],
      toolCalls: typedInputData.output.toolCalls || [],
      toolResults: toolResultParts,
      sources: typedInputData.output.sources || [],
      staticToolCalls: typedInputData.output.staticToolCalls || [],
      dynamicToolCalls: typedInputData.output.dynamicToolCalls || [],
      staticToolResults: toolResultParts.filter(
        (part) => part.dynamic === false
      ),
      dynamicToolResults: toolResultParts.filter(
        (part) => part.dynamic === true
      ),
      providerMetadata: typedInputData.metadata?.providerMetadata
    };
    accumulatedSteps.push(currentStep);
    if (rest.stopWhen && typedInputData.stepResult?.isContinued && accumulatedSteps.length > 0) {
      const steps = accumulatedSteps;
      const conditions = await Promise.all(
        (Array.isArray(rest.stopWhen) ? rest.stopWhen : [rest.stopWhen]).map((condition) => {
          return condition({ steps });
        })
      );
      const hasStopped = conditions.some((condition) => condition);
      hasFinishedSteps = hasFinishedSteps || hasStopped;
    }
    if (rest.onIterationComplete) {
      const isFinal = !typedInputData.stepResult?.isContinued || hasFinishedSteps;
      const iterationContext = {
        iteration: accumulatedSteps.length,
        maxIterations: rest.maxSteps,
        text: typedInputData.output.text || "",
        toolCalls: (typedInputData.output.toolCalls || []).map((tc) => ({
          id: tc.toolCallId || tc.id || "",
          name: tc.toolName || tc.name || "",
          args: tc.args || {}
        })),
        toolResults: (typedInputData.output.toolResults || []).map((tr) => ({
          id: tr.toolCallId || tr.id || "",
          name: tr.toolName || tr.name || "",
          result: tr.result,
          error: tr.error
        })),
        isFinal,
        finishReason: typedInputData.stepResult?.reason || "unknown",
        runId,
        threadId: _internal?.threadId,
        resourceId: _internal?.resourceId,
        agentId: rest.agentId,
        agentName: rest.agentName || rest.agentId,
        messages: messageList.get.all.db()
      };
      try {
        const iterationResult = await rest.onIterationComplete(iterationContext);
        if (iterationResult) {
          if (iterationResult.feedback && typedInputData.stepResult?.isContinued) {
            messageList.add(
              {
                id: rest.mastra?.generateId() || randomUUID(),
                createdAt: /* @__PURE__ */ new Date(),
                type: "text",
                role: "assistant",
                content: {
                  parts: [
                    {
                      type: "text",
                      text: iterationResult.feedback
                    }
                  ],
                  metadata: {
                    mode: "stream",
                    completionResult: {
                      suppressFeedback: true
                    }
                  },
                  format: 2
                }
              },
              "response"
            );
            if (iterationResult.continue === false) {
              pendingFeedbackStop = true;
            } else if (!hasFinishedSteps && rest.maxSteps && accumulatedSteps.length < rest.maxSteps) {
              hasFinishedSteps = false;
              typedInputData.stepResult.isContinued = true;
            }
          } else if (iterationResult.continue === false && !hasFinishedSteps) {
            hasFinishedSteps = true;
          } else if (iterationResult.continue === true && (hasFinishedSteps || !typedInputData.stepResult?.isContinued)) {
            if (rest.maxSteps && accumulatedSteps.length < rest.maxSteps || !rest.maxSteps) {
              hasFinishedSteps = false;
              if (typedInputData.stepResult) {
                typedInputData.stepResult.isContinued = true;
              }
            }
          }
        }
      } catch (error) {
        rest.logger?.error("Error in onIterationComplete hook:", error);
      }
    }
    if (!hasFinishedSteps && _internal?._delegationBailed) {
      hasFinishedSteps = true;
      _internal._delegationBailed = false;
    }
    if (typedInputData.stepResult) {
      typedInputData.stepResult.isContinued = hasFinishedSteps ? false : typedInputData.stepResult.isContinued;
    }
    const hasSteps = (typedInputData.output?.steps?.length ?? 0) > 0;
    const shouldEmitStepFinish = typedInputData.stepResult?.reason !== "tripwire" || hasSteps;
    if (shouldEmitStepFinish) {
      safeEnqueue(controller, {
        type: "step-finish",
        runId,
        from: "AGENT" /* AGENT */,
        // @ts-expect-error TODO: Look into the proper types for this
        payload: typedInputData
      });
    }
    const reason = typedInputData.stepResult?.reason;
    if (reason === void 0) {
      return false;
    }
    return typedInputData.stepResult?.isContinued ?? false;
  }).commit();
}

// src/loop/workflows/stream.ts
function workflowLoopStream({
  resumeContext,
  requireToolApproval,
  models,
  toolChoice,
  modelSettings,
  _internal,
  messageId,
  runId,
  messageList,
  startTimestamp,
  streamState,
  agentId,
  toolCallId,
  toolCallConcurrency,
  ...rest
}) {
  return new ReadableStream$1({
    start: async (controller) => {
      const requestContext = rest.requestContext ?? new RequestContext();
      const hasOutputProcessors = rest.outputProcessors && rest.outputProcessors.length > 0;
      const dataChunkProcessorRunner = hasOutputProcessors ? new ProcessorRunner({
        outputProcessors: rest.outputProcessors,
        logger: rest.logger || new ConsoleLogger({ level: "error" }),
        agentName: agentId || "unknown"
      }) : void 0;
      const dataChunkProcessorStates = hasOutputProcessors ? /* @__PURE__ */ new Map() : void 0;
      const dataChunkStreamWriter = {
        custom: async (data) => {
          safeEnqueue(controller, data);
        }
      };
      const outputWriter = async (chunk) => {
        if (chunk.type.startsWith("data-")) {
          let processedChunk = chunk;
          if (dataChunkProcessorRunner) {
            const {
              part: processed,
              blocked,
              reason,
              tripwireOptions,
              processorId
            } = await dataChunkProcessorRunner.processPart(
              chunk,
              rest.processorStates ?? dataChunkProcessorStates,
              void 0,
              // observabilityContext
              requestContext,
              messageList,
              0,
              dataChunkStreamWriter
            );
            if (blocked) {
              safeEnqueue(controller, {
                type: "tripwire",
                runId,
                from: "AGENT" /* AGENT */,
                payload: {
                  reason: reason || "Output processor blocked content",
                  retry: tripwireOptions?.retry,
                  metadata: tripwireOptions?.metadata,
                  processorId
                }
              });
              return;
            }
            if (processed) {
              processedChunk = processed;
            } else {
              return;
            }
          }
          if (typeof processedChunk.type === "string" && processedChunk.type.startsWith("data-") && messageId && !("transient" in processedChunk && processedChunk.transient)) {
            const dataPart = {
              type: processedChunk.type,
              data: "data" in processedChunk ? processedChunk.data : void 0
            };
            const message = {
              id: messageId,
              role: "assistant",
              content: {
                format: 2,
                parts: [dataPart]
              },
              createdAt: /* @__PURE__ */ new Date(),
              threadId: _internal?.threadId,
              resourceId: _internal?.resourceId
            };
            messageList.add(message, "response");
          }
          safeEnqueue(controller, processedChunk);
          return;
        }
        safeEnqueue(controller, chunk);
      };
      const agenticLoopWorkflow = createAgenticLoopWorkflow({
        resumeContext,
        messageId,
        models,
        _internal,
        modelSettings,
        toolChoice,
        controller,
        outputWriter,
        runId,
        messageList,
        startTimestamp,
        streamState,
        agentId,
        requireToolApproval,
        toolCallConcurrency,
        ...rest
      });
      if (rest.mastra) {
        agenticLoopWorkflow.__registerMastra(rest.mastra);
      }
      const initialData = {
        messageId,
        messages: {
          all: messageList.get.all.aiV5.model(),
          user: messageList.get.input.aiV5.model(),
          nonUser: []
        },
        output: {
          steps: [],
          usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 }
        },
        metadata: {},
        stepResult: {
          reason: "undefined",
          warnings: [],
          isContinued: true,
          totalUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 }
        }
      };
      if (!resumeContext) {
        safeEnqueue(controller, {
          type: "start",
          runId,
          from: "AGENT" /* AGENT */,
          payload: {
            id: agentId,
            messageId
          }
        });
      }
      const run = await agenticLoopWorkflow.createRun({
        runId
      });
      if (requireToolApproval) {
        requestContext.set("__mastra_requireToolApproval", true);
      }
      const executionResult = resumeContext ? await run.resume({
        resumeData: resumeContext.resumeData,
        ...createObservabilityContext(rest.modelSpanTracker?.getTracingContext()),
        requestContext,
        label: toolCallId
      }) : await run.start({
        inputData: initialData,
        ...createObservabilityContext(rest.modelSpanTracker?.getTracingContext()),
        requestContext
      });
      if (executionResult.status !== "success") {
        if (executionResult.status === "failed") {
          const error = getErrorFromUnknown(executionResult.error, {
            fallbackMessage: "Unknown error in agent workflow stream"
          });
          safeEnqueue(controller, {
            type: "error",
            runId,
            from: "AGENT" /* AGENT */,
            payload: { error }
          });
          if (rest.options?.onError) {
            await rest.options?.onError?.({ error });
          }
        }
        if (executionResult.status !== "suspended") {
          await agenticLoopWorkflow.deleteWorkflowRunById(runId);
        }
        safeClose(controller);
        return;
      }
      await agenticLoopWorkflow.deleteWorkflowRunById(runId);
      safeEnqueue(controller, {
        type: "finish",
        runId,
        from: "AGENT" /* AGENT */,
        payload: {
          ...executionResult.result,
          stepResult: {
            ...executionResult.result.stepResult,
            // @ts-expect-error - runtime reason can be 'tripwire' | 'retry' from processors, but zod schema infers as string
            reason: executionResult.result.stepResult.reason
          }
        }
      });
      safeClose(controller);
    }
  });
}

// src/loop/loop.ts
function loop({
  resumeContext,
  models,
  logger,
  runId,
  idGenerator,
  messageList,
  includeRawChunks,
  modelSettings,
  tools,
  _internal,
  outputProcessors,
  returnScorerData,
  requireToolApproval,
  agentId,
  toolCallConcurrency,
  ...rest
}) {
  let loggerToUse = logger || new ConsoleLogger({
    level: "debug"
  });
  if (models.length === 0 || !models[0]) {
    const mastraError = new MastraError({
      id: "LOOP_MODELS_EMPTY",
      domain: "LLM" /* LLM */,
      category: "USER" /* USER */
    });
    loggerToUse.trackException(mastraError);
    throw mastraError;
  }
  const firstModel = models[0];
  let runIdToUse = runId;
  if (!runIdToUse) {
    runIdToUse = idGenerator?.({
      idType: "run",
      source: "agent",
      entityId: agentId,
      threadId: _internal?.threadId,
      resourceId: _internal?.resourceId
    }) || crypto.randomUUID();
  }
  const internalToUse = {
    now: _internal?.now || (() => Date.now()),
    generateId: _internal?.generateId || (() => generateId()),
    currentDate: _internal?.currentDate || (() => /* @__PURE__ */ new Date()),
    saveQueueManager: _internal?.saveQueueManager,
    memoryConfig: _internal?.memoryConfig,
    threadId: _internal?.threadId,
    resourceId: _internal?.resourceId,
    memory: _internal?.memory,
    threadExists: _internal?.threadExists,
    transportRef: _internal?.transportRef ?? {}
  };
  let startTimestamp = internalToUse.now?.();
  const messageId = rest.experimental_generateMessageId?.() || internalToUse.generateId?.();
  let modelOutput;
  const serializeStreamState = () => {
    return modelOutput?.serializeState();
  };
  const deserializeStreamState = (state) => {
    modelOutput?.deserializeState(state);
  };
  const processorStates = rest.processorStates ?? /* @__PURE__ */ new Map();
  const workflowLoopProps = {
    resumeContext,
    models,
    runId: runIdToUse,
    logger: loggerToUse,
    startTimestamp,
    messageList,
    includeRawChunks: !!includeRawChunks,
    _internal: internalToUse,
    tools,
    modelSettings,
    outputProcessors,
    messageId,
    agentId,
    requireToolApproval,
    toolCallConcurrency,
    streamState: {
      serialize: serializeStreamState,
      deserialize: deserializeStreamState
    },
    processorStates,
    ...rest
  };
  const existingSnapshot = resumeContext?.snapshot;
  let initialStreamState;
  if (existingSnapshot) {
    for (const key in existingSnapshot?.context) {
      const step = existingSnapshot?.context[key];
      if (step && step.status === "suspended" && step.suspendPayload?.__streamState) {
        initialStreamState = step.suspendPayload?.__streamState;
        break;
      }
    }
  }
  const baseStream = workflowLoopStream(workflowLoopProps);
  const stream = rest.modelSpanTracker?.wrapStream(baseStream) ?? baseStream;
  const observabilityContext = createObservabilityContext(rest.modelSpanTracker?.getTracingContext());
  modelOutput = new MastraModelOutput({
    model: {
      modelId: firstModel.model.modelId,
      provider: firstModel.model.provider,
      version: firstModel.model.specificationVersion
    },
    stream,
    messageList,
    messageId,
    options: {
      runId: runIdToUse,
      toolCallStreaming: rest.toolCallStreaming,
      onFinish: rest.options?.onFinish,
      onStepFinish: rest.options?.onStepFinish,
      includeRawChunks: !!includeRawChunks,
      structuredOutput: rest.structuredOutput,
      outputProcessors,
      returnScorerData,
      ...observabilityContext,
      requestContext: rest.requestContext,
      processorStates,
      transportRef: internalToUse.transportRef
    },
    initialState: initialStreamState
  });
  return createDestructurableOutput(modelOutput);
}

// src/llm/model/model.loop.ts
var MastraLLMVNext = class extends MastraBase {
  #models;
  #mastra;
  #options;
  #firstModel;
  constructor({
    mastra,
    models,
    options
  }) {
    super({ name: "aisdk" });
    this.#options = options;
    if (mastra) {
      this.#mastra = mastra;
      if (mastra.getLogger()) {
        this.__setLogger(this.#mastra.getLogger());
      }
    }
    if (models.length === 0 || !models[0]) {
      const mastraError = new MastraError({
        id: "LLM_LOOP_MODELS_EMPTY",
        domain: "LLM" /* LLM */,
        category: "USER" /* USER */
      });
      this.logger.trackException(mastraError);
      throw mastraError;
    } else {
      this.#models = models;
      this.#firstModel = models[0];
    }
  }
  __registerPrimitives(p) {
    if (p.logger) {
      this.__setLogger(p.logger);
    }
  }
  __registerMastra(p) {
    this.#mastra = p;
  }
  getProvider() {
    return this.#firstModel.model.provider;
  }
  getModelId() {
    return this.#firstModel.model.modelId;
  }
  getModel() {
    return this.#firstModel.model;
  }
  convertToMessages(messages) {
    if (Array.isArray(messages)) {
      return messages.map((m) => {
        if (typeof m === "string") {
          return {
            role: "user",
            content: m
          };
        }
        return m;
      });
    }
    return [
      {
        role: "user",
        content: messages
      }
    ];
  }
  stream({
    resumeContext,
    runId,
    stopWhen = stepCountIs(5),
    maxSteps,
    tools = {},
    modelSettings,
    toolChoice = "auto",
    threadId,
    resourceId,
    structuredOutput,
    options,
    inputProcessors,
    outputProcessors,
    errorProcessors,
    returnScorerData,
    providerOptions,
    messageList,
    requireToolApproval,
    toolCallConcurrency,
    _internal,
    agentId,
    agentName,
    toolCallId,
    requestContext,
    methodType,
    includeRawChunks,
    autoResumeSuspendedTools,
    maxProcessorRetries,
    processorStates,
    activeTools,
    isTaskComplete,
    onIterationComplete,
    workspace,
    ...rest
  }) {
    const observabilityContext = resolveObservabilityContext(rest);
    let stopWhenToUse;
    if (maxSteps && typeof maxSteps === "number") {
      stopWhenToUse = stepCountIs(maxSteps);
    } else {
      stopWhenToUse = stopWhen;
    }
    const messages = messageList.get.all.aiV5.model();
    const firstModel = this.#firstModel.model;
    const modelSpan = observabilityContext.tracingContext.currentSpan?.createChildSpan({
      name: `llm: '${firstModel.modelId}'`,
      type: "model_generation" /* MODEL_GENERATION */,
      input: {
        messages: [...messageList.getAllSystemMessages(), ...messages]
      },
      attributes: {
        model: firstModel.modelId,
        provider: firstModel.provider,
        streaming: true,
        parameters: modelSettings
      },
      metadata: {
        runId,
        threadId,
        resourceId
      },
      tracingPolicy: this.#options?.tracingPolicy,
      requestContext
    });
    if (modelSpan) {
      executeWithContextSync({
        span: modelSpan,
        fn: () => this.logger.debug("Streaming text", {
          runId,
          threadId,
          resourceId,
          messages,
          tools: Object.keys(tools || {})
        })
      });
    }
    const modelSpanTracker = modelSpan?.createTracker();
    try {
      const loopOptions = {
        mastra: this.#mastra,
        resumeContext,
        runId,
        toolCallId,
        messageList,
        models: this.#models,
        logger: this.logger,
        tools,
        stopWhen: stopWhenToUse,
        toolChoice,
        modelSettings,
        providerOptions,
        _internal,
        structuredOutput,
        inputProcessors,
        outputProcessors,
        errorProcessors,
        returnScorerData,
        modelSpanTracker,
        requireToolApproval,
        toolCallConcurrency,
        agentId,
        agentName,
        requestContext,
        methodType,
        includeRawChunks,
        autoResumeSuspendedTools,
        maxProcessorRetries,
        processorStates,
        activeTools,
        isTaskComplete,
        onIterationComplete,
        workspace,
        ...observabilityContext,
        options: {
          ...options,
          onStepFinish: async (props) => {
            try {
              await options?.onStepFinish?.({ ...props, runId });
            } catch (e) {
              const mastraError = new MastraError(
                {
                  id: "LLM_STREAM_ON_STEP_FINISH_CALLBACK_EXECUTION_FAILED",
                  domain: "LLM" /* LLM */,
                  category: "USER" /* USER */,
                  details: {
                    modelId: props.model?.modelId,
                    modelProvider: props.model?.provider,
                    runId: runId ?? "unknown",
                    threadId: threadId ?? "unknown",
                    resourceId: resourceId ?? "unknown",
                    finishReason: props?.finishReason,
                    toolCalls: props?.toolCalls ? JSON.stringify(props.toolCalls) : "",
                    toolResults: props?.toolResults ? JSON.stringify(props.toolResults) : "",
                    usage: props?.usage ? JSON.stringify(props.usage) : ""
                  }
                },
                e
              );
              modelSpanTracker?.reportGenerationError({ error: mastraError });
              this.logger.trackException(mastraError);
              throw mastraError;
            }
            this.logger.debug("Stream step change", {
              text: props?.text,
              toolCalls: props?.toolCalls,
              toolResults: props?.toolResults,
              finishReason: props?.finishReason,
              usage: props?.usage,
              runId
            });
            const remainingTokens = parseInt(props?.response?.headers?.["x-ratelimit-remaining-tokens"] ?? "", 10);
            if (!isNaN(remainingTokens) && remainingTokens > 0 && remainingTokens < 2e3) {
              this.logger.warn("Rate limit approaching, waiting 10 seconds", { runId });
              await delay(10 * 1e3);
            }
          },
          onFinish: async (props) => {
            modelSpanTracker?.endGeneration({
              output: {
                files: props?.files,
                object: props?.object,
                reasoning: props?.reasoning,
                reasoningText: props?.reasoningText,
                sources: props?.sources,
                text: props?.text,
                warnings: props?.warnings
              },
              attributes: {
                finishReason: props?.finishReason,
                responseId: props?.response.id,
                responseModel: props?.response.modelId
              },
              usage: props?.totalUsage,
              providerMetadata: props?.providerMetadata
            });
            try {
              await options?.onFinish?.({ ...props, runId });
            } catch (e) {
              const mastraError = new MastraError(
                {
                  id: "LLM_STREAM_ON_FINISH_CALLBACK_EXECUTION_FAILED",
                  domain: "LLM" /* LLM */,
                  category: "USER" /* USER */,
                  details: {
                    modelId: props.model?.modelId,
                    modelProvider: props.model?.provider,
                    runId: runId ?? "unknown",
                    threadId: threadId ?? "unknown",
                    resourceId: resourceId ?? "unknown",
                    finishReason: props?.finishReason,
                    toolCalls: props?.toolCalls ? JSON.stringify(props.toolCalls) : "",
                    toolResults: props?.toolResults ? JSON.stringify(props.toolResults) : "",
                    usage: props?.usage ? JSON.stringify(props.usage) : ""
                  }
                },
                e
              );
              modelSpanTracker?.reportGenerationError({ error: mastraError });
              this.logger.trackException(mastraError);
              throw mastraError;
            }
            this.logger.debug("Stream finished", {
              text: props?.text,
              toolCalls: props?.toolCalls,
              toolResults: props?.toolResults,
              finishReason: props?.finishReason,
              usage: props?.usage,
              runId,
              threadId,
              resourceId
            });
          }
        },
        maxSteps
      };
      return loop(loopOptions);
    } catch (e) {
      const mastraError = new MastraError(
        {
          id: "LLM_STREAM_TEXT_AI_SDK_EXECUTION_FAILED",
          domain: "LLM" /* LLM */,
          category: "THIRD_PARTY" /* THIRD_PARTY */,
          details: {
            modelId: firstModel.modelId,
            modelProvider: firstModel.provider,
            runId: runId ?? "unknown",
            threadId: threadId ?? "unknown",
            resourceId: resourceId ?? "unknown"
          }
        },
        e
      );
      modelSpanTracker?.reportGenerationError({ error: mastraError });
      throw mastraError;
    }
  }
};
var PRIMITIVE_TYPES = _enum(["agent", "workflow", "none", "tool"]);

// src/loop/network/index.ts
function schemaToJsonSchema(schema) {
  if (isStandardSchemaWithJSON(schema)) {
    return standardSchemaToJSONSchema(schema);
  }
  try {
    const standardSchema = toStandardSchema5(schema);
    return standardSchemaToJSONSchema(standardSchema);
  } catch {
    throw new Error("We could not convert the schema to a JSONSchema");
  }
}
async function safeParseLLMJson(text) {
  if (!text?.trim()) {
    return null;
  }
  const preprocessed = escapeUnescapedControlCharsInJsonStrings(text);
  const { value, state } = await parsePartialJson(preprocessed);
  if (state === "successful-parse" || state === "repaired-parse") {
    return value;
  }
  return null;
}
function filterMessagesForSubAgent(messages) {
  return messages.filter((msg) => {
    if (msg.role === "user") return true;
    if (msg.role === "assistant") {
      const metadata = msg.content?.metadata;
      if (metadata?.mode === "network" || metadata?.completionResult) {
        return false;
      }
      const parts = msg.content?.parts ?? [];
      for (const part of parts) {
        if (part?.type === "text" && part?.text) {
          try {
            const parsed = JSON.parse(part.text);
            if (parsed.isNetwork) return false;
            if (parsed.primitiveId && parsed.selectionReason) return false;
          } catch {
          }
        }
      }
      return true;
    }
    return false;
  });
}
async function getRoutingAgent({
  requestContext,
  agent,
  routingConfig
}) {
  const instructionsToUse = await agent.getInstructions({ requestContext });
  const agentsToUse = await agent.listAgents({ requestContext });
  const workflowsToUse = await agent.listWorkflows({ requestContext });
  const toolsToUse = await agent.listTools({ requestContext });
  const model = await agent.getModel({ requestContext });
  const memoryToUse = await agent.getMemory({ requestContext });
  const clientToolsToUse = (await agent.getDefaultOptions({ requestContext }))?.clientTools;
  const configuredInputProcessors = await agent.listConfiguredInputProcessors(requestContext);
  const configuredOutputProcessors = await agent.listConfiguredOutputProcessors(requestContext);
  const agentList = Object.entries(agentsToUse).map(([name, agent2]) => {
    return ` - **${name}**: ${agent2.getDescription()}`;
  }).join("\n");
  const workflowList = Object.entries(workflowsToUse).map(([name, workflow]) => {
    return ` - **${name}**: ${workflow.description}, input schema: ${JSON.stringify(
      schemaToJsonSchema(workflow.inputSchema ?? object({}))
    )}`;
  }).join("\n");
  const memoryTools = await memoryToUse?.listTools?.();
  const toolList = Object.entries({ ...toolsToUse, ...memoryTools, ...clientToolsToUse || {} }).map(([name, tool2]) => {
    const inputSchema = "inputSchema" in tool2 ? tool2.inputSchema ?? object({}) : object({});
    return ` - **${name}**: ${tool2.description}, input schema: ${JSON.stringify(schemaToJsonSchema(inputSchema))}`;
  }).join("\n");
  const additionalInstructionsSection = routingConfig?.additionalInstructions ? `
## Additional Instructions
${routingConfig.additionalInstructions}` : "";
  const instructions = `
          You are a router in a network of specialized AI agents.
          Your job is to decide which agent should handle each step of a task.
          If asking for completion of a task, make sure to follow system instructions closely.

          Every step will result in a prompt message. It will be a JSON object with a "selectionReason" and "finalResult" property. Make your decision based on previous decision history, as well as the overall task criteria. If you already called a primitive, you shouldn't need to call it again, unless you strongly believe it adds something to the task completion criteria. Make sure to call enough primitives to complete the task.

          ## System Instructions
          ${instructionsToUse}
          You can only pick agents and workflows that are available in the lists below. Never call any agents or workflows that are not available in the lists below.
          ## Available Agents in Network
          ${agentList}
          ## Available Workflows in Network (make sure to use inputs corresponding to the input schema when calling a workflow)
          ${workflowList}
          ## Available Tools in Network (make sure to use inputs corresponding to the input schema when calling a tool)
          ${toolList}
          If you have multiple entries that need to be called with a workflow or agent, call them separately with each input.
          When calling a workflow, the prompt should be a JSON value that corresponds to the input schema of the workflow. The JSON value is stringified.
          When calling a tool, the prompt should be a JSON value that corresponds to the input schema of the tool. The JSON value is stringified.
          When calling an agent, the prompt should be a text value, like you would call an LLM in a chat interface.
          Keep in mind that the user only sees the final result of the task. When reviewing completion, you should know that the user will not see the intermediate results.
          ${additionalInstructionsSection}
        `;
  return new Agent({
    id: "routing-agent",
    name: "Routing Agent",
    instructions,
    model,
    memory: memoryToUse,
    inputProcessors: configuredInputProcessors,
    outputProcessors: configuredOutputProcessors,
    // @ts-expect-error - internal property for agent network
    _agentNetworkAppend: true
  });
}
function getLastMessage(messages) {
  let message = "";
  if (typeof messages === "string") {
    message = messages;
  } else {
    const lastMessage = Array.isArray(messages) ? messages[messages.length - 1] : messages;
    if (typeof lastMessage === "string") {
      message = lastMessage;
    } else if (lastMessage && "content" in lastMessage && lastMessage?.content) {
      const lastMessageContent = lastMessage.content;
      if (typeof lastMessageContent === "string") {
        message = lastMessageContent;
      } else if (Array.isArray(lastMessageContent)) {
        const lastPart = lastMessageContent[lastMessageContent.length - 1];
        if (lastPart?.type === "text") {
          message = lastPart.text;
        }
      }
    } else if (lastMessage && "parts" in lastMessage && lastMessage?.parts) {
      const parts = lastMessage.parts;
      if (Array.isArray(parts)) {
        const lastPart = parts[parts.length - 1];
        if (lastPart?.type === "text" && lastPart?.text) {
          message = lastPart.text;
        }
      }
    }
  }
  return message;
}
async function prepareMemoryStep({
  threadId,
  resourceId,
  messages,
  routingAgent,
  requestContext,
  generateId: generateId2,
  memoryConfig,
  ...rest
}) {
  const observabilityContext = resolveObservabilityContext(rest);
  const memory = await routingAgent.getMemory({ requestContext });
  let thread = await memory?.getThreadById({ threadId });
  if (!thread) {
    thread = await memory?.createThread({
      threadId,
      title: `New Thread ${(/* @__PURE__ */ new Date()).toISOString()}`,
      resourceId
    });
  }
  let userMessage;
  const promises = [];
  if (typeof messages === "string") {
    userMessage = messages;
    if (memory) {
      promises.push(
        memory.saveMessages({
          messages: [
            {
              id: generateId2({
                idType: "message",
                source: "agent",
                threadId: thread?.id,
                resourceId: thread?.resourceId,
                role: "user"
              }),
              type: "text",
              role: "user",
              content: { parts: [{ type: "text", text: messages }], format: 2 },
              createdAt: /* @__PURE__ */ new Date(),
              threadId: thread?.id,
              resourceId: thread?.resourceId
            }
          ],
          observabilityContext
        })
      );
    }
  } else {
    const messageList = new MessageList({
      threadId: thread?.id,
      resourceId: thread?.resourceId
    });
    messageList.add(messages, "user");
    const messagesToSave = messageList.get.all.db();
    if (memory) {
      promises.push(
        memory.saveMessages({
          messages: messagesToSave,
          observabilityContext
        })
      );
    }
    const uiMessages = messageList.get.all.ui();
    const mostRecentUserMessage = routingAgent.getMostRecentUserMessage(uiMessages);
    userMessage = mostRecentUserMessage?.content;
  }
  if (thread && memory) {
    const config = memory.getMergedThreadConfig(memoryConfig || {});
    const {
      shouldGenerate,
      model: titleModel,
      instructions: titleInstructions
    } = routingAgent.resolveTitleGenerationConfig(config?.generateTitle);
    if (shouldGenerate && userMessage) {
      const existingMessages = await memory.recall({
        threadId: thread.id,
        resourceId: thread.resourceId,
        observabilityContext
      });
      const existingUserMessages = existingMessages.messages.filter((m) => m.role === "user");
      const isFirstUserMessage = existingUserMessages.length === 0;
      if (isFirstUserMessage) {
        promises.push(
          routingAgent.genTitle(userMessage, requestContext, observabilityContext, titleModel, titleInstructions).then((title) => {
            if (title) {
              return memory.createThread({
                threadId: thread.id,
                resourceId: thread.resourceId,
                memoryConfig,
                title,
                metadata: thread.metadata
              });
            }
          })
        );
      }
    }
  }
  await Promise.all(promises);
  return { thread };
}
async function saveMessagesWithProcessors(memory, messages, processorRunner, context) {
  if (!memory) return;
  const { requestContext, ...observabilityContext } = context ?? {};
  const resolved = resolveObservabilityContext(observabilityContext);
  if (!processorRunner || messages.length === 0) {
    await memory.saveMessages({ messages, observabilityContext: resolved });
    return;
  }
  const messageList = new MessageList();
  for (const msg of messages) {
    messageList.add(msg, "response");
  }
  await processorRunner.runOutputProcessors(messageList, resolved, requestContext);
  const processedMessages = messageList.get.response.db();
  await memory.saveMessages({ messages: processedMessages, observabilityContext: resolved });
}
async function saveFinalResultIfProvided({
  memory,
  finalResult,
  threadId,
  resourceId,
  generateId: generateId2,
  processorRunner,
  requestContext
}) {
  if (memory && finalResult) {
    await saveMessagesWithProcessors(
      memory,
      [
        {
          id: generateId2(),
          type: "text",
          role: "assistant",
          content: {
            parts: [{ type: "text", text: finalResult }],
            format: 2
          },
          createdAt: /* @__PURE__ */ new Date(),
          threadId,
          resourceId
        }
      ],
      processorRunner,
      { requestContext }
    );
  }
}
async function createNetworkLoop({
  networkName,
  requestContext,
  runId,
  agent,
  generateId: generateId2,
  routingAgentOptions,
  routing,
  onStepFinish,
  onError,
  onAbort,
  abortSignal
}) {
  async function handleAbort(opts) {
    await onAbort?.({
      primitiveType: opts.primitiveType,
      primitiveId: opts.primitiveId,
      iteration: opts.iteration
    });
    await opts.writer?.write({
      type: opts.eventType,
      runId,
      from: "NETWORK" /* NETWORK */,
      payload: {
        primitiveType: opts.primitiveType,
        primitiveId: opts.primitiveId
      }
    });
    return {
      task: opts.task,
      primitiveId: opts.primitiveId,
      primitiveType: opts.primitiveType,
      result: "Aborted",
      isComplete: true,
      iteration: opts.iteration
    };
  }
  const configuredOutputProcessors = await agent.listConfiguredOutputProcessors(requestContext);
  const processorRunner = configuredOutputProcessors.length > 0 ? new ProcessorRunner({
    outputProcessors: configuredOutputProcessors,
    inputProcessors: [],
    logger: agent.getMastraInstance()?.getLogger() || noopLogger,
    agentName: agent.name
  }) : null;
  const routingStep = createStep({
    id: "routing-agent-step",
    inputSchema: object({
      task: string(),
      primitiveId: string(),
      primitiveType: PRIMITIVE_TYPES,
      result: string().optional(),
      iteration: number(),
      threadId: string().optional(),
      threadResourceId: string().optional(),
      isOneOff: boolean(),
      verboseIntrospection: boolean()
    }),
    outputSchema: object({
      task: string(),
      primitiveId: string(),
      primitiveType: PRIMITIVE_TYPES,
      prompt: string(),
      result: string(),
      isComplete: boolean().optional(),
      selectionReason: string(),
      iteration: number(),
      conversationContext: array(any()).optional()
    }),
    execute: async ({ inputData, getInitData, writer }) => {
      if (abortSignal?.aborted) {
        const base = await handleAbort({
          writer,
          eventType: "routing-agent-abort",
          primitiveType: "routing",
          primitiveId: "routing-agent",
          iteration: inputData.iteration,
          task: inputData.task
        });
        return {
          ...base,
          primitiveId: "none",
          primitiveType: "none",
          prompt: "",
          selectionReason: "Aborted",
          conversationContext: []
        };
      }
      const initData = await getInitData();
      const routingAgent = await getRoutingAgent({ requestContext, agent, routingConfig: routing });
      const iterationCount = (inputData.iteration ?? -1) + 1;
      const stepId = generateId2({
        idType: "step",
        source: "agent",
        stepType: "routing-agent"
      });
      await writer.write({
        type: "routing-agent-start",
        payload: {
          networkId: agent.id,
          agentId: routingAgent.id,
          runId: stepId,
          inputData: {
            ...inputData,
            iteration: iterationCount
          }
        },
        runId,
        from: "NETWORK" /* NETWORK */
      });
      const prompt = [
        {
          role: "assistant",
          content: `
                    ${inputData.isOneOff ? "You are executing just one primitive based on the user task. Make sure to pick the primitive that is the best suited to accomplish the whole task. Primitives that execute only part of the task should be avoided." : "You will be calling just *one* primitive at a time to accomplish the user task, every call to you is one decision in the process of accomplishing the user task. Make sure to pick primitives that are the best suited to accomplish the whole task. Completeness is the highest priority."}

                    The user has given you the following task:
                    ${inputData.task}

                    # Rules:

                    ## Agent:
                    - prompt should be a text value, like you would call an LLM in a chat interface.
                    - If you are calling the same agent again, make sure to adjust the prompt to be more specific.

                    ## Workflow/Tool:
                    - prompt should be a JSON value that corresponds to the input schema of the workflow or tool. The JSON value is stringified.
                    - Make sure to use inputs corresponding to the input schema when calling a workflow or tool.

                    DO NOT CALL THE PRIMITIVE YOURSELF. Make sure to not call the same primitive twice, unless you call it with different arguments and believe it adds something to the task completion criteria. Take into account previous decision making history and results in your decision making and final result. These are messages whose text is a JSON structure with "isNetwork" true.

                    Please select the most appropriate primitive to handle this task and the prompt to be sent to the primitive. If no primitive is appropriate, return "none" for the primitiveId and "none" for the primitiveType.

                    {
                        "primitiveId": string,
                        "primitiveType": "agent" | "workflow" | "tool",
                        "prompt": string,
                        "selectionReason": string
                    }

                    The 'selectionReason' property should explain why you picked the primitive${inputData.verboseIntrospection ? ", as well as why the other primitives were not picked." : "."}
                    `.trim()
        }
      ];
      const options = {
        structuredOutput: {
          schema: object({
            primitiveId: string().describe("The id of the primitive to be called"),
            primitiveType: PRIMITIVE_TYPES.describe("The type of the primitive to be called"),
            prompt: string().describe("The json string or text value to be sent to the primitive"),
            selectionReason: string().describe("The reason you picked the primitive")
          })
        },
        requestContext,
        maxSteps: 1,
        memory: {
          thread: initData?.threadId ?? runId,
          resource: initData?.threadResourceId ?? networkName,
          options: {
            readOnly: true,
            workingMemory: {
              enabled: false
            }
          }
        },
        ...routingAgentOptions,
        abortSignal,
        onAbort
      };
      let result;
      try {
        result = await tryGenerateWithJsonFallback(routingAgent, prompt, options);
      } catch (error) {
        if (abortSignal?.aborted) {
          const base = await handleAbort({
            writer,
            eventType: "routing-agent-abort",
            primitiveType: "routing",
            primitiveId: "routing-agent",
            iteration: iterationCount,
            task: inputData.task
          });
          return {
            ...base,
            primitiveId: "none",
            primitiveType: "none",
            prompt: "",
            selectionReason: "Aborted",
            conversationContext: []
          };
        }
        throw error;
      }
      if (abortSignal?.aborted) {
        const base = await handleAbort({
          writer,
          eventType: "routing-agent-abort",
          primitiveType: "routing",
          primitiveId: "routing-agent",
          iteration: iterationCount,
          task: inputData.task
        });
        return {
          ...base,
          primitiveId: "none",
          primitiveType: "none",
          prompt: "",
          selectionReason: "Aborted",
          conversationContext: []
        };
      }
      const object$1 = await result.object;
      if (!object$1) {
        throw new MastraError({
          id: "AGENT_NETWORK_ROUTING_AGENT_INVALID_OUTPUT",
          domain: "AGENT_NETWORK" /* AGENT_NETWORK */,
          category: "SYSTEM" /* SYSTEM */,
          text: `Routing agent returned undefined for 'object'. This may indicate an issue with the model's response or structured output parsing.`,
          details: {
            finishReason: result.finishReason ?? null,
            usage: JSON.stringify(result.usage) ?? null
          }
        });
      }
      const isComplete = object$1.primitiveId === "none" && object$1.primitiveType === "none";
      const conversationContext = filterMessagesForSubAgent(result.rememberedMessages ?? []);
      const endPayload = {
        task: inputData.task,
        result: isComplete ? object$1.selectionReason : "",
        primitiveId: object$1.primitiveId,
        primitiveType: object$1.primitiveType,
        prompt: object$1.prompt,
        isComplete,
        selectionReason: object$1.selectionReason,
        iteration: iterationCount,
        runId: stepId,
        conversationContext
      };
      await writer.write({
        type: "routing-agent-end",
        payload: {
          ...endPayload,
          usage: result.usage
        },
        from: "NETWORK" /* NETWORK */,
        runId
      });
      return endPayload;
    }
  });
  const agentStep = createStep({
    id: "agent-execution-step",
    inputSchema: object({
      task: string(),
      primitiveId: string(),
      primitiveType: PRIMITIVE_TYPES,
      prompt: string(),
      result: string(),
      isComplete: boolean().optional(),
      selectionReason: string(),
      iteration: number(),
      conversationContext: array(any()).optional()
    }),
    outputSchema: object({
      task: string(),
      primitiveId: string(),
      primitiveType: PRIMITIVE_TYPES,
      result: string(),
      isComplete: boolean().optional(),
      iteration: number()
    }),
    execute: async ({ inputData, writer, getInitData, suspend, resumeData }) => {
      if (abortSignal?.aborted) {
        return handleAbort({
          writer,
          eventType: "agent-execution-abort",
          primitiveType: "agent",
          primitiveId: inputData.primitiveId,
          iteration: inputData.iteration,
          task: inputData.task
        });
      }
      const agentsMap = await agent.listAgents({ requestContext });
      const agentForStep = agentsMap[inputData.primitiveId];
      if (!agentForStep) {
        const mastraError = new MastraError({
          id: "AGENT_NETWORK_AGENT_EXECUTION_STEP_INVALID_TASK_INPUT",
          domain: "AGENT_NETWORK" /* AGENT_NETWORK */,
          category: "USER" /* USER */,
          text: `Agent ${inputData.primitiveId} not found`
        });
        throw mastraError;
      }
      const agentId = agentForStep.id;
      const stepId = generateId2({
        idType: "step",
        source: "agent",
        entityId: agentId,
        stepType: "agent-execution"
      });
      await writer.write({
        type: "agent-execution-start",
        payload: {
          agentId,
          args: inputData,
          runId: stepId
        },
        from: "NETWORK" /* NETWORK */,
        runId
      });
      const initData = await getInitData();
      const threadId = initData?.threadId || runId;
      const resourceId = initData?.threadResourceId || networkName;
      const conversationContext = inputData.conversationContext ?? [];
      const messagesForSubAgent = [
        ...conversationContext,
        { role: "user", content: inputData.prompt }
      ];
      const result = await (resumeData ? agentForStep.resumeStream(resumeData, {
        requestContext,
        runId,
        memory: {
          thread: threadId,
          resource: resourceId,
          options: {
            lastMessages: 0
          }
        },
        onStepFinish,
        onError,
        abortSignal,
        onAbort
      }) : agentForStep.stream(messagesForSubAgent, {
        requestContext,
        runId,
        memory: {
          thread: threadId,
          resource: resourceId,
          options: {
            lastMessages: 0
          }
        },
        onStepFinish,
        onError,
        abortSignal,
        onAbort
      }));
      let requireApprovalMetadata;
      let suspendedTools;
      let toolCallDeclined = false;
      let agentCallAborted = false;
      for await (const chunk of result.fullStream) {
        await writer.write({
          type: `agent-execution-event-${chunk.type}`,
          payload: {
            ...chunk,
            runId: stepId
          },
          from: "NETWORK" /* NETWORK */,
          runId
        });
        if (chunk.type === "tool-call-approval") {
          requireApprovalMetadata = {
            ...requireApprovalMetadata ?? {},
            [inputData.primitiveId]: {
              resumeSchema: chunk.payload.resumeSchema,
              args: { prompt: inputData.prompt },
              toolName: inputData.primitiveId,
              toolCallId: inputData.primitiveId,
              runId,
              type: "approval",
              primitiveType: "agent",
              primitiveId: inputData.primitiveId
            }
          };
        }
        if (chunk.type === "tool-call-suspended") {
          suspendedTools = {
            ...suspendedTools ?? {},
            [inputData.primitiveId]: {
              suspendPayload: chunk.payload.suspendPayload,
              resumeSchema: chunk.payload.resumeSchema,
              toolName: inputData.primitiveId,
              toolCallId: inputData.primitiveId,
              args: { prompt: inputData.prompt },
              runId,
              type: "suspension",
              primitiveType: "agent",
              primitiveId: inputData.primitiveId
            }
          };
        }
        if (chunk.type === "tool-result") {
          if (chunk.payload.result === "Tool call was not approved by the user") {
            toolCallDeclined = true;
          }
        }
        if (chunk.type === "abort") {
          agentCallAborted = true;
        }
      }
      const memory = await agent.getMemory({ requestContext });
      const messages = result.messageList.get.all.v1();
      let finalText = await result.text;
      if (toolCallDeclined) {
        finalText = finalText + "\n\nTool call was not approved by the user";
      }
      if (agentCallAborted) {
        return handleAbort({
          writer,
          eventType: "agent-execution-abort",
          primitiveType: "agent",
          primitiveId: inputData.primitiveId,
          iteration: inputData.iteration,
          task: inputData.task
        });
      }
      await saveMessagesWithProcessors(
        memory,
        [
          {
            id: generateId2({
              idType: "message",
              source: "agent",
              entityId: agentId,
              threadId: initData?.threadId || runId,
              resourceId: initData?.threadResourceId || networkName,
              role: "assistant"
            }),
            type: "text",
            role: "assistant",
            content: {
              parts: [
                {
                  type: "text",
                  text: JSON.stringify({
                    isNetwork: true,
                    selectionReason: inputData.selectionReason,
                    primitiveType: inputData.primitiveType,
                    primitiveId: inputData.primitiveId,
                    input: inputData.prompt,
                    finalResult: { text: finalText, messages }
                  })
                }
              ],
              format: 2,
              metadata: {
                mode: "network",
                ...requireApprovalMetadata ? { requireApprovalMetadata } : {},
                ...suspendedTools ? { suspendedTools } : {}
              }
            },
            createdAt: /* @__PURE__ */ new Date(),
            threadId: initData?.threadId || runId,
            resourceId: initData?.threadResourceId || networkName
          }
        ],
        processorRunner,
        { requestContext }
      );
      if (requireApprovalMetadata || suspendedTools) {
        await writer.write({
          type: requireApprovalMetadata ? "agent-execution-approval" : "agent-execution-suspended",
          payload: {
            args: { prompt: inputData.prompt },
            agentId,
            runId: stepId,
            toolName: inputData.primitiveId,
            toolCallId: inputData.primitiveId,
            usage: await result.usage,
            selectionReason: inputData.selectionReason,
            ...requireApprovalMetadata ? {
              resumeSchema: requireApprovalMetadata[inputData.primitiveId].resumeSchema
            } : {},
            ...suspendedTools ? {
              resumeSchema: suspendedTools[inputData.primitiveId].resumeSchema,
              suspendPayload: suspendedTools[inputData.primitiveId].suspendPayload
            } : {}
          },
          from: "NETWORK" /* NETWORK */,
          runId
        });
        return await suspend({
          ...requireApprovalMetadata ? { requireToolApproval: requireApprovalMetadata[inputData.primitiveId] } : {},
          ...suspendedTools ? {
            toolCallSuspended: suspendedTools[inputData.primitiveId].suspendPayload,
            args: inputData.prompt,
            agentId
          } : {},
          runId: stepId
        });
      } else {
        const endPayload = {
          task: inputData.task,
          agentId,
          result: finalText,
          isComplete: false,
          iteration: inputData.iteration,
          runId: stepId
        };
        await writer.write({
          type: "agent-execution-end",
          payload: {
            ...endPayload,
            usage: await result.usage
          },
          from: "NETWORK" /* NETWORK */,
          runId
        });
        return {
          task: inputData.task,
          primitiveId: inputData.primitiveId,
          primitiveType: inputData.primitiveType,
          result: finalText,
          isComplete: false,
          iteration: inputData.iteration
        };
      }
    }
  });
  const workflowStep = createStep({
    id: "workflow-execution-step",
    inputSchema: object({
      task: string(),
      primitiveId: string(),
      primitiveType: PRIMITIVE_TYPES,
      prompt: string(),
      result: string(),
      isComplete: boolean().optional(),
      selectionReason: string(),
      iteration: number(),
      conversationContext: array(any()).optional()
    }),
    outputSchema: object({
      task: string(),
      primitiveId: string(),
      primitiveType: PRIMITIVE_TYPES,
      result: string(),
      isComplete: boolean().optional(),
      iteration: number()
    }),
    execute: async ({ inputData, writer, getInitData, suspend, resumeData, mastra }) => {
      if (abortSignal?.aborted) {
        return handleAbort({
          writer,
          eventType: "workflow-execution-abort",
          primitiveType: "workflow",
          primitiveId: inputData.primitiveId,
          iteration: inputData.iteration,
          task: inputData.task
        });
      }
      const workflowsMap = await agent.listWorkflows({ requestContext });
      const workflowId = inputData.primitiveId;
      const wf = workflowsMap[workflowId];
      if (!wf) {
        const mastraError = new MastraError({
          id: "AGENT_NETWORK_WORKFLOW_EXECUTION_STEP_INVALID_TASK_INPUT",
          domain: "AGENT_NETWORK" /* AGENT_NETWORK */,
          category: "USER" /* USER */,
          text: `Workflow ${workflowId} not found`
        });
        throw mastraError;
      }
      const input = await safeParseLLMJson(inputData.prompt);
      if (input === null) {
        const logger = mastra?.getLogger();
        logger?.warn(
          `Workflow execution step received invalid JSON prompt for workflow "${inputData.primitiveId}". Prompt was: "${inputData.prompt}". Returning error to routing agent for retry.`
        );
        return {
          task: inputData.task,
          primitiveId: inputData.primitiveId,
          primitiveType: inputData.primitiveType,
          result: `Error: The prompt provided for workflow "${inputData.primitiveId}" is not valid JSON. Received: "${inputData.prompt}". Workflows require a valid JSON string matching their input schema. Please provide the prompt as properly formatted JSON (e.g., {"key": "value"}).`,
          isComplete: false,
          iteration: inputData.iteration
        };
      }
      const stepId = generateId2({
        idType: "step",
        source: "workflow",
        entityId: wf.id,
        stepType: "workflow-execution"
      });
      const run = await wf.createRun({ runId });
      const networkAbortCb = async () => {
        await run.cancel();
        await onAbort?.({
          primitiveType: "workflow",
          primitiveId: inputData.primitiveId,
          iteration: inputData.iteration
        });
      };
      if (abortSignal) {
        abortSignal.addEventListener("abort", networkAbortCb);
      }
      const toolData = {
        workflowId: wf.id,
        args: inputData,
        runId: stepId
      };
      await writer?.write({
        type: "workflow-execution-start",
        payload: toolData,
        from: "NETWORK" /* NETWORK */,
        runId
      });
      const stream = resumeData ? run.resumeStream({
        resumeData,
        requestContext
      }) : run.stream({
        inputData: input,
        requestContext
      });
      let workflowCancelled = false;
      let chunks = [];
      for await (const chunk of stream.fullStream) {
        chunks.push(chunk);
        await writer?.write({
          type: `workflow-execution-event-${chunk.type}`,
          payload: {
            ...chunk,
            runId: stepId
          },
          from: "NETWORK" /* NETWORK */,
          runId
        });
        if (chunk.type === "workflow-canceled") {
          workflowCancelled = true;
        }
      }
      let runSuccess = true;
      const workflowState = await stream.result;
      if (!workflowState?.status || workflowState?.status === "failed") {
        runSuccess = false;
      }
      let resumeSchema;
      let suspendPayload;
      if (workflowState?.status === "suspended") {
        const suspendedStep = workflowState?.suspended?.[0]?.[0];
        suspendPayload = workflowState?.steps?.[suspendedStep]?.suspendPayload;
        if (suspendPayload?.__workflow_meta) {
          delete suspendPayload.__workflow_meta;
        }
        const firstSuspendedStepPath = [...workflowState?.suspended?.[0] ?? []];
        let wflowStep = wf;
        while (firstSuspendedStepPath.length > 0) {
          const key = firstSuspendedStepPath.shift();
          if (key) {
            if (!wflowStep.steps[key]) {
              mastra?.getLogger()?.warn(`Suspended step '${key}' not found in workflow '${workflowId}'`);
              break;
            }
            wflowStep = wflowStep.steps[key];
          }
        }
        const wflowStepSchema = wflowStep?.resumeSchema;
        if (wflowStepSchema) {
          resumeSchema = JSON.stringify(schemaToJsonSchema(wflowStepSchema));
        } else {
          resumeSchema = "";
        }
      }
      const finalResult = JSON.stringify({
        isNetwork: true,
        primitiveType: inputData.primitiveType,
        primitiveId: inputData.primitiveId,
        selectionReason: inputData.selectionReason,
        input,
        finalResult: {
          runId: run.runId,
          runResult: workflowState,
          chunks,
          runSuccess
        }
      });
      const memory = await agent.getMemory({ requestContext });
      const initData = await getInitData();
      if (workflowCancelled && abortSignal?.aborted) {
        return handleAbort({
          writer,
          eventType: "workflow-execution-abort",
          primitiveType: "workflow",
          primitiveId: inputData.primitiveId,
          iteration: inputData.iteration,
          task: inputData.task
        });
      }
      await saveMessagesWithProcessors(
        memory,
        [
          {
            id: generateId2({
              idType: "message",
              source: "workflow",
              entityId: wf.id,
              threadId: initData?.threadId || runId,
              resourceId: initData?.threadResourceId || networkName,
              role: "assistant"
            }),
            type: "text",
            role: "assistant",
            content: {
              parts: [{ type: "text", text: finalResult }],
              format: 2,
              metadata: {
                mode: "network",
                ...suspendPayload ? {
                  suspendedTools: {
                    [inputData.primitiveId]: {
                      args: input,
                      suspendPayload,
                      runId,
                      type: "suspension",
                      resumeSchema,
                      workflowId,
                      primitiveType: "workflow",
                      primitiveId: inputData.primitiveId,
                      toolName: inputData.primitiveId,
                      toolCallId: inputData.primitiveId
                    }
                  }
                } : {}
              }
            },
            createdAt: /* @__PURE__ */ new Date(),
            threadId: initData?.threadId || runId,
            resourceId: initData?.threadResourceId || networkName
          }
        ],
        processorRunner,
        { requestContext }
      );
      if (suspendPayload) {
        await writer?.write({
          type: "workflow-execution-suspended",
          payload: {
            args: input,
            workflowId,
            suspendPayload,
            resumeSchema,
            name: wf.name,
            runId: stepId,
            usage: await stream.usage,
            selectionReason: inputData.selectionReason,
            toolName: inputData.primitiveId,
            toolCallId: inputData.primitiveId
          },
          from: "NETWORK" /* NETWORK */,
          runId
        });
        return suspend({ ...toolData, workflowSuspended: suspendPayload });
      } else {
        const endPayload = {
          task: inputData.task,
          primitiveId: inputData.primitiveId,
          primitiveType: inputData.primitiveType,
          result: finalResult,
          isComplete: false,
          iteration: inputData.iteration
        };
        await writer?.write({
          type: "workflow-execution-end",
          payload: {
            ...endPayload,
            result: workflowState,
            name: wf.name,
            runId: stepId,
            usage: await stream.usage
          },
          from: "NETWORK" /* NETWORK */,
          runId
        });
        return endPayload;
      }
    }
  });
  const toolStep = createStep({
    id: "tool-execution-step",
    inputSchema: object({
      task: string(),
      primitiveId: string(),
      primitiveType: PRIMITIVE_TYPES,
      prompt: string(),
      result: string(),
      isComplete: boolean().optional(),
      selectionReason: string(),
      iteration: number(),
      conversationContext: array(any()).optional()
    }),
    outputSchema: object({
      task: string(),
      primitiveId: string(),
      primitiveType: PRIMITIVE_TYPES,
      result: string(),
      isComplete: boolean().optional(),
      iteration: number()
    }),
    resumeSchema: object({
      approved: boolean().describe("Controls if the tool call is approved or not, should be true when approved and false when declined")
    }),
    execute: async ({ inputData, getInitData, writer, resumeData, mastra, suspend }) => {
      const initData = await getInitData();
      const logger = mastra?.getLogger();
      if (abortSignal?.aborted) {
        return handleAbort({
          writer,
          eventType: "tool-execution-abort",
          primitiveType: "tool",
          primitiveId: inputData.primitiveId,
          iteration: inputData.iteration,
          task: inputData.task
        });
      }
      const agentTools = await agent.listTools({ requestContext });
      const memory = await agent.getMemory({ requestContext });
      const memoryTools = await memory?.listTools?.();
      const clientTools = (await agent.getDefaultOptions({ requestContext }))?.clientTools;
      const toolsMap = { ...agentTools, ...memoryTools, ...clientTools || {} };
      let tool2 = toolsMap[inputData.primitiveId];
      if (!tool2) {
        const mastraError = new MastraError({
          id: "AGENT_NETWORK_TOOL_EXECUTION_STEP_INVALID_TASK_INPUT",
          domain: "AGENT_NETWORK" /* AGENT_NETWORK */,
          category: "USER" /* USER */,
          text: `Tool ${inputData.primitiveId} not found`
        });
        throw mastraError;
      }
      if (!tool2.execute) {
        const mastraError = new MastraError({
          id: "AGENT_NETWORK_TOOL_EXECUTION_STEP_INVALID_TASK_INPUT",
          domain: "AGENT_NETWORK" /* AGENT_NETWORK */,
          category: "USER" /* USER */,
          text: `Tool ${inputData.primitiveId} does not have an execute function`
        });
        throw mastraError;
      }
      const toolId = tool2.id;
      const inputDataToUse = await safeParseLLMJson(inputData.prompt);
      if (inputDataToUse === null) {
        logger?.warn(
          `Tool execution step received invalid JSON prompt for tool "${toolId}". Prompt was: "${inputData.prompt}". Returning error to routing agent for retry.`
        );
        return {
          task: inputData.task,
          primitiveId: inputData.primitiveId,
          primitiveType: inputData.primitiveType,
          result: `Error: The prompt provided for tool "${toolId}" is not valid JSON. Received: "${inputData.prompt}". Tools require a valid JSON string matching their input schema. Please provide the prompt as properly formatted JSON (e.g., {"key": "value"}).`,
          isComplete: false,
          iteration: inputData.iteration
        };
      }
      const toolCallId = generateId2({
        idType: "step",
        source: "agent",
        entityId: toolId,
        stepType: "tool-execution"
      });
      await writer?.write({
        type: "tool-execution-start",
        payload: {
          args: {
            ...inputData,
            args: inputDataToUse,
            toolName: toolId,
            toolCallId
          },
          runId
        },
        from: "NETWORK" /* NETWORK */,
        runId
      });
      let toolRequiresApproval = tool2.requireApproval;
      if (tool2.needsApprovalFn) {
        try {
          const needsApprovalResult = await tool2.needsApprovalFn(inputDataToUse);
          toolRequiresApproval = needsApprovalResult;
        } catch (error) {
          logger?.error(`Error evaluating needsApprovalFn for tool ${toolId}:`, error);
          toolRequiresApproval = true;
        }
      }
      if (toolRequiresApproval) {
        if (abortSignal?.aborted) {
          return handleAbort({
            writer,
            eventType: "tool-execution-abort",
            primitiveType: "tool",
            primitiveId: inputData.primitiveId,
            iteration: inputData.iteration,
            task: inputData.task
          });
        }
        if (!resumeData) {
          const approvalSchema = object({
            approved: boolean().describe(
              "Controls if the tool call is approved or not, should be true when approved and false when declined"
            )
          });
          const requireApprovalResumeSchema = JSON.stringify(
            standardSchemaToJSONSchema(toStandardSchema5(approvalSchema))
          );
          await saveMessagesWithProcessors(
            memory,
            [
              {
                id: generateId2(),
                type: "text",
                role: "assistant",
                content: {
                  parts: [
                    {
                      type: "text",
                      text: JSON.stringify({
                        isNetwork: true,
                        selectionReason: inputData.selectionReason,
                        primitiveType: inputData.primitiveType,
                        primitiveId: inputData.primitiveId,
                        finalResult: { result: "", toolCallId },
                        input: inputDataToUse
                      })
                    }
                  ],
                  format: 2,
                  metadata: {
                    mode: "network",
                    requireApprovalMetadata: {
                      [inputData.primitiveId]: {
                        toolCallId,
                        toolName: inputData.primitiveId,
                        args: inputDataToUse,
                        type: "approval",
                        resumeSchema: requireApprovalResumeSchema,
                        runId,
                        primitiveType: "tool",
                        primitiveId: inputData.primitiveId
                      }
                    }
                  }
                },
                createdAt: /* @__PURE__ */ new Date(),
                threadId: initData.threadId || runId,
                resourceId: initData.threadResourceId || networkName
              }
            ],
            processorRunner,
            { requestContext }
          );
          await writer?.write({
            type: "tool-execution-approval",
            payload: {
              toolName: inputData.primitiveId,
              toolCallId,
              args: inputDataToUse,
              selectionReason: inputData.selectionReason,
              resumeSchema: requireApprovalResumeSchema,
              runId
            }
          });
          return suspend({
            requireToolApproval: {
              toolName: inputData.primitiveId,
              args: inputDataToUse,
              toolCallId
            }
          });
        } else {
          if (!resumeData.approved) {
            const rejectionResult = "Tool call was not approved by the user";
            await saveMessagesWithProcessors(
              memory,
              [
                {
                  id: generateId2(),
                  type: "text",
                  role: "assistant",
                  content: {
                    parts: [
                      {
                        type: "text",
                        text: JSON.stringify({
                          isNetwork: true,
                          selectionReason: inputData.selectionReason,
                          primitiveType: inputData.primitiveType,
                          primitiveId: inputData.primitiveId,
                          finalResult: { result: rejectionResult, toolCallId },
                          input: inputDataToUse
                        })
                      }
                    ],
                    format: 2,
                    metadata: {
                      mode: "network"
                    }
                  },
                  createdAt: /* @__PURE__ */ new Date(),
                  threadId: initData.threadId || runId,
                  resourceId: initData.threadResourceId || networkName
                }
              ],
              processorRunner,
              { requestContext }
            );
            const endPayload2 = {
              task: inputData.task,
              primitiveId: inputData.primitiveId,
              primitiveType: inputData.primitiveType,
              result: rejectionResult,
              isComplete: false,
              iteration: inputData.iteration,
              toolCallId,
              toolName: toolId
            };
            await writer?.write({
              type: "tool-execution-end",
              payload: endPayload2,
              from: "NETWORK" /* NETWORK */,
              runId
            });
            return endPayload2;
          }
        }
      }
      if (abortSignal?.aborted) {
        return handleAbort({
          writer,
          eventType: "tool-execution-abort",
          primitiveType: "tool",
          primitiveId: inputData.primitiveId,
          iteration: inputData.iteration,
          task: inputData.task
        });
      }
      let toolSuspendPayload;
      const finalResult = await tool2.execute(
        inputDataToUse,
        {
          abortSignal,
          requestContext,
          mastra: agent.getMastraInstance(),
          agent: {
            agentId: agent.id,
            resourceId: initData.threadResourceId || networkName,
            toolCallId,
            threadId: initData.threadId,
            suspend: async (suspendPayload, suspendOptions) => {
              await saveMessagesWithProcessors(
                memory,
                [
                  {
                    id: generateId2(),
                    type: "text",
                    role: "assistant",
                    content: {
                      parts: [
                        {
                          type: "text",
                          text: JSON.stringify({
                            isNetwork: true,
                            selectionReason: inputData.selectionReason,
                            primitiveType: inputData.primitiveType,
                            primitiveId: toolId,
                            finalResult: { result: "", toolCallId },
                            input: inputDataToUse
                          })
                        }
                      ],
                      format: 2,
                      metadata: {
                        mode: "network",
                        suspendedTools: {
                          [inputData.primitiveId]: {
                            toolCallId,
                            toolName: inputData.primitiveId,
                            args: inputDataToUse,
                            suspendPayload,
                            type: "suspension",
                            resumeSchema: suspendOptions?.resumeSchema ?? JSON.stringify(schemaToJsonSchema(tool2.resumeSchema)),
                            runId,
                            primitiveType: "tool",
                            primitiveId: inputData.primitiveId
                          }
                        }
                      }
                    },
                    createdAt: /* @__PURE__ */ new Date(),
                    threadId: initData.threadId || runId,
                    resourceId: initData.threadResourceId || networkName
                  }
                ],
                processorRunner,
                { requestContext }
              );
              await writer?.write({
                type: "tool-execution-suspended",
                payload: {
                  toolName: inputData.primitiveId,
                  toolCallId,
                  args: inputDataToUse,
                  resumeSchema: suspendOptions?.resumeSchema ?? JSON.stringify(schemaToJsonSchema(tool2.resumeSchema)),
                  suspendPayload,
                  runId,
                  selectionReason: inputData.selectionReason
                }
              });
              toolSuspendPayload = suspendPayload;
            },
            resumeData
          },
          runId,
          memory,
          context: inputDataToUse,
          // TODO: Pass proper tracing context when network supports tracing
          ...createObservabilityContext({ currentSpan: void 0 }),
          writer
        },
        { toolCallId, messages: [] }
      );
      if (toolSuspendPayload) {
        return await suspend({
          toolCallSuspended: toolSuspendPayload,
          toolName: inputData.primitiveId,
          args: inputDataToUse,
          toolCallId
        });
      }
      if (abortSignal?.aborted) {
        return handleAbort({
          writer,
          eventType: "tool-execution-abort",
          primitiveType: "tool",
          primitiveId: inputData.primitiveId,
          iteration: inputData.iteration,
          task: inputData.task
        });
      }
      await saveMessagesWithProcessors(
        memory,
        [
          {
            id: generateId2({
              idType: "message",
              source: "agent",
              entityId: toolId,
              threadId: initData.threadId,
              resourceId: initData.threadResourceId || networkName,
              role: "assistant"
            }),
            type: "text",
            role: "assistant",
            content: {
              parts: [
                {
                  type: "text",
                  text: JSON.stringify({
                    isNetwork: true,
                    selectionReason: inputData.selectionReason,
                    primitiveType: inputData.primitiveType,
                    primitiveId: toolId,
                    finalResult: { result: finalResult, toolCallId },
                    input: inputDataToUse
                  })
                }
              ],
              format: 2,
              metadata: {
                mode: "network"
              }
            },
            createdAt: /* @__PURE__ */ new Date(),
            threadId: initData.threadId || runId,
            resourceId: initData.threadResourceId || networkName
          }
        ],
        processorRunner,
        { requestContext }
      );
      const endPayload = {
        task: inputData.task,
        primitiveId: inputData.primitiveId,
        primitiveType: inputData.primitiveType,
        result: finalResult,
        isComplete: false,
        iteration: inputData.iteration,
        toolCallId,
        toolName: toolId
      };
      await writer?.write({
        type: "tool-execution-end",
        payload: endPayload,
        from: "NETWORK" /* NETWORK */,
        runId
      });
      return endPayload;
    }
  });
  const finishStep = createStep({
    id: "finish-step",
    inputSchema: object({
      task: string(),
      primitiveId: string(),
      primitiveType: PRIMITIVE_TYPES,
      prompt: string(),
      result: string(),
      isComplete: boolean().optional(),
      selectionReason: string(),
      iteration: number(),
      conversationContext: array(any()).optional()
    }),
    outputSchema: object({
      task: string(),
      result: string(),
      isComplete: boolean(),
      iteration: number()
    }),
    execute: async ({ inputData, writer }) => {
      let endResult = inputData.result;
      if (inputData.primitiveId === "none" && inputData.primitiveType === "none" && !inputData.result) {
        endResult = inputData.selectionReason;
      }
      const endPayload = {
        task: inputData.task,
        result: endResult,
        isComplete: !!inputData.isComplete,
        iteration: inputData.iteration,
        runId
      };
      await writer?.write({
        type: "network-execution-event-step-finish",
        payload: endPayload,
        from: "NETWORK" /* NETWORK */,
        runId
      });
      return endPayload;
    }
  });
  const networkWorkflow = createWorkflow({
    id: "Agent-Network-Outer-Workflow",
    inputSchema: object({
      task: string(),
      primitiveId: string(),
      primitiveType: PRIMITIVE_TYPES,
      result: string().optional(),
      iteration: number(),
      threadId: string().optional(),
      threadResourceId: string().optional(),
      isOneOff: boolean(),
      verboseIntrospection: boolean()
    }),
    outputSchema: object({
      task: string(),
      primitiveId: string(),
      primitiveType: PRIMITIVE_TYPES,
      prompt: string(),
      result: string(),
      isComplete: boolean().optional(),
      completionReason: string().optional(),
      iteration: number(),
      threadId: string().optional(),
      threadResourceId: string().optional(),
      isOneOff: boolean()
    }),
    options: {
      shouldPersistSnapshot: ({ workflowStatus }) => workflowStatus === "suspended",
      validateInputs: false
    }
  });
  networkWorkflow.then(routingStep).branch([
    [async ({ inputData }) => !inputData.isComplete && inputData.primitiveType === "agent", agentStep],
    [async ({ inputData }) => !inputData.isComplete && inputData.primitiveType === "workflow", workflowStep],
    [async ({ inputData }) => !inputData.isComplete && inputData.primitiveType === "tool", toolStep],
    [async ({ inputData }) => !!inputData.isComplete, finishStep]
  ]).map({
    task: {
      step: [routingStep, agentStep, workflowStep, toolStep],
      path: "task"
    },
    isComplete: {
      step: [agentStep, workflowStep, toolStep, finishStep],
      path: "isComplete"
    },
    completionReason: {
      step: [routingStep, agentStep, workflowStep, toolStep, finishStep],
      path: "completionReason"
    },
    result: {
      step: [agentStep, workflowStep, toolStep, finishStep],
      path: "result"
    },
    primitiveId: {
      step: [routingStep, agentStep, workflowStep, toolStep],
      path: "primitiveId"
    },
    primitiveType: {
      step: [routingStep, agentStep, workflowStep, toolStep],
      path: "primitiveType"
    },
    iteration: {
      step: [routingStep, agentStep, workflowStep, toolStep],
      path: "iteration"
    },
    isOneOff: {
      initData: networkWorkflow,
      path: "isOneOff"
    },
    threadId: {
      initData: networkWorkflow,
      path: "threadId"
    },
    threadResourceId: {
      initData: networkWorkflow,
      path: "threadResourceId"
    }
  }).commit();
  return { networkWorkflow, processorRunner };
}
async function networkLoop({
  networkName,
  requestContext,
  runId,
  routingAgent,
  routingAgentOptions,
  generateId: generateId2,
  maxIterations,
  threadId,
  resourceId,
  messages,
  validation,
  routing,
  onIterationComplete,
  resumeData,
  autoResumeSuspendedTools,
  mastra,
  structuredOutput,
  onStepFinish,
  onError,
  onAbort,
  abortSignal
}) {
  const memoryToUse = await routingAgent.getMemory({ requestContext });
  if (!memoryToUse) {
    throw new MastraError({
      id: "AGENT_NETWORK_MEMORY_REQUIRED",
      domain: "AGENT_NETWORK" /* AGENT_NETWORK */,
      category: "USER" /* USER */,
      text: "Memory is required for the agent network to function properly. Please configure memory for the agent.",
      details: {
        status: 400
      }
    });
  }
  const task = getLastMessage(messages);
  let resumeDataFromTask;
  let runIdFromTask;
  if (autoResumeSuspendedTools && threadId) {
    let lastAssistantMessage;
    let requireApprovalMetadata;
    let suspendedTools;
    const memory = await routingAgent.getMemory({ requestContext });
    const threadExists = await memory?.getThreadById({ threadId });
    if (threadExists) {
      const recallResult = await memory?.recall({
        threadId,
        resourceId: resourceId || networkName
      });
      if (recallResult && recallResult.messages?.length > 0) {
        const messages2 = [...recallResult.messages]?.reverse()?.filter((message) => message.role === "assistant");
        lastAssistantMessage = messages2[0];
      }
      if (lastAssistantMessage) {
        const { metadata } = lastAssistantMessage.content;
        if (metadata?.requireApprovalMetadata) {
          requireApprovalMetadata = metadata.requireApprovalMetadata;
        }
        if (metadata?.suspendedTools) {
          suspendedTools = metadata.suspendedTools;
        }
        if (requireApprovalMetadata || suspendedTools) {
          const suspendedToolsArr = Object.values({ ...suspendedTools, ...requireApprovalMetadata });
          const firstSuspendedTool = suspendedToolsArr[0];
          if (firstSuspendedTool.resumeSchema) {
            try {
              const llm = await routingAgent.getLLM({ requestContext });
              const systemInstructions = `
            You are an assistant used to resume a suspended tool call.
            Your job is to construct the resumeData for the tool call using the messages available to you and the schema passed.
            You will generate an object that matches this schema: ${firstSuspendedTool.resumeSchema}.
            The resumeData generated should be a JSON value that is constructed from the messages, using the schema as guide. The JSON value is stringified.

            {
              "resumeData": "string"
            }
          `;
              const messageList = new MessageList();
              messageList.addSystem(systemInstructions);
              messageList.add(task, "user");
              const result = llm.stream({
                methodType: "generate",
                requestContext,
                messageList,
                agentId: routingAgent.id,
                ...resolveObservabilityContext(routingAgentOptions ?? {}),
                structuredOutput: {
                  schema: object({
                    resumeData: string()
                  })
                }
              });
              const object$1 = await result.object;
              const resumeDataFromLLM = await safeParseLLMJson(object$1.resumeData);
              if (resumeDataFromLLM !== null && typeof resumeDataFromLLM === "object" && Object.keys(resumeDataFromLLM).length > 0) {
                resumeDataFromTask = resumeDataFromLLM;
                runIdFromTask = firstSuspendedTool.runId;
              }
            } catch (error) {
              mastra?.getLogger()?.error(`Error generating resume data for network agent ${routingAgent.id}`, error);
            }
          }
        }
      }
    }
  }
  const runIdToUse = runIdFromTask ?? runId;
  const resumeDataToUse = resumeDataFromTask ?? resumeData;
  const { memory: routingAgentMemoryOptions, ...routingAgentOptionsWithoutMemory } = routingAgentOptions || {};
  const { networkWorkflow, processorRunner } = await createNetworkLoop({
    networkName,
    requestContext,
    runId: runIdToUse,
    agent: routingAgent,
    routingAgentOptions: routingAgentOptionsWithoutMemory,
    generateId: generateId2,
    routing,
    onStepFinish,
    onError,
    onAbort,
    abortSignal
  });
  const validationStep = createStep({
    id: "validation-step",
    inputSchema: networkWorkflow.outputSchema,
    outputSchema: object({
      task: string(),
      primitiveId: string(),
      primitiveType: PRIMITIVE_TYPES,
      prompt: string(),
      result: string(),
      structuredObject: any().optional(),
      isComplete: boolean().optional(),
      completionReason: string().optional(),
      iteration: number(),
      validationPassed: boolean().optional(),
      validationFeedback: string().optional()
    }),
    execute: async ({ inputData, writer }) => {
      const configuredScorers = validation?.scorers || [];
      const memory = await routingAgent.getMemory({ requestContext });
      const recallResult = memory ? await memory.recall({ threadId: inputData.threadId || runIdToUse }) : { messages: [] };
      const completionContext = {
        iteration: inputData.iteration,
        maxIterations,
        messages: recallResult.messages,
        originalTask: inputData.task,
        selectedPrimitive: {
          id: inputData.primitiveId,
          type: inputData.primitiveType
        },
        primitivePrompt: inputData.prompt,
        primitiveResult: inputData.result,
        networkName,
        runId: runIdToUse,
        threadId: inputData.threadId,
        resourceId: inputData.threadResourceId,
        customContext: requestContext?.toJSON?.()
      };
      const hasConfiguredScorers = configuredScorers.length > 0;
      await writer?.write({
        type: "network-validation-start",
        payload: {
          runId: runIdToUse,
          iteration: inputData.iteration,
          checksCount: hasConfiguredScorers ? configuredScorers.length : 1
        },
        from: "NETWORK" /* NETWORK */,
        runId
      });
      let completionResult;
      let generatedFinalResult;
      let structuredObject;
      if (inputData.result === "Aborted") {
        completionResult = {
          complete: true,
          completionReason: "Task aborted",
          scorers: [],
          totalDuration: 0,
          timedOut: false
        };
      } else if (hasConfiguredScorers) {
        completionResult = await runValidation({ ...validation, scorers: configuredScorers }, completionContext);
        if (completionResult.complete) {
          const routingAgentToUse = await getRoutingAgent({
            requestContext,
            agent: routingAgent,
            routingConfig: routing
          });
          if (structuredOutput?.schema) {
            const structuredResult = await generateStructuredFinalResult(
              routingAgentToUse,
              completionContext,
              structuredOutput,
              {
                writer,
                stepId: generateId2(),
                runId: runIdToUse
              },
              abortSignal,
              onAbort
            );
            generatedFinalResult = structuredResult.text;
            structuredObject = structuredResult.object;
          } else {
            generatedFinalResult = await generateFinalResult(
              routingAgentToUse,
              completionContext,
              {
                writer,
                stepId: generateId2(),
                runId: runIdToUse
              },
              abortSignal,
              onAbort
            );
          }
          await saveFinalResultIfProvided({
            memory: await routingAgent.getMemory({ requestContext }),
            finalResult: generatedFinalResult,
            threadId: inputData.threadId || runIdToUse,
            resourceId: inputData.threadResourceId || networkName,
            generateId: generateId2,
            processorRunner,
            requestContext
          });
        }
      } else {
        const routingAgentToUse = await getRoutingAgent({
          requestContext,
          agent: routingAgent,
          routingConfig: routing
        });
        const defaultResult = await runDefaultCompletionCheck(
          routingAgentToUse,
          completionContext,
          {
            writer,
            stepId: generateId2(),
            runId: runIdToUse
          },
          abortSignal,
          onAbort
        );
        completionResult = {
          complete: defaultResult.passed,
          completionReason: defaultResult.reason,
          scorers: [defaultResult],
          totalDuration: defaultResult.duration,
          timedOut: false
        };
        generatedFinalResult = defaultResult.finalResult;
        if (defaultResult.passed && structuredOutput?.schema) {
          const structuredResult = await generateStructuredFinalResult(
            routingAgentToUse,
            completionContext,
            structuredOutput,
            {
              writer,
              stepId: generateId2(),
              runId
            },
            abortSignal,
            onAbort
          );
          if (structuredResult.text) {
            generatedFinalResult = structuredResult.text;
          }
          structuredObject = structuredResult.object;
        }
        if (defaultResult.passed) {
          await saveFinalResultIfProvided({
            memory: await routingAgent.getMemory({ requestContext }),
            finalResult: generatedFinalResult || defaultResult.finalResult,
            threadId: inputData.threadId || runIdToUse,
            resourceId: inputData.threadResourceId || networkName,
            generateId: generateId2,
            processorRunner,
            requestContext
          });
        }
      }
      const maxIterationReached = maxIterations && inputData.iteration >= maxIterations;
      await writer?.write({
        type: "network-validation-end",
        payload: {
          runId,
          iteration: inputData.iteration,
          passed: completionResult.complete,
          results: completionResult.scorers,
          duration: completionResult.totalDuration,
          timedOut: completionResult.timedOut,
          reason: completionResult.completionReason,
          maxIterationReached: !!maxIterationReached,
          suppressFeedback: !!validation?.suppressFeedback
        },
        from: "NETWORK" /* NETWORK */,
        runId: runIdToUse
      });
      const isComplete = completionResult.complete;
      if (onIterationComplete) {
        await onIterationComplete({
          iteration: inputData.iteration,
          primitiveId: inputData.primitiveId,
          primitiveType: inputData.primitiveType,
          result: inputData.result,
          isComplete
        });
      }
      const feedback = formatCompletionFeedback(completionResult, !!maxIterationReached);
      const memoryInstance = await routingAgent.getMemory({ requestContext });
      await saveMessagesWithProcessors(
        memoryInstance,
        [
          {
            id: generateId2(),
            type: "text",
            role: "assistant",
            content: {
              parts: [
                {
                  type: "text",
                  text: feedback
                }
              ],
              format: 2,
              metadata: {
                mode: "network",
                completionResult: {
                  passed: completionResult.complete,
                  suppressFeedback: !!validation?.suppressFeedback
                }
              }
            },
            createdAt: /* @__PURE__ */ new Date(),
            threadId: inputData.threadId || runIdToUse,
            resourceId: inputData.threadResourceId || networkName
          }
        ],
        processorRunner,
        { requestContext }
      );
      await new Promise((resolve2) => setTimeout(resolve2, 10));
      if (isComplete) {
        return {
          ...inputData,
          ...generatedFinalResult ? { result: generatedFinalResult } : {},
          ...structuredObject !== void 0 ? { structuredObject } : {},
          isComplete: true,
          validationPassed: true,
          completionReason: completionResult.completionReason || "Task complete"
        };
      } else {
        return {
          ...inputData,
          isComplete: false,
          validationPassed: false,
          validationFeedback: feedback
        };
      }
    }
  });
  const finalStep = createStep({
    id: "final-step",
    inputSchema: object({
      task: string(),
      primitiveId: string(),
      primitiveType: PRIMITIVE_TYPES,
      prompt: string(),
      result: string(),
      structuredObject: any().optional(),
      isComplete: boolean().optional(),
      completionReason: string().optional(),
      iteration: number(),
      validationPassed: boolean().optional(),
      validationFeedback: string().optional()
    }),
    outputSchema: object({
      task: string(),
      primitiveId: string(),
      primitiveType: PRIMITIVE_TYPES,
      prompt: string(),
      result: string(),
      object: any().optional(),
      isComplete: boolean().optional(),
      completionReason: string().optional(),
      iteration: number(),
      validationPassed: boolean().optional()
    }),
    execute: async ({ inputData, writer }) => {
      const { structuredObject, ...restInputData } = inputData;
      const finalData = {
        ...restInputData,
        ...structuredObject !== void 0 ? { object: structuredObject } : {},
        ...maxIterations && inputData.iteration >= maxIterations ? { completionReason: `Max iterations reached: ${maxIterations}` } : {}
      };
      await writer?.write({
        type: "network-execution-event-finish",
        payload: finalData,
        from: "NETWORK" /* NETWORK */,
        runId: runIdToUse
      });
      return finalData;
    }
  });
  const iterationWithValidation = createWorkflow({
    id: "iteration-with-validation",
    inputSchema: networkWorkflow.inputSchema,
    outputSchema: validationStep.outputSchema,
    options: {
      shouldPersistSnapshot: ({ workflowStatus }) => workflowStatus === "suspended",
      validateInputs: false
    }
  }).then(networkWorkflow).then(validationStep).commit();
  const mainWorkflow = createWorkflow({
    id: "agent-loop-main-workflow",
    inputSchema: object({
      iteration: number(),
      task: string(),
      primitiveId: string(),
      primitiveType: PRIMITIVE_TYPES,
      result: string().optional(),
      threadId: string().optional(),
      threadResourceId: string().optional(),
      isOneOff: boolean(),
      verboseIntrospection: boolean()
    }),
    outputSchema: object({
      task: string(),
      primitiveId: string(),
      primitiveType: PRIMITIVE_TYPES,
      prompt: string(),
      result: string(),
      isComplete: boolean().optional(),
      completionReason: string().optional(),
      iteration: number(),
      validationPassed: boolean().optional()
    }),
    options: {
      shouldPersistSnapshot: ({ workflowStatus }) => workflowStatus === "suspended",
      validateInputs: false
    }
  }).dountil(iterationWithValidation, async ({ inputData }) => {
    const llmComplete = inputData.isComplete === true;
    const validationOk = inputData.validationPassed !== false;
    const maxReached = Boolean(maxIterations && inputData.iteration >= maxIterations);
    return llmComplete && validationOk || maxReached;
  }).then(finalStep).commit();
  const mastraInstance = routingAgent.getMastraInstance();
  if (mastraInstance) {
    mainWorkflow.__registerMastra(mastraInstance);
    networkWorkflow.__registerMastra(mastraInstance);
  }
  const run = await mainWorkflow.createRun({
    runId: runIdToUse
  });
  const { thread } = await prepareMemoryStep({
    requestContext,
    threadId: threadId || run.runId,
    resourceId: resourceId || networkName,
    messages,
    routingAgent,
    generateId: generateId2,
    ...resolveObservabilityContext(routingAgentOptions ?? {}),
    memoryConfig: routingAgentMemoryOptions?.options
  });
  return new MastraAgentNetworkStream({
    run,
    createStream: () => {
      if (resumeDataToUse) {
        return run.resumeStream({
          resumeData: resumeDataToUse,
          requestContext
        }).fullStream;
      }
      return run.stream({
        inputData: {
          task,
          primitiveId: "",
          primitiveType: "none",
          // Start at -1 so first iteration increments to 0 (not 1)
          iteration: -1,
          threadResourceId: thread?.resourceId,
          threadId: thread?.id,
          isOneOff: false,
          verboseIntrospection: true
        },
        requestContext
      }).fullStream;
    }
  });
}

// src/processors/processors/skills.ts
var SkillsProcessor = class {
  id = "skills-processor";
  name = "Skills Processor";
  /** Workspace instance */
  _workspace;
  /** Format for skill injection */
  _format;
  constructor(opts) {
    this._workspace = opts.workspace;
    this._format = opts.format ?? "xml";
  }
  /**
   * Get the workspace skills interface
   */
  get skills() {
    return this._workspace.skills;
  }
  /**
   * List all skills available to this processor.
   * Used by the server to expose skills in the agent API response.
   */
  async listSkills() {
    const skillsList = await this.skills?.list();
    if (!skillsList) return [];
    return skillsList.map((skill) => ({
      name: skill.name,
      description: skill.description,
      license: skill.license
    }));
  }
  // ===========================================================================
  // Formatting Methods
  // ===========================================================================
  /**
   * Format skill location (path to SKILL.md file)
   */
  formatLocation(skill) {
    return `${skill.path}/SKILL.md`;
  }
  /**
   * Format skill source type for display
   */
  formatSourceType(skill) {
    return skill.source.type;
  }
  /**
   * Format available skills metadata based on configured format.
   * Skills are sorted by name for deterministic output (prompt cache stability).
   */
  async formatAvailableSkills() {
    const skillsList = await this.skills?.list();
    if (!skillsList || skillsList.length === 0) {
      return "";
    }
    const skillPromises = skillsList.map((meta) => this.skills?.get(meta.path));
    const fullSkills = (await Promise.all(skillPromises)).filter((s) => s !== void 0 && s !== null);
    const dedupedSkills = Array.from(new Map(fullSkills.map((skill) => [skill.path, skill])).values());
    dedupedSkills.sort((a, b) => a.name.localeCompare(b.name));
    switch (this._format) {
      case "xml": {
        const skillsXml = dedupedSkills.map(
          (skill) => `  <skill>
    <name>${this.escapeXml(skill.name)}</name>
    <description>${this.escapeXml(skill.description)}</description>
    <location>${this.escapeXml(this.formatLocation(skill))}</location>
    <source>${this.escapeXml(this.formatSourceType(skill))}</source>
  </skill>`
        ).join("\n");
        return `<available_skills>
${skillsXml}
</available_skills>`;
      }
      case "json": {
        return `Available Skills:

${JSON.stringify(
          dedupedSkills.map((s) => ({
            name: s.name,
            description: s.description,
            location: this.formatLocation(s),
            source: this.formatSourceType(s)
          })),
          null,
          2
        )}`;
      }
      case "markdown": {
        const skillsMd = dedupedSkills.map(
          (skill) => `- **${skill.name}** [${this.formatSourceType(skill)}] (${this.formatLocation(skill)}): ${skill.description}`
        ).join("\n");
        return `# Available Skills

${skillsMd}`;
      }
      default: {
        const _exhaustive = this._format;
        return _exhaustive;
      }
    }
  }
  /**
   * Escape XML special characters
   */
  escapeXml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
  }
  // ===========================================================================
  // processInputStep — system message injection only
  // ===========================================================================
  /**
   * Process input step - inject available skills metadata into the system
   * message.  Tools are provided by `Agent.listSkillTools()` instead.
   */
  async processInputStep({ messageList, stepNumber, requestContext }) {
    if (stepNumber === 0) {
      await this.skills?.maybeRefresh({ requestContext });
    }
    const skillsList = await this.skills?.list();
    const hasSkills = skillsList && skillsList.length > 0;
    if (hasSkills) {
      const availableSkillsMessage = await this.formatAvailableSkills();
      if (availableSkillsMessage) {
        messageList.addSystem({
          role: "system",
          content: availableSkillsMessage
        });
      }
      messageList.addSystem({
        role: "system",
        content: 'IMPORTANT: Skills are NOT tools. Do not call skill names directly as tool names. To use a skill, call the `skill` tool with the skill name as the "name" parameter. If multiple skills share the same name, use the skill path (shown in the location field) instead of the name to disambiguate. When a user asks about a topic covered by an available skill, activate it immediately without asking for permission first.'
      });
    }
  }
};

// src/processors/processors/workspace-instructions.ts
var WorkspaceInstructionsProcessor = class {
  id = "workspace-instructions-processor";
  name = "Workspace Instructions Processor";
  _workspace;
  constructor(opts) {
    this._workspace = opts.workspace;
  }
  async processInputStep({ messageList, requestContext }) {
    const instructions = this._workspace.getInstructions({ requestContext });
    if (instructions) {
      messageList.addSystem({ role: "system", content: instructions });
    }
    return { messageList };
  }
};

// src/agent/agent-legacy.ts
var import_fast_deep_equal = __toESM(require_fast_deep_equal(), 1);
var AgentLegacyHandler = class {
  constructor(capabilities) {
    this.capabilities = capabilities;
  }
  capabilities;
  /**
   * Prepares message list and tools before LLM execution and handles memory persistence after.
   * This is the legacy version that only works with v1 models.
   * @internal
   */
  __primitive({
    instructions,
    messages,
    context,
    thread,
    memoryConfig,
    resourceId,
    runId,
    toolsets,
    clientTools,
    requestContext,
    writableStream,
    methodType,
    tracingOptions,
    ...rest
  }) {
    const observabilityContext = resolveObservabilityContext(rest);
    return {
      before: async () => {
        const agentSpan = getOrCreateSpan({
          type: "agent_run" /* AGENT_RUN */,
          name: `agent run: '${this.capabilities.id}'`,
          entityType: EntityType.AGENT,
          entityId: this.capabilities.id,
          entityName: this.capabilities.name,
          input: {
            messages
          },
          attributes: {
            instructions: this.capabilities.convertInstructionsToString(instructions),
            availableTools: [
              ...toolsets ? Object.keys(toolsets) : [],
              ...clientTools ? Object.keys(clientTools) : []
            ],
            ...this.capabilities.resolvedVersionId ? { resolvedVersionId: this.capabilities.resolvedVersionId } : {}
          },
          metadata: {
            runId,
            resourceId,
            threadId: thread ? thread.id : void 0
          },
          tracingPolicy: this.capabilities.tracingPolicy,
          tracingOptions,
          tracingContext: observabilityContext.tracingContext,
          requestContext,
          mastra: this.capabilities.mastra
        });
        const innerObservabilityContext = createObservabilityContext({ currentSpan: agentSpan });
        const memory = await this.capabilities.getMemory({ requestContext });
        const threadId = thread?.id;
        const convertedTools = await this.capabilities.convertTools({
          toolsets,
          clientTools,
          threadId,
          resourceId,
          runId,
          requestContext,
          ...innerObservabilityContext,
          writableStream,
          methodType: methodType === "generate" ? "generateLegacy" : "streamLegacy",
          memoryConfig
        });
        let messageList = new MessageList({
          threadId,
          resourceId,
          generateMessageId: this.capabilities.mastra?.generateId?.bind(this.capabilities.mastra),
          // @ts-expect-error Flag for agent network messages
          _agentNetworkAppend: this.capabilities._agentNetworkAppend
        }).addSystem(instructions || await this.capabilities.getInstructions({ requestContext })).add(context || [], "context");
        if (!memory || !threadId && !resourceId) {
          messageList.add(messages, "user");
          const { tripwire: tripwire2 } = await this.capabilities.__runInputProcessors({
            requestContext,
            ...innerObservabilityContext,
            messageList
          });
          if (!tripwire2) {
            const inputStepResult = await this.capabilities.__runProcessInputStep({
              requestContext,
              ...innerObservabilityContext,
              messageList,
              stepNumber: 0
            });
            if (inputStepResult.tripwire) {
              return {
                messageObjects: [],
                convertedTools,
                threadExists: false,
                thread: void 0,
                messageList,
                agentSpan,
                tripwire: inputStepResult.tripwire
              };
            }
          }
          return {
            messageObjects: tripwire2 ? [] : messageList.get.all.prompt(),
            convertedTools,
            threadExists: false,
            thread: void 0,
            messageList,
            agentSpan,
            tripwire: tripwire2
          };
        }
        if (!threadId || !resourceId) {
          const mastraError = new MastraError({
            id: "AGENT_MEMORY_MISSING_RESOURCE_ID",
            domain: "AGENT" /* AGENT */,
            category: "USER" /* USER */,
            details: {
              agentName: this.capabilities.name,
              threadId: threadId || "",
              resourceId: resourceId || ""
            },
            text: `A resourceId and a threadId must be provided when using Memory. Saw threadId "${threadId}" and resourceId "${resourceId}"`
          });
          this.capabilities.logger.trackException(mastraError);
          agentSpan?.error({ error: mastraError });
          throw mastraError;
        }
        let threadObject = void 0;
        const existingThread = await memory.getThreadById({ threadId });
        if (existingThread) {
          if (!existingThread.metadata && thread.metadata || thread.metadata && !(0, import_fast_deep_equal.default)(existingThread.metadata, thread.metadata)) {
            threadObject = await memory.saveThread({
              thread: { ...existingThread, metadata: thread.metadata },
              memoryConfig
            });
          } else {
            threadObject = existingThread;
          }
        } else {
          threadObject = await memory.createThread({
            threadId,
            metadata: thread.metadata,
            title: thread.title,
            memoryConfig,
            resourceId,
            saveThread: true
          });
        }
        requestContext.set("MastraMemory", {
          thread: threadObject,
          resourceId,
          memoryConfig
        });
        messageList.add(messages, "user");
        const { messageList: processedMessageList, tripwire } = await this.capabilities.__runInputProcessors({
          requestContext,
          ...innerObservabilityContext,
          messageList
        });
        messageList = processedMessageList;
        if (!tripwire) {
          const inputStepResult = await this.capabilities.__runProcessInputStep({
            requestContext,
            ...innerObservabilityContext,
            messageList,
            stepNumber: 0
          });
          if (inputStepResult.tripwire) {
            return {
              convertedTools,
              thread: threadObject,
              messageList,
              messageObjects: [],
              agentSpan,
              tripwire: inputStepResult.tripwire,
              threadExists: !!existingThread
            };
          }
        }
        const processedList = messageList.get.all.prompt();
        return {
          convertedTools,
          thread: threadObject,
          messageList,
          // add old processed messages + new input messages
          messageObjects: processedList,
          agentSpan,
          tripwire,
          threadExists: !!existingThread
        };
      },
      after: async ({
        result,
        thread: threadAfter,
        threadId,
        memoryConfig: memoryConfig2,
        outputText,
        runId: runId2,
        messageList,
        threadExists,
        structuredOutput = false,
        overrideScorers,
        agentSpan
      }) => {
        const resToLog = {
          text: result?.text,
          object: result?.object,
          toolResults: result?.toolResults,
          toolCalls: result?.toolCalls,
          usage: result?.usage,
          steps: result?.steps?.map((s) => {
            return {
              stepType: s?.stepType,
              text: result?.text,
              object: result?.object,
              toolResults: result?.toolResults,
              toolCalls: result?.toolCalls,
              usage: result?.usage
            };
          })
        };
        this.capabilities.logger.debug("Post processing LLM response", {
          agentName: this.capabilities.name,
          runId: runId2,
          result: resToLog,
          threadId
        });
        const messageListResponses = new MessageList({
          threadId,
          resourceId,
          generateMessageId: this.capabilities.mastra?.generateId?.bind(this.capabilities.mastra),
          // @ts-expect-error Flag for agent network messages
          _agentNetworkAppend: this.capabilities._agentNetworkAppend
        }).add(result.response.messages, "response").get.all.core();
        const usedWorkingMemory = messageListResponses?.some(
          (m) => m.role === "tool" && m?.content?.some((c) => c?.toolName === "updateWorkingMemory")
        );
        const memory = await this.capabilities.getMemory({ requestContext });
        const thread2 = usedWorkingMemory ? threadId ? await memory?.getThreadById({ threadId }) : void 0 : threadAfter;
        if (memory && resourceId && thread2) {
          try {
            let responseMessages = result.response.messages;
            if (!responseMessages && result.object) {
              responseMessages = [
                {
                  role: "assistant",
                  content: [
                    {
                      type: "text",
                      text: outputText
                      // outputText contains the stringified object
                    }
                  ]
                }
              ];
            }
            if (responseMessages) {
              messageList.add(responseMessages, "response");
            }
            if (!threadExists) {
              await memory.createThread({
                threadId: thread2.id,
                metadata: thread2.metadata,
                title: thread2.title,
                memoryConfig: memoryConfig2,
                resourceId: thread2.resourceId
              });
            }
            const promises = [];
            const config = memory.getMergedThreadConfig(memoryConfig2);
            const {
              shouldGenerate,
              model: titleModel,
              instructions: titleInstructions,
              minMessages
            } = this.capabilities.resolveTitleGenerationConfig(config?.generateTitle);
            const uiMessages = messageList.get.all.ui();
            const messages2 = messageList.get.all.core();
            const requiredMessages = minMessages ?? 1;
            if (shouldGenerate && !thread2.title && messages2.length >= requiredMessages) {
              const userMessage = this.capabilities.getMostRecentUserMessage(uiMessages);
              if (userMessage) {
                const observabilityContext2 = createObservabilityContext({ currentSpan: agentSpan });
                promises.push(
                  this.capabilities.genTitle(userMessage, requestContext, observabilityContext2, titleModel, titleInstructions).then((title) => {
                    if (title) {
                      return memory.createThread({
                        threadId: thread2.id,
                        resourceId,
                        memoryConfig: memoryConfig2,
                        title,
                        metadata: thread2.metadata
                      });
                    }
                  })
                );
              }
            }
            if (promises.length > 0) {
              await Promise.all(promises);
            }
          } catch (e) {
            if (e instanceof MastraError) {
              agentSpan?.error({ error: e });
              throw e;
            }
            const mastraError = new MastraError(
              {
                id: "AGENT_MEMORY_PERSIST_RESPONSE_MESSAGES_FAILED",
                domain: "AGENT" /* AGENT */,
                category: "SYSTEM" /* SYSTEM */,
                details: {
                  agentName: this.capabilities.name,
                  runId: runId2 || "",
                  threadId: threadId || "",
                  result: JSON.stringify(resToLog)
                }
              },
              e
            );
            this.capabilities.logger.trackException(mastraError);
            agentSpan?.error({ error: mastraError });
            throw mastraError;
          }
        } else {
          let responseMessages = result.response.messages;
          if (!responseMessages && result.object) {
            responseMessages = [
              {
                role: "assistant",
                content: [
                  {
                    type: "text",
                    text: outputText
                    // outputText contains the stringified object
                  }
                ]
              }
            ];
          }
          if (responseMessages) {
            messageList.add(responseMessages, "response");
          }
        }
        await this.capabilities.runScorers({
          messageList,
          runId: runId2,
          requestContext,
          structuredOutput,
          overrideScorers,
          threadId,
          resourceId,
          ...createObservabilityContext({ currentSpan: agentSpan })
        });
        const scoringData = {
          input: {
            inputMessages: messageList.getPersisted.input.ui(),
            rememberedMessages: messageList.getPersisted.remembered.ui(),
            systemMessages: messageList.getSystemMessages(),
            taggedSystemMessages: messageList.getPersisted.taggedSystemMessages
          },
          output: messageList.getPersisted.response.ui()
        };
        agentSpan?.end({
          output: {
            text: result?.text,
            object: result?.object,
            files: result?.files
          }
        });
        return {
          scoringData
        };
      }
    };
  }
  /**
   * Prepares options and handlers for LLM text/object generation or streaming.
   * This is the legacy version that only works with v1 models.
   * @internal
   */
  async prepareLLMOptions(messages, options, methodType) {
    const {
      context,
      memoryOptions: memoryConfigFromArgs,
      resourceId: resourceIdFromArgs,
      maxSteps,
      onStepFinish,
      toolsets,
      clientTools,
      temperature,
      toolChoice = "auto",
      requestContext = new RequestContext(),
      tracingOptions,
      savePerStep,
      writableStream,
      ...args
    } = options;
    const resourceIdFromContext = requestContext.get(MASTRA_RESOURCE_ID_KEY);
    const threadIdFromContext = requestContext.get(MASTRA_THREAD_ID_KEY);
    const threadFromArgs = resolveThreadIdFromArgs({
      threadId: args.threadId,
      memory: args.memory,
      overrideId: threadIdFromContext
    });
    const resourceId = resourceIdFromContext || args.memory?.resource || resourceIdFromArgs;
    const memoryConfig = args.memory?.options || memoryConfigFromArgs;
    if (resourceId && threadFromArgs && !this.capabilities.hasOwnMemory()) {
      this.capabilities.logger.warn("No memory configured but resourceId and threadId were passed in args", {
        agent: this.capabilities.name
      });
    }
    const runId = args.runId || this.capabilities.mastra?.generateId({
      idType: "run",
      source: "agent",
      entityId: this.capabilities.id,
      threadId: threadFromArgs?.id,
      resourceId
    }) || randomUUID();
    const instructions = args.instructions || await this.capabilities.getInstructions({ requestContext });
    const llm = await this.capabilities.getLLM({
      requestContext,
      model: args.model
    });
    const memory = await this.capabilities.getMemory({ requestContext });
    const { before, after } = this.__primitive({
      messages,
      instructions,
      context,
      thread: threadFromArgs,
      memoryConfig,
      resourceId,
      runId,
      toolsets,
      clientTools,
      requestContext,
      writableStream,
      methodType,
      tracingOptions,
      ...resolveObservabilityContext(args)
    });
    let messageList;
    let thread;
    let threadExists;
    let threadCreatedByStep = false;
    return {
      llm,
      before: async () => {
        const beforeResult = await before();
        const { messageObjects, convertedTools, agentSpan } = beforeResult;
        threadExists = beforeResult.threadExists || false;
        threadCreatedByStep = false;
        messageList = beforeResult.messageList;
        thread = beforeResult.thread;
        const threadId = thread?.id;
        const result = {
          ...options,
          messages: messageObjects,
          tools: convertedTools,
          runId,
          temperature,
          toolChoice,
          threadId,
          resourceId,
          requestContext,
          onStepFinish: async (props) => {
            if (savePerStep) {
              if (!threadExists && !threadCreatedByStep && memory && thread) {
                await memory.createThread({
                  threadId,
                  title: thread.title,
                  metadata: thread.metadata,
                  resourceId: thread.resourceId,
                  memoryConfig
                });
                threadCreatedByStep = true;
              }
              await this.capabilities.saveStepMessages({
                result: props,
                messageList,
                runId
              });
            }
            return onStepFinish?.({ ...props, runId });
          },
          tripwire: beforeResult.tripwire,
          ...args,
          agentSpan
        };
        return { ...result, messageList, requestContext };
      },
      after: async ({
        result,
        outputText,
        structuredOutput = false,
        agentSpan,
        overrideScorers
      }) => {
        const afterResult = await after({
          result,
          outputText,
          threadId: thread?.id,
          thread,
          memoryConfig,
          runId,
          messageList,
          structuredOutput,
          threadExists,
          agentSpan,
          overrideScorers
        });
        return afterResult;
      }
    };
  }
  /**
   * Legacy implementation of generate method using AI SDK v4 models.
   * Use this method if you need to continue using AI SDK v4 models.
   */
  async generateLegacy(messages, generateOptions = {}) {
    if ("structuredOutput" in generateOptions && generateOptions.structuredOutput) {
      throw new MastraError({
        id: "AGENT_GENERATE_LEGACY_STRUCTURED_OUTPUT_NOT_SUPPORTED",
        domain: "AGENT" /* AGENT */,
        category: "USER" /* USER */,
        text: "This method does not support structured output. Please use generate() instead."
      });
    }
    const defaultGenerateOptionsLegacy = await Promise.resolve(
      this.capabilities.getDefaultGenerateOptionsLegacy({
        requestContext: generateOptions.requestContext
      })
    );
    const mergedGenerateOptions = {
      ...defaultGenerateOptionsLegacy,
      ...generateOptions,
      experimental_generateMessageId: defaultGenerateOptionsLegacy.experimental_generateMessageId || this.capabilities.mastra?.generateId?.bind(this.capabilities.mastra)
    };
    const { llm, before, after } = await this.prepareLLMOptions(messages, mergedGenerateOptions, "generate");
    if (llm.getModel().specificationVersion !== "v1") {
      const specVersion = llm.getModel().specificationVersion;
      this.capabilities.logger.error(
        `Models with specificationVersion "${specVersion}" are not supported for generateLegacy. Please use generate() instead.`,
        {
          modelId: llm.getModel().modelId,
          specificationVersion: specVersion
        }
      );
      throw new MastraError({
        id: "AGENT_GENERATE_V2_MODEL_NOT_SUPPORTED",
        domain: "AGENT" /* AGENT */,
        category: "USER" /* USER */,
        details: {
          modelId: llm.getModel().modelId,
          specificationVersion: specVersion
        },
        text: `Models with specificationVersion "${specVersion}" are not supported for generateLegacy(). Please use generate() instead.`
      });
    }
    const llmToUse = llm;
    const beforeResult = await before();
    const { messageList, requestContext: contextWithMemory } = beforeResult;
    const traceId = beforeResult.agentSpan?.externalTraceId;
    const spanId = beforeResult.agentSpan?.id;
    if (beforeResult.tripwire) {
      beforeResult.agentSpan?.end({
        output: { tripwire: beforeResult.tripwire },
        attributes: {
          tripwireAbort: {
            reason: beforeResult.tripwire.reason,
            processorId: beforeResult.tripwire.processorId,
            retry: beforeResult.tripwire.retry,
            metadata: beforeResult.tripwire.metadata
          }
        }
      });
      const tripwireResult = {
        text: "",
        object: void 0,
        usage: { totalTokens: 0, promptTokens: 0, completionTokens: 0 },
        finishReason: "other",
        response: {
          id: randomUUID(),
          timestamp: /* @__PURE__ */ new Date(),
          modelId: "tripwire",
          messages: []
        },
        responseMessages: [],
        toolCalls: [],
        toolResults: [],
        warnings: void 0,
        request: {
          body: JSON.stringify({ messages: [] })
        },
        experimental_output: void 0,
        steps: void 0,
        experimental_providerMetadata: void 0,
        tripwire: beforeResult.tripwire,
        traceId,
        spanId
      };
      return tripwireResult;
    }
    const { experimental_output, output, agentSpan, ...llmOptions } = beforeResult;
    const observabilityContext = createObservabilityContext({ currentSpan: agentSpan });
    let finalOutputProcessors = mergedGenerateOptions.outputProcessors;
    if (!output || experimental_output) {
      const result2 = await llmToUse.__text({
        ...llmOptions,
        ...observabilityContext,
        experimental_output
      });
      messageList.add(
        {
          role: "assistant",
          content: [{ type: "text", text: result2.text }]
        },
        "response"
      );
      const outputProcessorResult2 = await this.capabilities.__runOutputProcessors({
        requestContext: contextWithMemory || new RequestContext(),
        ...observabilityContext,
        outputProcessorOverrides: finalOutputProcessors,
        messageList
        // Use the full message list with complete conversation history
      });
      if (outputProcessorResult2.tripwire) {
        agentSpan?.end({
          output: { tripwire: outputProcessorResult2.tripwire },
          attributes: {
            tripwireAbort: {
              reason: outputProcessorResult2.tripwire.reason,
              processorId: outputProcessorResult2.tripwire.processorId,
              retry: outputProcessorResult2.tripwire.retry,
              metadata: outputProcessorResult2.tripwire.metadata
            }
          }
        });
        const tripwireResult = {
          text: "",
          object: void 0,
          usage: { totalTokens: 0, promptTokens: 0, completionTokens: 0 },
          finishReason: "other",
          response: {
            id: randomUUID(),
            timestamp: /* @__PURE__ */ new Date(),
            modelId: "tripwire",
            messages: []
          },
          responseMessages: [],
          toolCalls: [],
          toolResults: [],
          warnings: void 0,
          request: {
            body: JSON.stringify({ messages: [] })
          },
          experimental_output: void 0,
          steps: void 0,
          experimental_providerMetadata: void 0,
          tripwire: outputProcessorResult2.tripwire,
          traceId,
          spanId
        };
        return tripwireResult;
      }
      const newText2 = outputProcessorResult2.messageList.get.response.db().map((msg) => msg.content.parts.map((part) => part.type === "text" ? part.text : "").join("")).join("");
      result2.text = newText2;
      if (finalOutputProcessors && finalOutputProcessors.length > 0) {
        const messages2 = outputProcessorResult2.messageList.get.response.db();
        this.capabilities.logger.debug(
          "Checking messages for experimentalOutput metadata:",
          messages2.map((m) => ({
            role: m.role,
            hasContentMetadata: !!m.content.metadata,
            contentMetadata: m.content.metadata
          }))
        );
        const messagesWithStructuredData = messages2.filter(
          (msg) => msg.content.metadata && msg.content.metadata.structuredOutput
        );
        this.capabilities.logger.debug("Messages with structured data:", messagesWithStructuredData.length);
        if (messagesWithStructuredData[0] && messagesWithStructuredData[0].content.metadata?.structuredOutput) {
          result2.object = messagesWithStructuredData[0].content.metadata.structuredOutput;
          this.capabilities.logger.debug("Using structured data from processor metadata for result.object");
        } else {
          try {
            const processedOutput = JSON.parse(newText2);
            result2.object = processedOutput;
            this.capabilities.logger.debug("Using fallback JSON parsing for result.object");
          } catch (error) {
            this.capabilities.logger.warn("Failed to parse processed output as JSON, updating text only", { error });
          }
        }
      }
      const overrideScorers2 = mergedGenerateOptions.scorers;
      const afterResult2 = await after({
        result: result2,
        outputText: newText2,
        agentSpan,
        ...overrideScorers2 ? { overrideScorers: overrideScorers2 } : {}
      });
      if (generateOptions.returnScorerData) {
        result2.scoringData = afterResult2.scoringData;
      }
      result2.traceId = traceId;
      result2.spanId = spanId;
      return result2;
    }
    const result = await llmToUse.__textObject({
      ...llmOptions,
      ...observabilityContext,
      structuredOutput: output
    });
    const outputText = JSON.stringify(result.object);
    messageList.add(
      {
        role: "assistant",
        content: [{ type: "text", text: outputText }]
      },
      "response"
    );
    const outputProcessorResult = await this.capabilities.__runOutputProcessors({
      requestContext: contextWithMemory || new RequestContext(),
      ...observabilityContext,
      messageList
      // Use the full message list with complete conversation history
    });
    if (outputProcessorResult.tripwire) {
      agentSpan?.end({
        output: { tripwire: outputProcessorResult.tripwire },
        attributes: {
          tripwireAbort: {
            reason: outputProcessorResult.tripwire.reason,
            processorId: outputProcessorResult.tripwire.processorId,
            retry: outputProcessorResult.tripwire.retry,
            metadata: outputProcessorResult.tripwire.metadata
          }
        }
      });
      const tripwireResult = {
        text: "",
        object: void 0,
        usage: { totalTokens: 0, promptTokens: 0, completionTokens: 0 },
        finishReason: "other",
        response: {
          id: randomUUID(),
          timestamp: /* @__PURE__ */ new Date(),
          modelId: "tripwire",
          messages: []
        },
        responseMessages: [],
        toolCalls: [],
        toolResults: [],
        warnings: void 0,
        request: {
          body: JSON.stringify({ messages: [] })
        },
        experimental_output: void 0,
        steps: void 0,
        experimental_providerMetadata: void 0,
        tripwire: outputProcessorResult.tripwire,
        traceId,
        spanId
      };
      return tripwireResult;
    }
    const newText = outputProcessorResult.messageList.get.response.db().map((msg) => msg.content.parts.map((part) => part.type === "text" ? part.text : "").join("")).join("");
    try {
      const processedOutput = JSON.parse(newText);
      result.object = processedOutput;
    } catch (error) {
      this.capabilities.logger.warn("Failed to parse processed output as JSON, keeping original object", { error });
    }
    const overrideScorers = mergedGenerateOptions.scorers;
    const afterResult = await after({
      result,
      outputText: newText,
      structuredOutput: true,
      agentSpan,
      ...overrideScorers ? { overrideScorers } : {}
    });
    if (generateOptions.returnScorerData) {
      result.scoringData = afterResult.scoringData;
    }
    result.traceId = traceId;
    result.spanId = spanId;
    return result;
  }
  /**
   * Legacy implementation of stream method using AI SDK v4 models.
   * Use this method if you need to continue using AI SDK v4 models.
   */
  async streamLegacy(messages, streamOptions = {}) {
    const defaultStreamOptionsLegacy = await Promise.resolve(
      this.capabilities.getDefaultStreamOptionsLegacy({
        requestContext: streamOptions.requestContext
      })
    );
    const mergedStreamOptions = {
      ...defaultStreamOptionsLegacy,
      ...streamOptions,
      experimental_generateMessageId: defaultStreamOptionsLegacy.experimental_generateMessageId || this.capabilities.mastra?.generateId?.bind(this.capabilities.mastra)
    };
    const { llm, before, after } = await this.prepareLLMOptions(messages, mergedStreamOptions, "stream");
    if (llm.getModel().specificationVersion !== "v1") {
      const specVersion = llm.getModel().specificationVersion;
      this.capabilities.logger.error(
        `Models with specificationVersion "${specVersion}" are not supported for streamLegacy. Please use stream() instead.`,
        {
          modelId: llm.getModel().modelId,
          specificationVersion: specVersion
        }
      );
      throw new MastraError({
        id: "AGENT_STREAM_V2_MODEL_NOT_SUPPORTED",
        domain: "AGENT" /* AGENT */,
        category: "USER" /* USER */,
        details: {
          modelId: llm.getModel().modelId,
          specificationVersion: specVersion
        },
        text: `Models with specificationVersion "${specVersion}" are not supported for streamLegacy(). Please use stream() instead.`
      });
    }
    const beforeResult = await before();
    const traceId = beforeResult.agentSpan?.externalTraceId;
    const spanId = beforeResult.agentSpan?.id;
    if (beforeResult.tripwire) {
      beforeResult.agentSpan?.end({
        output: { tripwire: beforeResult.tripwire },
        attributes: {
          tripwireAbort: {
            reason: beforeResult.tripwire.reason,
            processorId: beforeResult.tripwire.processorId,
            retry: beforeResult.tripwire.retry,
            metadata: beforeResult.tripwire.metadata
          }
        }
      });
      const emptyResult = {
        textStream: (async function* () {
        })(),
        fullStream: Promise.resolve("").then(() => {
          const emptyStream = new globalThis.ReadableStream({
            start(controller) {
              controller.close();
            }
          });
          return emptyStream;
        }),
        text: Promise.resolve(""),
        usage: Promise.resolve({ totalTokens: 0, promptTokens: 0, completionTokens: 0 }),
        finishReason: Promise.resolve("other"),
        tripwire: beforeResult.tripwire,
        response: {
          id: randomUUID(),
          timestamp: /* @__PURE__ */ new Date(),
          modelId: "tripwire",
          messages: []
        },
        toolCalls: Promise.resolve([]),
        toolResults: Promise.resolve([]),
        warnings: Promise.resolve(void 0),
        request: {
          body: JSON.stringify({ messages: [] })
        },
        experimental_output: void 0,
        steps: void 0,
        experimental_providerMetadata: void 0,
        traceId,
        spanId,
        toAIStream: () => Promise.resolve("").then(() => {
          const emptyStream = new globalThis.ReadableStream({
            start(controller) {
              controller.close();
            }
          });
          return emptyStream;
        }),
        get experimental_partialOutputStream() {
          return (async function* () {
          })();
        },
        pipeDataStreamToResponse: () => Promise.resolve(),
        pipeTextStreamToResponse: () => Promise.resolve(),
        toDataStreamResponse: () => new Response("", { status: 200, headers: { "Content-Type": "text/plain" } }),
        toTextStreamResponse: () => new Response("", { status: 200, headers: { "Content-Type": "text/plain" } })
      };
      return emptyResult;
    }
    const { onFinish, runId, output, experimental_output, agentSpan, messageList, requestContext, ...llmOptions } = beforeResult;
    const overrideScorers = mergedStreamOptions.scorers;
    const observabilityContext = createObservabilityContext({ currentSpan: agentSpan });
    if (!output || experimental_output) {
      const streamResult = llm.__stream({
        ...llmOptions,
        experimental_output,
        ...observabilityContext,
        requestContext,
        outputProcessors: await this.capabilities.listResolvedOutputProcessors(requestContext),
        onFinish: async (result) => {
          try {
            messageList.add(result.response.messages, "response");
            const outputProcessorResult = await this.capabilities.__runOutputProcessors({
              requestContext,
              ...observabilityContext,
              messageList
            });
            if (outputProcessorResult.tripwire) {
              agentSpan?.end({
                output: { tripwire: outputProcessorResult.tripwire },
                attributes: {
                  tripwireAbort: {
                    reason: outputProcessorResult.tripwire.reason,
                    processorId: outputProcessorResult.tripwire.processorId,
                    retry: outputProcessorResult.tripwire.retry,
                    metadata: outputProcessorResult.tripwire.metadata
                  }
                }
              });
              await onFinish?.({ ...result, runId });
              return;
            }
            const outputText = result.text;
            await after({
              result,
              outputText,
              agentSpan,
              ...overrideScorers ? { overrideScorers } : {}
            });
          } catch (e) {
            this.capabilities.logger.error("Error saving memory on finish", {
              error: e,
              runId
            });
          }
          await onFinish?.({ ...result, runId });
        },
        runId
      });
      streamResult.traceId = traceId;
      streamResult.spanId = spanId;
      return streamResult;
    }
    this.capabilities.logger.debug("Starting LLM streamObject call", {
      agent: this.capabilities.name,
      runId
    });
    const streamObjectResult = llm.__streamObject({
      ...llmOptions,
      ...observabilityContext,
      requestContext,
      onFinish: async (result) => {
        try {
          if (result.object) {
            const responseMessages = [
              {
                role: "assistant",
                content: [
                  {
                    type: "text",
                    text: JSON.stringify(result.object)
                  }
                ]
              }
            ];
            messageList.add(responseMessages, "response");
          }
          const outputProcessorResult = await this.capabilities.__runOutputProcessors({
            requestContext,
            ...observabilityContext,
            messageList
          });
          if (outputProcessorResult.tripwire) {
            agentSpan?.end({
              output: { tripwire: outputProcessorResult.tripwire },
              attributes: {
                tripwireAbort: {
                  reason: outputProcessorResult.tripwire.reason,
                  processorId: outputProcessorResult.tripwire.processorId,
                  retry: outputProcessorResult.tripwire.retry,
                  metadata: outputProcessorResult.tripwire.metadata
                }
              }
            });
            await onFinish?.({ ...result, runId });
            return;
          }
          const outputText = JSON.stringify(result.object);
          await after({
            result,
            outputText,
            structuredOutput: true,
            agentSpan,
            ...overrideScorers ? { overrideScorers } : {}
          });
        } catch (e) {
          this.capabilities.logger.error("Error saving memory on finish", {
            error: e,
            runId
          });
        }
        await onFinish?.({ ...result, runId });
      },
      runId,
      structuredOutput: output
    });
    streamObjectResult.traceId = traceId;
    streamObjectResult.spanId = spanId;
    return streamObjectResult;
  }
};

// src/agent/save-queue/index.ts
var SaveQueueManager = class _SaveQueueManager {
  logger;
  debounceMs;
  memory;
  static MAX_STALENESS_MS = 1e3;
  constructor({ logger, debounceMs, memory }) {
    this.logger = logger;
    this.debounceMs = debounceMs || 100;
    this.memory = memory;
  }
  saveQueues = /* @__PURE__ */ new Map();
  saveDebounceTimers = /* @__PURE__ */ new Map();
  /**
   * Debounces save operations for a thread, ensuring that consecutive save requests
   * are batched and only the latest is executed after a short delay.
   * @param threadId - The ID of the thread to debounce saves for.
   * @param messageList - The MessageList instance containing unsaved messages.
   * @param memoryConfig - Optional memory configuration to use for saving.
   * @returns A promise that resolves when the debounced save completes.
   */
  debounceSave(threadId, messageList, memoryConfig) {
    return new Promise((resolve2, reject) => {
      if (this.saveDebounceTimers.has(threadId)) {
        clearTimeout(this.saveDebounceTimers.get(threadId));
      }
      this.saveDebounceTimers.set(
        threadId,
        setTimeout(() => {
          this.enqueueSave(threadId, messageList, memoryConfig).then(resolve2).catch((err) => {
            this.logger?.error?.("Error in debounceSave", { err, threadId });
            reject(err);
          }).finally(() => {
            this.saveDebounceTimers.delete(threadId);
          });
        }, this.debounceMs)
      );
    });
  }
  /**
   * Enqueues a save operation for a thread, ensuring that saves are executed in order and
   * only one save runs at a time per thread. If a save is already in progress for the thread,
   * the new save is queued to run after the previous completes.
   *
   * @param threadId - The ID of the thread whose messages should be saved.
   * @param messageList - The MessageList instance containing unsaved messages.
   * @param memoryConfig - Optional memory configuration to use for saving.
   */
  enqueueSave(threadId, messageList, memoryConfig) {
    const prev = this.saveQueues.get(threadId) || Promise.resolve();
    const next = prev.then(() => this.persistUnsavedMessages(messageList, memoryConfig)).catch((err) => {
      this.logger?.error?.("Error in enqueueSave", { err, threadId });
    }).then(() => {
      if (this.saveQueues.get(threadId) === next) {
        this.saveQueues.delete(threadId);
      }
    });
    this.saveQueues.set(threadId, next);
    return next;
  }
  /**
   * Clears any pending debounced save for a thread, preventing the scheduled save
   * from executing if it hasn't already fired.
   *
   * @param threadId - The ID of the thread whose debounced save should be cleared.
   */
  clearDebounce(threadId) {
    if (this.saveDebounceTimers.has(threadId)) {
      clearTimeout(this.saveDebounceTimers.get(threadId));
      this.saveDebounceTimers.delete(threadId);
    }
  }
  /**
   * Persists any unsaved messages from the MessageList to memory storage.
   * Drains the list of unsaved messages and writes them using the memory backend.
   * @param messageList - The MessageList instance for the current thread.
   * @param memoryConfig - The memory configuration for saving.
   */
  async persistUnsavedMessages(messageList, memoryConfig) {
    const newMessages = messageList.drainUnsavedMessages();
    if (newMessages.length > 0 && this.memory) {
      await this.memory.saveMessages({
        messages: newMessages,
        memoryConfig
      });
    }
  }
  /**
   * Batches a save of unsaved messages for a thread, using debouncing to batch rapid updates.
   * If the oldest unsaved message is stale (older than MAX_STALENESS_MS), the save is performed immediately.
   * Otherwise, the save is delayed to batch multiple updates and reduce redundant writes.
   *
   * @param messageList - The MessageList instance containing unsaved messages.
   * @param threadId - The ID of the thread whose messages are being saved.
   * @param memoryConfig - Optional memory configuration for saving.
   */
  async batchMessages(messageList, threadId, memoryConfig) {
    if (!threadId) return;
    const earliest = messageList.getEarliestUnsavedMessageTimestamp();
    const now = Date.now();
    if (earliest && now - earliest > _SaveQueueManager.MAX_STALENESS_MS) {
      return this.flushMessages(messageList, threadId, memoryConfig);
    } else {
      return this.debounceSave(threadId, messageList, memoryConfig);
    }
  }
  /**
   * Forces an immediate save of unsaved messages for a thread, bypassing any debounce delay.
   * This is used when a flush to persistent storage is required (e.g., on shutdown or critical transitions).
   *
   * @param messageList - The MessageList instance containing unsaved messages.
   * @param threadId - The ID of the thread whose messages are being saved.
   * @param memoryConfig - Optional memory configuration for saving.
   */
  async flushMessages(messageList, threadId, memoryConfig) {
    if (!threadId) return;
    this.clearDebounce(threadId);
    return this.enqueueSave(threadId, messageList, memoryConfig);
  }
};

// src/llm/model/model-method-from-agent.ts
function getModelMethodFromAgentMethod(methodType) {
  if (methodType === "generate" || methodType === "generateLegacy") {
    return "generate";
  } else if (methodType === "stream" || methodType === "streamLegacy") {
    return "stream";
  } else {
    throw new MastraError({
      id: "INVALID_METHOD_TYPE",
      domain: "AGENT" /* AGENT */,
      category: "USER" /* USER */
    });
  }
}

// src/agent/workflows/prepare-stream/map-results-step.ts
function createMapResultsStep({
  capabilities,
  options,
  resourceId,
  threadId: threadIdFromArgs,
  runId,
  requestContext,
  memory,
  memoryConfig,
  agentSpan,
  agentId,
  methodType,
  saveQueueManager
}) {
  return async ({ inputData, bail, ..._observabilityContext }) => {
    const toolsData = inputData["prepare-tools-step"];
    const memoryData = inputData["prepare-memory-step"];
    let threadCreatedByStep = false;
    const result = {
      ...options,
      tools: toolsData.convertedTools,
      toolChoice: options.toolChoice,
      thread: memoryData.thread,
      threadId: memoryData.thread?.id ?? threadIdFromArgs,
      resourceId,
      requestContext,
      onStepFinish: async (props) => {
        if (options.savePerStep && !memoryConfig?.readOnly) {
          if (!memoryData.threadExists && !threadCreatedByStep && memory && memoryData.thread) {
            await memory.createThread({
              threadId: memoryData.thread?.id,
              title: memoryData.thread?.title,
              metadata: memoryData.thread?.metadata,
              resourceId: memoryData.thread?.resourceId,
              memoryConfig
            });
            threadCreatedByStep = true;
          }
          await capabilities.saveStepMessages({
            result: props,
            messageList: memoryData.messageList,
            runId
          });
          if (saveQueueManager && memoryData.thread?.id) {
            await saveQueueManager.flushMessages(memoryData.messageList, memoryData.thread.id, memoryConfig);
          }
        }
        return options.onStepFinish?.({ ...props, runId });
      },
      ...memoryData.tripwire && {
        tripwire: memoryData.tripwire
      }
    };
    if (result.tripwire) {
      try {
        const agentModel = await capabilities.getModel({ requestContext: result.requestContext });
        if (!isSupportedLanguageModel(agentModel)) {
          throw new MastraError({
            id: "MAP_RESULTS_STEP_UNSUPPORTED_MODEL",
            domain: "AGENT" /* AGENT */,
            category: "USER" /* USER */,
            text: "Tripwire handling requires a v2/v3 model"
          });
        }
        const modelOutput = await getModelOutputForTripwire({
          tripwire: memoryData.tripwire,
          runId,
          ...createObservabilityContext({ currentSpan: agentSpan }),
          options,
          model: agentModel,
          messageList: memoryData.messageList
        });
        agentSpan?.end({
          output: { tripwire: memoryData.tripwire },
          attributes: {
            tripwireAbort: {
              reason: memoryData.tripwire?.reason,
              processorId: memoryData.tripwire?.processorId,
              retry: memoryData.tripwire?.retry,
              metadata: memoryData.tripwire?.metadata
            }
          }
        });
        return bail(modelOutput);
      } catch (error) {
        agentSpan?.error({
          error,
          endSpan: true,
          attributes: {
            tripwireAbort: {
              reason: memoryData.tripwire?.reason,
              processorId: memoryData.tripwire?.processorId,
              retry: memoryData.tripwire?.retry,
              metadata: memoryData.tripwire?.metadata
            }
          }
        });
        throw error;
      }
    }
    let effectiveOutputProcessors = capabilities.outputProcessors ? typeof capabilities.outputProcessors === "function" ? await capabilities.outputProcessors({
      requestContext: result.requestContext,
      overrides: options.outputProcessors
    }) : options.outputProcessors || capabilities.outputProcessors : options.outputProcessors || [];
    if (options.structuredOutput?.model) {
      const structuredProcessor = new StructuredOutputProcessor({
        ...options.structuredOutput,
        logger: capabilities.logger
      });
      if (capabilities.mastra) {
        structuredProcessor.__registerMastra(capabilities.mastra);
      }
      effectiveOutputProcessors = effectiveOutputProcessors ? [...effectiveOutputProcessors, structuredProcessor] : [structuredProcessor];
    }
    const effectiveInputProcessors = capabilities.inputProcessors ? typeof capabilities.inputProcessors === "function" ? await capabilities.inputProcessors({
      requestContext: result.requestContext,
      overrides: options.inputProcessors
    }) : options.inputProcessors || capabilities.inputProcessors : options.inputProcessors || [];
    const effectiveErrorProcessors = capabilities.errorProcessors ? typeof capabilities.errorProcessors === "function" ? await capabilities.errorProcessors({
      requestContext: result.requestContext,
      overrides: options.errorProcessors
    }) : options.errorProcessors || capabilities.errorProcessors : options.errorProcessors || [];
    const messageList = memoryData.messageList;
    const modelMethodType = getModelMethodFromAgentMethod(methodType);
    const loopOptions = {
      methodType: modelMethodType,
      agentId,
      requestContext: result.requestContext,
      ...createObservabilityContext({ currentSpan: agentSpan }),
      runId,
      toolChoice: result.toolChoice,
      tools: result.tools,
      resourceId: result.resourceId,
      threadId: result.threadId,
      stopWhen: result.stopWhen,
      maxSteps: result.maxSteps,
      providerOptions: result.providerOptions,
      includeRawChunks: options.includeRawChunks,
      options: {
        ...options.prepareStep && { prepareStep: options.prepareStep },
        onFinish: async (payload) => {
          if (payload.finishReason === "error") {
            const provider = payload.model?.provider;
            const modelId = payload.model?.modelId;
            const isUpstreamError = APICallError.isInstance(payload.error);
            if (isUpstreamError) {
              capabilities.logger.error("Upstream LLM API error", {
                error: payload.error,
                runId,
                ...provider && { provider },
                ...modelId && { modelId }
              });
            } else {
              capabilities.logger.error("Error in agent stream", {
                error: payload.error,
                runId,
                ...provider && { provider },
                ...modelId && { modelId }
              });
            }
            const error = payload.error instanceof Error ? payload.error : new MastraError(
              {
                id: "AGENT_STREAM_ERROR",
                domain: "AGENT" /* AGENT */,
                category: "SYSTEM" /* SYSTEM */,
                details: { runId }
              },
              payload.error
            );
            agentSpan?.error({ error, endSpan: true });
            return;
          }
          const aborted = options.abortSignal?.aborted;
          if (!aborted) {
            try {
              const outputText = messageList.get.all.core().map((m) => m.content).join("\n");
              await capabilities.executeOnFinish({
                result: payload,
                outputText,
                thread: result.thread,
                threadId: result.threadId,
                readOnlyMemory: memoryConfig?.readOnly,
                resourceId,
                memoryConfig,
                requestContext,
                agentSpan,
                runId,
                messageList,
                threadExists: memoryData.threadExists,
                structuredOutput: !!options.structuredOutput?.schema,
                overrideScorers: options.scorers
              });
            } catch (e) {
              capabilities.logger.error("Error saving memory on finish", {
                error: e,
                runId
              });
              const spanError = e instanceof Error ? e : new MastraError(
                {
                  id: "AGENT_ON_FINISH_ERROR",
                  domain: "AGENT" /* AGENT */,
                  category: "SYSTEM" /* SYSTEM */,
                  details: { runId }
                },
                e
              );
              agentSpan?.error({ error: spanError, endSpan: true });
            }
          } else {
            agentSpan?.end();
          }
          await options?.onFinish?.({
            ...payload,
            runId,
            messages: messageList.get.response.aiV5.model(),
            usage: payload.usage,
            totalUsage: payload.totalUsage
          });
        },
        onStepFinish: result.onStepFinish,
        onChunk: options.onChunk,
        onError: options.onError,
        onAbort: options.onAbort,
        abortSignal: options.abortSignal
      },
      activeTools: options.activeTools,
      structuredOutput: options.structuredOutput,
      inputProcessors: effectiveInputProcessors,
      outputProcessors: effectiveOutputProcessors,
      errorProcessors: effectiveErrorProcessors,
      modelSettings: {
        temperature: 0,
        ...options.modelSettings || {}
      },
      messageList: memoryData.messageList,
      maxProcessorRetries: options.maxProcessorRetries,
      // IsTaskComplete scoring for supervisor patterns
      isTaskComplete: options.isTaskComplete,
      // Iteration hook for supervisor patterns
      onIterationComplete: options.onIterationComplete,
      processorStates: memoryData.processorStates
    };
    return loopOptions;
  };
}

// src/agent/workflows/prepare-stream/prepare-memory-step.ts
var import_fast_deep_equal2 = __toESM(require_fast_deep_equal(), 1);
var storageThreadSchema = object({
  id: string(),
  title: string().optional(),
  resourceId: string(),
  createdAt: date$1(),
  updatedAt: date$1(),
  metadata: record(string(), any()).optional()
});
var prepareToolsStepOutputSchema = object({
  convertedTools: record(string(), any())
});
var prepareMemoryStepOutputSchema = object({
  threadExists: boolean(),
  thread: storageThreadSchema.optional(),
  messageList: _instanceof(MessageList),
  /** Shared processor states map that persists across loop iterations for both input and output processors */
  processorStates: _instanceof(Map),
  /** Tripwire data when input processor triggered abort */
  tripwire: object({
    reason: string(),
    retry: boolean().optional(),
    metadata: unknown().optional(),
    processorId: string().optional()
  }).optional()
});

// src/agent/workflows/prepare-stream/prepare-memory-step.ts
function addSystemMessage(messageList, content, tag) {
  if (!content) return;
  if (Array.isArray(content)) {
    for (const msg of content) {
      messageList.addSystem(msg, tag);
    }
  } else {
    messageList.addSystem(content, tag);
  }
}
function createPrepareMemoryStep({
  capabilities,
  options,
  threadFromArgs,
  resourceId,
  runId: _runId,
  requestContext,
  instructions,
  memoryConfig,
  memory,
  isResume
}) {
  return createStep({
    id: "prepare-memory-step",
    inputSchema: object({}),
    outputSchema: prepareMemoryStepOutputSchema,
    execute: async ({ ...rest }) => {
      const observabilityContext = resolveObservabilityContext(rest);
      const thread = threadFromArgs;
      const messageList = new MessageList({
        threadId: thread?.id,
        resourceId,
        generateMessageId: capabilities.generateMessageId,
        logger: capabilities.logger,
        // @ts-expect-error Flag for agent network messages
        _agentNetworkAppend: capabilities._agentNetworkAppend
      });
      const processorStates = /* @__PURE__ */ new Map();
      addSystemMessage(messageList, instructions);
      messageList.add(options.context || [], "context");
      addSystemMessage(messageList, options.system, "user-provided");
      if (!memory || !thread?.id && !resourceId) {
        messageList.add(options.messages, "input");
        let tripwire2;
        if (!isResume) {
          ({ tripwire: tripwire2 } = await capabilities.runInputProcessors({
            requestContext,
            ...observabilityContext,
            messageList,
            inputProcessorOverrides: options.inputProcessors,
            processorStates
          }));
        }
        return {
          threadExists: false,
          thread,
          messageList,
          processorStates,
          tripwire: tripwire2
        };
      }
      if (!thread?.id || !resourceId) {
        const mastraError = new MastraError({
          id: "AGENT_MEMORY_MISSING_RESOURCE_ID",
          domain: "AGENT" /* AGENT */,
          category: "USER" /* USER */,
          details: {
            agentName: capabilities.agentName,
            threadId: thread?.id || "",
            resourceId: resourceId || ""
          },
          text: `A resourceId and a threadId must be provided when using Memory. Saw threadId "${thread?.id}" and resourceId "${resourceId}"`
        });
        capabilities.logger.trackException(mastraError);
        throw mastraError;
      }
      let threadObject = void 0;
      const existingThread = await memory.getThreadById({ threadId: thread?.id });
      if (existingThread) {
        if (!existingThread.metadata && thread.metadata || thread.metadata && !(0, import_fast_deep_equal2.default)(existingThread.metadata, thread.metadata)) {
          threadObject = await memory.saveThread({
            thread: { ...existingThread, metadata: thread.metadata },
            memoryConfig
          });
        } else {
          threadObject = existingThread;
        }
      } else {
        threadObject = await memory.createThread({
          threadId: thread?.id,
          metadata: thread.metadata,
          title: thread.title,
          memoryConfig,
          resourceId,
          saveThread: true
        });
      }
      requestContext.set("MastraMemory", {
        thread: threadObject,
        resourceId,
        memoryConfig
      });
      messageList.add(options.messages, "input");
      let tripwire;
      if (!isResume) {
        ({ tripwire } = await capabilities.runInputProcessors({
          requestContext,
          ...observabilityContext,
          messageList,
          inputProcessorOverrides: options.inputProcessors,
          processorStates
        }));
      }
      return {
        thread: threadObject,
        messageList,
        processorStates,
        tripwire,
        threadExists: !!existingThread
      };
    }
  });
}
function createPrepareToolsStep({
  capabilities,
  options,
  threadFromArgs,
  resourceId,
  runId,
  requestContext,
  agentSpan,
  methodType,
  memory: _memory
}) {
  return createStep({
    id: "prepare-tools-step",
    inputSchema: object({}),
    outputSchema: prepareToolsStepOutputSchema,
    execute: async () => {
      const threadId = threadFromArgs?.id;
      const convertedTools = await capabilities.convertTools({
        toolsets: options?.toolsets,
        clientTools: options?.clientTools,
        threadId,
        resourceId,
        runId,
        requestContext,
        ...createObservabilityContext({ currentSpan: agentSpan }),
        outputWriter: options.outputWriter,
        methodType,
        memoryConfig: options.memory?.options,
        autoResumeSuspendedTools: options.autoResumeSuspendedTools,
        delegation: options.delegation
      });
      const toolNames = Object.keys(convertedTools);
      if (toolNames.length > 0) {
        agentSpan?.update({
          attributes: {
            availableTools: toolNames
          }
        });
      }
      return {
        convertedTools
      };
    }
  });
}
function createStreamStep({
  capabilities,
  runId: _runId,
  returnScorerData,
  requireToolApproval,
  toolCallConcurrency,
  resumeContext,
  agentId,
  agentName,
  toolCallId,
  methodType,
  saveQueueManager,
  memoryConfig,
  memory,
  resourceId,
  autoResumeSuspendedTools,
  workspace
}) {
  return createStep({
    id: "stream-text-step",
    inputSchema: any(),
    // tried to type this in various ways but it's too complex
    outputSchema: _instanceof(MastraModelOutput),
    execute: async ({ inputData, ...observabilityContext }) => {
      const validatedInputData = inputData;
      const processors = validatedInputData.outputProcessors || (capabilities.outputProcessors ? typeof capabilities.outputProcessors === "function" ? await capabilities.outputProcessors({
        requestContext: validatedInputData.requestContext || new RequestContext()
      }) : capabilities.outputProcessors : []);
      const modelMethodType = getModelMethodFromAgentMethod(methodType);
      const streamResult = capabilities.llm.stream({
        ...validatedInputData,
        outputProcessors: processors,
        returnScorerData,
        ...resolveObservabilityContext(observabilityContext),
        requireToolApproval,
        toolCallConcurrency,
        resumeContext,
        _internal: {
          generateId: capabilities.generateMessageId,
          saveQueueManager,
          memoryConfig,
          threadId: validatedInputData.threadId,
          resourceId,
          memory
        },
        agentId,
        agentName,
        toolCallId,
        methodType: modelMethodType,
        autoResumeSuspendedTools,
        workspace
      });
      return streamResult;
    }
  });
}

// src/agent/workflows/prepare-stream/index.ts
function createPrepareStreamWorkflow({
  capabilities,
  options,
  threadFromArgs,
  resourceId,
  runId,
  requestContext,
  agentSpan,
  methodType,
  instructions,
  memoryConfig,
  memory,
  returnScorerData,
  saveQueueManager,
  requireToolApproval,
  toolCallConcurrency,
  resumeContext,
  agentId,
  agentName,
  toolCallId,
  workspace
}) {
  const prepareToolsStep = createPrepareToolsStep({
    capabilities,
    options,
    threadFromArgs,
    resourceId,
    runId,
    requestContext,
    agentSpan,
    methodType,
    memory
  });
  const prepareMemoryStep2 = createPrepareMemoryStep({
    capabilities,
    options,
    threadFromArgs,
    resourceId,
    runId,
    requestContext,
    instructions,
    memoryConfig,
    memory,
    isResume: !!resumeContext
  });
  const streamStep = createStreamStep({
    capabilities,
    runId,
    returnScorerData,
    requireToolApproval,
    toolCallConcurrency,
    resumeContext,
    agentId,
    agentName,
    toolCallId,
    methodType,
    saveQueueManager,
    memoryConfig,
    memory,
    resourceId,
    autoResumeSuspendedTools: options.autoResumeSuspendedTools,
    workspace
  });
  const mapResultsStep = createMapResultsStep({
    capabilities,
    options,
    resourceId,
    threadId: threadFromArgs?.id,
    runId,
    requestContext,
    memory,
    memoryConfig,
    agentSpan,
    agentId,
    methodType,
    saveQueueManager
  });
  return createWorkflow({
    id: "execution-workflow",
    inputSchema: object({}),
    outputSchema: _instanceof(MastraModelOutput),
    steps: [prepareToolsStep, prepareMemoryStep2, streamStep],
    options: {
      tracingPolicy: {
        internal: 1 /* WORKFLOW */
      },
      validateInputs: false
    }
  }).parallel([prepareToolsStep, prepareMemoryStep2]).map(mapResultsStep).then(streamStep).commit();
}

// src/agent/agent.ts
function resolveMaybePromise(value, cb) {
  if (value instanceof Promise || value != null && typeof value.then === "function") {
    return Promise.resolve(value).then(cb);
  }
  return cb(value);
}
var Agent = class _Agent extends MastraBase {
  id;
  name;
  source;
  #instructions;
  #description;
  model;
  #originalModel;
  maxRetries;
  #mastra;
  #memory;
  #skillsFormat;
  #workflows;
  #defaultGenerateOptionsLegacy;
  #defaultStreamOptionsLegacy;
  #defaultOptions;
  #defaultNetworkOptions;
  #tools;
  #scorers;
  #agents;
  #voice;
  #agentChannels = null;
  #workspace;
  #inputProcessors;
  #outputProcessors;
  #maxProcessorRetries;
  #errorProcessors;
  #browser;
  #requestContextSchema;
  #options;
  #legacyHandler;
  #config;
  // This flag is for agent network messages. We should change the agent network formatting and remove this flag after.
  _agentNetworkAppend = false;
  /**
   * Creates a new Agent instance with the specified configuration.
   *
   * @example
   * ```typescript
   * import { Agent } from '@mastra/core/agent';
   * import { Memory } from '@mastra/memory';
   *
   * const agent = new Agent({
   *   id: 'weatherAgent',
   *   name: 'Weather Agent',
   *   instructions: 'You help users with weather information',
   *   model: 'openai/gpt-5',
   *   tools: { getWeather },
   *   memory: new Memory(),
   *   maxRetries: 2,
   * });
   * ```
   */
  constructor(config) {
    super({ component: RegisteredLogger.AGENT, rawConfig: config.rawConfig });
    this.#config = config;
    this.name = config.name;
    this.id = config.id ?? config.name;
    this.source = "code";
    this.#instructions = config.instructions;
    this.#description = config.description;
    this.#options = config.options;
    if (!config.model) {
      const mastraError = new MastraError({
        id: "AGENT_CONSTRUCTOR_MODEL_REQUIRED",
        domain: "AGENT" /* AGENT */,
        category: "USER" /* USER */,
        details: {
          agentName: config.name
        },
        text: `LanguageModel is required to create an Agent. Please provide the 'model'.`
      });
      this.logger.trackException(mastraError);
      throw mastraError;
    }
    if (Array.isArray(config.model)) {
      if (config.model.length === 0) {
        const mastraError = new MastraError({
          id: "AGENT_CONSTRUCTOR_MODEL_ARRAY_EMPTY",
          domain: "AGENT" /* AGENT */,
          category: "USER" /* USER */,
          details: {
            agentName: config.name
          },
          text: `Model array is empty. Please provide at least one model.`
        });
        this.logger.trackException(mastraError);
        throw mastraError;
      }
      this.model = config.model.map((mdl) => ({
        id: mdl.id ?? randomUUID(),
        model: mdl.model,
        maxRetries: mdl.maxRetries ?? config?.maxRetries ?? 0,
        enabled: mdl.enabled ?? true
      }));
      this.#originalModel = [...this.model];
    } else {
      this.model = config.model;
      this.#originalModel = config.model;
    }
    this.maxRetries = config.maxRetries ?? 0;
    if (config.workflows) {
      this.#workflows = config.workflows;
    }
    this.#defaultGenerateOptionsLegacy = config.defaultGenerateOptionsLegacy || {};
    this.#defaultStreamOptionsLegacy = config.defaultStreamOptionsLegacy || {};
    this.#defaultOptions = config.defaultOptions || {};
    this.#defaultNetworkOptions = config.defaultNetworkOptions || {};
    this.#tools = config.tools || {};
    if (config.mastra) {
      this.__registerMastra(config.mastra);
      this.__registerPrimitives({
        logger: config.mastra.getLogger()
      });
    }
    this.#scorers = config.scorers || {};
    this.#agents = config.agents || {};
    if (config.memory) {
      this.#memory = config.memory;
    }
    if (config.skillsFormat) {
      this.#skillsFormat = config.skillsFormat;
    }
    if (config.voice) {
      this.#voice = config.voice;
      if (typeof config.tools !== "function") {
        this.#voice?.addTools(this.#tools);
      }
      if (typeof config.instructions === "string") {
        this.#voice?.addInstructions(config.instructions);
      }
    } else {
      this.#voice = new DefaultVoice();
    }
    if (config.channels) {
      if (config.channels instanceof AgentChannels) {
        this.#agentChannels = config.channels;
      } else if (config.channels.adapters && Object.keys(config.channels.adapters).length > 0) {
        this.#agentChannels = new AgentChannels({
          ...config.channels,
          userName: config.channels.userName ?? config.name
        });
      }
      this.#agentChannels?.__setAgent(this);
    }
    if (config.browser) {
      this.#browser = config.browser;
    }
    if (config.workspace) {
      this.#workspace = config.workspace;
    }
    if (config.inputProcessors) {
      this.#inputProcessors = config.inputProcessors;
    }
    if (config.outputProcessors) {
      this.#outputProcessors = config.outputProcessors;
    }
    if (config.maxProcessorRetries !== void 0) {
      this.#maxProcessorRetries = config.maxProcessorRetries;
    }
    if (config.errorProcessors) {
      this.#errorProcessors = config.errorProcessors;
    }
    if (config.requestContextSchema) {
      this.#requestContextSchema = toStandardSchema5(config.requestContextSchema);
    }
    this._agentNetworkAppend = config._agentNetworkAppend || false;
  }
  getMastraInstance() {
    return this.#mastra;
  }
  /**
   * Returns the AgentChannels instance that manages all channel adapters.
   * Returns null if no channels are configured.
   */
  getChannels() {
    return this.#agentChannels;
  }
  /**
   * Returns the browser instance for this agent, if configured.
   * Browser tools are automatically added at execution time via `convertTools()`.
   * This getter is primarily used by server-side code to access browser features
   * like screencast streaming and input injection.
   */
  get browser() {
    return this.#browser;
  }
  /**
   * Sets or updates the browser instance for this agent.
   * This allows hot-swapping browser configuration without recreating the agent.
   * Browser tools will be automatically updated on the next execution.
   *
   * @param browser - The new browser instance, or undefined to disable browser tools
   */
  setBrowser(browser) {
    this.#browser = browser;
  }
  /**
   * Returns true if this agent was configured with its own browser instance.
   * Used by Harness to avoid overwriting agent-level browser configuration.
   */
  hasOwnBrowser() {
    return Boolean(this.#browser);
  }
  /**
   * Gets the skills processors to add to input processors when workspace has skills.
   * @internal
   */
  async getSkillsProcessors(configuredProcessors, requestContext) {
    const workspace = await this.getWorkspace({ requestContext: requestContext || new RequestContext() });
    if (!workspace?.skills) {
      return [];
    }
    const hasSkillsProcessor = configuredProcessors.some(
      (p) => !isProcessorWorkflow(p) && "id" in p && p.id === "skills-processor"
    );
    if (hasSkillsProcessor) {
      return [];
    }
    return [new SkillsProcessor({ workspace, format: this.#skillsFormat })];
  }
  /**
   * Gets the workspace-instructions processors to add when the workspace has a
   * filesystem or sandbox (i.e. something to describe).
   * @internal
   */
  async getWorkspaceInstructionsProcessors(configuredProcessors, requestContext) {
    const workspace = await this.getWorkspace({ requestContext: requestContext || new RequestContext() });
    if (!workspace) return [];
    if (!workspace.filesystem && !workspace.sandbox) return [];
    const hasProcessor = configuredProcessors.some(
      (p) => !isProcessorWorkflow(p) && "id" in p && p.id === "workspace-instructions-processor"
    );
    if (hasProcessor) return [];
    return [new WorkspaceInstructionsProcessor({ workspace })];
  }
  /**
   * Validates the request context against the agent's requestContextSchema.
   * Throws an error if validation fails.
   */
  async #validateRequestContext(requestContext) {
    if (this.#requestContextSchema) {
      const contextValues = requestContext?.all ?? {};
      const validation = await this.#requestContextSchema["~standard"].validate(contextValues);
      if (validation.issues) {
        const errors = validation.issues;
        const errorMessages = errors.map((e) => {
          const pathStr = e.path?.map((p) => typeof p === "object" ? p.key : p).join(".");
          return `- ${pathStr}: ${e.message}`;
        }).join("\n");
        throw new MastraError({
          id: "AGENT_REQUEST_CONTEXT_VALIDATION_FAILED",
          domain: "AGENT" /* AGENT */,
          category: "USER" /* USER */,
          text: `Request context validation failed for agent '${this.id}':
${errorMessages}`,
          details: {
            agentId: this.id,
            agentName: this.name
          }
        });
      }
    }
  }
  /**
   * Returns the agents configured for this agent, resolving function-based agents if necessary.
   * Used in multi-agent collaboration scenarios where this agent can delegate to other agents.
   *
   * @example
   * ```typescript
   * const agents = await agent.listAgents();
   * console.log(Object.keys(agents)); // ['agent1', 'agent2']
   * ```
   */
  listAgents({ requestContext = new RequestContext() } = {}) {
    const agentsToUse = this.#agents ? typeof this.#agents === "function" ? this.#agents({ requestContext }) : this.#agents : {};
    return resolveMaybePromise(agentsToUse, (agents) => {
      if (!agents) {
        const mastraError = new MastraError({
          id: "AGENT_GET_AGENTS_FUNCTION_EMPTY_RETURN",
          domain: "AGENT" /* AGENT */,
          category: "USER" /* USER */,
          details: {
            agentName: this.name
          },
          text: `[Agent:${this.name}] - Function-based agents returned empty value`
        });
        this.logger.trackException(mastraError);
        throw mastraError;
      }
      Object.entries(agents || {}).forEach(([_agentName, agent]) => {
        if (this.#mastra) {
          agent.__registerMastra(this.#mastra);
        }
      });
      return agents;
    });
  }
  /**
   * Creates and returns a ProcessorRunner with resolved input/output processors.
   * @internal
   */
  async getProcessorRunner({
    requestContext,
    inputProcessorOverrides,
    outputProcessorOverrides,
    errorProcessorOverrides,
    processorStates
  }) {
    const inputProcessors = await this.listResolvedInputProcessors(requestContext, inputProcessorOverrides);
    const outputProcessors = await this.listResolvedOutputProcessors(requestContext, outputProcessorOverrides);
    const errorProcessors = errorProcessorOverrides ?? (this.#errorProcessors ? typeof this.#errorProcessors === "function" ? await this.#errorProcessors({ requestContext }) : this.#errorProcessors : []);
    return new ProcessorRunner({
      inputProcessors,
      outputProcessors,
      errorProcessors,
      logger: this.logger,
      agentName: this.name,
      processorStates
    });
  }
  /**
   * Combines multiple processors into a single workflow.
   * Each processor becomes a step in the workflow, chained together.
   * If there's only one item and it's already a workflow, returns it as-is.
   * @internal
   */
  combineProcessorsIntoWorkflow(processors, workflowId) {
    if (processors.length === 0) {
      return [];
    }
    if (processors.length === 1 && isProcessorWorkflow(processors[0])) {
      const workflow2 = processors[0];
      if (!workflow2.type) {
        workflow2.type = "processor";
      }
      return [workflow2];
    }
    const validProcessors = processors.filter((p) => isProcessorWorkflow(p) || isProcessor(p));
    if (validProcessors.length === 0) {
      return [];
    }
    if (validProcessors.length === 1 && isProcessorWorkflow(validProcessors[0])) {
      const workflow2 = validProcessors[0];
      if (!workflow2.type) {
        workflow2.type = "processor";
      }
      return [workflow2];
    }
    let workflow = createWorkflow({
      id: workflowId,
      inputSchema: ProcessorStepSchema,
      outputSchema: ProcessorStepSchema,
      type: "processor",
      options: {
        validateInputs: false,
        tracingPolicy: {
          // mark all workflow spans related to processor execution as internal
          internal: 1 /* WORKFLOW */
        }
      }
    });
    for (const [index, processorOrWorkflow] of validProcessors.entries()) {
      let step;
      if (isProcessorWorkflow(processorOrWorkflow)) {
        step = processorOrWorkflow;
      } else {
        const processor = processorOrWorkflow;
        processor.processorIndex = index;
        step = createStep(processor);
      }
      workflow = workflow.then(step);
    }
    return [workflow.commit()];
  }
  /**
   * Resolves and returns output processors from agent configuration.
   * All processors are combined into a single workflow for consistency.
   * @internal
   */
  async listResolvedOutputProcessors(requestContext, configuredProcessorOverrides) {
    const configuredProcessors = configuredProcessorOverrides ? configuredProcessorOverrides : this.#outputProcessors ? typeof this.#outputProcessors === "function" ? await this.#outputProcessors({
      requestContext: requestContext || new RequestContext()
    }) : this.#outputProcessors : [];
    const memory = await this.getMemory({ requestContext: requestContext || new RequestContext() });
    const memoryProcessors = memory ? await memory.getOutputProcessors(configuredProcessors, requestContext) : [];
    const allProcessors = [...configuredProcessors, ...memoryProcessors];
    return this.combineProcessorsIntoWorkflow(allProcessors, `${this.id}-output-processor`);
  }
  /**
   * Resolves and returns input processors from agent configuration.
   * All processors are combined into a single workflow for consistency.
   * @internal
   */
  async listResolvedInputProcessors(requestContext, configuredProcessorOverrides) {
    const configuredProcessors = configuredProcessorOverrides ? configuredProcessorOverrides : this.#inputProcessors ? typeof this.#inputProcessors === "function" ? await this.#inputProcessors({
      requestContext: requestContext || new RequestContext()
    }) : this.#inputProcessors : [];
    const memory = await this.getMemory({ requestContext: requestContext || new RequestContext() });
    const memoryProcessors = memory ? await memory.getInputProcessors(configuredProcessors, requestContext) : [];
    const workspaceProcessors = await this.getWorkspaceInstructionsProcessors(configuredProcessors, requestContext);
    const skillsProcessors = await this.getSkillsProcessors(configuredProcessors, requestContext);
    const channelProcessors = this.#agentChannels ? this.#agentChannels.getInputProcessors(configuredProcessors) : [];
    const browserProcessors = this.#browser ? this.#browser.getInputProcessors(configuredProcessors) : [];
    const allProcessors = [
      ...memoryProcessors,
      ...workspaceProcessors,
      ...skillsProcessors,
      ...channelProcessors,
      ...browserProcessors,
      ...configuredProcessors
    ];
    return this.combineProcessorsIntoWorkflow(allProcessors, `${this.id}-input-processor`);
  }
  /**
   * Returns the input processors for this agent, resolving function-based processors if necessary.
   */
  async listInputProcessors(requestContext) {
    return this.listResolvedInputProcessors(requestContext);
  }
  /**
   * Returns the output processors for this agent, resolving function-based processors if necessary.
   */
  async listOutputProcessors(requestContext) {
    return this.listResolvedOutputProcessors(requestContext);
  }
  /**
   * Resolves a processor by its ID from both input and output processors.
   * This method resolves dynamic processor functions and includes memory-derived processors.
   * Returns the processor if found, null otherwise.
   *
   * @example
   * ```typescript
   * const omProcessor = await agent.resolveProcessorById('observational-memory');
   * if (omProcessor) {
   *   // Observational memory is configured
   * }
   * ```
   */
  async resolveProcessorById(processorId, requestContext) {
    const ctx = requestContext || new RequestContext();
    const configuredInputProcessors = this.#inputProcessors ? typeof this.#inputProcessors === "function" ? await this.#inputProcessors({ requestContext: ctx }) : this.#inputProcessors : [];
    const memory = await this.getMemory({ requestContext: ctx });
    const memoryInputProcessors = memory ? await memory.getInputProcessors(configuredInputProcessors, ctx) : [];
    for (const p of [...memoryInputProcessors, ...configuredInputProcessors]) {
      if (!isProcessorWorkflow(p) && isProcessor(p) && p.id === processorId) {
        return p;
      }
    }
    const configuredOutputProcessors = this.#outputProcessors ? typeof this.#outputProcessors === "function" ? await this.#outputProcessors({ requestContext: ctx }) : this.#outputProcessors : [];
    const memoryOutputProcessors = memory ? await memory.getOutputProcessors(configuredOutputProcessors, ctx) : [];
    for (const p of [...memoryOutputProcessors, ...configuredOutputProcessors]) {
      if (!isProcessorWorkflow(p) && isProcessor(p) && p.id === processorId) {
        return p;
      }
    }
    return null;
  }
  /**
   * Returns only the user-configured input processors, excluding memory-derived processors.
   * Useful for scenarios where memory processors should not be applied (e.g., network routing agents).
   *
   * Unlike `listInputProcessors()` which includes both memory and configured processors,
   * this method returns only what was explicitly configured via the `inputProcessors` option.
   */
  async listConfiguredInputProcessors(requestContext) {
    if (!this.#inputProcessors) return [];
    const configuredProcessors = typeof this.#inputProcessors === "function" ? await this.#inputProcessors({
      requestContext: requestContext || new RequestContext()
    }) : this.#inputProcessors;
    return configuredProcessors;
  }
  /**
   * Returns only the user-configured output processors, excluding memory-derived processors.
   * Useful for scenarios where memory processors should not be applied (e.g., network routing agents).
   *
   * Unlike `listOutputProcessors()` which includes both memory and configured processors,
   * this method returns only what was explicitly configured via the `outputProcessors` option.
   */
  async listConfiguredOutputProcessors(requestContext) {
    if (!this.#outputProcessors) return [];
    const configuredProcessors = typeof this.#outputProcessors === "function" ? await this.#outputProcessors({
      requestContext: requestContext || new RequestContext()
    }) : this.#outputProcessors;
    return configuredProcessors;
  }
  /**
   * Returns the IDs of the raw configured input, output, and error processors,
   * without combining them into workflows. Used by the editor to clone
   * agent processor configuration to storage.
   */
  async getConfiguredProcessorIds(requestContext) {
    const ctx = requestContext || new RequestContext();
    let inputProcessorIds = [];
    if (this.#inputProcessors) {
      const processors = typeof this.#inputProcessors === "function" ? await this.#inputProcessors({ requestContext: ctx }) : this.#inputProcessors;
      inputProcessorIds = processors.map((p) => p.id).filter(Boolean);
    }
    let outputProcessorIds = [];
    if (this.#outputProcessors) {
      const processors = typeof this.#outputProcessors === "function" ? await this.#outputProcessors({ requestContext: ctx }) : this.#outputProcessors;
      outputProcessorIds = processors.map((p) => p.id).filter(Boolean);
    }
    let errorProcessorIds = [];
    if (this.#errorProcessors) {
      const processors = typeof this.#errorProcessors === "function" ? await this.#errorProcessors({ requestContext: ctx }) : this.#errorProcessors;
      errorProcessorIds = processors.map((p) => p.id).filter(Boolean);
    }
    return { inputProcessorIds, outputProcessorIds, errorProcessorIds };
  }
  /**
   * Returns configured processor workflows for registration with Mastra.
   * This excludes memory-derived processors to avoid triggering memory factory functions.
   * @internal
   */
  async getConfiguredProcessorWorkflows() {
    const workflows = [];
    if (this.#inputProcessors) {
      const inputProcessors = typeof this.#inputProcessors === "function" ? await this.#inputProcessors({ requestContext: new RequestContext() }) : this.#inputProcessors;
      const combined = this.combineProcessorsIntoWorkflow(inputProcessors, `${this.id}-input-processor`);
      for (const p of combined) {
        if (isProcessorWorkflow(p)) {
          workflows.push(p);
        }
      }
    }
    if (this.#outputProcessors) {
      const outputProcessors = typeof this.#outputProcessors === "function" ? await this.#outputProcessors({ requestContext: new RequestContext() }) : this.#outputProcessors;
      const combined = this.combineProcessorsIntoWorkflow(outputProcessors, `${this.id}-output-processor`);
      for (const p of combined) {
        if (isProcessorWorkflow(p)) {
          workflows.push(p);
        }
      }
    }
    return workflows;
  }
  /**
   * Returns whether this agent has its own memory configured.
   *
   * @example
   * ```typescript
   * if (agent.hasOwnMemory()) {
   *   const memory = await agent.getMemory();
   * }
   * ```
   */
  hasOwnMemory() {
    return Boolean(this.#memory);
  }
  /**
   * Gets the memory instance for this agent, resolving function-based memory if necessary.
   * The memory system enables conversation persistence, semantic recall, and working memory.
   *
   * @example
   * ```typescript
   * const memory = await agent.getMemory();
   * if (memory) {
   *   // Memory is configured
   * }
   * ```
   */
  async getMemory({ requestContext = new RequestContext() } = {}) {
    if (!this.#memory) {
      return void 0;
    }
    let resolvedMemory;
    if (typeof this.#memory !== "function") {
      resolvedMemory = this.#memory;
    } else {
      const result = this.#memory({
        requestContext,
        mastra: this.#mastra
      });
      resolvedMemory = await Promise.resolve(result);
      if (!resolvedMemory) {
        const mastraError = new MastraError({
          id: "AGENT_GET_MEMORY_FUNCTION_EMPTY_RETURN",
          domain: "AGENT" /* AGENT */,
          category: "USER" /* USER */,
          details: {
            agentName: this.name
          },
          text: `[Agent:${this.name}] - Function-based memory returned empty value`
        });
        this.logger.trackException(mastraError);
        throw mastraError;
      }
    }
    if (this.#mastra && resolvedMemory) {
      resolvedMemory.__registerMastra(this.#mastra);
      if (!resolvedMemory.hasOwnStorage) {
        const storage = this.#mastra.getStorage();
        if (storage) {
          resolvedMemory.setStorage(storage);
        }
      }
    }
    return resolvedMemory;
  }
  /**
   * Checks if this agent has its own workspace configured.
   *
   * @example
   * ```typescript
   * if (agent.hasOwnWorkspace()) {
   *   const workspace = await agent.getWorkspace();
   * }
   * ```
   */
  hasOwnWorkspace() {
    return Boolean(this.#workspace);
  }
  /**
   * Gets the workspace instance for this agent, resolving function-based workspace if necessary.
   * The workspace provides filesystem and sandbox capabilities for file operations and code execution.
   *
   * @example
   * ```typescript
   * const workspace = await agent.getWorkspace();
   * if (workspace) {
   *   await workspace.writeFile('/data.json', JSON.stringify(data));
   *   const result = await workspace.executeCode('console.log("Hello")');
   * }
   * ```
   */
  async getWorkspace({
    requestContext = new RequestContext()
  } = {}) {
    if (this.#workspace) {
      if (typeof this.#workspace !== "function") {
        return this.#workspace;
      }
      const result = this.#workspace({
        requestContext,
        mastra: this.#mastra
      });
      const resolvedWorkspace = await Promise.resolve(result);
      if (!resolvedWorkspace) {
        return void 0;
      }
      resolvedWorkspace.__setLogger(this.logger);
      if (this.#mastra) {
        this.#mastra.addWorkspace(resolvedWorkspace, void 0, {
          source: "agent",
          agentId: this.id,
          agentName: this.name
        });
      }
      return resolvedWorkspace;
    }
    return this.#mastra?.getWorkspace();
  }
  get voice() {
    if (typeof this.#instructions === "function") {
      const mastraError = new MastraError({
        id: "AGENT_VOICE_INCOMPATIBLE_WITH_FUNCTION_INSTRUCTIONS",
        domain: "AGENT" /* AGENT */,
        category: "USER" /* USER */,
        details: {
          agentName: this.name
        },
        text: "Voice is not compatible when instructions are a function. Please use getVoice() instead."
      });
      this.logger.trackException(mastraError);
      throw mastraError;
    }
    return this.#voice;
  }
  /**
   * Gets the request context schema for this agent.
   * Returns the Zod schema used to validate request context values, or undefined if not set.
   */
  get requestContextSchema() {
    return this.#requestContextSchema;
  }
  /**
   * Gets the workflows configured for this agent, resolving function-based workflows if necessary.
   * Workflows are step-based execution flows that can be triggered by the agent.
   *
   * @example
   * ```typescript
   * const workflows = await agent.listWorkflows();
   * const workflow = workflows['myWorkflow'];
   * ```
   */
  async listWorkflows({
    requestContext = new RequestContext()
  } = {}) {
    let workflowRecord;
    if (typeof this.#workflows === "function") {
      workflowRecord = await Promise.resolve(
        this.#workflows({ requestContext, mastra: this.#mastra })
      );
    } else {
      workflowRecord = this.#workflows ?? {};
    }
    Object.entries(workflowRecord || {}).forEach(([_workflowName, workflow]) => {
      if (this.#mastra) {
        workflow.__registerMastra(this.#mastra);
      }
    });
    return workflowRecord;
  }
  async listScorers({
    requestContext = new RequestContext()
  } = {}) {
    if (typeof this.#scorers !== "function") {
      return this.#scorers;
    }
    const result = this.#scorers({
      requestContext,
      mastra: this.#mastra
    });
    return resolveMaybePromise(result, (scorers) => {
      if (!scorers) {
        const mastraError = new MastraError({
          id: "AGENT_GET_SCORERS_FUNCTION_EMPTY_RETURN",
          domain: "AGENT" /* AGENT */,
          category: "USER" /* USER */,
          details: {
            agentName: this.name
          },
          text: `[Agent:${this.name}] - Function-based scorers returned empty value`
        });
        this.logger.trackException(mastraError);
        throw mastraError;
      }
      return scorers;
    });
  }
  /**
   * Gets the voice instance for this agent with tools and instructions configured.
   * The voice instance enables text-to-speech and speech-to-text capabilities.
   *
   * @example
   * ```typescript
   * const voice = await agent.getVoice();
   * const audioStream = await voice.speak('Hello world');
   * ```
   */
  async getVoice({ requestContext } = {}) {
    if (this.#voice) {
      const voice = this.#voice;
      voice?.addTools(await this.listTools({ requestContext }));
      const instructions = await this.getInstructions({ requestContext });
      voice?.addInstructions(this.#convertInstructionsToString(instructions));
      return voice;
    } else {
      return new DefaultVoice();
    }
  }
  /**
   * Gets the instructions for this agent, resolving function-based instructions if necessary.
   * Instructions define the agent's behavior and capabilities.
   *
   * @example
   * ```typescript
   * const instructions = await agent.getInstructions();
   * console.log(instructions); // 'You are a helpful assistant'
   * ```
   */
  getInstructions({ requestContext = new RequestContext() } = {}) {
    if (typeof this.#instructions === "function") {
      const result = this.#instructions({
        requestContext,
        mastra: this.#mastra
      });
      return resolveMaybePromise(result, (instructions) => {
        if (!instructions) {
          const mastraError = new MastraError({
            id: "AGENT_GET_INSTRUCTIONS_FUNCTION_EMPTY_RETURN",
            domain: "AGENT" /* AGENT */,
            category: "USER" /* USER */,
            details: {
              agentName: this.name
            },
            text: "Instructions are required to use an Agent. The function-based instructions returned an empty value."
          });
          this.logger.trackException(mastraError);
          throw mastraError;
        }
        return instructions;
      });
    }
    return this.#instructions;
  }
  /**
   * Helper function to convert agent instructions to string for backward compatibility
   * Used for legacy methods that expect string instructions (e.g., voice)
   * @internal
   */
  #convertInstructionsToString(instructions) {
    if (typeof instructions === "string") {
      return instructions;
    }
    if (Array.isArray(instructions)) {
      return instructions.map((msg) => {
        if (typeof msg === "string") {
          return msg;
        }
        return typeof msg.content === "string" ? msg.content : "";
      }).filter((content) => content).join("\n\n");
    }
    return typeof instructions.content === "string" ? instructions.content : "";
  }
  /**
   * Returns the description of the agent.
   *
   * @example
   * ```typescript
   * const description = agent.getDescription();
   * console.log(description); // 'A helpful weather assistant'
   * ```
   */
  getDescription() {
    return this.#description ?? "";
  }
  /**
   * Gets the legacy handler instance, initializing it lazily if needed.
   * @internal
   */
  getLegacyHandler() {
    if (!this.#legacyHandler) {
      this.#legacyHandler = new AgentLegacyHandler({
        logger: this.logger,
        name: this.name,
        id: this.id,
        mastra: this.#mastra,
        getDefaultGenerateOptionsLegacy: this.getDefaultGenerateOptionsLegacy.bind(this),
        getDefaultStreamOptionsLegacy: this.getDefaultStreamOptionsLegacy.bind(this),
        hasOwnMemory: this.hasOwnMemory.bind(this),
        getInstructions: async (options) => {
          const result = await this.getInstructions(options);
          return result;
        },
        getLLM: this.getLLM.bind(this),
        getMemory: this.getMemory.bind(this),
        convertTools: this.convertTools.bind(this),
        getMemoryMessages: (...args) => this.getMemoryMessages(...args),
        __runInputProcessors: this.__runInputProcessors.bind(this),
        __runProcessInputStep: this.__runProcessInputStep.bind(this),
        getMostRecentUserMessage: this.getMostRecentUserMessage.bind(this),
        genTitle: this.genTitle.bind(this),
        resolveTitleGenerationConfig: this.resolveTitleGenerationConfig.bind(this),
        saveStepMessages: this.saveStepMessages.bind(this),
        convertInstructionsToString: this.#convertInstructionsToString.bind(this),
        tracingPolicy: this.#options?.tracingPolicy,
        resolvedVersionId: this.toRawConfig()?.resolvedVersionId,
        _agentNetworkAppend: this._agentNetworkAppend,
        listResolvedOutputProcessors: this.listResolvedOutputProcessors.bind(this),
        __runOutputProcessors: this.__runOutputProcessors.bind(this),
        runScorers: this.#runScorers.bind(this)
      });
    }
    return this.#legacyHandler;
  }
  /**
   * Gets the default generate options for the legacy generate method.
   * These options are used as defaults when calling `generateLegacy()` without explicit options.
   *
   * @example
   * ```typescript
   * const options = await agent.getDefaultGenerateOptionsLegacy();
   * console.log(options.maxSteps); // 5
   * ```
   */
  getDefaultGenerateOptionsLegacy({
    requestContext = new RequestContext()
  } = {}) {
    if (typeof this.#defaultGenerateOptionsLegacy !== "function") {
      return this.#defaultGenerateOptionsLegacy;
    }
    const result = this.#defaultGenerateOptionsLegacy({
      requestContext,
      mastra: this.#mastra
    });
    return resolveMaybePromise(result, (options) => {
      if (!options) {
        const mastraError = new MastraError({
          id: "AGENT_GET_DEFAULT_GENERATE_OPTIONS_FUNCTION_EMPTY_RETURN",
          domain: "AGENT" /* AGENT */,
          category: "USER" /* USER */,
          details: {
            agentName: this.name
          },
          text: `[Agent:${this.name}] - Function-based default generate options returned empty value`
        });
        this.logger.trackException(mastraError);
        throw mastraError;
      }
      return options;
    });
  }
  /**
   * Gets the default stream options for the legacy stream method.
   * These options are used as defaults when calling `streamLegacy()` without explicit options.
   *
   * @example
   * ```typescript
   * const options = await agent.getDefaultStreamOptionsLegacy();
   * console.log(options.temperature); // 0.7
   * ```
   */
  getDefaultStreamOptionsLegacy({
    requestContext = new RequestContext()
  } = {}) {
    if (typeof this.#defaultStreamOptionsLegacy !== "function") {
      return this.#defaultStreamOptionsLegacy;
    }
    const result = this.#defaultStreamOptionsLegacy({
      requestContext,
      mastra: this.#mastra
    });
    return resolveMaybePromise(result, (options) => {
      if (!options) {
        const mastraError = new MastraError({
          id: "AGENT_GET_DEFAULT_STREAM_OPTIONS_FUNCTION_EMPTY_RETURN",
          domain: "AGENT" /* AGENT */,
          category: "USER" /* USER */,
          details: {
            agentName: this.name
          },
          text: `[Agent:${this.name}] - Function-based default stream options returned empty value`
        });
        this.logger.trackException(mastraError);
        throw mastraError;
      }
      return options;
    });
  }
  /**
   * Gets the default options for this agent, resolving function-based options if necessary.
   * These options are used as defaults when calling `stream()` or `generate()` without explicit options.
   *
   * @example
   * ```typescript
   * const options = await agent.getDefaultStreamOptions();
   * console.log(options.maxSteps); // 5
   * ```
   */
  getDefaultOptions({ requestContext = new RequestContext() } = {}) {
    if (typeof this.#defaultOptions !== "function") {
      return this.#defaultOptions;
    }
    const result = this.#defaultOptions({
      requestContext,
      mastra: this.#mastra
    });
    return resolveMaybePromise(result, (options) => {
      if (!options) {
        const mastraError = new MastraError({
          id: "AGENT_GET_DEFAULT_OPTIONS_FUNCTION_EMPTY_RETURN",
          domain: "AGENT" /* AGENT */,
          category: "USER" /* USER */,
          details: {
            agentName: this.name
          },
          text: `[Agent:${this.name}] - Function-based default options returned empty value`
        });
        this.logger.trackException(mastraError);
        throw mastraError;
      }
      return options;
    });
  }
  /**
   * Gets the default NetworkOptions for this agent, resolving function-based options if necessary.
   * These options are used as defaults when calling `network()` without explicit options.
   *
   * @returns NetworkOptions containing maxSteps, completion (CompletionConfig), and other network settings
   *
   * @example
   * ```typescript
   * const options = await agent.getDefaultNetworkOptions();
   * console.log(options.maxSteps); // 20
   * console.log(options.completion?.scorers); // [testsScorer, buildScorer]
   * ```
   */
  getDefaultNetworkOptions({ requestContext = new RequestContext() } = {}) {
    if (typeof this.#defaultNetworkOptions !== "function") {
      return this.#defaultNetworkOptions;
    }
    const result = this.#defaultNetworkOptions({
      requestContext,
      mastra: this.#mastra
    });
    return resolveMaybePromise(result, (options) => {
      if (!options) {
        const mastraError = new MastraError({
          id: "AGENT_GET_DEFAULT_NETWORK_OPTIONS_FUNCTION_EMPTY_RETURN",
          domain: "AGENT" /* AGENT */,
          category: "USER" /* USER */,
          details: {
            agentName: this.name
          },
          text: `[Agent:${this.name}] - Function-based default network options returned empty value`
        });
        this.logger.trackException(mastraError);
        throw mastraError;
      }
      return options;
    });
  }
  /**
   * Gets the tools configured for this agent, resolving function-based tools if necessary.
   * Tools extend the agent's capabilities, allowing it to perform specific actions or access external systems.
   *
   * Note: Browser tools are NOT included here. They are added at execution time via `convertTools()`.
   *
   * @example
   * ```typescript
   * const tools = await agent.listTools();
   * console.log(Object.keys(tools)); // ['calculator', 'weather', ...]
   * ```
   */
  listTools({ requestContext = new RequestContext() } = {}) {
    if (typeof this.#tools !== "function") {
      return ensureToolProperties(this.#tools);
    }
    const result = this.#tools({
      requestContext,
      mastra: this.#mastra
    });
    return resolveMaybePromise(result, (tools) => {
      if (!tools) {
        const mastraError = new MastraError({
          id: "AGENT_GET_TOOLS_FUNCTION_EMPTY_RETURN",
          domain: "AGENT" /* AGENT */,
          category: "USER" /* USER */,
          details: {
            agentName: this.name
          },
          text: `[Agent:${this.name}] - Function-based tools returned empty value`
        });
        this.logger.trackException(mastraError);
        throw mastraError;
      }
      return ensureToolProperties(tools);
    });
  }
  /**
   * Gets or creates an LLM instance based on the provided or configured model.
   * The LLM wraps the language model with additional capabilities like error handling.
   *
   * @example
   * ```typescript
   * const llm = await agent.getLLM();
   * // Use with custom model
   * const customLlm = await agent.getLLM({ model: 'openai/gpt-5' });
   * ```
   */
  getLLM({
    requestContext = new RequestContext(),
    model
  } = {}) {
    const modelSelectionPromise = model ? this.resolveModelSelection(
      model,
      requestContext
    ) : this.resolveModelSelection(this.model, requestContext);
    return modelSelectionPromise.then((modelSelection) => {
      const firstEnabledModel = Array.isArray(modelSelection) ? modelSelection.find((m) => m.enabled)?.model : modelSelection;
      if (!firstEnabledModel) {
        const mastraError = new MastraError({
          id: "AGENT_GET_LLM_NO_ENABLED_MODELS",
          domain: "AGENT" /* AGENT */,
          category: "USER" /* USER */,
          details: { agentName: this.name },
          text: `[Agent:${this.name}] - No enabled models found in model list`
        });
        this.logger.trackException(mastraError);
        throw mastraError;
      }
      const resolvedModel = this.resolveModelConfig(firstEnabledModel, requestContext);
      return resolveMaybePromise(resolvedModel, (modelInfo) => {
        let llm;
        if (isSupportedLanguageModel(modelInfo)) {
          llm = this.prepareModels(requestContext, modelSelection).then((models) => {
            const enabledModels = models.filter((model2) => model2.enabled);
            return new MastraLLMVNext({
              models: enabledModels,
              mastra: this.#mastra,
              options: { tracingPolicy: this.#options?.tracingPolicy }
            });
          });
        } else {
          llm = new MastraLLMV1({
            model: modelInfo,
            mastra: this.#mastra,
            options: { tracingPolicy: this.#options?.tracingPolicy }
          });
        }
        return resolveMaybePromise(llm, (resolvedLLM) => {
          if (this.#primitives) {
            resolvedLLM.__registerPrimitives(this.#primitives);
          }
          if (this.#mastra) {
            resolvedLLM.__registerMastra(this.#mastra);
          }
          return resolvedLLM;
        });
      });
    });
  }
  /**
   * Resolves a model configuration to a LanguageModel instance
   * @param modelConfig The model configuration (magic string, config object, or LanguageModel)
   * @returns A LanguageModel instance
   * @internal
   */
  async resolveModelConfig(modelConfig, requestContext) {
    try {
      return await resolveModelConfig(modelConfig, requestContext, this.#mastra);
    } catch (error) {
      const mastraError = new MastraError({
        id: "AGENT_GET_MODEL_MISSING_MODEL_INSTANCE",
        domain: "AGENT" /* AGENT */,
        category: "USER" /* USER */,
        details: {
          agentName: this.name,
          originalError: error instanceof Error ? error.message : String(error)
        },
        text: `[Agent:${this.name}] - Failed to resolve model configuration`
      });
      this.logger.trackException(mastraError);
      throw mastraError;
    }
  }
  /**
   * Type guard to check if an array is already normalized to ModelFallbacks.
   * Used to optimize and avoid double normalization.
   * @internal
   */
  isModelFallbacks(arr) {
    if (arr.length === 0) return false;
    return arr.every(
      (item) => typeof item.id === "string" && typeof item.model !== "undefined" && typeof item.maxRetries === "number" && typeof item.enabled === "boolean"
    );
  }
  /**
   * Normalizes model arrays into the internal fallback shape.
   * @internal
   */
  normalizeModelFallbacks(models) {
    if (this.isModelFallbacks(models)) {
      return models;
    }
    return models.map((m) => ({
      id: m.id ?? randomUUID(),
      model: m.model,
      maxRetries: m.maxRetries ?? this.maxRetries,
      enabled: m.enabled ?? true
    }));
  }
  /**
   * Ensures a model can participate in prepared multi-model execution.
   * @internal
   */
  assertSupportsPreparedModels(model) {
    if (!isSupportedLanguageModel(model)) {
      const mastraError = new MastraError({
        id: "AGENT_PREPARE_MODELS_INCOMPATIBLE_WITH_MODEL_ARRAY_V1",
        domain: "AGENT" /* AGENT */,
        category: "USER" /* USER */,
        details: {
          agentName: this.name
        },
        text: `[Agent:${this.name}] - Only v2/v3 models are allowed when an array of models is provided`
      });
      this.logger.trackException(mastraError);
      throw mastraError;
    }
  }
  /**
   * Resolves model configuration that may be a dynamic function returning a single model or array of models.
   * Supports DynamicArgument for both MastraModelConfig and ModelWithRetries[].
   * Normalizes fallback arrays while preserving single-model semantics.
   *
   * @internal
   */
  async resolveModelSelection(modelConfig, requestContext) {
    if (typeof modelConfig === "function") {
      const resolved = await modelConfig({
        requestContext,
        mastra: this.#mastra
      });
      if (Array.isArray(resolved)) {
        if (resolved.length === 0) {
          const mastraError = new MastraError({
            id: "AGENT_RESOLVE_MODEL_EMPTY_ARRAY",
            domain: "AGENT" /* AGENT */,
            category: "USER" /* USER */,
            details: { agentName: this.name },
            text: `[Agent:${this.name}] - Dynamic function returned empty model array`
          });
          this.logger.trackException(mastraError);
          throw mastraError;
        }
        return this.normalizeModelFallbacks(resolved);
      }
      return resolved;
    }
    if (Array.isArray(modelConfig)) {
      if (modelConfig.length === 0) {
        const mastraError = new MastraError({
          id: "AGENT_RESOLVE_MODEL_EMPTY_ARRAY",
          domain: "AGENT" /* AGENT */,
          category: "USER" /* USER */,
          details: { agentName: this.name },
          text: `[Agent:${this.name}] - Empty model array provided`
        });
        this.logger.trackException(mastraError);
        throw mastraError;
      }
      return this.normalizeModelFallbacks(modelConfig);
    }
    return modelConfig;
  }
  /**
   * Gets the model instance, resolving it if it's a function or model configuration.
   * When the agent has multiple models configured, returns the first enabled model.
   *
   * @example
   * ```typescript
   * const model = await agent.getModel();
   * // Get with custom model config
   * const customModel = await agent.getModel({
   *   modelConfig: 'openai/gpt-5'
   * });
   * ```
   */
  getModel({
    requestContext = new RequestContext(),
    modelConfig = this.model
  } = {}) {
    return this.resolveModelSelection(modelConfig, requestContext).then((resolved) => {
      if (!Array.isArray(resolved)) {
        return this.resolveModelConfig(resolved, requestContext);
      }
      const enabledModel = resolved.find((entry) => entry.enabled);
      if (!enabledModel) {
        const mastraError = new MastraError({
          id: "AGENT_GET_MODEL_MISSING_MODEL_INSTANCE",
          domain: "AGENT" /* AGENT */,
          category: "USER" /* USER */,
          details: { agentName: this.name },
          text: `[Agent:${this.name}] - No enabled models found in model list`
        });
        this.logger.trackException(mastraError);
        throw mastraError;
      }
      return this.resolveModelConfig(enabledModel.model, requestContext);
    });
  }
  /**
   * Gets the list of configured models if the agent has multiple models, otherwise returns null.
   * Used for model fallback and load balancing scenarios.
   *
   * @example
   * ```typescript
   * const models = await agent.getModelList();
   * if (models) {
   *   console.log(models.map(m => m.id));
   * }
   * ```
   */
  async getModelList(requestContext = new RequestContext()) {
    if (typeof this.model === "function") {
      const resolved = await this.resolveModelSelection(this.model, requestContext);
      if (!Array.isArray(resolved)) {
        return null;
      }
      return this.prepareModels(requestContext, resolved);
    }
    if (!Array.isArray(this.model)) {
      return null;
    }
    return this.prepareModels(requestContext);
  }
  /**
   * Updates the agent's instructions.
   * @internal
   */
  __updateInstructions(newInstructions) {
    this.#instructions = newInstructions;
  }
  /**
   * Updates the agent's model configuration.
   * @internal
   */
  __updateModel({ model }) {
    this.model = model;
    this.logger.debug(`[Agents:${this.name}] Model updated.`, { model: this.model, name: this.name });
  }
  /**
   * Resets the agent's model to the original model set during construction.
   * Clones arrays to prevent reordering mutations from affecting the original snapshot.
   * @internal
   */
  __resetToOriginalModel() {
    this.model = Array.isArray(this.#originalModel) ? [...this.#originalModel] : this.#originalModel;
  }
  /**
   * Returns a snapshot of the raw field values that may be overridden by stored config.
   * Used by the editor to save/restore code defaults externally.
   * @internal
   */
  __getOverridableFields() {
    return {
      instructions: this.#instructions,
      model: this.model,
      tools: this.#tools,
      workspace: this.#workspace
    };
  }
  reorderModels(modelIds) {
    if (!Array.isArray(this.model)) {
      this.logger.warn("Model is not an array", { agent: this.name });
      return;
    }
    this.model = this.model.sort((a, b) => {
      const aIndex = modelIds.indexOf(a.id);
      const bIndex = modelIds.indexOf(b.id);
      const aPos = aIndex === -1 ? Infinity : aIndex;
      const bPos = bIndex === -1 ? Infinity : bIndex;
      return aPos - bPos;
    });
  }
  updateModelInModelList({
    id,
    model,
    enabled,
    maxRetries
  }) {
    if (!Array.isArray(this.model)) {
      this.logger.warn("Model is not an array", { agent: this.name });
      return;
    }
    const modelArray = this.model;
    const modelToUpdate = modelArray.find((m) => m.id === id);
    if (!modelToUpdate) {
      this.logger.warn("Model not found", { agent: this.name, modelId: id });
      return;
    }
    this.model = modelArray.map((mdl) => {
      if (mdl.id === id) {
        return {
          ...mdl,
          model: model ?? mdl.model,
          enabled: enabled ?? mdl.enabled,
          maxRetries: maxRetries ?? mdl.maxRetries
        };
      }
      return mdl;
    });
  }
  #primitives;
  /**
   * Registers  logger primitives with the agent.
   * @internal
   */
  __registerPrimitives(p) {
    if (p.logger) {
      this.__setLogger(p.logger);
    }
    this.#primitives = p;
  }
  /**
   * Registers the Mastra instance with the agent.
   * @internal
   */
  __registerMastra(mastra) {
    this.#mastra = mastra;
    if (this.#workspace && typeof this.#workspace !== "function") {
      this.#workspace.__setLogger(this.logger);
    }
    if (this.#tools && typeof this.#tools === "object") {
      Object.entries(this.#tools).forEach(([key, tool2]) => {
        try {
          if (tool2 && typeof tool2 === "object" && "id" in tool2) {
            const toolKey = typeof tool2.id === "string" ? tool2.id : key;
            mastra.addTool(tool2, toolKey);
          }
        } catch (error) {
          if (error instanceof MastraError && error.id !== "MASTRA_ADD_TOOL_DUPLICATE_KEY") {
            throw error;
          }
        }
      });
    }
    if (this.#inputProcessors && Array.isArray(this.#inputProcessors)) {
      this.#inputProcessors.forEach((processor) => {
        try {
          mastra.addProcessor(processor);
        } catch (error) {
          if (error instanceof MastraError && error.id !== "MASTRA_ADD_PROCESSOR_DUPLICATE_KEY") {
            throw error;
          }
        }
        mastra.addProcessorConfiguration(processor, this.id, "input");
      });
    }
    if (this.#outputProcessors && Array.isArray(this.#outputProcessors)) {
      this.#outputProcessors.forEach((processor) => {
        try {
          mastra.addProcessor(processor);
        } catch (error) {
          if (error instanceof MastraError && error.id !== "MASTRA_ADD_PROCESSOR_DUPLICATE_KEY") {
            throw error;
          }
        }
        mastra.addProcessorConfiguration(processor, this.id, "output");
      });
    }
  }
  /**
   * Set the concrete tools for the agent
   * @param tools
   * @internal
   */
  __setTools(tools) {
    this.#tools = tools;
  }
  /**
   * Create a lightweight clone of this agent that can be independently mutated
   * without affecting the original instance. Used by the editor to apply
   * version overrides without mutating the singleton agent.
   * @internal
   */
  __fork() {
    const fork = new _Agent({
      ...this.#config,
      rawConfig: this.toRawConfig()
    });
    if (this.#mastra && !this.#config.mastra) {
      fork.#mastra = this.#mastra;
    }
    if (this.#primitives) {
      fork.#primitives = this.#primitives;
    }
    fork.source = this.source;
    fork._agentNetworkAppend = this._agentNetworkAppend;
    return fork;
  }
  async generateTitleFromUserMessage({
    message,
    requestContext = new RequestContext(),
    model,
    instructions,
    ...rest
  }) {
    const observabilityContext = resolveObservabilityContext(rest);
    const llm = await this.getLLM({ requestContext, model });
    const normMessage = new MessageList().add(message, "user").get.all.aiV5.ui().at(-1);
    if (!normMessage) {
      throw new Error(`Could not generate title from input ${JSON.stringify(message)}`);
    }
    const partsToGen = [];
    for (const part of normMessage.parts) {
      if (part.type === `text`) {
        partsToGen.push(part);
      } else if (part.type === `source-url`) {
        partsToGen.push({
          type: "text",
          text: `User added URL: ${part.url.substring(0, 100)}`
        });
      } else if (part.type === `file`) {
        partsToGen.push({
          type: "text",
          text: `User added ${part.mediaType} file: ${part.url.slice(0, 100)}`
        });
      }
    }
    const systemInstructions = await this.resolveTitleInstructions(requestContext, instructions);
    let text = "";
    if (isSupportedLanguageModel(llm.getModel())) {
      const messageList = new MessageList().add(
        [
          {
            role: "system",
            content: systemInstructions
          }
        ],
        "system"
      ).add(
        [
          {
            role: "user",
            content: JSON.stringify(partsToGen)
          }
        ],
        "input"
      );
      const result = llm.stream({
        methodType: "generate",
        requestContext,
        ...observabilityContext,
        messageList,
        agentId: this.id,
        agentName: this.name
      });
      text = await result.text;
    } else {
      const result = await llm.__text({
        requestContext,
        ...observabilityContext,
        messages: [
          {
            role: "system",
            content: systemInstructions
          },
          {
            role: "user",
            content: JSON.stringify(partsToGen)
          }
        ]
      });
      text = result.text;
    }
    const cleanedText = text.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
    return cleanedText;
  }
  getMostRecentUserMessage(messages) {
    const userMessages = messages.filter((message) => message.role === "user");
    return userMessages.at(-1);
  }
  async genTitle(userMessage, requestContext, observabilityContext, model, instructions) {
    try {
      if (userMessage) {
        const normMessage = new MessageList().add(userMessage, "user").get.all.ui().at(-1);
        if (normMessage) {
          return await this.generateTitleFromUserMessage({
            message: normMessage,
            requestContext,
            ...observabilityContext,
            model,
            instructions
          });
        }
      }
      return void 0;
    } catch (e) {
      this.logger.error("Error generating title", { agent: this.name, error: e });
      return void 0;
    }
  }
  __setMemory(memory) {
    this.#memory = memory;
  }
  __setWorkspace(workspace) {
    this.#workspace = workspace;
    if (this.#mastra && workspace && typeof workspace !== "function") {
      workspace.__setLogger(this.logger);
      this.#mastra.addWorkspace(workspace, void 0, {
        source: "agent",
        agentId: this.id,
        agentName: this.name
      });
    }
  }
  /**
   * Retrieves and converts memory tools to CoreTool format.
   * @internal
   */
  async listMemoryTools({
    runId,
    resourceId,
    threadId,
    requestContext,
    mastraProxy,
    memoryConfig,
    autoResumeSuspendedTools,
    ...rest
  }) {
    const observabilityContext = resolveObservabilityContext(rest);
    let convertedMemoryTools = {};
    if (this._agentNetworkAppend) {
      this.logger.debug("Skipping memory tools (agent network context)", { agent: this.name, runId });
      return convertedMemoryTools;
    }
    const memory = await this.getMemory({ requestContext });
    if (!threadId && !resourceId) {
      this.logger.debug("Skipping memory tools (no thread or resource context)", { agent: this.name, runId });
      return convertedMemoryTools;
    }
    const memoryTools = memory?.listTools?.(memoryConfig);
    if (memoryTools) {
      for (const [toolName, tool2] of Object.entries(memoryTools)) {
        const toolObj = tool2;
        const options = {
          name: toolName,
          runId,
          threadId,
          resourceId,
          logger: this.logger,
          mastra: mastraProxy,
          memory,
          agentName: this.name,
          agentId: this.id,
          requestContext,
          ...observabilityContext,
          model: await this.getModel({ requestContext }),
          tracingPolicy: this.#options?.tracingPolicy,
          requireApproval: toolObj.requireApproval
        };
        const convertedToCoreTool = makeCoreTool(toolObj, options, void 0, autoResumeSuspendedTools);
        convertedMemoryTools[toolName] = convertedToCoreTool;
      }
    }
    return convertedMemoryTools;
  }
  /**
   * Lists workspace tools if a workspace is configured.
   * @internal
   */
  async listWorkspaceTools({
    runId,
    resourceId,
    threadId,
    requestContext,
    mastraProxy,
    autoResumeSuspendedTools,
    ...rest
  }) {
    const observabilityContext = resolveObservabilityContext(rest);
    let convertedWorkspaceTools = {};
    if (this._agentNetworkAppend) {
      this.logger.debug("Skipping workspace tools (agent network context)", { agent: this.name, runId });
      return convertedWorkspaceTools;
    }
    const workspace = await this.getWorkspace({ requestContext });
    if (!workspace) {
      return convertedWorkspaceTools;
    }
    const workspaceTools = await createWorkspaceTools(workspace, {
      requestContext: requestContext ? Object.fromEntries(requestContext.entries()) : {},
      workspace
    });
    if (Object.keys(workspaceTools).length > 0) {
      this.logger.debug("Adding workspace tools", { agent: this.name, tools: Object.keys(workspaceTools), runId });
      for (const [toolName, tool2] of Object.entries(workspaceTools)) {
        const toolObj = tool2;
        const options = {
          name: toolName,
          runId,
          threadId,
          resourceId,
          logger: this.logger,
          mastra: mastraProxy,
          agentName: this.name,
          agentId: this.id,
          requestContext,
          ...observabilityContext,
          model: await this.getModel({ requestContext }),
          tracingPolicy: this.#options?.tracingPolicy,
          requireApproval: toolObj.requireApproval,
          workspace
        };
        const convertedToCoreTool = makeCoreTool(toolObj, options, void 0, autoResumeSuspendedTools);
        convertedWorkspaceTools[toolName] = convertedToCoreTool;
      }
    }
    return convertedWorkspaceTools;
  }
  /**
   * Returns tools provided by the agent's channels (e.g. discord_send_message).
   * @internal
   */
  async listChannelTools({
    runId,
    resourceId,
    threadId,
    requestContext,
    mastraProxy,
    autoResumeSuspendedTools,
    ...rest
  }) {
    const observabilityContext = resolveObservabilityContext(rest);
    const convertedChannelTools = {};
    if (!this.#agentChannels) {
      return convertedChannelTools;
    }
    const channelTools = this.#agentChannels.getTools();
    if (Object.keys(channelTools).length > 0) {
      const memory = await this.getMemory({ requestContext });
      for (const [toolName, tool2] of Object.entries(channelTools)) {
        const options = {
          name: toolName,
          runId,
          threadId,
          resourceId,
          logger: this.logger,
          mastra: mastraProxy,
          memory,
          agentName: this.name,
          requestContext,
          ...observabilityContext,
          tracingPolicy: this.#options?.tracingPolicy
        };
        convertedChannelTools[toolName] = makeCoreTool(
          tool2,
          options,
          void 0,
          autoResumeSuspendedTools
        );
      }
    }
    return convertedChannelTools;
  }
  /**
   * Returns skill tools (skill, skill_search, skill_read) when the workspace
   * has skills configured. These are added at the Agent level (like workspace
   * tools) rather than inside a processor, so they persist across turns and
   * survive serialization across tool-approval pauses.
   * @internal
   */
  async listSkillTools({
    runId,
    resourceId,
    threadId,
    requestContext,
    mastraProxy,
    autoResumeSuspendedTools,
    ...rest
  }) {
    const observabilityContext = resolveObservabilityContext(rest);
    let convertedSkillTools = {};
    if (this._agentNetworkAppend) {
      return convertedSkillTools;
    }
    const workspace = await this.getWorkspace({ requestContext });
    if (!workspace?.skills) {
      return convertedSkillTools;
    }
    const skillTools = createSkillTools(workspace.skills);
    if (Object.keys(skillTools).length > 0) {
      this.logger.debug("Adding skill tools", { agent: this.name, tools: Object.keys(skillTools), runId });
      for (const [toolName, tool2] of Object.entries(skillTools)) {
        const toolObj = tool2;
        const options = {
          name: toolName,
          runId,
          threadId,
          resourceId,
          logger: this.logger,
          mastra: mastraProxy,
          agentName: this.name,
          agentId: this.id,
          requestContext,
          ...observabilityContext,
          model: await this.getModel({ requestContext }),
          tracingPolicy: this.#options?.tracingPolicy,
          requireApproval: false,
          // Skill tools never require approval
          workspace
        };
        const convertedToCoreTool = makeCoreTool(toolObj, options, void 0, autoResumeSuspendedTools);
        convertedSkillTools[toolName] = convertedToCoreTool;
      }
    }
    return convertedSkillTools;
  }
  /**
   * Lists browser tools if a browser is configured.
   * @internal
   */
  async listBrowserTools({
    runId,
    resourceId,
    threadId,
    requestContext,
    autoResumeSuspendedTools,
    ...rest
  }) {
    const observabilityContext = resolveObservabilityContext(rest);
    let convertedBrowserTools = {};
    if (this._agentNetworkAppend) {
      return convertedBrowserTools;
    }
    if (!this.#browser) {
      return convertedBrowserTools;
    }
    const browserTools = this.#browser.getTools();
    if (Object.keys(browserTools).length > 0) {
      this.logger.debug(`[Agent:${this.name}] - Adding browser tools: ${Object.keys(browserTools).join(", ")}`, {
        runId
      });
      for (const [toolName, tool2] of Object.entries(browserTools)) {
        const toolObj = tool2;
        const options = {
          name: toolName,
          runId,
          threadId,
          resourceId,
          logger: this.logger,
          mastra: void 0,
          agentName: this.name,
          agentId: this.id,
          requestContext,
          ...observabilityContext,
          model: await this.getModel({ requestContext }),
          tracingPolicy: this.#options?.tracingPolicy,
          requireApproval: toolObj.requireApproval
        };
        const convertedToCoreTool = makeCoreTool(toolObj, options, void 0, autoResumeSuspendedTools);
        convertedBrowserTools[toolName] = convertedToCoreTool;
      }
    }
    return convertedBrowserTools;
  }
  /**
   * Executes input processors on the message list before LLM processing.
   * @internal
   */
  async __runInputProcessors({
    requestContext,
    messageList,
    inputProcessorOverrides,
    processorStates,
    ...observabilityContext
  }) {
    let tripwire;
    if (inputProcessorOverrides?.length || this.#inputProcessors || this.#memory || this.#workspace || this.#mastra?.getWorkspace() || this.#browser || this.#agentChannels) {
      const runner = await this.getProcessorRunner({
        requestContext,
        inputProcessorOverrides,
        processorStates
      });
      try {
        messageList = await runner.runInputProcessors(messageList, observabilityContext, requestContext);
      } catch (error) {
        if (error instanceof TripWire) {
          tripwire = {
            reason: error.message,
            retry: error.options?.retry,
            metadata: error.options?.metadata,
            processorId: error.processorId
          };
          this.logger.warn("Input processor tripwire triggered", {
            agent: this.name,
            reason: error.message,
            processorId: error.processorId,
            retry: error.options?.retry
          });
        } else {
          throw new MastraError(
            {
              id: "AGENT_INPUT_PROCESSOR_ERROR",
              domain: "AGENT" /* AGENT */,
              category: "USER" /* USER */,
              text: `[Agent:${this.name}] - Input processor error`
            },
            error
          );
        }
      }
    }
    return {
      messageList,
      tripwire
    };
  }
  /**
   * Runs processInputStep phase on input processors.
   * Used by legacy path to execute per-step input processing (e.g., Observational Memory)
   * that would otherwise only run in the v5 agentic loop.
   * @internal
   */
  async __runProcessInputStep(args) {
    const { requestContext, messageList, stepNumber = 0, processorStates, ...rest } = args;
    const observabilityContext = resolveObservabilityContext(rest);
    let tripwire;
    if (this.#inputProcessors || this.#memory) {
      const runner = await this.getProcessorRunner({
        requestContext,
        processorStates
      });
      try {
        const llm = await this.getLLM({ requestContext });
        const model = llm.getModel();
        await runner.runProcessInputStep({
          messageList,
          stepNumber,
          steps: [],
          ...observabilityContext,
          requestContext,
          // Cast needed: legacy v1 models return LanguageModelV1 which doesn't satisfy MastraLanguageModel.
          // OM's processInputStep doesn't use the model parameter, so this is safe.
          model,
          retryCount: 0
        });
      } catch (error) {
        if (error instanceof TripWire) {
          tripwire = {
            reason: error.message,
            retry: error.options?.retry,
            metadata: error.options?.metadata,
            processorId: error.processorId
          };
          this.logger.warn("Input step processor tripwire triggered", {
            agent: this.name,
            reason: error.message,
            processorId: error.processorId,
            retry: error.options?.retry
          });
        } else {
          throw new MastraError(
            {
              id: "AGENT_INPUT_STEP_PROCESSOR_ERROR",
              domain: "AGENT" /* AGENT */,
              category: "USER" /* USER */,
              text: `[Agent:${this.name}] - Input step processor error`
            },
            error
          );
        }
      }
    }
    return {
      messageList,
      tripwire
    };
  }
  /**
   * Executes output processors on the message list after LLM processing.
   * @internal
   */
  async __runOutputProcessors({
    requestContext,
    messageList,
    outputProcessorOverrides,
    ...observabilityContext
  }) {
    let tripwire;
    if (outputProcessorOverrides?.length || this.#outputProcessors || this.#memory) {
      const runner = await this.getProcessorRunner({
        requestContext,
        outputProcessorOverrides
      });
      try {
        messageList = await runner.runOutputProcessors(messageList, observabilityContext, requestContext);
      } catch (e) {
        if (e instanceof TripWire) {
          tripwire = {
            reason: e.message,
            retry: e.options?.retry,
            metadata: e.options?.metadata,
            processorId: e.processorId
          };
          this.logger.warn("Output processor tripwire triggered", {
            agent: this.name,
            reason: e.message,
            processorId: e.processorId,
            retry: e.options?.retry
          });
        } else {
          throw e;
        }
      }
    }
    return {
      messageList,
      tripwire
    };
  }
  /**
   * Fetches remembered messages from memory for the current thread.
   * @internal
   */
  async getMemoryMessages({
    resourceId,
    threadId,
    vectorMessageSearch,
    memoryConfig,
    requestContext
  }) {
    const memory = await this.getMemory({ requestContext });
    if (!memory) {
      return { messages: [] };
    }
    const threadConfig = memory.getMergedThreadConfig(memoryConfig || {});
    if (!threadConfig.lastMessages && !threadConfig.semanticRecall) {
      return { messages: [] };
    }
    return memory.recall({
      threadId,
      resourceId,
      // When lastMessages is false (disabled), don't pass perPage so recall()
      // can detect the disabled state from config and return empty history.
      // When lastMessages is a number, pass it as perPage to limit results.
      ...typeof threadConfig.lastMessages === "number" ? { perPage: threadConfig.lastMessages } : {},
      threadConfig: memoryConfig,
      // The new user messages aren't in the list yet cause we add memory messages first to try to make sure ordering is correct (memory comes before new user messages)
      vectorSearchString: threadConfig.semanticRecall && vectorMessageSearch ? vectorMessageSearch : void 0
    });
  }
  /**
   * Retrieves and converts assigned tools to CoreTool format.
   * @internal
   */
  async listAssignedTools({
    runId,
    resourceId,
    threadId,
    requestContext,
    mastraProxy,
    outputWriter,
    autoResumeSuspendedTools,
    ...rest
  }) {
    const observabilityContext = resolveObservabilityContext(rest);
    let toolsForRequest = {};
    const memory = await this.getMemory({ requestContext });
    const assignedTools = await this.listTools({ requestContext });
    const assignedToolEntries = Object.entries(assignedTools || {});
    const assignedCoreToolEntries = await Promise.all(
      assignedToolEntries.map(async ([k, tool2]) => {
        if (!tool2) {
          return;
        }
        const options = {
          name: k,
          runId,
          threadId,
          resourceId,
          logger: this.logger,
          mastra: mastraProxy,
          memory,
          agentName: this.name,
          agentId: this.id,
          requestContext,
          ...observabilityContext,
          model: await this.getModel({ requestContext }),
          outputWriter,
          tracingPolicy: this.#options?.tracingPolicy,
          requireApproval: tool2.requireApproval
        };
        return [k, makeCoreTool(tool2, options, void 0, autoResumeSuspendedTools)];
      })
    );
    const assignedToolEntriesConverted = Object.fromEntries(
      assignedCoreToolEntries.filter((entry) => Boolean(entry))
    );
    toolsForRequest = {
      ...assignedToolEntriesConverted
    };
    return toolsForRequest;
  }
  /**
   * Retrieves and converts toolset tools to CoreTool format.
   * @internal
   */
  async listToolsets({
    runId,
    threadId,
    resourceId,
    toolsets,
    requestContext,
    mastraProxy,
    autoResumeSuspendedTools,
    ...rest
  }) {
    const observabilityContext = resolveObservabilityContext(rest);
    let toolsForRequest = {};
    const memory = await this.getMemory({ requestContext });
    const toolsFromToolsets = Object.values(toolsets || {});
    if (toolsFromToolsets.length > 0) {
      this.logger.debug("Adding tools from toolsets", {
        agent: this.name,
        toolsets: Object.keys(toolsets || {}),
        runId
      });
      for (const toolset of toolsFromToolsets) {
        for (const [toolName, tool2] of Object.entries(toolset)) {
          const toolObj = tool2;
          const options = {
            name: toolName,
            runId,
            threadId,
            resourceId,
            logger: this.logger,
            mastra: mastraProxy,
            memory,
            agentName: this.name,
            agentId: this.id,
            requestContext,
            ...observabilityContext,
            model: await this.getModel({ requestContext }),
            tracingPolicy: this.#options?.tracingPolicy,
            requireApproval: toolObj.requireApproval
          };
          const convertedToCoreTool = makeCoreTool(toolObj, options, "toolset", autoResumeSuspendedTools);
          toolsForRequest[toolName] = convertedToCoreTool;
        }
      }
    }
    return toolsForRequest;
  }
  /**
   * Retrieves and converts client-side tools to CoreTool format.
   * @internal
   */
  async listClientTools({
    runId,
    threadId,
    resourceId,
    requestContext,
    mastraProxy,
    clientTools,
    autoResumeSuspendedTools,
    ...rest
  }) {
    const observabilityContext = resolveObservabilityContext(rest);
    let toolsForRequest = {};
    const memory = await this.getMemory({ requestContext });
    const clientToolsForInput = Object.entries(clientTools || {});
    if (clientToolsForInput.length > 0) {
      this.logger.debug("Adding client tools", { agent: this.name, tools: Object.keys(clientTools || {}), runId });
      for (const [toolName, tool2] of clientToolsForInput) {
        const { execute: execute2, ...toolRest } = tool2;
        const options = {
          name: toolName,
          runId,
          threadId,
          resourceId,
          logger: this.logger,
          mastra: mastraProxy,
          memory,
          agentName: this.name,
          agentId: this.id,
          requestContext,
          ...observabilityContext,
          model: await this.getModel({ requestContext }),
          tracingPolicy: this.#options?.tracingPolicy,
          requireApproval: tool2.requireApproval
        };
        const convertedToCoreTool = makeCoreTool(toolRest, options, "client-tool", autoResumeSuspendedTools);
        toolsForRequest[toolName] = convertedToCoreTool;
      }
    }
    return toolsForRequest;
  }
  /**
   * Strips tool parts from messages.
   *
   * When a supervisor delegates to a sub-agent, the parent's conversation
   * history may include tool_call parts for its own delegation tools
   * (agent-* and workflow-*) and other tools. The sub-agent doesn't have these tools,
   * so sending references to them causes model providers to reject or
   * mishandle the request.
   *
   * This function removes those parts while preserving all other
   * conversation context (user messages, assistant text, etc.).
   * @internal
   */
  stripParentToolParts(messages) {
    return messages.map((message) => {
      if (message.role === "assistant") {
        const content = message.content;
        const parts = Array.isArray(content) ? content : content?.parts;
        if (!Array.isArray(parts)) return message;
        const filtered = parts.filter((part) => part?.type !== "tool-call");
        if (filtered.length === 0) return null;
        if (Array.isArray(content)) {
          return { ...message, content: filtered };
        }
        return { ...message, content: { ...content, parts: filtered } };
      }
      if (message.role === "tool") {
        return null;
      }
      return message;
    }).filter((message) => Boolean(message));
  }
  /**
   * Retrieves and converts agent tools to CoreTool format.
   * @internal
   */
  async listAgentTools({
    runId,
    threadId,
    resourceId,
    requestContext,
    methodType,
    autoResumeSuspendedTools,
    delegation,
    ...rest
  }) {
    const observabilityContext = resolveObservabilityContext(rest);
    const convertedAgentTools = {};
    const agents = await this.listAgents({ requestContext });
    if (Object.keys(agents).length > 0) {
      for (const [agentName, agent] of Object.entries(agents)) {
        const agentInputSchema = object({
          prompt: string().describe("The prompt to send to the agent"),
          // Using .nullish() instead of .optional() because OpenAI sends null for unfilled optional fields
          threadId: string().nullish().describe("Thread ID for conversation continuity for memory messages"),
          resourceId: string().nullish().describe("Resource/user identifier for memory messages"),
          instructions: string().nullish().describe(
            "Additional instructions to append to the agent instructions. Only provide if you have specific guidance beyond what the agent already knows. Leave empty in most cases."
          ),
          maxSteps: number().min(3).nullish().describe("Maximum number of execution steps for the sub-agent")
          // using minimum of 3 to ensure if the agent has a tool call, the llm gets executed again after the tool call step, using the tool call result
          // to return a proper llm response
        });
        const agentOutputSchema = object({
          text: string().describe("The response from the agent"),
          subAgentThreadId: string().describe("The thread ID of the agent").optional(),
          subAgentResourceId: string().describe("The resource ID of the agent").optional(),
          subAgentToolResults: array(
            object({
              toolName: string().describe("The name of the tool"),
              toolCallId: string().describe("The ID of the tool call"),
              result: any().describe("The result of the tool call"),
              args: any().describe("The arguments of the tool call").optional(),
              isError: boolean().describe("Whether the tool call resulted in an error").optional()
            })
          ).describe("The results from the agent's tool calls").optional()
        });
        const modelVersion = (await agent.getModel({ requestContext })).specificationVersion;
        const toolObj = createTool({
          id: `agent-${agentName}`,
          description: agent.getDescription() || `Agent: ${agentName}`,
          inputSchema: agentInputSchema,
          outputSchema: agentOutputSchema,
          mastra: this.#mastra,
          // manually wrap agent tools with tracing, so that we can pass the
          // current tool span onto the agent to maintain continuity of the trace
          execute: async (inputData, context) => {
            const startTime = Date.now();
            const toolCallId = context?.agent?.toolCallId || randomUUID();
            const contextMessages = context?.agent?.messages || [];
            const sanitizedMessages = this.stripParentToolParts(contextMessages);
            let fullSubAgentMessages = sanitizedMessages;
            const derivedIteration = Math.max(1, sanitizedMessages.filter((m) => m.role === "assistant").length);
            const delegationStartContext = {
              primitiveId: agent.id,
              primitiveType: "agent",
              prompt: inputData.prompt,
              params: {
                threadId: inputData.threadId || void 0,
                resourceId: inputData.resourceId || void 0,
                instructions: inputData.instructions || void 0,
                maxSteps: inputData.maxSteps || void 0
              },
              iteration: derivedIteration,
              runId: runId || randomUUID(),
              threadId,
              resourceId,
              parentAgentId: this.id,
              parentAgentName: this.name,
              toolCallId,
              messages: sanitizedMessages
            };
            const slugify = await import('./index4.mjs');
            const subAgentThreadId = inputData.threadId ? `${inputData.threadId}-${randomUUID()}` : context?.mastra?.generateId({
              idType: "thread",
              source: "agent",
              entityId: agentName,
              resourceId
            }) || randomUUID();
            const subAgentResourceId = inputData.resourceId ? `${inputData.resourceId}-${agentName}` : context?.mastra?.generateId({
              idType: "generic",
              source: "agent",
              entityId: agentName
            }) || `${slugify.default(this.id)}-${agentName}`;
            const subAgentDefaultOptions = await agent.getDefaultOptions?.({ requestContext });
            const subAgentHasOwnMemoryConfig = subAgentDefaultOptions?.memory !== void 0;
            const savedMastraMemory = requestContext.get("MastraMemory");
            const savedThreadIdKey = requestContext.get(MASTRA_THREAD_ID_KEY);
            const savedResourceIdKey = requestContext.get(MASTRA_RESOURCE_ID_KEY);
            if (savedThreadIdKey !== void 0) {
              requestContext.delete(MASTRA_THREAD_ID_KEY);
            }
            if (savedResourceIdKey !== void 0) {
              requestContext.delete(MASTRA_RESOURCE_ID_KEY);
            }
            if ((methodType === "generate" || methodType === "generateLegacy" || methodType === "stream" || methodType === "streamLegacy") && supportedLanguageModelSpecifications.includes(modelVersion)) {
              if (!agent.hasOwnMemory() && this.#memory) {
                agent.__setMemory(this.#memory);
              }
            }
            let effectivePrompt = inputData.prompt;
            let effectiveInstructions = inputData.instructions;
            let effectiveMaxSteps = inputData.maxSteps;
            if (delegation?.onDelegationStart) {
              try {
                const startResult = await delegation.onDelegationStart(delegationStartContext);
                if (startResult) {
                  if (startResult.proceed === false) {
                    const rejectionMessage = startResult.rejectionReason || "Delegation rejected by onDelegationStart hook";
                    this.logger.debug("Delegation rejected", {
                      agent: this.name,
                      targetAgent: agentName,
                      reason: rejectionMessage
                    });
                    if ((methodType === "stream" || methodType === "streamLegacy") && supportedLanguageModelSpecifications.includes(modelVersion)) {
                      await context.writer?.write({
                        type: "text-delta",
                        payload: {
                          id: randomUUID(),
                          text: `[Delegation Rejected] ${rejectionMessage}`
                        },
                        runId,
                        from: "AGENT" /* AGENT */
                      });
                    }
                    const memory = await agent.getMemory({ requestContext });
                    if (memory) {
                      try {
                        const userMessage = {
                          id: this.#mastra?.generateId() || randomUUID(),
                          role: "user",
                          type: "text",
                          createdAt: /* @__PURE__ */ new Date(),
                          threadId: subAgentThreadId,
                          resourceId: subAgentResourceId,
                          content: {
                            format: 2,
                            parts: [
                              {
                                type: "text",
                                text: effectivePrompt
                              }
                            ]
                          }
                        };
                        const assistantMessage = {
                          id: this.#mastra?.generateId() || randomUUID(),
                          role: "assistant",
                          type: "text",
                          createdAt: new Date((/* @__PURE__ */ new Date()).getTime() + 1),
                          threadId: subAgentThreadId,
                          resourceId: subAgentResourceId,
                          content: {
                            format: 2,
                            parts: [
                              {
                                type: "text",
                                text: `[Delegation Rejected] ${rejectionMessage}`
                              }
                            ]
                          }
                        };
                        await memory.createThread({
                          resourceId: subAgentResourceId,
                          threadId: subAgentThreadId
                        });
                        await memory.saveMessages({
                          messages: [userMessage, assistantMessage]
                        });
                      } catch (memoryError) {
                        this.logger.error("Failed to save rejection to sub-agent memory", {
                          agent: this.name,
                          error: memoryError
                        });
                      }
                    }
                    if (savedThreadIdKey !== void 0) {
                      requestContext.set(MASTRA_THREAD_ID_KEY, savedThreadIdKey);
                    }
                    if (savedResourceIdKey !== void 0) {
                      requestContext.set(MASTRA_RESOURCE_ID_KEY, savedResourceIdKey);
                    }
                    return {
                      text: `[Delegation Rejected] ${rejectionMessage}`,
                      subAgentThreadId,
                      subAgentResourceId
                    };
                  }
                  if (startResult.modifiedPrompt !== void 0) {
                    effectivePrompt = startResult.modifiedPrompt;
                  }
                  if (startResult.modifiedInstructions !== void 0) {
                    effectiveInstructions = startResult.modifiedInstructions;
                  }
                  if (startResult.modifiedMaxSteps !== void 0) {
                    effectiveMaxSteps = startResult.modifiedMaxSteps;
                  }
                }
              } catch (hookError) {
                this.logger.error("onDelegationStart hook error", { agent: this.name, error: hookError });
              }
            }
            this.logger.debug("Delegation accepted", {
              agent: this.name,
              targetAgent: agentName,
              modifiedPrompt: effectivePrompt !== inputData.prompt,
              modifiedInstructions: effectiveInstructions !== inputData.instructions,
              modifiedMaxSteps: effectiveMaxSteps !== inputData.maxSteps
            });
            if (effectiveInstructions) {
              const agentOwnInstructions = await agent.getInstructions({ requestContext });
              if (agentOwnInstructions) {
                const ownStr = this.#convertInstructionsToString(agentOwnInstructions);
                if (ownStr) {
                  effectiveInstructions = `${ownStr}

${effectiveInstructions}`;
                }
              }
            }
            try {
              this.logger.debug("Executing agent as tool", {
                agent: this.name,
                targetAgent: agentName,
                args: inputData,
                runId,
                threadId,
                resourceId
              });
              let result;
              const suspendedToolRunId = inputData.suspendedToolRunId;
              const { resumeData, suspend } = context?.agent ?? {};
              let filteredContextMessages = sanitizedMessages;
              if (delegation?.messageFilter) {
                try {
                  filteredContextMessages = await delegation.messageFilter({
                    messages: sanitizedMessages,
                    primitiveId: agent.id,
                    primitiveType: "agent",
                    prompt: effectivePrompt,
                    iteration: derivedIteration,
                    runId: runId || randomUUID(),
                    threadId,
                    resourceId,
                    parentAgentId: this.id,
                    parentAgentName: this.name,
                    toolCallId
                  });
                } catch (filterError) {
                  this.logger.error("messageFilter error", { agent: this.name, error: filterError });
                }
              }
              const messagesForSubAgent = [{ role: "user", content: effectivePrompt }];
              const subAgentPromptCreatedAt = /* @__PURE__ */ new Date();
              if ((methodType === "generate" || methodType === "generateLegacy") && supportedLanguageModelSpecifications.includes(modelVersion)) {
                const generateResult = resumeData ? await agent.resumeGenerate(resumeData, {
                  runId: suspendedToolRunId,
                  requestContext,
                  ...resolveObservabilityContext(context ?? {}),
                  ...effectiveInstructions && { instructions: effectiveInstructions },
                  ...effectiveMaxSteps && { maxSteps: effectiveMaxSteps },
                  context: filteredContextMessages,
                  ...resourceId && threadId && !subAgentHasOwnMemoryConfig ? {
                    memory: {
                      resource: subAgentResourceId,
                      thread: subAgentThreadId,
                      options: { lastMessages: false }
                    }
                  } : {}
                }) : await agent.generate(messagesForSubAgent, {
                  requestContext,
                  ...resolveObservabilityContext(context ?? {}),
                  ...effectiveInstructions && { instructions: effectiveInstructions },
                  ...effectiveMaxSteps && { maxSteps: effectiveMaxSteps },
                  context: filteredContextMessages,
                  ...resourceId && threadId && !subAgentHasOwnMemoryConfig ? {
                    memory: {
                      resource: subAgentResourceId,
                      thread: subAgentThreadId,
                      options: { lastMessages: false }
                    }
                  } : {}
                });
                const agentResponseMessages = generateResult.response.dbMessages ?? [];
                const subAgentToolResults = generateResult.toolResults?.map((toolResult) => ({
                  toolName: toolResult.payload.toolName,
                  toolCallId: toolResult.payload.toolCallId,
                  result: toolResult.payload.result,
                  args: toolResult.payload.args,
                  isError: toolResult.payload.isError
                }));
                const userMessage = {
                  id: this.#mastra?.generateId() || randomUUID(),
                  role: "user",
                  type: "text",
                  createdAt: subAgentPromptCreatedAt,
                  threadId: subAgentThreadId,
                  resourceId: subAgentResourceId,
                  content: {
                    format: 2,
                    parts: [
                      {
                        type: "text",
                        text: effectivePrompt
                      }
                    ]
                  }
                };
                fullSubAgentMessages = [userMessage, ...agentResponseMessages];
                const memory = await agent.getMemory({ requestContext });
                if (memory) {
                  try {
                    await memory.createThread({
                      resourceId: subAgentResourceId,
                      threadId: subAgentThreadId
                    });
                    await memory.saveMessages({
                      messages: fullSubAgentMessages
                    });
                  } catch (memoryError) {
                    this.logger.error("Failed to save messages to sub-agent memory", {
                      agent: this.name,
                      error: memoryError
                    });
                  }
                }
                if (generateResult.finishReason === "suspended") {
                  if (savedThreadIdKey !== void 0) {
                    requestContext.set(MASTRA_THREAD_ID_KEY, savedThreadIdKey);
                  }
                  if (savedResourceIdKey !== void 0) {
                    requestContext.set(MASTRA_RESOURCE_ID_KEY, savedResourceIdKey);
                  }
                  return suspend?.(generateResult.suspendPayload, {
                    resumeSchema: generateResult.resumeSchema,
                    runId: generateResult.runId,
                    isAgentSuspend: true
                  });
                }
                result = { text: generateResult.text, subAgentThreadId, subAgentResourceId, subAgentToolResults };
              } else if (methodType === "generate" && modelVersion === "v1") {
                const generateResult = await agent.generateLegacy(messagesForSubAgent, {
                  requestContext,
                  ...resolveObservabilityContext(context ?? {}),
                  context: filteredContextMessages
                });
                result = { text: generateResult.text };
              } else if ((methodType === "stream" || methodType === "streamLegacy") && supportedLanguageModelSpecifications.includes(modelVersion)) {
                const streamResult = resumeData ? await agent.resumeStream(resumeData, {
                  runId: suspendedToolRunId,
                  requestContext,
                  ...resolveObservabilityContext(context ?? {}),
                  ...effectiveInstructions && { instructions: effectiveInstructions },
                  ...effectiveMaxSteps && { maxSteps: effectiveMaxSteps },
                  context: filteredContextMessages,
                  ...resourceId && threadId && !subAgentHasOwnMemoryConfig ? {
                    memory: {
                      resource: subAgentResourceId,
                      thread: subAgentThreadId,
                      options: {
                        lastMessages: false
                      }
                    }
                  } : {}
                }) : await agent.stream(messagesForSubAgent, {
                  requestContext,
                  ...resolveObservabilityContext(context ?? {}),
                  ...effectiveInstructions && { instructions: effectiveInstructions },
                  ...effectiveMaxSteps && { maxSteps: effectiveMaxSteps },
                  context: filteredContextMessages,
                  ...resourceId && threadId && !subAgentHasOwnMemoryConfig ? {
                    memory: {
                      resource: subAgentResourceId,
                      thread: subAgentThreadId,
                      options: {
                        lastMessages: false
                      }
                    }
                  } : {}
                });
                let requireToolApproval;
                let suspendedPayload;
                let resumeSchema;
                for await (const chunk of streamResult.fullStream) {
                  if (context?.writer) {
                    if (chunk.type.startsWith("data-")) {
                      await context.writer.custom(chunk);
                      if (chunk.type === "data-tool-call-approval") {
                        suspendedPayload = {};
                        requireToolApproval = true;
                      }
                      if (chunk.type === "data-tool-call-suspended") {
                        suspendedPayload = chunk.data.suspendPayload;
                        resumeSchema = chunk.data.resumeSchema;
                      }
                    } else {
                      await context.writer.write(chunk);
                      if (chunk.type === "tool-call-approval") {
                        suspendedPayload = {};
                        requireToolApproval = true;
                      }
                      if (chunk.type === "tool-call-suspended") {
                        suspendedPayload = chunk.payload.suspendPayload;
                        resumeSchema = chunk.payload.resumeSchema;
                      }
                    }
                  }
                }
                const subAgentToolResults = (await streamResult.toolResults)?.map((toolResult) => ({
                  toolName: toolResult.payload.toolName,
                  toolCallId: toolResult.payload.toolCallId,
                  result: toolResult.payload.result,
                  args: toolResult.payload.args,
                  isError: toolResult.payload.isError
                }));
                const agentResponseMessages = streamResult.messageList.get.response.db();
                const userMessage = {
                  id: this.#mastra?.generateId() || randomUUID(),
                  role: "user",
                  type: "text",
                  createdAt: subAgentPromptCreatedAt,
                  threadId: subAgentThreadId,
                  resourceId: subAgentResourceId,
                  content: {
                    format: 2,
                    parts: [
                      {
                        type: "text",
                        text: effectivePrompt
                      }
                    ]
                  }
                };
                fullSubAgentMessages = [userMessage, ...agentResponseMessages];
                const memory = await agent.getMemory({ requestContext });
                if (memory) {
                  try {
                    await memory.createThread({
                      resourceId: subAgentResourceId,
                      threadId: subAgentThreadId
                    });
                    await memory.saveMessages({
                      messages: fullSubAgentMessages
                    });
                  } catch (memoryError) {
                    this.logger.error("Failed to save messages to sub-agent memory", {
                      agent: this.name,
                      error: memoryError
                    });
                  }
                }
                if (requireToolApproval || suspendedPayload || resumeSchema) {
                  if (savedThreadIdKey !== void 0) {
                    requestContext.set(MASTRA_THREAD_ID_KEY, savedThreadIdKey);
                  }
                  if (savedResourceIdKey !== void 0) {
                    requestContext.set(MASTRA_RESOURCE_ID_KEY, savedResourceIdKey);
                  }
                  return suspend?.(suspendedPayload, {
                    resumeSchema,
                    requireToolApproval,
                    runId: streamResult.runId,
                    isAgentSuspend: true
                  });
                }
                const processedText = await streamResult.text;
                result = {
                  text: processedText,
                  subAgentThreadId,
                  subAgentResourceId,
                  subAgentToolResults
                };
              } else {
                const streamResult = await agent.streamLegacy(effectivePrompt, {
                  requestContext,
                  ...resolveObservabilityContext(context ?? {})
                });
                let fullText = "";
                for await (const chunk of streamResult.fullStream) {
                  if (context?.writer) {
                    if (chunk.type.startsWith("data-")) {
                      await context.writer.custom(chunk);
                    } else {
                      await context.writer.write(chunk);
                    }
                  }
                  if (chunk.type === "text-delta") {
                    fullText += chunk.textDelta;
                  }
                }
                result = { text: fullText };
              }
              if (delegation?.onDelegationComplete) {
                try {
                  let bailed = false;
                  const delegationCompleteContext = {
                    primitiveId: agent.id,
                    primitiveType: "agent",
                    prompt: effectivePrompt,
                    result,
                    duration: Date.now() - startTime,
                    success: true,
                    iteration: derivedIteration,
                    runId: runId || randomUUID(),
                    toolCallId,
                    parentAgentId: this.id,
                    parentAgentName: this.name,
                    messages: fullSubAgentMessages,
                    bail: () => {
                      bailed = true;
                    }
                  };
                  const completeResult = await delegation.onDelegationComplete(delegationCompleteContext);
                  if (bailed) {
                    requestContext.set("__mastra_delegationBailed", true);
                  }
                  if (completeResult?.feedback) {
                    const feedbackMessage = {
                      id: this.#mastra?.generateId() || randomUUID(),
                      role: "assistant",
                      type: "text",
                      createdAt: /* @__PURE__ */ new Date(),
                      content: {
                        format: 2,
                        parts: [{ type: "text", text: completeResult.feedback }],
                        metadata: {
                          mode: "stream",
                          completionResult: {
                            suppressFeedback: true
                          }
                        }
                      },
                      threadId,
                      resourceId
                    };
                    const supervisorMemory = await this.getMemory({ requestContext });
                    if (supervisorMemory) {
                      try {
                        await supervisorMemory.saveMessages({
                          messages: [feedbackMessage]
                        });
                      } catch (memoryError) {
                        this.logger.error("Failed to save feedback to supervisor memory", {
                          agent: this.name,
                          error: memoryError
                        });
                      }
                    }
                  }
                } catch (hookError) {
                  this.logger.error("onDelegationComplete hook error", { agent: this.name, error: hookError });
                }
              }
              if (savedMastraMemory !== void 0) {
                requestContext.set("MastraMemory", savedMastraMemory);
              }
              if (savedThreadIdKey !== void 0) {
                requestContext.set(MASTRA_THREAD_ID_KEY, savedThreadIdKey);
              }
              if (savedResourceIdKey !== void 0) {
                requestContext.set(MASTRA_RESOURCE_ID_KEY, savedResourceIdKey);
              }
              return result;
            } catch (err) {
              let bailed = false;
              if (delegation?.onDelegationComplete) {
                try {
                  const delegationCompleteContext = {
                    primitiveId: agent.id,
                    primitiveType: "agent",
                    prompt: effectivePrompt,
                    result: { text: "" },
                    duration: Date.now() - startTime,
                    success: false,
                    error: err instanceof Error ? err : new Error(String(err)),
                    iteration: derivedIteration,
                    runId: runId || randomUUID(),
                    toolCallId,
                    parentAgentId: this.id,
                    parentAgentName: this.name,
                    messages: fullSubAgentMessages,
                    bail: () => {
                      bailed = true;
                    }
                  };
                  const completeResult = await delegation.onDelegationComplete(delegationCompleteContext);
                  if (bailed) {
                    requestContext.set("__mastra_delegationBailed", true);
                  }
                  if (completeResult?.feedback) {
                    const feedbackMessage = {
                      id: this.#mastra?.generateId() || randomUUID(),
                      role: "assistant",
                      type: "text",
                      createdAt: /* @__PURE__ */ new Date(),
                      content: {
                        format: 2,
                        parts: [{ type: "text", text: completeResult.feedback }],
                        metadata: {
                          mode: "stream",
                          completionResult: {
                            suppressFeedback: true
                          }
                        }
                      },
                      threadId,
                      resourceId
                    };
                    const supervisorMemory = await this.getMemory({ requestContext });
                    if (supervisorMemory) {
                      try {
                        await supervisorMemory.saveMessages({
                          messages: [feedbackMessage]
                        });
                      } catch (memoryError) {
                        this.logger.error("Failed to save feedback to supervisor memory", {
                          agent: this.name,
                          error: memoryError
                        });
                      }
                    }
                  }
                } catch (hookError) {
                  this.logger.error("onDelegationComplete hook error on failure", {
                    agent: this.name,
                    error: hookError
                  });
                }
              }
              if (savedMastraMemory !== void 0) {
                requestContext.set("MastraMemory", savedMastraMemory);
              }
              if (savedThreadIdKey !== void 0) {
                requestContext.set(MASTRA_THREAD_ID_KEY, savedThreadIdKey);
              }
              if (savedResourceIdKey !== void 0) {
                requestContext.set(MASTRA_RESOURCE_ID_KEY, savedResourceIdKey);
              }
              const mastraError = new MastraError(
                {
                  id: "AGENT_AGENT_TOOL_EXECUTION_FAILED",
                  domain: "AGENT" /* AGENT */,
                  category: "USER" /* USER */,
                  details: {
                    agentName: this.name,
                    subAgentName: agent.name,
                    runId: runId || "",
                    threadId: threadId || "",
                    resourceId: resourceId || ""
                  },
                  text: `[Agent:${this.name}] - Failed agent tool execution for ${agentName}`
                },
                err
              );
              this.logger.trackException(mastraError);
              throw mastraError;
            }
          }
        });
        const options = {
          name: `agent-${agentName}`,
          runId,
          threadId,
          resourceId,
          logger: this.logger,
          mastra: this.#mastra,
          memory: await this.getMemory({ requestContext }),
          agentName: this.name,
          agentId: this.id,
          requestContext,
          model: await this.getModel({ requestContext }),
          ...observabilityContext,
          tracingPolicy: this.#options?.tracingPolicy
        };
        convertedAgentTools[`agent-${agentName}`] = makeCoreTool(
          toolObj,
          options,
          void 0,
          autoResumeSuspendedTools
        );
      }
    }
    return convertedAgentTools;
  }
  /**
   * Retrieves and converts workflow tools to CoreTool format.
   * @internal
   */
  async listWorkflowTools({
    runId,
    threadId,
    resourceId,
    requestContext,
    methodType,
    autoResumeSuspendedTools,
    ...rest
  }) {
    const observabilityContext = resolveObservabilityContext(rest);
    const convertedWorkflowTools = {};
    const workflows = await this.listWorkflows({ requestContext });
    if (Object.keys(workflows).length > 0) {
      for (const [workflowName, workflow] of Object.entries(workflows)) {
        const inputDataJsonSchema = workflow.inputSchema ? standardSchemaToJSONSchema(workflow.inputSchema, { io: "input" }) : { type: "object", additionalProperties: true };
        const inputProperties = {
          inputData: inputDataJsonSchema
        };
        const inputRequired = ["inputData"];
        if (workflow.stateSchema) {
          inputProperties.initialState = standardSchemaToJSONSchema(workflow.stateSchema, { io: "input" });
        }
        const extendedInputSchema = {
          type: "object",
          properties: inputProperties,
          required: inputRequired,
          additionalProperties: true
        };
        const outputResultProperties = {
          runId: { type: "string", description: "Unique identifier for the workflow run" }
        };
        if (workflow.outputSchema) {
          outputResultProperties.result = standardSchemaToJSONSchema(workflow.outputSchema, { io: "output" });
        }
        const outputSchema = {
          anyOf: [
            {
              type: "object",
              properties: outputResultProperties,
              required: ["runId"]
            },
            {
              type: "object",
              properties: {
                runId: { type: "string", description: "Unique identifier for the workflow run" },
                error: { type: "string", description: "Error message if workflow execution failed" }
              },
              required: ["runId", "error"]
            }
          ]
        };
        const toolObj = createTool({
          id: `workflow-${workflowName}`,
          description: workflow.description || `Workflow: ${workflowName}`,
          inputSchema: extendedInputSchema,
          outputSchema,
          mastra: this.#mastra,
          // manually wrap workflow tools with tracing, so that we can pass the
          // current tool span onto the workflow to maintain continuity of the trace
          execute: async (inputData, context) => {
            const savedMastraMemory = requestContext.get("MastraMemory");
            try {
              const { initialState, inputData: workflowInputData, suspendedToolRunId } = inputData;
              const runIdToUse = suspendedToolRunId || randomUUID();
              this.logger.debug("Executing workflow as tool", {
                agent: this.name,
                workflow: workflowName,
                description: workflow.description,
                args: inputData,
                runId: runIdToUse,
                threadId,
                resourceId
              });
              const run = await workflow.createRun({ runId: runIdToUse });
              const { resumeData, suspend } = context?.agent ?? {};
              let result = void 0;
              if (methodType === "generate" || methodType === "generateLegacy") {
                if (resumeData) {
                  result = await run.resume({
                    resumeData,
                    requestContext,
                    ...resolveObservabilityContext(context ?? {})
                  });
                } else {
                  result = await run.start({
                    inputData: workflowInputData,
                    requestContext,
                    ...resolveObservabilityContext(context ?? {}),
                    ...initialState && { initialState }
                  });
                }
              } else if (methodType === "streamLegacy") {
                const streamResult = run.streamLegacy({
                  inputData: workflowInputData,
                  requestContext,
                  ...resolveObservabilityContext(context ?? {})
                });
                if (context?.writer) {
                  await streamResult.stream.pipeTo(context.writer);
                } else {
                  for await (const _chunk of streamResult.stream) {
                  }
                }
                result = await streamResult.getWorkflowState();
              } else if (methodType === "stream") {
                const streamResult = resumeData ? run.resumeStream({
                  resumeData,
                  requestContext,
                  ...resolveObservabilityContext(context ?? {})
                }) : run.stream({
                  inputData: workflowInputData,
                  requestContext,
                  ...resolveObservabilityContext(context ?? {}),
                  ...initialState && { initialState }
                });
                if (context?.writer) {
                  await streamResult.fullStream.pipeTo(context.writer);
                }
                result = await streamResult.result;
              }
              if (savedMastraMemory !== void 0) {
                requestContext.set("MastraMemory", savedMastraMemory);
              }
              if (result?.status === "success") {
                const workflowOutput = result?.result || result;
                return { result: workflowOutput, runId: run.runId };
              } else if (result?.status === "failed") {
                const workflowOutputError = result?.error;
                return {
                  error: workflowOutputError?.message || String(workflowOutputError) || "Workflow execution failed",
                  runId: run.runId
                };
              } else if (result?.status === "suspended") {
                const suspendedStep = result?.suspended?.[0]?.[0];
                const suspendPayload = result?.steps?.[suspendedStep]?.suspendPayload;
                const suspendedStepIds = result?.suspended?.map((stepPath) => stepPath.join("."));
                const firstSuspendedStepPath = [...result?.suspended?.[0] ?? []];
                let wflowStep = workflow;
                while (firstSuspendedStepPath.length > 0) {
                  const key = firstSuspendedStepPath.shift();
                  if (key) {
                    if (!wflowStep.steps[key]) {
                      this.logger.warn("Suspended step not found in workflow", {
                        agent: this.name,
                        step: key,
                        workflow: workflowName
                      });
                      break;
                    }
                    wflowStep = wflowStep.steps[key];
                  }
                }
                const resumeSchema = wflowStep?.resumeSchema;
                if (suspendPayload?.__workflow_meta) {
                  delete suspendPayload.__workflow_meta;
                }
                const normalizedResumeSchema = resumeSchema ? toStandardSchema5(resumeSchema) : void 0;
                return suspend?.(suspendPayload, {
                  resumeLabel: suspendedStepIds,
                  resumeSchema: normalizedResumeSchema ? JSON.stringify(standardSchemaToJSONSchema(normalizedResumeSchema)) : void 0,
                  runId: runIdToUse
                });
              } else {
                return {
                  error: `Workflow should never reach this path, workflow returned no status`,
                  runId: run.runId
                };
              }
            } catch (err) {
              if (savedMastraMemory !== void 0) {
                requestContext.set("MastraMemory", savedMastraMemory);
              }
              const mastraError = new MastraError(
                {
                  id: "AGENT_WORKFLOW_TOOL_EXECUTION_FAILED",
                  domain: "AGENT" /* AGENT */,
                  category: "USER" /* USER */,
                  details: {
                    agentName: this.name,
                    runId: inputData.suspendedToolRunId || runId || "",
                    threadId: threadId || "",
                    resourceId: resourceId || ""
                  },
                  text: `[Agent:${this.name}] - Failed workflow tool execution`
                },
                err
              );
              this.logger.trackException(mastraError);
              throw mastraError;
            }
          }
        });
        const options = {
          name: `workflow-${workflowName}`,
          runId,
          threadId,
          resourceId,
          logger: this.logger,
          mastra: this.#mastra,
          memory: await this.getMemory({ requestContext }),
          agentName: this.name,
          agentId: this.id,
          requestContext,
          model: await this.getModel({ requestContext }),
          ...observabilityContext,
          tracingPolicy: this.#options?.tracingPolicy
        };
        convertedWorkflowTools[`workflow-${workflowName}`] = makeCoreTool(
          toolObj,
          options,
          void 0,
          autoResumeSuspendedTools
        );
      }
    }
    return convertedWorkflowTools;
  }
  /**
   * Assembles all tools from various sources into a unified CoreTool dictionary.
   * @internal
   */
  async convertTools({
    toolsets,
    clientTools,
    threadId,
    resourceId,
    runId,
    requestContext,
    outputWriter,
    methodType,
    memoryConfig,
    autoResumeSuspendedTools,
    delegation,
    ...rest
  }) {
    const observabilityContext = resolveObservabilityContext(rest);
    let mastraProxy = void 0;
    const logger = this.logger;
    if (this.#mastra) {
      mastraProxy = createMastraProxy({ mastra: this.#mastra, logger });
    }
    const assignedTools = await this.listAssignedTools({
      runId,
      resourceId,
      threadId,
      requestContext,
      ...observabilityContext,
      mastraProxy,
      outputWriter,
      autoResumeSuspendedTools
    });
    const memoryTools = await this.listMemoryTools({
      runId,
      resourceId,
      threadId,
      requestContext,
      ...observabilityContext,
      mastraProxy,
      memoryConfig,
      autoResumeSuspendedTools
    });
    const toolsetTools = await this.listToolsets({
      runId,
      resourceId,
      threadId,
      requestContext,
      ...observabilityContext,
      mastraProxy,
      toolsets,
      autoResumeSuspendedTools
    });
    const clientSideTools = await this.listClientTools({
      runId,
      resourceId,
      threadId,
      requestContext,
      ...observabilityContext,
      mastraProxy,
      clientTools,
      autoResumeSuspendedTools
    });
    const agentTools = await this.listAgentTools({
      runId,
      resourceId,
      threadId,
      requestContext,
      methodType,
      ...observabilityContext,
      autoResumeSuspendedTools,
      delegation
    });
    const workflowTools = await this.listWorkflowTools({
      runId,
      resourceId,
      threadId,
      requestContext,
      methodType,
      ...observabilityContext,
      autoResumeSuspendedTools
    });
    const workspaceTools = await this.listWorkspaceTools({
      runId,
      resourceId,
      threadId,
      requestContext,
      ...observabilityContext,
      mastraProxy,
      autoResumeSuspendedTools
    });
    const skillTools = await this.listSkillTools({
      runId,
      resourceId,
      threadId,
      requestContext,
      ...observabilityContext,
      mastraProxy,
      autoResumeSuspendedTools
    });
    const channelTools = await this.listChannelTools({
      runId,
      resourceId,
      threadId,
      requestContext,
      ...observabilityContext,
      mastraProxy,
      autoResumeSuspendedTools
    });
    const browserTools = await this.listBrowserTools({
      runId,
      resourceId,
      threadId,
      requestContext,
      ...observabilityContext,
      autoResumeSuspendedTools
    });
    const allTools = {
      ...assignedTools,
      ...memoryTools,
      ...toolsetTools,
      ...clientSideTools,
      ...agentTools,
      ...workflowTools,
      ...workspaceTools,
      ...skillTools,
      ...channelTools,
      ...browserTools
    };
    return this.formatTools(allTools);
  }
  /**
   * Formats and validates tool names to comply with naming restrictions.
   * @internal
   */
  formatTools(tools) {
    const INVALID_CHAR_REGEX = /[^a-zA-Z0-9_\-]/g;
    const STARTING_CHAR_REGEX = /[a-zA-Z_]/;
    for (const key of Object.keys(tools)) {
      if (tools[key] && (key.length > 63 || key.match(INVALID_CHAR_REGEX) || !key[0].match(STARTING_CHAR_REGEX))) {
        let newKey = key.replace(INVALID_CHAR_REGEX, "_");
        if (!newKey[0].match(STARTING_CHAR_REGEX)) {
          newKey = "_" + newKey;
        }
        newKey = newKey.slice(0, 63);
        if (tools[newKey]) {
          const mastraError = new MastraError({
            id: "AGENT_TOOL_NAME_COLLISION",
            domain: "AGENT" /* AGENT */,
            category: "USER" /* USER */,
            details: {
              agentName: this.name,
              toolName: newKey
            },
            text: `Two or more tools resolve to the same name "${newKey}". Please rename one of the tools to avoid this collision.`
          });
          this.logger.trackException(mastraError);
          throw mastraError;
        }
        tools[newKey] = tools[key];
        delete tools[key];
      }
    }
    return tools;
  }
  /**
   * Adds response messages from a step to the MessageList and schedules persistence.
   * This is used for incremental saving: after each agent step, messages are added to a save queue
   * and a debounced save operation is triggered to avoid redundant writes.
   *
   * @param result - The step result containing response messages.
   * @param messageList - The MessageList instance for the current thread.
   * @param threadId - The thread ID.
   * @param memoryConfig - The memory configuration for saving.
   * @param runId - (Optional) The run ID for logging.
   * @internal
   */
  async saveStepMessages({
    result,
    messageList,
    runId
  }) {
    try {
      const stepResponseMessages = result.response.dbMessages?.length ? result.response.dbMessages : result.response.messages;
      if (stepResponseMessages?.length) {
        messageList.add(stepResponseMessages, "response");
      }
    } catch (e) {
      this.logger.error("Error adding messages on step finish", {
        agent: this.name,
        error: e,
        runId
      });
      throw e;
    }
  }
  async #runScorers({
    messageList,
    runId,
    requestContext,
    structuredOutput,
    overrideScorers,
    threadId,
    resourceId,
    ...observabilityContext
  }) {
    let scorers = {};
    try {
      scorers = overrideScorers ? this.resolveOverrideScorerReferences(overrideScorers) : await this.listScorers({ requestContext });
    } catch (e) {
      this.logger.warn("Failed to get scorers", { agent: this.name, error: e });
      return;
    }
    const scorerInput = {
      inputMessages: messageList.getPersisted.input.db(),
      rememberedMessages: messageList.getPersisted.remembered.db(),
      systemMessages: messageList.getSystemMessages(),
      taggedSystemMessages: messageList.getPersisted.taggedSystemMessages
    };
    const scorerOutput = messageList.getPersisted.response.db();
    if (Object.keys(scorers || {}).length > 0) {
      for (const [_id, scorerObject] of Object.entries(scorers)) {
        runScorer({
          scorerId: scorerObject.scorer.id,
          scorerObject,
          runId,
          input: scorerInput,
          output: scorerOutput,
          requestContext,
          entity: {
            id: this.id,
            name: this.name
          },
          source: "LIVE",
          entityType: "AGENT",
          structuredOutput: !!structuredOutput,
          threadId,
          resourceId,
          ...observabilityContext
        });
      }
    }
  }
  /**
   * Resolves scorer name references to actual scorer instances from Mastra.
   * @internal
   */
  resolveOverrideScorerReferences(overrideScorers) {
    const result = {};
    for (const [id, scorerObject] of Object.entries(overrideScorers)) {
      if (typeof scorerObject.scorer === "string") {
        try {
          if (!this.#mastra) {
            throw new MastraError({
              id: "AGENT_GENEREATE_SCORER_NOT_FOUND",
              domain: "AGENT" /* AGENT */,
              category: "USER" /* USER */,
              text: `Mastra not found when fetching scorer. Make sure to fetch agent from mastra.getAgent()`
            });
          }
          const scorer = this.#mastra.getScorerById(scorerObject.scorer);
          result[id] = { scorer, sampling: scorerObject.sampling };
        } catch (error) {
          this.logger.warn("Failed to get scorer", { agent: this.name, scorer: scorerObject.scorer, error });
        }
      } else {
        result[id] = scorerObject;
      }
    }
    if (Object.keys(result).length === 0 && Object.keys(overrideScorers).length > 0) {
      throw new MastraError({
        id: "AGENT_GENEREATE_SCORER_NOT_FOUND",
        domain: "AGENT" /* AGENT */,
        category: "USER" /* USER */,
        text: `No scorers found in overrideScorers`
      });
    }
    return result;
  }
  /**
   * Resolves and prepares model configurations for the LLM.
   * @internal
   */
  async prepareModels(requestContext, resolvedSelection) {
    const selection = resolvedSelection ?? await this.resolveModelSelection(
      this.model,
      requestContext
    );
    if (!Array.isArray(selection)) {
      const resolvedModel = await this.resolveModelConfig(selection, requestContext);
      this.assertSupportsPreparedModels(resolvedModel);
      let headers;
      if (resolvedModel instanceof ModelRouterLanguageModel) {
        headers = resolvedModel.config?.headers;
      }
      return [
        {
          id: "main",
          model: resolvedModel,
          maxRetries: this.maxRetries ?? 0,
          enabled: true,
          headers
        }
      ];
    }
    const models = await Promise.all(
      selection.map(async (modelConfig) => {
        const model = await this.resolveModelConfig(modelConfig.model, requestContext);
        this.assertSupportsPreparedModels(model);
        const modelId = modelConfig.id || model.modelId;
        if (!modelId) {
          const mastraError = new MastraError({
            id: "AGENT_PREPARE_MODELS_MISSING_MODEL_ID",
            domain: "AGENT" /* AGENT */,
            category: "USER" /* USER */,
            details: {
              agentName: this.name
            },
            text: `[Agent:${this.name}] - Unable to determine model ID. Please provide an explicit ID in the model configuration.`
          });
          this.logger.trackException(mastraError);
          throw mastraError;
        }
        let headers;
        if (model instanceof ModelRouterLanguageModel) {
          headers = model.config?.headers;
        }
        return {
          id: modelId,
          model,
          maxRetries: modelConfig.maxRetries ?? 0,
          enabled: modelConfig.enabled ?? true,
          headers
        };
      })
    );
    return models;
  }
  /**
   * Executes the agent call, handling tools, memory, and streaming.
   * @internal
   */
  async #execute({ methodType, resumeContext, ...options }) {
    const existingSnapshot = resumeContext?.snapshot;
    let snapshotMemoryInfo;
    if (existingSnapshot) {
      for (const key in existingSnapshot?.context) {
        const step = existingSnapshot?.context[key];
        if (step && step.status === "suspended" && step.suspendPayload?.__streamState) {
          snapshotMemoryInfo = step.suspendPayload?.__streamState?.messageList?.memoryInfo;
          break;
        }
      }
    }
    const requestContext = options.requestContext || new RequestContext();
    if (this.#browser && !requestContext.has("browser")) {
      const memoryThread = options.memory?.thread;
      const memoryThreadId = typeof memoryThread === "string" ? memoryThread : memoryThread?.id;
      const browserThreadId = requestContext.get(MASTRA_THREAD_ID_KEY) || memoryThreadId || snapshotMemoryInfo?.threadId;
      const isThreadRunning = browserThreadId ? this.#browser.hasThreadSession(browserThreadId) && this.#browser.isBrowserRunning() : this.#browser.isBrowserRunning();
      const browserCtx = {
        provider: this.#browser.provider,
        sessionId: this.#browser.getSessionId(browserThreadId),
        headless: this.#browser.headless,
        currentUrl: await this.#browser.getCurrentUrl(browserThreadId) ?? void 0,
        isRunning: isThreadRunning
      };
      requestContext.set("browser", browserCtx);
    }
    const resourceIdFromContext = requestContext.get(MASTRA_RESOURCE_ID_KEY);
    const threadIdFromContext = requestContext.get(MASTRA_THREAD_ID_KEY);
    const threadFromArgs = resolveThreadIdFromArgs({
      memory: {
        ...options.memory,
        thread: options.memory?.thread || snapshotMemoryInfo?.threadId
      },
      overrideId: threadIdFromContext
    });
    const resourceId = resourceIdFromContext || options.memory?.resource || snapshotMemoryInfo?.resourceId;
    const memoryConfig = options.memory?.options;
    const llm = await this.getLLM({
      requestContext,
      model: options.model
    });
    const resolvedModel = llm.getModel();
    const isGatewayModel = typeof resolvedModel === "object" && resolvedModel !== null && "gatewayId" in resolvedModel && resolvedModel.gatewayId === "mastra";
    if (resourceId && threadFromArgs && !this.hasOwnMemory() && !isGatewayModel) {
      this.logger.warn("No memory is configured but resourceId and threadId were passed in args", { agent: this.name });
    }
    if ("structuredOutput" in options && options.structuredOutput?.schema && !options.structuredOutput?.model) {
      const structuredOutputModel = llm.getModel();
      const targetProvider = structuredOutputModel.provider;
      const targetModelId = structuredOutputModel.modelId;
      if (targetProvider.includes("openai") || targetModelId?.includes("openai")) {
        options = {
          ...options,
          structuredOutput: {
            ...options.structuredOutput,
            schema: wrapSchemaWithNullTransform(options.structuredOutput.schema)
          }
        };
      }
    }
    const runId = options.runId || this.#mastra?.generateId({
      idType: "run",
      source: "agent",
      entityId: this.id,
      threadId: threadFromArgs?.id,
      resourceId
    }) || randomUUID();
    const instructions = options.instructions || await this.getInstructions({ requestContext });
    const agentSpan = getOrCreateSpan({
      type: "agent_run" /* AGENT_RUN */,
      name: `agent run: '${this.id}'`,
      entityType: EntityType.AGENT,
      entityId: this.id,
      entityName: this.name,
      input: options.messages,
      attributes: {
        conversationId: threadFromArgs?.id,
        instructions: this.#convertInstructionsToString(instructions),
        // @deprecated — use entityVersionId (top-level span context field) instead.
        // Kept for backward compatibility during migration.
        ...this.toRawConfig()?.resolvedVersionId ? { resolvedVersionId: this.toRawConfig().resolvedVersionId } : {}
      },
      metadata: {
        runId,
        resourceId,
        threadId: threadFromArgs?.id,
        ...this.toRawConfig()?.resolvedVersionId ? { entityVersionId: this.toRawConfig().resolvedVersionId } : {}
      },
      tracingPolicy: this.#options?.tracingPolicy,
      tracingOptions: options.tracingOptions,
      tracingContext: options.tracingContext,
      requestContext,
      mastra: this.#mastra
    });
    const memory = await this.getMemory({ requestContext });
    const workspace = await this.getWorkspace({ requestContext });
    const saveQueueManager = new SaveQueueManager({
      logger: this.logger,
      memory
    });
    const capabilities = {
      agentName: this.name,
      logger: this.logger,
      getMemory: this.getMemory.bind(this),
      getModel: this.getModel.bind(this),
      generateMessageId: this.#mastra?.generateId?.bind(this.#mastra) || (() => randomUUID()),
      mastra: this.#mastra,
      _agentNetworkAppend: "_agentNetworkAppend" in this ? Boolean(this._agentNetworkAppend) : void 0,
      saveStepMessages: this.saveStepMessages.bind(this),
      convertTools: this.convertTools.bind(this),
      getMemoryMessages: this.getMemoryMessages.bind(this),
      runInputProcessors: this.__runInputProcessors.bind(this),
      executeOnFinish: this.#executeOnFinish.bind(this),
      inputProcessors: async ({
        requestContext: requestContext2,
        overrides
      }) => this.listResolvedInputProcessors(requestContext2, overrides),
      outputProcessors: async ({
        requestContext: requestContext2,
        overrides
      }) => this.listResolvedOutputProcessors(requestContext2, overrides),
      errorProcessors: async ({
        requestContext: requestContext2,
        overrides
      }) => overrides ?? (this.#errorProcessors ? typeof this.#errorProcessors === "function" ? await this.#errorProcessors({ requestContext: requestContext2 }) : this.#errorProcessors : []),
      llm
    };
    const executionWorkflow = createPrepareStreamWorkflow({
      capabilities,
      options: { ...options, methodType },
      threadFromArgs,
      resourceId,
      runId,
      requestContext,
      agentSpan,
      methodType,
      instructions,
      memoryConfig,
      memory,
      saveQueueManager,
      returnScorerData: options.returnScorerData,
      requireToolApproval: options.requireToolApproval,
      toolCallConcurrency: options.toolCallConcurrency,
      resumeContext,
      agentId: this.id,
      agentName: this.name,
      toolCallId: options.toolCallId,
      workspace
    });
    const run = await executionWorkflow.createRun();
    const observabilityContext = createObservabilityContext({ currentSpan: agentSpan });
    const result = await run.start({ ...observabilityContext });
    return result;
  }
  /**
   * Handles post-execution tasks including memory persistence and title generation.
   * @internal
   */
  async #executeOnFinish({
    result,
    readOnlyMemory,
    thread: threadAfter,
    threadId,
    resourceId,
    memoryConfig,
    outputText,
    requestContext,
    agentSpan,
    runId,
    messageList,
    threadExists,
    structuredOutput = false,
    overrideScorers
  }) {
    const observabilityContext = createObservabilityContext({ currentSpan: agentSpan });
    const resToLog = {
      text: result.text,
      object: result.object,
      toolResults: result.toolResults,
      toolCalls: result.toolCalls,
      usage: result.usage,
      steps: result.steps.map((s) => {
        return {
          stepType: s.stepType,
          text: s.text,
          toolResults: s.toolResults,
          toolCalls: s.toolCalls,
          usage: s.usage
        };
      })
    };
    this.logger.debug("Post processing LLM response", {
      agent: this.name,
      runId,
      result: resToLog,
      threadId,
      resourceId
    });
    const messageListResponses = messageList.get.response.aiV4.core();
    const usedWorkingMemory = messageListResponses.some(
      (m) => m.role === "tool" && m.content.some((c) => c.toolName === "updateWorkingMemory")
    );
    const memory = await this.getMemory({ requestContext });
    const thread = usedWorkingMemory ? threadId ? await memory?.getThreadById({ threadId }) : void 0 : threadAfter;
    let responseMessages = result.response.dbMessages?.length ? result.response.dbMessages : result.response.messages;
    if ((!responseMessages || responseMessages.length === 0) && result.object) {
      responseMessages = [
        {
          id: result.response.id,
          role: "assistant",
          content: [
            {
              type: "text",
              text: outputText
              // outputText contains the stringified object
            }
          ]
        }
      ];
    }
    if (responseMessages?.length) {
      messageList.add(responseMessages, "response");
    }
    if (memory && resourceId && thread && !readOnlyMemory) {
      try {
        if (!threadExists) {
          await memory.createThread({
            threadId: thread.id,
            metadata: thread.metadata,
            title: thread.title,
            memoryConfig,
            resourceId: thread.resourceId
          });
        }
        const config = memory.getMergedThreadConfig(memoryConfig);
        const {
          shouldGenerate,
          model: titleModel,
          instructions: titleInstructions,
          minMessages
        } = this.resolveTitleGenerationConfig(
          config?.generateTitle
        );
        const uiMessages = messageList.get.all.ui();
        const messages = messageList.get.all.core();
        const requiredMessages = minMessages ?? 1;
        if (shouldGenerate && !thread.title && messages.length >= requiredMessages) {
          const userMessage = this.getMostRecentUserMessage(uiMessages);
          if (userMessage) {
            void this.genTitle(userMessage, requestContext, observabilityContext, titleModel, titleInstructions).then(
              async (title) => {
                if (title) {
                  await memory.createThread({
                    threadId: thread.id,
                    resourceId,
                    memoryConfig,
                    title,
                    metadata: thread.metadata
                  });
                }
              },
              (error) => {
                this.logger.error("Error persisting generated title:", error);
              }
            );
          }
        }
      } catch (e) {
        if (e instanceof MastraError) {
          throw e;
        }
        const mastraError = new MastraError(
          {
            id: "AGENT_MEMORY_PERSIST_RESPONSE_MESSAGES_FAILED",
            domain: "AGENT" /* AGENT */,
            category: "SYSTEM" /* SYSTEM */,
            details: {
              agentName: this.name,
              runId: runId || "",
              threadId: threadId || "",
              result: JSON.stringify(resToLog)
            }
          },
          e
        );
        this.logger.trackException(mastraError);
        throw mastraError;
      }
    }
    await this.#runScorers({
      messageList,
      runId,
      requestContext,
      structuredOutput,
      overrideScorers,
      threadId,
      resourceId,
      ...observabilityContext
    });
    agentSpan?.end({
      output: {
        text: result.text,
        object: result.object,
        files: result.files,
        ...result.tripwire ? { tripwire: result.tripwire } : {}
      },
      ...result.tripwire ? {
        attributes: {
          tripwireAbort: {
            reason: result.tripwire.reason,
            processorId: result.tripwire.processorId,
            retry: result.tripwire.retry,
            metadata: result.tripwire.metadata
          }
        }
      } : {}
    });
  }
  async network(messages, options) {
    const requestContextToUse = options?.requestContext || new RequestContext();
    const defaultNetworkOptions = await this.getDefaultNetworkOptions({ requestContext: requestContextToUse });
    const mergedOptions = {
      ...defaultNetworkOptions,
      ...options,
      // Deep merge nested objects
      routing: { ...defaultNetworkOptions?.routing, ...options?.routing },
      completion: { ...defaultNetworkOptions?.completion, ...options?.completion }
    };
    const runId = mergedOptions?.runId || this.#mastra?.generateId() || randomUUID();
    const resourceIdFromContext = requestContextToUse.get(MASTRA_RESOURCE_ID_KEY);
    const threadIdFromContext = requestContextToUse.get(MASTRA_THREAD_ID_KEY);
    const threadId = threadIdFromContext || (typeof mergedOptions?.memory?.thread === "string" ? mergedOptions?.memory?.thread : mergedOptions?.memory?.thread?.id);
    const resourceId = resourceIdFromContext || mergedOptions?.memory?.resource;
    return await networkLoop({
      networkName: this.name,
      requestContext: requestContextToUse,
      runId,
      routingAgent: this,
      routingAgentOptions: {
        modelSettings: mergedOptions?.modelSettings,
        memory: mergedOptions?.memory
      },
      generateId: (context) => this.#mastra?.generateId(context) || randomUUID(),
      maxIterations: mergedOptions?.maxSteps || 1,
      messages,
      threadId,
      resourceId,
      validation: mergedOptions?.completion,
      routing: mergedOptions?.routing,
      onIterationComplete: mergedOptions?.onIterationComplete,
      autoResumeSuspendedTools: mergedOptions?.autoResumeSuspendedTools,
      mastra: this.#mastra,
      structuredOutput: mergedOptions?.structuredOutput,
      onStepFinish: mergedOptions?.onStepFinish,
      onError: mergedOptions?.onError,
      onAbort: mergedOptions?.onAbort,
      abortSignal: mergedOptions?.abortSignal
    });
  }
  /**
   * Resumes a suspended network loop where multiple agents can collaborate to handle messages.
   * The routing agent delegates tasks to appropriate sub-agents based on the conversation.
   *
   * @experimental
   *
   * @example
   * ```typescript
   * const result = await agent.resumeNetwork({ approved: true }, {
   *   runId: 'previous-run-id',
   *   memory: {
   *     thread: 'user-123',
   *     resource: 'my-app'
   *   },
   *   maxSteps: 10
   * });
   *
   * for await (const chunk of result.stream) {
   *   console.log(chunk);
   * }
   * ```
   */
  async resumeNetwork(resumeData, options) {
    const runId = options.runId;
    const requestContextToUse = options?.requestContext || new RequestContext();
    const defaultNetworkOptions = await this.getDefaultNetworkOptions({ requestContext: requestContextToUse });
    const mergedOptions = {
      ...defaultNetworkOptions,
      ...options,
      // Deep merge nested objects
      routing: { ...defaultNetworkOptions?.routing, ...options?.routing },
      completion: { ...defaultNetworkOptions?.completion, ...options?.completion }
    };
    const resourceIdFromContext = requestContextToUse.get(MASTRA_RESOURCE_ID_KEY);
    const threadIdFromContext = requestContextToUse.get(MASTRA_THREAD_ID_KEY);
    const threadId = threadIdFromContext || (typeof mergedOptions?.memory?.thread === "string" ? mergedOptions?.memory?.thread : mergedOptions?.memory?.thread?.id);
    const resourceId = resourceIdFromContext || mergedOptions?.memory?.resource;
    return await networkLoop({
      networkName: this.name,
      requestContext: requestContextToUse,
      runId,
      routingAgent: this,
      routingAgentOptions: {
        modelSettings: mergedOptions?.modelSettings,
        memory: mergedOptions?.memory
      },
      generateId: (context) => this.#mastra?.generateId(context) || randomUUID(),
      maxIterations: mergedOptions?.maxSteps || 1,
      messages: [],
      threadId,
      resourceId,
      resumeData,
      validation: mergedOptions?.completion,
      routing: mergedOptions?.routing,
      onIterationComplete: mergedOptions?.onIterationComplete,
      autoResumeSuspendedTools: mergedOptions?.autoResumeSuspendedTools,
      mastra: this.#mastra,
      onStepFinish: mergedOptions?.onStepFinish,
      onError: mergedOptions?.onError,
      onAbort: mergedOptions?.onAbort,
      abortSignal: mergedOptions?.abortSignal
    });
  }
  /**
   * Approves a pending network tool call and resumes execution.
   * Used when `tool.requireApproval` is enabled to allow the agent to proceed with a tool call.
   *
   * @example
   * ```typescript
   * const stream = await agent.approveNetworkToolCall({
   *   runId: 'pending-run-id'
   * });
   *
   * for await (const chunk of stream) {
   *   console.log(chunk);
   * }
   * ```
   */
  async approveNetworkToolCall(options) {
    return this.resumeNetwork({ approved: true }, options);
  }
  /**
   * Declines a pending network tool call and resumes execution.
   * Used when `tool.requireApproval` is enabled to allow the agent to proceed with a tool call.
   *
   * @example
   * ```typescript
   * const stream = await agent.declineNetworkToolCall({
   *   runId: 'pending-run-id'
   * });
   *
   * for await (const chunk of stream) {
   *   console.log(chunk);
   * }
   * ```
   */
  async declineNetworkToolCall(options) {
    return this.resumeNetwork({ approved: false }, options);
  }
  async generate(messages, options) {
    await this.#validateRequestContext(options?.requestContext);
    const defaultOptions = await this.getDefaultOptions({
      requestContext: options?.requestContext
    });
    const mergedOptions = deepMerge(
      defaultOptions,
      options ?? {}
    );
    const llm = await this.getLLM({
      requestContext: mergedOptions.requestContext,
      model: mergedOptions.model
    });
    const modelInfo = llm.getModel();
    if (!isSupportedLanguageModel(modelInfo)) {
      const modelId = modelInfo.modelId || "unknown";
      const provider = modelInfo.provider || "unknown";
      const specVersion = modelInfo.specificationVersion;
      throw new MastraError({
        id: "AGENT_GENERATE_V1_MODEL_NOT_SUPPORTED",
        domain: "AGENT" /* AGENT */,
        category: "USER" /* USER */,
        text: specVersion === "v1" ? `Agent "${this.name}" is using AI SDK v4 model (${provider}:${modelId}) which is not compatible with generate(). Please use AI SDK v5+ models or call the generateLegacy() method instead. See https://mastra.ai/en/docs/streaming/overview for more information.` : `Agent "${this.name}" has a model (${provider}:${modelId}) with unrecognized specificationVersion "${specVersion}". Supported versions: v1 (legacy), v2 (AI SDK v5), v3 (AI SDK v6). Please ensure your AI SDK provider is compatible with this version of Mastra.`,
        details: {
          agentName: this.name,
          modelId,
          provider,
          specificationVersion: specVersion
        }
      });
    }
    const executeOptions = {
      ...mergedOptions,
      structuredOutput: mergedOptions.structuredOutput ? {
        ...mergedOptions.structuredOutput,
        // Convert PublicSchema to StandardSchemaWithJSON at API boundary
        // This follows the same pattern as Tool/Workflow constructors
        schema: toStandardSchema5(mergedOptions.structuredOutput.schema)
      } : void 0,
      messages,
      methodType: "generate",
      // Use agent's maxProcessorRetries as default, allow options to override
      maxProcessorRetries: mergedOptions.maxProcessorRetries ?? this.#maxProcessorRetries
    };
    const result = await this.#execute(executeOptions);
    if (result.status !== "success") {
      if (result.status === "failed") {
        throw new MastraError(
          {
            id: "AGENT_GENERATE_FAILED",
            domain: "AGENT" /* AGENT */,
            category: "USER" /* USER */
          },
          // pass original error to preserve stack trace
          result.error
        );
      }
      throw new MastraError({
        id: "AGENT_GENERATE_UNKNOWN_ERROR",
        domain: "AGENT" /* AGENT */,
        category: "USER" /* USER */,
        text: "An unknown error occurred while streaming"
      });
    }
    const fullOutput = await result.result.getFullOutput();
    const error = fullOutput.error;
    if (error) {
      throw error;
    }
    return fullOutput;
  }
  async stream(messages, streamOptions) {
    await this.#validateRequestContext(streamOptions?.requestContext);
    const defaultOptions = await this.getDefaultOptions({
      requestContext: streamOptions?.requestContext
    });
    const mergedOptions = deepMerge(
      defaultOptions,
      streamOptions ?? {}
    );
    const llm = await this.getLLM({
      requestContext: mergedOptions.requestContext,
      model: mergedOptions.model
    });
    const modelInfo = llm.getModel();
    if (!isSupportedLanguageModel(modelInfo)) {
      const modelId = modelInfo.modelId || "unknown";
      const provider = modelInfo.provider || "unknown";
      const specVersion = modelInfo.specificationVersion;
      throw new MastraError({
        id: "AGENT_STREAM_V1_MODEL_NOT_SUPPORTED",
        domain: "AGENT" /* AGENT */,
        category: "USER" /* USER */,
        text: specVersion === "v1" ? `Agent "${this.name}" is using AI SDK v4 model (${provider}:${modelId}) which is not compatible with stream(). Please use AI SDK v5+ models or call the streamLegacy() method instead. See https://mastra.ai/en/docs/streaming/overview for more information.` : `Agent "${this.name}" has a model (${provider}:${modelId}) with unrecognized specificationVersion "${specVersion}". Supported versions: v1 (legacy), v2 (AI SDK v5), v3 (AI SDK v6). Please ensure your AI SDK provider is compatible with this version of Mastra.`,
        details: {
          agentName: this.name,
          modelId,
          provider,
          specificationVersion: specVersion
        }
      });
    }
    const executeOptions = {
      ...mergedOptions,
      structuredOutput: mergedOptions.structuredOutput ? {
        ...mergedOptions.structuredOutput,
        // Convert PublicSchema to StandardSchemaWithJSON at API boundary
        // This follows the same pattern as Tool/Workflow constructors
        schema: toStandardSchema5(mergedOptions.structuredOutput.schema)
      } : void 0,
      messages,
      methodType: "stream",
      // Use agent's maxProcessorRetries as default, allow options to override
      maxProcessorRetries: mergedOptions.maxProcessorRetries ?? this.#maxProcessorRetries
    };
    const result = await this.#execute(executeOptions);
    if (result.status !== "success") {
      if (result.status === "failed") {
        throw new MastraError(
          {
            id: "AGENT_STREAM_FAILED",
            domain: "AGENT" /* AGENT */,
            category: "USER" /* USER */
          },
          // pass original error to preserve stack trace
          result.error
        );
      }
      throw new MastraError({
        id: "AGENT_STREAM_UNKNOWN_ERROR",
        domain: "AGENT" /* AGENT */,
        category: "USER" /* USER */,
        text: "An unknown error occurred while streaming"
      });
    }
    return result.result;
  }
  async resumeStream(resumeData, streamOptions) {
    const defaultOptions = await this.getDefaultOptions({
      requestContext: streamOptions?.requestContext
    });
    let mergedStreamOptions = deepMerge(
      defaultOptions,
      streamOptions ?? {}
    );
    const llm = await this.getLLM({
      requestContext: mergedStreamOptions.requestContext,
      model: mergedStreamOptions.model
    });
    if (!isSupportedLanguageModel(llm.getModel())) {
      const modelInfo = llm.getModel();
      const specVersion = modelInfo.specificationVersion;
      throw new MastraError({
        id: "AGENT_STREAM_V1_MODEL_NOT_SUPPORTED",
        domain: "AGENT" /* AGENT */,
        category: "USER" /* USER */,
        text: specVersion === "v1" ? "V1 models are not supported for resumeStream. Please use streamLegacy instead." : `Model has unrecognized specificationVersion "${specVersion}". Supported versions: v1 (legacy), v2 (AI SDK v5), v3 (AI SDK v6). Please ensure your AI SDK provider is compatible with this version of Mastra.`,
        details: {
          modelId: modelInfo.modelId,
          provider: modelInfo.provider,
          specificationVersion: specVersion
        }
      });
    }
    const workflowsStore = await this.#mastra?.getStorage()?.getStore("workflows");
    const existingSnapshot = await workflowsStore?.loadWorkflowSnapshot({
      workflowName: "agentic-loop",
      runId: streamOptions?.runId ?? ""
    });
    const result = await this.#execute({
      ...mergedStreamOptions,
      structuredOutput: mergedStreamOptions.structuredOutput ? {
        ...mergedStreamOptions.structuredOutput,
        schema: toStandardSchema5(mergedStreamOptions.structuredOutput.schema)
      } : void 0,
      messages: [],
      resumeContext: {
        resumeData,
        snapshot: existingSnapshot
      },
      methodType: "stream",
      // Use agent's maxProcessorRetries as default, allow options to override
      maxProcessorRetries: mergedStreamOptions.maxProcessorRetries ?? this.#maxProcessorRetries
    });
    if (result.status !== "success") {
      if (result.status === "failed") {
        throw new MastraError(
          {
            id: "AGENT_STREAM_FAILED",
            domain: "AGENT" /* AGENT */,
            category: "USER" /* USER */
          },
          // pass original error to preserve stack trace
          result.error
        );
      }
      throw new MastraError({
        id: "AGENT_STREAM_UNKNOWN_ERROR",
        domain: "AGENT" /* AGENT */,
        category: "USER" /* USER */,
        text: "An unknown error occurred while streaming"
      });
    }
    return result.result;
  }
  async resumeGenerate(resumeData, options) {
    const defaultOptions = await this.getDefaultOptions({
      requestContext: options?.requestContext
    });
    const mergedOptions = deepMerge(
      defaultOptions,
      options ?? {}
    );
    const llm = await this.getLLM({
      requestContext: mergedOptions.requestContext,
      model: mergedOptions.model
    });
    const modelInfo = llm.getModel();
    if (!isSupportedLanguageModel(modelInfo)) {
      const modelId = modelInfo.modelId || "unknown";
      const provider = modelInfo.provider || "unknown";
      const specVersion = modelInfo.specificationVersion;
      throw new MastraError({
        id: "AGENT_GENERATE_V1_MODEL_NOT_SUPPORTED",
        domain: "AGENT" /* AGENT */,
        category: "USER" /* USER */,
        text: specVersion === "v1" ? `Agent "${this.name}" is using AI SDK v4 model (${provider}:${modelId}) which is not compatible with generate(). Please use AI SDK v5+ models or call the generateLegacy() method instead. See https://mastra.ai/en/docs/streaming/overview for more information.` : `Agent "${this.name}" has a model (${provider}:${modelId}) with unrecognized specificationVersion "${specVersion}". Supported versions: v1 (legacy), v2 (AI SDK v5), v3 (AI SDK v6). Please ensure your AI SDK provider is compatible with this version of Mastra.`,
        details: {
          agentName: this.name,
          modelId,
          provider,
          specificationVersion: specVersion
        }
      });
    }
    const workflowsStore = await this.#mastra?.getStorage()?.getStore("workflows");
    const existingSnapshot = await workflowsStore?.loadWorkflowSnapshot({
      workflowName: "agentic-loop",
      runId: options?.runId ?? ""
    });
    const result = await this.#execute({
      ...mergedOptions,
      structuredOutput: mergedOptions.structuredOutput ? {
        ...mergedOptions.structuredOutput,
        schema: toStandardSchema5(mergedOptions.structuredOutput.schema)
      } : void 0,
      messages: [],
      resumeContext: {
        resumeData,
        snapshot: existingSnapshot
      },
      methodType: "generate",
      // Use agent's maxProcessorRetries as default, allow options to override
      maxProcessorRetries: mergedOptions.maxProcessorRetries ?? this.#maxProcessorRetries
    });
    if (result.status !== "success") {
      if (result.status === "failed") {
        throw new MastraError(
          {
            id: "AGENT_GENERATE_FAILED",
            domain: "AGENT" /* AGENT */,
            category: "USER" /* USER */
          },
          // pass original error to preserve stack trace
          result.error
        );
      }
      throw new MastraError({
        id: "AGENT_GENERATE_UNKNOWN_ERROR",
        domain: "AGENT" /* AGENT */,
        category: "USER" /* USER */,
        text: "An unknown error occurred while generating"
      });
    }
    const fullOutput = await result.result.getFullOutput();
    const error = fullOutput.error;
    if (error) {
      throw error;
    }
    return fullOutput;
  }
  /**
   * Approves a pending tool call and resumes execution.
   * Used when `requireToolApproval` is enabled to allow the agent to proceed with a tool call.
   *
   * @example
   * ```typescript
   * const stream = await agent.approveToolCall({
   *   runId: 'pending-run-id'
   * });
   *
   * for await (const chunk of stream) {
   *   console.log(chunk);
   * }
   * ```
   */
  async approveToolCall(options) {
    return this.resumeStream({ approved: true }, options);
  }
  /**
   * Declines a pending tool call and resumes execution.
   * Used when `requireToolApproval` is enabled to prevent the agent from executing a tool call.
   *
   * @example
   * ```typescript
   * const stream = await agent.declineToolCall({
   *   runId: 'pending-run-id'
   * });
   *
   * for await (const chunk of stream) {
   *   console.log(chunk);
   * }
   * ```
   */
  async declineToolCall(options) {
    return this.resumeStream({ approved: false }, options);
  }
  /**
   * Approves a pending tool call and returns the complete result (non-streaming).
   * Used when `requireToolApproval` is enabled with generate() to allow the agent to proceed.
   *
   * @example
   * ```typescript
   * const output = await agent.generate('Find user', { requireToolApproval: true });
   * if (output.finishReason === 'suspended') {
   *   const result = await agent.approveToolCallGenerate({
   *     runId: output.runId,
   *     toolCallId: output.suspendPayload.toolCallId
   *   });
   *   console.log(result.text);
   * }
   * ```
   */
  async approveToolCallGenerate(options) {
    return this.resumeGenerate({ approved: true }, options);
  }
  /**
   * Declines a pending tool call and returns the complete result (non-streaming).
   * Used when `requireToolApproval` is enabled with generate() to prevent tool execution.
   *
   * @example
   * ```typescript
   * const output = await agent.generate('Find user', { requireToolApproval: true });
   * if (output.finishReason === 'suspended') {
   *   const result = await agent.declineToolCallGenerate({
   *     runId: output.runId,
   *     toolCallId: output.suspendPayload.toolCallId
   *   });
   *   console.log(result.text);
   * }
   * ```
   */
  async declineToolCallGenerate(options) {
    return this.resumeGenerate({ approved: false }, options);
  }
  async generateLegacy(messages, generateOptions = {}) {
    return this.getLegacyHandler().generateLegacy(messages, generateOptions);
  }
  async streamLegacy(messages, streamOptions = {}) {
    return this.getLegacyHandler().streamLegacy(messages, streamOptions);
  }
  /**
   * Resolves the configuration for title generation.
   * @internal
   */
  resolveTitleGenerationConfig(generateTitleConfig) {
    if (typeof generateTitleConfig === "boolean") {
      return { shouldGenerate: generateTitleConfig };
    }
    if (typeof generateTitleConfig === "object" && generateTitleConfig !== null) {
      return {
        shouldGenerate: true,
        model: generateTitleConfig.model,
        instructions: generateTitleConfig.instructions,
        minMessages: generateTitleConfig.minMessages
      };
    }
    return { shouldGenerate: false };
  }
  /**
   * Resolves title generation instructions, handling both static strings and dynamic functions
   * @internal
   */
  async resolveTitleInstructions(requestContext, instructions) {
    const DEFAULT_TITLE_INSTRUCTIONS = `
      - you will generate a short title based on the first message a user begins a conversation with
      - ensure it is not more than 80 characters long
      - the title should be a summary of the user's message
      - do not use quotes or colons
      - the entire text you return will be used as the title`;
    if (!instructions) {
      return DEFAULT_TITLE_INSTRUCTIONS;
    }
    if (typeof instructions === "string") {
      return instructions;
    } else {
      const result = instructions({ requestContext, mastra: this.#mastra });
      return resolveMaybePromise(result, (resolvedInstructions) => {
        return resolvedInstructions || DEFAULT_TITLE_INSTRUCTIONS;
      });
    }
  }
};

// src/memory/working-memory-utils.ts
var WORKING_MEMORY_START_TAG = "<working_memory>";
var WORKING_MEMORY_END_TAG = "</working_memory>";
function removeWorkingMemoryTags(text) {
  let result = "";
  let pos = 0;
  while (pos < text.length) {
    const start = text.indexOf(WORKING_MEMORY_START_TAG, pos);
    if (start === -1) {
      result += text.substring(pos);
      break;
    }
    result += text.substring(pos, start);
    const end = text.indexOf(WORKING_MEMORY_END_TAG, start + WORKING_MEMORY_START_TAG.length);
    if (end === -1) {
      result += text.substring(start);
      break;
    }
    pos = end + WORKING_MEMORY_END_TAG.length;
  }
  return result;
}
function extractWorkingMemoryContent(text) {
  const start = text.indexOf(WORKING_MEMORY_START_TAG);
  if (start === -1) return null;
  const contentStart = start + WORKING_MEMORY_START_TAG.length;
  const end = text.indexOf(WORKING_MEMORY_END_TAG, contentStart);
  if (end === -1) return null;
  return text.substring(contentStart, end);
}

// src/processors/memory/message-history.ts
var MessageHistory = class {
  id = "message-history";
  name = "MessageHistory";
  storage;
  lastMessages;
  constructor(options) {
    this.storage = options.storage;
    this.lastMessages = options.lastMessages;
  }
  /**
   * Get threadId and resourceId from either RequestContext or MessageList's memoryInfo
   */
  getMemoryContext(requestContext, messageList) {
    const memoryContext = parseMemoryRequestContext(requestContext);
    if (memoryContext?.thread?.id) {
      return {
        threadId: memoryContext.thread.id,
        resourceId: memoryContext.resourceId
      };
    }
    const serialized = messageList.serialize();
    if (serialized.memoryInfo?.threadId) {
      return {
        threadId: serialized.memoryInfo.threadId,
        resourceId: serialized.memoryInfo.resourceId
      };
    }
    return null;
  }
  createMemorySpan(operationType, observabilityContext, input, attributes) {
    const currentSpan = observabilityContext?.tracingContext?.currentSpan;
    if (!currentSpan) return void 0;
    return currentSpan.createChildSpan({
      type: "memory_operation" /* MEMORY_OPERATION */,
      name: `memory: ${operationType}`,
      entityType: EntityType.MEMORY,
      entityName: "Memory",
      input,
      attributes: { operationType, ...attributes }
    });
  }
  async processInput(args) {
    const { messageList, requestContext, ...observabilityContext } = args;
    const context = this.getMemoryContext(requestContext, messageList);
    if (!context) {
      return messageList;
    }
    const { threadId, resourceId } = context;
    const span = this.createMemorySpan(
      "recall",
      observabilityContext,
      { threadId, resourceId },
      {
        lastMessages: this.lastMessages
      }
    );
    try {
      const result = await this.storage.listMessages({
        threadId,
        resourceId,
        page: 0,
        perPage: this.lastMessages,
        orderBy: { field: "createdAt", direction: "DESC" }
      });
      const filteredMessages = result.messages.filter((msg) => {
        return msg.role !== "system";
      });
      const existingMessages = messageList.get.all.db();
      const messageIds = new Set(existingMessages.map((m) => m.id).filter(Boolean));
      const uniqueHistoricalMessages = filteredMessages.filter((m) => !m.id || !messageIds.has(m.id));
      const chronologicalMessages = uniqueHistoricalMessages.reverse();
      if (chronologicalMessages.length === 0) {
        span?.end({
          output: { success: true },
          attributes: { messageCount: 0 }
        });
        return messageList;
      }
      for (const msg of chronologicalMessages) {
        if (msg.role === "system") {
          continue;
        } else {
          messageList.add(msg, "memory");
        }
      }
      span?.end({
        output: { success: true },
        attributes: { messageCount: chronologicalMessages.length }
      });
      return messageList;
    } catch (error) {
      span?.error({ error, endSpan: true });
      throw error;
    }
  }
  /**
   * Filters messages before persisting to storage:
   * 1. Removes streaming tool calls (state === 'partial-call') - these are intermediate states
   * 2. Removes updateWorkingMemory tool invocations (hide args from message history)
   * 3. Strips <working_memory> tags from text content
   *
   * Note: We preserve 'call' state tool invocations because:
   * - For server-side tools, 'call' should have been converted to 'result' by the time OUTPUT is processed
   * - For client-side tools (no execute function), 'call' is the final state from the server's perspective
   */
  filterMessagesForPersistence(messages) {
    return messages.map((m) => {
      const newMessage = { ...m };
      if (m.content && typeof m.content === "object" && !Array.isArray(m.content)) {
        newMessage.content = { ...m.content };
      }
      if (typeof newMessage.content?.content === "string" && newMessage.content.content.length > 0) {
        newMessage.content.content = removeWorkingMemoryTags(newMessage.content.content).trim();
      }
      if (Array.isArray(newMessage.content?.parts)) {
        newMessage.content.parts = newMessage.content.parts.map((p) => {
          if (p.type === `tool-invocation` && p.toolInvocation.state === `partial-call`) {
            return null;
          }
          if (p.type === `tool-invocation` && p.toolInvocation.toolName === `updateWorkingMemory`) {
            return null;
          }
          if (p.type === `text`) {
            const text = typeof p.text === "string" ? p.text : "";
            return {
              ...p,
              text: removeWorkingMemoryTags(text).trim()
            };
          }
          return p;
        }).filter((p) => Boolean(p));
        if (newMessage.content.parts.length === 0) {
          return null;
        }
      }
      return newMessage;
    }).filter((m) => Boolean(m));
  }
  async processOutputResult(args) {
    const { messageList, requestContext, ...observabilityContext } = args;
    const context = this.getMemoryContext(requestContext, messageList);
    const memoryContext = parseMemoryRequestContext(requestContext);
    const readOnly = memoryContext?.memoryConfig?.readOnly;
    if (!context || readOnly) {
      return messageList;
    }
    const { threadId, resourceId } = context;
    const newInput = messageList.get.input.db();
    const newOutput = messageList.get.response.db();
    const messagesToSave = [...newInput, ...newOutput];
    if (messagesToSave.length === 0) {
      return messageList;
    }
    const span = this.createMemorySpan("save", observabilityContext, void 0, {
      messageCount: messagesToSave.length
    });
    try {
      await this.persistMessages({ messages: messagesToSave, threadId, resourceId });
      await new Promise((resolve2) => setTimeout(resolve2, 10));
      span?.end({
        output: { success: true }
      });
      return messageList;
    } catch (error) {
      span?.error({ error, endSpan: true });
      throw error;
    }
  }
  /**
   * Persist messages to storage, filtering out partial tool calls and working memory tags.
   * Also ensures the thread exists (creates if needed).
   *
   * This method can be called externally by other processors (e.g., ObservationalMemory)
   * that need to save messages incrementally.
   */
  async persistMessages(args) {
    const { messages, threadId, resourceId } = args;
    if (messages.length === 0) {
      return;
    }
    const filtered = this.filterMessagesForPersistence(messages);
    if (filtered.length === 0) {
      return;
    }
    const thread = await this.storage.getThreadById({ threadId });
    if (thread) {
      await this.storage.updateThread({
        id: threadId,
        title: thread.title || "",
        metadata: thread.metadata || {}
      });
    } else {
      await this.storage.saveThread({
        thread: {
          id: threadId,
          resourceId: resourceId || threadId,
          title: "",
          metadata: {},
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        }
      });
    }
    await this.storage.saveMessages({ messages: filtered });
  }
};

// src/processors/memory/working-memory.ts
var WorkingMemory = class {
  constructor(options) {
    this.options = options;
    this.logger = options.logger;
  }
  options;
  id = "working-memory";
  name = "WorkingMemory";
  defaultWorkingMemoryTemplate = `
# User Information
- **First Name**: 
- **Last Name**: 
- **Location**: 
- **Occupation**: 
- **Interests**: 
- **Goals**: 
- **Events**: 
- **Facts**: 
- **Projects**: 
`;
  logger;
  async processInput(args) {
    const { messageList, requestContext } = args;
    const memoryContext = parseMemoryRequestContext(requestContext);
    const threadId = memoryContext?.thread?.id;
    const resourceId = memoryContext?.resourceId;
    if (!threadId && !resourceId) {
      return messageList;
    }
    const scope = this.options.scope || "resource";
    let workingMemoryData = null;
    if (scope === "thread" && threadId) {
      const thread = await this.options.storage.getThreadById({ threadId });
      workingMemoryData = thread?.metadata?.workingMemory || null;
    } else if (scope === "resource" && resourceId) {
      const resource = await this.options.storage.getResourceById({ resourceId });
      workingMemoryData = resource?.workingMemory || null;
    }
    let template;
    if (this.options.templateProvider) {
      const dynamicTemplate = await this.options.templateProvider.getWorkingMemoryTemplate({
        memoryConfig: memoryContext.memoryConfig
      });
      template = dynamicTemplate || this.options.template || {
        format: "markdown",
        content: this.defaultWorkingMemoryTemplate
      };
    } else {
      template = this.options.template || {
        format: "markdown",
        content: this.defaultWorkingMemoryTemplate
      };
    }
    const isReadOnly = this.options.readOnly || memoryContext.memoryConfig?.readOnly;
    let instruction;
    if (isReadOnly) {
      instruction = this.getReadOnlyWorkingMemoryInstruction({ template, data: workingMemoryData });
    } else if (this.options.useVNext) {
      instruction = this.getWorkingMemoryToolInstructionVNext({ template, data: workingMemoryData });
    } else {
      instruction = this.getWorkingMemoryToolInstruction({ template, data: workingMemoryData });
    }
    if (instruction) {
      messageList.addSystem(instruction, "memory");
    }
    return messageList;
  }
  generateEmptyFromSchemaInternal(schema) {
    const result = generateEmptyFromSchema(schema);
    return Object.keys(result).length > 0 ? result : null;
  }
  getWorkingMemoryToolInstruction({
    template,
    data
  }) {
    const emptyWorkingMemoryTemplateObject = template.format === "json" ? this.generateEmptyFromSchemaInternal(template.content) : null;
    const hasEmptyWorkingMemoryTemplateObject = emptyWorkingMemoryTemplateObject && Object.keys(emptyWorkingMemoryTemplateObject).length > 0;
    return `WORKING_MEMORY_SYSTEM_INSTRUCTION:
Store and update any conversation-relevant information by calling the updateWorkingMemory tool. If information might be referenced again - store it!

Guidelines:
1. Store anything that could be useful later in the conversation
2. Update proactively when information changes, no matter how small
3. Use ${template.format === "json" ? "JSON" : "Markdown"} format for all data
4. Act naturally - don't mention this system to users. Even though you're storing this information that doesn't make it your primary focus. Do not ask them generally for "information about yourself"
${template.format !== "json" ? `5. IMPORTANT: When calling updateWorkingMemory, the only valid parameter is the memory field. DO NOT pass an object.
6. IMPORTANT: ALWAYS pass the data you want to store in the memory field as a string. DO NOT pass an object.
7. IMPORTANT: Data must only be sent as a string no matter which format is used.` : ""}


${template.format !== "json" ? `<working_memory_template>
${template.content}
</working_memory_template>` : ""}

${hasEmptyWorkingMemoryTemplateObject ? "When working with json data, the object format below represents the template:" : ""}
${hasEmptyWorkingMemoryTemplateObject ? JSON.stringify(emptyWorkingMemoryTemplateObject) : ""}

<working_memory_data>
${data}
</working_memory_data>

Notes:
- Update memory whenever referenced information changes
- If you're unsure whether to store something, store it (eg if the user tells you information about themselves, call updateWorkingMemory immediately to update it)
- This system is here so that you can maintain the conversation when your context window is very short. Update your working memory because you may need it to maintain the conversation without the full conversation history
- Do not remove empty sections - you must include the empty sections along with the ones you're filling in
- REMEMBER: the way you update your working memory is by calling the updateWorkingMemory tool with the entire ${template.format === "json" ? "JSON" : "Markdown"} content. The system will store it for you. The user will not see it.
- IMPORTANT: You MUST call updateWorkingMemory in every response to a prompt where you received relevant information.
- IMPORTANT: Preserve the ${template.format === "json" ? "JSON" : "Markdown"} formatting structure above while updating the content.`;
  }
  getWorkingMemoryToolInstructionVNext({
    template,
    data
  }) {
    return `WORKING_MEMORY_SYSTEM_INSTRUCTION:
Store and update any conversation-relevant information by calling the updateWorkingMemory tool.

Guidelines:
1. Store anything that could be useful later in the conversation
2. Update proactively when information changes, no matter how small
3. Use ${template.format === "json" ? "JSON" : "Markdown"} format for all data
4. Act naturally - don't mention this system to users. Even though you're storing this information that doesn't make it your primary focus. Do not ask them generally for "information about yourself"
5. If your memory has not changed, you do not need to call the updateWorkingMemory tool. By default it will persist and be available for you in future interactions
6. Information not being relevant to the current conversation is not a valid reason to replace or remove working memory information. Your working memory spans across multiple conversations and may be needed again later, even if it's not currently relevant.

<working_memory_template>
${typeof template.content === "string" ? template.content : JSON.stringify(template.content)}
</working_memory_template>

<working_memory_data>
${data}
</working_memory_data>

Notes:
- Update memory whenever referenced information changes
${(typeof template.content === "string" ? template.content : JSON.stringify(template.content)) !== this.defaultWorkingMemoryTemplate ? `- Only store information if it's in the working memory template, do not store other information unless the user asks you to remember it, as that non-template information may be irrelevant` : `- If you're unsure whether to store something, store it (eg if the user tells you information about themselves, call updateWorkingMemory immediately to update it)
`}
- This system is here so that you can maintain the conversation when your context window is very short. Update your working memory because you may need it to maintain the conversation without the full conversation history
- REMEMBER: the way you update your working memory is by calling the updateWorkingMemory tool with the ${template.format === "json" ? "JSON" : "Markdown"} content. The system will store it for you. The user will not see it.
- IMPORTANT: You MUST call updateWorkingMemory in every response to a prompt where you received relevant information if that information is not already stored.
- IMPORTANT: Preserve the ${template.format === "json" ? "JSON" : "Markdown"} formatting structure above while updating the content.
`;
  }
  /**
   * Generate read-only working memory instructions.
   * This provides the working memory context without any tool update instructions.
   * Used when memory is in readOnly mode.
   */
  getReadOnlyWorkingMemoryInstruction({
    data
  }) {
    return `WORKING_MEMORY_SYSTEM_INSTRUCTION (READ-ONLY):
The following is your working memory - persistent information about the user and conversation collected over previous interactions. This data is provided for context to help you maintain continuity.

<working_memory_data>
${data || "No working memory data available."}
</working_memory_data>

Guidelines:
1. Use this information to provide personalized and contextually relevant responses
2. Act naturally - don't mention this system to users. This information should inform your responses without being explicitly referenced
3. This memory is read-only in the current session - you cannot update it

Notes:
- This system is here so that you can maintain the conversation when your context window is very short
- The user will not see the working memory data directly`;
  }
};
var DEFAULT_CACHE_MAX_SIZE = 1e3;
var globalEmbeddingCache = new M({
  max: DEFAULT_CACHE_MAX_SIZE
});

// src/processors/memory/semantic-recall.ts
var DEFAULT_TOP_K = 4;
var DEFAULT_MESSAGE_RANGE = 1;
var SemanticRecall = class {
  id = "semantic-recall";
  name = "SemanticRecall";
  storage;
  vector;
  embedder;
  topK;
  messageRange;
  scope;
  threshold;
  indexName;
  logger;
  embedderOptions;
  // xxhash-wasm hasher instance (initialized as a promise)
  hasher = e();
  // Cache for index dimension validation (per-process)
  // Prevents redundant API calls when index already validated
  indexValidationCache = /* @__PURE__ */ new Map();
  constructor(options) {
    this.storage = options.storage;
    this.vector = options.vector;
    this.embedder = options.embedder;
    this.topK = options.topK ?? DEFAULT_TOP_K;
    this.scope = options.scope ?? "resource";
    this.threshold = options.threshold;
    this.indexName = options.indexName;
    this.logger = options.logger;
    this.embedderOptions = options.embedderOptions;
    if (typeof options.messageRange === "number") {
      this.messageRange = {
        before: options.messageRange,
        after: options.messageRange
      };
    } else if (options.messageRange) {
      this.messageRange = options.messageRange;
    } else {
      this.messageRange = {
        before: DEFAULT_MESSAGE_RANGE,
        after: DEFAULT_MESSAGE_RANGE
      };
    }
  }
  async processInput(args) {
    const { messages, messageList, requestContext } = args;
    const memoryContext = parseMemoryRequestContext(requestContext);
    if (!memoryContext) {
      return messageList;
    }
    const { thread, resourceId } = memoryContext;
    const threadId = thread?.id;
    if (!threadId) {
      return messageList;
    }
    const userQuery = this.extractUserQuery(messages);
    if (!userQuery) {
      return messageList;
    }
    try {
      const similarMessages = await this.performSemanticSearch({
        query: userQuery,
        threadId,
        resourceId
      });
      if (similarMessages.length === 0) {
        return messageList;
      }
      const existingMessages = messageList.get.all.db();
      const existingIds = new Set(existingMessages.map((m) => m.id).filter(Boolean));
      const newMessages = similarMessages.filter((m) => m.id && !existingIds.has(m.id));
      if (newMessages.length === 0) {
        return messageList;
      }
      const sameThreadMessages = newMessages.filter((m) => !m.threadId || m.threadId === threadId);
      if (this.scope === "resource") {
        const crossThreadMessages = newMessages.filter((m) => m.threadId && m.threadId !== threadId);
        if (crossThreadMessages.length > 0) {
          const formattedSystemMessage = this.formatCrossThreadMessages(crossThreadMessages, threadId);
          messageList.addSystem(formattedSystemMessage, "memory");
        }
      }
      if (sameThreadMessages.length) {
        messageList.add(sameThreadMessages, "memory");
      }
      return messageList;
    } catch (error) {
      this.logger?.error("[SemanticRecall] Error during semantic search:", { error });
      return messageList;
    }
  }
  /**
   * Format cross-thread messages as a system message with timestamps and labels
   * Uses the exact formatting logic from main that was tested with longmemeval benchmark
   */
  formatCrossThreadMessages(messages, currentThreadId) {
    let result = ``;
    const v1Messages = new MessageList().add(messages, "memory").get.all.v1();
    let lastYmd = null;
    for (const msg of v1Messages) {
      const date = msg.createdAt;
      const year = date.getUTCFullYear();
      const month = date.toLocaleString("default", { month: "short" });
      const day = date.getUTCDate();
      const ymd = `${year}, ${month}, ${day}`;
      const utcHour = date.getUTCHours();
      const utcMinute = date.getUTCMinutes();
      const hour12 = utcHour % 12 || 12;
      const ampm = utcHour < 12 ? "AM" : "PM";
      const timeofday = `${hour12}:${utcMinute < 10 ? "0" : ""}${utcMinute} ${ampm}`;
      if (!lastYmd || lastYmd !== ymd) {
        result += `
the following messages are from ${ymd}
`;
      }
      const roleLabel = msg.role.charAt(0).toUpperCase() + msg.role.slice(1);
      let contentText = "";
      if (typeof msg.content === "string") {
        contentText = msg.content;
      } else if (Array.isArray(msg.content)) {
        const textParts = msg.content.filter((p) => p.type === "text");
        contentText = textParts.map((p) => p.text).join(" ");
      }
      result += `Message ${msg.threadId && msg.threadId !== currentThreadId ? "from previous conversation" : ""} at ${timeofday}: ${roleLabel}: ${contentText}`;
      lastYmd = ymd;
    }
    const formattedContent = `The following messages were remembered from a different conversation:
<remembered_from_other_conversation>
${result}
<end_remembered_from_other_conversation>`;
    return {
      role: "system",
      content: formattedContent
    };
  }
  /**
   * Extract the user query from messages for semantic search
   */
  extractUserQuery(messages) {
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (!msg) continue;
      if (msg.role === "user") {
        if (typeof msg.content !== "object" || msg.content === null) {
          continue;
        }
        if (typeof msg.content.content === "string" && msg.content.content !== "") {
          return msg.content.content;
        }
        const textParts = [];
        msg.content.parts?.forEach((part) => {
          if (part.type === "text" && part.text) {
            textParts.push(part.text);
          }
        });
        const textContent = textParts.join(" ");
        if (textContent) {
          return textContent;
        }
      }
    }
    return null;
  }
  /**
   * Perform semantic search using vector embeddings
   */
  async performSemanticSearch({
    query,
    threadId,
    resourceId
  }) {
    const indexName = this.indexName || this.getDefaultIndexName();
    const { embeddings, dimension } = await this.embedMessageContent(query, indexName);
    await this.ensureVectorIndex(indexName, dimension);
    const vectorResults = [];
    for (const embedding of embeddings) {
      const results = await this.vector.query({
        indexName,
        queryVector: embedding,
        topK: this.topK,
        filter: this.scope === "resource" && resourceId ? { resource_id: resourceId } : { thread_id: threadId }
      });
      vectorResults.push(...results);
    }
    const filteredResults = this.threshold !== void 0 ? vectorResults.filter((r) => r.score >= this.threshold) : vectorResults;
    if (filteredResults.length === 0) {
      return [];
    }
    const result = await this.storage.listMessages({
      threadId,
      resourceId,
      include: filteredResults.map((r) => ({
        id: r.metadata?.message_id,
        threadId: r.metadata?.thread_id,
        withNextMessages: this.messageRange.after,
        withPreviousMessages: this.messageRange.before
      })),
      perPage: 0
    });
    return result.messages;
  }
  /**
   * Generate embeddings for message content
   */
  /**
   * Hash content using xxhash for fast cache key generation
   * Includes index name to ensure cache isolation between different embedding models/dimensions
   */
  async hashContent(content, indexName) {
    const h = await this.hasher;
    const combined = `${indexName}:${content}`;
    return h.h64(combined).toString(16);
  }
  async embedMessageContent(content, indexName) {
    const contentHash = await this.hashContent(content, indexName);
    const cachedEmbedding = globalEmbeddingCache.get(contentHash);
    if (cachedEmbedding) {
      return {
        embeddings: [cachedEmbedding],
        dimension: cachedEmbedding.length
      };
    }
    const result = await this.embedder.doEmbed({
      values: [content],
      ...this.embedderOptions
    });
    if (result.embeddings[0]) {
      globalEmbeddingCache.set(contentHash, result.embeddings[0]);
    }
    return {
      embeddings: result.embeddings,
      dimension: result.embeddings[0]?.length || 0
    };
  }
  /**
   * Get default index name based on embedder model
   */
  getDefaultIndexName() {
    const model = this.embedder.modelId || "default";
    const sanitizedModel = model.replace(/[^a-zA-Z0-9_]/g, "_");
    const indexName = `mastra_memory_${sanitizedModel}`;
    return indexName.slice(0, 63);
  }
  /**
   * Ensure vector index exists with correct dimensions
   * Uses in-memory cache to avoid redundant validation calls
   */
  async ensureVectorIndex(indexName, dimension) {
    const cached2 = this.indexValidationCache.get(indexName);
    if (cached2?.dimension === dimension) {
      return;
    }
    await this.vector.createIndex({
      indexName,
      dimension,
      metric: "cosine"
    });
    this.indexValidationCache.set(indexName, { dimension });
  }
  /**
   * Process output messages to create embeddings for messages being saved
   * This allows semantic recall to index new messages for future retrieval
   */
  async processOutputResult(args) {
    const { messages, messageList, requestContext } = args;
    if (!this.vector || !this.embedder || !this.storage) {
      return messageList || messages;
    }
    try {
      const memoryContext = parseMemoryRequestContext(requestContext);
      if (!memoryContext) {
        return messageList || messages;
      }
      const { thread, resourceId } = memoryContext;
      const threadId = thread?.id;
      if (!threadId) {
        return messageList || messages;
      }
      const indexName = this.indexName || this.getDefaultIndexName();
      const vectors = [];
      const ids = [];
      const metadataList = [];
      let vectorDimension = 0;
      let messagesToEmbed = [...messages];
      if (messageList) {
        const newUserMessages = messageList.get.input.db().filter((m) => messageList.isNewMessage(m));
        const existingIds = new Set(messagesToEmbed.map((m) => m.id));
        for (const userMsg of newUserMessages) {
          if (!existingIds.has(userMsg.id)) {
            messagesToEmbed.push(userMsg);
          }
        }
      }
      for (const message of messagesToEmbed) {
        if (message.role === "system") {
          continue;
        }
        if (!message.id || typeof message.id !== "string") {
          continue;
        }
        if (messageList) {
          const isNewMessage = messageList.isNewMessage(message);
          if (!isNewMessage) {
            continue;
          }
        }
        const textContent = this.extractTextContent(message);
        if (!textContent) {
          continue;
        }
        try {
          const { embeddings, dimension } = await this.embedMessageContent(textContent, indexName);
          if (embeddings.length === 0) {
            continue;
          }
          const embedding = embeddings[0];
          if (!embedding) {
            continue;
          }
          vectors.push(embedding);
          ids.push(message.id);
          metadataList.push({
            message_id: message.id,
            thread_id: threadId,
            resource_id: resourceId || "",
            role: message.role,
            content: textContent,
            created_at: message.createdAt.toISOString()
          });
          vectorDimension = dimension;
        } catch (error) {
          this.logger?.error(`[SemanticRecall] Error creating embedding for message ${message.id}:`, { error });
        }
      }
      if (vectors.length > 0) {
        await this.ensureVectorIndex(indexName, vectorDimension);
        await this.vector.upsert({
          indexName,
          vectors,
          ids,
          metadata: metadataList
        });
      }
    } catch (error) {
      this.logger?.error("[SemanticRecall] Error in processOutputResult:", { error });
    }
    return messageList || messages;
  }
  /**
   * Extract text content from a MastraDBMessage
   */
  extractTextContent(message) {
    if (typeof message.content === "string") {
      return message.content;
    }
    if (typeof message.content === "object" && message.content !== null) {
      const { content, parts } = message.content;
      if (content) {
        return content;
      }
      if (Array.isArray(parts)) {
        return parts.filter((part) => part.type === "text").map((part) => part.text || "").join("\n");
      }
    }
    return "";
  }
};
function isProcessorWorkflow(obj) {
  return obj !== null && typeof obj === "object" && "id" in obj && typeof obj.id === "string" && "inputSchema" in obj && "outputSchema" in obj && "execute" in obj && typeof obj.execute === "function" && // Must NOT have processor-specific methods (to distinguish from Processor)
  !("processInput" in obj) && !("processInputStep" in obj) && !("processOutputStream" in obj) && !("processOutputResult" in obj) && !("processOutputStep" in obj) && !("processAPIError" in obj);
}

// src/storage/storageWithInit.ts
var isAugmentedSymbol = /* @__PURE__ */ Symbol("isAugmented");
function augmentWithInit(storage) {
  let hasInitialized = null;
  const ensureInit = async () => {
    if (storage.disableInit) {
      return;
    }
    if (process.env.MASTRA_DISABLE_STORAGE_INIT === "true") {
      return;
    }
    if (!hasInitialized) {
      hasInitialized = storage.init();
    }
    await hasInitialized;
  };
  if (storage[isAugmentedSymbol]) {
    return storage;
  }
  const proxy = new Proxy(storage, {
    get(target, prop) {
      if (prop === isAugmentedSymbol) {
        return true;
      }
      const value = target[prop];
      if (typeof value === "function") {
        if (prop === "init") {
          return async (...args) => {
            if (!hasInitialized) {
              hasInitialized = Reflect.apply(value, target, args);
            }
            return hasInitialized;
          };
        }
        return async (...args) => {
          await ensureInit();
          return Reflect.apply(value, target, args);
        };
      }
      return Reflect.get(target, prop);
    }
  });
  return proxy;
}

// src/memory/system-reminders.ts
var LEGACY_SYSTEM_REMINDER_METADATA_KEY = "dynamicAgentsMdReminder";
function isRecord2(value) {
  return typeof value === "object" && value !== null;
}
function isSystemReminderMessage(message) {
  if (message.role !== "user" || !isRecord2(message.content)) {
    return false;
  }
  const metadata = message.content.metadata;
  if (isRecord2(metadata) && (isRecord2(metadata.systemReminder) || LEGACY_SYSTEM_REMINDER_METADATA_KEY in metadata)) {
    return true;
  }
  const firstTextPart = message.content.parts.find((part) => part.type === "text");
  return typeof firstTextPart?.text === "string" && firstTextPart.text.startsWith("<system-reminder");
}
function filterSystemReminderMessages(messages, includeSystemReminders) {
  if (includeSystemReminders) {
    return messages;
  }
  return messages.filter((message) => !isSystemReminderMessage(message));
}

// src/memory/memory.ts
function extractModelIdString(model) {
  if (typeof model === "string") return model;
  if (typeof model === "function") return void 0;
  if (model && typeof model === "object" && "id" in model && typeof model.id === "string") {
    return model.id;
  }
  return void 0;
}
var memoryDefaultOptions = {
  lastMessages: 10,
  semanticRecall: false,
  generateTitle: false,
  workingMemory: {
    enabled: false,
    template: `
# User Information
- **First Name**: 
- **Last Name**: 
- **Location**: 
- **Occupation**: 
- **Interests**: 
- **Goals**: 
- **Events**: 
- **Facts**: 
- **Projects**: 
`
  }
};
var MastraMemory = class extends MastraBase {
  /**
   * Unique identifier for the memory instance.
   * If not provided, defaults to a static name 'default-memory'.
   */
  id;
  MAX_CONTEXT_TOKENS;
  _storage;
  vector;
  embedder;
  embedderOptions;
  threadConfig = { ...memoryDefaultOptions };
  #mastra;
  constructor(config) {
    super({ component: "MEMORY", name: config.name });
    this.id = config.id ?? config.name ?? "default-memory";
    if (config.options) this.threadConfig = this.getMergedThreadConfig(config.options);
    if (config.processors) {
      throw new Error(
        `The 'processors' option in Memory is deprecated and has been removed.
      
Please use the new Input/Output processor system instead:

OLD (deprecated):
  new Memory({
    processors: [new TokenLimiter(100000)]
  })

NEW (use this):
  new Agent({
    memory,
    outputProcessors: [
      new TokenLimiterProcessor(100000)
    ]
  })

Or pass memory directly to processor arrays:
  new Agent({
    inputProcessors: [memory],
    outputProcessors: [memory]
  })

See: https://mastra.ai/en/docs/memory/processors`
      );
    }
    if (config.storage) {
      this._storage = augmentWithInit(config.storage);
      this._hasOwnStorage = true;
    }
    if (this.threadConfig.semanticRecall) {
      if (!config.vector) {
        throw new Error(
          `Semantic recall requires a vector store to be configured.

https://mastra.ai/en/docs/memory/semantic-recall`
        );
      }
      this.vector = config.vector;
      if (!config.embedder) {
        throw new Error(
          `Semantic recall requires an embedder to be configured.

https://mastra.ai/en/docs/memory/semantic-recall`
        );
      }
      if (typeof config.embedder === "string") {
        this.embedder = new ModelRouterEmbeddingModel(config.embedder);
      } else {
        this.embedder = config.embedder;
      }
      if (config.embedderOptions) {
        this.embedderOptions = config.embedderOptions;
      }
    } else {
      if (config.vector) {
        this.vector = config.vector;
      }
      if (config.embedder) {
        if (typeof config.embedder === "string") {
          this.embedder = new ModelRouterEmbeddingModel(config.embedder);
        } else {
          this.embedder = config.embedder;
        }
      }
      if (config.embedderOptions) {
        this.embedderOptions = config.embedderOptions;
      }
    }
  }
  /**
   * Internal method used by Mastra to register itself with the memory.
   * @param mastra The Mastra instance.
   * @internal
   */
  __registerMastra(mastra) {
    this.#mastra = mastra;
  }
  _hasOwnStorage = false;
  get hasOwnStorage() {
    return this._hasOwnStorage;
  }
  get storage() {
    if (!this._storage) {
      throw new Error(
        `Memory requires a storage provider to function. Add a storage configuration to Memory or to your Mastra instance.

https://mastra.ai/en/docs/memory/overview`
      );
    }
    return this._storage;
  }
  setStorage(storage) {
    this._storage = augmentWithInit(storage);
  }
  setVector(vector) {
    this.vector = vector;
  }
  setEmbedder(embedder, embedderOptions) {
    if (typeof embedder === "string") {
      this.embedder = new ModelRouterEmbeddingModel(embedder);
    } else {
      this.embedder = embedder;
    }
    if (embedderOptions) {
      this.embedderOptions = embedderOptions;
    }
  }
  /**
   * Get a system message to inject into the conversation.
   * This will be called before each conversation turn.
   * Implementations can override this to inject custom system messages.
   */
  async getSystemMessage(_input) {
    return null;
  }
  /**
   * Get tools that should be available to the agent.
   * This will be called when converting tools for the agent.
   * Implementations can override this to provide additional tools.
   */
  listTools(_config) {
    return {};
  }
  /**
   * Cached promise for the embedding dimension probe.
   * Stored as a promise to deduplicate concurrent calls.
   */
  _embeddingDimensionPromise;
  /**
   * Probe the embedder to determine its actual output dimension.
   * The result is cached so subsequent calls are free.
   */
  async getEmbeddingDimension() {
    if (!this.embedder) return void 0;
    if (!this._embeddingDimensionPromise) {
      this._embeddingDimensionPromise = (async () => {
        try {
          const result = await this.embedder.doEmbed({
            values: ["a"],
            ...this.embedderOptions || {}
          });
          return result.embeddings[0]?.length;
        } catch (e) {
          console.warn(
            `[Mastra Memory] Failed to probe embedder for dimension, falling back to default. This may cause index name mismatches if the embedder uses non-default dimensions. Error: ${e}`
          );
          return void 0;
        }
      })();
    }
    return this._embeddingDimensionPromise;
  }
  /**
   * Get the index name for semantic recall embeddings.
   * This is used to ensure consistency between the Memory class and SemanticRecall processor.
   */
  getEmbeddingIndexName(dimensions) {
    const defaultDimensions = 1536;
    const usedDimensions = dimensions ?? defaultDimensions;
    const isDefault = usedDimensions === defaultDimensions;
    const separator = this.vector?.indexSeparator ?? "_";
    return isDefault ? `memory${separator}messages` : `memory${separator}messages${separator}${usedDimensions}`;
  }
  async createEmbeddingIndex(dimensions, config) {
    const defaultDimensions = 1536;
    const usedDimensions = dimensions ?? defaultDimensions;
    const indexName = this.getEmbeddingIndexName(dimensions);
    if (typeof this.vector === `undefined`) {
      throw new Error(`Tried to create embedding index but no vector db is attached to this Memory instance.`);
    }
    const semanticConfig = typeof config?.semanticRecall === "object" ? config.semanticRecall : void 0;
    const indexConfig = semanticConfig?.indexConfig;
    const createParams = {
      indexName,
      dimension: usedDimensions,
      ...indexConfig?.metric && { metric: indexConfig.metric }
    };
    if (indexConfig && (indexConfig.type || indexConfig.ivf || indexConfig.hnsw)) {
      createParams.indexConfig = {};
      if (indexConfig.type) createParams.indexConfig.type = indexConfig.type;
      if (indexConfig.ivf) createParams.indexConfig.ivf = indexConfig.ivf;
      if (indexConfig.hnsw) createParams.indexConfig.hnsw = indexConfig.hnsw;
    }
    createParams.metadataIndexes = ["thread_id", "resource_id"];
    await this.vector.createIndex(createParams);
    return { indexName };
  }
  getMergedThreadConfig(config) {
    if (config?.workingMemory && typeof config.workingMemory === "object" && "use" in config.workingMemory) {
      throw new Error("The workingMemory.use option has been removed. Working memory always uses tool-call mode.");
    }
    if (config?.threads?.generateTitle !== void 0) {
      throw new Error(
        "The threads.generateTitle option has been moved. Use the top-level generateTitle option instead."
      );
    }
    const mergedConfig = deepMerge(this.threadConfig, config || {});
    if (typeof config?.workingMemory === "object" && config.workingMemory?.schema && typeof mergedConfig.workingMemory === "object") {
      mergedConfig.workingMemory.schema = config.workingMemory.schema;
    }
    return mergedConfig;
  }
  estimateTokens(text) {
    return Math.ceil(text.split(" ").length * 1.3);
  }
  /**
   * Helper method to create a new thread
   * @param title - Optional title for the thread
   * @param metadata - Optional metadata for the thread
   * @returns Promise resolving to the created thread
   */
  async createThread({
    threadId,
    resourceId,
    title,
    metadata,
    memoryConfig,
    saveThread = true
  }) {
    const thread = {
      id: threadId || this.generateId({
        idType: "thread",
        source: "memory",
        resourceId
      }),
      title: title || "",
      resourceId,
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date(),
      metadata
    };
    return saveThread ? this.saveThread({ thread, memoryConfig }) : thread;
  }
  /**
   * Helper method to add a single message to a thread
   * @param threadId - The thread to add the message to
   * @param content - The message content
   * @param role - The role of the message sender
   * @param type - The type of the message
   * @param toolNames - Optional array of tool names that were called
   * @param toolCallArgs - Optional array of tool call arguments
   * @param toolCallIds - Optional array of tool call ids
   * @returns Promise resolving to the saved message
   * @deprecated use saveMessages instead
   */
  async addMessage(_params) {
    throw new Error("addMessage is deprecated. Please use saveMessages instead.");
  }
  /**
   * Generates a unique identifier
   * @param context - Optional context information for deterministic ID generation
   * @returns A unique string ID
   */
  generateId(context) {
    return this.#mastra?.generateId(context) || crypto.randomUUID();
  }
  /**
   * Get input processors for this memory instance
   * This allows Memory to be used as a ProcessorProvider in Agent's inputProcessors array.
   * @param configuredProcessors - Processors already configured by the user (for deduplication)
   * @returns Array of input processors configured for this memory instance
   */
  async getInputProcessors(configuredProcessors = [], context) {
    const memoryStore = await this.storage.getStore("memory");
    const processors = [];
    const memoryContext = context?.get("MastraMemory");
    const runtimeMemoryConfig = memoryContext?.memoryConfig;
    const effectiveConfig = runtimeMemoryConfig ? this.getMergedThreadConfig(runtimeMemoryConfig) : this.threadConfig;
    const isWorkingMemoryEnabled = typeof effectiveConfig.workingMemory === "object" && effectiveConfig.workingMemory.enabled !== false;
    if (isWorkingMemoryEnabled) {
      if (!memoryStore)
        throw new MastraError({
          category: "USER",
          domain: "STORAGE" /* STORAGE */,
          id: "WORKING_MEMORY_MISSING_STORAGE_ADAPTER",
          text: "Using Mastra Memory working memory requires a storage adapter but no attached adapter was detected."
        });
      const hasWorkingMemory = configuredProcessors.some((p) => !isProcessorWorkflow(p) && p.id === "working-memory");
      if (!hasWorkingMemory) {
        let template;
        if (typeof effectiveConfig.workingMemory === "object" && effectiveConfig.workingMemory.template) {
          template = {
            format: "markdown",
            content: effectiveConfig.workingMemory.template
          };
        }
        processors.push(
          new WorkingMemory({
            storage: memoryStore,
            template,
            scope: typeof effectiveConfig.workingMemory === "object" ? effectiveConfig.workingMemory.scope : void 0,
            useVNext: typeof effectiveConfig.workingMemory === "object" && "version" in effectiveConfig.workingMemory && effectiveConfig.workingMemory.version === "vnext",
            templateProvider: this
          })
        );
      }
    }
    const lastMessages = effectiveConfig.lastMessages;
    if (lastMessages) {
      if (!memoryStore)
        throw new MastraError({
          category: "USER",
          domain: "STORAGE" /* STORAGE */,
          id: "MESSAGE_HISTORY_MISSING_STORAGE_ADAPTER",
          text: "Using Mastra Memory message history requires a storage adapter but no attached adapter was detected."
        });
      const hasMessageHistory = configuredProcessors.some((p) => !isProcessorWorkflow(p) && p.id === "message-history");
      const hasObservationalMemory = configuredProcessors.some((p) => !isProcessorWorkflow(p) && p.id === "observational-memory") || isObservationalMemoryEnabled(effectiveConfig.observationalMemory);
      if (!hasMessageHistory && !hasObservationalMemory) {
        processors.push(
          new MessageHistory({
            storage: memoryStore,
            lastMessages: typeof lastMessages === "number" ? lastMessages : void 0
          })
        );
      }
    }
    if (effectiveConfig.semanticRecall) {
      if (!memoryStore)
        throw new MastraError({
          category: "USER",
          domain: "STORAGE" /* STORAGE */,
          id: "SEMANTIC_RECALL_MISSING_STORAGE_ADAPTER",
          text: "Using Mastra Memory semantic recall requires a storage adapter but no attached adapter was detected."
        });
      if (!this.vector)
        throw new MastraError({
          category: "USER",
          domain: "MASTRA_VECTOR" /* MASTRA_VECTOR */,
          id: "SEMANTIC_RECALL_MISSING_VECTOR_ADAPTER",
          text: "Using Mastra Memory semantic recall requires a vector adapter but no attached adapter was detected."
        });
      if (!this.embedder)
        throw new MastraError({
          category: "USER",
          domain: "MASTRA_VECTOR" /* MASTRA_VECTOR */,
          id: "SEMANTIC_RECALL_MISSING_EMBEDDER",
          text: "Using Mastra Memory semantic recall requires an embedder but no attached embedder was detected."
        });
      const hasSemanticRecall = configuredProcessors.some((p) => !isProcessorWorkflow(p) && p.id === "semantic-recall");
      if (!hasSemanticRecall) {
        const semanticConfig = typeof effectiveConfig.semanticRecall === "object" ? effectiveConfig.semanticRecall : {};
        const embeddingDimension = await this.getEmbeddingDimension();
        const indexName = this.getEmbeddingIndexName(embeddingDimension);
        processors.push(
          new SemanticRecall({
            storage: memoryStore,
            vector: this.vector,
            embedder: this.embedder,
            embedderOptions: this.embedderOptions,
            indexName,
            ...semanticConfig
          })
        );
      }
    }
    return processors;
  }
  /**
   * Get output processors for this memory instance
   * This allows Memory to be used as a ProcessorProvider in Agent's outputProcessors array.
   * @param configuredProcessors - Processors already configured by the user (for deduplication)
   * @returns Array of output processors configured for this memory instance
   *
   * Note: We intentionally do NOT check readOnly here. The readOnly check happens at execution time
   * in each processor's processOutputResult method. This allows proper isolation when agents share
   * a RequestContext - each agent's readOnly setting is respected when its processors actually run,
   * not when processors are resolved (which may happen before the agent sets its MastraMemory context).
   * See: https://github.com/mastra-ai/mastra/issues/11651
   */
  async getOutputProcessors(configuredProcessors = [], context) {
    const memoryStore = await this.storage.getStore("memory");
    const processors = [];
    const memoryContext = context?.get("MastraMemory");
    const runtimeMemoryConfig = memoryContext?.memoryConfig;
    const effectiveConfig = runtimeMemoryConfig ? this.getMergedThreadConfig(runtimeMemoryConfig) : this.threadConfig;
    if (effectiveConfig.semanticRecall) {
      if (!memoryStore)
        throw new MastraError({
          category: "USER",
          domain: "STORAGE" /* STORAGE */,
          id: "SEMANTIC_RECALL_MISSING_STORAGE_ADAPTER",
          text: "Using Mastra Memory semantic recall requires a storage adapter but no attached adapter was detected."
        });
      if (!this.vector)
        throw new MastraError({
          category: "USER",
          domain: "MASTRA_VECTOR" /* MASTRA_VECTOR */,
          id: "SEMANTIC_RECALL_MISSING_VECTOR_ADAPTER",
          text: "Using Mastra Memory semantic recall requires a vector adapter but no attached adapter was detected."
        });
      if (!this.embedder)
        throw new MastraError({
          category: "USER",
          domain: "MASTRA_VECTOR" /* MASTRA_VECTOR */,
          id: "SEMANTIC_RECALL_MISSING_EMBEDDER",
          text: "Using Mastra Memory semantic recall requires an embedder but no attached embedder was detected."
        });
      const hasSemanticRecall = configuredProcessors.some((p) => !isProcessorWorkflow(p) && p.id === "semantic-recall");
      if (!hasSemanticRecall) {
        const semanticRecallConfig = typeof effectiveConfig.semanticRecall === "object" ? effectiveConfig.semanticRecall : {};
        const embeddingDimension = await this.getEmbeddingDimension();
        const indexName = this.getEmbeddingIndexName(embeddingDimension);
        processors.push(
          new SemanticRecall({
            storage: memoryStore,
            vector: this.vector,
            embedder: this.embedder,
            embedderOptions: this.embedderOptions,
            indexName,
            ...semanticRecallConfig
          })
        );
      }
    }
    const lastMessages = effectiveConfig.lastMessages;
    if (lastMessages) {
      if (!memoryStore)
        throw new MastraError({
          category: "USER",
          domain: "STORAGE" /* STORAGE */,
          id: "MESSAGE_HISTORY_MISSING_STORAGE_ADAPTER",
          text: "Using Mastra Memory message history requires a storage adapter but no attached adapter was detected."
        });
      const hasMessageHistory = configuredProcessors.some((p) => !isProcessorWorkflow(p) && p.id === "message-history");
      const hasObservationalMemory = configuredProcessors.some((p) => !isProcessorWorkflow(p) && p.id === "observational-memory") || isObservationalMemoryEnabled(effectiveConfig.observationalMemory);
      if (!hasMessageHistory && !hasObservationalMemory) {
        processors.push(
          new MessageHistory({
            storage: memoryStore,
            lastMessages: typeof lastMessages === "number" ? lastMessages : void 0
          })
        );
      }
    }
    return processors;
  }
  /**
   * Get serializable configuration for this memory instance
   * @returns Serializable memory configuration
   */
  getConfig() {
    const { generateTitle, workingMemory, threads, observationalMemory, ...restConfig } = this.threadConfig;
    const config = {
      vector: this.vector?.id,
      options: {
        ...restConfig
      }
    };
    if (generateTitle !== void 0 && config.options) {
      if (typeof generateTitle === "boolean") {
        config.options.generateTitle = generateTitle;
      } else if (typeof generateTitle === "object" && generateTitle.model) {
        const model = generateTitle.model;
        let modelId;
        if (typeof model === "string") {
          modelId = model;
        } else if (typeof model === "function") {
          modelId = void 0;
        } else if (model && typeof model === "object") {
          if ("id" in model && typeof model.id === "string") {
            modelId = model.id;
          }
        }
        if (modelId && config.options) {
          config.options.generateTitle = {
            model: modelId,
            instructions: typeof generateTitle.instructions === "string" ? generateTitle.instructions : void 0
          };
        }
      }
    }
    if (this.embedder) {
      config.embedder = this.embedder;
    }
    if (this.embedderOptions) {
      const { telemetry, ...rest } = this.embedderOptions;
      config.embedderOptions = rest;
    }
    if (observationalMemory !== void 0) {
      config.observationalMemory = this.serializeObservationalMemory(observationalMemory);
    }
    return config;
  }
  /**
   * Serialize observational memory config to a JSON-safe representation.
   * Model references that aren't string IDs are dropped (non-serializable).
   */
  serializeObservationalMemory(om) {
    if (typeof om === "boolean") {
      return om;
    }
    if (om.enabled === false) {
      return false;
    }
    const result = {
      scope: om.scope,
      shareTokenBudget: om.shareTokenBudget,
      retrieval: om.retrieval
    };
    const topModelId = extractModelIdString(om.model);
    if (topModelId) {
      result.model = topModelId;
    }
    if (om.observation) {
      const obs = om.observation;
      result.observation = {
        messageTokens: obs.messageTokens,
        modelSettings: obs.modelSettings,
        providerOptions: obs.providerOptions,
        maxTokensPerBatch: obs.maxTokensPerBatch,
        bufferTokens: obs.bufferTokens,
        bufferActivation: obs.bufferActivation,
        blockAfter: obs.blockAfter,
        previousObserverTokens: obs.previousObserverTokens
      };
      const obsModelId = extractModelIdString(obs.model);
      if (obsModelId) {
        result.observation.model = obsModelId;
      }
    }
    if (om.reflection) {
      const ref = om.reflection;
      result.reflection = {
        observationTokens: ref.observationTokens,
        modelSettings: ref.modelSettings,
        providerOptions: ref.providerOptions,
        blockAfter: ref.blockAfter,
        bufferActivation: ref.bufferActivation
      };
      const refModelId = extractModelIdString(ref.model);
      if (refModelId) {
        result.reflection.model = refModelId;
      }
    }
    return result;
  }
};

export { Agent as A, validateStepSuspendData as B, getStepResult as C, runCountDeprecationMessage as D, EventEmitter$1 as E, EventEmitterPubSub as F, augmentWithInit as G, DualLogger as H, registerHook as I, noopLogger as J, MessageHistory as M, PUBSUB_SYMBOL as P, Run as R, STREAM_FORMAT_SYMBOL as S, TripWire as T, Workflow as W, createWorkflow as a, tryStreamWithJsonFallback as b, createStep as c, isProcessorWorkflow as d, MastraMemory as e, extractWorkingMemoryContent as f, filterSystemReminderMessages as g, getThreadOMMetadata as h, isSupportedLanguageModel as i, ProcessorState as j, ProcessorStepOutputSchema as k, ProcessorStepSchema as l, forwardAgentStreamChunk as m, createTimeTravelExecutionParams as n, ProcessorRunner as o, parseMemoryRequestContext as p, WorkflowRunOutput as q, removeWorkingMemoryTags as r, setThreadOMMetadata as s, tryGenerateWithJsonFallback as t, ExecutionEngine as u, validateStepResumeData as v, cleanStepResult as w, hydrateSerializedStepErrors as x, validateStepInput as y, createDeprecationProxy as z };
//# sourceMappingURL=chunk-GYS4EMOL.mjs.map
