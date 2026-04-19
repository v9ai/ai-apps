import { b as __require, c as convertToCoreMessages, i as isToolUIPart$1 } from './chunk-SFTERBTR.mjs';
import { y as safeParseAsync, o as object$1, b as array, h as unknown, n as number, r as record, s as string, l as literal, u as union, B as _instanceof, C as custom, z as lazy, D as _null, e as boolean, A as discriminatedUnion, a as any, _ as _enum } from './schemas.mjs';
import { t as toJSONSchema } from './to-json-schema.mjs';
import { Z as ZodFirstPartyTypeKind, o as objectType, n as numberType, s as stringType, a as arrayType, e as enumType, u as unionType } from './types.mjs';
import { M as MastraError } from './error.mjs';
import { I as InvalidArgumentError$1 } from './index3.mjs';
import { f as listTracesArgsSchema, h as toTraceSpans } from './evals.mjs';
import { d as deepEqual, j as jsonSchemaToZod } from './chunk-L43DNVPR.mjs';
import { E as EntityType, l as listMetricsArgsSchema, a as listLogsArgsSchema, b as listScoresArgsSchema, c as listFeedbackArgsSchema } from './chunk-OSVQQ7QZ.mjs';
import { M as MastraBase } from './chunk-WENZPAHS.mjs';
import { randomUUID } from 'crypto';
import { relative } from 'path';
import { execFile } from 'child_process';
import { realpathSync } from 'fs';
import { z } from './zod__v4.mjs';

// ../_vendored/ai_v5/dist/chunk-7D4SUZUM.js
var __create = Object.create;
var __defProp$1 = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __require2 = /* @__PURE__ */ ((x) => typeof __require !== "undefined" ? __require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof __require !== "undefined" ? __require : a)[b]
}) : x)(function(x) {
  if (typeof __require !== "undefined") return __require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __commonJS = (cb, mod) => function __require22() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp$1(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp$1(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// ../_vendored/ai_v5/dist/chunk-QOME2VME.js
var require_token_error = __commonJS({
  "../../../node_modules/.pnpm/@vercel+oidc@3.1.0/node_modules/@vercel/oidc/dist/token-error.js"(exports$1, module) {
    var __defProp2 = Object.defineProperty;
    var __getOwnPropDesc2 = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp2 = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp2(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps2 = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp2.call(to, key) && key !== except)
            __defProp2(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc2(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps2(__defProp2({}, "__esModule", { value: true }), mod);
    var token_error_exports = {};
    __export(token_error_exports, {
      VercelOidcTokenError: () => VercelOidcTokenError
    });
    module.exports = __toCommonJS(token_error_exports);
    var VercelOidcTokenError = class extends Error {
      constructor(message, cause) {
        super(message);
        this.name = "VercelOidcTokenError";
        this.cause = cause;
      }
      toString() {
        if (this.cause) {
          return `${this.name}: ${this.message}: ${this.cause}`;
        }
        return `${this.name}: ${this.message}`;
      }
    };
  }
});

// ../_vendored/ai_v5/dist/chunk-JEZ5C2JO.js
var marker$1 = "vercel.ai.error";
var symbol$1 = Symbol.for(marker$1);
var _a$1;
var _b$1;
var AISDKError = class _AISDKError extends (_b$1 = Error, _a$1 = symbol$1, _b$1) {
  /**
   * Creates an AI SDK Error.
   *
   * @param {Object} params - The parameters for creating the error.
   * @param {string} params.name - The name of the error.
   * @param {string} params.message - The error message.
   * @param {unknown} [params.cause] - The underlying cause of the error.
   */
  constructor({
    name: name142,
    message,
    cause
  }) {
    super(message);
    this[_a$1] = true;
    this.name = name142;
    this.cause = cause;
  }
  /**
   * Checks if the given error is an AI SDK Error.
   * @param {unknown} error - The error to check.
   * @returns {boolean} True if the error is an AI SDK Error, false otherwise.
   */
  static isInstance(error) {
    return _AISDKError.hasMarker(error, marker$1);
  }
  static hasMarker(error, marker152) {
    const markerSymbol = Symbol.for(marker152);
    return error != null && typeof error === "object" && markerSymbol in error && typeof error[markerSymbol] === "boolean" && error[markerSymbol] === true;
  }
};
var name$1 = "AI_APICallError";
var marker2$1 = `vercel.ai.error.${name$1}`;
var symbol2$1 = Symbol.for(marker2$1);
var _a2$1;
var _b2$1;
var APICallError = class extends (_b2$1 = AISDKError, _a2$1 = symbol2$1, _b2$1) {
  constructor({
    message,
    url,
    requestBodyValues,
    statusCode,
    responseHeaders,
    responseBody,
    cause,
    isRetryable = statusCode != null && (statusCode === 408 || // request timeout
    statusCode === 409 || // conflict
    statusCode === 429 || // too many requests
    statusCode >= 500),
    // server error
    data
  }) {
    super({ name: name$1, message, cause });
    this[_a2$1] = true;
    this.url = url;
    this.requestBodyValues = requestBodyValues;
    this.statusCode = statusCode;
    this.responseHeaders = responseHeaders;
    this.responseBody = responseBody;
    this.isRetryable = isRetryable;
    this.data = data;
  }
  static isInstance(error) {
    return AISDKError.hasMarker(error, marker2$1);
  }
};
var name2$1 = "AI_EmptyResponseBodyError";
var marker3$1 = `vercel.ai.error.${name2$1}`;
var symbol3$1 = Symbol.for(marker3$1);
var _a3$1;
var _b3$1;
var EmptyResponseBodyError = class extends (_b3$1 = AISDKError, _a3$1 = symbol3$1, _b3$1) {
  // used in isInstance
  constructor({ message = "Empty response body" } = {}) {
    super({ name: name2$1, message });
    this[_a3$1] = true;
  }
  static isInstance(error) {
    return AISDKError.hasMarker(error, marker3$1);
  }
};
function getErrorMessage(error) {
  if (error == null) {
    return "unknown error";
  }
  if (typeof error === "string") {
    return error;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return JSON.stringify(error);
}
var name3$1 = "AI_InvalidArgumentError";
var marker4$1 = `vercel.ai.error.${name3$1}`;
var symbol4$1 = Symbol.for(marker4$1);
var _a4$1;
var _b4$1;
var InvalidArgumentError = class extends (_b4$1 = AISDKError, _a4$1 = symbol4$1, _b4$1) {
  constructor({
    message,
    cause,
    argument
  }) {
    super({ name: name3$1, message, cause });
    this[_a4$1] = true;
    this.argument = argument;
  }
  static isInstance(error) {
    return AISDKError.hasMarker(error, marker4$1);
  }
};
var name6$1 = "AI_JSONParseError";
var marker7$1 = `vercel.ai.error.${name6$1}`;
var symbol7$1 = Symbol.for(marker7$1);
var _a7$1;
var _b7$1;
var JSONParseError = class extends (_b7$1 = AISDKError, _a7$1 = symbol7$1, _b7$1) {
  constructor({ text, cause }) {
    super({
      name: name6$1,
      message: `JSON parsing failed: Text: ${text}.
Error message: ${getErrorMessage(cause)}`,
      cause
    });
    this[_a7$1] = true;
    this.text = text;
  }
  static isInstance(error) {
    return AISDKError.hasMarker(error, marker7$1);
  }
};
var name12$1 = "AI_TypeValidationError";
var marker13 = `vercel.ai.error.${name12$1}`;
var symbol13 = Symbol.for(marker13);
var _a13;
var _b13;
var TypeValidationError = class _TypeValidationError extends (_b13 = AISDKError, _a13 = symbol13, _b13) {
  constructor({ value, cause }) {
    super({
      name: name12$1,
      message: `Type validation failed: Value: ${JSON.stringify(value)}.
Error message: ${getErrorMessage(cause)}`,
      cause
    });
    this[_a13] = true;
    this.value = value;
  }
  static isInstance(error) {
    return AISDKError.hasMarker(error, marker13);
  }
  /**
   * Wraps an error into a TypeValidationError.
   * If the cause is already a TypeValidationError with the same value, it returns the cause.
   * Otherwise, it creates a new TypeValidationError.
   *
   * @param {Object} params - The parameters for wrapping the error.
   * @param {unknown} params.value - The value that failed validation.
   * @param {unknown} params.cause - The original error or cause of the validation failure.
   * @returns {TypeValidationError} A TypeValidationError instance.
   */
  static wrap({
    value,
    cause
  }) {
    return _TypeValidationError.isInstance(cause) && cause.value === value ? cause : new _TypeValidationError({ value, cause });
  }
};
var ParseError = class extends Error {
  constructor(message, options) {
    super(message), this.name = "ParseError", this.type = options.type, this.field = options.field, this.value = options.value, this.line = options.line;
  }
};
function noop(_arg) {
}
function createParser(callbacks) {
  if (typeof callbacks == "function")
    throw new TypeError(
      "`callbacks` must be an object, got a function instead. Did you mean `{onEvent: fn}`?"
    );
  const { onEvent = noop, onError = noop, onRetry = noop, onComment } = callbacks;
  let incompleteLine = "", isFirstChunk = true, id, data = "", eventType = "";
  function feed(newChunk) {
    const chunk = isFirstChunk ? newChunk.replace(/^\xEF\xBB\xBF/, "") : newChunk, [complete, incomplete] = splitLines(`${incompleteLine}${chunk}`);
    for (const line of complete)
      parseLine(line);
    incompleteLine = incomplete, isFirstChunk = false;
  }
  function parseLine(line) {
    if (line === "") {
      dispatchEvent();
      return;
    }
    if (line.startsWith(":")) {
      onComment && onComment(line.slice(line.startsWith(": ") ? 2 : 1));
      return;
    }
    const fieldSeparatorIndex = line.indexOf(":");
    if (fieldSeparatorIndex !== -1) {
      const field = line.slice(0, fieldSeparatorIndex), offset = line[fieldSeparatorIndex + 1] === " " ? 2 : 1, value = line.slice(fieldSeparatorIndex + offset);
      processField(field, value, line);
      return;
    }
    processField(line, "", line);
  }
  function processField(field, value, line) {
    switch (field) {
      case "event":
        eventType = value;
        break;
      case "data":
        data = `${data}${value}
`;
        break;
      case "id":
        id = value.includes("\0") ? void 0 : value;
        break;
      case "retry":
        /^\d+$/.test(value) ? onRetry(parseInt(value, 10)) : onError(
          new ParseError(`Invalid \`retry\` value: "${value}"`, {
            type: "invalid-retry",
            value,
            line
          })
        );
        break;
      default:
        onError(
          new ParseError(
            `Unknown field "${field.length > 20 ? `${field.slice(0, 20)}\u2026` : field}"`,
            { type: "unknown-field", field, value, line }
          )
        );
        break;
    }
  }
  function dispatchEvent() {
    data.length > 0 && onEvent({
      id,
      event: eventType || void 0,
      // If the data buffer's last character is a U+000A LINE FEED (LF) character,
      // then remove the last character from the data buffer.
      data: data.endsWith(`
`) ? data.slice(0, -1) : data
    }), id = void 0, data = "", eventType = "";
  }
  function reset(options = {}) {
    incompleteLine && options.consume && parseLine(incompleteLine), isFirstChunk = true, id = void 0, data = "", eventType = "", incompleteLine = "";
  }
  return { feed, reset };
}
function splitLines(chunk) {
  const lines = [];
  let incompleteLine = "", searchIndex = 0;
  for (; searchIndex < chunk.length; ) {
    const crIndex = chunk.indexOf("\r", searchIndex), lfIndex = chunk.indexOf(`
`, searchIndex);
    let lineEnd = -1;
    if (crIndex !== -1 && lfIndex !== -1 ? lineEnd = Math.min(crIndex, lfIndex) : crIndex !== -1 ? crIndex === chunk.length - 1 ? lineEnd = -1 : lineEnd = crIndex : lfIndex !== -1 && (lineEnd = lfIndex), lineEnd === -1) {
      incompleteLine = chunk.slice(searchIndex);
      break;
    } else {
      const line = chunk.slice(searchIndex, lineEnd);
      lines.push(line), searchIndex = lineEnd + 1, chunk[searchIndex - 1] === "\r" && chunk[searchIndex] === `
` && searchIndex++;
    }
  }
  return [lines, incompleteLine];
}
var EventSourceParserStream = class extends TransformStream {
  constructor({ onError, onRetry, onComment } = {}) {
    let parser;
    super({
      start(controller) {
        parser = createParser({
          onEvent: (event) => {
            controller.enqueue(event);
          },
          onError(error) {
            onError === "terminate" ? controller.error(error) : typeof onError == "function" && onError(error);
          },
          onRetry,
          onComment
        });
      },
      transform(chunk) {
        parser.feed(chunk);
      }
    });
  }
};
function combineHeaders(...headers) {
  return headers.reduce(
    (combinedHeaders, currentHeaders) => ({
      ...combinedHeaders,
      ...currentHeaders != null ? currentHeaders : {}
    }),
    {}
  );
}
function extractResponseHeaders(response) {
  return Object.fromEntries([...response.headers]);
}
var createIdGenerator$1 = ({
  prefix,
  size = 16,
  alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  separator = "-"
} = {}) => {
  const generator = () => {
    const alphabetLength = alphabet.length;
    const chars = new Array(size);
    for (let i = 0; i < size; i++) {
      chars[i] = alphabet[Math.random() * alphabetLength | 0];
    }
    return chars.join("");
  };
  if (prefix == null) {
    return generator;
  }
  if (alphabet.includes(separator)) {
    throw new InvalidArgumentError({
      argument: "separator",
      message: `The separator "${separator}" must not be part of the alphabet "${alphabet}".`
    });
  }
  return () => `${prefix}${separator}${generator()}`;
};
var generateId = createIdGenerator$1();
function isAbortError$1(error) {
  return (error instanceof Error || error instanceof DOMException) && (error.name === "AbortError" || error.name === "ResponseAborted" || // Next.js
  error.name === "TimeoutError");
}
var FETCH_FAILED_ERROR_MESSAGES = ["fetch failed", "failed to fetch"];
function handleFetchError({
  error,
  url,
  requestBodyValues
}) {
  if (isAbortError$1(error)) {
    return error;
  }
  if (error instanceof TypeError && FETCH_FAILED_ERROR_MESSAGES.includes(error.message.toLowerCase())) {
    const cause = error.cause;
    if (cause != null) {
      return new APICallError({
        message: `Cannot connect to API: ${cause.message}`,
        cause,
        url,
        requestBodyValues,
        isRetryable: true
        // retry when network error
      });
    }
  }
  return error;
}
function getRuntimeEnvironmentUserAgent(globalThisAny = globalThis) {
  var _a22, _b22, _c;
  if (globalThisAny.window) {
    return `runtime/browser`;
  }
  if ((_a22 = globalThisAny.navigator) == null ? void 0 : _a22.userAgent) {
    return `runtime/${globalThisAny.navigator.userAgent.toLowerCase()}`;
  }
  if ((_c = (_b22 = globalThisAny.process) == null ? void 0 : _b22.versions) == null ? void 0 : _c.node) {
    return `runtime/node.js/${globalThisAny.process.version.substring(0)}`;
  }
  if (globalThisAny.EdgeRuntime) {
    return `runtime/vercel-edge`;
  }
  return "runtime/unknown";
}
function normalizeHeaders(headers) {
  if (headers == null) {
    return {};
  }
  const normalized = {};
  if (headers instanceof Headers) {
    headers.forEach((value, key) => {
      normalized[key.toLowerCase()] = value;
    });
  } else {
    if (!Array.isArray(headers)) {
      headers = Object.entries(headers);
    }
    for (const [key, value] of headers) {
      if (value != null) {
        normalized[key.toLowerCase()] = value;
      }
    }
  }
  return normalized;
}
function withUserAgentSuffix(headers, ...userAgentSuffixParts) {
  const normalizedHeaders = new Headers(normalizeHeaders(headers));
  const currentUserAgentHeader = normalizedHeaders.get("user-agent") || "";
  normalizedHeaders.set(
    "user-agent",
    [currentUserAgentHeader, ...userAgentSuffixParts].filter(Boolean).join(" ")
  );
  return Object.fromEntries(normalizedHeaders.entries());
}
var VERSION$1 = "3.0.22";
var getOriginalFetch = () => globalThis.fetch;
var getFromApi = async ({
  url,
  headers = {},
  successfulResponseHandler,
  failedResponseHandler,
  abortSignal,
  fetch = getOriginalFetch()
}) => {
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: withUserAgentSuffix(
        headers,
        `ai-sdk/provider-utils/${VERSION$1}`,
        getRuntimeEnvironmentUserAgent()
      ),
      signal: abortSignal
    });
    const responseHeaders = extractResponseHeaders(response);
    if (!response.ok) {
      let errorInformation;
      try {
        errorInformation = await failedResponseHandler({
          response,
          url,
          requestBodyValues: {}
        });
      } catch (error) {
        if (isAbortError$1(error) || APICallError.isInstance(error)) {
          throw error;
        }
        throw new APICallError({
          message: "Failed to process error response",
          cause: error,
          statusCode: response.status,
          url,
          responseHeaders,
          requestBodyValues: {}
        });
      }
      throw errorInformation.value;
    }
    try {
      return await successfulResponseHandler({
        response,
        url,
        requestBodyValues: {}
      });
    } catch (error) {
      if (error instanceof Error) {
        if (isAbortError$1(error) || APICallError.isInstance(error)) {
          throw error;
        }
      }
      throw new APICallError({
        message: "Failed to process successful response",
        cause: error,
        statusCode: response.status,
        url,
        responseHeaders,
        requestBodyValues: {}
      });
    }
  } catch (error) {
    throw handleFetchError({ error, url, requestBodyValues: {} });
  }
};
function loadOptionalSetting({
  settingValue,
  environmentVariableName
}) {
  if (typeof settingValue === "string") {
    return settingValue;
  }
  if (settingValue != null || typeof process === "undefined") {
    return void 0;
  }
  settingValue = process.env[environmentVariableName];
  if (settingValue == null || typeof settingValue !== "string") {
    return void 0;
  }
  return settingValue;
}
var suspectProtoRx = /"(?:_|\\u005[Ff])(?:_|\\u005[Ff])(?:p|\\u0070)(?:r|\\u0072)(?:o|\\u006[Ff])(?:t|\\u0074)(?:o|\\u006[Ff])(?:_|\\u005[Ff])(?:_|\\u005[Ff])"\s*:/;
var suspectConstructorRx = /"(?:c|\\u0063)(?:o|\\u006[Ff])(?:n|\\u006[Ee])(?:s|\\u0073)(?:t|\\u0074)(?:r|\\u0072)(?:u|\\u0075)(?:c|\\u0063)(?:t|\\u0074)(?:o|\\u006[Ff])(?:r|\\u0072)"\s*:/;
function _parse(text) {
  const obj = JSON.parse(text);
  if (obj === null || typeof obj !== "object") {
    return obj;
  }
  if (suspectProtoRx.test(text) === false && suspectConstructorRx.test(text) === false) {
    return obj;
  }
  return filter(obj);
}
function filter(obj) {
  let next = [obj];
  while (next.length) {
    const nodes = next;
    next = [];
    for (const node of nodes) {
      if (Object.prototype.hasOwnProperty.call(node, "__proto__")) {
        throw new SyntaxError("Object contains forbidden prototype property");
      }
      if (Object.prototype.hasOwnProperty.call(node, "constructor") && node.constructor !== null && typeof node.constructor === "object" && Object.prototype.hasOwnProperty.call(node.constructor, "prototype")) {
        throw new SyntaxError("Object contains forbidden prototype property");
      }
      for (const key in node) {
        const value = node[key];
        if (value && typeof value === "object") {
          next.push(value);
        }
      }
    }
  }
  return obj;
}
function secureJsonParse(text) {
  const { stackTraceLimit } = Error;
  try {
    Error.stackTraceLimit = 0;
  } catch (e) {
    return _parse(text);
  }
  try {
    return _parse(text);
  } finally {
    Error.stackTraceLimit = stackTraceLimit;
  }
}
var validatorSymbol = /* @__PURE__ */ Symbol.for("vercel.ai.validator");
function validator(validate) {
  return { [validatorSymbol]: true, validate };
}
function isValidator(value) {
  return typeof value === "object" && value !== null && validatorSymbol in value && value[validatorSymbol] === true && "validate" in value;
}
function lazyValidator(createValidator) {
  let validator2;
  return () => {
    if (validator2 == null) {
      validator2 = createValidator();
    }
    return validator2;
  };
}
function asValidator(value) {
  return isValidator(value) ? value : typeof value === "function" ? value() : standardSchemaValidator(value);
}
function standardSchemaValidator(standardSchema) {
  return validator(async (value) => {
    const result = await standardSchema["~standard"].validate(value);
    return result.issues == null ? { success: true, value: result.value } : {
      success: false,
      error: new TypeValidationError({
        value,
        cause: result.issues
      })
    };
  });
}
async function validateTypes({
  value,
  schema
}) {
  const result = await safeValidateTypes({ value, schema });
  if (!result.success) {
    throw TypeValidationError.wrap({ value, cause: result.error });
  }
  return result.value;
}
async function safeValidateTypes({
  value,
  schema
}) {
  const validator2 = asValidator(schema);
  try {
    if (validator2.validate == null) {
      return { success: true, value, rawValue: value };
    }
    const result = await validator2.validate(value);
    if (result.success) {
      return { success: true, value: result.value, rawValue: value };
    }
    return {
      success: false,
      error: TypeValidationError.wrap({ value, cause: result.error }),
      rawValue: value
    };
  } catch (error) {
    return {
      success: false,
      error: TypeValidationError.wrap({ value, cause: error }),
      rawValue: value
    };
  }
}
async function parseJSON({
  text,
  schema
}) {
  try {
    const value = secureJsonParse(text);
    if (schema == null) {
      return value;
    }
    return validateTypes({ value, schema });
  } catch (error) {
    if (JSONParseError.isInstance(error) || TypeValidationError.isInstance(error)) {
      throw error;
    }
    throw new JSONParseError({ text, cause: error });
  }
}
async function safeParseJSON({
  text,
  schema
}) {
  try {
    const value = secureJsonParse(text);
    if (schema == null) {
      return { success: true, value, rawValue: value };
    }
    return await safeValidateTypes({ value, schema });
  } catch (error) {
    return {
      success: false,
      error: JSONParseError.isInstance(error) ? error : new JSONParseError({ text, cause: error }),
      rawValue: void 0
    };
  }
}
function parseJsonEventStream({
  stream,
  schema
}) {
  return stream.pipeThrough(new TextDecoderStream()).pipeThrough(new EventSourceParserStream()).pipeThrough(
    new TransformStream({
      async transform({ data }, controller) {
        if (data === "[DONE]") {
          return;
        }
        controller.enqueue(await safeParseJSON({ text: data, schema }));
      }
    })
  );
}
var getOriginalFetch2 = () => globalThis.fetch;
var postJsonToApi = async ({
  url,
  headers,
  body,
  failedResponseHandler,
  successfulResponseHandler,
  abortSignal,
  fetch
}) => postToApi({
  url,
  headers: {
    "Content-Type": "application/json",
    ...headers
  },
  body: {
    content: JSON.stringify(body),
    values: body
  },
  failedResponseHandler,
  successfulResponseHandler,
  abortSignal,
  fetch
});
var postToApi = async ({
  url,
  headers = {},
  body,
  successfulResponseHandler,
  failedResponseHandler,
  abortSignal,
  fetch = getOriginalFetch2()
}) => {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: withUserAgentSuffix(
        headers,
        `ai-sdk/provider-utils/${VERSION$1}`,
        getRuntimeEnvironmentUserAgent()
      ),
      body: body.content,
      signal: abortSignal
    });
    const responseHeaders = extractResponseHeaders(response);
    if (!response.ok) {
      let errorInformation;
      try {
        errorInformation = await failedResponseHandler({
          response,
          url,
          requestBodyValues: body.values
        });
      } catch (error) {
        if (isAbortError$1(error) || APICallError.isInstance(error)) {
          throw error;
        }
        throw new APICallError({
          message: "Failed to process error response",
          cause: error,
          statusCode: response.status,
          url,
          responseHeaders,
          requestBodyValues: body.values
        });
      }
      throw errorInformation.value;
    }
    try {
      return await successfulResponseHandler({
        response,
        url,
        requestBodyValues: body.values
      });
    } catch (error) {
      if (error instanceof Error) {
        if (isAbortError$1(error) || APICallError.isInstance(error)) {
          throw error;
        }
      }
      throw new APICallError({
        message: "Failed to process successful response",
        cause: error,
        statusCode: response.status,
        url,
        responseHeaders,
        requestBodyValues: body.values
      });
    }
  } catch (error) {
    throw handleFetchError({ error, url, requestBodyValues: body.values });
  }
};
function tool(tool2) {
  return tool2;
}
function createProviderDefinedToolFactoryWithOutputSchema({
  id,
  name: name22,
  inputSchema,
  outputSchema
}) {
  return ({
    execute,
    toModelOutput,
    onInputStart,
    onInputDelta,
    onInputAvailable,
    ...args
  }) => tool({
    type: "provider-defined",
    id,
    name: name22,
    args,
    inputSchema,
    outputSchema,
    execute,
    toModelOutput,
    onInputStart,
    onInputDelta,
    onInputAvailable
  });
}
async function resolve(value) {
  if (typeof value === "function") {
    value = value();
  }
  return Promise.resolve(value);
}
var createJsonErrorResponseHandler = ({
  errorSchema,
  errorToMessage,
  isRetryable
}) => async ({ response, url, requestBodyValues }) => {
  const responseBody = await response.text();
  const responseHeaders = extractResponseHeaders(response);
  if (responseBody.trim() === "") {
    return {
      responseHeaders,
      value: new APICallError({
        message: response.statusText,
        url,
        requestBodyValues,
        statusCode: response.status,
        responseHeaders,
        responseBody,
        isRetryable: isRetryable == null ? void 0 : isRetryable(response)
      })
    };
  }
  try {
    const parsedError = await parseJSON({
      text: responseBody,
      schema: errorSchema
    });
    return {
      responseHeaders,
      value: new APICallError({
        message: errorToMessage(parsedError),
        url,
        requestBodyValues,
        statusCode: response.status,
        responseHeaders,
        responseBody,
        data: parsedError,
        isRetryable: isRetryable == null ? void 0 : isRetryable(response, parsedError)
      })
    };
  } catch (parseError) {
    return {
      responseHeaders,
      value: new APICallError({
        message: response.statusText,
        url,
        requestBodyValues,
        statusCode: response.status,
        responseHeaders,
        responseBody,
        isRetryable: isRetryable == null ? void 0 : isRetryable(response)
      })
    };
  }
};
var createEventSourceResponseHandler = (chunkSchema) => async ({ response }) => {
  const responseHeaders = extractResponseHeaders(response);
  if (response.body == null) {
    throw new EmptyResponseBodyError({});
  }
  return {
    responseHeaders,
    value: parseJsonEventStream({
      stream: response.body,
      schema: chunkSchema
    })
  };
};
var createJsonResponseHandler = (responseSchema) => async ({ response, url, requestBodyValues }) => {
  const responseBody = await response.text();
  const parsedResult = await safeParseJSON({
    text: responseBody,
    schema: responseSchema
  });
  const responseHeaders = extractResponseHeaders(response);
  if (!parsedResult.success) {
    throw new APICallError({
      message: "Invalid JSON response",
      cause: parsedResult.error,
      statusCode: response.status,
      responseHeaders,
      responseBody,
      url,
      requestBodyValues
    });
  }
  return {
    responseHeaders,
    value: parsedResult.value,
    rawValue: parsedResult.rawValue
  };
};
function addAdditionalPropertiesToJsonSchema(jsonSchema2) {
  if (jsonSchema2.type === "object") {
    jsonSchema2.additionalProperties = false;
    const properties = jsonSchema2.properties;
    if (properties != null) {
      for (const property in properties) {
        properties[property] = addAdditionalPropertiesToJsonSchema(
          properties[property]
        );
      }
    }
  }
  if (jsonSchema2.type === "array" && jsonSchema2.items != null) {
    if (Array.isArray(jsonSchema2.items)) {
      jsonSchema2.items = jsonSchema2.items.map(
        (item) => addAdditionalPropertiesToJsonSchema(item)
      );
    } else {
      jsonSchema2.items = addAdditionalPropertiesToJsonSchema(
        jsonSchema2.items
      );
    }
  }
  return jsonSchema2;
}
var getRelativePath = (pathA, pathB) => {
  let i = 0;
  for (; i < pathA.length && i < pathB.length; i++) {
    if (pathA[i] !== pathB[i]) break;
  }
  return [(pathA.length - i).toString(), ...pathB.slice(i)].join("/");
};
var ignoreOverride = /* @__PURE__ */ Symbol(
  "Let zodToJsonSchema decide on which parser to use"
);
var defaultOptions = {
  name: void 0,
  $refStrategy: "root",
  basePath: ["#"],
  effectStrategy: "input",
  pipeStrategy: "all",
  dateStrategy: "format:date-time",
  mapStrategy: "entries",
  removeAdditionalStrategy: "passthrough",
  allowedAdditionalProperties: true,
  rejectedAdditionalProperties: false,
  definitionPath: "definitions",
  strictUnions: false,
  definitions: {},
  errorMessages: false,
  patternStrategy: "escape",
  applyRegexFlags: false,
  emailStrategy: "format:email",
  base64Strategy: "contentEncoding:base64",
  nameStrategy: "ref"
};
var getDefaultOptions = (options) => typeof options === "string" ? {
  ...defaultOptions,
  name: options
} : {
  ...defaultOptions,
  ...options
};
function parseAnyDef() {
  return {};
}
function parseArrayDef(def, refs) {
  var _a22, _b22, _c;
  const res = {
    type: "array"
  };
  if (((_a22 = def.type) == null ? void 0 : _a22._def) && ((_c = (_b22 = def.type) == null ? void 0 : _b22._def) == null ? void 0 : _c.typeName) !== ZodFirstPartyTypeKind.ZodAny) {
    res.items = parseDef(def.type._def, {
      ...refs,
      currentPath: [...refs.currentPath, "items"]
    });
  }
  if (def.minLength) {
    res.minItems = def.minLength.value;
  }
  if (def.maxLength) {
    res.maxItems = def.maxLength.value;
  }
  if (def.exactLength) {
    res.minItems = def.exactLength.value;
    res.maxItems = def.exactLength.value;
  }
  return res;
}
function parseBigintDef(def) {
  const res = {
    type: "integer",
    format: "int64"
  };
  if (!def.checks) return res;
  for (const check of def.checks) {
    switch (check.kind) {
      case "min":
        if (check.inclusive) {
          res.minimum = check.value;
        } else {
          res.exclusiveMinimum = check.value;
        }
        break;
      case "max":
        if (check.inclusive) {
          res.maximum = check.value;
        } else {
          res.exclusiveMaximum = check.value;
        }
        break;
      case "multipleOf":
        res.multipleOf = check.value;
        break;
    }
  }
  return res;
}
function parseBooleanDef() {
  return { type: "boolean" };
}
function parseBrandedDef(_def, refs) {
  return parseDef(_def.type._def, refs);
}
var parseCatchDef = (def, refs) => {
  return parseDef(def.innerType._def, refs);
};
function parseDateDef(def, refs, overrideDateStrategy) {
  const strategy = overrideDateStrategy != null ? overrideDateStrategy : refs.dateStrategy;
  if (Array.isArray(strategy)) {
    return {
      anyOf: strategy.map((item, i) => parseDateDef(def, refs, item))
    };
  }
  switch (strategy) {
    case "string":
    case "format:date-time":
      return {
        type: "string",
        format: "date-time"
      };
    case "format:date":
      return {
        type: "string",
        format: "date"
      };
    case "integer":
      return integerDateParser(def);
  }
}
var integerDateParser = (def) => {
  const res = {
    type: "integer",
    format: "unix-time"
  };
  for (const check of def.checks) {
    switch (check.kind) {
      case "min":
        res.minimum = check.value;
        break;
      case "max":
        res.maximum = check.value;
        break;
    }
  }
  return res;
};
function parseDefaultDef(_def, refs) {
  return {
    ...parseDef(_def.innerType._def, refs),
    default: _def.defaultValue()
  };
}
function parseEffectsDef(_def, refs) {
  return refs.effectStrategy === "input" ? parseDef(_def.schema._def, refs) : parseAnyDef();
}
function parseEnumDef(def) {
  return {
    type: "string",
    enum: Array.from(def.values)
  };
}
var isJsonSchema7AllOfType = (type) => {
  if ("type" in type && type.type === "string") return false;
  return "allOf" in type;
};
function parseIntersectionDef(def, refs) {
  const allOf = [
    parseDef(def.left._def, {
      ...refs,
      currentPath: [...refs.currentPath, "allOf", "0"]
    }),
    parseDef(def.right._def, {
      ...refs,
      currentPath: [...refs.currentPath, "allOf", "1"]
    })
  ].filter((x) => !!x);
  const mergedAllOf = [];
  allOf.forEach((schema) => {
    if (isJsonSchema7AllOfType(schema)) {
      mergedAllOf.push(...schema.allOf);
    } else {
      let nestedSchema = schema;
      if ("additionalProperties" in schema && schema.additionalProperties === false) {
        const { additionalProperties, ...rest } = schema;
        nestedSchema = rest;
      }
      mergedAllOf.push(nestedSchema);
    }
  });
  return mergedAllOf.length ? { allOf: mergedAllOf } : void 0;
}
function parseLiteralDef(def) {
  const parsedType = typeof def.value;
  if (parsedType !== "bigint" && parsedType !== "number" && parsedType !== "boolean" && parsedType !== "string") {
    return {
      type: Array.isArray(def.value) ? "array" : "object"
    };
  }
  return {
    type: parsedType === "bigint" ? "integer" : parsedType,
    const: def.value
  };
}
var emojiRegex = void 0;
var zodPatterns = {
  /**
   * `c` was changed to `[cC]` to replicate /i flag
   */
  cuid: /^[cC][^\s-]{8,}$/,
  cuid2: /^[0-9a-z]+$/,
  ulid: /^[0-9A-HJKMNP-TV-Z]{26}$/,
  /**
   * `a-z` was added to replicate /i flag
   */
  email: /^(?!\.)(?!.*\.\.)([a-zA-Z0-9_'+\-\.]*)[a-zA-Z0-9_+-]@([a-zA-Z0-9][a-zA-Z0-9\-]*\.)+[a-zA-Z]{2,}$/,
  /**
   * Constructed a valid Unicode RegExp
   *
   * Lazily instantiate since this type of regex isn't supported
   * in all envs (e.g. React Native).
   *
   * See:
   * https://github.com/colinhacks/zod/issues/2433
   * Fix in Zod:
   * https://github.com/colinhacks/zod/commit/9340fd51e48576a75adc919bff65dbc4a5d4c99b
   */
  emoji: () => {
    if (emojiRegex === void 0) {
      emojiRegex = RegExp(
        "^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$",
        "u"
      );
    }
    return emojiRegex;
  },
  /**
   * Unused
   */
  uuid: /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/,
  /**
   * Unused
   */
  ipv4: /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/,
  ipv4Cidr: /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/,
  /**
   * Unused
   */
  ipv6: /^(([a-f0-9]{1,4}:){7}|::([a-f0-9]{1,4}:){0,6}|([a-f0-9]{1,4}:){1}:([a-f0-9]{1,4}:){0,5}|([a-f0-9]{1,4}:){2}:([a-f0-9]{1,4}:){0,4}|([a-f0-9]{1,4}:){3}:([a-f0-9]{1,4}:){0,3}|([a-f0-9]{1,4}:){4}:([a-f0-9]{1,4}:){0,2}|([a-f0-9]{1,4}:){5}:([a-f0-9]{1,4}:){0,1})([a-f0-9]{1,4}|(((25[0-5])|(2[0-4][0-9])|(1[0-9]{2})|([0-9]{1,2}))\.){3}((25[0-5])|(2[0-4][0-9])|(1[0-9]{2})|([0-9]{1,2})))$/,
  ipv6Cidr: /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/,
  base64: /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/,
  base64url: /^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/,
  nanoid: /^[a-zA-Z0-9_-]{21}$/,
  jwt: /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/
};
function parseStringDef(def, refs) {
  const res = {
    type: "string"
  };
  if (def.checks) {
    for (const check of def.checks) {
      switch (check.kind) {
        case "min":
          res.minLength = typeof res.minLength === "number" ? Math.max(res.minLength, check.value) : check.value;
          break;
        case "max":
          res.maxLength = typeof res.maxLength === "number" ? Math.min(res.maxLength, check.value) : check.value;
          break;
        case "email":
          switch (refs.emailStrategy) {
            case "format:email":
              addFormat(res, "email", check.message, refs);
              break;
            case "format:idn-email":
              addFormat(res, "idn-email", check.message, refs);
              break;
            case "pattern:zod":
              addPattern(res, zodPatterns.email, check.message, refs);
              break;
          }
          break;
        case "url":
          addFormat(res, "uri", check.message, refs);
          break;
        case "uuid":
          addFormat(res, "uuid", check.message, refs);
          break;
        case "regex":
          addPattern(res, check.regex, check.message, refs);
          break;
        case "cuid":
          addPattern(res, zodPatterns.cuid, check.message, refs);
          break;
        case "cuid2":
          addPattern(res, zodPatterns.cuid2, check.message, refs);
          break;
        case "startsWith":
          addPattern(
            res,
            RegExp(`^${escapeLiteralCheckValue(check.value, refs)}`),
            check.message,
            refs
          );
          break;
        case "endsWith":
          addPattern(
            res,
            RegExp(`${escapeLiteralCheckValue(check.value, refs)}$`),
            check.message,
            refs
          );
          break;
        case "datetime":
          addFormat(res, "date-time", check.message, refs);
          break;
        case "date":
          addFormat(res, "date", check.message, refs);
          break;
        case "time":
          addFormat(res, "time", check.message, refs);
          break;
        case "duration":
          addFormat(res, "duration", check.message, refs);
          break;
        case "length":
          res.minLength = typeof res.minLength === "number" ? Math.max(res.minLength, check.value) : check.value;
          res.maxLength = typeof res.maxLength === "number" ? Math.min(res.maxLength, check.value) : check.value;
          break;
        case "includes": {
          addPattern(
            res,
            RegExp(escapeLiteralCheckValue(check.value, refs)),
            check.message,
            refs
          );
          break;
        }
        case "ip": {
          if (check.version !== "v6") {
            addFormat(res, "ipv4", check.message, refs);
          }
          if (check.version !== "v4") {
            addFormat(res, "ipv6", check.message, refs);
          }
          break;
        }
        case "base64url":
          addPattern(res, zodPatterns.base64url, check.message, refs);
          break;
        case "jwt":
          addPattern(res, zodPatterns.jwt, check.message, refs);
          break;
        case "cidr": {
          if (check.version !== "v6") {
            addPattern(res, zodPatterns.ipv4Cidr, check.message, refs);
          }
          if (check.version !== "v4") {
            addPattern(res, zodPatterns.ipv6Cidr, check.message, refs);
          }
          break;
        }
        case "emoji":
          addPattern(res, zodPatterns.emoji(), check.message, refs);
          break;
        case "ulid": {
          addPattern(res, zodPatterns.ulid, check.message, refs);
          break;
        }
        case "base64": {
          switch (refs.base64Strategy) {
            case "format:binary": {
              addFormat(res, "binary", check.message, refs);
              break;
            }
            case "contentEncoding:base64": {
              res.contentEncoding = "base64";
              break;
            }
            case "pattern:zod": {
              addPattern(res, zodPatterns.base64, check.message, refs);
              break;
            }
          }
          break;
        }
        case "nanoid": {
          addPattern(res, zodPatterns.nanoid, check.message, refs);
        }
      }
    }
  }
  return res;
}
function escapeLiteralCheckValue(literal, refs) {
  return refs.patternStrategy === "escape" ? escapeNonAlphaNumeric(literal) : literal;
}
var ALPHA_NUMERIC = new Set(
  "ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvxyz0123456789"
);
function escapeNonAlphaNumeric(source) {
  let result = "";
  for (let i = 0; i < source.length; i++) {
    if (!ALPHA_NUMERIC.has(source[i])) {
      result += "\\";
    }
    result += source[i];
  }
  return result;
}
function addFormat(schema, value, message, refs) {
  var _a22;
  if (schema.format || ((_a22 = schema.anyOf) == null ? void 0 : _a22.some((x) => x.format))) {
    if (!schema.anyOf) {
      schema.anyOf = [];
    }
    if (schema.format) {
      schema.anyOf.push({
        format: schema.format
      });
      delete schema.format;
    }
    schema.anyOf.push({
      format: value,
      ...message && refs.errorMessages && { errorMessage: { format: message } }
    });
  } else {
    schema.format = value;
  }
}
function addPattern(schema, regex, message, refs) {
  var _a22;
  if (schema.pattern || ((_a22 = schema.allOf) == null ? void 0 : _a22.some((x) => x.pattern))) {
    if (!schema.allOf) {
      schema.allOf = [];
    }
    if (schema.pattern) {
      schema.allOf.push({
        pattern: schema.pattern
      });
      delete schema.pattern;
    }
    schema.allOf.push({
      pattern: stringifyRegExpWithFlags(regex, refs),
      ...message && refs.errorMessages && { errorMessage: { pattern: message } }
    });
  } else {
    schema.pattern = stringifyRegExpWithFlags(regex, refs);
  }
}
function stringifyRegExpWithFlags(regex, refs) {
  var _a22;
  if (!refs.applyRegexFlags || !regex.flags) {
    return regex.source;
  }
  const flags = {
    i: regex.flags.includes("i"),
    // Case-insensitive
    m: regex.flags.includes("m"),
    // `^` and `$` matches adjacent to newline characters
    s: regex.flags.includes("s")
    // `.` matches newlines
  };
  const source = flags.i ? regex.source.toLowerCase() : regex.source;
  let pattern = "";
  let isEscaped = false;
  let inCharGroup = false;
  let inCharRange = false;
  for (let i = 0; i < source.length; i++) {
    if (isEscaped) {
      pattern += source[i];
      isEscaped = false;
      continue;
    }
    if (flags.i) {
      if (inCharGroup) {
        if (source[i].match(/[a-z]/)) {
          if (inCharRange) {
            pattern += source[i];
            pattern += `${source[i - 2]}-${source[i]}`.toUpperCase();
            inCharRange = false;
          } else if (source[i + 1] === "-" && ((_a22 = source[i + 2]) == null ? void 0 : _a22.match(/[a-z]/))) {
            pattern += source[i];
            inCharRange = true;
          } else {
            pattern += `${source[i]}${source[i].toUpperCase()}`;
          }
          continue;
        }
      } else if (source[i].match(/[a-z]/)) {
        pattern += `[${source[i]}${source[i].toUpperCase()}]`;
        continue;
      }
    }
    if (flags.m) {
      if (source[i] === "^") {
        pattern += `(^|(?<=[\r
]))`;
        continue;
      } else if (source[i] === "$") {
        pattern += `($|(?=[\r
]))`;
        continue;
      }
    }
    if (flags.s && source[i] === ".") {
      pattern += inCharGroup ? `${source[i]}\r
` : `[${source[i]}\r
]`;
      continue;
    }
    pattern += source[i];
    if (source[i] === "\\") {
      isEscaped = true;
    } else if (inCharGroup && source[i] === "]") {
      inCharGroup = false;
    } else if (!inCharGroup && source[i] === "[") {
      inCharGroup = true;
    }
  }
  return pattern;
}
function parseRecordDef(def, refs) {
  var _a22, _b22, _c, _d, _e, _f;
  const schema = {
    type: "object",
    additionalProperties: (_a22 = parseDef(def.valueType._def, {
      ...refs,
      currentPath: [...refs.currentPath, "additionalProperties"]
    })) != null ? _a22 : refs.allowedAdditionalProperties
  };
  if (((_b22 = def.keyType) == null ? void 0 : _b22._def.typeName) === ZodFirstPartyTypeKind.ZodString && ((_c = def.keyType._def.checks) == null ? void 0 : _c.length)) {
    const { type, ...keyType } = parseStringDef(def.keyType._def, refs);
    return {
      ...schema,
      propertyNames: keyType
    };
  } else if (((_d = def.keyType) == null ? void 0 : _d._def.typeName) === ZodFirstPartyTypeKind.ZodEnum) {
    return {
      ...schema,
      propertyNames: {
        enum: def.keyType._def.values
      }
    };
  } else if (((_e = def.keyType) == null ? void 0 : _e._def.typeName) === ZodFirstPartyTypeKind.ZodBranded && def.keyType._def.type._def.typeName === ZodFirstPartyTypeKind.ZodString && ((_f = def.keyType._def.type._def.checks) == null ? void 0 : _f.length)) {
    const { type, ...keyType } = parseBrandedDef(
      def.keyType._def,
      refs
    );
    return {
      ...schema,
      propertyNames: keyType
    };
  }
  return schema;
}
function parseMapDef(def, refs) {
  if (refs.mapStrategy === "record") {
    return parseRecordDef(def, refs);
  }
  const keys = parseDef(def.keyType._def, {
    ...refs,
    currentPath: [...refs.currentPath, "items", "items", "0"]
  }) || parseAnyDef();
  const values = parseDef(def.valueType._def, {
    ...refs,
    currentPath: [...refs.currentPath, "items", "items", "1"]
  }) || parseAnyDef();
  return {
    type: "array",
    maxItems: 125,
    items: {
      type: "array",
      items: [keys, values],
      minItems: 2,
      maxItems: 2
    }
  };
}
function parseNativeEnumDef(def) {
  const object = def.values;
  const actualKeys = Object.keys(def.values).filter((key) => {
    return typeof object[object[key]] !== "number";
  });
  const actualValues = actualKeys.map((key) => object[key]);
  const parsedTypes = Array.from(
    new Set(actualValues.map((values) => typeof values))
  );
  return {
    type: parsedTypes.length === 1 ? parsedTypes[0] === "string" ? "string" : "number" : ["string", "number"],
    enum: actualValues
  };
}
function parseNeverDef() {
  return { not: parseAnyDef() };
}
function parseNullDef() {
  return {
    type: "null"
  };
}
var primitiveMappings = {
  ZodString: "string",
  ZodNumber: "number",
  ZodBigInt: "integer",
  ZodBoolean: "boolean",
  ZodNull: "null"
};
function parseUnionDef(def, refs) {
  const options = def.options instanceof Map ? Array.from(def.options.values()) : def.options;
  if (options.every(
    (x) => x._def.typeName in primitiveMappings && (!x._def.checks || !x._def.checks.length)
  )) {
    const types = options.reduce((types2, x) => {
      const type = primitiveMappings[x._def.typeName];
      return type && !types2.includes(type) ? [...types2, type] : types2;
    }, []);
    return {
      type: types.length > 1 ? types : types[0]
    };
  } else if (options.every((x) => x._def.typeName === "ZodLiteral" && !x.description)) {
    const types = options.reduce(
      (acc, x) => {
        const type = typeof x._def.value;
        switch (type) {
          case "string":
          case "number":
          case "boolean":
            return [...acc, type];
          case "bigint":
            return [...acc, "integer"];
          case "object":
            if (x._def.value === null) return [...acc, "null"];
          case "symbol":
          case "undefined":
          case "function":
          default:
            return acc;
        }
      },
      []
    );
    if (types.length === options.length) {
      const uniqueTypes = types.filter((x, i, a) => a.indexOf(x) === i);
      return {
        type: uniqueTypes.length > 1 ? uniqueTypes : uniqueTypes[0],
        enum: options.reduce(
          (acc, x) => {
            return acc.includes(x._def.value) ? acc : [...acc, x._def.value];
          },
          []
        )
      };
    }
  } else if (options.every((x) => x._def.typeName === "ZodEnum")) {
    return {
      type: "string",
      enum: options.reduce(
        (acc, x) => [
          ...acc,
          ...x._def.values.filter((x2) => !acc.includes(x2))
        ],
        []
      )
    };
  }
  return asAnyOf(def, refs);
}
var asAnyOf = (def, refs) => {
  const anyOf = (def.options instanceof Map ? Array.from(def.options.values()) : def.options).map(
    (x, i) => parseDef(x._def, {
      ...refs,
      currentPath: [...refs.currentPath, "anyOf", `${i}`]
    })
  ).filter(
    (x) => !!x && (!refs.strictUnions || typeof x === "object" && Object.keys(x).length > 0)
  );
  return anyOf.length ? { anyOf } : void 0;
};
function parseNullableDef(def, refs) {
  if (["ZodString", "ZodNumber", "ZodBigInt", "ZodBoolean", "ZodNull"].includes(
    def.innerType._def.typeName
  ) && (!def.innerType._def.checks || !def.innerType._def.checks.length)) {
    return {
      type: [
        primitiveMappings[def.innerType._def.typeName],
        "null"
      ]
    };
  }
  const base = parseDef(def.innerType._def, {
    ...refs,
    currentPath: [...refs.currentPath, "anyOf", "0"]
  });
  return base && { anyOf: [base, { type: "null" }] };
}
function parseNumberDef(def) {
  const res = {
    type: "number"
  };
  if (!def.checks) return res;
  for (const check of def.checks) {
    switch (check.kind) {
      case "int":
        res.type = "integer";
        break;
      case "min":
        if (check.inclusive) {
          res.minimum = check.value;
        } else {
          res.exclusiveMinimum = check.value;
        }
        break;
      case "max":
        if (check.inclusive) {
          res.maximum = check.value;
        } else {
          res.exclusiveMaximum = check.value;
        }
        break;
      case "multipleOf":
        res.multipleOf = check.value;
        break;
    }
  }
  return res;
}
function parseObjectDef(def, refs) {
  const result = {
    type: "object",
    properties: {}
  };
  const required = [];
  const shape = def.shape();
  for (const propName in shape) {
    let propDef = shape[propName];
    if (propDef === void 0 || propDef._def === void 0) {
      continue;
    }
    const propOptional = safeIsOptional(propDef);
    const parsedDef = parseDef(propDef._def, {
      ...refs,
      currentPath: [...refs.currentPath, "properties", propName],
      propertyPath: [...refs.currentPath, "properties", propName]
    });
    if (parsedDef === void 0) {
      continue;
    }
    result.properties[propName] = parsedDef;
    if (!propOptional) {
      required.push(propName);
    }
  }
  if (required.length) {
    result.required = required;
  }
  const additionalProperties = decideAdditionalProperties(def, refs);
  if (additionalProperties !== void 0) {
    result.additionalProperties = additionalProperties;
  }
  return result;
}
function decideAdditionalProperties(def, refs) {
  if (def.catchall._def.typeName !== "ZodNever") {
    return parseDef(def.catchall._def, {
      ...refs,
      currentPath: [...refs.currentPath, "additionalProperties"]
    });
  }
  switch (def.unknownKeys) {
    case "passthrough":
      return refs.allowedAdditionalProperties;
    case "strict":
      return refs.rejectedAdditionalProperties;
    case "strip":
      return refs.removeAdditionalStrategy === "strict" ? refs.allowedAdditionalProperties : refs.rejectedAdditionalProperties;
  }
}
function safeIsOptional(schema) {
  try {
    return schema.isOptional();
  } catch (e) {
    return true;
  }
}
var parseOptionalDef = (def, refs) => {
  var _a22;
  if (refs.currentPath.toString() === ((_a22 = refs.propertyPath) == null ? void 0 : _a22.toString())) {
    return parseDef(def.innerType._def, refs);
  }
  const innerSchema = parseDef(def.innerType._def, {
    ...refs,
    currentPath: [...refs.currentPath, "anyOf", "1"]
  });
  return innerSchema ? { anyOf: [{ not: parseAnyDef() }, innerSchema] } : parseAnyDef();
};
var parsePipelineDef = (def, refs) => {
  if (refs.pipeStrategy === "input") {
    return parseDef(def.in._def, refs);
  } else if (refs.pipeStrategy === "output") {
    return parseDef(def.out._def, refs);
  }
  const a = parseDef(def.in._def, {
    ...refs,
    currentPath: [...refs.currentPath, "allOf", "0"]
  });
  const b = parseDef(def.out._def, {
    ...refs,
    currentPath: [...refs.currentPath, "allOf", a ? "1" : "0"]
  });
  return {
    allOf: [a, b].filter((x) => x !== void 0)
  };
};
function parsePromiseDef(def, refs) {
  return parseDef(def.type._def, refs);
}
function parseSetDef(def, refs) {
  const items = parseDef(def.valueType._def, {
    ...refs,
    currentPath: [...refs.currentPath, "items"]
  });
  const schema = {
    type: "array",
    uniqueItems: true,
    items
  };
  if (def.minSize) {
    schema.minItems = def.minSize.value;
  }
  if (def.maxSize) {
    schema.maxItems = def.maxSize.value;
  }
  return schema;
}
function parseTupleDef(def, refs) {
  if (def.rest) {
    return {
      type: "array",
      minItems: def.items.length,
      items: def.items.map(
        (x, i) => parseDef(x._def, {
          ...refs,
          currentPath: [...refs.currentPath, "items", `${i}`]
        })
      ).reduce(
        (acc, x) => x === void 0 ? acc : [...acc, x],
        []
      ),
      additionalItems: parseDef(def.rest._def, {
        ...refs,
        currentPath: [...refs.currentPath, "additionalItems"]
      })
    };
  } else {
    return {
      type: "array",
      minItems: def.items.length,
      maxItems: def.items.length,
      items: def.items.map(
        (x, i) => parseDef(x._def, {
          ...refs,
          currentPath: [...refs.currentPath, "items", `${i}`]
        })
      ).reduce(
        (acc, x) => x === void 0 ? acc : [...acc, x],
        []
      )
    };
  }
}
function parseUndefinedDef() {
  return {
    not: parseAnyDef()
  };
}
function parseUnknownDef() {
  return parseAnyDef();
}
var parseReadonlyDef = (def, refs) => {
  return parseDef(def.innerType._def, refs);
};
var selectParser = (def, typeName, refs) => {
  switch (typeName) {
    case ZodFirstPartyTypeKind.ZodString:
      return parseStringDef(def, refs);
    case ZodFirstPartyTypeKind.ZodNumber:
      return parseNumberDef(def);
    case ZodFirstPartyTypeKind.ZodObject:
      return parseObjectDef(def, refs);
    case ZodFirstPartyTypeKind.ZodBigInt:
      return parseBigintDef(def);
    case ZodFirstPartyTypeKind.ZodBoolean:
      return parseBooleanDef();
    case ZodFirstPartyTypeKind.ZodDate:
      return parseDateDef(def, refs);
    case ZodFirstPartyTypeKind.ZodUndefined:
      return parseUndefinedDef();
    case ZodFirstPartyTypeKind.ZodNull:
      return parseNullDef();
    case ZodFirstPartyTypeKind.ZodArray:
      return parseArrayDef(def, refs);
    case ZodFirstPartyTypeKind.ZodUnion:
    case ZodFirstPartyTypeKind.ZodDiscriminatedUnion:
      return parseUnionDef(def, refs);
    case ZodFirstPartyTypeKind.ZodIntersection:
      return parseIntersectionDef(def, refs);
    case ZodFirstPartyTypeKind.ZodTuple:
      return parseTupleDef(def, refs);
    case ZodFirstPartyTypeKind.ZodRecord:
      return parseRecordDef(def, refs);
    case ZodFirstPartyTypeKind.ZodLiteral:
      return parseLiteralDef(def);
    case ZodFirstPartyTypeKind.ZodEnum:
      return parseEnumDef(def);
    case ZodFirstPartyTypeKind.ZodNativeEnum:
      return parseNativeEnumDef(def);
    case ZodFirstPartyTypeKind.ZodNullable:
      return parseNullableDef(def, refs);
    case ZodFirstPartyTypeKind.ZodOptional:
      return parseOptionalDef(def, refs);
    case ZodFirstPartyTypeKind.ZodMap:
      return parseMapDef(def, refs);
    case ZodFirstPartyTypeKind.ZodSet:
      return parseSetDef(def, refs);
    case ZodFirstPartyTypeKind.ZodLazy:
      return () => def.getter()._def;
    case ZodFirstPartyTypeKind.ZodPromise:
      return parsePromiseDef(def, refs);
    case ZodFirstPartyTypeKind.ZodNaN:
    case ZodFirstPartyTypeKind.ZodNever:
      return parseNeverDef();
    case ZodFirstPartyTypeKind.ZodEffects:
      return parseEffectsDef(def, refs);
    case ZodFirstPartyTypeKind.ZodAny:
      return parseAnyDef();
    case ZodFirstPartyTypeKind.ZodUnknown:
      return parseUnknownDef();
    case ZodFirstPartyTypeKind.ZodDefault:
      return parseDefaultDef(def, refs);
    case ZodFirstPartyTypeKind.ZodBranded:
      return parseBrandedDef(def, refs);
    case ZodFirstPartyTypeKind.ZodReadonly:
      return parseReadonlyDef(def, refs);
    case ZodFirstPartyTypeKind.ZodCatch:
      return parseCatchDef(def, refs);
    case ZodFirstPartyTypeKind.ZodPipeline:
      return parsePipelineDef(def, refs);
    case ZodFirstPartyTypeKind.ZodFunction:
    case ZodFirstPartyTypeKind.ZodVoid:
    case ZodFirstPartyTypeKind.ZodSymbol:
      return void 0;
    default:
      return /* @__PURE__ */ ((_) => void 0)();
  }
};
function parseDef(def, refs, forceResolution = false) {
  var _a22;
  const seenItem = refs.seen.get(def);
  if (refs.override) {
    const overrideResult = (_a22 = refs.override) == null ? void 0 : _a22.call(
      refs,
      def,
      refs,
      seenItem,
      forceResolution
    );
    if (overrideResult !== ignoreOverride) {
      return overrideResult;
    }
  }
  if (seenItem && !forceResolution) {
    const seenSchema = get$ref(seenItem, refs);
    if (seenSchema !== void 0) {
      return seenSchema;
    }
  }
  const newItem = { def, path: refs.currentPath, jsonSchema: void 0 };
  refs.seen.set(def, newItem);
  const jsonSchemaOrGetter = selectParser(def, def.typeName, refs);
  const jsonSchema2 = typeof jsonSchemaOrGetter === "function" ? parseDef(jsonSchemaOrGetter(), refs) : jsonSchemaOrGetter;
  if (jsonSchema2) {
    addMeta(def, refs, jsonSchema2);
  }
  if (refs.postProcess) {
    const postProcessResult = refs.postProcess(jsonSchema2, def, refs);
    newItem.jsonSchema = jsonSchema2;
    return postProcessResult;
  }
  newItem.jsonSchema = jsonSchema2;
  return jsonSchema2;
}
var get$ref = (item, refs) => {
  switch (refs.$refStrategy) {
    case "root":
      return { $ref: item.path.join("/") };
    case "relative":
      return { $ref: getRelativePath(refs.currentPath, item.path) };
    case "none":
    case "seen": {
      if (item.path.length < refs.currentPath.length && item.path.every((value, index) => refs.currentPath[index] === value)) {
        console.warn(
          `Recursive reference detected at ${refs.currentPath.join(
            "/"
          )}! Defaulting to any`
        );
        return parseAnyDef();
      }
      return refs.$refStrategy === "seen" ? parseAnyDef() : void 0;
    }
  }
};
var addMeta = (def, refs, jsonSchema2) => {
  if (def.description) {
    jsonSchema2.description = def.description;
  }
  return jsonSchema2;
};
var getRefs = (options) => {
  const _options = getDefaultOptions(options);
  const currentPath = _options.name !== void 0 ? [..._options.basePath, _options.definitionPath, _options.name] : _options.basePath;
  return {
    ..._options,
    currentPath,
    propertyPath: void 0,
    seen: new Map(
      Object.entries(_options.definitions).map(([name22, def]) => [
        def._def,
        {
          def: def._def,
          path: [..._options.basePath, _options.definitionPath, name22],
          // Resolution of references will be forced even though seen, so it's ok that the schema is undefined here for now.
          jsonSchema: void 0
        }
      ])
    )
  };
};
var zodToJsonSchema = (schema, options) => {
  var _a22;
  const refs = getRefs(options);
  let definitions = typeof options === "object" && options.definitions ? Object.entries(options.definitions).reduce(
    (acc, [name32, schema2]) => {
      var _a32;
      return {
        ...acc,
        [name32]: (_a32 = parseDef(
          schema2._def,
          {
            ...refs,
            currentPath: [...refs.basePath, refs.definitionPath, name32]
          },
          true
        )) != null ? _a32 : parseAnyDef()
      };
    },
    {}
  ) : void 0;
  const name22 = typeof options === "string" ? options : (options == null ? void 0 : options.nameStrategy) === "title" ? void 0 : options == null ? void 0 : options.name;
  const main = (_a22 = parseDef(
    schema._def,
    name22 === void 0 ? refs : {
      ...refs,
      currentPath: [...refs.basePath, refs.definitionPath, name22]
    },
    false
  )) != null ? _a22 : parseAnyDef();
  const title = typeof options === "object" && options.name !== void 0 && options.nameStrategy === "title" ? options.name : void 0;
  if (title !== void 0) {
    main.title = title;
  }
  const combined = name22 === void 0 ? definitions ? {
    ...main,
    [refs.definitionPath]: definitions
  } : main : {
    $ref: [
      ...refs.$refStrategy === "relative" ? [] : refs.basePath,
      refs.definitionPath,
      name22
    ].join("/"),
    [refs.definitionPath]: {
      ...definitions,
      [name22]: main
    }
  };
  combined.$schema = "http://json-schema.org/draft-07/schema#";
  return combined;
};
var zod_to_json_schema_default = zodToJsonSchema;
function zod3Schema(zodSchema2, options) {
  var _a22;
  const useReferences = (_a22 = void 0 ) != null ? _a22 : false;
  return jsonSchema(
    // defer json schema creation to avoid unnecessary computation when only validation is needed
    () => zod_to_json_schema_default(zodSchema2, {
      $refStrategy: useReferences ? "root" : "none"
    }),
    {
      validate: async (value) => {
        const result = await zodSchema2.safeParseAsync(value);
        return result.success ? { success: true, value: result.data } : { success: false, error: result.error };
      }
    }
  );
}
function zod4Schema(zodSchema2, options) {
  var _a22;
  const useReferences = (_a22 = void 0 ) != null ? _a22 : false;
  return jsonSchema(
    // defer json schema creation to avoid unnecessary computation when only validation is needed
    () => addAdditionalPropertiesToJsonSchema(
      toJSONSchema(zodSchema2, {
        target: "draft-7",
        io: "input",
        reused: useReferences ? "ref" : "inline"
      })
    ),
    {
      validate: async (value) => {
        const result = await safeParseAsync(zodSchema2, value);
        return result.success ? { success: true, value: result.data } : { success: false, error: result.error };
      }
    }
  );
}
function isZod4Schema(zodSchema2) {
  return "_zod" in zodSchema2;
}
function zodSchema(zodSchema2, options) {
  if (isZod4Schema(zodSchema2)) {
    return zod4Schema(zodSchema2);
  } else {
    return zod3Schema(zodSchema2);
  }
}
var schemaSymbol = /* @__PURE__ */ Symbol.for("vercel.ai.schema");
function lazySchema(createSchema) {
  let schema;
  return () => {
    if (schema == null) {
      schema = createSchema();
    }
    return schema;
  };
}
function jsonSchema(jsonSchema2, {
  validate
} = {}) {
  return {
    [schemaSymbol]: true,
    _type: void 0,
    // should never be used directly
    [validatorSymbol]: true,
    get jsonSchema() {
      if (typeof jsonSchema2 === "function") {
        jsonSchema2 = jsonSchema2();
      }
      return jsonSchema2;
    },
    validate
  };
}
function isSchema(value) {
  return typeof value === "object" && value !== null && schemaSymbol in value && value[schemaSymbol] === true && "jsonSchema" in value && "validate" in value;
}
function asSchema(schema) {
  return schema == null ? jsonSchema({
    properties: {},
    additionalProperties: false
  }) : isSchema(schema) ? schema : typeof schema === "function" ? schema() : zodSchema(schema);
}
function withoutTrailingSlash(url) {
  return url == null ? void 0 : url.replace(/\/$/, "");
}

var require_get_context = __commonJS({
  "../../../node_modules/.pnpm/@vercel+oidc@3.1.0/node_modules/@vercel/oidc/dist/get-context.js"(exports$1, module) {
    var __defProp2 = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export2 = (target, all) => {
      for (var name16 in all)
        __defProp2(target, name16, { get: all[name16], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp2(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp2({}, "__esModule", { value: true }), mod);
    var get_context_exports = {};
    __export2(get_context_exports, {
      SYMBOL_FOR_REQ_CONTEXT: () => SYMBOL_FOR_REQ_CONTEXT,
      getContext: () => getContext3
    });
    module.exports = __toCommonJS(get_context_exports);
    var SYMBOL_FOR_REQ_CONTEXT = /* @__PURE__ */ Symbol.for("@vercel/request-context");
    function getContext3() {
      const fromSymbol = globalThis;
      return fromSymbol[SYMBOL_FOR_REQ_CONTEXT]?.get?.() ?? {};
    }
  }
});
var require_get_vercel_oidc_token = __commonJS({
  "../../../node_modules/.pnpm/@vercel+oidc@3.1.0/node_modules/@vercel/oidc/dist/get-vercel-oidc-token.js"(exports$1, module) {
    var __defProp2 = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export2 = (target, all) => {
      for (var name16 in all)
        __defProp2(target, name16, { get: all[name16], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp2(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp2({}, "__esModule", { value: true }), mod);
    var get_vercel_oidc_token_exports = {};
    __export2(get_vercel_oidc_token_exports, {
      getVercelOidcToken: () => getVercelOidcToken3,
      getVercelOidcTokenSync: () => getVercelOidcTokenSync2
    });
    module.exports = __toCommonJS(get_vercel_oidc_token_exports);
    var import_get_context = require_get_context();
    var import_token_error = require_token_error();
    async function getVercelOidcToken3() {
      let token = "";
      let err;
      try {
        token = getVercelOidcTokenSync2();
      } catch (error) {
        err = error;
      }
      try {
        const [{ getTokenPayload, isExpired }, { refreshToken }] = await Promise.all([
          await import('./token-util-RMHT2CPJ-VVUHOXBL.mjs'),
          await import('./token-APYSY3BW-RPVF55TR.mjs')
        ]);
        if (!token || isExpired(getTokenPayload(token))) {
          await refreshToken();
          token = getVercelOidcTokenSync2();
        }
      } catch (error) {
        let message = err instanceof Error ? err.message : "";
        if (error instanceof Error) {
          message = `${message}
${error.message}`;
        }
        if (message) {
          throw new import_token_error.VercelOidcTokenError(message);
        }
        throw error;
      }
      return token;
    }
    function getVercelOidcTokenSync2() {
      const token = (0, import_get_context.getContext)().headers?.["x-vercel-oidc-token"] ?? process.env.VERCEL_OIDC_TOKEN;
      if (!token) {
        throw new Error(
          `The 'x-vercel-oidc-token' header is missing from the request. Do you have the OIDC option enabled in the Vercel project settings?`
        );
      }
      return token;
    }
  }
});
var require_dist = __commonJS({
  "../../../node_modules/.pnpm/@vercel+oidc@3.1.0/node_modules/@vercel/oidc/dist/index.js"(exports$1, module) {
    var __defProp2 = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export2 = (target, all) => {
      for (var name16 in all)
        __defProp2(target, name16, { get: all[name16], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp2(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp2({}, "__esModule", { value: true }), mod);
    var src_exports = {};
    __export2(src_exports, {
      getContext: () => import_get_context.getContext,
      getVercelOidcToken: () => import_get_vercel_oidc_token.getVercelOidcToken,
      getVercelOidcTokenSync: () => import_get_vercel_oidc_token.getVercelOidcTokenSync
    });
    module.exports = __toCommonJS(src_exports);
    var import_get_vercel_oidc_token = require_get_vercel_oidc_token();
    var import_get_context = require_get_context();
  }
});
var import_oidc = __toESM(require_dist(), 1);
var import_oidc2 = __toESM(require_dist(), 1);
var marker = "vercel.ai.gateway.error";
var symbol = Symbol.for(marker);
var _a;
var _b;
var GatewayError = class _GatewayError extends (_b = Error, _a = symbol, _b) {
  constructor({
    message,
    statusCode = 500,
    cause
  }) {
    super(message);
    this[_a] = true;
    this.statusCode = statusCode;
    this.cause = cause;
  }
  /**
   * Checks if the given error is a Gateway Error.
   * @param {unknown} error - The error to check.
   * @returns {boolean} True if the error is a Gateway Error, false otherwise.
   */
  static isInstance(error) {
    return _GatewayError.hasMarker(error);
  }
  static hasMarker(error) {
    return typeof error === "object" && error !== null && symbol in error && error[symbol] === true;
  }
};
var name = "GatewayAuthenticationError";
var marker2 = `vercel.ai.gateway.error.${name}`;
var symbol2 = Symbol.for(marker2);
var _a2;
var _b2;
var GatewayAuthenticationError = class _GatewayAuthenticationError extends (_b2 = GatewayError, _a2 = symbol2, _b2) {
  constructor({
    message = "Authentication failed",
    statusCode = 401,
    cause
  } = {}) {
    super({ message, statusCode, cause });
    this[_a2] = true;
    this.name = name;
    this.type = "authentication_error";
  }
  static isInstance(error) {
    return GatewayError.hasMarker(error) && symbol2 in error;
  }
  /**
   * Creates a contextual error message when authentication fails
   */
  static createContextualError({
    apiKeyProvided,
    oidcTokenProvided,
    message = "Authentication failed",
    statusCode = 401,
    cause
  }) {
    let contextualMessage;
    if (apiKeyProvided) {
      contextualMessage = `AI Gateway authentication failed: Invalid API key.

Create a new API key: https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai%2Fapi-keys

Provide via 'apiKey' option or 'AI_GATEWAY_API_KEY' environment variable.`;
    } else if (oidcTokenProvided) {
      contextualMessage = `AI Gateway authentication failed: Invalid OIDC token.

Run 'npx vercel link' to link your project, then 'vc env pull' to fetch the token.

Alternatively, use an API key: https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai%2Fapi-keys`;
    } else {
      contextualMessage = `AI Gateway authentication failed: No authentication provided.

Option 1 - API key:
Create an API key: https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai%2Fapi-keys
Provide via 'apiKey' option or 'AI_GATEWAY_API_KEY' environment variable.

Option 2 - OIDC token:
Run 'npx vercel link' to link your project, then 'vc env pull' to fetch the token.`;
    }
    return new _GatewayAuthenticationError({
      message: contextualMessage,
      statusCode,
      cause
    });
  }
};
var name2 = "GatewayInvalidRequestError";
var marker3 = `vercel.ai.gateway.error.${name2}`;
var symbol3 = Symbol.for(marker3);
var _a3;
var _b3;
var GatewayInvalidRequestError = class extends (_b3 = GatewayError, _a3 = symbol3, _b3) {
  constructor({
    message = "Invalid request",
    statusCode = 400,
    cause
  } = {}) {
    super({ message, statusCode, cause });
    this[_a3] = true;
    this.name = name2;
    this.type = "invalid_request_error";
  }
  static isInstance(error) {
    return GatewayError.hasMarker(error) && symbol3 in error;
  }
};
var name3 = "GatewayRateLimitError";
var marker4 = `vercel.ai.gateway.error.${name3}`;
var symbol4 = Symbol.for(marker4);
var _a4;
var _b4;
var GatewayRateLimitError = class extends (_b4 = GatewayError, _a4 = symbol4, _b4) {
  constructor({
    message = "Rate limit exceeded",
    statusCode = 429,
    cause
  } = {}) {
    super({ message, statusCode, cause });
    this[_a4] = true;
    this.name = name3;
    this.type = "rate_limit_exceeded";
  }
  static isInstance(error) {
    return GatewayError.hasMarker(error) && symbol4 in error;
  }
};
var name4 = "GatewayModelNotFoundError";
var marker5 = `vercel.ai.gateway.error.${name4}`;
var symbol5 = Symbol.for(marker5);
var modelNotFoundParamSchema = lazyValidator(
  () => zodSchema(
    object$1({
      modelId: string()
    })
  )
);
var _a5;
var _b5;
var GatewayModelNotFoundError = class extends (_b5 = GatewayError, _a5 = symbol5, _b5) {
  constructor({
    message = "Model not found",
    statusCode = 404,
    modelId,
    cause
  } = {}) {
    super({ message, statusCode, cause });
    this[_a5] = true;
    this.name = name4;
    this.type = "model_not_found";
    this.modelId = modelId;
  }
  static isInstance(error) {
    return GatewayError.hasMarker(error) && symbol5 in error;
  }
};
var name5 = "GatewayInternalServerError";
var marker6 = `vercel.ai.gateway.error.${name5}`;
var symbol6 = Symbol.for(marker6);
var _a6;
var _b6;
var GatewayInternalServerError = class extends (_b6 = GatewayError, _a6 = symbol6, _b6) {
  constructor({
    message = "Internal server error",
    statusCode = 500,
    cause
  } = {}) {
    super({ message, statusCode, cause });
    this[_a6] = true;
    this.name = name5;
    this.type = "internal_server_error";
  }
  static isInstance(error) {
    return GatewayError.hasMarker(error) && symbol6 in error;
  }
};
var name6 = "GatewayResponseError";
var marker7 = `vercel.ai.gateway.error.${name6}`;
var symbol7 = Symbol.for(marker7);
var _a7;
var _b7;
var GatewayResponseError = class extends (_b7 = GatewayError, _a7 = symbol7, _b7) {
  constructor({
    message = "Invalid response from Gateway",
    statusCode = 502,
    response,
    validationError,
    cause
  } = {}) {
    super({ message, statusCode, cause });
    this[_a7] = true;
    this.name = name6;
    this.type = "response_error";
    this.response = response;
    this.validationError = validationError;
  }
  static isInstance(error) {
    return GatewayError.hasMarker(error) && symbol7 in error;
  }
};
async function createGatewayErrorFromResponse({
  response,
  statusCode,
  defaultMessage = "Gateway request failed",
  cause,
  authMethod
}) {
  const parseResult = await safeValidateTypes({
    value: response,
    schema: gatewayErrorResponseSchema
  });
  if (!parseResult.success) {
    return new GatewayResponseError({
      message: `Invalid error response format: ${defaultMessage}`,
      statusCode,
      response,
      validationError: parseResult.error,
      cause
    });
  }
  const validatedResponse = parseResult.value;
  const errorType = validatedResponse.error.type;
  const message = validatedResponse.error.message;
  switch (errorType) {
    case "authentication_error":
      return GatewayAuthenticationError.createContextualError({
        apiKeyProvided: authMethod === "api-key",
        oidcTokenProvided: authMethod === "oidc",
        statusCode,
        cause
      });
    case "invalid_request_error":
      return new GatewayInvalidRequestError({ message, statusCode, cause });
    case "rate_limit_exceeded":
      return new GatewayRateLimitError({ message, statusCode, cause });
    case "model_not_found": {
      const modelResult = await safeValidateTypes({
        value: validatedResponse.error.param,
        schema: modelNotFoundParamSchema
      });
      return new GatewayModelNotFoundError({
        message,
        statusCode,
        modelId: modelResult.success ? modelResult.value.modelId : void 0,
        cause
      });
    }
    case "internal_server_error":
      return new GatewayInternalServerError({ message, statusCode, cause });
    default:
      return new GatewayInternalServerError({ message, statusCode, cause });
  }
}
var gatewayErrorResponseSchema = lazyValidator(
  () => zodSchema(
    object$1({
      error: object$1({
        message: string(),
        type: string().nullish(),
        param: unknown().nullish(),
        code: union([string(), number()]).nullish()
      })
    })
  )
);
var name7 = "GatewayTimeoutError";
var marker8 = `vercel.ai.gateway.error.${name7}`;
var symbol8 = Symbol.for(marker8);
var _a8;
var _b8;
var GatewayTimeoutError = class _GatewayTimeoutError extends (_b8 = GatewayError, _a8 = symbol8, _b8) {
  constructor({
    message = "Request timed out",
    statusCode = 408,
    cause
  } = {}) {
    super({ message, statusCode, cause });
    this[_a8] = true;
    this.name = name7;
    this.type = "timeout_error";
  }
  static isInstance(error) {
    return GatewayError.hasMarker(error) && symbol8 in error;
  }
  /**
   * Creates a helpful timeout error message with troubleshooting guidance
   */
  static createTimeoutError({
    originalMessage,
    statusCode = 408,
    cause
  }) {
    const message = `Gateway request timed out: ${originalMessage}

    This is a client-side timeout. To resolve this, increase your timeout configuration: https://vercel.com/docs/ai-gateway/capabilities/video-generation#extending-timeouts-for-node.js`;
    return new _GatewayTimeoutError({
      message,
      statusCode,
      cause
    });
  }
};
function isTimeoutError(error) {
  if (!(error instanceof Error)) {
    return false;
  }
  const errorCode = error.code;
  if (typeof errorCode === "string") {
    const undiciTimeoutCodes = [
      "UND_ERR_HEADERS_TIMEOUT",
      "UND_ERR_BODY_TIMEOUT",
      "UND_ERR_CONNECT_TIMEOUT"
    ];
    return undiciTimeoutCodes.includes(errorCode);
  }
  return false;
}
async function asGatewayError(error, authMethod) {
  var _a93;
  if (GatewayError.isInstance(error)) {
    return error;
  }
  if (isTimeoutError(error)) {
    return GatewayTimeoutError.createTimeoutError({
      originalMessage: error instanceof Error ? error.message : "Unknown error",
      cause: error
    });
  }
  if (APICallError.isInstance(error)) {
    if (error.cause && isTimeoutError(error.cause)) {
      return GatewayTimeoutError.createTimeoutError({
        originalMessage: error.message,
        cause: error
      });
    }
    return await createGatewayErrorFromResponse({
      response: extractApiCallResponse(error),
      statusCode: (_a93 = error.statusCode) != null ? _a93 : 500,
      defaultMessage: "Gateway request failed",
      cause: error,
      authMethod
    });
  }
  return await createGatewayErrorFromResponse({
    response: {},
    statusCode: 500,
    defaultMessage: error instanceof Error ? `Gateway request failed: ${error.message}` : "Unknown Gateway error",
    cause: error,
    authMethod
  });
}
function extractApiCallResponse(error) {
  if (error.data !== void 0) {
    return error.data;
  }
  if (error.responseBody != null) {
    try {
      return JSON.parse(error.responseBody);
    } catch (e) {
      return error.responseBody;
    }
  }
  return {};
}
var GATEWAY_AUTH_METHOD_HEADER = "ai-gateway-auth-method";
async function parseAuthMethod(headers) {
  const result = await safeValidateTypes({
    value: headers[GATEWAY_AUTH_METHOD_HEADER],
    schema: gatewayAuthMethodSchema
  });
  return result.success ? result.value : void 0;
}
var gatewayAuthMethodSchema = lazyValidator(
  () => zodSchema(union([literal("api-key"), literal("oidc")]))
);
var GatewayFetchMetadata = class {
  constructor(config) {
    this.config = config;
  }
  async getAvailableModels() {
    try {
      const { value } = await getFromApi({
        url: `${this.config.baseURL}/config`,
        headers: await resolve(this.config.headers()),
        successfulResponseHandler: createJsonResponseHandler(
          gatewayAvailableModelsResponseSchema
        ),
        failedResponseHandler: createJsonErrorResponseHandler({
          errorSchema: any(),
          errorToMessage: (data) => data
        }),
        fetch: this.config.fetch
      });
      return value;
    } catch (error) {
      throw await asGatewayError(error);
    }
  }
  async getCredits() {
    try {
      const baseUrl = new URL(this.config.baseURL);
      const { value } = await getFromApi({
        url: `${baseUrl.origin}/v1/credits`,
        headers: await resolve(this.config.headers()),
        successfulResponseHandler: createJsonResponseHandler(
          gatewayCreditsResponseSchema
        ),
        failedResponseHandler: createJsonErrorResponseHandler({
          errorSchema: any(),
          errorToMessage: (data) => data
        }),
        fetch: this.config.fetch
      });
      return value;
    } catch (error) {
      throw await asGatewayError(error);
    }
  }
};
var gatewayAvailableModelsResponseSchema = lazyValidator(
  () => zodSchema(
    object$1({
      models: array(
        object$1({
          id: string(),
          name: string(),
          description: string().nullish(),
          pricing: object$1({
            input: string(),
            output: string(),
            input_cache_read: string().nullish(),
            input_cache_write: string().nullish()
          }).transform(
            ({ input, output, input_cache_read, input_cache_write }) => ({
              input,
              output,
              ...input_cache_read ? { cachedInputTokens: input_cache_read } : {},
              ...input_cache_write ? { cacheCreationInputTokens: input_cache_write } : {}
            })
          ).nullish(),
          specification: object$1({
            specificationVersion: literal("v2"),
            provider: string(),
            modelId: string()
          }),
          modelType: _enum(["language", "embedding", "image"]).nullish()
        })
      )
    })
  )
);
var gatewayCreditsResponseSchema = lazyValidator(
  () => zodSchema(
    object$1({
      balance: string(),
      total_used: string()
    }).transform(({ balance, total_used }) => ({
      balance,
      totalUsed: total_used
    }))
  )
);
var GatewayLanguageModel = class {
  constructor(modelId, config) {
    this.modelId = modelId;
    this.config = config;
    this.specificationVersion = "v2";
    this.supportedUrls = { "*/*": [/.*/] };
  }
  get provider() {
    return this.config.provider;
  }
  async getArgs(options) {
    const { abortSignal: _abortSignal, ...optionsWithoutSignal } = options;
    return {
      args: this.maybeEncodeFileParts(optionsWithoutSignal),
      warnings: []
    };
  }
  async doGenerate(options) {
    const { args, warnings } = await this.getArgs(options);
    const { abortSignal } = options;
    const resolvedHeaders = await resolve(this.config.headers());
    try {
      const {
        responseHeaders,
        value: responseBody,
        rawValue: rawResponse
      } = await postJsonToApi({
        url: this.getUrl(),
        headers: combineHeaders(
          resolvedHeaders,
          options.headers,
          this.getModelConfigHeaders(this.modelId, false),
          await resolve(this.config.o11yHeaders)
        ),
        body: args,
        successfulResponseHandler: createJsonResponseHandler(any()),
        failedResponseHandler: createJsonErrorResponseHandler({
          errorSchema: any(),
          errorToMessage: (data) => data
        }),
        ...abortSignal && { abortSignal },
        fetch: this.config.fetch
      });
      return {
        ...responseBody,
        request: { body: args },
        response: { headers: responseHeaders, body: rawResponse },
        warnings
      };
    } catch (error) {
      throw await asGatewayError(error, await parseAuthMethod(resolvedHeaders));
    }
  }
  async doStream(options) {
    const { args, warnings } = await this.getArgs(options);
    const { abortSignal } = options;
    const resolvedHeaders = await resolve(this.config.headers());
    try {
      const { value: response, responseHeaders } = await postJsonToApi({
        url: this.getUrl(),
        headers: combineHeaders(
          resolvedHeaders,
          options.headers,
          this.getModelConfigHeaders(this.modelId, true),
          await resolve(this.config.o11yHeaders)
        ),
        body: args,
        successfulResponseHandler: createEventSourceResponseHandler(any()),
        failedResponseHandler: createJsonErrorResponseHandler({
          errorSchema: any(),
          errorToMessage: (data) => data
        }),
        ...abortSignal && { abortSignal },
        fetch: this.config.fetch
      });
      return {
        stream: response.pipeThrough(
          new TransformStream({
            start(controller) {
              if (warnings.length > 0) {
                controller.enqueue({ type: "stream-start", warnings });
              }
            },
            transform(chunk, controller) {
              if (chunk.success) {
                const streamPart = chunk.value;
                if (streamPart.type === "raw" && !options.includeRawChunks) {
                  return;
                }
                if (streamPart.type === "response-metadata" && streamPart.timestamp && typeof streamPart.timestamp === "string") {
                  streamPart.timestamp = new Date(streamPart.timestamp);
                }
                controller.enqueue(streamPart);
              } else {
                controller.error(
                  chunk.error
                );
              }
            }
          })
        ),
        request: { body: args },
        response: { headers: responseHeaders }
      };
    } catch (error) {
      throw await asGatewayError(error, await parseAuthMethod(resolvedHeaders));
    }
  }
  isFilePart(part) {
    return part && typeof part === "object" && "type" in part && part.type === "file";
  }
  /**
   * Encodes file parts in the prompt to base64. Mutates the passed options
   * instance directly to avoid copying the file data.
   * @param options - The options to encode.
   * @returns The options with the file parts encoded.
   */
  maybeEncodeFileParts(options) {
    for (const message of options.prompt) {
      for (const part of message.content) {
        if (this.isFilePart(part)) {
          const filePart = part;
          if (filePart.data instanceof Uint8Array) {
            const buffer = Uint8Array.from(filePart.data);
            const base64Data = Buffer.from(buffer).toString("base64");
            filePart.data = new URL(
              `data:${filePart.mediaType || "application/octet-stream"};base64,${base64Data}`
            );
          }
        }
      }
    }
    return options;
  }
  getUrl() {
    return `${this.config.baseURL}/language-model`;
  }
  getModelConfigHeaders(modelId, streaming) {
    return {
      "ai-language-model-specification-version": "2",
      "ai-language-model-id": modelId,
      "ai-language-model-streaming": String(streaming)
    };
  }
};
var GatewayEmbeddingModel = class {
  constructor(modelId, config) {
    this.modelId = modelId;
    this.config = config;
    this.specificationVersion = "v2";
    this.maxEmbeddingsPerCall = 2048;
    this.supportsParallelCalls = true;
  }
  get provider() {
    return this.config.provider;
  }
  async doEmbed({
    values,
    headers,
    abortSignal,
    providerOptions
  }) {
    var _a93;
    const resolvedHeaders = await resolve(this.config.headers());
    try {
      const {
        responseHeaders,
        value: responseBody,
        rawValue
      } = await postJsonToApi({
        url: this.getUrl(),
        headers: combineHeaders(
          resolvedHeaders,
          headers != null ? headers : {},
          this.getModelConfigHeaders(),
          await resolve(this.config.o11yHeaders)
        ),
        body: {
          input: values.length === 1 ? values[0] : values,
          ...providerOptions ? { providerOptions } : {}
        },
        successfulResponseHandler: createJsonResponseHandler(
          gatewayEmbeddingResponseSchema
        ),
        failedResponseHandler: createJsonErrorResponseHandler({
          errorSchema: any(),
          errorToMessage: (data) => data
        }),
        ...abortSignal && { abortSignal },
        fetch: this.config.fetch
      });
      return {
        embeddings: responseBody.embeddings,
        usage: (_a93 = responseBody.usage) != null ? _a93 : void 0,
        providerMetadata: responseBody.providerMetadata,
        response: { headers: responseHeaders, body: rawValue }
      };
    } catch (error) {
      throw await asGatewayError(error, await parseAuthMethod(resolvedHeaders));
    }
  }
  getUrl() {
    return `${this.config.baseURL}/embedding-model`;
  }
  getModelConfigHeaders() {
    return {
      "ai-embedding-model-specification-version": "2",
      "ai-model-id": this.modelId
    };
  }
};
var gatewayEmbeddingResponseSchema = lazyValidator(
  () => zodSchema(
    object$1({
      embeddings: array(array(number())),
      usage: object$1({ tokens: number() }).nullish(),
      providerMetadata: record(string(), record(string(), unknown())).optional()
    })
  )
);
var GatewayImageModel = class {
  constructor(modelId, config) {
    this.modelId = modelId;
    this.config = config;
    this.specificationVersion = "v2";
    this.maxImagesPerCall = Number.MAX_SAFE_INTEGER;
  }
  get provider() {
    return this.config.provider;
  }
  async doGenerate({
    prompt,
    n,
    size,
    aspectRatio,
    seed,
    providerOptions,
    headers,
    abortSignal
  }) {
    var _a93, _b9, _c, _d;
    const resolvedHeaders = await resolve(this.config.headers());
    try {
      const {
        responseHeaders,
        value: responseBody
      } = await postJsonToApi({
        url: this.getUrl(),
        headers: combineHeaders(
          resolvedHeaders,
          headers != null ? headers : {},
          this.getModelConfigHeaders(),
          await resolve(this.config.o11yHeaders)
        ),
        body: {
          prompt,
          n,
          ...size && { size },
          ...aspectRatio && { aspectRatio },
          ...seed && { seed },
          ...providerOptions && { providerOptions }
        },
        successfulResponseHandler: createJsonResponseHandler(
          gatewayImageResponseSchema
        ),
        failedResponseHandler: createJsonErrorResponseHandler({
          errorSchema: any(),
          errorToMessage: (data) => data
        }),
        ...abortSignal && { abortSignal },
        fetch: this.config.fetch
      });
      return {
        images: responseBody.images,
        // Always base64 strings from server
        warnings: (_a93 = responseBody.warnings) != null ? _a93 : [],
        providerMetadata: responseBody.providerMetadata,
        response: {
          timestamp: /* @__PURE__ */ new Date(),
          modelId: this.modelId,
          headers: responseHeaders
        },
        ...responseBody.usage != null && {
          usage: {
            inputTokens: (_b9 = responseBody.usage.inputTokens) != null ? _b9 : void 0,
            outputTokens: (_c = responseBody.usage.outputTokens) != null ? _c : void 0,
            totalTokens: (_d = responseBody.usage.totalTokens) != null ? _d : void 0
          }
        }
      };
    } catch (error) {
      throw await asGatewayError(error, await parseAuthMethod(resolvedHeaders));
    }
  }
  getUrl() {
    return `${this.config.baseURL}/image-model`;
  }
  getModelConfigHeaders() {
    return {
      "ai-image-model-specification-version": "2",
      "ai-model-id": this.modelId
    };
  }
};
var providerMetadataEntrySchema = object$1({
  images: array(unknown()).optional()
}).catchall(unknown());
var gatewayImageUsageSchema = object$1({
  inputTokens: number().nullish(),
  outputTokens: number().nullish(),
  totalTokens: number().nullish()
});
var gatewayImageResponseSchema = object$1({
  images: array(string()),
  // Always base64 strings over the wire
  warnings: array(
    object$1({
      type: literal("other"),
      message: string()
    })
  ).optional(),
  providerMetadata: record(string(), providerMetadataEntrySchema).optional(),
  usage: gatewayImageUsageSchema.optional()
});
var parallelSearchInputSchema = lazySchema(
  () => zodSchema(
    objectType({
      objective: stringType().describe(
        "Natural-language description of the web research goal, including source or freshness guidance and broader context from the task. Maximum 5000 characters."
      ),
      search_queries: arrayType(stringType()).optional().describe(
        "Optional search queries to supplement the objective. Maximum 200 characters per query."
      ),
      mode: enumType(["one-shot", "agentic"]).optional().describe(
        'Mode preset: "one-shot" for comprehensive results with longer excerpts (default), "agentic" for concise, token-efficient results for multi-step workflows.'
      ),
      max_results: numberType().optional().describe(
        "Maximum number of results to return (1-20). Defaults to 10 if not specified."
      ),
      source_policy: objectType({
        include_domains: arrayType(stringType()).optional().describe("List of domains to include in search results."),
        exclude_domains: arrayType(stringType()).optional().describe("List of domains to exclude from search results."),
        after_date: stringType().optional().describe(
          "Only include results published after this date (ISO 8601 format)."
        )
      }).optional().describe(
        "Source policy for controlling which domains to include/exclude and freshness."
      ),
      excerpts: objectType({
        max_chars_per_result: numberType().optional().describe("Maximum characters per result."),
        max_chars_total: numberType().optional().describe("Maximum total characters across all results.")
      }).optional().describe("Excerpt configuration for controlling result length."),
      fetch_policy: objectType({
        max_age_seconds: numberType().optional().describe(
          "Maximum age in seconds for cached content. Set to 0 to always fetch fresh content."
        )
      }).optional().describe("Fetch policy for controlling content freshness.")
    })
  )
);
var parallelSearchOutputSchema = lazySchema(
  () => zodSchema(
    unionType([
      // Success response
      objectType({
        searchId: stringType(),
        results: arrayType(
          objectType({
            url: stringType(),
            title: stringType(),
            excerpt: stringType(),
            publishDate: stringType().nullable().optional(),
            relevanceScore: numberType().optional()
          })
        )
      }),
      // Error response
      objectType({
        error: enumType([
          "api_error",
          "rate_limit",
          "timeout",
          "invalid_input",
          "configuration_error",
          "unknown"
        ]),
        statusCode: numberType().optional(),
        message: stringType()
      })
    ])
  )
);
var parallelSearchToolFactory = createProviderDefinedToolFactoryWithOutputSchema({
  id: "gateway.parallel_search",
  name: "parallel_search",
  inputSchema: parallelSearchInputSchema,
  outputSchema: parallelSearchOutputSchema
});
var parallelSearch = (config = {}) => parallelSearchToolFactory(config);
var perplexitySearchInputSchema = lazySchema(
  () => zodSchema(
    objectType({
      query: unionType([stringType(), arrayType(stringType())]).describe(
        "Search query (string) or multiple queries (array of up to 5 strings). Multi-query searches return combined results from all queries."
      ),
      max_results: numberType().optional().describe(
        "Maximum number of search results to return (1-20, default: 10)"
      ),
      max_tokens_per_page: numberType().optional().describe(
        "Maximum number of tokens to extract per search result page (256-2048, default: 2048)"
      ),
      max_tokens: numberType().optional().describe(
        "Maximum total tokens across all search results (default: 25000, max: 1000000)"
      ),
      country: stringType().optional().describe(
        "Two-letter ISO 3166-1 alpha-2 country code for regional search results (e.g., 'US', 'GB', 'FR')"
      ),
      search_domain_filter: arrayType(stringType()).optional().describe(
        "List of domains to include or exclude from search results (max 20). To include: ['nature.com', 'science.org']. To exclude: ['-example.com', '-spam.net']"
      ),
      search_language_filter: arrayType(stringType()).optional().describe(
        "List of ISO 639-1 language codes to filter results (max 10, lowercase). Examples: ['en', 'fr', 'de']"
      ),
      search_after_date: stringType().optional().describe(
        "Include only results published after this date. Format: 'MM/DD/YYYY' (e.g., '3/1/2025'). Cannot be used with search_recency_filter."
      ),
      search_before_date: stringType().optional().describe(
        "Include only results published before this date. Format: 'MM/DD/YYYY' (e.g., '3/15/2025'). Cannot be used with search_recency_filter."
      ),
      last_updated_after_filter: stringType().optional().describe(
        "Include only results last updated after this date. Format: 'MM/DD/YYYY' (e.g., '3/1/2025'). Cannot be used with search_recency_filter."
      ),
      last_updated_before_filter: stringType().optional().describe(
        "Include only results last updated before this date. Format: 'MM/DD/YYYY' (e.g., '3/15/2025'). Cannot be used with search_recency_filter."
      ),
      search_recency_filter: enumType(["day", "week", "month", "year"]).optional().describe(
        "Filter results by relative time period. Cannot be used with search_after_date or search_before_date."
      )
    })
  )
);
var perplexitySearchOutputSchema = lazySchema(
  () => zodSchema(
    unionType([
      // Success response
      objectType({
        results: arrayType(
          objectType({
            title: stringType(),
            url: stringType(),
            snippet: stringType(),
            date: stringType().optional(),
            lastUpdated: stringType().optional()
          })
        ),
        id: stringType()
      }),
      // Error response
      objectType({
        error: enumType([
          "api_error",
          "rate_limit",
          "timeout",
          "invalid_input",
          "unknown"
        ]),
        statusCode: numberType().optional(),
        message: stringType()
      })
    ])
  )
);
var perplexitySearchToolFactory = createProviderDefinedToolFactoryWithOutputSchema({
  id: "gateway.perplexity_search",
  name: "perplexity_search",
  inputSchema: perplexitySearchInputSchema,
  outputSchema: perplexitySearchOutputSchema
});
var perplexitySearch = (config = {}) => perplexitySearchToolFactory(config);
var gatewayTools = {
  /**
   * Search the web using Parallel AI's Search API for LLM-optimized excerpts.
   *
   * Takes a natural language objective and returns relevant excerpts,
   * replacing multiple keyword searches with a single call for broad
   * or complex queries. Supports different search types for depth vs
   * breadth tradeoffs.
   */
  parallelSearch,
  /**
   * Search the web using Perplexity's Search API for real-time information,
   * news, research papers, and articles.
   *
   * Provides ranked search results with advanced filtering options including
   * domain, language, date range, and recency filters.
   */
  perplexitySearch
};
async function getVercelRequestId() {
  var _a93;
  return (_a93 = (0, import_oidc.getContext)().headers) == null ? void 0 : _a93["x-vercel-id"];
}
var VERSION = "2.0.59";
var AI_GATEWAY_PROTOCOL_VERSION = "0.0.1";
function createGatewayProvider(options = {}) {
  var _a93, _b9;
  let pendingMetadata = null;
  let metadataCache = null;
  const cacheRefreshMillis = (_a93 = options.metadataCacheRefreshMillis) != null ? _a93 : 1e3 * 60 * 5;
  let lastFetchTime = 0;
  const baseURL = (_b9 = withoutTrailingSlash(options.baseURL)) != null ? _b9 : "https://ai-gateway.vercel.sh/v1/ai";
  const getHeaders = async () => {
    const auth = await getGatewayAuthToken(options);
    if (auth) {
      return withUserAgentSuffix(
        {
          Authorization: `Bearer ${auth.token}`,
          "ai-gateway-protocol-version": AI_GATEWAY_PROTOCOL_VERSION,
          [GATEWAY_AUTH_METHOD_HEADER]: auth.authMethod,
          ...options.headers
        },
        `ai-sdk/gateway/${VERSION}`
      );
    }
    throw GatewayAuthenticationError.createContextualError({
      apiKeyProvided: false,
      oidcTokenProvided: false,
      statusCode: 401
    });
  };
  const createO11yHeaders = () => {
    const deploymentId = loadOptionalSetting({
      settingValue: void 0,
      environmentVariableName: "VERCEL_DEPLOYMENT_ID"
    });
    const environment = loadOptionalSetting({
      settingValue: void 0,
      environmentVariableName: "VERCEL_ENV"
    });
    const region = loadOptionalSetting({
      settingValue: void 0,
      environmentVariableName: "VERCEL_REGION"
    });
    const projectId = loadOptionalSetting({
      settingValue: void 0,
      environmentVariableName: "VERCEL_PROJECT_ID"
    });
    return async () => {
      const requestId = await getVercelRequestId();
      return {
        ...deploymentId && { "ai-o11y-deployment-id": deploymentId },
        ...environment && { "ai-o11y-environment": environment },
        ...region && { "ai-o11y-region": region },
        ...requestId && { "ai-o11y-request-id": requestId },
        ...projectId && { "ai-o11y-project-id": projectId }
      };
    };
  };
  const createLanguageModel = (modelId) => {
    return new GatewayLanguageModel(modelId, {
      provider: "gateway",
      baseURL,
      headers: getHeaders,
      fetch: options.fetch,
      o11yHeaders: createO11yHeaders()
    });
  };
  const getAvailableModels = async () => {
    var _a102, _b10, _c;
    const now2 = (_c = (_b10 = (_a102 = options._internal) == null ? void 0 : _a102.currentDate) == null ? void 0 : _b10.call(_a102).getTime()) != null ? _c : Date.now();
    if (!pendingMetadata || now2 - lastFetchTime > cacheRefreshMillis) {
      lastFetchTime = now2;
      pendingMetadata = new GatewayFetchMetadata({
        baseURL,
        headers: getHeaders,
        fetch: options.fetch
      }).getAvailableModels().then((metadata) => {
        metadataCache = metadata;
        return metadata;
      }).catch(async (error) => {
        throw await asGatewayError(
          error,
          await parseAuthMethod(await getHeaders())
        );
      });
    }
    return metadataCache ? Promise.resolve(metadataCache) : pendingMetadata;
  };
  const getCredits = async () => {
    return new GatewayFetchMetadata({
      baseURL,
      headers: getHeaders,
      fetch: options.fetch
    }).getCredits().catch(async (error) => {
      throw await asGatewayError(
        error,
        await parseAuthMethod(await getHeaders())
      );
    });
  };
  const provider = function(modelId) {
    if (new.target) {
      throw new Error(
        "The Gateway Provider model function cannot be called with the new keyword."
      );
    }
    return createLanguageModel(modelId);
  };
  provider.getAvailableModels = getAvailableModels;
  provider.getCredits = getCredits;
  provider.imageModel = (modelId) => {
    return new GatewayImageModel(modelId, {
      provider: "gateway",
      baseURL,
      headers: getHeaders,
      fetch: options.fetch,
      o11yHeaders: createO11yHeaders()
    });
  };
  provider.languageModel = createLanguageModel;
  provider.textEmbeddingModel = (modelId) => {
    return new GatewayEmbeddingModel(modelId, {
      provider: "gateway",
      baseURL,
      headers: getHeaders,
      fetch: options.fetch,
      o11yHeaders: createO11yHeaders()
    });
  };
  provider.tools = gatewayTools;
  return provider;
}
createGatewayProvider();
async function getGatewayAuthToken(options) {
  const apiKey = loadOptionalSetting({
    settingValue: options.apiKey,
    environmentVariableName: "AI_GATEWAY_API_KEY"
  });
  if (apiKey) {
    return {
      token: apiKey,
      authMethod: "api-key"
    };
  }
  try {
    const oidcToken = await (0, import_oidc2.getVercelOidcToken)();
    return {
      token: oidcToken,
      authMethod: "oidc"
    };
  } catch (e) {
    return null;
  }
}
var _globalThis = typeof globalThis === "object" ? globalThis : global;
var VERSION2 = "1.9.0";
var re = /^(\d+)\.(\d+)\.(\d+)(-(.+))?$/;
function _makeCompatibilityCheck(ownVersion) {
  var acceptedVersions = /* @__PURE__ */ new Set([ownVersion]);
  var rejectedVersions = /* @__PURE__ */ new Set();
  var myVersionMatch = ownVersion.match(re);
  if (!myVersionMatch) {
    return function() {
      return false;
    };
  }
  var ownVersionParsed = {
    major: +myVersionMatch[1],
    minor: +myVersionMatch[2],
    patch: +myVersionMatch[3],
    prerelease: myVersionMatch[4]
  };
  if (ownVersionParsed.prerelease != null) {
    return function isExactmatch(globalVersion) {
      return globalVersion === ownVersion;
    };
  }
  function _reject(v) {
    rejectedVersions.add(v);
    return false;
  }
  function _accept(v) {
    acceptedVersions.add(v);
    return true;
  }
  return function isCompatible2(globalVersion) {
    if (acceptedVersions.has(globalVersion)) {
      return true;
    }
    if (rejectedVersions.has(globalVersion)) {
      return false;
    }
    var globalVersionMatch = globalVersion.match(re);
    if (!globalVersionMatch) {
      return _reject(globalVersion);
    }
    var globalVersionParsed = {
      major: +globalVersionMatch[1],
      minor: +globalVersionMatch[2],
      patch: +globalVersionMatch[3],
      prerelease: globalVersionMatch[4]
    };
    if (globalVersionParsed.prerelease != null) {
      return _reject(globalVersion);
    }
    if (ownVersionParsed.major !== globalVersionParsed.major) {
      return _reject(globalVersion);
    }
    if (ownVersionParsed.major === 0) {
      if (ownVersionParsed.minor === globalVersionParsed.minor && ownVersionParsed.patch <= globalVersionParsed.patch) {
        return _accept(globalVersion);
      }
      return _reject(globalVersion);
    }
    if (ownVersionParsed.minor <= globalVersionParsed.minor) {
      return _accept(globalVersion);
    }
    return _reject(globalVersion);
  };
}
var isCompatible = _makeCompatibilityCheck(VERSION2);
var major = VERSION2.split(".")[0];
var GLOBAL_OPENTELEMETRY_API_KEY = /* @__PURE__ */ Symbol.for("opentelemetry.js.api." + major);
var _global = _globalThis;
function registerGlobal(type, instance, diag, allowOverride) {
  var _a16;
  if (allowOverride === void 0) {
    allowOverride = false;
  }
  var api = _global[GLOBAL_OPENTELEMETRY_API_KEY] = (_a16 = _global[GLOBAL_OPENTELEMETRY_API_KEY]) !== null && _a16 !== void 0 ? _a16 : {
    version: VERSION2
  };
  if (!allowOverride && api[type]) {
    var err = new Error("@opentelemetry/api: Attempted duplicate registration of API: " + type);
    diag.error(err.stack || err.message);
    return false;
  }
  if (api.version !== VERSION2) {
    var err = new Error("@opentelemetry/api: Registration of version v" + api.version + " for " + type + " does not match previously registered API v" + VERSION2);
    diag.error(err.stack || err.message);
    return false;
  }
  api[type] = instance;
  diag.debug("@opentelemetry/api: Registered a global for " + type + " v" + VERSION2 + ".");
  return true;
}
function getGlobal(type) {
  var _a16, _b9;
  var globalVersion = (_a16 = _global[GLOBAL_OPENTELEMETRY_API_KEY]) === null || _a16 === void 0 ? void 0 : _a16.version;
  if (!globalVersion || !isCompatible(globalVersion)) {
    return;
  }
  return (_b9 = _global[GLOBAL_OPENTELEMETRY_API_KEY]) === null || _b9 === void 0 ? void 0 : _b9[type];
}
function unregisterGlobal(type, diag) {
  diag.debug("@opentelemetry/api: Unregistering a global for " + type + " v" + VERSION2 + ".");
  var api = _global[GLOBAL_OPENTELEMETRY_API_KEY];
  if (api) {
    delete api[type];
  }
}
var __read = function(o, n) {
  var m = typeof Symbol === "function" && o[Symbol.iterator];
  if (!m) return o;
  var i = m.call(o), r, ar = [], e;
  try {
    while (!(r = i.next()).done) ar.push(r.value);
  } catch (error) {
    e = { error };
  } finally {
    try {
      if (r && !r.done && (m = i["return"])) m.call(i);
    } finally {
      if (e) throw e.error;
    }
  }
  return ar;
};
var __spreadArray = function(to, from, pack) {
  if (arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
    if (ar || !(i in from)) {
      if (!ar) ar = Array.prototype.slice.call(from, 0, i);
      ar[i] = from[i];
    }
  }
  return to.concat(ar || Array.prototype.slice.call(from));
};
var DiagComponentLogger = (
  /** @class */
  (function() {
    function DiagComponentLogger2(props) {
      this._namespace = props.namespace || "DiagComponentLogger";
    }
    DiagComponentLogger2.prototype.debug = function() {
      var args = [];
      for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
      }
      return logProxy("debug", this._namespace, args);
    };
    DiagComponentLogger2.prototype.error = function() {
      var args = [];
      for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
      }
      return logProxy("error", this._namespace, args);
    };
    DiagComponentLogger2.prototype.info = function() {
      var args = [];
      for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
      }
      return logProxy("info", this._namespace, args);
    };
    DiagComponentLogger2.prototype.warn = function() {
      var args = [];
      for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
      }
      return logProxy("warn", this._namespace, args);
    };
    DiagComponentLogger2.prototype.verbose = function() {
      var args = [];
      for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
      }
      return logProxy("verbose", this._namespace, args);
    };
    return DiagComponentLogger2;
  })()
);
function logProxy(funcName, namespace, args) {
  var logger = getGlobal("diag");
  if (!logger) {
    return;
  }
  args.unshift(namespace);
  return logger[funcName].apply(logger, __spreadArray([], __read(args), false));
}
var DiagLogLevel;
(function(DiagLogLevel2) {
  DiagLogLevel2[DiagLogLevel2["NONE"] = 0] = "NONE";
  DiagLogLevel2[DiagLogLevel2["ERROR"] = 30] = "ERROR";
  DiagLogLevel2[DiagLogLevel2["WARN"] = 50] = "WARN";
  DiagLogLevel2[DiagLogLevel2["INFO"] = 60] = "INFO";
  DiagLogLevel2[DiagLogLevel2["DEBUG"] = 70] = "DEBUG";
  DiagLogLevel2[DiagLogLevel2["VERBOSE"] = 80] = "VERBOSE";
  DiagLogLevel2[DiagLogLevel2["ALL"] = 9999] = "ALL";
})(DiagLogLevel || (DiagLogLevel = {}));
function createLogLevelDiagLogger(maxLevel, logger) {
  if (maxLevel < DiagLogLevel.NONE) {
    maxLevel = DiagLogLevel.NONE;
  } else if (maxLevel > DiagLogLevel.ALL) {
    maxLevel = DiagLogLevel.ALL;
  }
  logger = logger || {};
  function _filterFunc(funcName, theLevel) {
    var theFunc = logger[funcName];
    if (typeof theFunc === "function" && maxLevel >= theLevel) {
      return theFunc.bind(logger);
    }
    return function() {
    };
  }
  return {
    error: _filterFunc("error", DiagLogLevel.ERROR),
    warn: _filterFunc("warn", DiagLogLevel.WARN),
    info: _filterFunc("info", DiagLogLevel.INFO),
    debug: _filterFunc("debug", DiagLogLevel.DEBUG),
    verbose: _filterFunc("verbose", DiagLogLevel.VERBOSE)
  };
}
var __read2 = function(o, n) {
  var m = typeof Symbol === "function" && o[Symbol.iterator];
  if (!m) return o;
  var i = m.call(o), r, ar = [], e;
  try {
    while (!(r = i.next()).done) ar.push(r.value);
  } catch (error) {
    e = { error };
  } finally {
    try {
      if (r && !r.done && (m = i["return"])) m.call(i);
    } finally {
      if (e) throw e.error;
    }
  }
  return ar;
};
var __spreadArray2 = function(to, from, pack) {
  if (arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
    if (ar || !(i in from)) {
      if (!ar) ar = Array.prototype.slice.call(from, 0, i);
      ar[i] = from[i];
    }
  }
  return to.concat(ar || Array.prototype.slice.call(from));
};
var API_NAME = "diag";
var DiagAPI = (
  /** @class */
  (function() {
    function DiagAPI2() {
      function _logProxy(funcName) {
        return function() {
          var args = [];
          for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
          }
          var logger = getGlobal("diag");
          if (!logger)
            return;
          return logger[funcName].apply(logger, __spreadArray2([], __read2(args), false));
        };
      }
      var self = this;
      var setLogger = function(logger, optionsOrLogLevel) {
        var _a16, _b9, _c;
        if (optionsOrLogLevel === void 0) {
          optionsOrLogLevel = { logLevel: DiagLogLevel.INFO };
        }
        if (logger === self) {
          var err = new Error("Cannot use diag as the logger for itself. Please use a DiagLogger implementation like ConsoleDiagLogger or a custom implementation");
          self.error((_a16 = err.stack) !== null && _a16 !== void 0 ? _a16 : err.message);
          return false;
        }
        if (typeof optionsOrLogLevel === "number") {
          optionsOrLogLevel = {
            logLevel: optionsOrLogLevel
          };
        }
        var oldLogger = getGlobal("diag");
        var newLogger = createLogLevelDiagLogger((_b9 = optionsOrLogLevel.logLevel) !== null && _b9 !== void 0 ? _b9 : DiagLogLevel.INFO, logger);
        if (oldLogger && !optionsOrLogLevel.suppressOverrideMessage) {
          var stack = (_c = new Error().stack) !== null && _c !== void 0 ? _c : "<failed to generate stacktrace>";
          oldLogger.warn("Current logger will be overwritten from " + stack);
          newLogger.warn("Current logger will overwrite one already registered from " + stack);
        }
        return registerGlobal("diag", newLogger, self, true);
      };
      self.setLogger = setLogger;
      self.disable = function() {
        unregisterGlobal(API_NAME, self);
      };
      self.createComponentLogger = function(options) {
        return new DiagComponentLogger(options);
      };
      self.verbose = _logProxy("verbose");
      self.debug = _logProxy("debug");
      self.info = _logProxy("info");
      self.warn = _logProxy("warn");
      self.error = _logProxy("error");
    }
    DiagAPI2.instance = function() {
      if (!this._instance) {
        this._instance = new DiagAPI2();
      }
      return this._instance;
    };
    return DiagAPI2;
  })()
);
function createContextKey(description) {
  return Symbol.for(description);
}
var BaseContext = (
  /** @class */
  /* @__PURE__ */ (function() {
    function BaseContext2(parentContext) {
      var self = this;
      self._currentContext = parentContext ? new Map(parentContext) : /* @__PURE__ */ new Map();
      self.getValue = function(key) {
        return self._currentContext.get(key);
      };
      self.setValue = function(key, value) {
        var context = new BaseContext2(self._currentContext);
        context._currentContext.set(key, value);
        return context;
      };
      self.deleteValue = function(key) {
        var context = new BaseContext2(self._currentContext);
        context._currentContext.delete(key);
        return context;
      };
    }
    return BaseContext2;
  })()
);
var ROOT_CONTEXT = new BaseContext();
var __read3 = function(o, n) {
  var m = typeof Symbol === "function" && o[Symbol.iterator];
  if (!m) return o;
  var i = m.call(o), r, ar = [], e;
  try {
    while (!(r = i.next()).done) ar.push(r.value);
  } catch (error) {
    e = { error };
  } finally {
    try {
      if (r && !r.done && (m = i["return"])) m.call(i);
    } finally {
      if (e) throw e.error;
    }
  }
  return ar;
};
var __spreadArray3 = function(to, from, pack) {
  if (arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
    if (ar || !(i in from)) {
      if (!ar) ar = Array.prototype.slice.call(from, 0, i);
      ar[i] = from[i];
    }
  }
  return to.concat(ar || Array.prototype.slice.call(from));
};
var NoopContextManager = (
  /** @class */
  (function() {
    function NoopContextManager2() {
    }
    NoopContextManager2.prototype.active = function() {
      return ROOT_CONTEXT;
    };
    NoopContextManager2.prototype.with = function(_context, fn, thisArg) {
      var args = [];
      for (var _i = 3; _i < arguments.length; _i++) {
        args[_i - 3] = arguments[_i];
      }
      return fn.call.apply(fn, __spreadArray3([thisArg], __read3(args), false));
    };
    NoopContextManager2.prototype.bind = function(_context, target) {
      return target;
    };
    NoopContextManager2.prototype.enable = function() {
      return this;
    };
    NoopContextManager2.prototype.disable = function() {
      return this;
    };
    return NoopContextManager2;
  })()
);
var __read4 = function(o, n) {
  var m = typeof Symbol === "function" && o[Symbol.iterator];
  if (!m) return o;
  var i = m.call(o), r, ar = [], e;
  try {
    while (!(r = i.next()).done) ar.push(r.value);
  } catch (error) {
    e = { error };
  } finally {
    try {
      if (r && !r.done && (m = i["return"])) m.call(i);
    } finally {
      if (e) throw e.error;
    }
  }
  return ar;
};
var __spreadArray4 = function(to, from, pack) {
  if (arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
    if (ar || !(i in from)) {
      if (!ar) ar = Array.prototype.slice.call(from, 0, i);
      ar[i] = from[i];
    }
  }
  return to.concat(ar || Array.prototype.slice.call(from));
};
var API_NAME2 = "context";
var NOOP_CONTEXT_MANAGER = new NoopContextManager();
var ContextAPI = (
  /** @class */
  (function() {
    function ContextAPI2() {
    }
    ContextAPI2.getInstance = function() {
      if (!this._instance) {
        this._instance = new ContextAPI2();
      }
      return this._instance;
    };
    ContextAPI2.prototype.setGlobalContextManager = function(contextManager) {
      return registerGlobal(API_NAME2, contextManager, DiagAPI.instance());
    };
    ContextAPI2.prototype.active = function() {
      return this._getContextManager().active();
    };
    ContextAPI2.prototype.with = function(context, fn, thisArg) {
      var _a16;
      var args = [];
      for (var _i = 3; _i < arguments.length; _i++) {
        args[_i - 3] = arguments[_i];
      }
      return (_a16 = this._getContextManager()).with.apply(_a16, __spreadArray4([context, fn, thisArg], __read4(args), false));
    };
    ContextAPI2.prototype.bind = function(context, target) {
      return this._getContextManager().bind(context, target);
    };
    ContextAPI2.prototype._getContextManager = function() {
      return getGlobal(API_NAME2) || NOOP_CONTEXT_MANAGER;
    };
    ContextAPI2.prototype.disable = function() {
      this._getContextManager().disable();
      unregisterGlobal(API_NAME2, DiagAPI.instance());
    };
    return ContextAPI2;
  })()
);
var TraceFlags;
(function(TraceFlags2) {
  TraceFlags2[TraceFlags2["NONE"] = 0] = "NONE";
  TraceFlags2[TraceFlags2["SAMPLED"] = 1] = "SAMPLED";
})(TraceFlags || (TraceFlags = {}));
var INVALID_SPANID = "0000000000000000";
var INVALID_TRACEID = "00000000000000000000000000000000";
var INVALID_SPAN_CONTEXT = {
  traceId: INVALID_TRACEID,
  spanId: INVALID_SPANID,
  traceFlags: TraceFlags.NONE
};
var NonRecordingSpan = (
  /** @class */
  (function() {
    function NonRecordingSpan2(_spanContext) {
      if (_spanContext === void 0) {
        _spanContext = INVALID_SPAN_CONTEXT;
      }
      this._spanContext = _spanContext;
    }
    NonRecordingSpan2.prototype.spanContext = function() {
      return this._spanContext;
    };
    NonRecordingSpan2.prototype.setAttribute = function(_key, _value) {
      return this;
    };
    NonRecordingSpan2.prototype.setAttributes = function(_attributes) {
      return this;
    };
    NonRecordingSpan2.prototype.addEvent = function(_name, _attributes) {
      return this;
    };
    NonRecordingSpan2.prototype.addLink = function(_link) {
      return this;
    };
    NonRecordingSpan2.prototype.addLinks = function(_links) {
      return this;
    };
    NonRecordingSpan2.prototype.setStatus = function(_status) {
      return this;
    };
    NonRecordingSpan2.prototype.updateName = function(_name) {
      return this;
    };
    NonRecordingSpan2.prototype.end = function(_endTime) {
    };
    NonRecordingSpan2.prototype.isRecording = function() {
      return false;
    };
    NonRecordingSpan2.prototype.recordException = function(_exception, _time) {
    };
    return NonRecordingSpan2;
  })()
);
var SPAN_KEY = createContextKey("OpenTelemetry Context Key SPAN");
function getSpan(context) {
  return context.getValue(SPAN_KEY) || void 0;
}
function getActiveSpan() {
  return getSpan(ContextAPI.getInstance().active());
}
function setSpan(context, span) {
  return context.setValue(SPAN_KEY, span);
}
function deleteSpan(context) {
  return context.deleteValue(SPAN_KEY);
}
function setSpanContext(context, spanContext) {
  return setSpan(context, new NonRecordingSpan(spanContext));
}
function getSpanContext(context) {
  var _a16;
  return (_a16 = getSpan(context)) === null || _a16 === void 0 ? void 0 : _a16.spanContext();
}
var VALID_TRACEID_REGEX = /^([0-9a-f]{32})$/i;
var VALID_SPANID_REGEX = /^[0-9a-f]{16}$/i;
function isValidTraceId(traceId) {
  return VALID_TRACEID_REGEX.test(traceId) && traceId !== INVALID_TRACEID;
}
function isValidSpanId(spanId) {
  return VALID_SPANID_REGEX.test(spanId) && spanId !== INVALID_SPANID;
}
function isSpanContextValid(spanContext) {
  return isValidTraceId(spanContext.traceId) && isValidSpanId(spanContext.spanId);
}
function wrapSpanContext(spanContext) {
  return new NonRecordingSpan(spanContext);
}
var contextApi = ContextAPI.getInstance();
var NoopTracer = (
  /** @class */
  (function() {
    function NoopTracer2() {
    }
    NoopTracer2.prototype.startSpan = function(name16, options, context) {
      if (context === void 0) {
        context = contextApi.active();
      }
      var root = Boolean(options === null || options === void 0 ? void 0 : options.root);
      if (root) {
        return new NonRecordingSpan();
      }
      var parentFromContext = context && getSpanContext(context);
      if (isSpanContext(parentFromContext) && isSpanContextValid(parentFromContext)) {
        return new NonRecordingSpan(parentFromContext);
      } else {
        return new NonRecordingSpan();
      }
    };
    NoopTracer2.prototype.startActiveSpan = function(name16, arg2, arg3, arg4) {
      var opts;
      var ctx;
      var fn;
      if (arguments.length < 2) {
        return;
      } else if (arguments.length === 2) {
        fn = arg2;
      } else if (arguments.length === 3) {
        opts = arg2;
        fn = arg3;
      } else {
        opts = arg2;
        ctx = arg3;
        fn = arg4;
      }
      var parentContext = ctx !== null && ctx !== void 0 ? ctx : contextApi.active();
      var span = this.startSpan(name16, opts, parentContext);
      var contextWithSpanSet = setSpan(parentContext, span);
      return contextApi.with(contextWithSpanSet, fn, void 0, span);
    };
    return NoopTracer2;
  })()
);
function isSpanContext(spanContext) {
  return typeof spanContext === "object" && typeof spanContext["spanId"] === "string" && typeof spanContext["traceId"] === "string" && typeof spanContext["traceFlags"] === "number";
}
var NOOP_TRACER = new NoopTracer();
var ProxyTracer = (
  /** @class */
  (function() {
    function ProxyTracer2(_provider, name16, version, options) {
      this._provider = _provider;
      this.name = name16;
      this.version = version;
      this.options = options;
    }
    ProxyTracer2.prototype.startSpan = function(name16, options, context) {
      return this._getTracer().startSpan(name16, options, context);
    };
    ProxyTracer2.prototype.startActiveSpan = function(_name, _options, _context, _fn) {
      var tracer = this._getTracer();
      return Reflect.apply(tracer.startActiveSpan, tracer, arguments);
    };
    ProxyTracer2.prototype._getTracer = function() {
      if (this._delegate) {
        return this._delegate;
      }
      var tracer = this._provider.getDelegateTracer(this.name, this.version, this.options);
      if (!tracer) {
        return NOOP_TRACER;
      }
      this._delegate = tracer;
      return this._delegate;
    };
    return ProxyTracer2;
  })()
);
var NoopTracerProvider = (
  /** @class */
  (function() {
    function NoopTracerProvider2() {
    }
    NoopTracerProvider2.prototype.getTracer = function(_name, _version, _options) {
      return new NoopTracer();
    };
    return NoopTracerProvider2;
  })()
);
var NOOP_TRACER_PROVIDER = new NoopTracerProvider();
var ProxyTracerProvider = (
  /** @class */
  (function() {
    function ProxyTracerProvider2() {
    }
    ProxyTracerProvider2.prototype.getTracer = function(name16, version, options) {
      var _a16;
      return (_a16 = this.getDelegateTracer(name16, version, options)) !== null && _a16 !== void 0 ? _a16 : new ProxyTracer(this, name16, version, options);
    };
    ProxyTracerProvider2.prototype.getDelegate = function() {
      var _a16;
      return (_a16 = this._delegate) !== null && _a16 !== void 0 ? _a16 : NOOP_TRACER_PROVIDER;
    };
    ProxyTracerProvider2.prototype.setDelegate = function(delegate) {
      this._delegate = delegate;
    };
    ProxyTracerProvider2.prototype.getDelegateTracer = function(name16, version, options) {
      var _a16;
      return (_a16 = this._delegate) === null || _a16 === void 0 ? void 0 : _a16.getTracer(name16, version, options);
    };
    return ProxyTracerProvider2;
  })()
);
var SpanStatusCode;
(function(SpanStatusCode2) {
  SpanStatusCode2[SpanStatusCode2["UNSET"] = 0] = "UNSET";
  SpanStatusCode2[SpanStatusCode2["OK"] = 1] = "OK";
  SpanStatusCode2[SpanStatusCode2["ERROR"] = 2] = "ERROR";
})(SpanStatusCode || (SpanStatusCode = {}));
var API_NAME3 = "trace";
var TraceAPI = (
  /** @class */
  (function() {
    function TraceAPI2() {
      this._proxyTracerProvider = new ProxyTracerProvider();
      this.wrapSpanContext = wrapSpanContext;
      this.isSpanContextValid = isSpanContextValid;
      this.deleteSpan = deleteSpan;
      this.getSpan = getSpan;
      this.getActiveSpan = getActiveSpan;
      this.getSpanContext = getSpanContext;
      this.setSpan = setSpan;
      this.setSpanContext = setSpanContext;
    }
    TraceAPI2.getInstance = function() {
      if (!this._instance) {
        this._instance = new TraceAPI2();
      }
      return this._instance;
    };
    TraceAPI2.prototype.setGlobalTracerProvider = function(provider) {
      var success = registerGlobal(API_NAME3, this._proxyTracerProvider, DiagAPI.instance());
      if (success) {
        this._proxyTracerProvider.setDelegate(provider);
      }
      return success;
    };
    TraceAPI2.prototype.getTracerProvider = function() {
      return getGlobal(API_NAME3) || this._proxyTracerProvider;
    };
    TraceAPI2.prototype.getTracer = function(name16, version) {
      return this.getTracerProvider().getTracer(name16, version);
    };
    TraceAPI2.prototype.disable = function() {
      unregisterGlobal(API_NAME3, DiagAPI.instance());
      this._proxyTracerProvider = new ProxyTracerProvider();
    };
    return TraceAPI2;
  })()
);
TraceAPI.getInstance();
var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name16 in all)
    __defProp(target, name16, { get: all[name16], enumerable: true });
};
var name62 = "AI_NoObjectGeneratedError";
var marker62 = `vercel.ai.error.${name62}`;
var symbol62 = Symbol.for(marker62);
var _a62;
var NoObjectGeneratedError = class extends AISDKError {
  constructor({
    message = "No object generated.",
    cause,
    text: text2,
    response,
    usage,
    finishReason
  }) {
    super({ name: name62, message, cause });
    this[_a62] = true;
    this.text = text2;
    this.response = response;
    this.usage = usage;
    this.finishReason = finishReason;
  }
  static isInstance(error) {
    return AISDKError.hasMarker(error, marker62);
  }
};
_a62 = symbol62;
var name12 = "AI_MessageConversionError";
var marker12 = `vercel.ai.error.${name12}`;
var symbol12 = Symbol.for(marker12);
var _a12;
var MessageConversionError = class extends AISDKError {
  constructor({
    originalMessage,
    message
  }) {
    super({ name: name12, message });
    this[_a12] = true;
    this.originalMessage = originalMessage;
  }
  static isInstance(error) {
    return AISDKError.hasMarker(error, marker12);
  }
};
_a12 = symbol12;
var dataContentSchema = union([
  string(),
  _instanceof(Uint8Array),
  _instanceof(ArrayBuffer),
  custom(
    // Buffer might not be available in some environments such as CloudFlare:
    (value) => {
      var _a16, _b9;
      return (_b9 = (_a16 = globalThis.Buffer) == null ? void 0 : _a16.isBuffer(value)) != null ? _b9 : false;
    },
    { message: "Must be a Buffer" }
  )
]);
var jsonValueSchema = lazy(
  () => union([
    _null(),
    string(),
    number(),
    boolean(),
    record(string(), jsonValueSchema),
    array(jsonValueSchema)
  ])
);
var providerMetadataSchema = record(
  string(),
  record(string(), jsonValueSchema)
);
var textPartSchema = object$1({
  type: literal("text"),
  text: string(),
  providerOptions: providerMetadataSchema.optional()
});
var imagePartSchema = object$1({
  type: literal("image"),
  image: union([dataContentSchema, _instanceof(URL)]),
  mediaType: string().optional(),
  providerOptions: providerMetadataSchema.optional()
});
var filePartSchema = object$1({
  type: literal("file"),
  data: union([dataContentSchema, _instanceof(URL)]),
  filename: string().optional(),
  mediaType: string(),
  providerOptions: providerMetadataSchema.optional()
});
var reasoningPartSchema = object$1({
  type: literal("reasoning"),
  text: string(),
  providerOptions: providerMetadataSchema.optional()
});
var toolCallPartSchema = object$1({
  type: literal("tool-call"),
  toolCallId: string(),
  toolName: string(),
  input: unknown(),
  providerOptions: providerMetadataSchema.optional(),
  providerExecuted: boolean().optional()
});
var outputSchema = discriminatedUnion("type", [
  object$1({
    type: literal("text"),
    value: string()
  }),
  object$1({
    type: literal("json"),
    value: jsonValueSchema
  }),
  object$1({
    type: literal("error-text"),
    value: string()
  }),
  object$1({
    type: literal("error-json"),
    value: jsonValueSchema
  }),
  object$1({
    type: literal("content"),
    value: array(
      union([
        object$1({
          type: literal("text"),
          text: string()
        }),
        object$1({
          type: literal("media"),
          data: string(),
          mediaType: string()
        })
      ])
    )
  })
]);
var toolResultPartSchema = object$1({
  type: literal("tool-result"),
  toolCallId: string(),
  toolName: string(),
  output: outputSchema,
  providerOptions: providerMetadataSchema.optional()
});
var systemModelMessageSchema = object$1(
  {
    role: literal("system"),
    content: string(),
    providerOptions: providerMetadataSchema.optional()
  }
);
var userModelMessageSchema = object$1({
  role: literal("user"),
  content: union([
    string(),
    array(union([textPartSchema, imagePartSchema, filePartSchema]))
  ]),
  providerOptions: providerMetadataSchema.optional()
});
var assistantModelMessageSchema = object$1({
  role: literal("assistant"),
  content: union([
    string(),
    array(
      union([
        textPartSchema,
        filePartSchema,
        reasoningPartSchema,
        toolCallPartSchema,
        toolResultPartSchema
      ])
    )
  ]),
  providerOptions: providerMetadataSchema.optional()
});
var toolModelMessageSchema = object$1({
  role: literal("tool"),
  content: array(toolResultPartSchema),
  providerOptions: providerMetadataSchema.optional()
});
union([
  systemModelMessageSchema,
  userModelMessageSchema,
  assistantModelMessageSchema,
  toolModelMessageSchema
]);
function stepCountIs(stepCount) {
  return ({ steps }) => steps.length === stepCount;
}
function createToolModelOutput({
  output,
  tool: tool2,
  errorMode
}) {
  if (errorMode === "text") {
    return { type: "error-text", value: getErrorMessage(output) };
  } else if (errorMode === "json") {
    return { type: "error-json", value: toJSONValue(output) };
  }
  if (tool2 == null ? void 0 : tool2.toModelOutput) {
    return tool2.toModelOutput(output);
  }
  return typeof output === "string" ? { type: "text", value: output } : { type: "json", value: toJSONValue(output) };
}
function toJSONValue(value) {
  return value === void 0 ? null : value;
}
createIdGenerator$1({
  prefix: "aitxt",
  size: 24
});
function fixJson(input) {
  const stack = ["ROOT"];
  let lastValidIndex = -1;
  let literalStart = null;
  function processValueStart(char, i, swapState) {
    {
      switch (char) {
        case '"': {
          lastValidIndex = i;
          stack.pop();
          stack.push(swapState);
          stack.push("INSIDE_STRING");
          break;
        }
        case "f":
        case "t":
        case "n": {
          lastValidIndex = i;
          literalStart = i;
          stack.pop();
          stack.push(swapState);
          stack.push("INSIDE_LITERAL");
          break;
        }
        case "-": {
          stack.pop();
          stack.push(swapState);
          stack.push("INSIDE_NUMBER");
          break;
        }
        case "0":
        case "1":
        case "2":
        case "3":
        case "4":
        case "5":
        case "6":
        case "7":
        case "8":
        case "9": {
          lastValidIndex = i;
          stack.pop();
          stack.push(swapState);
          stack.push("INSIDE_NUMBER");
          break;
        }
        case "{": {
          lastValidIndex = i;
          stack.pop();
          stack.push(swapState);
          stack.push("INSIDE_OBJECT_START");
          break;
        }
        case "[": {
          lastValidIndex = i;
          stack.pop();
          stack.push(swapState);
          stack.push("INSIDE_ARRAY_START");
          break;
        }
      }
    }
  }
  function processAfterObjectValue(char, i) {
    switch (char) {
      case ",": {
        stack.pop();
        stack.push("INSIDE_OBJECT_AFTER_COMMA");
        break;
      }
      case "}": {
        lastValidIndex = i;
        stack.pop();
        break;
      }
    }
  }
  function processAfterArrayValue(char, i) {
    switch (char) {
      case ",": {
        stack.pop();
        stack.push("INSIDE_ARRAY_AFTER_COMMA");
        break;
      }
      case "]": {
        lastValidIndex = i;
        stack.pop();
        break;
      }
    }
  }
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    const currentState = stack[stack.length - 1];
    switch (currentState) {
      case "ROOT":
        processValueStart(char, i, "FINISH");
        break;
      case "INSIDE_OBJECT_START": {
        switch (char) {
          case '"': {
            stack.pop();
            stack.push("INSIDE_OBJECT_KEY");
            break;
          }
          case "}": {
            lastValidIndex = i;
            stack.pop();
            break;
          }
        }
        break;
      }
      case "INSIDE_OBJECT_AFTER_COMMA": {
        switch (char) {
          case '"': {
            stack.pop();
            stack.push("INSIDE_OBJECT_KEY");
            break;
          }
        }
        break;
      }
      case "INSIDE_OBJECT_KEY": {
        switch (char) {
          case '"': {
            stack.pop();
            stack.push("INSIDE_OBJECT_AFTER_KEY");
            break;
          }
        }
        break;
      }
      case "INSIDE_OBJECT_AFTER_KEY": {
        switch (char) {
          case ":": {
            stack.pop();
            stack.push("INSIDE_OBJECT_BEFORE_VALUE");
            break;
          }
        }
        break;
      }
      case "INSIDE_OBJECT_BEFORE_VALUE": {
        processValueStart(char, i, "INSIDE_OBJECT_AFTER_VALUE");
        break;
      }
      case "INSIDE_OBJECT_AFTER_VALUE": {
        processAfterObjectValue(char, i);
        break;
      }
      case "INSIDE_STRING": {
        switch (char) {
          case '"': {
            stack.pop();
            lastValidIndex = i;
            break;
          }
          case "\\": {
            stack.push("INSIDE_STRING_ESCAPE");
            break;
          }
          default: {
            lastValidIndex = i;
          }
        }
        break;
      }
      case "INSIDE_ARRAY_START": {
        switch (char) {
          case "]": {
            lastValidIndex = i;
            stack.pop();
            break;
          }
          default: {
            lastValidIndex = i;
            processValueStart(char, i, "INSIDE_ARRAY_AFTER_VALUE");
            break;
          }
        }
        break;
      }
      case "INSIDE_ARRAY_AFTER_VALUE": {
        switch (char) {
          case ",": {
            stack.pop();
            stack.push("INSIDE_ARRAY_AFTER_COMMA");
            break;
          }
          case "]": {
            lastValidIndex = i;
            stack.pop();
            break;
          }
          default: {
            lastValidIndex = i;
            break;
          }
        }
        break;
      }
      case "INSIDE_ARRAY_AFTER_COMMA": {
        processValueStart(char, i, "INSIDE_ARRAY_AFTER_VALUE");
        break;
      }
      case "INSIDE_STRING_ESCAPE": {
        stack.pop();
        lastValidIndex = i;
        break;
      }
      case "INSIDE_NUMBER": {
        switch (char) {
          case "0":
          case "1":
          case "2":
          case "3":
          case "4":
          case "5":
          case "6":
          case "7":
          case "8":
          case "9": {
            lastValidIndex = i;
            break;
          }
          case "e":
          case "E":
          case "-":
          case ".": {
            break;
          }
          case ",": {
            stack.pop();
            if (stack[stack.length - 1] === "INSIDE_ARRAY_AFTER_VALUE") {
              processAfterArrayValue(char, i);
            }
            if (stack[stack.length - 1] === "INSIDE_OBJECT_AFTER_VALUE") {
              processAfterObjectValue(char, i);
            }
            break;
          }
          case "}": {
            stack.pop();
            if (stack[stack.length - 1] === "INSIDE_OBJECT_AFTER_VALUE") {
              processAfterObjectValue(char, i);
            }
            break;
          }
          case "]": {
            stack.pop();
            if (stack[stack.length - 1] === "INSIDE_ARRAY_AFTER_VALUE") {
              processAfterArrayValue(char, i);
            }
            break;
          }
          default: {
            stack.pop();
            break;
          }
        }
        break;
      }
      case "INSIDE_LITERAL": {
        const partialLiteral = input.substring(literalStart, i + 1);
        if (!"false".startsWith(partialLiteral) && !"true".startsWith(partialLiteral) && !"null".startsWith(partialLiteral)) {
          stack.pop();
          if (stack[stack.length - 1] === "INSIDE_OBJECT_AFTER_VALUE") {
            processAfterObjectValue(char, i);
          } else if (stack[stack.length - 1] === "INSIDE_ARRAY_AFTER_VALUE") {
            processAfterArrayValue(char, i);
          }
        } else {
          lastValidIndex = i;
        }
        break;
      }
    }
  }
  let result = input.slice(0, lastValidIndex + 1);
  for (let i = stack.length - 1; i >= 0; i--) {
    const state = stack[i];
    switch (state) {
      case "INSIDE_STRING": {
        result += '"';
        break;
      }
      case "INSIDE_OBJECT_KEY":
      case "INSIDE_OBJECT_AFTER_KEY":
      case "INSIDE_OBJECT_AFTER_COMMA":
      case "INSIDE_OBJECT_START":
      case "INSIDE_OBJECT_BEFORE_VALUE":
      case "INSIDE_OBJECT_AFTER_VALUE": {
        result += "}";
        break;
      }
      case "INSIDE_ARRAY_START":
      case "INSIDE_ARRAY_AFTER_COMMA":
      case "INSIDE_ARRAY_AFTER_VALUE": {
        result += "]";
        break;
      }
      case "INSIDE_LITERAL": {
        const partialLiteral = input.substring(literalStart, input.length);
        if ("true".startsWith(partialLiteral)) {
          result += "true".slice(partialLiteral.length);
        } else if ("false".startsWith(partialLiteral)) {
          result += "false".slice(partialLiteral.length);
        } else if ("null".startsWith(partialLiteral)) {
          result += "null".slice(partialLiteral.length);
        }
      }
    }
  }
  return result;
}
async function parsePartialJson(jsonText) {
  if (jsonText === void 0) {
    return { value: void 0, state: "undefined-input" };
  }
  let result = await safeParseJSON({ text: jsonText });
  if (result.success) {
    return { value: result.value, state: "successful-parse" };
  }
  result = await safeParseJSON({ text: fixJson(jsonText) });
  if (result.success) {
    return { value: result.value, state: "repaired-parse" };
  }
  return { value: void 0, state: "failed-parse" };
}
function isDataUIPart(part) {
  return part.type.startsWith("data-");
}
function isTextUIPart(part) {
  return part.type === "text";
}
function isFileUIPart(part) {
  return part.type === "file";
}
function isReasoningUIPart(part) {
  return part.type === "reasoning";
}
function isToolUIPart(part) {
  return part.type.startsWith("tool-");
}
function isDynamicToolUIPart(part) {
  return part.type === "dynamic-tool";
}
function isToolOrDynamicToolUIPart(part) {
  return isToolUIPart(part) || isDynamicToolUIPart(part);
}
function getToolName$1(part) {
  return part.type.split("-").slice(1).join("-");
}
function getToolOrDynamicToolName(part) {
  return isDynamicToolUIPart(part) ? part.toolName : getToolName$1(part);
}
createIdGenerator$1({
  prefix: "aitxt",
  size: 24
});
function convertToModelMessages(messages, options) {
  const modelMessages = [];
  for (const message of messages) {
    switch (message.role) {
      case "system": {
        const textParts = message.parts.filter(
          (part) => part.type === "text"
        );
        const providerMetadata = textParts.reduce((acc, part) => {
          if (part.providerMetadata != null) {
            return { ...acc, ...part.providerMetadata };
          }
          return acc;
        }, {});
        modelMessages.push({
          role: "system",
          content: textParts.map((part) => part.text).join(""),
          ...Object.keys(providerMetadata).length > 0 ? { providerOptions: providerMetadata } : {}
        });
        break;
      }
      case "user": {
        modelMessages.push({
          role: "user",
          content: message.parts.map((part) => {
            var _a16;
            if (isTextUIPart(part)) {
              return {
                type: "text",
                text: part.text,
                ...part.providerMetadata != null ? { providerOptions: part.providerMetadata } : {}
              };
            }
            if (isFileUIPart(part)) {
              return {
                type: "file",
                mediaType: part.mediaType,
                filename: part.filename,
                data: part.url,
                ...part.providerMetadata != null ? { providerOptions: part.providerMetadata } : {}
              };
            }
            if (isDataUIPart(part)) {
              return (_a16 = void 0 ) == null ? void 0 : _a16.call(
                options,
                part
              );
            }
          }).filter((part) => part != null)
        });
        break;
      }
      case "assistant": {
        if (message.parts != null) {
          let processBlock2 = function() {
            var _a16, _b9, _c;
            if (block.length === 0) {
              return;
            }
            const content = [];
            for (const part of block) {
              if (isTextUIPart(part)) {
                content.push({
                  type: "text",
                  text: part.text,
                  ...part.providerMetadata != null ? { providerOptions: part.providerMetadata } : {}
                });
              } else if (isFileUIPart(part)) {
                content.push({
                  type: "file",
                  mediaType: part.mediaType,
                  filename: part.filename,
                  data: part.url
                });
              } else if (isReasoningUIPart(part)) {
                content.push({
                  type: "reasoning",
                  text: part.text,
                  providerOptions: part.providerMetadata
                });
              } else if (isDynamicToolUIPart(part)) {
                const toolName = part.toolName;
                if (part.state !== "input-streaming") {
                  content.push({
                    type: "tool-call",
                    toolCallId: part.toolCallId,
                    toolName,
                    input: part.input,
                    ...part.callProviderMetadata != null ? { providerOptions: part.callProviderMetadata } : {}
                  });
                }
              } else if (isToolUIPart(part)) {
                const toolName = getToolName$1(part);
                if (part.state !== "input-streaming") {
                  content.push({
                    type: "tool-call",
                    toolCallId: part.toolCallId,
                    toolName,
                    input: part.state === "output-error" ? (_a16 = part.input) != null ? _a16 : part.rawInput : part.input,
                    providerExecuted: part.providerExecuted,
                    ...part.callProviderMetadata != null ? { providerOptions: part.callProviderMetadata } : {}
                  });
                  if (part.providerExecuted === true && (part.state === "output-available" || part.state === "output-error")) {
                    content.push({
                      type: "tool-result",
                      toolCallId: part.toolCallId,
                      toolName,
                      output: createToolModelOutput({
                        output: part.state === "output-error" ? part.errorText : part.output,
                        tool: (_b9 = void 0 ) == null ? void 0 : _b9[toolName],
                        errorMode: part.state === "output-error" ? "json" : "none"
                      }),
                      ...part.callProviderMetadata != null ? { providerOptions: part.callProviderMetadata } : {}
                    });
                  }
                }
              } else if (isDataUIPart(part)) {
                const dataPart = (_c = void 0 ) == null ? void 0 : _c.call(
                  options,
                  part
                );
                if (dataPart != null) {
                  content.push(dataPart);
                }
              } else {
                const _exhaustiveCheck = part;
                throw new Error(`Unsupported part: ${_exhaustiveCheck}`);
              }
            }
            modelMessages.push({
              role: "assistant",
              content
            });
            const toolParts = block.filter(
              (part) => isToolUIPart(part) && part.providerExecuted !== true || part.type === "dynamic-tool"
            );
            if (toolParts.length > 0) {
              modelMessages.push({
                role: "tool",
                content: toolParts.map((toolPart) => {
                  var _a17;
                  switch (toolPart.state) {
                    case "output-error":
                    case "output-available": {
                      const toolName = getToolOrDynamicToolName(toolPart);
                      return {
                        type: "tool-result",
                        toolCallId: toolPart.toolCallId,
                        toolName,
                        output: createToolModelOutput({
                          output: toolPart.state === "output-error" ? toolPart.errorText : toolPart.output,
                          tool: (_a17 = void 0 ) == null ? void 0 : _a17[toolName],
                          errorMode: toolPart.state === "output-error" ? "text" : "none"
                        }),
                        ...toolPart.callProviderMetadata != null ? { providerOptions: toolPart.callProviderMetadata } : {}
                      };
                    }
                    default: {
                      return null;
                    }
                  }
                }).filter(
                  (output) => output != null
                )
              });
            }
            block = [];
          };
          let block = [];
          for (const part of message.parts) {
            if (isTextUIPart(part) || isReasoningUIPart(part) || isFileUIPart(part) || isToolOrDynamicToolUIPart(part) || isDataUIPart(part)) {
              block.push(part);
            } else if (part.type === "step-start") {
              processBlock2();
            }
          }
          processBlock2();
          break;
        }
        break;
      }
      default: {
        const _exhaustiveCheck = message.role;
        throw new MessageConversionError({
          originalMessage: message,
          message: `Unsupported role: ${_exhaustiveCheck}`
        });
      }
    }
  }
  return modelMessages;
}
createIdGenerator$1({ prefix: "aiobj", size: 24 });
function isDeepEqualData(obj1, obj2) {
  if (obj1 === obj2)
    return true;
  if (obj1 == null || obj2 == null)
    return false;
  if (typeof obj1 !== "object" && typeof obj2 !== "object")
    return obj1 === obj2;
  if (obj1.constructor !== obj2.constructor)
    return false;
  if (obj1 instanceof Date && obj2 instanceof Date) {
    return obj1.getTime() === obj2.getTime();
  }
  if (Array.isArray(obj1)) {
    if (obj1.length !== obj2.length)
      return false;
    for (let i = 0; i < obj1.length; i++) {
      if (!isDeepEqualData(obj1[i], obj2[i]))
        return false;
    }
    return true;
  }
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  if (keys1.length !== keys2.length)
    return false;
  for (const key of keys1) {
    if (!keys2.includes(key))
      return false;
    if (!isDeepEqualData(obj1[key], obj2[key]))
      return false;
  }
  return true;
}
createIdGenerator$1({ prefix: "aiobj", size: 24 });
var output_exports = {};
__export(output_exports, {
  object: () => object,
  text: () => text
});
var text = () => ({
  type: "text",
  responseFormat: { type: "text" },
  async parsePartial({ text: text2 }) {
    return { partial: text2 };
  },
  async parseOutput({ text: text2 }) {
    return text2;
  }
});
var object = ({
  schema: inputSchema
}) => {
  const schema = asSchema(inputSchema);
  return {
    type: "object",
    responseFormat: {
      type: "json",
      schema: schema.jsonSchema
    },
    async parsePartial({ text: text2 }) {
      const result = await parsePartialJson(text2);
      switch (result.state) {
        case "failed-parse":
        case "undefined-input":
          return void 0;
        case "repaired-parse":
        case "successful-parse":
          return {
            // Note: currently no validation of partial results:
            partial: result.value
          };
        default: {
          const _exhaustiveCheck = result.state;
          throw new Error(`Unsupported parse state: ${_exhaustiveCheck}`);
        }
      }
    },
    async parseOutput({ text: text2 }, context) {
      const parseResult = await safeParseJSON({ text: text2 });
      if (!parseResult.success) {
        throw new NoObjectGeneratedError({
          message: "No object generated: could not parse the response.",
          cause: parseResult.error,
          text: text2,
          response: context.response,
          usage: context.usage,
          finishReason: context.finishReason
        });
      }
      const validationResult = await safeValidateTypes({
        value: parseResult.value,
        schema
      });
      if (!validationResult.success) {
        throw new NoObjectGeneratedError({
          message: "No object generated: response did not match schema.",
          cause: validationResult.error,
          text: text2,
          response: context.response,
          usage: context.usage,
          finishReason: context.finishReason
        });
      }
      return validationResult.value;
    }
  };
};

var IDX=256, HEX=[], BUFFER;
while (IDX--) HEX[IDX] = (IDX + 256).toString(16).substring(1);

function v4() {
	var i=0, num, out='';

	if (!BUFFER || ((IDX + 16) > 256)) {
		BUFFER = Array(i=256);
		while (i--) BUFFER[i] = 256 * Math.random() | 0;
		i = IDX = 0;
	}

	for (; i < 16; i++) {
		num = BUFFER[IDX + i];
		if (i==6) out += HEX[num & 15 | 64];
		else if (i==8) out += HEX[num & 63 | 128];
		else out += HEX[num];

		if (i & 1 && i > 1 && i < 11) out += '-';
	}

	IDX++;
	return out;
}

// src/combine-headers.ts
var createIdGenerator = ({
  prefix,
  size = 16,
  alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  separator = "-"
} = {}) => {
  const generator = () => {
    const alphabetLength = alphabet.length;
    const chars = new Array(size);
    for (let i = 0; i < size; i++) {
      chars[i] = alphabet[Math.random() * alphabetLength | 0];
    }
    return chars.join("");
  };
  if (prefix == null) {
    return generator;
  }
  if (alphabet.includes(separator)) {
    throw new InvalidArgumentError$1({
      argument: "separator",
      message: `The separator "${separator}" must not be part of the alphabet "${alphabet}".`
    });
  }
  return () => `${prefix}${separator}${generator()}`;
};
createIdGenerator();

// src/is-abort-error.ts
function isAbortError(error) {
  return (error instanceof Error || error instanceof DOMException) && (error.name === "AbortError" || error.name === "ResponseAborted" || // Next.js
  error.name === "TimeoutError");
}

// src/inject-json-instruction.ts
var DEFAULT_SCHEMA_PREFIX = "JSON schema:";
var DEFAULT_SCHEMA_SUFFIX = "You MUST answer with a JSON object that matches the JSON schema above.";
var DEFAULT_GENERIC_SUFFIX = "You MUST answer with JSON.";
function injectJsonInstruction({
  prompt,
  schema,
  schemaPrefix = schema != null ? DEFAULT_SCHEMA_PREFIX : void 0,
  schemaSuffix = schema != null ? DEFAULT_SCHEMA_SUFFIX : DEFAULT_GENERIC_SUFFIX
}) {
  return [
    prompt != null && prompt.length > 0 ? prompt : void 0,
    prompt != null && prompt.length > 0 ? "" : void 0,
    // add a newline if prompt is not null
    schemaPrefix,
    schema != null ? JSON.stringify(schema) : void 0,
    schemaSuffix
  ].filter((line) => line != null).join("\n");
}
function injectJsonInstructionIntoMessages({
  messages,
  schema,
  schemaPrefix,
  schemaSuffix
}) {
  var _a2, _b2;
  const systemMessage = ((_a2 = messages[0]) == null ? void 0 : _a2.role) === "system" ? { ...messages[0] } : { role: "system", content: "" };
  systemMessage.content = injectJsonInstruction({
    prompt: systemMessage.content,
    schema,
    schemaPrefix,
    schemaSuffix
  });
  return [
    systemMessage,
    ...((_b2 = messages[0]) == null ? void 0 : _b2.role) === "system" ? messages.slice(1) : messages
  ];
}

// src/is-url-supported.ts
function isUrlSupported({
  mediaType,
  url,
  supportedUrls
}) {
  url = url.toLowerCase();
  mediaType = mediaType.toLowerCase();
  return Object.entries(supportedUrls).map(([key, value]) => {
    const mediaType2 = key.toLowerCase();
    return mediaType2 === "*" || mediaType2 === "*/*" ? { mediaTypePrefix: "", regexes: value } : { mediaTypePrefix: mediaType2.replace(/\*/, ""), regexes: value };
  }).filter(({ mediaTypePrefix }) => mediaType.startsWith(mediaTypePrefix)).flatMap(({ regexes }) => regexes).some((pattern) => pattern.test(url));
}
new Set(
  "ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvxyz0123456789"
);

// src/uint8-utils.ts
var { btoa, atob } = globalThis;
function convertBase64ToUint8Array(base64String) {
  const base64Url = base64String.replace(/-/g, "+").replace(/_/g, "/");
  const latin1string = atob(base64Url);
  return Uint8Array.from(latin1string, (byte) => byte.codePointAt(0));
}
function convertUint8ArrayToBase64(array) {
  let latin1string = "";
  for (let i = 0; i < array.length; i++) {
    latin1string += String.fromCodePoint(array[i]);
  }
  return btoa(latin1string);
}

// src/agent/message-list/detection/TypeDetector.ts
var TypeDetector = class _TypeDetector {
  /**
   * Check if a message is a MastraDBMessage (format 2)
   */
  static isMastraDBMessage(msg) {
    return Boolean(
      "content" in msg && msg.content && !Array.isArray(msg.content) && typeof msg.content !== "string" && "format" in msg.content && msg.content.format === 2
    );
  }
  /**
   * Check if a message is a MastraMessageV1 (legacy format)
   */
  static isMastraMessageV1(msg) {
    return !_TypeDetector.isMastraDBMessage(msg) && ("threadId" in msg || "resourceId" in msg);
  }
  /**
   * Check if a message is either Mastra format (V1 or V2/DB)
   */
  static isMastraMessage(msg) {
    return _TypeDetector.isMastraDBMessage(msg) || _TypeDetector.isMastraMessageV1(msg);
  }
  /**
   * Check if a message is an AIV4 UIMessage
   */
  static isAIV4UIMessage(msg) {
    return !_TypeDetector.isMastraMessage(msg) && !_TypeDetector.isAIV4CoreMessage(msg) && "parts" in msg && !_TypeDetector.hasAIV5UIMessageCharacteristics(msg);
  }
  /**
   * Check if a message is an AIV6 UIMessage.
   *
   * At runtime, the v5 and v6 UI shapes overlap heavily. We only treat a
   * message as distinctly v6 if it uses v6-only parts or tool states.
   */
  static isAIV6UIMessage(msg) {
    return !_TypeDetector.isMastraMessage(msg) && !_TypeDetector.isAIV4CoreMessage(msg) && "parts" in msg && _TypeDetector.hasAIV6UIMessageCharacteristics(
      msg
    );
  }
  /**
   * Check if a message is an AIV5 UIMessage
   */
  static isAIV5UIMessage(msg) {
    return !_TypeDetector.isMastraMessage(msg) && !_TypeDetector.isAIV6UIMessage(msg) && !_TypeDetector.isAIV5CoreMessage(msg) && "parts" in msg && _TypeDetector.hasAIV5UIMessageCharacteristics(msg);
  }
  /**
   * Check if a message is an AIV4 CoreMessage
   */
  static isAIV4CoreMessage(msg) {
    return !_TypeDetector.isMastraMessage(msg) && !("parts" in msg) && "content" in msg && !_TypeDetector.hasAIV5CoreMessageCharacteristics(msg);
  }
  /**
   * Check if a message is an AIV6 ModelMessage (CoreMessage equivalent).
   */
  static isAIV6CoreMessage(msg) {
    return !_TypeDetector.isMastraMessage(msg) && !("parts" in msg) && "content" in msg && _TypeDetector.hasAIV6CoreMessageCharacteristics(
      msg
    );
  }
  /**
   * Check if a message is an AIV5 ModelMessage (CoreMessage equivalent)
   */
  static isAIV5CoreMessage(msg) {
    return !_TypeDetector.isMastraMessage(msg) && !_TypeDetector.isAIV6CoreMessage(msg) && !("parts" in msg) && "content" in msg && _TypeDetector.hasAIV5CoreMessageCharacteristics(msg);
  }
  /**
   * Check if a message has AIV6-only UI characteristics.
   */
  static hasAIV6UIMessageCharacteristics(msg) {
    if (!("parts" in msg) || !msg.parts) return false;
    for (const part of msg.parts) {
      if (part.type === "source-document") return true;
      if ("toolCallId" in part && "state" in part && (part.state === "approval-requested" || part.state === "approval-responded" || part.state === "output-denied")) {
        return true;
      }
    }
    return false;
  }
  /**
   * Check if a message has AIV5 UIMessage characteristics
   *
   * V5 UIMessages have specific part types and field names that differ from V4.
   */
  static hasAIV5UIMessageCharacteristics(msg) {
    if ("toolInvocations" in msg || "reasoning" in msg || "experimental_attachments" in msg || "data" in msg || "annotations" in msg)
      return false;
    if (!msg.parts) return false;
    for (const part of msg.parts) {
      if ("metadata" in part) return true;
      if ("toolInvocation" in part) return false;
      if ("toolCallId" in part) return true;
      if (part.type === "source") return false;
      if (part.type === "source-url") return true;
      if (part.type === "reasoning") {
        if ("state" in part || "text" in part) return true;
        if ("reasoning" in part || "details" in part) return false;
      }
      if (part.type === "file" && "mediaType" in part) return true;
    }
    return false;
  }
  /**
   * Check if a message has AIV6-only core characteristics.
   */
  static hasAIV6CoreMessageCharacteristics(msg) {
    if ("parts" in msg || typeof msg.content === "string") return false;
    return msg.content.some((part) => part.type === "tool-approval-request" || part.type === "tool-approval-response");
  }
  /**
   * Check if a message has AIV5 CoreMessage characteristics
   *
   * V5 ModelMessages use different field names from v4
   * (for example `output` vs `result`, `input` vs `args`,
   * `mediaType` vs `mimeType`).
   */
  static hasAIV5CoreMessageCharacteristics(msg) {
    if ("experimental_providerMetadata" in msg) return false;
    if (typeof msg.content === "string") return true;
    for (const part of msg.content) {
      if (part.type === "tool-result" && "output" in part) return true;
      if (part.type === "tool-call" && "input" in part) return true;
      if (part.type === "tool-result" && "result" in part) return false;
      if (part.type === "tool-call" && "args" in part) return false;
      if ("mediaType" in part) return true;
      if ("mimeType" in part) return false;
      if ("experimental_providerMetadata" in part) return false;
      if (part.type === "reasoning" && "signature" in part) return false;
      if (part.type === "redacted-reasoning") return false;
    }
    return true;
  }
  /**
   * Get the normalized role for a message
   * Maps `tool` to `assistant` because tool messages are displayed as part of
   * the assistant conversation.
   */
  static getRole(message) {
    if (message.role === "assistant" || message.role === "tool") return "assistant";
    if (message.role === "user") return "user";
    if (message.role === "system") return "system";
    throw new Error(
      `BUG: add handling for message role ${message.role} in message ${JSON.stringify(message, null, 2)}`
    );
  }
};
function convertDataContentToBase64String(content) {
  if (typeof content === "string") {
    return content;
  }
  if (content instanceof ArrayBuffer) {
    return convertUint8ArrayToBase64(new Uint8Array(content));
  }
  return convertUint8ArrayToBase64(content);
}

// src/agent/message-list/prompt/image-utils.ts
function parseDataUri(dataUri) {
  if (!dataUri.startsWith("data:")) {
    return {
      isDataUri: false,
      base64Content: dataUri
    };
  }
  const base64Index = dataUri.indexOf(",");
  if (base64Index === -1) {
    return {
      isDataUri: true,
      base64Content: dataUri
    };
  }
  const header = dataUri.substring(5, base64Index);
  const base64Content = dataUri.substring(base64Index + 1);
  const semicolonIndex = header.indexOf(";");
  const mimeType = semicolonIndex !== -1 ? header.substring(0, semicolonIndex) : header;
  return {
    isDataUri: true,
    mimeType: mimeType || void 0,
    base64Content
  };
}
function createDataUri(base64Content, mimeType = "application/octet-stream") {
  if (base64Content.startsWith("data:")) {
    return base64Content;
  }
  return `data:${mimeType};base64,${base64Content}`;
}
function imageContentToString(image, fallbackMimeType) {
  if (typeof image === "string") {
    return image;
  }
  if (image instanceof URL) {
    return image.toString();
  }
  if (image instanceof Uint8Array || image instanceof ArrayBuffer || globalThis.Buffer && Buffer.isBuffer(image)) {
    const base64 = convertDataContentToBase64String(image);
    return base64;
  }
  return String(image);
}
function getImageCacheKey(image) {
  if (image instanceof URL) {
    return image.toString();
  }
  if (typeof image === "string") {
    return image.length;
  }
  if (image instanceof Uint8Array) {
    return image.byteLength;
  }
  if (image instanceof ArrayBuffer) {
    return image.byteLength;
  }
  return image;
}
function isValidUrl(str) {
  try {
    new URL(str);
    return true;
  } catch {
    if (str.startsWith("//")) {
      try {
        new URL(`https:${str}`);
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }
}
function categorizeFileData(data, fallbackMimeType) {
  const parsed = parseDataUri(data);
  const mimeType = parsed.isDataUri && parsed.mimeType ? parsed.mimeType : fallbackMimeType;
  if (parsed.isDataUri) {
    return {
      type: "dataUri",
      mimeType,
      data
    };
  }
  if (isValidUrl(data)) {
    return {
      type: "url",
      mimeType,
      data
    };
  }
  return {
    type: "raw",
    mimeType,
    data
  };
}

// src/agent/message-list/utils/provider-compat.ts
function ensureGeminiCompatibleMessages(messages, logger) {
  const result = [...messages];
  const firstNonSystemIndex = result.findIndex((m) => m.role !== "system");
  if (firstNonSystemIndex === -1) {
    if (result.length > 0) {
      logger?.warn(
        "No user or assistant messages in the request. Some providers (e.g. Gemini) require at least one user message to generate a response."
      );
    }
  } else if (result[firstNonSystemIndex]?.role === "assistant") {
    result.splice(firstNonSystemIndex, 0, {
      role: "user",
      content: "."
    });
  }
  return result;
}
function ensureAnthropicCompatibleMessages(messages, dbMessages) {
  return messages.map((msg) => enrichToolResultsWithInput(msg, dbMessages));
}
function enrichToolResultsWithInput(message, dbMessages) {
  if (message.role !== "tool" || !Array.isArray(message.content)) {
    return message;
  }
  return {
    ...message,
    content: message.content.map((part) => {
      if (part.type === "tool-result") {
        return {
          ...part,
          input: findToolCallArgs(dbMessages, part.toolCallId)
        };
      }
      return part;
    })
  };
}
function findToolCallArgs(messages, toolCallId) {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (!msg || msg.role !== "assistant") {
      continue;
    }
    if (msg.content.parts) {
      const toolCallPart = msg.content.parts.find(
        (p) => p.type === "tool-invocation" && p.toolInvocation.toolCallId === toolCallId
      );
      if (toolCallPart && toolCallPart.type === "tool-invocation") {
        return toolCallPart.toolInvocation.args || {};
      }
    }
    if (msg.content.toolInvocations) {
      const toolInvocation = msg.content.toolInvocations.find((inv) => inv.toolCallId === toolCallId);
      if (toolInvocation) {
        return toolInvocation.args || {};
      }
    }
  }
  return {};
}

// src/agent/message-list/adapters/AIV4Adapter.ts
function filterDataParts(parts) {
  return parts.filter((part) => !part.type.startsWith("data-"));
}
function filterEmptyTextParts(parts) {
  const hasNonEmptyParts = parts.some((part) => !(part.type === "text" && part.text === ""));
  if (!hasNonEmptyParts) return parts;
  return parts.filter((part) => {
    if (part.type === "text") {
      return part.text !== "";
    }
    return true;
  });
}
var AIV4Adapter = class {
  /**
   * Convert MastraDBMessage to AI SDK V4 UIMessage
   */
  static toUIMessage(m) {
    const experimentalAttachments = m.content.experimental_attachments ? [...m.content.experimental_attachments] : [];
    const contentString = typeof m.content.content === `string` && m.content.content !== "" ? m.content.content : (m.content.parts ?? []).reduce((prev, part) => {
      if (part.type === `text`) {
        return part.text;
      }
      return prev;
    }, "");
    const parts = [];
    const sourceParts = m.content.parts ?? [];
    if (sourceParts.length) {
      for (const part of sourceParts) {
        if (part.type === `file`) {
          let normalizedUrl;
          if (typeof part.data === "string") {
            const categorized = categorizeFileData(part.data, part.mimeType);
            if (categorized.type === "raw") {
              normalizedUrl = createDataUri(part.data, part.mimeType || "application/octet-stream");
            } else {
              normalizedUrl = part.data;
            }
          } else {
            normalizedUrl = part.data;
          }
          experimentalAttachments.push({
            contentType: part.mimeType,
            url: normalizedUrl
          });
        } else if (part.type === "tool-invocation" && (part.toolInvocation.state === "call" || part.toolInvocation.state === "partial-call")) {
          continue;
        } else if (part.type === "tool-invocation") {
          const toolInvocation = { ...part.toolInvocation };
          let currentStep = -1;
          let toolStep = -1;
          for (const innerPart of sourceParts) {
            if (innerPart.type === `step-start`) currentStep++;
            if (innerPart.type === `tool-invocation` && innerPart.toolInvocation.toolCallId === part.toolInvocation.toolCallId) {
              toolStep = currentStep;
              break;
            }
          }
          if (toolStep >= 0) {
            const preparedInvocation = {
              step: toolStep,
              ...toolInvocation
            };
            parts.push({
              type: "tool-invocation",
              toolInvocation: preparedInvocation
            });
          } else {
            parts.push({
              type: "tool-invocation",
              toolInvocation
            });
          }
        } else {
          parts.push(part);
        }
      }
    }
    if (parts.length === 0 && experimentalAttachments.length > 0) {
      parts.push({ type: "text", text: "" });
    }
    const v4Parts = filterDataParts(parts);
    if (m.role === `user`) {
      const uiMessage2 = {
        id: m.id,
        role: m.role,
        content: m.content.content || contentString,
        createdAt: m.createdAt,
        parts: v4Parts,
        experimental_attachments: experimentalAttachments
      };
      if (m.content.metadata) {
        uiMessage2.metadata = m.content.metadata;
      }
      return uiMessage2;
    } else if (m.role === `assistant`) {
      const isSingleTextContentArray = Array.isArray(m.content.content) && m.content.content.length === 1 && m.content.content[0].type === `text`;
      const uiMessage2 = {
        id: m.id,
        role: m.role,
        content: isSingleTextContentArray ? contentString : m.content.content || contentString,
        createdAt: m.createdAt,
        parts: v4Parts,
        reasoning: void 0,
        toolInvocations: `toolInvocations` in m.content ? m.content.toolInvocations?.filter((t) => t.state === "result") : void 0
      };
      if (m.content.metadata) {
        uiMessage2.metadata = m.content.metadata;
      }
      return uiMessage2;
    }
    const uiMessage = {
      id: m.id,
      role: m.role,
      content: m.content.content || contentString,
      createdAt: m.createdAt,
      parts: v4Parts,
      experimental_attachments: experimentalAttachments
    };
    if (m.content.metadata) {
      uiMessage.metadata = m.content.metadata;
    }
    return uiMessage;
  }
  /**
   * Converts a MastraDBMessage system message directly to AIV4 CoreMessage format
   */
  static systemToV4Core(message) {
    if (message.role !== `system` || !message.content.content)
      throw new MastraError({
        id: "INVALID_SYSTEM_MESSAGE_FORMAT",
        domain: "AGENT" /* AGENT */,
        category: "USER" /* USER */,
        text: `Invalid system message format. System messages must include 'role' and 'content' properties. The content should be a string.`,
        details: {
          receivedMessage: JSON.stringify(message, null, 2)
        }
      });
    const coreMessage = { role: "system", content: message.content.content };
    if (message.content.providerMetadata) {
      coreMessage.experimental_providerMetadata = message.content.providerMetadata;
    }
    return coreMessage;
  }
  /**
   * Convert AI SDK V4 UIMessage to MastraDBMessage
   */
  static fromUIMessage(message, ctx, messageSource) {
    const filteredParts = message.parts ? filterEmptyTextParts(message.parts) : [];
    const content = {
      format: 2,
      parts: filteredParts
    };
    if (message.toolInvocations) content.toolInvocations = message.toolInvocations;
    if (message.reasoning) content.reasoning = message.reasoning;
    if (message.annotations) content.annotations = message.annotations;
    if (message.experimental_attachments) {
      content.experimental_attachments = message.experimental_attachments;
    }
    if ("metadata" in message && message.metadata !== null && message.metadata !== void 0) {
      content.metadata = message.metadata;
    }
    return {
      id: message.id || ctx.newMessageId(),
      role: TypeDetector.getRole(message),
      createdAt: ctx.generateCreatedAt(messageSource, message.createdAt),
      threadId: ctx.memoryInfo?.threadId,
      resourceId: ctx.memoryInfo?.resourceId,
      content
    };
  }
  /**
   * Convert AI SDK V4 CoreMessage to MastraDBMessage
   */
  static fromCoreMessage(coreMessage, ctx, messageSource) {
    const id = `id` in coreMessage ? coreMessage.id : ctx.newMessageId();
    const parts = [];
    const experimentalAttachments = [];
    const toolInvocations = [];
    const isSingleTextContent = messageSource === `response` && Array.isArray(coreMessage.content) && coreMessage.content.length === 1 && coreMessage.content[0] && coreMessage.content[0].type === `text` && `text` in coreMessage.content[0] && coreMessage.content[0].text;
    if (isSingleTextContent && messageSource === `response`) {
      coreMessage.content = isSingleTextContent;
    }
    if (typeof coreMessage.content === "string") {
      parts.push({
        type: "text",
        text: coreMessage.content
      });
    } else if (Array.isArray(coreMessage.content)) {
      for (const aiV4Part of coreMessage.content) {
        switch (aiV4Part.type) {
          case "text": {
            const prevPart = parts.at(-1);
            if (coreMessage.role === "assistant" && prevPart && prevPart.type === "tool-invocation") {
              parts.push({ type: "step-start" });
            }
            const part = {
              type: "text",
              text: aiV4Part.text
            };
            if (aiV4Part.providerOptions) {
              part.providerMetadata = aiV4Part.providerOptions;
            }
            parts.push(part);
            break;
          }
          case "tool-call": {
            const part = {
              type: "tool-invocation",
              toolInvocation: {
                state: "call",
                toolCallId: aiV4Part.toolCallId,
                toolName: aiV4Part.toolName,
                args: aiV4Part.args
              }
            };
            if (aiV4Part.providerOptions) {
              part.providerMetadata = aiV4Part.providerOptions;
            }
            parts.push(part);
            break;
          }
          case "tool-result":
            {
              let toolArgs = {};
              const toolCallInSameMsg = coreMessage.content.find(
                (p) => p.type === "tool-call" && p.toolCallId === aiV4Part.toolCallId
              );
              if (toolCallInSameMsg && toolCallInSameMsg.type === "tool-call") {
                toolArgs = toolCallInSameMsg.args;
              }
              if (Object.keys(toolArgs).length === 0 && ctx.dbMessages) {
                toolArgs = findToolCallArgs(ctx.dbMessages, aiV4Part.toolCallId);
              }
              const invocation = {
                state: "result",
                toolCallId: aiV4Part.toolCallId,
                toolName: aiV4Part.toolName,
                result: aiV4Part.result ?? "",
                args: toolArgs
              };
              const part = {
                type: "tool-invocation",
                toolInvocation: invocation
              };
              if (aiV4Part.providerOptions) {
                part.providerMetadata = aiV4Part.providerOptions;
              }
              parts.push(part);
              toolInvocations.push(invocation);
            }
            break;
          case "reasoning":
            {
              const part = {
                type: "reasoning",
                reasoning: "",
                details: [{ type: "text", text: aiV4Part.text, signature: aiV4Part.signature }]
              };
              if (aiV4Part.providerOptions) {
                part.providerMetadata = aiV4Part.providerOptions;
              }
              parts.push(part);
            }
            break;
          case "redacted-reasoning":
            {
              const part = {
                type: "reasoning",
                reasoning: "",
                details: [{ type: "redacted", data: aiV4Part.data }]
              };
              if (aiV4Part.providerOptions) {
                part.providerMetadata = aiV4Part.providerOptions;
              }
              parts.push(part);
            }
            break;
          case "image": {
            const part = {
              type: "file",
              data: imageContentToString(aiV4Part.image),
              mimeType: aiV4Part.mimeType
            };
            if (aiV4Part.providerOptions) {
              part.providerMetadata = aiV4Part.providerOptions;
            }
            parts.push(part);
            break;
          }
          case "file": {
            if (aiV4Part.data instanceof URL) {
              const part = {
                type: "file",
                data: aiV4Part.data.toString(),
                mimeType: aiV4Part.mimeType
              };
              if (aiV4Part.providerOptions) {
                part.providerMetadata = aiV4Part.providerOptions;
              }
              if (aiV4Part.filename) {
                part.filename = aiV4Part.filename;
              }
              parts.push(part);
            } else if (typeof aiV4Part.data === "string") {
              const categorized = categorizeFileData(aiV4Part.data, aiV4Part.mimeType);
              if (categorized.type === "url" || categorized.type === "dataUri") {
                const part = {
                  type: "file",
                  data: aiV4Part.data,
                  mimeType: categorized.mimeType || "image/png"
                };
                if (aiV4Part.providerOptions) {
                  part.providerMetadata = aiV4Part.providerOptions;
                }
                if (aiV4Part.filename) {
                  part.filename = aiV4Part.filename;
                }
                parts.push(part);
              } else {
                try {
                  const part = {
                    type: "file",
                    mimeType: categorized.mimeType || "image/png",
                    data: convertDataContentToBase64String(aiV4Part.data)
                  };
                  if (aiV4Part.providerOptions) {
                    part.providerMetadata = aiV4Part.providerOptions;
                  }
                  if (aiV4Part.filename) {
                    part.filename = aiV4Part.filename;
                  }
                  parts.push(part);
                } catch (error) {
                  console.error(`Failed to convert binary data to base64 in CoreMessage file part: ${error}`, error);
                }
              }
            } else {
              try {
                const part = {
                  type: "file",
                  mimeType: aiV4Part.mimeType,
                  data: convertDataContentToBase64String(aiV4Part.data)
                };
                if (aiV4Part.providerOptions) {
                  part.providerMetadata = aiV4Part.providerOptions;
                }
                if (aiV4Part.filename) {
                  part.filename = aiV4Part.filename;
                }
                parts.push(part);
              } catch (error) {
                console.error(`Failed to convert binary data to base64 in CoreMessage file part: ${error}`, error);
              }
            }
            break;
          }
        }
      }
    }
    const filteredParts = filterEmptyTextParts(parts);
    const content = {
      format: 2,
      parts: filteredParts
    };
    if (toolInvocations.length) content.toolInvocations = toolInvocations;
    if (typeof coreMessage.content === `string`) content.content = coreMessage.content;
    if (experimentalAttachments.length) content.experimental_attachments = experimentalAttachments;
    if (coreMessage.providerOptions) {
      content.providerMetadata = coreMessage.providerOptions;
    } else if ("experimental_providerMetadata" in coreMessage && coreMessage.experimental_providerMetadata) {
      content.providerMetadata = coreMessage.experimental_providerMetadata;
    }
    if ("metadata" in coreMessage && coreMessage.metadata !== null && coreMessage.metadata !== void 0) {
      content.metadata = coreMessage.metadata;
    }
    const rawCreatedAt = "metadata" in coreMessage && coreMessage.metadata && typeof coreMessage.metadata === "object" && "createdAt" in coreMessage.metadata ? coreMessage.metadata.createdAt : void 0;
    return {
      id,
      role: TypeDetector.getRole(coreMessage),
      createdAt: ctx.generateCreatedAt(messageSource, rawCreatedAt),
      threadId: ctx.memoryInfo?.threadId,
      resourceId: ctx.memoryInfo?.resourceId,
      content
    };
  }
};

// src/agent/message-list/utils/tool-name.ts
var TOOL_NAME_PATTERN = /^[a-zA-Z0-9_-]+$/;
var FALLBACK_TOOL_NAME = "unknown_tool";
function sanitizeToolName(toolName) {
  if (typeof toolName !== "string") {
    return FALLBACK_TOOL_NAME;
  }
  return TOOL_NAME_PATTERN.test(toolName) ? toolName : FALLBACK_TOOL_NAME;
}

// src/agent/message-list/adapters/AIV5Adapter.ts
function filterEmptyTextParts2(parts) {
  const hasNonEmptyParts = parts.some((part) => !(part.type === "text" && part.text === ""));
  if (!hasNonEmptyParts) return parts;
  return parts.filter((part) => {
    if (part.type === "text") {
      return part.text !== "";
    }
    return true;
  });
}
function getToolName(type) {
  if (typeof type === "object" && type && "type" in type) {
    type = type.type;
  }
  if (typeof type !== "string") {
    return sanitizeToolName(type);
  }
  if (type === "dynamic-tool") {
    return "dynamic-tool";
  }
  if (type.startsWith("tool-")) {
    return sanitizeToolName(type.slice("tool-".length));
  }
  return sanitizeToolName(type);
}
function mergeMastraCreatedAt(metadata, createdAt) {
  if (createdAt == null) {
    return metadata;
  }
  return {
    ...metadata || {},
    mastra: {
      ...(metadata || {}).mastra || {},
      createdAt
    }
  };
}
function getMastraCreatedAt(providerMetadata) {
  const value = providerMetadata?.mastra;
  if (!value || typeof value !== "object") {
    return void 0;
  }
  const createdAt = value.createdAt;
  return typeof createdAt === "number" ? createdAt : void 0;
}
var AIV5Adapter = class {
  /**
   * Direct conversion from MastraDBMessage to AIV5 UIMessage
   */
  static toUIMessage(dbMsg) {
    const parts = [];
    const metadata = { ...dbMsg.content.metadata || {} };
    if (dbMsg.createdAt) metadata.createdAt = dbMsg.createdAt;
    if (dbMsg.threadId) metadata.threadId = dbMsg.threadId;
    if (dbMsg.resourceId) metadata.resourceId = dbMsg.resourceId;
    if (dbMsg.content.providerMetadata) {
      metadata.providerMetadata = dbMsg.content.providerMetadata;
    }
    const hasToolInvocationParts = dbMsg.content.parts?.some((p) => p.type === "tool-invocation");
    if (dbMsg.content.toolInvocations && !hasToolInvocationParts) {
      for (const invocation of dbMsg.content.toolInvocations) {
        if (invocation.state === "result") {
          parts.push({
            type: `tool-${invocation.toolName}`,
            toolCallId: invocation.toolCallId,
            state: "output-available",
            input: invocation.args,
            output: invocation.result
          });
        } else {
          parts.push({
            type: `tool-${invocation.toolName}`,
            toolCallId: invocation.toolCallId,
            state: invocation.state === "call" ? "input-available" : "input-streaming",
            input: invocation.args
          });
        }
      }
    }
    const hasReasoningInParts = dbMsg.content.parts?.some((p) => p.type === "reasoning");
    const hasFileInParts = dbMsg.content.parts?.some((p) => p.type === "file");
    if (dbMsg.content.reasoning && !hasReasoningInParts) {
      parts.push({
        type: "reasoning",
        text: dbMsg.content.reasoning
      });
    }
    const attachmentUrls = /* @__PURE__ */ new Set();
    if (dbMsg.content.experimental_attachments && !hasFileInParts) {
      for (const attachment of dbMsg.content.experimental_attachments) {
        attachmentUrls.add(attachment.url);
        parts.push({
          type: "file",
          url: attachment.url,
          mediaType: attachment.contentType || "unknown"
        });
      }
    }
    let hasNonToolReasoningParts = false;
    if (dbMsg.content.parts) {
      for (const part of dbMsg.content.parts) {
        if (part.type === "tool-invocation" && part.toolInvocation) {
          const inv = part.toolInvocation;
          if (inv.state === "result") {
            parts.push({
              type: `tool-${inv.toolName}`,
              toolCallId: inv.toolCallId,
              input: inv.args,
              output: inv.result,
              state: "output-available",
              callProviderMetadata: mergeMastraCreatedAt(part.providerMetadata, part.createdAt),
              providerExecuted: part.providerExecuted
            });
          } else {
            parts.push({
              type: `tool-${inv.toolName}`,
              toolCallId: inv.toolCallId,
              input: inv.args,
              state: "input-available",
              callProviderMetadata: mergeMastraCreatedAt(part.providerMetadata, part.createdAt),
              providerExecuted: part.providerExecuted
            });
          }
          continue;
        }
        if (part.type === "reasoning") {
          const text = part.reasoning || (part.details?.reduce((p, c) => {
            if (c.type === `text` && c.text) return p + c.text;
            return p;
          }, "") ?? "");
          if (text || part.details?.length) {
            const v5UIPart = {
              type: "reasoning",
              text: text || "",
              state: "done"
            };
            v5UIPart.providerMetadata = mergeMastraCreatedAt(part.providerMetadata, part.createdAt);
            parts.push(v5UIPart);
          }
          continue;
        }
        if (part.type === "tool-invocation" || part.type.startsWith("tool-")) {
          continue;
        }
        if (part.type === "file") {
          if (typeof part.data === "string" && attachmentUrls.has(part.data)) {
            continue;
          }
          const categorized = typeof part.data === "string" ? categorizeFileData(part.data, part.mimeType) : { type: "raw", mimeType: part.mimeType};
          if (categorized.type === "url" && typeof part.data === "string") {
            const v5UIPart = {
              type: "file",
              url: part.data,
              mediaType: categorized.mimeType || "image/png"
            };
            v5UIPart.providerMetadata = mergeMastraCreatedAt(part.providerMetadata, part.createdAt);
            parts.push(v5UIPart);
          } else {
            let filePartData;
            let extractedMimeType = part.mimeType;
            if (typeof part.data === "string") {
              const parsed = parseDataUri(part.data);
              if (parsed.isDataUri) {
                filePartData = parsed.base64Content;
                if (parsed.mimeType) {
                  extractedMimeType = extractedMimeType || parsed.mimeType;
                }
              } else {
                filePartData = part.data;
              }
            } else {
              filePartData = part.data;
            }
            const finalMimeType = extractedMimeType || "image/png";
            let dataUri;
            if (typeof filePartData === "string" && filePartData.startsWith("data:")) {
              dataUri = filePartData;
            } else {
              dataUri = createDataUri(filePartData, finalMimeType);
            }
            const v5UIPart = {
              type: "file",
              url: dataUri,
              mediaType: finalMimeType
            };
            v5UIPart.providerMetadata = mergeMastraCreatedAt(part.providerMetadata, part.createdAt);
            parts.push(v5UIPart);
          }
        } else if (part.type === "source") {
          const v5UIPart = {
            type: "source-url",
            url: part.source.url,
            sourceId: part.source.id,
            title: part.source.title
          };
          v5UIPart.providerMetadata = mergeMastraCreatedAt(part.providerMetadata, part.createdAt);
          parts.push(v5UIPart);
        } else if (part.type === "source-document") {
          continue;
        } else if (part.type === "text") {
          const v5UIPart = {
            type: "text",
            text: part.text
          };
          v5UIPart.providerMetadata = mergeMastraCreatedAt(part.providerMetadata, part.createdAt);
          parts.push(v5UIPart);
          hasNonToolReasoningParts = true;
        } else {
          parts.push(part);
          hasNonToolReasoningParts = true;
        }
      }
    }
    if (dbMsg.content.content && !hasNonToolReasoningParts) {
      parts.push({ type: "text", text: dbMsg.content.content });
    }
    return {
      id: dbMsg.id,
      role: dbMsg.role,
      metadata,
      parts
    };
  }
  /**
   * Direct conversion from AIV5 UIMessage to MastraDBMessage
   */
  static fromUIMessage(uiMsg) {
    const { parts, metadata: rawMetadata } = uiMsg;
    const metadata = rawMetadata || {};
    const createdAtValue = metadata.createdAt;
    const createdAt = createdAtValue ? typeof createdAtValue === "string" ? new Date(createdAtValue) : createdAtValue instanceof Date ? createdAtValue : /* @__PURE__ */ new Date() : /* @__PURE__ */ new Date();
    const threadId = metadata.threadId;
    const resourceId = metadata.resourceId;
    const cleanMetadata = { ...metadata };
    delete cleanMetadata.createdAt;
    delete cleanMetadata.threadId;
    delete cleanMetadata.resourceId;
    const toolInvocationParts = parts.filter((p) => isToolUIPart(p));
    const reasoningParts = parts.filter((p) => p.type === "reasoning");
    const fileParts = parts.filter((p) => p.type === "file");
    const textParts = parts.filter((p) => p.type === "text");
    let toolInvocations = void 0;
    if (toolInvocationParts.length > 0) {
      toolInvocations = toolInvocationParts.map((p) => {
        const toolName = getToolName(p);
        if (p.state === "output-available") {
          return {
            args: p.input,
            result: typeof p.output === "object" && p.output && "value" in p.output ? p.output.value : p.output,
            toolCallId: p.toolCallId,
            toolName,
            state: "result"
          };
        }
        return {
          args: p.input,
          toolCallId: p.toolCallId,
          toolName,
          state: "call"
        };
      });
    }
    let reasoning = void 0;
    if (reasoningParts.length > 0) {
      reasoning = reasoningParts.map((p) => p.text).join("\n");
    }
    let experimental_attachments = void 0;
    if (fileParts.length > 0) {
      experimental_attachments = fileParts.map((p) => ({
        url: p.url || "",
        contentType: p.mediaType
      }));
    }
    let content = void 0;
    if (textParts.length > 0) {
      content = textParts.map((p) => p.text).join("");
    }
    const v2Parts = parts.map((p) => {
      if (isToolUIPart(p)) {
        const toolName = getToolName(p);
        const callProviderMetadata = "callProviderMetadata" in p ? p.callProviderMetadata : void 0;
        if (p.state === "output-available") {
          return {
            type: "tool-invocation",
            toolInvocation: {
              toolCallId: p.toolCallId,
              toolName,
              args: p.input,
              result: typeof p.output === "object" && p.output && "value" in p.output ? p.output.value : p.output,
              state: "result"
            },
            providerMetadata: callProviderMetadata,
            createdAt: getMastraCreatedAt(callProviderMetadata)
          };
        }
        return {
          type: "tool-invocation",
          toolInvocation: {
            toolCallId: p.toolCallId,
            toolName,
            args: p.input,
            state: "call"
          },
          providerMetadata: callProviderMetadata,
          createdAt: getMastraCreatedAt(callProviderMetadata)
        };
      }
      if (p.type === "reasoning") {
        return {
          type: "reasoning",
          reasoning: "",
          details: [
            {
              type: "text",
              text: p.text
            }
          ],
          providerMetadata: p.providerMetadata,
          createdAt: getMastraCreatedAt(p.providerMetadata)
        };
      }
      if (p.type === "file") {
        return {
          type: "file",
          mimeType: p.mediaType,
          data: p.url || "",
          providerMetadata: p.providerMetadata,
          createdAt: getMastraCreatedAt(p.providerMetadata),
          ...p.filename ? { filename: p.filename } : {}
        };
      }
      if (p.type === "source-url") {
        return {
          type: "source",
          source: {
            url: p.url,
            sourceType: "url",
            id: p.url,
            providerMetadata: p.providerMetadata
          },
          providerMetadata: p.providerMetadata,
          createdAt: getMastraCreatedAt(p.providerMetadata)
        };
      }
      if (p.type === "text") {
        return {
          type: "text",
          text: p.text,
          providerMetadata: p.providerMetadata,
          createdAt: getMastraCreatedAt(p.providerMetadata)
        };
      }
      if (p.type === "step-start") {
        return p;
      }
      if (typeof p.type === "string" && p.type.startsWith("data-")) {
        return {
          type: p.type,
          data: "data" in p ? p.data : void 0
        };
      }
      return null;
    }).filter((p) => p !== null);
    const filteredV2Parts = filterEmptyTextParts2(v2Parts);
    return {
      id: uiMsg.id,
      role: uiMsg.role,
      createdAt,
      threadId,
      resourceId,
      content: {
        format: 2,
        parts: filteredV2Parts,
        toolInvocations,
        reasoning,
        experimental_attachments,
        content,
        metadata: Object.keys(cleanMetadata).length > 0 ? cleanMetadata : void 0
      }
    };
  }
  /**
   * Convert image or file to data URI or URL for V2 file part
   */
  static getDataStringFromAIV5DataPart(part) {
    let mimeType;
    let data;
    if ("data" in part) {
      mimeType = part.mediaType || "application/octet-stream";
      data = part.data;
    } else if ("image" in part) {
      mimeType = part.mediaType || "image/jpeg";
      data = part.image;
    } else if ("url" in part && typeof part.url === "string") {
      return part.url;
    } else {
      throw new MastraError({
        id: "MASTRA_AIV5_DATA_PART_INVALID",
        domain: "AGENT" /* AGENT */,
        category: "USER" /* USER */,
        text: "Invalid AIV5 data part in getDataStringFromAIV5DataPart",
        details: {
          part
        }
      });
    }
    if (data instanceof URL) {
      return data.toString();
    } else {
      if (data instanceof Buffer) {
        const base64 = data.toString("base64");
        return `data:${mimeType};base64,${base64}`;
      } else if (typeof data === "string") {
        return data.startsWith("data:") || data.startsWith("http") ? data : `data:${mimeType};base64,${data}`;
      } else if (data instanceof Uint8Array) {
        const base64 = Buffer.from(data).toString("base64");
        return `data:${mimeType};base64,${base64}`;
      } else if (data instanceof ArrayBuffer) {
        const base64 = Buffer.from(data).toString("base64");
        return `data:${mimeType};base64,${base64}`;
      } else {
        return "";
      }
    }
  }
  /**
   * Direct conversion from AIV5 ModelMessage to MastraDBMessage
   */
  static fromModelMessage(modelMsg, _messageSource) {
    const content = Array.isArray(modelMsg.content) ? modelMsg.content : [{ type: "text", text: modelMsg.content }];
    const mastraDBParts = [];
    const toolInvocations = [];
    const reasoningParts = [];
    const experimental_attachments = [];
    for (const part of content) {
      if (part.type === "text") {
        const textPart = {
          type: "text",
          text: part.text
        };
        if (part.providerOptions) {
          textPart.providerMetadata = part.providerOptions;
          textPart.createdAt = getMastraCreatedAt(part.providerOptions);
        }
        mastraDBParts.push(textPart);
      } else if (part.type === "tool-call") {
        const toolCallPart = part;
        const toolInvocationPart = {
          type: "tool-invocation",
          toolInvocation: {
            toolCallId: toolCallPart.toolCallId,
            toolName: sanitizeToolName(toolCallPart.toolName),
            args: toolCallPart.input,
            state: "call"
          }
        };
        if (part.providerOptions) {
          toolInvocationPart.providerMetadata = part.providerOptions;
          toolInvocationPart.createdAt = getMastraCreatedAt(part.providerOptions);
        }
        mastraDBParts.push(toolInvocationPart);
        toolInvocations.push({
          toolCallId: toolCallPart.toolCallId,
          toolName: sanitizeToolName(toolCallPart.toolName),
          args: toolCallPart.input,
          state: "call"
        });
      } else if (part.type === "tool-result") {
        const toolResultPart = part;
        const matchingCall = toolInvocations.find((inv) => inv.toolCallId === toolResultPart.toolCallId);
        const matchingV2Part = mastraDBParts.find(
          (p) => p.type === "tool-invocation" && "toolInvocation" in p && p.toolInvocation.toolCallId === toolResultPart.toolCallId
        );
        const updateMatchingCallInvocationResult = (toolResultPart2, matchingCall2) => {
          matchingCall2.state = "result";
          matchingCall2.result = typeof toolResultPart2.output === "object" && toolResultPart2.output && "value" in toolResultPart2.output ? toolResultPart2.output.value : toolResultPart2.output;
        };
        if (matchingCall) {
          updateMatchingCallInvocationResult(toolResultPart, matchingCall);
        } else {
          const call = {
            state: "call",
            toolCallId: toolResultPart.toolCallId,
            toolName: sanitizeToolName(toolResultPart.toolName),
            args: {}
          };
          updateMatchingCallInvocationResult(toolResultPart, call);
          toolInvocations.push(call);
        }
        if (matchingV2Part && matchingV2Part.type === "tool-invocation") {
          updateMatchingCallInvocationResult(toolResultPart, matchingV2Part.toolInvocation);
          if (toolResultPart.providerOptions) {
            matchingV2Part.providerMetadata = toolResultPart.providerOptions;
            matchingV2Part.createdAt = getMastraCreatedAt(toolResultPart.providerOptions) ?? matchingV2Part.createdAt;
          }
        } else {
          const toolInvocationPart = {
            type: "tool-invocation",
            toolInvocation: {
              toolCallId: toolResultPart.toolCallId,
              toolName: sanitizeToolName(toolResultPart.toolName),
              args: {},
              state: "call"
            }
          };
          updateMatchingCallInvocationResult(toolResultPart, toolInvocationPart.toolInvocation);
          if (toolResultPart.providerOptions) {
            toolInvocationPart.providerMetadata = toolResultPart.providerOptions;
            toolInvocationPart.createdAt = getMastraCreatedAt(toolResultPart.providerOptions);
          }
          mastraDBParts.push(toolInvocationPart);
        }
      } else if (part.type === "reasoning") {
        const v2ReasoningPart = {
          type: "reasoning",
          reasoning: "",
          details: [{ type: "text", text: part.text }]
        };
        if (part.providerOptions) {
          v2ReasoningPart.providerMetadata = part.providerOptions;
          v2ReasoningPart.createdAt = getMastraCreatedAt(part.providerOptions);
        }
        mastraDBParts.push(v2ReasoningPart);
        reasoningParts.push(part.text);
      } else if (part.type === "image") {
        const imagePart = part;
        const mimeType = imagePart.mediaType || "image/jpeg";
        const imageData = this.getDataStringFromAIV5DataPart(imagePart);
        const imageFilePart = {
          type: "file",
          data: imageData,
          mimeType
        };
        if (part.providerOptions) {
          imageFilePart.providerMetadata = part.providerOptions;
          imageFilePart.createdAt = getMastraCreatedAt(part.providerOptions);
        }
        mastraDBParts.push(imageFilePart);
        experimental_attachments.push({
          url: imageData,
          contentType: mimeType
        });
      } else if (part.type === "file") {
        const filePart = part;
        const mimeType = filePart.mediaType || "application/octet-stream";
        const fileData = this.getDataStringFromAIV5DataPart(filePart);
        const v2FilePart = {
          type: "file",
          data: fileData,
          mimeType
        };
        if (part.providerOptions) {
          v2FilePart.providerMetadata = part.providerOptions;
          v2FilePart.createdAt = getMastraCreatedAt(part.providerOptions);
        }
        if (filePart.filename) {
          v2FilePart.filename = filePart.filename;
        }
        mastraDBParts.push(v2FilePart);
        experimental_attachments.push({
          url: fileData,
          contentType: mimeType
        });
      }
    }
    const filteredMastraDBParts = filterEmptyTextParts2(mastraDBParts);
    const contentString = filteredMastraDBParts.filter((p) => p.type === "text").map((p) => p.text).join("\n");
    const metadata = "metadata" in modelMsg && modelMsg.metadata !== null && modelMsg.metadata !== void 0 ? modelMsg.metadata : {};
    const id = `id` in modelMsg && typeof modelMsg.id === `string` ? modelMsg.id : `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const message = {
      id,
      role: modelMsg.role === "tool" ? "assistant" : modelMsg.role,
      createdAt: /* @__PURE__ */ new Date(),
      content: {
        format: 2,
        parts: filteredMastraDBParts,
        toolInvocations: toolInvocations.length > 0 ? toolInvocations : void 0,
        reasoning: reasoningParts.length > 0 ? reasoningParts.join("\n") : void 0,
        experimental_attachments: experimental_attachments.length > 0 ? experimental_attachments : void 0,
        content: contentString || void 0,
        metadata: Object.keys(metadata).length > 0 ? metadata : void 0
      }
    };
    if (modelMsg.providerOptions) {
      message.content.providerMetadata = modelMsg.providerOptions;
    }
    return message;
  }
};

// src/agent/message-list/adapters/AIV6Adapter.ts
function withOptionalFields(target, fields) {
  for (const [key, value] of Object.entries(fields)) {
    if (value !== void 0) {
      target[key] = value;
    }
  }
  return target;
}
function getToolNameFromType(type) {
  return type.startsWith("tool-") ? sanitizeToolName(type.slice("tool-".length)) : sanitizeToolName(type);
}
function normalizeToolArgs(input) {
  return typeof input === "object" && input !== null && !Array.isArray(input) ? input : {};
}
function isV6OnlyToolState(state) {
  return state === "approval-requested" || state === "approval-responded" || state === "output-denied";
}
function toMastraApproval(approval) {
  if (!approval) return void 0;
  return {
    id: approval.id,
    approved: "approved" in approval ? approval.approved : void 0,
    reason: "reason" in approval ? approval.reason : void 0
  };
}
function toMastraProviderMetadata(providerMetadata) {
  return providerMetadata;
}
function getToolNameFromUIPart(part) {
  return part.type === "dynamic-tool" ? sanitizeToolName(part.toolName) : getToolNameFromType(part.type);
}
function normalizeV6PartForV5Bridge(part) {
  if (part.type === "dynamic-tool" && !isV6OnlyToolState(part.state)) {
    return {
      ...part,
      type: `tool-${sanitizeToolName(part.toolName)}`
    };
  }
  return part;
}
function createToolInvocationPart({
  toolCallId,
  toolName,
  args,
  state,
  approval,
  result,
  errorText,
  rawInput,
  providerMetadata,
  providerExecuted,
  title,
  preliminary
}) {
  return withOptionalFields(
    {
      type: "tool-invocation",
      toolInvocation: withOptionalFields(
        {
          toolCallId,
          toolName,
          args,
          state
        },
        {
          approval,
          result,
          errorText,
          rawInput
        }
      )
    },
    {
      providerMetadata,
      providerExecuted,
      title,
      preliminary
    }
  );
}
function findToolInvocationPart(parts, toolCallId) {
  for (const part of parts) {
    if (part.type === "tool-invocation" && part.toolInvocation.toolCallId === toolCallId) {
      return part;
    }
  }
  return void 0;
}
function findApprovalRequest(dbMessages, approvalId) {
  if (!dbMessages) return void 0;
  for (const message of [...dbMessages].reverse()) {
    for (const part of [...message.content.parts || []].reverse()) {
      if (part.type === "tool-invocation" && part.toolInvocation.approval?.id === approvalId && part.toolInvocation.state === "approval-requested") {
        return part;
      }
    }
  }
  return void 0;
}
var AIV6Adapter = class _AIV6Adapter {
  static toUIMessage(dbMsg) {
    const v5Message = AIV5Adapter.toUIMessage(dbMsg);
    const metadata = v5Message.metadata || {};
    const parts = [];
    const dbParts = dbMsg.content.parts || [];
    const hasToolInvocationParts = dbParts.some((part) => part.type === "tool-invocation");
    const hasReasoningParts = dbParts.some((part) => part.type === "reasoning");
    const hasFileParts = dbParts.some((part) => part.type === "file");
    const hasTextParts = dbParts.some((part) => part.type === "text");
    for (const part of dbParts) {
      parts.push(_AIV6Adapter.toUIPart(part));
    }
    if (!hasToolInvocationParts || !hasReasoningParts || !hasFileParts || !hasTextParts) {
      for (const part of v5Message.parts) {
        if (isToolUIPart(part)) {
          if (!hasToolInvocationParts) {
            parts.push(_AIV6Adapter.toUIPartFromV5(part));
          }
          continue;
        }
        if (part.type === "reasoning") {
          if (!hasReasoningParts) {
            parts.push(_AIV6Adapter.toUIPartFromV5(part));
          }
          continue;
        }
        if (part.type === "file") {
          if (!hasFileParts) {
            parts.push(_AIV6Adapter.toUIPartFromV5(part));
          }
          continue;
        }
        if (part.type === "text" && !hasTextParts) {
          parts.push(_AIV6Adapter.toUIPartFromV5(part));
        }
      }
    }
    return {
      id: dbMsg.id,
      role: dbMsg.role,
      metadata: Object.keys(metadata).length > 0 ? metadata : void 0,
      parts
    };
  }
  static fromUIMessage(uiMsg) {
    const compatibleParts = uiMsg.parts.filter((part) => {
      if (part.type === "source-document") return false;
      if (isToolUIPart$1(part) && isV6OnlyToolState(part.state)) return false;
      return true;
    });
    const baseDb = AIV5Adapter.fromUIMessage({
      ...uiMsg,
      parts: compatibleParts.map((part) => normalizeV6PartForV5Bridge(part))
    });
    const baseParts = baseDb.content.parts || [];
    const parts = [];
    let basePartIndex = 0;
    for (const part of uiMsg.parts) {
      if (part.type === "source-document") {
        parts.push(
          withOptionalFields(
            {
              type: "source-document",
              sourceId: part.sourceId,
              mediaType: part.mediaType,
              title: part.title
            },
            {
              filename: part.filename,
              providerMetadata: toMastraProviderMetadata(part.providerMetadata)
            }
          )
        );
        continue;
      }
      if (!isToolUIPart$1(part) || !isV6OnlyToolState(part.state)) {
        const basePart = baseParts[basePartIndex++];
        if (basePart) {
          parts.push(basePart);
        }
        continue;
      }
      parts.push(
        createToolInvocationPart({
          toolCallId: part.toolCallId,
          toolName: getToolNameFromUIPart(part),
          args: normalizeToolArgs(part.input),
          state: part.state,
          approval: toMastraApproval(part.approval),
          providerMetadata: "callProviderMetadata" in part ? toMastraProviderMetadata(part.callProviderMetadata) : void 0,
          providerExecuted: part.providerExecuted,
          title: part.title,
          preliminary: "preliminary" in part ? part.preliminary : void 0
        })
      );
    }
    return {
      ...baseDb,
      content: {
        ...baseDb.content,
        parts
      }
    };
  }
  static fromModelMessage(modelMsg, _messageSource, context = {}) {
    const content = Array.isArray(modelMsg.content) ? modelMsg.content : [{ type: "text", text: modelMsg.content }];
    const compatibleContent = content.filter(
      (part) => part.type !== "tool-approval-request" && part.type !== "tool-approval-response"
    );
    const baseDb = AIV5Adapter.fromModelMessage(
      {
        ...modelMsg,
        content: compatibleContent
      },
      _messageSource
    );
    const parts = [...baseDb.content.parts];
    if (modelMsg.role === "assistant") {
      const toolCalls = /* @__PURE__ */ new Map();
      for (const part of content) {
        if (part.type === "tool-call") {
          toolCalls.set(part.toolCallId, {
            toolName: sanitizeToolName(part.toolName),
            args: normalizeToolArgs(part.input)
          });
          continue;
        }
        if (part.type !== "tool-approval-request") {
          continue;
        }
        const call = toolCalls.get(part.toolCallId);
        const existingPart = findToolInvocationPart(parts, part.toolCallId);
        if (existingPart) {
          existingPart.toolInvocation.state = "approval-requested";
          existingPart.toolInvocation.approval = { id: part.approvalId };
          continue;
        }
        parts.push(
          createToolInvocationPart({
            toolCallId: part.toolCallId,
            toolName: call?.toolName || "unknown",
            args: call?.args || {},
            state: "approval-requested",
            approval: { id: part.approvalId }
          })
        );
      }
    } else if (modelMsg.role === "tool") {
      for (const part of content) {
        if (part.type !== "tool-approval-response") {
          continue;
        }
        const request = findApprovalRequest(context.dbMessages, part.approvalId);
        if (!request) {
          continue;
        }
        parts.push(
          createToolInvocationPart({
            toolCallId: request.toolInvocation.toolCallId,
            toolName: request.toolInvocation.toolName,
            args: request.toolInvocation.args,
            state: "approval-responded",
            approval: {
              id: part.approvalId,
              approved: part.approved,
              reason: part.reason
            },
            providerMetadata: request.providerMetadata,
            providerExecuted: request.providerExecuted,
            title: request.title
          })
        );
      }
    }
    return {
      ...baseDb,
      content: {
        ...baseDb.content,
        parts
      }
    };
  }
  static toUIPart(part) {
    if (part.type === "tool-invocation") {
      const base = withOptionalFields(
        {
          type: `tool-${sanitizeToolName(part.toolInvocation.toolName)}`,
          toolCallId: part.toolInvocation.toolCallId,
          providerExecuted: part.providerExecuted
        },
        {
          callProviderMetadata: part.providerMetadata,
          title: part.title
        }
      );
      switch (part.toolInvocation.state) {
        case "partial-call":
          return {
            ...base,
            state: "input-streaming",
            input: part.toolInvocation.args
          };
        case "call":
          return {
            ...base,
            state: "input-available",
            input: part.toolInvocation.args
          };
        case "approval-requested":
          return {
            ...base,
            state: "approval-requested",
            input: part.toolInvocation.args,
            approval: {
              id: part.toolInvocation.approval?.id || part.toolInvocation.toolCallId
            }
          };
        case "approval-responded":
          return {
            ...base,
            state: "approval-responded",
            input: part.toolInvocation.args,
            approval: {
              id: part.toolInvocation.approval?.id || part.toolInvocation.toolCallId,
              approved: part.toolInvocation.approval?.approved ?? false,
              reason: part.toolInvocation.approval?.reason
            }
          };
        case "output-error":
          return withOptionalFields(
            {
              ...base,
              state: "output-error",
              input: part.toolInvocation.args,
              errorText: part.toolInvocation.errorText || ""
            },
            {
              rawInput: part.toolInvocation.rawInput,
              approval: part.toolInvocation.approval?.approved === true ? {
                id: part.toolInvocation.approval.id,
                approved: true,
                reason: part.toolInvocation.approval.reason
              } : void 0
            }
          );
        case "output-denied":
          return {
            ...base,
            state: "output-denied",
            input: part.toolInvocation.args,
            approval: {
              id: part.toolInvocation.approval?.id || part.toolInvocation.toolCallId,
              approved: false,
              reason: part.toolInvocation.approval?.reason
            }
          };
        case "result":
          return withOptionalFields(
            {
              ...base,
              state: "output-available",
              input: part.toolInvocation.args,
              output: part.toolInvocation.result
            },
            {
              preliminary: part.preliminary,
              approval: part.toolInvocation.approval?.approved === true ? {
                id: part.toolInvocation.approval.id,
                approved: true,
                reason: part.toolInvocation.approval.reason
              } : void 0
            }
          );
        default:
          throw new Error(`Unhandled toolInvocation.state: ${String(part.toolInvocation.state)}`);
      }
    }
    if (part.type === "source-document") {
      return withOptionalFields(
        {
          type: "source-document",
          sourceId: part.sourceId,
          mediaType: part.mediaType,
          title: part.title
        },
        {
          filename: part.filename,
          providerMetadata: part.providerMetadata
        }
      );
    }
    return _AIV6Adapter.toUIPartFromV5(
      AIV5Adapter.toUIMessage({
        id: "tmp",
        role: "assistant",
        createdAt: /* @__PURE__ */ new Date(),
        content: {
          format: 2,
          parts: [part]
        }
      }).parts[0]
    );
  }
  static toUIPartFromV5(part) {
    if (isToolUIPart(part)) {
      const base = {
        type: part.type,
        toolCallId: part.toolCallId,
        providerExecuted: part.providerExecuted
      };
      switch (part.state) {
        case "input-streaming":
          return withOptionalFields(
            {
              ...base,
              state: "input-streaming",
              input: part.input
            },
            {
              callProviderMetadata: "callProviderMetadata" in part ? part.callProviderMetadata : void 0,
              title: "title" in part ? part.title : void 0
            }
          );
        case "input-available":
          return withOptionalFields(
            {
              ...base,
              state: "input-available",
              input: part.input
            },
            {
              callProviderMetadata: "callProviderMetadata" in part ? part.callProviderMetadata : void 0,
              title: "title" in part ? part.title : void 0
            }
          );
        case "output-available":
          return withOptionalFields(
            {
              ...base,
              state: "output-available",
              input: part.input,
              output: part.output
            },
            {
              callProviderMetadata: "callProviderMetadata" in part ? part.callProviderMetadata : void 0,
              preliminary: "preliminary" in part ? part.preliminary : void 0,
              title: "title" in part ? part.title : void 0
            }
          );
        case "output-error":
          return withOptionalFields(
            {
              ...base,
              state: "output-error",
              input: part.input,
              errorText: part.errorText
            },
            {
              rawInput: "rawInput" in part ? part.rawInput : void 0,
              callProviderMetadata: "callProviderMetadata" in part ? part.callProviderMetadata : void 0,
              title: "title" in part ? part.title : void 0
            }
          );
      }
    }
    switch (part.type) {
      case "text":
        return withOptionalFields(
          { type: "text", text: part.text },
          { providerMetadata: part.providerMetadata }
        );
      case "reasoning":
        return withOptionalFields(
          {
            type: "reasoning",
            text: part.text,
            state: part.state
          },
          { providerMetadata: part.providerMetadata }
        );
      case "file":
        return withOptionalFields(
          {
            type: "file",
            url: part.url,
            mediaType: part.mediaType
          },
          {
            filename: "filename" in part ? part.filename : void 0,
            providerMetadata: part.providerMetadata
          }
        );
      case "source-url":
        return withOptionalFields(
          {
            type: "source-url",
            sourceId: part.sourceId,
            url: part.url
          },
          { title: part.title, providerMetadata: part.providerMetadata }
        );
      case "step-start":
        return { type: "step-start" };
      default:
        if (typeof part.type === "string" && part.type.startsWith("data-")) {
          return {
            type: part.type,
            data: "data" in part ? part.data : void 0
          };
        }
        return part;
    }
  }
};

// src/agent/message-list/cache/CacheKeyGenerator.ts
var CacheKeyGenerator = class _CacheKeyGenerator {
  /**
   * Generate cache key from AIV4 UIMessage parts
   */
  static fromAIV4Parts(parts) {
    let key = "";
    for (const part of parts) {
      key += part.type;
      key += _CacheKeyGenerator.fromAIV4Part(part);
    }
    return key;
  }
  /**
   * Generate cache key from a single AIV4 UIMessage part
   */
  static fromAIV4Part(part) {
    let cacheKey = "";
    if (part.type === "text") {
      cacheKey += part.text;
    }
    if (part.type === "tool-invocation") {
      cacheKey += part.toolInvocation.toolCallId;
      cacheKey += part.toolInvocation.state;
    }
    if (part.type === "reasoning") {
      cacheKey += part.reasoning;
      cacheKey += part.details.reduce((prev, current) => {
        if (current.type === "text") {
          return prev + current.text.length + (current.signature?.length || 0);
        }
        return prev;
      }, 0);
      const partAny = part;
      if (partAny && Object.hasOwn(partAny, "providerMetadata") && partAny.providerMetadata && Object.hasOwn(partAny.providerMetadata, "openai") && partAny.providerMetadata.openai && Object.hasOwn(partAny.providerMetadata.openai, "itemId")) {
        const itemId = partAny.providerMetadata.openai.itemId;
        cacheKey += `|${itemId}`;
      }
    }
    if (part.type === "file") {
      cacheKey += part.data;
      cacheKey += part.mimeType;
    }
    return cacheKey;
  }
  /**
   * Generate cache key from MastraDB message parts
   */
  static fromDBParts(parts) {
    let key = "";
    for (const part of parts) {
      key += part.type;
      if (part.type.startsWith("data-")) {
        const data = part.data;
        key += JSON.stringify(data);
      } else {
        key += _CacheKeyGenerator.fromAIV4Part(part);
      }
    }
    return key;
  }
  /**
   * Generate cache key from AIV4 CoreMessage content
   */
  static fromAIV4CoreMessageContent(content) {
    if (typeof content === "string") return content;
    let key = "";
    for (const part of content) {
      key += part.type;
      if (part.type === "text") {
        key += part.text.length;
      }
      if (part.type === "reasoning") {
        key += part.text.length;
      }
      if (part.type === "tool-call") {
        key += part.toolCallId;
        key += part.toolName;
      }
      if (part.type === "tool-result") {
        key += part.toolCallId;
        key += part.toolName;
      }
      if (part.type === "file") {
        key += part.filename;
        key += part.mimeType;
      }
      if (part.type === "image") {
        key += getImageCacheKey(part.image);
        key += part.mimeType;
      }
      if (part.type === "redacted-reasoning") {
        key += part.data.length;
      }
    }
    return key;
  }
  /**
   * Generate cache key from AIV5 UIMessage parts
   */
  static fromAIV5Parts(parts) {
    let key = "";
    for (const part of parts) {
      key += part.type;
      if (part.type === "text") {
        key += part.text;
      }
      if (isToolUIPart(part) || part.type === "dynamic-tool") {
        key += part.toolCallId;
        key += part.state;
      }
      if (part.type === "reasoning") {
        key += part.text;
      }
      if (part.type === "file") {
        key += part.url.length;
        key += part.mediaType;
        key += part.filename || "";
      }
    }
    return key;
  }
  /**
   * Generate cache key from AIV5 ModelMessage content
   */
  static fromAIV5ModelMessageContent(content) {
    if (typeof content === "string") return content;
    let key = "";
    for (const part of content) {
      key += part.type;
      if (part.type === "text") {
        key += part.text.length;
      }
      if (part.type === "reasoning") {
        key += part.text.length;
      }
      if (part.type === "tool-call") {
        key += part.toolCallId;
        key += part.toolName;
      }
      if (part.type === "tool-result") {
        key += part.toolCallId;
        key += part.toolName;
      }
      if (part.type === "file") {
        key += part.filename;
        key += part.mediaType;
      }
      if (part.type === "image") {
        key += getImageCacheKey(part.image);
        key += part.mediaType;
      }
    }
    return key;
  }
};

// src/agent/message-list/conversion/to-prompt.ts
function aiV4CoreMessageToV1PromptMessage(coreMessage) {
  if (coreMessage.role === `system`) {
    return coreMessage;
  }
  if (typeof coreMessage.content === `string` && (coreMessage.role === `assistant` || coreMessage.role === `user`)) {
    return {
      ...coreMessage,
      content: [{ type: "text", text: coreMessage.content }]
    };
  }
  if (typeof coreMessage.content === `string`) {
    throw new Error(
      `Saw text content for input CoreMessage, but the role is ${coreMessage.role}. This is only allowed for "system", "assistant", and "user" roles.`
    );
  }
  const roleContent = {
    user: [],
    assistant: [],
    tool: []
  };
  const role = coreMessage.role;
  for (const part of coreMessage.content) {
    const incompatibleMessage = `Saw incompatible message content part type ${part.type} for message role ${role}`;
    switch (part.type) {
      case "text": {
        if (role === `tool`) {
          throw new Error(incompatibleMessage);
        }
        roleContent[role].push(part);
        break;
      }
      case "redacted-reasoning":
      case "reasoning": {
        if (role !== `assistant`) {
          throw new Error(incompatibleMessage);
        }
        roleContent[role].push(part);
        break;
      }
      case "tool-call": {
        if (role === `tool` || role === `user`) {
          throw new Error(incompatibleMessage);
        }
        roleContent[role].push({
          ...part,
          toolName: sanitizeToolName(part.toolName)
        });
        break;
      }
      case "tool-result": {
        if (role === `assistant` || role === `user`) {
          throw new Error(incompatibleMessage);
        }
        roleContent[role].push({
          ...part,
          toolName: sanitizeToolName(part.toolName)
        });
        break;
      }
      case "image": {
        if (role === `tool` || role === `assistant`) {
          throw new Error(incompatibleMessage);
        }
        let processedImage;
        if (part.image instanceof URL || part.image instanceof Uint8Array) {
          processedImage = part.image;
        } else if (Buffer.isBuffer(part.image) || part.image instanceof ArrayBuffer) {
          processedImage = new Uint8Array(part.image);
        } else {
          const categorized = categorizeFileData(part.image, part.mimeType);
          if (categorized.type === "raw") {
            const dataUri = createDataUri(part.image, part.mimeType || "image/png");
            processedImage = new URL(dataUri);
          } else {
            processedImage = new URL(part.image);
          }
        }
        roleContent[role].push({
          ...part,
          image: processedImage
        });
        break;
      }
      case "file": {
        if (role === `tool`) {
          throw new Error(incompatibleMessage);
        }
        roleContent[role].push({
          ...part,
          data: part.data instanceof URL ? part.data : typeof part.data === "string" ? part.data : convertDataContentToBase64String(part.data)
        });
        break;
      }
    }
  }
  if (role === `tool`) {
    return {
      ...coreMessage,
      content: roleContent[role]
    };
  }
  if (role === `user`) {
    return {
      ...coreMessage,
      content: roleContent[role]
    };
  }
  if (role === `assistant`) {
    return {
      ...coreMessage,
      content: roleContent[role]
    };
  }
  throw new Error(
    `Encountered unknown role ${role} when converting V4 CoreMessage -> V4 LanguageModelV1Prompt, input message: ${JSON.stringify(coreMessage, null, 2)}`
  );
}
function aiV5ModelMessageToV2PromptMessage(modelMessage) {
  if (modelMessage.role === `system`) {
    return modelMessage;
  }
  if (typeof modelMessage.content === `string` && (modelMessage.role === `assistant` || modelMessage.role === `user`)) {
    return {
      role: modelMessage.role,
      content: [{ type: "text", text: modelMessage.content }],
      providerOptions: modelMessage.providerOptions
    };
  }
  if (typeof modelMessage.content === `string`) {
    throw new Error(
      `Saw text content for input ModelMessage, but the role is ${modelMessage.role}. This is only allowed for "system", "assistant", and "user" roles.`
    );
  }
  const roleContent = {
    user: [],
    assistant: [],
    tool: []
  };
  const role = modelMessage.role;
  for (const part of modelMessage.content) {
    const incompatibleMessage = `Saw incompatible message content part type ${part.type} for message role ${role}`;
    switch (part.type) {
      case "text": {
        if (role === `tool`) {
          throw new Error(incompatibleMessage);
        }
        roleContent[role].push(part);
        break;
      }
      case "reasoning": {
        if (role === `tool` || role === `user`) {
          throw new Error(incompatibleMessage);
        }
        roleContent[role].push(part);
        break;
      }
      case "tool-call": {
        if (role !== `assistant`) {
          throw new Error(incompatibleMessage);
        }
        roleContent[role].push({
          ...part,
          toolName: sanitizeToolName(part.toolName)
        });
        break;
      }
      case "tool-result": {
        if (role === `user`) {
          throw new Error(incompatibleMessage);
        }
        roleContent[role].push({
          ...part,
          toolName: sanitizeToolName(part.toolName)
        });
        break;
      }
      case "file": {
        if (role === `tool`) {
          throw new Error(incompatibleMessage);
        }
        roleContent[role].push({
          ...part,
          data: part.data instanceof ArrayBuffer ? new Uint8Array(part.data) : part.data
        });
        break;
      }
      case "image": {
        if (role === `tool`) {
          throw new Error(incompatibleMessage);
        }
        roleContent[role].push({
          ...part,
          mediaType: part.mediaType || "image/unknown",
          type: "file",
          data: part.image instanceof ArrayBuffer ? new Uint8Array(part.image) : part.image
        });
        break;
      }
    }
  }
  if (role === `tool`) {
    return {
      ...modelMessage,
      content: roleContent[role]
    };
  }
  if (role === `user`) {
    return {
      ...modelMessage,
      content: roleContent[role]
    };
  }
  if (role === `assistant`) {
    return {
      ...modelMessage,
      content: roleContent[role]
    };
  }
  throw new Error(
    `Encountered unknown role ${role} when converting V5 ModelMessage -> V5 LanguageModelV2Message, input message: ${JSON.stringify(modelMessage, null, 2)}`
  );
}

// src/agent/message-list/conversion/utils.ts
function coreContentToString(content) {
  if (typeof content === `string`) return content;
  return content.reduce((p, c) => {
    if (c.type === `text`) {
      p += c.text;
    }
    return p;
  }, "");
}
function messagesAreEqual(one, two) {
  const oneUIV4 = TypeDetector.isAIV4UIMessage(one) && one;
  const twoUIV4 = TypeDetector.isAIV4UIMessage(two) && two;
  if (oneUIV4 && !twoUIV4) return false;
  if (oneUIV4 && twoUIV4) {
    return CacheKeyGenerator.fromAIV4Parts(one.parts) === CacheKeyGenerator.fromAIV4Parts(two.parts);
  }
  const oneCMV4 = TypeDetector.isAIV4CoreMessage(one) && one;
  const twoCMV4 = TypeDetector.isAIV4CoreMessage(two) && two;
  if (oneCMV4 && !twoCMV4) return false;
  if (oneCMV4 && twoCMV4) {
    return CacheKeyGenerator.fromAIV4CoreMessageContent(oneCMV4.content) === CacheKeyGenerator.fromAIV4CoreMessageContent(twoCMV4.content);
  }
  const oneMM1 = TypeDetector.isMastraMessageV1(one) && one;
  const twoMM1 = TypeDetector.isMastraMessageV1(two) && two;
  if (oneMM1 && !twoMM1) return false;
  if (oneMM1 && twoMM1) {
    return oneMM1.id === twoMM1.id && CacheKeyGenerator.fromAIV4CoreMessageContent(oneMM1.content) === CacheKeyGenerator.fromAIV4CoreMessageContent(twoMM1.content);
  }
  const oneMM2 = TypeDetector.isMastraDBMessage(one) && one;
  const twoMM2 = TypeDetector.isMastraDBMessage(two) && two;
  if (oneMM2 && !twoMM2) return false;
  if (oneMM2 && twoMM2) {
    return oneMM2.id === twoMM2.id && CacheKeyGenerator.fromDBParts(oneMM2.content.parts) === CacheKeyGenerator.fromDBParts(twoMM2.content.parts);
  }
  const oneUIV5 = TypeDetector.isAIV5UIMessage(one) && one;
  const twoUIV5 = TypeDetector.isAIV5UIMessage(two) && two;
  if (oneUIV5 && !twoUIV5) return false;
  if (oneUIV5 && twoUIV5) {
    return CacheKeyGenerator.fromAIV5Parts(one.parts) === CacheKeyGenerator.fromAIV5Parts(two.parts);
  }
  const oneCMV5 = TypeDetector.isAIV5CoreMessage(one) && one;
  const twoCMV5 = TypeDetector.isAIV5CoreMessage(two) && two;
  if (oneCMV5 && !twoCMV5) return false;
  if (oneCMV5 && twoCMV5) {
    return CacheKeyGenerator.fromAIV5ModelMessageContent(oneCMV5.content) === CacheKeyGenerator.fromAIV5ModelMessageContent(twoCMV5.content);
  }
  return true;
}

// src/agent/message-list/utils/stamp-part.ts
function stampPart(part) {
  if (part.createdAt == null) {
    part.createdAt = Date.now();
  }
  return part;
}
function stampMessageParts(message, source) {
  if (source === "memory" || !Array.isArray(message.content.parts)) {
    return message;
  }
  message.content.parts = message.content.parts.map((part) => stampPart(part));
  return message;
}

// src/agent/message-list/conversion/input-converter.ts
function inputToMastraDBMessage(message, messageSource, context) {
  if (messageSource !== `memory` && `threadId` in message && message.threadId && context.memoryInfo && message.threadId !== context.memoryInfo.threadId) {
    throw new Error(
      `Received input message with wrong threadId. Input ${message.threadId}, expected ${context.memoryInfo.threadId}`
    );
  }
  if (`resourceId` in message && message.resourceId && context.memoryInfo?.resourceId && message.resourceId !== context.memoryInfo.resourceId) {
    throw new Error(
      `Received input message with wrong resourceId. Input ${message.resourceId}, expected ${context.memoryInfo.resourceId}`
    );
  }
  if (TypeDetector.isMastraMessageV1(message)) {
    return stampMessageParts(mastraMessageV1ToMastraDBMessage(message, messageSource, context), messageSource);
  }
  if (TypeDetector.isMastraDBMessage(message)) {
    return stampMessageParts(hydrateMastraDBMessageFields(message, context), messageSource);
  }
  if (TypeDetector.isAIV4CoreMessage(message)) {
    return stampMessageParts(AIV4Adapter.fromCoreMessage(message, context, messageSource), messageSource);
  }
  if (TypeDetector.isAIV4UIMessage(message)) {
    return stampMessageParts(
      AIV4Adapter.fromUIMessage(message, context, messageSource),
      messageSource
    );
  }
  const hasOriginalId = "id" in message && typeof message.id === "string";
  const id = hasOriginalId ? message.id : context.newMessageId();
  if (TypeDetector.isAIV6CoreMessage(message)) {
    const dbMsg = AIV6Adapter.fromModelMessage(message, messageSource, context);
    const rawCreatedAt = "metadata" in message && message.metadata && typeof message.metadata === "object" && "createdAt" in message.metadata ? message.metadata.createdAt : void 0;
    return {
      ...dbMsg,
      id,
      createdAt: context.generateCreatedAt(messageSource, rawCreatedAt),
      threadId: context.memoryInfo?.threadId,
      resourceId: context.memoryInfo?.resourceId
    };
  }
  if (TypeDetector.isAIV6UIMessage(message)) {
    const dbMsg = AIV6Adapter.fromUIMessage(message);
    const rawCreatedAt = "createdAt" in message ? message.createdAt : void 0;
    return {
      ...dbMsg,
      id,
      createdAt: context.generateCreatedAt(messageSource, rawCreatedAt),
      threadId: context.memoryInfo?.threadId,
      resourceId: context.memoryInfo?.resourceId
    };
  }
  if (TypeDetector.isAIV5CoreMessage(message)) {
    const dbMsg = AIV5Adapter.fromModelMessage(message, messageSource);
    const rawCreatedAt = "metadata" in message && message.metadata && typeof message.metadata === "object" && "createdAt" in message.metadata ? message.metadata.createdAt : void 0;
    return stampMessageParts(
      {
        ...dbMsg,
        id,
        createdAt: context.generateCreatedAt(messageSource, rawCreatedAt),
        threadId: context.memoryInfo?.threadId,
        resourceId: context.memoryInfo?.resourceId
      },
      messageSource
    );
  }
  if (TypeDetector.isAIV5UIMessage(message)) {
    const dbMsg = AIV5Adapter.fromUIMessage(message);
    const rawCreatedAt = "createdAt" in message ? message.createdAt : void 0;
    return stampMessageParts(
      {
        ...dbMsg,
        id,
        createdAt: context.generateCreatedAt(messageSource, rawCreatedAt),
        threadId: context.memoryInfo?.threadId,
        resourceId: context.memoryInfo?.resourceId
      },
      messageSource
    );
  }
  throw new Error(`Found unhandled message ${JSON.stringify(message)}`);
}
function mastraMessageV1ToMastraDBMessage(message, messageSource, context) {
  const coreV2 = AIV4Adapter.fromCoreMessage(
    {
      content: message.content,
      role: message.role
    },
    context,
    messageSource
  );
  return {
    id: message.id,
    role: coreV2.role,
    createdAt: context.generateCreatedAt(messageSource, message.createdAt),
    threadId: message.threadId,
    resourceId: message.resourceId,
    content: coreV2.content
  };
}
function hydrateMastraDBMessageFields(message, context) {
  if (!message.id) {
    message.id = context.newMessageId();
  }
  if (!(message.createdAt instanceof Date)) {
    message.createdAt = new Date(message.createdAt);
  }
  if (message.content.toolInvocations && message.content.parts) {
    message.content.toolInvocations = message.content.toolInvocations.map((ti) => {
      if (!ti.args || Object.keys(ti.args).length === 0) {
        const partWithArgs = message.content.parts.find(
          (part) => part.type === "tool-invocation" && part.toolInvocation && part.toolInvocation.toolCallId === ti.toolCallId && part.toolInvocation.args && Object.keys(part.toolInvocation.args).length > 0
        );
        if (partWithArgs && partWithArgs.type === "tool-invocation") {
          return { ...ti, args: partWithArgs.toolInvocation.args };
        }
      }
      return ti;
    });
  }
  if (!message.threadId && context.memoryInfo?.threadId) {
    message.threadId = context.memoryInfo.threadId;
    if (!message.resourceId && context.memoryInfo?.resourceId) {
      message.resourceId = context.memoryInfo.resourceId;
    }
  }
  return message;
}

// src/agent/message-list/conversion/output-converter.ts
function mergeTextPartsWithDuplicateItemIds(parts) {
  const result = [];
  for (const part of parts) {
    if (part.type !== "text") {
      result.push(part);
      continue;
    }
    const textPart = part;
    const itemId = textPart.providerMetadata?.openai?.itemId;
    if (!itemId) {
      result.push(part);
      continue;
    }
    const existingIndex = result.findIndex((p) => {
      if (p.type !== "text") return false;
      const existingTextPart = p;
      const existingItemId = existingTextPart.providerMetadata?.openai?.itemId;
      return existingItemId === itemId;
    });
    if (existingIndex !== -1) {
      const existing = result[existingIndex];
      result[existingIndex] = {
        ...existing,
        text: existing.text + textPart.text
      };
    } else {
      result.push(part);
    }
  }
  return result;
}
function sanitizeAIV4UIMessages(messages) {
  const msgs = messages.map((m) => {
    if (m.parts.length === 0) return false;
    const safeParts = m.parts.filter(
      (p) => p.type !== `tool-invocation` || // calls and partial-calls should be updated to be results at this point
      // if they haven't we can't send them back to the llm and need to remove them.
      p.toolInvocation.state !== `call` && p.toolInvocation.state !== `partial-call`
    );
    if (!safeParts.length) return false;
    const sanitized = {
      ...m,
      parts: safeParts
    };
    if (`toolInvocations` in m && m.toolInvocations) {
      sanitized.toolInvocations = m.toolInvocations.filter((t) => t.state === `result`);
    }
    return sanitized;
  }).filter((m) => Boolean(m));
  return msgs;
}
function sanitizeV5UIMessages(messages, filterIncompleteToolCalls = false) {
  const msgs = messages.map((m) => {
    if (m.parts.length === 0) return false;
    const safeParts = m.parts.filter((p) => {
      if (typeof p.type === "string" && p.type.startsWith("data-")) {
        return false;
      }
      if (p.type === "text" && (!("text" in p) || p.text === "" || p.text?.trim() === "")) {
        if (m.role === "user") return false;
        const hasNonEmptyParts = m.parts.some(
          (part) => !(part.type === "text" && (!("text" in part) || part.text === "" || part.text?.trim() === ""))
        );
        if (hasNonEmptyParts) return false;
      }
      if (!isToolUIPart(p)) return true;
      if (filterIncompleteToolCalls) {
        if (p.state === "output-available" || p.state === "output-error") return true;
        if (p.state === "input-available" && p.providerExecuted) return true;
        return false;
      }
      return p.state !== "input-streaming";
    });
    if (!safeParts.length) return false;
    const mergedParts = mergeTextPartsWithDuplicateItemIds(safeParts);
    const sanitized = {
      ...m,
      parts: mergedParts.map((part) => {
        if (isToolUIPart(part) && part.state === "output-available") {
          return {
            ...part,
            output: typeof part.output === "object" && part.output && "value" in part.output ? part.output.value : part.output
          };
        }
        return part;
      })
    };
    return sanitized;
  }).filter((m) => Boolean(m));
  return msgs;
}
function addStartStepPartsForAIV5(messages) {
  for (const message of messages) {
    if (message.role !== `assistant`) continue;
    for (const [index, part] of message.parts.entries()) {
      if (!isToolUIPart(part)) continue;
      const nextPart = message.parts.at(index + 1);
      if (nextPart && nextPart.type !== `step-start` && !isToolUIPart(nextPart)) {
        message.parts.splice(index + 1, 0, { type: "step-start" });
      }
      if (nextPart && isToolUIPart(nextPart) && !part.providerExecuted && nextPart.providerExecuted && (nextPart.state === "output-available" || nextPart.state === "output-error")) {
        message.parts.splice(index + 1, 0, { type: "step-start" });
      }
    }
  }
  return messages;
}
function aiV4UIMessagesToAIV4CoreMessages(messages) {
  return convertToCoreMessages(sanitizeAIV4UIMessages(messages));
}
function restoreAssistantFileProviderMetadata(modelMessages, uiMessages) {
  const fileMetadata = [];
  for (const msg of uiMessages) {
    if (msg.role !== "assistant") continue;
    for (const part of msg.parts) {
      if (part.type === "file") {
        fileMetadata.push(part.providerMetadata ?? void 0);
      }
    }
  }
  if (fileMetadata.length === 0 || fileMetadata.every((m) => m == null)) return modelMessages;
  let metadataIndex = 0;
  return modelMessages.map((msg) => {
    if (msg.role !== "assistant" || typeof msg.content === "string") return msg;
    let modified = false;
    const content = msg.content.map((part) => {
      if (part.type !== "file" || metadataIndex >= fileMetadata.length) return part;
      const metadata = fileMetadata[metadataIndex++];
      if (part.providerOptions || !metadata) return part;
      modified = true;
      return { ...part, providerOptions: metadata };
    });
    return modified ? { ...msg, content } : msg;
  });
}
function aiV5UIMessagesToAIV5ModelMessages(messages, dbMessages, filterIncompleteToolCalls = false) {
  const sanitized = sanitizeV5UIMessages(messages, filterIncompleteToolCalls);
  const preprocessed = addStartStepPartsForAIV5(sanitized);
  const result = restoreAssistantFileProviderMetadata(convertToModelMessages(preprocessed), preprocessed);
  const withProviderOptions = result.map((modelMsg, index) => {
    const uiMsg = preprocessed[index];
    if (uiMsg?.metadata && typeof uiMsg.metadata === "object" && "providerMetadata" in uiMsg.metadata && uiMsg.metadata.providerMetadata) {
      return {
        ...modelMsg,
        providerOptions: uiMsg.metadata.providerMetadata
      };
    }
    return modelMsg;
  });
  return ensureAnthropicCompatibleMessages(withProviderOptions, dbMessages);
}
function aiV4CoreMessagesToAIV5ModelMessages(messages, source, adapterContext, dbMessages) {
  return aiV5UIMessagesToAIV5ModelMessages(
    messages.map((m) => AIV4Adapter.fromCoreMessage(m, adapterContext, source)).map((m) => AIV5Adapter.toUIMessage(m)),
    dbMessages
  );
}
function systemMessageToAIV4Core(message) {
  if (typeof message === `string`) {
    return { role: "system", content: message };
  }
  if (TypeDetector.isAIV6CoreMessage(message)) {
    const dbMsg = AIV6Adapter.fromModelMessage(message, "system");
    return AIV4Adapter.systemToV4Core(dbMsg);
  }
  if (TypeDetector.isAIV5CoreMessage(message)) {
    const dbMsg = AIV5Adapter.fromModelMessage(message, "system");
    return AIV4Adapter.systemToV4Core(dbMsg);
  }
  if (TypeDetector.isMastraDBMessage(message)) {
    return AIV4Adapter.systemToV4Core(message);
  }
  return message;
}
var DefaultGeneratedFile = class {
  base64Data;
  uint8ArrayData;
  mediaType;
  constructor({ data, mediaType }) {
    const isUint8Array = data instanceof Uint8Array;
    this.base64Data = isUint8Array ? void 0 : data;
    this.uint8ArrayData = isUint8Array ? data : void 0;
    this.mediaType = mediaType;
  }
  // lazy conversion with caching to avoid unnecessary conversion overhead:
  get base64() {
    if (this.base64Data == null) {
      this.base64Data = convertUint8ArrayToBase64(this.uint8ArrayData);
    }
    return this.base64Data;
  }
  // lazy conversion with caching to avoid unnecessary conversion overhead:
  get uint8Array() {
    if (this.uint8ArrayData == null) {
      this.uint8ArrayData = convertBase64ToUint8Array(this.base64Data);
    }
    return this.uint8ArrayData;
  }
};
var DefaultGeneratedFileWithType = class extends DefaultGeneratedFile {
  type = "file";
  constructor(options) {
    super(options);
  }
};

// src/agent/message-list/conversion/step-content.ts
var StepContentExtractor = class _StepContentExtractor {
  /**
   * Extract content for a specific step number from UI messages
   *
   * @param uiMessages - Array of AI SDK V5 UI messages
   * @param stepNumber - Step number to extract (1-indexed, or -1 for last step)
   * @param stepContentFn - Function to convert model messages to step content
   * @returns Step content array
   */
  static extractStepContent(uiMessages, stepNumber, stepContentFn) {
    const uiMessagesParts = uiMessages.flatMap((item) => item.parts);
    const stepBoundaries = [];
    uiMessagesParts.forEach((part, index) => {
      if (part.type === "step-start") {
        stepBoundaries.push(index);
      }
    });
    if (stepNumber === -1) {
      return _StepContentExtractor.extractLastStep(uiMessagesParts, stepBoundaries, stepContentFn);
    }
    if (stepNumber === 1) {
      return _StepContentExtractor.extractFirstStep(uiMessagesParts, stepBoundaries, stepContentFn);
    }
    return _StepContentExtractor.extractMiddleStep(uiMessagesParts, stepBoundaries, stepNumber, stepContentFn);
  }
  /**
   * Extract the last step content (stepNumber === -1)
   */
  static extractLastStep(uiMessagesParts, stepBoundaries, stepContentFn) {
    const toolParts = uiMessagesParts.filter((p) => p.type?.startsWith("tool-"));
    const hasStepStart = stepBoundaries.length > 0;
    if (!hasStepStart && toolParts.length > 0) {
      const lastToolPart = toolParts[toolParts.length - 1];
      if (!lastToolPart) {
        return [];
      }
      const lastToolIndex = uiMessagesParts.indexOf(lastToolPart);
      const previousToolPart = toolParts[toolParts.length - 2];
      const previousToolIndex = previousToolPart ? uiMessagesParts.indexOf(previousToolPart) : -1;
      const startIndex = previousToolIndex + 1;
      const stepParts2 = uiMessagesParts.slice(startIndex, lastToolIndex + 1);
      return _StepContentExtractor.convertPartsToContent(stepParts2, "last-step", stepContentFn);
    }
    const totalSteps = stepBoundaries.length + 1;
    if (totalSteps === 1 && !hasStepStart) {
      return _StepContentExtractor.convertPartsToContent(uiMessagesParts, "last-step", stepContentFn);
    }
    const lastStepStart = stepBoundaries[stepBoundaries.length - 1];
    if (lastStepStart === void 0) {
      return [];
    }
    const stepParts = uiMessagesParts.slice(lastStepStart + 1);
    if (stepParts.length === 0) {
      return [];
    }
    return _StepContentExtractor.convertPartsToContent(stepParts, "last-step", stepContentFn);
  }
  /**
   * Extract the first step content (stepNumber === 1)
   */
  static extractFirstStep(uiMessagesParts, stepBoundaries, stepContentFn) {
    const firstStepStart = stepBoundaries[0] ?? uiMessagesParts.length;
    if (firstStepStart === 0) {
      return [];
    }
    const stepParts = uiMessagesParts.slice(0, firstStepStart);
    return _StepContentExtractor.convertPartsToContent(stepParts, "step-1", stepContentFn);
  }
  /**
   * Extract content for steps 2+ (between step-start markers)
   */
  static extractMiddleStep(uiMessagesParts, stepBoundaries, stepNumber, stepContentFn) {
    const stepIndex = stepNumber - 2;
    if (stepIndex < 0 || stepIndex >= stepBoundaries.length) {
      return [];
    }
    const startIndex = (stepBoundaries[stepIndex] ?? 0) + 1;
    const endIndex = stepBoundaries[stepIndex + 1] ?? uiMessagesParts.length;
    if (startIndex >= endIndex) {
      return [];
    }
    const stepParts = uiMessagesParts.slice(startIndex, endIndex);
    return _StepContentExtractor.convertPartsToContent(stepParts, `step-${stepNumber}`, stepContentFn);
  }
  /**
   * Convert UI message parts to step content
   */
  static convertPartsToContent(parts, stepId, stepContentFn) {
    const stepUiMessages = [
      {
        id: stepId,
        role: "assistant",
        parts
      }
    ];
    const modelMessages = convertToModelMessages(sanitizeV5UIMessages(stepUiMessages));
    return modelMessages.flatMap(stepContentFn);
  }
  /**
   * Convert a single model message content to step result content
   *
   * This handles:
   * - Tool results: adding input field from DB messages
   * - Files: converting to GeneratedFile format
   * - Images: converting to file format with proper media type
   * - Other content: passed through as-is
   *
   * @param message - Model message to convert (or undefined to use latest)
   * @param dbMessages - Database messages for looking up tool call args
   * @param getLatestMessage - Function to get the latest model message if not provided
   */
  static convertToStepContent(message, dbMessages, getLatestMessage) {
    const latest = message ? message : getLatestMessage();
    if (!latest) return [];
    if (typeof latest.content === "string") {
      return [{ type: "text", text: latest.content }];
    }
    return latest.content.map((c) => {
      if (c.type === "tool-result") {
        return {
          type: "tool-result",
          input: findToolCallArgs(dbMessages, c.toolCallId),
          output: c.output,
          toolCallId: c.toolCallId,
          toolName: c.toolName
        };
      }
      if (c.type === "file") {
        return {
          type: "file",
          file: new DefaultGeneratedFileWithType({
            data: typeof c.data === "string" ? parseDataUri(c.data).base64Content : c.data instanceof URL ? c.data.toString() : convertDataContentToBase64String(c.data),
            mediaType: c.mediaType
          })
        };
      }
      if (c.type === "image") {
        return {
          type: "file",
          file: new DefaultGeneratedFileWithType({
            data: typeof c.image === "string" ? parseDataUri(c.image).base64Content : c.image instanceof URL ? c.image.toString() : convertDataContentToBase64String(c.image),
            mediaType: c.mediaType || "unknown"
          })
        };
      }
      return { ...c };
    });
  }
};

// src/agent/message-list/merge/MessageMerger.ts
var MessageMerger = class _MessageMerger {
  /**
   * Check if a message is sealed (should not be merged into).
   * Messages are sealed after observation to preserve observation markers.
   */
  static isSealed(message) {
    const metadata = message.content?.metadata;
    return metadata?.mastra?.sealed === true;
  }
  /**
   * Check if we should merge an incoming message with the latest message
   *
   * @param latestMessage - The most recent message in the list
   * @param incomingMessage - The message being added
   * @param messageSource - The source of the incoming message ('memory', 'input', 'response', 'context')
   * @param isLatestFromMemory - Whether the latest message is from memory
   * @param agentNetworkAppend - Whether agent network append mode is enabled
   */
  static shouldMerge(latestMessage, incomingMessage, messageSource, isLatestFromMemory, agentNetworkAppend = false) {
    if (!latestMessage) return false;
    if (_MessageMerger.isSealed(latestMessage)) return false;
    if (incomingMessage.content.metadata?.completionResult || latestMessage.content.metadata?.completionResult || incomingMessage.content.metadata?.isTaskCompleteResult || latestMessage.content.metadata?.isTaskCompleteResult) {
      return false;
    }
    const shouldAppendToLastAssistantMessage = latestMessage.role === "assistant" && incomingMessage.role === "assistant" && latestMessage.threadId === incomingMessage.threadId && // If the message is from memory, don't append to the last assistant message
    messageSource !== "memory";
    const appendNetworkMessage = agentNetworkAppend ? !isLatestFromMemory : true;
    return shouldAppendToLastAssistantMessage && appendNetworkMessage;
  }
  /**
   * Merge an incoming assistant message into the latest assistant message
   *
   * This handles:
   * - Updating tool invocations with their results
   * - Adding new parts in the correct order using anchor maps
   * - Inserting step-start markers where needed
   * - Updating timestamps and content strings
   */
  static merge(latestMessage, incomingMessage) {
    latestMessage.createdAt = incomingMessage.createdAt || latestMessage.createdAt;
    const toolResultAnchorMap = /* @__PURE__ */ new Map();
    const partsToAdd = /* @__PURE__ */ new Map();
    for (const [index, part] of incomingMessage.content.parts.entries()) {
      if (part.type === "tool-invocation") {
        const existingCallPart = [...latestMessage.content.parts].reverse().find((p) => p.type === "tool-invocation" && p.toolInvocation.toolCallId === part.toolInvocation.toolCallId);
        const existingCallToolInvocation = !!existingCallPart && existingCallPart.type === "tool-invocation";
        if (existingCallToolInvocation) {
          if (part.toolInvocation.state === "result") {
            existingCallPart.toolInvocation = {
              ...existingCallPart.toolInvocation,
              step: part.toolInvocation.step,
              state: "result",
              result: part.toolInvocation.result,
              args: {
                ...existingCallPart.toolInvocation.args,
                ...part.toolInvocation.args
              }
            };
            if (part.providerMetadata) {
              existingCallPart.providerMetadata = {
                ...existingCallPart.providerMetadata,
                ...part.providerMetadata
              };
            }
            if (!latestMessage.content.toolInvocations) {
              latestMessage.content.toolInvocations = [];
            }
            const toolInvocationIndex = latestMessage.content.toolInvocations.findIndex(
              (t) => t.toolCallId === existingCallPart.toolInvocation.toolCallId
            );
            if (toolInvocationIndex === -1) {
              latestMessage.content.toolInvocations.push(
                existingCallPart.toolInvocation
              );
            } else {
              latestMessage.content.toolInvocations[toolInvocationIndex] = existingCallPart.toolInvocation;
            }
          } else if (part.toolInvocation.state === "approval-requested" || part.toolInvocation.state === "approval-responded" || part.toolInvocation.state === "output-denied" || part.toolInvocation.state === "output-error") {
            existingCallPart.toolInvocation = {
              ...existingCallPart.toolInvocation,
              state: part.toolInvocation.state,
              approval: part.toolInvocation.approval,
              errorText: part.toolInvocation.errorText,
              rawInput: part.toolInvocation.rawInput,
              args: {
                ...existingCallPart.toolInvocation.args,
                ...part.toolInvocation.args
              }
            };
            if (part.providerMetadata) {
              existingCallPart.providerMetadata = {
                ...existingCallPart.providerMetadata,
                ...part.providerMetadata
              };
            }
            if ("providerExecuted" in part && part.providerExecuted !== void 0) {
              existingCallPart.providerExecuted = part.providerExecuted;
            }
            if ("title" in part && part.title !== void 0) {
              existingCallPart.title = part.title;
            }
            if ("preliminary" in part && part.preliminary !== void 0) {
              existingCallPart.preliminary = part.preliminary;
            }
          }
          const existingIndex = latestMessage.content.parts.findIndex((p) => p === existingCallPart);
          toolResultAnchorMap.set(index, existingIndex);
        } else {
          partsToAdd.set(index, part);
        }
      } else {
        partsToAdd.set(index, part);
      }
    }
    _MessageMerger.addPartsToMessage({
      latestMessage,
      incomingMessage,
      anchorMap: toolResultAnchorMap,
      partsToAdd
    });
    if (latestMessage.createdAt.getTime() < incomingMessage.createdAt.getTime()) {
      latestMessage.createdAt = incomingMessage.createdAt;
    }
    if (!latestMessage.content.content && incomingMessage.content.content) {
      latestMessage.content.content = incomingMessage.content.content;
    }
    if (latestMessage.content.content && incomingMessage.content.content && latestMessage.content.content !== incomingMessage.content.content) {
      latestMessage.content.content = incomingMessage.content.content;
    }
  }
  /**
   * Add parts from the incoming message to the latest message using anchor positions
   */
  static addPartsToMessage({
    latestMessage,
    incomingMessage,
    anchorMap,
    partsToAdd
  }) {
    for (let i = 0; i < incomingMessage.content.parts.length; ++i) {
      const part = incomingMessage.content.parts[i];
      if (!part) continue;
      const key = CacheKeyGenerator.fromDBParts([part]);
      const partToAdd = partsToAdd.get(i);
      if (!key || !partToAdd) continue;
      if (anchorMap.size > 0) {
        if (anchorMap.has(i)) continue;
        const leftAnchorV2 = [...anchorMap.keys()].filter((idx) => idx < i).pop() ?? -1;
        const rightAnchorV2 = [...anchorMap.keys()].find((idx) => idx > i) ?? -1;
        const leftAnchorLatest = leftAnchorV2 !== -1 ? anchorMap.get(leftAnchorV2) : 0;
        const offset = leftAnchorV2 === -1 ? i : i - leftAnchorV2;
        const insertAt = leftAnchorLatest + offset;
        const rightAnchorLatest = rightAnchorV2 !== -1 ? anchorMap.get(rightAnchorV2) : latestMessage.content.parts.length;
        if (insertAt >= 0 && insertAt <= rightAnchorLatest && !latestMessage.content.parts.slice(insertAt, rightAnchorLatest).some((p) => CacheKeyGenerator.fromDBParts([p]) === CacheKeyGenerator.fromDBParts([part]))) {
          _MessageMerger.pushNewPart({
            latestMessage,
            newMessage: incomingMessage,
            part,
            insertAt
          });
          for (const [v2Idx, latestIdx] of anchorMap.entries()) {
            if (latestIdx >= insertAt) {
              anchorMap.set(v2Idx, latestIdx + 1);
            }
          }
        }
      } else {
        _MessageMerger.pushNewPart({
          latestMessage,
          newMessage: incomingMessage,
          part
        });
      }
    }
  }
  /**
   * Push a new message part to the latest message
   */
  static pushNewPart({
    latestMessage,
    newMessage,
    part,
    insertAt
  }) {
    const partKey = CacheKeyGenerator.fromDBParts([part]);
    const latestPartCount = latestMessage.content.parts.filter(
      (p) => CacheKeyGenerator.fromDBParts([p]) === partKey
    ).length;
    const newPartCount = newMessage.content.parts.filter((p) => CacheKeyGenerator.fromDBParts([p]) === partKey).length;
    if (latestPartCount < newPartCount) {
      const partIndex = newMessage.content.parts.indexOf(part);
      const hasStepStartBefore = partIndex > 0 && newMessage.content.parts[partIndex - 1]?.type === "step-start";
      const needsStepStart = latestMessage.role === "assistant" && part.type === "text" && !hasStepStartBefore && latestMessage.content.parts.length > 0 && latestMessage.content.parts.at(-1)?.type === "tool-invocation";
      if (typeof insertAt === "number") {
        if (needsStepStart) {
          latestMessage.content.parts.splice(insertAt, 0, { type: "step-start" });
          latestMessage.content.parts.splice(insertAt + 1, 0, part);
        } else {
          latestMessage.content.parts.splice(insertAt, 0, part);
        }
      } else {
        if (needsStepStart) {
          latestMessage.content.parts.push({ type: "step-start" });
        }
        latestMessage.content.parts.push(part);
      }
    }
  }
};

// src/stream/aisdk/v5/compat/content.ts
function splitDataUrl(dataUrl) {
  try {
    const [header, base64Content] = dataUrl.split(",");
    return {
      mediaType: header?.split(";")[0]?.split(":")[1],
      base64Content
    };
  } catch {
    return {
      mediaType: void 0,
      base64Content: void 0
    };
  }
}
function convertToDataContent(content) {
  if (content instanceof Uint8Array) {
    return { data: content, mediaType: void 0 };
  }
  if (content instanceof ArrayBuffer) {
    return { data: new Uint8Array(content), mediaType: void 0 };
  }
  if (typeof content === "string") {
    try {
      content = new URL(content);
    } catch {
    }
  }
  if (content instanceof URL && content.protocol === "data:") {
    const { mediaType: dataUrlMediaType, base64Content } = splitDataUrl(content.toString());
    if (dataUrlMediaType == null || base64Content == null) {
      throw new MastraError({
        id: "INVALID_DATA_URL_FORMAT",
        text: `Invalid data URL format in content ${content.toString()}`,
        domain: "LLM" /* LLM */,
        category: "USER" /* USER */
      });
    }
    return { data: base64Content, mediaType: dataUrlMediaType };
  }
  return { data: content, mediaType: void 0 };
}
var imageMediaTypeSignatures = [
  {
    mediaType: "image/gif",
    bytesPrefix: [71, 73, 70],
    base64Prefix: "R0lG"
  },
  {
    mediaType: "image/png",
    bytesPrefix: [137, 80, 78, 71],
    base64Prefix: "iVBORw"
  },
  {
    mediaType: "image/jpeg",
    bytesPrefix: [255, 216],
    base64Prefix: "/9j/"
  },
  {
    mediaType: "image/webp",
    bytesPrefix: [82, 73, 70, 70],
    base64Prefix: "UklGRg"
  },
  {
    mediaType: "image/bmp",
    bytesPrefix: [66, 77],
    base64Prefix: "Qk"
  },
  {
    mediaType: "image/tiff",
    bytesPrefix: [73, 73, 42, 0],
    base64Prefix: "SUkqAA"
  },
  {
    mediaType: "image/tiff",
    bytesPrefix: [77, 77, 0, 42],
    base64Prefix: "TU0AKg"
  },
  {
    mediaType: "image/avif",
    bytesPrefix: [0, 0, 0, 32, 102, 116, 121, 112, 97, 118, 105, 102],
    base64Prefix: "AAAAIGZ0eXBhdmlm"
  },
  {
    mediaType: "image/heic",
    bytesPrefix: [0, 0, 0, 32, 102, 116, 121, 112, 104, 101, 105, 99],
    base64Prefix: "AAAAIGZ0eXBoZWlj"
  }
];
var stripID3 = (data) => {
  const bytes = typeof data === "string" ? convertBase64ToUint8Array(data) : data;
  const id3Size = (
    // @ts-expect-error - bytes array access
    (bytes[6] & 127) << 21 | // @ts-expect-error - bytes array access
    (bytes[7] & 127) << 14 | // @ts-expect-error - bytes array access
    (bytes[8] & 127) << 7 | // @ts-expect-error - bytes array access
    bytes[9] & 127
  );
  return bytes.slice(id3Size + 10);
};
function stripID3TagsIfPresent(data) {
  const hasId3 = typeof data === "string" && data.startsWith("SUQz") || typeof data !== "string" && data.length > 10 && data[0] === 73 && // 'I'
  data[1] === 68 && // 'D'
  data[2] === 51;
  return hasId3 ? stripID3(data) : data;
}
function detectMediaType({
  data,
  signatures
}) {
  const processedData = stripID3TagsIfPresent(data);
  for (const signature of signatures) {
    if (typeof processedData === "string" ? processedData.startsWith(signature.base64Prefix) : processedData.length >= signature.bytesPrefix.length && signature.bytesPrefix.every((byte, index) => processedData[index] === byte)) {
      return signature.mediaType;
    }
  }
  return void 0;
}

// src/agent/message-list/prompt/convert-file.ts
function convertImageFilePart(part, downloadedAssets) {
  let originalData;
  const type = part.type;
  switch (type) {
    case "image":
      originalData = part.image;
      break;
    case "file":
      originalData = part.data;
      break;
    default:
      throw new Error(`Unsupported part type: ${type}`);
  }
  const { data: convertedData, mediaType: convertedMediaType } = convertToDataContent(originalData);
  let mediaType = convertedMediaType ?? part.mediaType;
  let data = convertedData;
  if (data instanceof URL && downloadedAssets) {
    const downloadedFile = downloadedAssets[data.toString()];
    if (downloadedFile) {
      data = downloadedFile.data;
      mediaType ??= downloadedFile.mediaType;
    }
  }
  switch (type) {
    case "image": {
      if (data instanceof Uint8Array || typeof data === "string") {
        mediaType = detectMediaType({ data, signatures: imageMediaTypeSignatures }) ?? mediaType;
      }
      return {
        type: "file",
        mediaType: mediaType ?? "image/*",
        // any image
        filename: void 0,
        data,
        providerOptions: part.providerOptions
      };
    }
    case "file": {
      if (mediaType == null) {
        throw new Error(`Media type is missing for file part`);
      }
      return {
        type: "file",
        mediaType,
        filename: part.filename,
        data,
        providerOptions: part.providerOptions
      };
    }
  }
}

// src/agent/message-list/prompt/attachments-to-parts.ts
function attachmentsToParts(attachments) {
  const parts = [];
  for (const attachment of attachments) {
    const categorized = categorizeFileData(attachment.url, attachment.contentType);
    let urlString = attachment.url;
    if (categorized.type === "raw") {
      urlString = createDataUri(attachment.url, attachment.contentType || "application/octet-stream");
    }
    let url;
    try {
      url = new URL(urlString);
    } catch {
      throw new Error(`Invalid URL: ${attachment.url}`);
    }
    switch (url.protocol) {
      case "http:":
      case "https:":
      // Cloud storage protocols supported by AI providers (e.g., Vertex AI for gs://, Bedrock for s3://)
      case "gs:":
      case "s3:": {
        if (attachment.contentType?.startsWith("image/")) {
          parts.push({ type: "image", image: url.toString(), mimeType: attachment.contentType });
        } else {
          if (!attachment.contentType) {
            throw new Error("If the attachment is not an image, it must specify a content type");
          }
          parts.push({
            type: "file",
            data: url.toString(),
            mimeType: attachment.contentType
          });
        }
        break;
      }
      case "data:": {
        if (attachment.contentType?.startsWith("image/")) {
          parts.push({
            type: "image",
            image: urlString,
            mimeType: attachment.contentType
          });
        } else if (attachment.contentType?.startsWith("text/")) {
          parts.push({
            type: "file",
            data: urlString,
            mimeType: attachment.contentType
          });
        } else {
          if (!attachment.contentType) {
            throw new Error("If the attachment is not an image or text, it must specify a content type");
          }
          parts.push({
            type: "file",
            data: urlString,
            mimeType: attachment.contentType
          });
        }
        break;
      }
      default: {
        throw new Error(`Unsupported URL protocol: ${url.protocol}`);
      }
    }
  }
  return parts;
}

// src/agent/message-list/prompt/convert-to-mastra-v1.ts
var makePushOrCombine = (v1Messages) => {
  const idUsageCount = /* @__PURE__ */ new Map();
  const SPLIT_SUFFIX_PATTERN = /__split-\d+$/;
  return (msg) => {
    const previousMessage = v1Messages.at(-1);
    if (msg.role === previousMessage?.role && Array.isArray(previousMessage.content) && Array.isArray(msg.content) && // we were creating new messages for tool calls before and not appending to the assistant message
    // so don't append here so everything works as before
    (msg.role !== `assistant` || msg.role === `assistant` && msg.content.at(-1)?.type !== `tool-call`)) {
      for (const part of msg.content) {
        previousMessage.content.push(part);
      }
    } else {
      let baseId = msg.id;
      const hasSplitSuffix = SPLIT_SUFFIX_PATTERN.test(baseId);
      if (hasSplitSuffix) {
        v1Messages.push(msg);
        return;
      }
      const currentCount = idUsageCount.get(baseId) || 0;
      if (currentCount > 0) {
        msg.id = `${baseId}__split-${currentCount}`;
      }
      idUsageCount.set(baseId, currentCount + 1);
      v1Messages.push(msg);
    }
  };
};
function convertToV1Messages(messages) {
  const v1Messages = [];
  const pushOrCombine = makePushOrCombine(v1Messages);
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    const isLastMessage = i === messages.length - 1;
    if (!message?.content) continue;
    const { content, experimental_attachments: inputAttachments = [], parts: inputParts } = message.content;
    const { role } = message;
    const fields = {
      id: message.id,
      createdAt: message.createdAt,
      resourceId: message.resourceId,
      threadId: message.threadId
    };
    const experimental_attachments = [...inputAttachments];
    const parts = [];
    for (const part of inputParts) {
      if (part.type === "file") {
        experimental_attachments.push({
          url: part.data,
          contentType: part.mimeType
        });
      } else {
        parts.push(part);
      }
    }
    switch (role) {
      case "user": {
        if (parts == null) {
          const userContent = experimental_attachments ? [{ type: "text", text: content || "" }, ...attachmentsToParts(experimental_attachments)] : { type: "text", text: content || "" };
          pushOrCombine({
            role: "user",
            ...fields,
            type: "text",
            // @ts-expect-error - content type mismatch in conversion
            content: userContent
          });
        } else {
          const textParts = message.content.parts.filter((part) => part.type === "text").map((part) => ({
            type: "text",
            text: part.text
          }));
          const userContent = experimental_attachments ? [...textParts, ...attachmentsToParts(experimental_attachments)] : textParts;
          pushOrCombine({
            role: "user",
            ...fields,
            type: "text",
            content: Array.isArray(userContent) && userContent.length === 1 && userContent[0]?.type === `text` && typeof content !== `undefined` ? content : userContent
          });
        }
        break;
      }
      case "assistant": {
        if (message.content.parts != null) {
          let processBlock2 = function() {
            const content2 = [];
            for (const part of block) {
              switch (part.type) {
                case "file":
                case "text": {
                  content2.push(part);
                  break;
                }
                case "reasoning": {
                  for (const detail of part.details) {
                    switch (detail.type) {
                      case "text":
                        content2.push({
                          type: "reasoning",
                          text: detail.text,
                          signature: detail.signature
                        });
                        break;
                      case "redacted":
                        content2.push({
                          type: "redacted-reasoning",
                          data: detail.data
                        });
                        break;
                    }
                  }
                  break;
                }
                case "tool-invocation":
                  if (part.toolInvocation.toolName !== "updateWorkingMemory") {
                    content2.push({
                      type: "tool-call",
                      toolCallId: part.toolInvocation.toolCallId,
                      toolName: part.toolInvocation.toolName,
                      args: part.toolInvocation.args
                    });
                  }
                  break;
              }
            }
            pushOrCombine({
              role: "assistant",
              ...fields,
              type: content2.some((c) => c.type === `tool-call`) ? "tool-call" : "text",
              content: typeof content2 !== `string` && Array.isArray(content2) && content2.length === 1 && content2[0]?.type === `text` ? content2[0].text : content2
            });
            const stepInvocations = block.filter((part) => `type` in part && part.type === "tool-invocation").map((part) => part.toolInvocation).filter((ti) => ti.toolName !== "updateWorkingMemory");
            const invocationsWithResults = stepInvocations.filter((ti) => ti.state === "result" && "result" in ti);
            if (invocationsWithResults.length > 0) {
              pushOrCombine({
                role: "tool",
                ...fields,
                type: "tool-result",
                content: invocationsWithResults.map((toolInvocation) => {
                  const { toolCallId, toolName, result } = toolInvocation;
                  return {
                    type: "tool-result",
                    toolCallId,
                    toolName,
                    result
                  };
                })
              });
            }
            block = [];
            blockHasToolInvocations = false;
            currentStep++;
          };
          let currentStep = 0;
          let blockHasToolInvocations = false;
          let block = [];
          for (const part of message.content.parts) {
            switch (part.type) {
              case "text": {
                if (blockHasToolInvocations) {
                  processBlock2();
                }
                block.push(part);
                break;
              }
              case "file":
              case "reasoning": {
                block.push(part);
                break;
              }
              case "tool-invocation": {
                const hasNonToolContent = block.some(
                  (p) => p.type === "text" || p.type === "file" || p.type === "reasoning"
                );
                if (hasNonToolContent || (part.toolInvocation.step ?? 0) !== currentStep) {
                  processBlock2();
                }
                block.push(part);
                blockHasToolInvocations = true;
                break;
              }
            }
          }
          processBlock2();
          const toolInvocations2 = message.content.toolInvocations;
          if (toolInvocations2 && toolInvocations2.length > 0) {
            const processedToolCallIds = /* @__PURE__ */ new Set();
            for (const part of message.content.parts) {
              if (part.type === "tool-invocation" && part.toolInvocation.toolCallId) {
                processedToolCallIds.add(part.toolInvocation.toolCallId);
              }
            }
            const unprocessedToolInvocations = toolInvocations2.filter(
              (ti) => !processedToolCallIds.has(ti.toolCallId) && ti.toolName !== "updateWorkingMemory"
            );
            if (unprocessedToolInvocations.length > 0) {
              const invocationsByStep = /* @__PURE__ */ new Map();
              for (const inv of unprocessedToolInvocations) {
                const step = inv.step ?? 0;
                if (!invocationsByStep.has(step)) {
                  invocationsByStep.set(step, []);
                }
                invocationsByStep.get(step).push(inv);
              }
              const sortedSteps = Array.from(invocationsByStep.keys()).sort((a, b) => a - b);
              for (const step of sortedSteps) {
                const stepInvocations = invocationsByStep.get(step);
                pushOrCombine({
                  role: "assistant",
                  ...fields,
                  type: "tool-call",
                  content: [
                    ...stepInvocations.map(({ toolCallId, toolName, args }) => ({
                      type: "tool-call",
                      toolCallId,
                      toolName,
                      args
                    }))
                  ]
                });
                const invocationsWithResults = stepInvocations.filter((ti) => ti.state === "result" && "result" in ti);
                if (invocationsWithResults.length > 0) {
                  pushOrCombine({
                    role: "tool",
                    ...fields,
                    type: "tool-result",
                    content: invocationsWithResults.map((toolInvocation) => {
                      const { toolCallId, toolName, result } = toolInvocation;
                      return {
                        type: "tool-result",
                        toolCallId,
                        toolName,
                        result
                      };
                    })
                  });
                }
              }
            }
          }
          break;
        }
        const toolInvocations = message.content.toolInvocations;
        if (toolInvocations == null || toolInvocations.length === 0) {
          pushOrCombine({ role: "assistant", ...fields, content: content || "", type: "text" });
          break;
        }
        const maxStep = toolInvocations.reduce((max, toolInvocation) => {
          return Math.max(max, toolInvocation.step ?? 0);
        }, 0);
        for (let i2 = 0; i2 <= maxStep; i2++) {
          const stepInvocations = toolInvocations.filter(
            (toolInvocation) => (toolInvocation.step ?? 0) === i2 && toolInvocation.toolName !== "updateWorkingMemory"
          );
          if (stepInvocations.length === 0) {
            continue;
          }
          pushOrCombine({
            role: "assistant",
            ...fields,
            type: "tool-call",
            content: [
              ...isLastMessage && content && i2 === 0 ? [{ type: "text", text: content }] : [],
              ...stepInvocations.map(({ toolCallId, toolName, args }) => ({
                type: "tool-call",
                toolCallId,
                toolName,
                args
              }))
            ]
          });
          const invocationsWithResults = stepInvocations.filter((ti) => ti.state === "result" && "result" in ti);
          if (invocationsWithResults.length > 0) {
            pushOrCombine({
              role: "tool",
              ...fields,
              type: "tool-result",
              content: invocationsWithResults.map((toolInvocation) => {
                const { toolCallId, toolName, result } = toolInvocation;
                return {
                  type: "tool-result",
                  toolCallId,
                  toolName,
                  result
                };
              })
            });
          }
        }
        if (content && !isLastMessage) {
          pushOrCombine({ role: "assistant", ...fields, type: "text", content: content || "" });
        }
        break;
      }
    }
  }
  return v1Messages;
}

// src/utils/fetchWithRetry.ts
async function fetchWithRetry(url, options = {}, maxRetries = 3) {
  let retryCount = 0;
  let lastError = null;
  while (retryCount < maxRetries) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        if (response.status >= 400 && response.status < 500) {
          throw new Error(`Request failed with status: ${response.status} ${response.statusText}`);
        }
        lastError = new Error(`Request failed with status: ${response.status} ${response.statusText}`);
        retryCount++;
        if (retryCount >= maxRetries) {
          throw lastError;
        }
        const delay = Math.min(1e3 * Math.pow(2, retryCount), 1e4);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (lastError.message.includes("status: 4")) {
        throw lastError;
      }
      retryCount++;
      if (retryCount >= maxRetries) {
        break;
      }
      const delay = Math.min(1e3 * Math.pow(2, retryCount), 1e4);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError || new Error("Request failed after multiple retry attempts");
}

// src/agent/message-list/prompt/download-assets.ts
var downloadFromUrl = async ({ url, downloadRetries }) => {
  const urlText = url.toString();
  try {
    const response = await fetchWithRetry(
      urlText,
      {
        method: "GET"
      },
      downloadRetries
    );
    if (!response.ok) {
      throw new MastraError({
        id: "DOWNLOAD_ASSETS_FAILED",
        text: "Failed to download asset",
        domain: "LLM" /* LLM */,
        category: "USER" /* USER */
      });
    }
    return {
      data: new Uint8Array(await response.arrayBuffer()),
      mediaType: response.headers.get("content-type") ?? void 0
    };
  } catch (error) {
    throw new MastraError(
      {
        id: "DOWNLOAD_ASSETS_FAILED",
        text: "Failed to download asset",
        domain: "LLM" /* LLM */,
        category: "USER" /* USER */
      },
      error
    );
  }
};
async function downloadAssetsFromMessages({
  messages,
  downloadConcurrency = 10,
  downloadRetries = 3,
  supportedUrls
}) {
  const pMap = (await import('./index2.mjs')).default;
  const filesToDownload = messages.filter((message) => message.role === "user").map((message) => message.content).filter((content) => Array.isArray(content)).flat().filter((part) => part.type === "image" || part.type === "file").map((part) => {
    const mediaType = part.mediaType ?? (part.type === "image" ? "image/*" : void 0);
    let data = part.type === "image" ? part.image : part.data;
    if (typeof data === "string") {
      try {
        data = new URL(data);
      } catch {
      }
    }
    return { mediaType, data };
  }).filter((part) => part.data instanceof URL).map((part) => {
    return {
      url: part.data,
      isUrlSupportedByModel: part.mediaType != null && isUrlSupported({
        url: part.data.toString(),
        mediaType: part.mediaType,
        supportedUrls: supportedUrls ?? {}
      })
    };
  });
  const downloadedFiles = await pMap(
    filesToDownload,
    async (fileItem) => {
      if (fileItem.isUrlSupportedByModel) {
        return null;
      }
      return {
        url: fileItem.url.toString(),
        ...await downloadFromUrl({ url: fileItem.url, downloadRetries })
      };
    },
    {
      concurrency: downloadConcurrency
    }
  );
  const downloadFileList = downloadedFiles.filter(
    (downloadedFile) => downloadedFile?.data != null
  ).map(({ url, data, mediaType }) => [url, { data, mediaType }]);
  return Object.fromEntries(downloadFileList);
}

// src/agent/message-list/state/serialization.ts
function serializeMessage(message) {
  return {
    ...message,
    createdAt: message.createdAt.toUTCString()
  };
}
function deserializeMessage(message) {
  return {
    ...message,
    createdAt: new Date(message.createdAt)
  };
}
function serializeMessages(messages) {
  return messages.map(serializeMessage);
}
function deserializeMessages(messages) {
  return messages.map(deserializeMessage);
}

// src/agent/message-list/state/MessageStateManager.ts
var MessageStateManager = class {
  // Messages tracked by source
  memoryMessages = /* @__PURE__ */ new Set();
  newUserMessages = /* @__PURE__ */ new Set();
  newResponseMessages = /* @__PURE__ */ new Set();
  userContextMessages = /* @__PURE__ */ new Set();
  // Persisted message tracking
  memoryMessagesPersisted = /* @__PURE__ */ new Set();
  newUserMessagesPersisted = /* @__PURE__ */ new Set();
  newResponseMessagesPersisted = /* @__PURE__ */ new Set();
  userContextMessagesPersisted = /* @__PURE__ */ new Set();
  /**
   * Add a message to the appropriate source set and persisted set
   */
  addToSource(message, source) {
    switch (source) {
      case "memory":
        this.memoryMessages.add(message);
        this.memoryMessagesPersisted.add(message);
        break;
      case "response":
        this.newResponseMessages.add(message);
        this.newResponseMessagesPersisted.add(message);
        if (this.newUserMessages.has(message)) {
          this.newUserMessages.delete(message);
        }
        break;
      case "input":
      case "user":
        this.newUserMessages.add(message);
        this.newUserMessagesPersisted.add(message);
        break;
      case "context":
        this.userContextMessages.add(message);
        this.userContextMessagesPersisted.add(message);
        break;
      default:
        throw new Error(`Missing message source for message ${message}`);
    }
  }
  /**
   * Check if a message belongs to the memory source
   */
  isMemoryMessage(message) {
    return this.memoryMessages.has(message);
  }
  /**
   * Check if a message belongs to the input source
   */
  isUserMessage(message) {
    return this.newUserMessages.has(message);
  }
  /**
   * Check if a message belongs to the response source
   */
  isResponseMessage(message) {
    return this.newResponseMessages.has(message);
  }
  /**
   * Check if a message belongs to the context source
   */
  isContextMessage(message) {
    return this.userContextMessages.has(message);
  }
  /**
   * Get all memory messages
   */
  getMemoryMessages() {
    return this.memoryMessages;
  }
  /**
   * Get all user/input messages
   */
  getUserMessages() {
    return this.newUserMessages;
  }
  /**
   * Get all response messages
   */
  getResponseMessages() {
    return this.newResponseMessages;
  }
  /**
   * Get all context messages
   */
  getContextMessages() {
    return this.userContextMessages;
  }
  /**
   * Get persisted memory messages
   */
  getMemoryMessagesPersisted() {
    return this.memoryMessagesPersisted;
  }
  /**
   * Get persisted user/input messages
   */
  getUserMessagesPersisted() {
    return this.newUserMessagesPersisted;
  }
  /**
   * Get persisted response messages
   */
  getResponseMessagesPersisted() {
    return this.newResponseMessagesPersisted;
  }
  /**
   * Get persisted context messages
   */
  getContextMessagesPersisted() {
    return this.userContextMessagesPersisted;
  }
  /**
   * Remove a message from all source sets
   */
  removeMessage(message) {
    this.memoryMessages.delete(message);
    this.newUserMessages.delete(message);
    this.newResponseMessages.delete(message);
    this.userContextMessages.delete(message);
  }
  /**
   * Clear all user messages
   */
  clearUserMessages() {
    this.newUserMessages.clear();
  }
  /**
   * Clear all response messages
   */
  clearResponseMessages() {
    this.newResponseMessages.clear();
  }
  /**
   * Clear all context messages
   */
  clearContextMessages() {
    this.userContextMessages.clear();
  }
  /**
   * Clear all messages from all sources (but not persisted tracking)
   */
  clearAll() {
    this.newUserMessages.clear();
    this.newResponseMessages.clear();
    this.userContextMessages.clear();
  }
  /**
   * Create a lookup function to determine message source
   */
  createSourceChecker() {
    const sources = {
      memory: new Set(Array.from(this.memoryMessages.values()).map((m) => m.id)),
      output: new Set(Array.from(this.newResponseMessages.values()).map((m) => m.id)),
      input: new Set(Array.from(this.newUserMessages.values()).map((m) => m.id)),
      context: new Set(Array.from(this.userContextMessages.values()).map((m) => m.id))
    };
    return {
      ...sources,
      getSource: (msg) => {
        if (sources.memory.has(msg.id)) return "memory";
        if (sources.input.has(msg.id)) return "input";
        if (sources.output.has(msg.id)) return "response";
        if (sources.context.has(msg.id)) return "context";
        return null;
      }
    };
  }
  /**
   * Check if a message is a new (unsaved) user or response message by ID
   */
  isNewMessage(messageOrId) {
    const id = typeof messageOrId === "string" ? messageOrId : messageOrId.id;
    if (typeof messageOrId !== "string") {
      if (this.newUserMessages.has(messageOrId) || this.newResponseMessages.has(messageOrId)) {
        return true;
      }
    }
    return Array.from(this.newUserMessages).some((m) => m.id === id) || Array.from(this.newResponseMessages).some((m) => m.id === id);
  }
  /**
   * Serialize source tracking state (message IDs only)
   */
  serializeSourceTracking() {
    const serializeSet = (set) => Array.from(set).map((value) => value.id);
    return {
      memoryMessages: serializeSet(this.memoryMessages),
      newUserMessages: serializeSet(this.newUserMessages),
      newResponseMessages: serializeSet(this.newResponseMessages),
      userContextMessages: serializeSet(this.userContextMessages),
      memoryMessagesPersisted: serializeSet(this.memoryMessagesPersisted),
      newUserMessagesPersisted: serializeSet(this.newUserMessagesPersisted),
      newResponseMessagesPersisted: serializeSet(this.newResponseMessagesPersisted),
      userContextMessagesPersisted: serializeSet(this.userContextMessagesPersisted)
    };
  }
  /**
   * Deserialize source tracking state from message IDs
   */
  deserializeSourceTracking(state, messages) {
    const deserializeSet = (ids) => new Set(ids.map((id) => messages.find((m) => m.id === id)).filter(Boolean));
    this.memoryMessages = deserializeSet(state.memoryMessages);
    this.newUserMessages = deserializeSet(state.newUserMessages);
    this.newResponseMessages = deserializeSet(state.newResponseMessages);
    this.userContextMessages = deserializeSet(state.userContextMessages);
    this.memoryMessagesPersisted = deserializeSet(state.memoryMessagesPersisted);
    this.newUserMessagesPersisted = deserializeSet(state.newUserMessagesPersisted);
    this.newResponseMessagesPersisted = deserializeSet(state.newResponseMessagesPersisted);
    this.userContextMessagesPersisted = deserializeSet(state.userContextMessagesPersisted);
  }
  /**
   * Serialize all MessageList state for workflow suspend/resume
   */
  serializeAll(data) {
    return {
      messages: serializeMessages(data.messages),
      systemMessages: data.systemMessages,
      taggedSystemMessages: data.taggedSystemMessages,
      memoryInfo: data.memoryInfo,
      _agentNetworkAppend: data.agentNetworkAppend,
      ...this.serializeSourceTracking()
    };
  }
  /**
   * Deserialize all MessageList state from workflow suspend/resume
   */
  deserializeAll(state) {
    const messages = deserializeMessages(state.messages);
    this.deserializeSourceTracking(
      {
        memoryMessages: state.memoryMessages,
        newUserMessages: state.newUserMessages,
        newResponseMessages: state.newResponseMessages,
        userContextMessages: state.userContextMessages,
        memoryMessagesPersisted: state.memoryMessagesPersisted,
        newUserMessagesPersisted: state.newUserMessagesPersisted,
        newResponseMessagesPersisted: state.newResponseMessagesPersisted,
        userContextMessagesPersisted: state.userContextMessagesPersisted
      },
      messages
    );
    return {
      messages,
      systemMessages: state.systemMessages,
      taggedSystemMessages: state.taggedSystemMessages,
      memoryInfo: state.memoryInfo,
      agentNetworkAppend: state._agentNetworkAppend
    };
  }
};

// src/agent/message-list/message-list.ts
var MessageList = class {
  messages = [];
  // passed in by dev in input or context
  systemMessages = [];
  // passed in by us for a specific purpose, eg memory system message
  taggedSystemMessages = {};
  memoryInfo = null;
  // Centralized state management for message tracking
  stateManager = new MessageStateManager();
  // Legacy getters for backward compatibility - delegate to stateManager
  get memoryMessages() {
    return this.stateManager.getMemoryMessages();
  }
  get newUserMessages() {
    return this.stateManager.getUserMessages();
  }
  get newResponseMessages() {
    return this.stateManager.getResponseMessages();
  }
  get userContextMessages() {
    return this.stateManager.getContextMessages();
  }
  get memoryMessagesPersisted() {
    return this.stateManager.getMemoryMessagesPersisted();
  }
  get newUserMessagesPersisted() {
    return this.stateManager.getUserMessagesPersisted();
  }
  get newResponseMessagesPersisted() {
    return this.stateManager.getResponseMessagesPersisted();
  }
  get userContextMessagesPersisted() {
    return this.stateManager.getContextMessagesPersisted();
  }
  generateMessageId;
  _agentNetworkAppend = false;
  logger;
  // Event recording for observability
  isRecording = false;
  recordedEvents = [];
  constructor({
    threadId,
    resourceId,
    generateMessageId,
    logger,
    // @ts-expect-error Flag for agent network messages
    _agentNetworkAppend
  } = {}) {
    if (threadId) {
      this.memoryInfo = { threadId, resourceId };
    }
    this.generateMessageId = generateMessageId;
    this.logger = logger;
    this._agentNetworkAppend = _agentNetworkAppend || false;
  }
  /**
   * Start recording mutations to the MessageList for observability/tracing
   */
  startRecording() {
    this.isRecording = true;
    this.recordedEvents = [];
  }
  hasRecordedEvents() {
    return this.recordedEvents.length > 0;
  }
  getRecordedEvents() {
    const events = [...this.recordedEvents];
    return events;
  }
  /**
   * Stop recording and return the list of recorded events
   */
  stopRecording() {
    this.isRecording = false;
    const events = this.getRecordedEvents();
    this.recordedEvents = [];
    return events;
  }
  add(messages, messageSource) {
    if (messageSource === `user`) messageSource = `input`;
    if (!messages) return this;
    const messageArray = Array.isArray(messages) ? messages : [messages];
    if (this.isRecording) {
      this.recordedEvents.push({
        type: "add",
        source: messageSource,
        count: messageArray.length
      });
    }
    for (const message of messageArray) {
      this.addOne(
        typeof message === `string` ? {
          role: "user",
          content: message
        } : message,
        messageSource
      );
    }
    return this;
  }
  serialize() {
    return this.stateManager.serializeAll({
      messages: this.messages,
      systemMessages: this.systemMessages,
      taggedSystemMessages: this.taggedSystemMessages,
      memoryInfo: this.memoryInfo,
      agentNetworkAppend: this._agentNetworkAppend
    });
  }
  /**
   * Custom serialization for tracing/observability spans.
   * Returns a clean representation with just the essential data,
   * excluding internal state tracking, methods, and implementation details.
   *
   * This is automatically called by the span serialization system when
   * a MessageList instance appears in span input/output/attributes.
   */
  serializeForSpan() {
    const coreMessages = this.all.aiV4.core();
    return {
      messages: coreMessages.map((msg) => ({
        role: msg.role,
        content: msg.content
      })),
      systemMessages: [
        // Untagged first (base instructions)
        ...this.systemMessages.map((m) => ({ role: m.role, content: m.content })),
        // Tagged after (contextual additions)
        ...Object.entries(this.taggedSystemMessages).flatMap(
          ([tag, msgs]) => msgs.map((m) => ({ role: m.role, content: m.content, tag }))
        )
      ]
    };
  }
  deserialize(state) {
    const data = this.stateManager.deserializeAll(state);
    this.messages = data.messages;
    this.systemMessages = data.systemMessages;
    this.taggedSystemMessages = data.taggedSystemMessages;
    this.memoryInfo = data.memoryInfo;
    this._agentNetworkAppend = data.agentNetworkAppend;
    return this;
  }
  makeMessageSourceChecker() {
    return this.stateManager.createSourceChecker();
  }
  getLatestUserContent() {
    const currentUserMessages = this.all.core().filter((m) => m.role === "user");
    const content = currentUserMessages.at(-1)?.content;
    if (!content) return null;
    return coreContentToString(content);
  }
  get get() {
    return {
      all: this.all,
      remembered: this.remembered,
      input: this.input,
      response: this.response
    };
  }
  get getPersisted() {
    return {
      remembered: this.rememberedPersisted,
      input: this.inputPersisted,
      taggedSystemMessages: this.taggedSystemMessages,
      response: this.responsePersisted
    };
  }
  get clear() {
    return {
      all: {
        db: () => {
          const allMessages = [...this.messages];
          this.messages = [];
          this.stateManager.clearAll();
          if (this.isRecording && allMessages.length > 0) {
            this.recordedEvents.push({
              type: "clear",
              count: allMessages.length
            });
          }
          return allMessages;
        }
      },
      input: {
        db: () => {
          const userMessages = Array.from(this.stateManager.getUserMessages());
          this.messages = this.messages.filter((m) => !this.stateManager.isUserMessage(m));
          this.stateManager.clearUserMessages();
          if (this.isRecording && userMessages.length > 0) {
            this.recordedEvents.push({
              type: "clear",
              source: "input",
              count: userMessages.length
            });
          }
          return userMessages;
        }
      },
      response: {
        db: () => {
          const responseMessages = Array.from(this.stateManager.getResponseMessages());
          this.messages = this.messages.filter((m) => !this.stateManager.isResponseMessage(m));
          this.stateManager.clearResponseMessages();
          if (this.isRecording && responseMessages.length > 0) {
            this.recordedEvents.push({
              type: "clear",
              source: "response",
              count: responseMessages.length
            });
          }
          return responseMessages;
        }
      }
    };
  }
  /**
   * Remove messages by ID
   * @param ids - Array of message IDs to remove
   * @returns Array of removed messages
   */
  removeByIds(ids) {
    const idsSet = new Set(ids);
    const removed = [];
    this.messages = this.messages.filter((m) => {
      if (idsSet.has(m.id)) {
        removed.push(m);
        this.stateManager.removeMessage(m);
        return false;
      }
      return true;
    });
    if (this.isRecording && removed.length > 0) {
      this.recordedEvents.push({
        type: "removeByIds",
        ids,
        count: removed.length
      });
    }
    return removed;
  }
  all = {
    db: () => this.messages,
    v1: () => convertToV1Messages(this.all.db()),
    aiV5: {
      model: () => aiV5UIMessagesToAIV5ModelMessages(this.all.aiV5.ui(), this.messages),
      ui: () => this.all.db().map(AIV5Adapter.toUIMessage),
      // Used when calling AI SDK streamText/generateText
      prompt: () => {
        const systemMessages = aiV4CoreMessagesToAIV5ModelMessages(
          [...this.systemMessages, ...Object.values(this.taggedSystemMessages).flat()],
          `system`,
          this.createAdapterContext(),
          this.messages
        );
        const modelMessages = aiV5UIMessagesToAIV5ModelMessages(this.all.aiV5.ui(), this.messages, true);
        const messages = [...systemMessages, ...modelMessages];
        return ensureGeminiCompatibleMessages(messages, this.logger);
      },
      // Used for creating LLM prompt messages without AI SDK streamText/generateText
      llmPrompt: async (options = {
        downloadConcurrency: 10,
        downloadRetries: 3
      }) => {
        const modelMessages = aiV5UIMessagesToAIV5ModelMessages(this.all.aiV5.ui(), this.messages, true);
        const storedModelOutputs = /* @__PURE__ */ new Map();
        for (const dbMsg of this.messages) {
          if (dbMsg.content?.format !== 2 || !dbMsg.content.parts) continue;
          for (const part of dbMsg.content.parts) {
            if (part.type === "tool-invocation" && part.toolInvocation?.state === "result" && part.providerMetadata?.mastra && typeof part.providerMetadata.mastra === "object" && "modelOutput" in part.providerMetadata.mastra) {
              storedModelOutputs.set(
                part.toolInvocation.toolCallId,
                part.providerMetadata.mastra.modelOutput
              );
            }
          }
        }
        if (storedModelOutputs.size > 0) {
          for (const modelMsg of modelMessages) {
            if (modelMsg.role !== "tool" || !Array.isArray(modelMsg.content)) continue;
            for (let i = 0; i < modelMsg.content.length; i++) {
              const part = modelMsg.content[i];
              if (part.type === "tool-result" && storedModelOutputs.has(part.toolCallId)) {
                modelMsg.content[i] = {
                  ...part,
                  output: storedModelOutputs.get(part.toolCallId)
                };
              }
            }
          }
        }
        const systemMessages = aiV4CoreMessagesToAIV5ModelMessages(
          [...this.systemMessages, ...Object.values(this.taggedSystemMessages).flat()],
          `system`,
          this.createAdapterContext(),
          this.messages
        );
        const downloadedAssets = await downloadAssetsFromMessages({
          messages: modelMessages,
          downloadConcurrency: options?.downloadConcurrency,
          downloadRetries: options?.downloadRetries,
          supportedUrls: options?.supportedUrls
        });
        let messages = [...systemMessages, ...modelMessages];
        const hasImageOrFileContent = modelMessages.some(
          (message) => (message.role === "user" || message.role === "assistant") && typeof message.content !== "string" && message.content.some((part) => part.type === "image" || part.type === "file")
        );
        if (hasImageOrFileContent) {
          messages = messages.map((message) => {
            if (message.role === "user") {
              if (typeof message.content === "string") {
                return {
                  role: "user",
                  content: [{ type: "text", text: message.content }],
                  providerOptions: message.providerOptions
                };
              }
              const convertedContent = message.content.map((part) => {
                if (part.type === "image" || part.type === "file") {
                  return convertImageFilePart(part, downloadedAssets);
                }
                return part;
              }).filter((part) => part.type !== "text" || part.text !== "");
              return {
                role: "user",
                content: convertedContent,
                providerOptions: message.providerOptions
              };
            }
            if (message.role === "assistant" && typeof message.content !== "string") {
              const convertedContent = message.content.map((part) => {
                if (part.type === "file") {
                  return convertImageFilePart(part, downloadedAssets);
                }
                return part;
              });
              return {
                ...message,
                content: convertedContent
              };
            }
            return message;
          });
        }
        messages = ensureGeminiCompatibleMessages(messages, this.logger);
        return messages.map(aiV5ModelMessageToV2PromptMessage).filter(
          (message) => message.role === "system" || typeof message.content === "string" || message.content.length > 0
        );
      }
    },
    aiV6: {
      ui: () => this.all.db().map(AIV6Adapter.toUIMessage)
    },
    /* @deprecated use list.get.all.aiV4.prompt() instead */
    prompt: () => this.all.aiV4.prompt(),
    /* @deprecated use list.get.all.aiV4.ui() */
    ui: () => this.all.db().map(AIV4Adapter.toUIMessage),
    /* @deprecated use list.get.all.aiV4.core() */
    core: () => aiV4UIMessagesToAIV4CoreMessages(this.all.aiV4.ui()),
    aiV4: {
      ui: () => this.all.db().map(AIV4Adapter.toUIMessage),
      core: () => aiV4UIMessagesToAIV4CoreMessages(this.all.aiV4.ui()),
      // Used when calling AI SDK streamText/generateText
      prompt: () => {
        const coreMessages = this.all.aiV4.core();
        const messages = [...this.systemMessages, ...Object.values(this.taggedSystemMessages).flat(), ...coreMessages];
        return ensureGeminiCompatibleMessages(messages, this.logger);
      },
      // Used for creating LLM prompt messages without AI SDK streamText/generateText
      llmPrompt: () => {
        const coreMessages = this.all.aiV4.core();
        const systemMessages = [...this.systemMessages, ...Object.values(this.taggedSystemMessages).flat()];
        let messages = [...systemMessages, ...coreMessages];
        messages = ensureGeminiCompatibleMessages(messages, this.logger);
        return messages.map(aiV4CoreMessageToV1PromptMessage);
      }
    }
  };
  remembered = {
    db: () => this.messages.filter((m) => this.memoryMessages.has(m)),
    v1: () => convertToV1Messages(this.remembered.db()),
    aiV5: {
      model: () => aiV5UIMessagesToAIV5ModelMessages(this.remembered.aiV5.ui(), this.messages),
      ui: () => this.remembered.db().map(AIV5Adapter.toUIMessage)
    },
    aiV6: {
      ui: () => this.remembered.db().map(AIV6Adapter.toUIMessage)
    },
    /* @deprecated use list.get.remembered.aiV4.ui() */
    ui: () => this.remembered.db().map(AIV4Adapter.toUIMessage),
    /* @deprecated use list.get.remembered.aiV4.core() */
    core: () => aiV4UIMessagesToAIV4CoreMessages(this.all.aiV4.ui()),
    aiV4: {
      ui: () => this.remembered.db().map(AIV4Adapter.toUIMessage),
      core: () => aiV4UIMessagesToAIV4CoreMessages(this.all.aiV4.ui())
    }
  };
  rememberedPersisted = {
    db: () => this.all.db().filter((m) => this.memoryMessagesPersisted.has(m)),
    v1: () => convertToV1Messages(this.rememberedPersisted.db()),
    aiV5: {
      model: () => aiV5UIMessagesToAIV5ModelMessages(this.rememberedPersisted.aiV5.ui(), this.messages),
      ui: () => this.rememberedPersisted.db().map(AIV5Adapter.toUIMessage)
    },
    aiV6: {
      ui: () => this.rememberedPersisted.db().map(AIV6Adapter.toUIMessage)
    },
    /* @deprecated use list.getPersisted.remembered.aiV4.ui() */
    ui: () => this.rememberedPersisted.db().map(AIV4Adapter.toUIMessage),
    /* @deprecated use list.getPersisted.remembered.aiV4.core() */
    core: () => aiV4UIMessagesToAIV4CoreMessages(this.rememberedPersisted.ui()),
    aiV4: {
      ui: () => this.rememberedPersisted.db().map(AIV4Adapter.toUIMessage),
      core: () => aiV4UIMessagesToAIV4CoreMessages(this.rememberedPersisted.aiV4.ui())
    }
  };
  input = {
    db: () => this.messages.filter((m) => this.newUserMessages.has(m)),
    v1: () => convertToV1Messages(this.input.db()),
    aiV5: {
      model: () => aiV5UIMessagesToAIV5ModelMessages(this.input.aiV5.ui(), this.messages),
      ui: () => this.input.db().map(AIV5Adapter.toUIMessage)
    },
    aiV6: {
      ui: () => this.input.db().map(AIV6Adapter.toUIMessage)
    },
    /* @deprecated use list.get.input.aiV4.ui() instead */
    ui: () => this.input.db().map(AIV4Adapter.toUIMessage),
    /* @deprecated use list.get.core.aiV4.ui() instead */
    core: () => aiV4UIMessagesToAIV4CoreMessages(this.input.ui()),
    aiV4: {
      ui: () => this.input.db().map(AIV4Adapter.toUIMessage),
      core: () => aiV4UIMessagesToAIV4CoreMessages(this.input.aiV4.ui())
    }
  };
  inputPersisted = {
    db: () => this.messages.filter((m) => this.newUserMessagesPersisted.has(m)),
    v1: () => convertToV1Messages(this.inputPersisted.db()),
    aiV5: {
      model: () => aiV5UIMessagesToAIV5ModelMessages(this.inputPersisted.aiV5.ui(), this.messages),
      ui: () => this.inputPersisted.db().map(AIV5Adapter.toUIMessage)
    },
    aiV6: {
      ui: () => this.inputPersisted.db().map(AIV6Adapter.toUIMessage)
    },
    /* @deprecated use list.getPersisted.input.aiV4.ui() */
    ui: () => this.inputPersisted.db().map(AIV4Adapter.toUIMessage),
    /* @deprecated use list.getPersisted.input.aiV4.core() */
    core: () => aiV4UIMessagesToAIV4CoreMessages(this.inputPersisted.ui()),
    aiV4: {
      ui: () => this.inputPersisted.db().map(AIV4Adapter.toUIMessage),
      core: () => aiV4UIMessagesToAIV4CoreMessages(this.inputPersisted.aiV4.ui())
    }
  };
  response = {
    db: () => this.messages.filter((m) => this.newResponseMessages.has(m)),
    v1: () => convertToV1Messages(this.response.db()),
    aiV5: {
      ui: () => this.response.db().map(AIV5Adapter.toUIMessage),
      model: () => aiV5UIMessagesToAIV5ModelMessages(this.response.aiV5.ui(), this.messages).filter(
        (m) => m.role === `tool` || m.role === `assistant`
      ),
      modelContent: (stepNumber) => {
        if (typeof stepNumber === "number") {
          return StepContentExtractor.extractStepContent(
            this.response.aiV5.ui(),
            stepNumber,
            this.response.aiV5.stepContent
          );
        }
        return this.response.aiV5.model().map(this.response.aiV5.stepContent).flat();
      },
      stepContent: (message) => {
        return StepContentExtractor.convertToStepContent(
          message,
          this.messages,
          () => this.response.aiV5.model().at(-1)
        );
      }
    },
    aiV6: {
      ui: () => this.response.db().map(AIV6Adapter.toUIMessage)
    },
    aiV4: {
      ui: () => this.response.db().map(AIV4Adapter.toUIMessage),
      core: () => aiV4UIMessagesToAIV4CoreMessages(this.response.aiV4.ui())
    }
  };
  responsePersisted = {
    db: () => this.messages.filter((m) => this.newResponseMessagesPersisted.has(m)),
    aiV5: {
      model: () => aiV5UIMessagesToAIV5ModelMessages(this.responsePersisted.aiV5.ui(), this.messages),
      ui: () => this.responsePersisted.db().map(AIV5Adapter.toUIMessage)
    },
    aiV6: {
      ui: () => this.responsePersisted.db().map(AIV6Adapter.toUIMessage)
    },
    /* @deprecated use list.getPersisted.response.aiV4.ui() */
    ui: () => this.responsePersisted.db().map(AIV4Adapter.toUIMessage),
    aiV4: {
      ui: () => this.responsePersisted.db().map(AIV4Adapter.toUIMessage),
      core: () => aiV4UIMessagesToAIV4CoreMessages(this.responsePersisted.aiV4.ui())
    }
  };
  drainUnsavedMessages() {
    const messages = this.messages.filter((m) => this.newUserMessages.has(m) || this.newResponseMessages.has(m));
    this.newUserMessages.clear();
    this.newResponseMessages.clear();
    return messages;
  }
  getEarliestUnsavedMessageTimestamp() {
    const unsavedMessages = this.messages.filter((m) => this.newUserMessages.has(m) || this.newResponseMessages.has(m));
    if (unsavedMessages.length === 0) return void 0;
    return Math.min(...unsavedMessages.map((m) => new Date(m.createdAt).getTime()));
  }
  /**
   * Check if a message is a new user or response message that should be saved.
   * Checks by message ID to handle cases where the message object may be a copy.
   */
  isNewMessage(messageOrId) {
    return this.stateManager.isNewMessage(messageOrId);
  }
  /**
   * Replace a tool-invocation part matching the given toolCallId with the
   * provided result part. Walks backwards through messages to find the match.
   * If the message was already persisted (e.g. as a memory message), it is
   * moved to the response source so it will be re-saved.
   *
   * @returns true if the tool call was found and updated, false otherwise.
   */
  updateToolInvocation(inputPart) {
    if (!inputPart.toolInvocation?.toolCallId) {
      return false;
    }
    const toolCallId = inputPart.toolInvocation.toolCallId;
    for (let m = this.messages.length - 1; m >= 0; m--) {
      const msg = this.messages[m];
      if (msg.role !== "assistant" || !msg.content?.parts) continue;
      for (let i = 0; i < msg.content.parts.length; i++) {
        const part = msg.content.parts[i];
        if (part?.type === "tool-invocation" && part.toolInvocation?.toolCallId === toolCallId) {
          const originalPart = part;
          const inputPartWithMeta = inputPart;
          msg.content.parts[i] = {
            ...inputPart,
            toolInvocation: {
              ...inputPart.toolInvocation,
              args: part.toolInvocation.args
            },
            // Preserve providerExecuted from original call if not in result
            ...originalPart.providerExecuted !== void 0 && inputPartWithMeta.providerExecuted === void 0 ? { providerExecuted: originalPart.providerExecuted } : {},
            // Preserve providerMetadata from original call if not in result
            ...originalPart.providerMetadata !== void 0 && inputPartWithMeta.providerMetadata === void 0 ? { providerMetadata: originalPart.providerMetadata } : {}
          };
          if (!this.stateManager.isResponseMessage(msg)) {
            this.stateManager.removeMessage(msg);
            this.stateManager.addToSource(msg, "response");
          }
          return true;
        }
      }
    }
    this.logger?.warn(`updateToolInvocation: no matching tool call found for toolCallId=${toolCallId}`);
    return false;
  }
  /**
   * Append a `step-start` boundary to the last assistant message.
   * This marks the beginning of a new loop iteration so that
   * `convertToModelMessages` splits sequential tool-call turns into
   * separate message blocks instead of collapsing them into one.
   *
   * Respects sealed messages (post-observation) — if the last assistant
   * message is sealed, the step-start is not added.
   *
   * If the message was loaded from memory it is moved to the response
   * source so the updated content is re-saved.
   */
  stepStart() {
    const lastMsg = this.messages[this.messages.length - 1];
    if (!lastMsg || lastMsg.role !== "assistant" || !lastMsg.content?.parts) {
      return false;
    }
    if (MessageMerger.isSealed(lastMsg)) {
      return false;
    }
    const lastPart = lastMsg.content.parts[lastMsg.content.parts.length - 1];
    if (lastPart?.type === "step-start") {
      return false;
    }
    lastMsg.content.parts.push(stampPart({ type: "step-start" }));
    if (!this.stateManager.isResponseMessage(lastMsg)) {
      this.stateManager.removeMessage(lastMsg);
      this.stateManager.addToSource(lastMsg, "response");
    }
    return true;
  }
  getSystemMessages(tag) {
    if (tag) {
      return this.taggedSystemMessages[tag] || [];
    }
    return this.systemMessages;
  }
  /**
   * Get all system messages (both tagged and untagged)
   * @returns Array of all system messages
   */
  getAllSystemMessages() {
    return [...this.systemMessages, ...Object.values(this.taggedSystemMessages).flat()];
  }
  /**
   * Clear system messages, optionally for a specific tag
   * @param tag - If provided, only clears messages with this tag. Otherwise clears untagged messages.
   */
  clearSystemMessages(tag) {
    if (tag) {
      delete this.taggedSystemMessages[tag];
    } else {
      this.systemMessages = [];
    }
    return this;
  }
  /**
   * Replace all system messages with new ones
   * This clears both tagged and untagged system messages and replaces them with the provided array
   * @param messages - Array of system messages to set
   */
  replaceAllSystemMessages(messages) {
    this.systemMessages = [];
    this.taggedSystemMessages = {};
    for (const message of messages) {
      if (message.role === "system") {
        this.systemMessages.push(message);
      }
    }
    return this;
  }
  addSystem(messages, tag) {
    if (!messages) return this;
    for (const message of Array.isArray(messages) ? messages : [messages]) {
      this.addOneSystem(message, tag);
    }
    return this;
  }
  addOneSystem(message, tag) {
    const coreMessage = systemMessageToAIV4Core(message);
    if (coreMessage.role !== `system`) {
      throw new Error(
        `Expected role "system" but saw ${coreMessage.role} for message ${JSON.stringify(coreMessage, null, 2)}`
      );
    }
    if (tag && !this.isDuplicateSystem(coreMessage, tag)) {
      this.taggedSystemMessages[tag] ||= [];
      this.taggedSystemMessages[tag].push(coreMessage);
      if (this.isRecording) {
        this.recordedEvents.push({
          type: "addSystem",
          tag,
          message: coreMessage
        });
      }
    } else if (!tag && !this.isDuplicateSystem(coreMessage)) {
      this.systemMessages.push(coreMessage);
      if (this.isRecording) {
        this.recordedEvents.push({
          type: "addSystem",
          message: coreMessage
        });
      }
    }
  }
  isDuplicateSystem(message, tag) {
    if (tag) {
      if (!this.taggedSystemMessages[tag]) return false;
      return this.taggedSystemMessages[tag].some(
        (m) => CacheKeyGenerator.fromAIV4CoreMessageContent(m.content) === CacheKeyGenerator.fromAIV4CoreMessageContent(message.content)
      );
    }
    return this.systemMessages.some(
      (m) => CacheKeyGenerator.fromAIV4CoreMessageContent(m.content) === CacheKeyGenerator.fromAIV4CoreMessageContent(message.content)
    );
  }
  getMessageById(id) {
    return this.messages.find((m) => m.id === id);
  }
  shouldReplaceMessage(message) {
    if (!this.messages.length) return { exists: false };
    if (!(`id` in message) || !message?.id) {
      return { exists: false };
    }
    const existingMessage = this.getMessageById(message.id);
    if (!existingMessage) return { exists: false };
    return {
      exists: true,
      shouldReplace: !messagesAreEqual(existingMessage, message),
      id: existingMessage.id
    };
  }
  addOne(message, messageSource) {
    if ((!(`content` in message) || !message.content && // allow empty strings
    typeof message.content !== "string") && (!(`parts` in message) || !message.parts)) {
      throw new MastraError({
        id: "INVALID_MESSAGE_CONTENT",
        domain: "AGENT" /* AGENT */,
        category: "USER" /* USER */,
        text: `Message with role "${message.role}" must have either a 'content' property (string or array) or a 'parts' property (array) that is not empty, null, or undefined. Received message: ${JSON.stringify(message, null, 2)}`,
        details: {
          role: message.role,
          messageSource,
          hasContent: "content" in message,
          hasParts: "parts" in message
        }
      });
    }
    if (message.role === `system`) {
      if (messageSource === `memory`) return null;
      const isSupportedSystemFormat = TypeDetector.isAIV4CoreMessage(message) || TypeDetector.isAIV6CoreMessage(message) || TypeDetector.isAIV5CoreMessage(message) || TypeDetector.isMastraDBMessage(message);
      if (isSupportedSystemFormat) {
        return this.addSystem(message);
      }
      throw new MastraError({
        id: "INVALID_SYSTEM_MESSAGE_FORMAT",
        domain: "AGENT" /* AGENT */,
        category: "USER" /* USER */,
        text: `Invalid system message format. System messages must be CoreMessage format with 'role' and 'content' properties. The content should be a string or valid content array.`,
        details: {
          messageSource,
          receivedMessage: JSON.stringify(message, null, 2)
        }
      });
    }
    const messageV2 = inputToMastraDBMessage(message, messageSource, this.createAdapterContext());
    const { exists, shouldReplace, id } = this.shouldReplaceMessage(messageV2);
    const latestMessage = this.messages.at(-1);
    if (messageSource === `memory`) {
      for (const existingMessage of this.messages) {
        if (messagesAreEqual(existingMessage, messageV2)) {
          return;
        }
      }
    }
    const replacementTarget = exists && id ? this.messages.find((m) => m.id === id) : void 0;
    const hasSealedReplacementTarget = !!replacementTarget && MessageMerger.isSealed(replacementTarget);
    const isLatestFromMemory = latestMessage ? this.memoryMessages.has(latestMessage) : false;
    const shouldMerge = !hasSealedReplacementTarget && MessageMerger.shouldMerge(latestMessage, messageV2, messageSource, isLatestFromMemory, this._agentNetworkAppend);
    if (shouldMerge && latestMessage) {
      MessageMerger.merge(latestMessage, messageV2);
      this.pushMessageToSource(latestMessage, messageSource);
    } else {
      let existingIndex = -1;
      if (shouldReplace) {
        existingIndex = this.messages.findIndex((m) => m.id === id);
      }
      const existingMessage = existingIndex !== -1 && this.messages[existingIndex];
      if (shouldReplace && existingMessage) {
        if (MessageMerger.isSealed(existingMessage)) {
          const existingParts = existingMessage.content?.parts || [];
          let sealedPartCount = 0;
          for (let i = existingParts.length - 1; i >= 0; i--) {
            const part = existingParts[i];
            if (part?.metadata?.mastra?.sealedAt) {
              sealedPartCount = i + 1;
              break;
            }
          }
          if (sealedPartCount === 0) {
            sealedPartCount = existingParts.length;
          }
          const incomingParts = messageV2.content.parts;
          let newParts;
          if (incomingParts.length <= sealedPartCount) {
            if (messagesAreEqual(existingMessage, messageV2)) {
              return this;
            }
            newParts = incomingParts;
          } else {
            newParts = incomingParts.slice(sealedPartCount);
          }
          if (newParts.length > 0) {
            messageV2.id = this.generateMessageId?.({ idType: "message", source: "memory" }) ?? v4();
            messageV2.content.parts = newParts;
            if (messageV2.createdAt <= existingMessage.createdAt) {
              messageV2.createdAt = new Date(existingMessage.createdAt.getTime() + 1);
            }
            this.messages.push(messageV2);
          }
        } else {
          const isExistingFromMemory = this.memoryMessages.has(existingMessage);
          const shouldMergeIntoExisting = MessageMerger.shouldMerge(
            existingMessage,
            messageV2,
            messageSource,
            isExistingFromMemory,
            this._agentNetworkAppend
          );
          if (shouldMergeIntoExisting) {
            MessageMerger.merge(existingMessage, messageV2);
            this.pushMessageToSource(existingMessage, messageSource);
            this.messages.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
            return this;
          }
          this.messages[existingIndex] = messageV2;
        }
      } else if (!exists) {
        this.messages.push(messageV2);
      }
      this.pushMessageToSource(messageV2, messageSource);
    }
    this.messages.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    return this;
  }
  pushMessageToSource(messageV2, messageSource) {
    this.stateManager.addToSource(messageV2, messageSource);
  }
  lastCreatedAt;
  // this makes sure messages added in order will always have a date atleast 1ms apart.
  generateCreatedAt(messageSource, start) {
    const startDate = start instanceof Date ? start : typeof start === "string" || typeof start === "number" ? new Date(start) : void 0;
    if (startDate && !this.lastCreatedAt) {
      this.lastCreatedAt = startDate.getTime();
      return startDate;
    }
    if (startDate && messageSource === `memory`) {
      return startDate;
    }
    const now = /* @__PURE__ */ new Date();
    const nowTime = startDate?.getTime() || now.getTime();
    const lastTime = this.messages.reduce((p, m) => {
      if (m.createdAt.getTime() > p) return m.createdAt.getTime();
      return p;
    }, this.lastCreatedAt || 0);
    if (nowTime <= lastTime) {
      const newDate = new Date(lastTime + 1);
      this.lastCreatedAt = newDate.getTime();
      return newDate;
    }
    this.lastCreatedAt = nowTime;
    return now;
  }
  newMessageId(role) {
    if (this.generateMessageId) {
      return this.generateMessageId({
        idType: "message",
        source: "agent",
        threadId: this.memoryInfo?.threadId,
        resourceId: this.memoryInfo?.resourceId,
        role
      });
    }
    return v4();
  }
  createAdapterContext() {
    return {
      memoryInfo: this.memoryInfo,
      newMessageId: () => this.newMessageId(),
      generateCreatedAt: (messageSource, start) => this.generateCreatedAt(messageSource, start),
      dbMessages: this.messages
    };
  }
};

// src/storage/base.ts
var EDITOR_DOMAINS = [
  "agents",
  "promptBlocks",
  "scorerDefinitions",
  "mcpClients",
  "mcpServers",
  "workspaces",
  "skills"
];
function normalizePerPage(perPageInput, defaultValue) {
  if (perPageInput === false) {
    return Number.MAX_SAFE_INTEGER;
  } else if (perPageInput === 0) {
    return 0;
  } else if (typeof perPageInput === "number" && perPageInput > 0) {
    return perPageInput;
  } else if (typeof perPageInput === "number" && perPageInput < 0) {
    throw new Error("perPage must be >= 0");
  }
  return defaultValue;
}
function calculatePagination(page, perPageInput, normalizedPerPage) {
  return {
    offset: perPageInput === false ? 0 : page * normalizedPerPage,
    perPage: perPageInput === false ? false : normalizedPerPage
  };
}
var MastraCompositeStore = class extends MastraBase {
  hasInitialized = null;
  shouldCacheInit = true;
  id;
  stores;
  /**
   * When true, automatic initialization (table creation/migrations) is disabled.
   */
  disableInit = false;
  constructor(config) {
    const name = config.name ?? "MastraCompositeStore";
    if (!config.id || typeof config.id !== "string" || config.id.trim() === "") {
      throw new Error(`${name}: id must be provided and cannot be empty.`);
    }
    super({
      component: "STORAGE",
      name
    });
    this.id = config.id;
    this.disableInit = config.disableInit ?? false;
    if (config.default || config.editor || config.domains) {
      const defaultStores = config.default?.stores;
      const editorStores = config.editor?.stores;
      const domainOverrides = config.domains ?? {};
      const hasDefaultDomains = defaultStores && Object.values(defaultStores).some((v) => v !== void 0);
      const hasEditorDomains = editorStores && Object.values(editorStores).some((v) => v !== void 0);
      const hasOverrideDomains = Object.values(domainOverrides).some((v) => v !== void 0);
      if (!hasDefaultDomains && !hasEditorDomains && !hasOverrideDomains) {
        throw new Error(
          "MastraCompositeStore requires at least one storage source. Provide a default storage, an editor storage, or domain overrides."
        );
      }
      const editorDomainSet = new Set(EDITOR_DOMAINS);
      const resolve3 = (key) => {
        if (domainOverrides[key] !== void 0) return domainOverrides[key];
        if (editorDomainSet.has(key) && editorStores?.[key] !== void 0) return editorStores[key];
        return defaultStores?.[key];
      };
      this.stores = {
        memory: resolve3("memory"),
        workflows: resolve3("workflows"),
        scores: resolve3("scores"),
        observability: resolve3("observability"),
        agents: resolve3("agents"),
        datasets: resolve3("datasets"),
        experiments: resolve3("experiments"),
        promptBlocks: resolve3("promptBlocks"),
        scorerDefinitions: resolve3("scorerDefinitions"),
        mcpClients: resolve3("mcpClients"),
        mcpServers: resolve3("mcpServers"),
        workspaces: resolve3("workspaces"),
        skills: resolve3("skills"),
        blobs: resolve3("blobs")
      };
    }
  }
  /**
   * Get a domain-specific storage interface.
   *
   * @param storeName - The name of the domain to access ('memory', 'workflows', 'scores', 'observability', 'agents')
   * @returns The domain storage interface, or undefined if not available
   *
   * @example
   * ```typescript
   * const memory = await storage.getStore('memory');
   * if (memory) {
   *   await memory.saveThread({ thread });
   * }
   * ```
   */
  async getStore(storeName) {
    return this.stores?.[storeName];
  }
  /**
   * Initialize all domain stores.
   * This creates necessary tables, indexes, and performs any required migrations.
   */
  async init() {
    if (this.shouldCacheInit && await this.hasInitialized) {
      return;
    }
    const initTasks = [];
    if (this.stores?.memory) {
      initTasks.push(this.stores.memory.init());
    }
    if (this.stores?.workflows) {
      initTasks.push(this.stores.workflows.init());
    }
    if (this.stores?.scores) {
      initTasks.push(this.stores.scores.init());
    }
    if (this.stores?.observability) {
      initTasks.push(this.stores.observability.init());
    }
    if (this.stores?.agents) {
      initTasks.push(this.stores.agents.init());
    }
    if (this.stores?.datasets) {
      initTasks.push(this.stores.datasets.init());
    }
    if (this.stores?.experiments) {
      initTasks.push(this.stores.experiments.init());
    }
    if (this.stores?.promptBlocks) {
      initTasks.push(this.stores.promptBlocks.init());
    }
    if (this.stores?.scorerDefinitions) {
      initTasks.push(this.stores.scorerDefinitions.init());
    }
    if (this.stores?.mcpClients) {
      initTasks.push(this.stores.mcpClients.init());
    }
    if (this.stores?.mcpServers) {
      initTasks.push(this.stores.mcpServers.init());
    }
    if (this.stores?.workspaces) {
      initTasks.push(this.stores.workspaces.init());
    }
    if (this.stores?.skills) {
      initTasks.push(this.stores.skills.init());
    }
    if (this.stores?.blobs) {
      initTasks.push(this.stores.blobs.init());
    }
    this.hasInitialized = Promise.all(initTasks).then(() => true);
    await this.hasInitialized;
  }
};

// src/storage/domains/base.ts
var StorageDomain = class extends MastraBase {
  /**
   * Initialize the storage domain.
   * This should create any necessary tables/collections.
   * Default implementation is a no-op - override in adapters that need initialization.
   */
  async init() {
  }
};

// src/storage/domains/observability/base.ts
var ObservabilityStorage = class extends StorageDomain {
  constructor() {
    super({
      component: "STORAGE",
      name: "OBSERVABILITY"
    });
  }
  async dangerouslyClearAll() {
  }
  /**
   * Provides hints for tracing strategy selection by the DefaultExporter.
   * Storage adapters can override this to specify their preferred and supported strategies.
   */
  get observabilityStrategy() {
    return {
      preferred: "batch-with-updates",
      // Default for most SQL stores
      supported: ["realtime", "batch-with-updates", "insert-only"]
    };
  }
  /**
   * Provides hints for tracing strategy selection by the DefaultExporter.
   * Storage adapters can override this to specify their preferred and supported strategies.
   * @deprecated Use {@link observabilityStrategy} instead.
   * @see {@link observabilityStrategy} for the replacement property.
   */
  get tracingStrategy() {
    return this.observabilityStrategy;
  }
  /**
   * Creates a single Span record in the storage provider.
   */
  async createSpan(_args) {
    throw new MastraError({
      id: "OBSERVABILITY_CREATE_SPAN_NOT_IMPLEMENTED",
      domain: "MASTRA_OBSERVABILITY" /* MASTRA_OBSERVABILITY */,
      category: "SYSTEM" /* SYSTEM */,
      text: "This storage provider does not support creating spans"
    });
  }
  /**
   * Updates a single Span with partial data. Primarily used for realtime trace creation.
   *
   * @deprecated This method only works with stores that support span updates,
   * It will be removed in the future. Instead try to add all data to a span before
   * ending it.
   */
  async updateSpan(_args) {
    throw new MastraError({
      id: "OBSERVABILITY_STORAGE_UPDATE_SPAN_NOT_IMPLEMENTED",
      domain: "MASTRA_OBSERVABILITY" /* MASTRA_OBSERVABILITY */,
      category: "SYSTEM" /* SYSTEM */,
      text: "This storage provider does not support updating spans"
    });
  }
  /**
   * Retrieves a single span.
   */
  async getSpan(_args) {
    throw new MastraError({
      id: "OBSERVABILITY_STORAGE_GET_SPAN_NOT_IMPLEMENTED",
      domain: "MASTRA_OBSERVABILITY" /* MASTRA_OBSERVABILITY */,
      category: "SYSTEM" /* SYSTEM */,
      text: "This storage provider does not support getting spans"
    });
  }
  /**
   * Retrieves a single root span.
   */
  async getRootSpan(_args) {
    throw new MastraError({
      id: "OBSERVABILITY_STORAGE_GET_ROOT_SPAN_NOT_IMPLEMENTED",
      domain: "MASTRA_OBSERVABILITY" /* MASTRA_OBSERVABILITY */,
      category: "SYSTEM" /* SYSTEM */,
      text: "This storage provider does not support getting root spans"
    });
  }
  /**
   * Retrieves a single trace with all its associated spans.
   */
  async getTrace(_args) {
    throw new MastraError({
      id: "OBSERVABILITY_STORAGE_GET_TRACE_NOT_IMPLEMENTED",
      domain: "MASTRA_OBSERVABILITY" /* MASTRA_OBSERVABILITY */,
      category: "SYSTEM" /* SYSTEM */,
      text: "This storage provider does not support getting traces"
    });
  }
  /**
   * Retrieves a list of traces with optional filtering.
   */
  async listTraces(_args) {
    throw new MastraError({
      id: "OBSERVABILITY_STORAGE_LIST_TRACES_NOT_IMPLEMENTED",
      domain: "MASTRA_OBSERVABILITY" /* MASTRA_OBSERVABILITY */,
      category: "SYSTEM" /* SYSTEM */,
      text: "This storage provider does not support listing traces"
    });
  }
  /**
   * Creates multiple Spans in a single batch.
   */
  async batchCreateSpans(_args) {
    throw new MastraError({
      id: "OBSERVABILITY_STORAGE_BATCH_CREATE_SPAN_NOT_IMPLEMENTED",
      domain: "MASTRA_OBSERVABILITY" /* MASTRA_OBSERVABILITY */,
      category: "SYSTEM" /* SYSTEM */,
      text: "This storage provider does not support batch creating spans"
    });
  }
  /**
   * Updates multiple Spans in a single batch.
   */
  async batchUpdateSpans(_args) {
    throw new MastraError({
      id: "OBSERVABILITY_STORAGE_BATCH_UPDATE_SPANS_NOT_IMPLEMENTED",
      domain: "MASTRA_OBSERVABILITY" /* MASTRA_OBSERVABILITY */,
      category: "SYSTEM" /* SYSTEM */,
      text: "This storage provider does not support batch updating spans"
    });
  }
  /**
   * Deletes multiple traces and all their associated spans in a single batch operation.
   */
  async batchDeleteTraces(_args) {
    throw new MastraError({
      id: "OBSERVABILITY_STORAGE_BATCH_DELETE_TRACES_NOT_IMPLEMENTED",
      domain: "MASTRA_OBSERVABILITY" /* MASTRA_OBSERVABILITY */,
      category: "SYSTEM" /* SYSTEM */,
      text: "This storage provider does not support batch deleting traces"
    });
  }
  // ============================================================================
  // Logs
  // ============================================================================
  /**
   * Creates multiple log records in a single batch.
   */
  async batchCreateLogs(_args) {
    throw new MastraError({
      id: "OBSERVABILITY_STORAGE_BATCH_CREATE_LOGS_NOT_IMPLEMENTED",
      domain: "MASTRA_OBSERVABILITY" /* MASTRA_OBSERVABILITY */,
      category: "SYSTEM" /* SYSTEM */,
      text: "This storage provider does not support batch creating logs"
    });
  }
  /**
   * Retrieves a list of logs with optional filtering.
   */
  async listLogs(_args) {
    throw new MastraError({
      id: "OBSERVABILITY_STORAGE_LIST_LOGS_NOT_IMPLEMENTED",
      domain: "MASTRA_OBSERVABILITY" /* MASTRA_OBSERVABILITY */,
      category: "SYSTEM" /* SYSTEM */,
      text: "This storage provider does not support listing logs"
    });
  }
  // ============================================================================
  // Metrics
  // ============================================================================
  /**
   * Creates multiple metric observations in a single batch.
   */
  async batchCreateMetrics(_args) {
    throw new MastraError({
      id: "OBSERVABILITY_STORAGE_BATCH_CREATE_METRICS_NOT_IMPLEMENTED",
      domain: "MASTRA_OBSERVABILITY" /* MASTRA_OBSERVABILITY */,
      category: "SYSTEM" /* SYSTEM */,
      text: "This storage provider does not support batch creating metrics"
    });
  }
  async listMetrics(_args) {
    throw new MastraError({
      id: "OBSERVABILITY_STORAGE_LIST_METRICS_NOT_IMPLEMENTED",
      domain: "MASTRA_OBSERVABILITY" /* MASTRA_OBSERVABILITY */,
      category: "SYSTEM" /* SYSTEM */,
      text: "This storage provider does not support listing metrics"
    });
  }
  async getMetricAggregate(_args) {
    throw new MastraError({
      id: "OBSERVABILITY_STORAGE_GET_METRIC_AGGREGATE_NOT_IMPLEMENTED",
      domain: "MASTRA_OBSERVABILITY" /* MASTRA_OBSERVABILITY */,
      category: "SYSTEM" /* SYSTEM */,
      text: "This storage provider does not support metric aggregation"
    });
  }
  async getMetricBreakdown(_args) {
    throw new MastraError({
      id: "OBSERVABILITY_STORAGE_GET_METRIC_BREAKDOWN_NOT_IMPLEMENTED",
      domain: "MASTRA_OBSERVABILITY" /* MASTRA_OBSERVABILITY */,
      category: "SYSTEM" /* SYSTEM */,
      text: "This storage provider does not support metric breakdown"
    });
  }
  async getMetricTimeSeries(_args) {
    throw new MastraError({
      id: "OBSERVABILITY_STORAGE_GET_METRIC_TIME_SERIES_NOT_IMPLEMENTED",
      domain: "MASTRA_OBSERVABILITY" /* MASTRA_OBSERVABILITY */,
      category: "SYSTEM" /* SYSTEM */,
      text: "This storage provider does not support metric time series"
    });
  }
  async getMetricPercentiles(_args) {
    throw new MastraError({
      id: "OBSERVABILITY_STORAGE_GET_METRIC_PERCENTILES_NOT_IMPLEMENTED",
      domain: "MASTRA_OBSERVABILITY" /* MASTRA_OBSERVABILITY */,
      category: "SYSTEM" /* SYSTEM */,
      text: "This storage provider does not support metric percentiles"
    });
  }
  // ============================================================================
  // Discovery / Metadata Methods
  // ============================================================================
  async getMetricNames(_args) {
    throw new MastraError({
      id: "OBSERVABILITY_STORAGE_GET_METRIC_NAMES_NOT_IMPLEMENTED",
      domain: "MASTRA_OBSERVABILITY" /* MASTRA_OBSERVABILITY */,
      category: "SYSTEM" /* SYSTEM */,
      text: "This storage provider does not support metric name discovery"
    });
  }
  async getMetricLabelKeys(_args) {
    throw new MastraError({
      id: "OBSERVABILITY_STORAGE_GET_METRIC_LABEL_KEYS_NOT_IMPLEMENTED",
      domain: "MASTRA_OBSERVABILITY" /* MASTRA_OBSERVABILITY */,
      category: "SYSTEM" /* SYSTEM */,
      text: "This storage provider does not support metric label key discovery"
    });
  }
  async getMetricLabelValues(_args) {
    throw new MastraError({
      id: "OBSERVABILITY_STORAGE_GET_LABEL_VALUES_NOT_IMPLEMENTED",
      domain: "MASTRA_OBSERVABILITY" /* MASTRA_OBSERVABILITY */,
      category: "SYSTEM" /* SYSTEM */,
      text: "This storage provider does not support label value discovery"
    });
  }
  async getEntityTypes(_args) {
    throw new MastraError({
      id: "OBSERVABILITY_STORAGE_GET_ENTITY_TYPES_NOT_IMPLEMENTED",
      domain: "MASTRA_OBSERVABILITY" /* MASTRA_OBSERVABILITY */,
      category: "SYSTEM" /* SYSTEM */,
      text: "This storage provider does not support entity type discovery"
    });
  }
  async getEntityNames(_args) {
    throw new MastraError({
      id: "OBSERVABILITY_STORAGE_GET_ENTITY_NAMES_NOT_IMPLEMENTED",
      domain: "MASTRA_OBSERVABILITY" /* MASTRA_OBSERVABILITY */,
      category: "SYSTEM" /* SYSTEM */,
      text: "This storage provider does not support entity name discovery"
    });
  }
  async getServiceNames(_args) {
    throw new MastraError({
      id: "OBSERVABILITY_STORAGE_GET_SERVICE_NAMES_NOT_IMPLEMENTED",
      domain: "MASTRA_OBSERVABILITY" /* MASTRA_OBSERVABILITY */,
      category: "SYSTEM" /* SYSTEM */,
      text: "This storage provider does not support service name discovery"
    });
  }
  async getEnvironments(_args) {
    throw new MastraError({
      id: "OBSERVABILITY_STORAGE_GET_ENVIRONMENTS_NOT_IMPLEMENTED",
      domain: "MASTRA_OBSERVABILITY" /* MASTRA_OBSERVABILITY */,
      category: "SYSTEM" /* SYSTEM */,
      text: "This storage provider does not support environment discovery"
    });
  }
  async getTags(_args) {
    throw new MastraError({
      id: "OBSERVABILITY_STORAGE_GET_TAGS_NOT_IMPLEMENTED",
      domain: "MASTRA_OBSERVABILITY" /* MASTRA_OBSERVABILITY */,
      category: "SYSTEM" /* SYSTEM */,
      text: "This storage provider does not support tag discovery"
    });
  }
  // ============================================================================
  // Scores
  // ============================================================================
  /**
   * Creates a single score record.
   */
  async createScore(_args) {
    throw new MastraError({
      id: "OBSERVABILITY_STORAGE_CREATE_SCORE_NOT_IMPLEMENTED",
      domain: "MASTRA_OBSERVABILITY" /* MASTRA_OBSERVABILITY */,
      category: "SYSTEM" /* SYSTEM */,
      text: "This storage provider does not support creating scores"
    });
  }
  /**
   * Creates multiple score observations in a single batch.
   */
  async batchCreateScores(_args) {
    throw new MastraError({
      id: "OBSERVABILITY_STORAGE_BATCH_CREATE_SCORES_NOT_IMPLEMENTED",
      domain: "MASTRA_OBSERVABILITY" /* MASTRA_OBSERVABILITY */,
      category: "SYSTEM" /* SYSTEM */,
      text: "This storage provider does not support batch creating scores"
    });
  }
  /**
   * Retrieves a list of scores with optional filtering.
   */
  async listScores(_args) {
    throw new MastraError({
      id: "OBSERVABILITY_STORAGE_LIST_SCORES_NOT_IMPLEMENTED",
      domain: "MASTRA_OBSERVABILITY" /* MASTRA_OBSERVABILITY */,
      category: "SYSTEM" /* SYSTEM */,
      text: "This storage provider does not support listing scores"
    });
  }
  async getScoreAggregate(_args) {
    throw new MastraError({
      id: "OBSERVABILITY_STORAGE_GET_SCORE_AGGREGATE_NOT_IMPLEMENTED",
      domain: "MASTRA_OBSERVABILITY" /* MASTRA_OBSERVABILITY */,
      category: "SYSTEM" /* SYSTEM */,
      text: "This storage provider does not support score aggregation"
    });
  }
  async getScoreBreakdown(_args) {
    throw new MastraError({
      id: "OBSERVABILITY_STORAGE_GET_SCORE_BREAKDOWN_NOT_IMPLEMENTED",
      domain: "MASTRA_OBSERVABILITY" /* MASTRA_OBSERVABILITY */,
      category: "SYSTEM" /* SYSTEM */,
      text: "This storage provider does not support score breakdown"
    });
  }
  async getScoreTimeSeries(_args) {
    throw new MastraError({
      id: "OBSERVABILITY_STORAGE_GET_SCORE_TIME_SERIES_NOT_IMPLEMENTED",
      domain: "MASTRA_OBSERVABILITY" /* MASTRA_OBSERVABILITY */,
      category: "SYSTEM" /* SYSTEM */,
      text: "This storage provider does not support score time series"
    });
  }
  async getScorePercentiles(_args) {
    throw new MastraError({
      id: "OBSERVABILITY_STORAGE_GET_SCORE_PERCENTILES_NOT_IMPLEMENTED",
      domain: "MASTRA_OBSERVABILITY" /* MASTRA_OBSERVABILITY */,
      category: "SYSTEM" /* SYSTEM */,
      text: "This storage provider does not support score percentiles"
    });
  }
  // ============================================================================
  // Feedback
  // ============================================================================
  /**
   * Creates a single feedback record.
   */
  async createFeedback(_args) {
    throw new MastraError({
      id: "OBSERVABILITY_STORAGE_CREATE_FEEDBACK_NOT_IMPLEMENTED",
      domain: "MASTRA_OBSERVABILITY" /* MASTRA_OBSERVABILITY */,
      category: "SYSTEM" /* SYSTEM */,
      text: "This storage provider does not support creating feedback"
    });
  }
  /**
   * Creates multiple feedback observations in a single batch.
   */
  async batchCreateFeedback(_args) {
    throw new MastraError({
      id: "OBSERVABILITY_STORAGE_BATCH_CREATE_FEEDBACK_NOT_IMPLEMENTED",
      domain: "MASTRA_OBSERVABILITY" /* MASTRA_OBSERVABILITY */,
      category: "SYSTEM" /* SYSTEM */,
      text: "This storage provider does not support batch creating feedback"
    });
  }
  /**
   * Retrieves a list of feedback with optional filtering.
   */
  async listFeedback(_args) {
    throw new MastraError({
      id: "OBSERVABILITY_STORAGE_LIST_FEEDBACK_NOT_IMPLEMENTED",
      domain: "MASTRA_OBSERVABILITY" /* MASTRA_OBSERVABILITY */,
      category: "SYSTEM" /* SYSTEM */,
      text: "This storage provider does not support listing feedback"
    });
  }
  async getFeedbackAggregate(_args) {
    throw new MastraError({
      id: "OBSERVABILITY_STORAGE_GET_FEEDBACK_AGGREGATE_NOT_IMPLEMENTED",
      domain: "MASTRA_OBSERVABILITY" /* MASTRA_OBSERVABILITY */,
      category: "SYSTEM" /* SYSTEM */,
      text: "This storage provider does not support feedback aggregation"
    });
  }
  async getFeedbackBreakdown(_args) {
    throw new MastraError({
      id: "OBSERVABILITY_STORAGE_GET_FEEDBACK_BREAKDOWN_NOT_IMPLEMENTED",
      domain: "MASTRA_OBSERVABILITY" /* MASTRA_OBSERVABILITY */,
      category: "SYSTEM" /* SYSTEM */,
      text: "This storage provider does not support feedback breakdown"
    });
  }
  async getFeedbackTimeSeries(_args) {
    throw new MastraError({
      id: "OBSERVABILITY_STORAGE_GET_FEEDBACK_TIME_SERIES_NOT_IMPLEMENTED",
      domain: "MASTRA_OBSERVABILITY" /* MASTRA_OBSERVABILITY */,
      category: "SYSTEM" /* SYSTEM */,
      text: "This storage provider does not support feedback time series"
    });
  }
  async getFeedbackPercentiles(_args) {
    throw new MastraError({
      id: "OBSERVABILITY_STORAGE_GET_FEEDBACK_PERCENTILES_NOT_IMPLEMENTED",
      domain: "MASTRA_OBSERVABILITY" /* MASTRA_OBSERVABILITY */,
      category: "SYSTEM" /* SYSTEM */,
      text: "This storage provider does not support feedback percentiles"
    });
  }
};

// src/storage/utils.ts
function safelyParseJSON(input) {
  if (input && typeof input === "object") return input;
  if (input == null) return {};
  if (typeof input === "string") {
    try {
      return JSON.parse(input);
    } catch {
      return input;
    }
  }
  return {};
}
function ensureDate(date) {
  if (!date) return void 0;
  return date instanceof Date ? date : new Date(date);
}
function filterByDateRange(items, getCreatedAt, dateRange) {
  if (!dateRange) return items;
  let result = items;
  if (dateRange.start) {
    const startTime = ensureDate(dateRange.start).getTime();
    result = result.filter((item) => {
      const itemTime = getCreatedAt(item).getTime();
      return dateRange.startExclusive ? itemTime > startTime : itemTime >= startTime;
    });
  }
  if (dateRange.end) {
    const endTime = ensureDate(dateRange.end).getTime();
    result = result.filter((item) => {
      const itemTime = getCreatedAt(item).getTime();
      return dateRange.endExclusive ? itemTime < endTime : itemTime <= endTime;
    });
  }
  return result;
}
function jsonValueEquals(a, b) {
  if (a === void 0 || b === void 0) {
    return a === b;
  }
  if (a === null || b === null) {
    return a === b;
  }
  if (typeof a !== typeof b) {
    return false;
  }
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }
  if (a instanceof Date || b instanceof Date) {
    return false;
  }
  if (typeof a === "object") {
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      return a.every((val, i) => jsonValueEquals(val, b[i]));
    }
    if (Array.isArray(a) || Array.isArray(b)) {
      return false;
    }
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) return false;
    return aKeys.every(
      (key) => jsonValueEquals(a[key], b[key])
    );
  }
  return a === b;
}

// src/storage/domains/observability/inmemory.ts
var ObservabilityInMemory = class extends ObservabilityStorage {
  db;
  constructor({ db }) {
    super();
    this.db = db;
  }
  async dangerouslyClearAll() {
    this.db.traces.clear();
    this.db.metricRecords.length = 0;
    this.db.logRecords.length = 0;
    this.db.scoreRecords.length = 0;
    this.db.feedbackRecords.length = 0;
  }
  async createSpan(args) {
    const { span } = args;
    this.validateCreateSpan(span);
    const now = /* @__PURE__ */ new Date();
    const record = {
      ...span,
      createdAt: now,
      updatedAt: now
    };
    this.upsertSpanToTrace(record);
  }
  async batchCreateSpans(args) {
    const now = /* @__PURE__ */ new Date();
    for (const span of args.records) {
      this.validateCreateSpan(span);
      const record = {
        ...span,
        createdAt: now,
        updatedAt: now
      };
      this.upsertSpanToTrace(record);
    }
  }
  validateCreateSpan(record) {
    if (!record.spanId) {
      throw new MastraError({
        id: "OBSERVABILITY_SPAN_ID_REQUIRED",
        domain: "MASTRA_OBSERVABILITY" /* MASTRA_OBSERVABILITY */,
        category: "SYSTEM" /* SYSTEM */,
        text: "Span ID is required for creating a span"
      });
    }
    if (!record.traceId) {
      throw new MastraError({
        id: "OBSERVABILITY_TRACE_ID_REQUIRED",
        domain: "MASTRA_OBSERVABILITY" /* MASTRA_OBSERVABILITY */,
        category: "SYSTEM" /* SYSTEM */,
        text: "Trace ID is required for creating a span"
      });
    }
  }
  /**
   * Inserts or updates a span in the trace and recomputes trace-level properties
   */
  upsertSpanToTrace(span) {
    const { traceId, spanId } = span;
    let traceEntry = this.db.traces.get(traceId);
    if (!traceEntry) {
      traceEntry = {
        spans: {},
        rootSpan: null,
        status: "running" /* RUNNING */,
        hasChildError: false
      };
      this.db.traces.set(traceId, traceEntry);
    }
    traceEntry.spans[spanId] = span;
    if (span.parentSpanId == null) {
      traceEntry.rootSpan = span;
    }
    this.recomputeTraceProperties(traceEntry);
  }
  /**
   * Recomputes derived trace properties from all spans
   */
  recomputeTraceProperties(traceEntry) {
    const spans = Object.values(traceEntry.spans);
    if (spans.length === 0) return;
    traceEntry.hasChildError = spans.some((s) => s.error != null);
    const rootSpan = traceEntry.rootSpan;
    if (rootSpan) {
      if (rootSpan.error != null) {
        traceEntry.status = "error" /* ERROR */;
      } else if (rootSpan.endedAt == null) {
        traceEntry.status = "running" /* RUNNING */;
      } else {
        traceEntry.status = "success" /* SUCCESS */;
      }
    } else {
      traceEntry.status = "running" /* RUNNING */;
    }
  }
  async getSpan(args) {
    const { traceId, spanId } = args;
    const traceEntry = this.db.traces.get(traceId);
    if (!traceEntry) {
      return null;
    }
    const span = traceEntry.spans[spanId];
    if (!span) {
      return null;
    }
    return { span };
  }
  async getRootSpan(args) {
    const { traceId } = args;
    const traceEntry = this.db.traces.get(traceId);
    if (!traceEntry || !traceEntry.rootSpan) {
      return null;
    }
    return { span: traceEntry.rootSpan };
  }
  async getTrace(args) {
    const { traceId } = args;
    const traceEntry = this.db.traces.get(traceId);
    if (!traceEntry) {
      return null;
    }
    const spans = Object.values(traceEntry.spans);
    if (spans.length === 0) {
      return null;
    }
    spans.sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime());
    return {
      traceId,
      spans
    };
  }
  async listTraces(args) {
    const { filters, pagination, orderBy } = listTracesArgsSchema.parse(args);
    const matchingRootSpans = [];
    for (const [, traceEntry] of this.db.traces) {
      if (!traceEntry.rootSpan) continue;
      if (this.traceMatchesFilters(traceEntry, filters)) {
        matchingRootSpans.push(traceEntry.rootSpan);
      }
    }
    const { field: sortField, direction: sortDirection } = orderBy;
    matchingRootSpans.sort((a, b) => {
      if (sortField === "endedAt") {
        const aVal = a.endedAt;
        const bVal = b.endedAt;
        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return sortDirection === "DESC" ? -1 : 1;
        if (bVal == null) return sortDirection === "DESC" ? 1 : -1;
        const diff = aVal.getTime() - bVal.getTime();
        return sortDirection === "DESC" ? -diff : diff;
      } else {
        const diff = a.startedAt.getTime() - b.startedAt.getTime();
        return sortDirection === "DESC" ? -diff : diff;
      }
    });
    const total = matchingRootSpans.length;
    const { page, perPage } = pagination;
    const start = page * perPage;
    const end = start + perPage;
    const paged = matchingRootSpans.slice(start, end);
    return {
      spans: toTraceSpans(paged),
      pagination: { total, page, perPage, hasMore: end < total }
    };
  }
  /**
   * Check if a trace matches all provided filters
   */
  traceMatchesFilters(traceEntry, filters) {
    if (!filters) return true;
    const rootSpan = traceEntry.rootSpan;
    if (!rootSpan) return false;
    if (filters.startedAt) {
      if (filters.startedAt.start && rootSpan.startedAt < filters.startedAt.start) {
        return false;
      }
      if (filters.startedAt.end && rootSpan.startedAt > filters.startedAt.end) {
        return false;
      }
    }
    if (filters.endedAt) {
      if (rootSpan.endedAt == null) {
        return false;
      }
      if (filters.endedAt.start && rootSpan.endedAt < filters.endedAt.start) {
        return false;
      }
      if (filters.endedAt.end && rootSpan.endedAt > filters.endedAt.end) {
        return false;
      }
    }
    if (filters.spanType !== void 0 && rootSpan.spanType !== filters.spanType) {
      return false;
    }
    if (filters.entityType !== void 0 && rootSpan.entityType !== filters.entityType) {
      return false;
    }
    if (filters.entityId !== void 0 && rootSpan.entityId !== filters.entityId) {
      return false;
    }
    if (filters.entityName !== void 0 && rootSpan.entityName !== filters.entityName) {
      return false;
    }
    if (filters.entityVersionId !== void 0 && rootSpan.entityVersionId !== filters.entityVersionId) {
      return false;
    }
    if (filters.experimentId !== void 0 && rootSpan.experimentId !== filters.experimentId) {
      return false;
    }
    if (filters.userId !== void 0 && rootSpan.userId !== filters.userId) {
      return false;
    }
    if (filters.organizationId !== void 0 && rootSpan.organizationId !== filters.organizationId) {
      return false;
    }
    if (filters.resourceId !== void 0 && rootSpan.resourceId !== filters.resourceId) {
      return false;
    }
    if (filters.runId !== void 0 && rootSpan.runId !== filters.runId) {
      return false;
    }
    if (filters.sessionId !== void 0 && rootSpan.sessionId !== filters.sessionId) {
      return false;
    }
    if (filters.threadId !== void 0 && rootSpan.threadId !== filters.threadId) {
      return false;
    }
    if (filters.requestId !== void 0 && rootSpan.requestId !== filters.requestId) {
      return false;
    }
    if (filters.environment !== void 0 && rootSpan.environment !== filters.environment) {
      return false;
    }
    if (filters.source !== void 0 && rootSpan.source !== filters.source) {
      return false;
    }
    if (filters.serviceName !== void 0 && rootSpan.serviceName !== filters.serviceName) {
      return false;
    }
    if (filters.scope != null && rootSpan.scope != null) {
      for (const [key, value] of Object.entries(filters.scope)) {
        if (!jsonValueEquals(rootSpan.scope[key], value)) {
          return false;
        }
      }
    } else if (filters.scope != null && rootSpan.scope == null) {
      return false;
    }
    if (filters.metadata != null && rootSpan.metadata != null) {
      for (const [key, value] of Object.entries(filters.metadata)) {
        if (!jsonValueEquals(rootSpan.metadata[key], value)) {
          return false;
        }
      }
    } else if (filters.metadata != null && rootSpan.metadata == null) {
      return false;
    }
    if (filters.tags != null && filters.tags.length > 0) {
      if (rootSpan.tags == null) {
        return false;
      }
      for (const tag of filters.tags) {
        if (!rootSpan.tags.includes(tag)) {
          return false;
        }
      }
    }
    if (filters.status !== void 0 && traceEntry.status !== filters.status) {
      return false;
    }
    if (filters.hasChildError !== void 0 && traceEntry.hasChildError !== filters.hasChildError) {
      return false;
    }
    return true;
  }
  async updateSpan(args) {
    const { traceId, spanId, updates } = args;
    const traceEntry = this.db.traces.get(traceId);
    if (!traceEntry) {
      throw new MastraError({
        id: "OBSERVABILITY_UPDATE_SPAN_NOT_FOUND",
        domain: "MASTRA_OBSERVABILITY" /* MASTRA_OBSERVABILITY */,
        category: "SYSTEM" /* SYSTEM */,
        text: "Trace not found for span update"
      });
    }
    const span = traceEntry.spans[spanId];
    if (!span) {
      throw new MastraError({
        id: "OBSERVABILITY_UPDATE_SPAN_NOT_FOUND",
        domain: "MASTRA_OBSERVABILITY" /* MASTRA_OBSERVABILITY */,
        category: "SYSTEM" /* SYSTEM */,
        text: "Span not found for update"
      });
    }
    const updatedSpan = {
      ...span,
      ...updates,
      updatedAt: /* @__PURE__ */ new Date()
    };
    traceEntry.spans[spanId] = updatedSpan;
    if (updatedSpan.parentSpanId == null) {
      traceEntry.rootSpan = updatedSpan;
    }
    this.recomputeTraceProperties(traceEntry);
  }
  async batchUpdateSpans(args) {
    for (const record of args.records) {
      await this.updateSpan(record);
    }
  }
  async batchDeleteTraces(args) {
    for (const traceId of args.traceIds) {
      this.db.traces.delete(traceId);
    }
  }
  // ============================================================================
  // Metrics
  // ============================================================================
  async batchCreateMetrics(args) {
    for (const metric of args.metrics) {
      this.db.metricRecords.push(metric);
    }
  }
  async listMetrics(args) {
    const { filters, pagination, orderBy } = listMetricsArgsSchema.parse(args);
    let matching = this.filterMetrics(filters);
    const dir = orderBy.direction === "DESC" ? -1 : 1;
    matching.sort((a, b) => dir * (a.timestamp.getTime() - b.timestamp.getTime()));
    const total = matching.length;
    const page = Number(pagination.page);
    const perPage = Number(pagination.perPage);
    const start = page * perPage;
    return {
      metrics: matching.slice(start, start + perPage),
      pagination: { total, page, perPage, hasMore: start + perPage < total }
    };
  }
  filterMetrics(filters) {
    if (!filters) return [...this.db.metricRecords];
    return this.db.metricRecords.filter((m) => {
      if (filters.timestamp) {
        const ts = filters.timestamp;
        if (ts.start && (ts.startExclusive ? m.timestamp <= ts.start : m.timestamp < ts.start)) return false;
        if (ts.end && (ts.endExclusive ? m.timestamp >= ts.end : m.timestamp > ts.end)) return false;
      }
      if (filters.name != null) {
        if (!filters.name.includes(m.name)) return false;
      }
      if (filters.traceId !== void 0 && m.traceId !== filters.traceId) return false;
      if (filters.spanId !== void 0 && m.spanId !== filters.spanId) return false;
      if (filters.provider !== void 0 && m.provider !== filters.provider) return false;
      if (filters.model !== void 0 && m.model !== filters.model) return false;
      if (filters.costUnit !== void 0 && m.costUnit !== filters.costUnit) return false;
      if (filters.entityType !== void 0 && m.entityType !== filters.entityType) return false;
      if (filters.entityName !== void 0 && m.entityName !== filters.entityName) return false;
      if (filters.entityVersionId !== void 0 && m.entityVersionId !== filters.entityVersionId) return false;
      if (filters.parentEntityVersionId !== void 0 && m.parentEntityVersionId !== filters.parentEntityVersionId)
        return false;
      if (filters.rootEntityVersionId !== void 0 && m.rootEntityVersionId !== filters.rootEntityVersionId)
        return false;
      if (filters.userId !== void 0 && m.userId !== filters.userId) return false;
      if (filters.organizationId !== void 0 && m.organizationId !== filters.organizationId) return false;
      if (filters.resourceId !== void 0 && m.resourceId !== filters.resourceId) return false;
      if (filters.runId !== void 0 && m.runId !== filters.runId) return false;
      if (filters.sessionId !== void 0 && m.sessionId !== filters.sessionId) return false;
      if (filters.threadId !== void 0 && m.threadId !== filters.threadId) return false;
      if (filters.requestId !== void 0 && m.requestId !== filters.requestId) return false;
      if (filters.experimentId !== void 0 && m.experimentId !== filters.experimentId) return false;
      if (filters.serviceName !== void 0 && m.serviceName !== filters.serviceName) return false;
      if (filters.environment !== void 0 && m.environment !== filters.environment) return false;
      const metricExecutionSource = m.executionSource ?? m.source ?? null;
      if (filters.executionSource !== void 0 && metricExecutionSource !== filters.executionSource) return false;
      if (filters.source !== void 0 && metricExecutionSource !== filters.source) return false;
      if (filters.parentEntityType !== void 0 && m.parentEntityType !== filters.parentEntityType) return false;
      if (filters.parentEntityName !== void 0 && m.parentEntityName !== filters.parentEntityName) return false;
      if (filters.rootEntityType !== void 0 && m.rootEntityType !== filters.rootEntityType) return false;
      if (filters.rootEntityName !== void 0 && m.rootEntityName !== filters.rootEntityName) return false;
      if (filters.tags != null && Array.isArray(filters.tags) && filters.tags.length > 0) {
        if (m.tags == null) return false;
        for (const tag of filters.tags) {
          if (!m.tags.includes(tag)) return false;
        }
      }
      if (filters.labels) {
        const labelFilters = filters.labels;
        for (const [k, v] of Object.entries(labelFilters)) {
          if (m.labels[k] !== v) return false;
        }
      }
      return true;
    });
  }
  aggregate(values, type, timestamps) {
    if (values.length === 0) return null;
    switch (type) {
      case "sum":
        return values.reduce((a, b) => a + b, 0);
      case "avg":
        return values.reduce((a, b) => a + b, 0) / values.length;
      case "min":
        return Math.min(...values);
      case "max":
        return Math.max(...values);
      case "count":
        return values.length;
      case "last": {
        if (!timestamps || timestamps.length !== values.length) {
          return values[values.length - 1];
        }
        let latestIndex = 0;
        let latestTimestamp = timestamps[0];
        for (let i = 1; i < timestamps.length; i++) {
          const timestamp = timestamps[i];
          if (timestamp >= latestTimestamp) {
            latestTimestamp = timestamp;
            latestIndex = i;
          }
        }
        return values[latestIndex];
      }
      default:
        return values.reduce((a, b) => a + b, 0);
    }
  }
  interpolatePercentile(sortedValues, percentile) {
    if (sortedValues.length === 0) return 0;
    const position = percentile * (sortedValues.length - 1);
    const lowerIndex = Math.floor(position);
    const upperIndex = Math.ceil(position);
    const lowerValue = sortedValues[lowerIndex];
    const upperValue = sortedValues[upperIndex];
    if (lowerIndex === upperIndex) {
      return lowerValue;
    }
    return lowerValue + (upperValue - lowerValue) * (position - lowerIndex);
  }
  /**
   * Cost is returned alongside value-based OLAP results so callers can derive
   * token and monetary views from the same filtered scan.
   */
  summarizeCost(records) {
    const costValues = records.map((record) => record.estimatedCost).filter((value) => typeof value === "number" && Number.isFinite(value));
    const costUnits = new Set(
      records.map((record) => record.costUnit).filter((unit) => typeof unit === "string")
    );
    return {
      estimatedCost: costValues.length > 0 ? costValues.reduce((sum, value) => sum + value, 0) : null,
      costUnit: costUnits.size === 1 ? Array.from(costUnits)[0] : null
    };
  }
  async getMetricAggregate(args) {
    const names = Array.isArray(args.name) ? args.name : [args.name];
    const filtered = this.filterMetrics(args.filters).filter((m) => names.includes(m.name));
    const value = this.aggregate(
      filtered.map((m) => m.value),
      args.aggregation
    );
    const costSummary = this.summarizeCost(filtered);
    if (args.comparePeriod && args.filters?.timestamp) {
      const ts = args.filters.timestamp;
      if (ts.start && ts.end) {
        const duration = ts.end.getTime() - ts.start.getTime();
        let prevStart;
        let prevEnd;
        switch (args.comparePeriod) {
          case "previous_period":
            prevStart = new Date(ts.start.getTime() - duration);
            prevEnd = new Date(ts.end.getTime() - duration);
            break;
          case "previous_day":
            prevStart = new Date(ts.start.getTime() - 864e5);
            prevEnd = new Date(ts.end.getTime() - 864e5);
            break;
          case "previous_week":
            prevStart = new Date(ts.start.getTime() - 6048e5);
            prevEnd = new Date(ts.end.getTime() - 6048e5);
            break;
        }
        const prevFiltered = this.filterMetrics({
          ...args.filters,
          timestamp: { ...ts, start: prevStart, end: prevEnd }
        }).filter((m) => names.includes(m.name));
        const previousValue = this.aggregate(
          prevFiltered.map((m) => m.value),
          args.aggregation
        );
        const previousCostSummary = this.summarizeCost(prevFiltered);
        let changePercent = null;
        if (previousValue !== null && previousValue !== 0 && value !== null) {
          changePercent = (value - previousValue) / Math.abs(previousValue) * 100;
        }
        let costChangePercent = null;
        if (previousCostSummary.estimatedCost !== null && previousCostSummary.estimatedCost !== 0 && costSummary.estimatedCost !== null) {
          costChangePercent = (costSummary.estimatedCost - previousCostSummary.estimatedCost) / Math.abs(previousCostSummary.estimatedCost) * 100;
        }
        return {
          value,
          estimatedCost: costSummary.estimatedCost,
          costUnit: costSummary.costUnit,
          previousValue,
          previousEstimatedCost: previousCostSummary.estimatedCost,
          changePercent,
          costChangePercent
        };
      }
    }
    return { value, estimatedCost: costSummary.estimatedCost, costUnit: costSummary.costUnit };
  }
  async getMetricBreakdown(args) {
    const names = Array.isArray(args.name) ? args.name : [args.name];
    const filtered = this.filterMetrics(args.filters).filter((m) => names.includes(m.name));
    const groupMap = /* @__PURE__ */ new Map();
    for (const m of filtered) {
      const dims = {};
      for (const col of args.groupBy) {
        dims[col] = m[col] ?? m.labels[col] ?? null;
      }
      const key = JSON.stringify(dims);
      if (!groupMap.has(key)) groupMap.set(key, []);
      groupMap.get(key).push(m);
    }
    const groups = Array.from(groupMap.entries()).map(([key, records]) => {
      const costSummary = this.summarizeCost(records);
      return {
        dimensions: JSON.parse(key),
        value: this.aggregate(
          records.map((record) => record.value),
          args.aggregation
        ) ?? 0,
        estimatedCost: costSummary.estimatedCost,
        costUnit: costSummary.costUnit
      };
    });
    groups.sort((a, b) => b.value - a.value);
    return { groups };
  }
  async getMetricTimeSeries(args) {
    const names = Array.isArray(args.name) ? args.name : [args.name];
    const filtered = this.filterMetrics(args.filters).filter((m) => names.includes(m.name));
    const intervalMs = this.intervalToMs(args.interval);
    if (args.groupBy && args.groupBy.length > 0) {
      const seriesMap = /* @__PURE__ */ new Map();
      for (const m of filtered) {
        const key = args.groupBy.map((col) => String(m[col] ?? m.labels[col] ?? "")).join("|");
        if (!seriesMap.has(key)) seriesMap.set(key, /* @__PURE__ */ new Map());
        const bucket = Math.floor(m.timestamp.getTime() / intervalMs) * intervalMs;
        const bucketMap2 = seriesMap.get(key);
        if (!bucketMap2.has(bucket)) bucketMap2.set(bucket, []);
        bucketMap2.get(bucket).push(m);
      }
      return {
        series: Array.from(seriesMap.entries()).map(([name, bucketMap2]) => {
          const seriesRecords = Array.from(bucketMap2.values()).flat();
          const costSummary2 = this.summarizeCost(seriesRecords);
          return {
            name,
            costUnit: costSummary2.costUnit,
            points: Array.from(bucketMap2.entries()).sort(([a], [b]) => a - b).map(([ts, records]) => ({
              timestamp: new Date(ts),
              value: this.aggregate(
                records.map((record) => record.value),
                args.aggregation
              ) ?? 0,
              estimatedCost: this.summarizeCost(records).estimatedCost
            }))
          };
        })
      };
    }
    const bucketMap = /* @__PURE__ */ new Map();
    for (const m of filtered) {
      const bucket = Math.floor(m.timestamp.getTime() / intervalMs) * intervalMs;
      if (!bucketMap.has(bucket)) bucketMap.set(bucket, []);
      bucketMap.get(bucket).push(m);
    }
    const metricName = Array.isArray(args.name) ? args.name.join(",") : args.name;
    const costSummary = this.summarizeCost(filtered);
    return {
      series: [
        {
          name: metricName,
          costUnit: costSummary.costUnit,
          points: Array.from(bucketMap.entries()).sort(([a], [b]) => a - b).map(([ts, records]) => ({
            timestamp: new Date(ts),
            value: this.aggregate(
              records.map((record) => record.value),
              args.aggregation
            ) ?? 0,
            estimatedCost: this.summarizeCost(records).estimatedCost
          }))
        }
      ]
    };
  }
  async getMetricPercentiles(args) {
    const filtered = this.filterMetrics(args.filters).filter((m) => m.name === args.name);
    const intervalMs = this.intervalToMs(args.interval);
    const bucketMap = /* @__PURE__ */ new Map();
    for (const m of filtered) {
      const bucket = Math.floor(m.timestamp.getTime() / intervalMs) * intervalMs;
      if (!bucketMap.has(bucket)) bucketMap.set(bucket, []);
      bucketMap.get(bucket).push(m.value);
    }
    const sortedBuckets = Array.from(bucketMap.entries()).sort(([a], [b]) => a - b);
    return {
      series: args.percentiles.map((p) => ({
        percentile: p,
        points: sortedBuckets.map(([ts, values]) => {
          const sorted = [...values].sort((a, b) => a - b);
          const idx = Math.min(Math.floor(p * sorted.length), sorted.length - 1);
          return { timestamp: new Date(ts), value: sorted[idx] ?? 0 };
        })
      }))
    };
  }
  intervalToMs(interval) {
    switch (interval) {
      case "1m":
        return 6e4;
      case "5m":
        return 3e5;
      case "15m":
        return 9e5;
      case "1h":
        return 36e5;
      case "1d":
        return 864e5;
      default:
        return 36e5;
    }
  }
  // ============================================================================
  // Discovery / Metadata Methods
  // ============================================================================
  async getMetricNames(args) {
    const nameSet = /* @__PURE__ */ new Set();
    for (const m of this.db.metricRecords) {
      if (args.prefix && !m.name.startsWith(args.prefix)) continue;
      nameSet.add(m.name);
    }
    let names = Array.from(nameSet).sort();
    if (args.limit) names = names.slice(0, args.limit);
    return { names };
  }
  async getMetricLabelKeys(args) {
    const keySet = /* @__PURE__ */ new Set();
    for (const m of this.db.metricRecords) {
      if (m.name !== args.metricName) continue;
      for (const key of Object.keys(m.labels)) {
        keySet.add(key);
      }
    }
    return { keys: Array.from(keySet).sort() };
  }
  async getMetricLabelValues(args) {
    const valueSet = /* @__PURE__ */ new Set();
    for (const m of this.db.metricRecords) {
      if (m.name !== args.metricName) continue;
      const val = m.labels[args.labelKey];
      if (val === void 0) continue;
      if (args.prefix && !val.startsWith(args.prefix)) continue;
      valueSet.add(val);
    }
    let values = Array.from(valueSet).sort();
    if (args.limit) values = values.slice(0, args.limit);
    return { values };
  }
  async getEntityTypes(_args) {
    const validTypes = new Set(Object.values(EntityType));
    const typeSet = /* @__PURE__ */ new Set();
    for (const [, traceEntry] of this.db.traces) {
      for (const span of Object.values(traceEntry.spans)) {
        if (span.entityType && validTypes.has(span.entityType)) {
          typeSet.add(span.entityType);
        }
      }
    }
    return { entityTypes: Array.from(typeSet).sort() };
  }
  async getEntityNames(args) {
    const nameSet = /* @__PURE__ */ new Set();
    for (const [, traceEntry] of this.db.traces) {
      for (const span of Object.values(traceEntry.spans)) {
        if (!span.entityName) continue;
        if (args.entityType && span.entityType !== args.entityType) continue;
        nameSet.add(span.entityName);
      }
    }
    return { names: Array.from(nameSet).sort() };
  }
  async getServiceNames(_args) {
    const nameSet = /* @__PURE__ */ new Set();
    for (const [, traceEntry] of this.db.traces) {
      for (const span of Object.values(traceEntry.spans)) {
        if (span.serviceName) nameSet.add(span.serviceName);
      }
    }
    return { serviceNames: Array.from(nameSet).sort() };
  }
  async getEnvironments(_args) {
    const envSet = /* @__PURE__ */ new Set();
    for (const [, traceEntry] of this.db.traces) {
      for (const span of Object.values(traceEntry.spans)) {
        if (span.environment) envSet.add(span.environment);
      }
    }
    return { environments: Array.from(envSet).sort() };
  }
  async getTags(args) {
    const tagSet = /* @__PURE__ */ new Set();
    for (const [, traceEntry] of this.db.traces) {
      for (const span of Object.values(traceEntry.spans)) {
        if (!span.tags) continue;
        if (args.entityType && span.entityType !== args.entityType) continue;
        for (const tag of span.tags) {
          tagSet.add(tag);
        }
      }
    }
    return { tags: Array.from(tagSet).sort() };
  }
  // ============================================================================
  // Logs
  // ============================================================================
  async batchCreateLogs(args) {
    for (const log of args.logs) {
      this.db.logRecords.push(log);
    }
  }
  async listLogs(args) {
    const { filters, pagination, orderBy } = listLogsArgsSchema.parse(args);
    let matching = this.db.logRecords.filter((log) => this.logMatchesFilters(log, filters));
    const dir = orderBy.direction === "DESC" ? -1 : 1;
    matching.sort((a, b) => dir * (a.timestamp.getTime() - b.timestamp.getTime()));
    const total = matching.length;
    const page = Number(pagination.page);
    const perPage = Number(pagination.perPage);
    const start = page * perPage;
    return {
      logs: matching.slice(start, start + perPage),
      pagination: { total, page, perPage, hasMore: start + perPage < total }
    };
  }
  logMatchesFilters(log, filters) {
    if (!filters) return true;
    if (filters.timestamp) {
      if (filters.timestamp.start && (filters.timestamp.startExclusive ? log.timestamp <= filters.timestamp.start : log.timestamp < filters.timestamp.start)) {
        return false;
      }
      if (filters.timestamp.end && (filters.timestamp.endExclusive ? log.timestamp >= filters.timestamp.end : log.timestamp > filters.timestamp.end)) {
        return false;
      }
    }
    if (filters.level !== void 0) {
      const levels = Array.isArray(filters.level) ? filters.level : [filters.level];
      if (!levels.includes(log.level)) return false;
    }
    if (filters.traceId !== void 0 && log.traceId !== filters.traceId) return false;
    if (filters.spanId !== void 0 && log.spanId !== filters.spanId) return false;
    if (filters.entityType !== void 0 && log.entityType !== filters.entityType) return false;
    if (filters.entityName !== void 0 && log.entityName !== filters.entityName) return false;
    if (filters.entityVersionId !== void 0 && log.entityVersionId !== filters.entityVersionId) return false;
    if (filters.parentEntityVersionId !== void 0 && log.parentEntityVersionId !== filters.parentEntityVersionId)
      return false;
    if (filters.rootEntityVersionId !== void 0 && log.rootEntityVersionId !== filters.rootEntityVersionId)
      return false;
    if (filters.userId !== void 0 && log.userId !== filters.userId) return false;
    if (filters.organizationId !== void 0 && log.organizationId !== filters.organizationId) return false;
    if (filters.resourceId !== void 0 && log.resourceId !== filters.resourceId) return false;
    if (filters.runId !== void 0 && log.runId !== filters.runId) return false;
    if (filters.sessionId !== void 0 && log.sessionId !== filters.sessionId) return false;
    if (filters.threadId !== void 0 && log.threadId !== filters.threadId) return false;
    if (filters.requestId !== void 0 && log.requestId !== filters.requestId) return false;
    if (filters.parentEntityType !== void 0 && log.parentEntityType !== filters.parentEntityType) return false;
    if (filters.parentEntityName !== void 0 && log.parentEntityName !== filters.parentEntityName) return false;
    if (filters.rootEntityType !== void 0 && log.rootEntityType !== filters.rootEntityType) return false;
    if (filters.rootEntityName !== void 0 && log.rootEntityName !== filters.rootEntityName) return false;
    if (filters.serviceName !== void 0 && log.serviceName !== filters.serviceName) return false;
    if (filters.environment !== void 0 && log.environment !== filters.environment) return false;
    const logExecutionSource = log.executionSource ?? log.source ?? null;
    if (filters.executionSource !== void 0 && logExecutionSource !== filters.executionSource) return false;
    if (filters.source !== void 0 && logExecutionSource !== filters.source) return false;
    if (filters.experimentId !== void 0 && log.experimentId !== filters.experimentId) return false;
    if (filters.tags != null && filters.tags.length > 0) {
      if (log.tags == null) return false;
      for (const tag of filters.tags) {
        if (!log.tags.includes(tag)) return false;
      }
    }
    return true;
  }
  // ============================================================================
  // Scores
  // ============================================================================
  async createScore(args) {
    const scoreSource = args.score.scoreSource ?? args.score.source ?? null;
    this.db.scoreRecords.push({
      ...args.score,
      scoreSource,
      source: scoreSource
    });
  }
  async batchCreateScores(args) {
    for (const score of args.scores) {
      const scoreSource = score.scoreSource ?? score.source ?? null;
      this.db.scoreRecords.push({
        ...score,
        scoreSource,
        source: scoreSource
      });
    }
  }
  async listScores(args) {
    const { filters, pagination, orderBy } = listScoresArgsSchema.parse(args);
    let matching = this.db.scoreRecords.filter((score) => this.scoreMatchesFilters(score, filters));
    const dir = orderBy.direction === "DESC" ? -1 : 1;
    if (orderBy.field === "score") {
      matching.sort((a, b) => dir * (a.score - b.score));
    } else {
      matching.sort((a, b) => dir * (a.timestamp.getTime() - b.timestamp.getTime()));
    }
    const total = matching.length;
    const page = Number(pagination.page);
    const perPage = Number(pagination.perPage);
    const start = page * perPage;
    return {
      scores: matching.slice(start, start + perPage),
      pagination: { total, page, perPage, hasMore: start + perPage < total }
    };
  }
  scoreMatchesFilters(score, filters) {
    if (!filters) return true;
    if (filters.timestamp) {
      if (filters.timestamp.start && score.timestamp < filters.timestamp.start) return false;
      if (filters.timestamp.end && score.timestamp > filters.timestamp.end) return false;
    }
    if (filters.traceId !== void 0 && score.traceId !== filters.traceId) return false;
    if (filters.spanId !== void 0 && score.spanId !== filters.spanId) return false;
    if (filters.entityType !== void 0 && score.entityType !== filters.entityType) return false;
    if (filters.entityName !== void 0 && score.entityName !== filters.entityName) return false;
    if (filters.entityVersionId !== void 0 && score.entityVersionId !== filters.entityVersionId) return false;
    if (filters.parentEntityVersionId !== void 0 && score.parentEntityVersionId !== filters.parentEntityVersionId)
      return false;
    if (filters.rootEntityVersionId !== void 0 && score.rootEntityVersionId !== filters.rootEntityVersionId)
      return false;
    if (filters.userId !== void 0 && score.userId !== filters.userId) return false;
    if (filters.organizationId !== void 0 && score.organizationId !== filters.organizationId) return false;
    if (filters.resourceId !== void 0 && score.resourceId !== filters.resourceId) return false;
    if (filters.runId !== void 0 && score.runId !== filters.runId) return false;
    if (filters.sessionId !== void 0 && score.sessionId !== filters.sessionId) return false;
    if (filters.threadId !== void 0 && score.threadId !== filters.threadId) return false;
    if (filters.requestId !== void 0 && score.requestId !== filters.requestId) return false;
    if (filters.parentEntityType !== void 0 && score.parentEntityType !== filters.parentEntityType) return false;
    if (filters.parentEntityName !== void 0 && score.parentEntityName !== filters.parentEntityName) return false;
    if (filters.rootEntityType !== void 0 && score.rootEntityType !== filters.rootEntityType) return false;
    if (filters.rootEntityName !== void 0 && score.rootEntityName !== filters.rootEntityName) return false;
    if (filters.serviceName !== void 0 && score.serviceName !== filters.serviceName) return false;
    if (filters.environment !== void 0 && score.environment !== filters.environment) return false;
    if (filters.executionSource !== void 0 && score.executionSource !== filters.executionSource) return false;
    if (filters.scorerId !== void 0) {
      const names = Array.isArray(filters.scorerId) ? filters.scorerId : [filters.scorerId];
      if (!names.includes(score.scorerId)) return false;
    }
    const scoreSource = score.scoreSource ?? score.source ?? null;
    if (filters.scoreSource !== void 0 && scoreSource !== filters.scoreSource) return false;
    if (filters.source !== void 0 && scoreSource !== filters.source) return false;
    if (filters.experimentId !== void 0 && score.experimentId !== filters.experimentId) return false;
    if (filters.tags != null && filters.tags.length > 0) {
      if (score.tags == null) return false;
      for (const tag of filters.tags) {
        if (!score.tags.includes(tag)) return false;
      }
    }
    return true;
  }
  async getScoreAggregate(args) {
    const filtered = this.db.scoreRecords.filter((score) => this.scoreMatchesFilters(score, args.filters)).filter((score) => score.scorerId === args.scorerId).filter((score) => args.scoreSource ? (score.scoreSource ?? score.source ?? null) === args.scoreSource : true);
    const value = this.aggregate(
      filtered.map((score) => score.score),
      args.aggregation,
      filtered.map((score) => score.timestamp.getTime())
    );
    if (args.comparePeriod && args.filters?.timestamp) {
      const previousRange = this.getComparisonDateRange(args.comparePeriod, args.filters.timestamp);
      if (previousRange) {
        const previousFiltered = this.db.scoreRecords.filter(
          (score) => this.scoreMatchesFilters(score, {
            ...args.filters ?? {},
            timestamp: previousRange
          })
        ).filter((score) => score.scorerId === args.scorerId).filter(
          (score) => args.scoreSource ? (score.scoreSource ?? score.source ?? null) === args.scoreSource : true
        );
        const previousValue = this.aggregate(
          previousFiltered.map((score) => score.score),
          args.aggregation,
          previousFiltered.map((score) => score.timestamp.getTime())
        );
        let changePercent = null;
        if (previousValue !== null && previousValue !== 0 && value !== null) {
          changePercent = (value - previousValue) / Math.abs(previousValue) * 100;
        }
        return { value, previousValue, changePercent };
      }
    }
    return { value };
  }
  async getScoreBreakdown(args) {
    const filtered = this.db.scoreRecords.filter((score) => this.scoreMatchesFilters(score, args.filters)).filter((score) => score.scorerId === args.scorerId).filter((score) => args.scoreSource ? (score.scoreSource ?? score.source ?? null) === args.scoreSource : true);
    const groupMap = /* @__PURE__ */ new Map();
    for (const score of filtered) {
      const dims = {};
      for (const col of args.groupBy) {
        const value = score[col];
        dims[col] = value === null || value === void 0 ? null : String(value);
      }
      const key = JSON.stringify(dims);
      if (!groupMap.has(key)) groupMap.set(key, []);
      groupMap.get(key).push(score);
    }
    const groups = Array.from(groupMap.entries()).map(([key, records]) => ({
      dimensions: JSON.parse(key),
      value: this.aggregate(
        records.map((record) => record.score),
        args.aggregation,
        records.map((record) => record.timestamp.getTime())
      ) ?? 0
    }));
    groups.sort((a, b) => b.value - a.value);
    return { groups };
  }
  async getScoreTimeSeries(args) {
    const filtered = this.db.scoreRecords.filter((score) => this.scoreMatchesFilters(score, args.filters)).filter((score) => score.scorerId === args.scorerId).filter((score) => args.scoreSource ? (score.scoreSource ?? score.source ?? null) === args.scoreSource : true);
    const intervalMs = this.intervalToMs(args.interval);
    if (args.groupBy && args.groupBy.length > 0) {
      const seriesMap = /* @__PURE__ */ new Map();
      const seriesNames = /* @__PURE__ */ new Map();
      for (const score of filtered) {
        const values = args.groupBy.map((col) => score[col] ?? "");
        const key = JSON.stringify(values);
        if (!seriesMap.has(key)) seriesMap.set(key, /* @__PURE__ */ new Map());
        if (!seriesNames.has(key)) {
          seriesNames.set(
            key,
            values.map((value) => value === null || value === void 0 ? "" : String(value)).join("|")
          );
        }
        const bucket = Math.floor(score.timestamp.getTime() / intervalMs) * intervalMs;
        const bucketMap2 = seriesMap.get(key);
        if (!bucketMap2.has(bucket)) bucketMap2.set(bucket, []);
        bucketMap2.get(bucket).push(score);
      }
      return {
        series: Array.from(seriesMap.entries()).map(([key, bucketMap2]) => ({
          name: seriesNames.get(key),
          points: Array.from(bucketMap2.entries()).sort(([a], [b]) => a - b).map(([ts, records]) => ({
            timestamp: new Date(ts),
            value: this.aggregate(
              records.map((record) => record.score),
              args.aggregation,
              records.map((record) => record.timestamp.getTime())
            ) ?? 0
          }))
        }))
      };
    }
    const bucketMap = /* @__PURE__ */ new Map();
    for (const score of filtered) {
      const bucket = Math.floor(score.timestamp.getTime() / intervalMs) * intervalMs;
      if (!bucketMap.has(bucket)) bucketMap.set(bucket, []);
      bucketMap.get(bucket).push(score);
    }
    return {
      series: [
        {
          name: args.scoreSource ? `${args.scorerId}|${args.scoreSource}` : args.scorerId,
          points: Array.from(bucketMap.entries()).sort(([a], [b]) => a - b).map(([ts, records]) => ({
            timestamp: new Date(ts),
            value: this.aggregate(
              records.map((record) => record.score),
              args.aggregation,
              records.map((record) => record.timestamp.getTime())
            ) ?? 0
          }))
        }
      ]
    };
  }
  async getScorePercentiles(args) {
    const filtered = this.db.scoreRecords.filter((score) => this.scoreMatchesFilters(score, args.filters)).filter((score) => score.scorerId === args.scorerId).filter((score) => args.scoreSource ? (score.scoreSource ?? score.source ?? null) === args.scoreSource : true);
    const intervalMs = this.intervalToMs(args.interval);
    const bucketMap = /* @__PURE__ */ new Map();
    for (const score of filtered) {
      const bucket = Math.floor(score.timestamp.getTime() / intervalMs) * intervalMs;
      if (!bucketMap.has(bucket)) bucketMap.set(bucket, []);
      bucketMap.get(bucket).push(score.score);
    }
    const sortedBuckets = Array.from(bucketMap.entries()).sort(([a], [b]) => a - b);
    return {
      series: args.percentiles.map((percentile) => ({
        percentile,
        points: sortedBuckets.map(([ts, values]) => {
          const sorted = [...values].sort((a, b) => a - b);
          return { timestamp: new Date(ts), value: this.interpolatePercentile(sorted, percentile) };
        })
      }))
    };
  }
  getNumericFeedbackValue(value) {
    if (typeof value === "number") {
      return Number.isFinite(value) ? value : null;
    }
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed.length === 0) return null;
      const numeric = Number(trimmed);
      return Number.isFinite(numeric) ? numeric : null;
    }
    return null;
  }
  getComparisonDateRange(comparePeriod, timestamp) {
    if (!timestamp.start || !timestamp.end) return null;
    const duration = timestamp.end.getTime() - timestamp.start.getTime();
    switch (comparePeriod) {
      case "previous_period":
        return {
          start: new Date(timestamp.start.getTime() - duration),
          end: new Date(timestamp.end.getTime() - duration),
          startExclusive: timestamp.startExclusive,
          endExclusive: timestamp.endExclusive
        };
      case "previous_day":
        return {
          start: new Date(timestamp.start.getTime() - 864e5),
          end: new Date(timestamp.end.getTime() - 864e5),
          startExclusive: timestamp.startExclusive,
          endExclusive: timestamp.endExclusive
        };
      case "previous_week":
        return {
          start: new Date(timestamp.start.getTime() - 6048e5),
          end: new Date(timestamp.end.getTime() - 6048e5),
          startExclusive: timestamp.startExclusive,
          endExclusive: timestamp.endExclusive
        };
    }
  }
  // ============================================================================
  // Feedback
  // ============================================================================
  async createFeedback(args) {
    this.db.feedbackRecords.push({
      ...args.feedback,
      feedbackSource: args.feedback.feedbackSource ?? args.feedback.source ?? "",
      source: args.feedback.feedbackSource ?? args.feedback.source ?? "",
      feedbackUserId: args.feedback.feedbackUserId ?? args.feedback.userId ?? (typeof args.feedback.metadata?.userId === "string" ? args.feedback.metadata.userId : null)
    });
  }
  async batchCreateFeedback(args) {
    for (const fb of args.feedbacks) {
      this.db.feedbackRecords.push({
        ...fb,
        feedbackSource: fb.feedbackSource ?? fb.source ?? "",
        source: fb.feedbackSource ?? fb.source ?? "",
        feedbackUserId: fb.feedbackUserId ?? fb.userId ?? (typeof fb.metadata?.userId === "string" ? fb.metadata.userId : null)
      });
    }
  }
  async listFeedback(args) {
    const { filters, pagination, orderBy } = listFeedbackArgsSchema.parse(args);
    let matching = this.db.feedbackRecords.filter((fb) => this.feedbackMatchesFilters(fb, filters));
    const dir = orderBy.direction === "DESC" ? -1 : 1;
    matching.sort((a, b) => dir * (a.timestamp.getTime() - b.timestamp.getTime()));
    const total = matching.length;
    const page = Number(pagination.page);
    const perPage = Number(pagination.perPage);
    const start = page * perPage;
    return {
      feedback: matching.slice(start, start + perPage),
      pagination: { total, page, perPage, hasMore: start + perPage < total }
    };
  }
  async getFeedbackAggregate(args) {
    const filtered = this.db.feedbackRecords.filter((feedback) => this.feedbackMatchesFilters(feedback, args.filters)).filter((feedback) => feedback.feedbackType === args.feedbackType).filter(
      (feedback) => args.feedbackSource ? (feedback.feedbackSource ?? feedback.source ?? "") === args.feedbackSource : true
    );
    const numericEntries = filtered.flatMap((feedback) => {
      const numericValue = this.getNumericFeedbackValue(feedback.value);
      return numericValue === null ? [] : [{ numericValue, timestamp: feedback.timestamp.getTime() }];
    });
    const value = this.aggregate(
      numericEntries.map((entry) => entry.numericValue),
      args.aggregation,
      numericEntries.map((entry) => entry.timestamp)
    );
    if (args.comparePeriod && args.filters?.timestamp) {
      const previousRange = this.getComparisonDateRange(args.comparePeriod, args.filters.timestamp);
      if (previousRange) {
        const previousNumericEntries = this.db.feedbackRecords.filter(
          (feedback) => this.feedbackMatchesFilters(feedback, {
            ...args.filters ?? {},
            timestamp: previousRange
          })
        ).filter((feedback) => feedback.feedbackType === args.feedbackType).filter(
          (feedback) => args.feedbackSource ? (feedback.feedbackSource ?? feedback.source ?? "") === args.feedbackSource : true
        ).flatMap((feedback) => {
          const numericValue = this.getNumericFeedbackValue(feedback.value);
          return numericValue === null ? [] : [{ numericValue, timestamp: feedback.timestamp.getTime() }];
        });
        const previousValue = this.aggregate(
          previousNumericEntries.map((entry) => entry.numericValue),
          args.aggregation,
          previousNumericEntries.map((entry) => entry.timestamp)
        );
        let changePercent = null;
        if (previousValue !== null && previousValue !== 0 && value !== null) {
          changePercent = (value - previousValue) / Math.abs(previousValue) * 100;
        }
        return { value, previousValue, changePercent };
      }
    }
    return { value };
  }
  async getFeedbackBreakdown(args) {
    const filtered = this.db.feedbackRecords.filter((feedback) => this.feedbackMatchesFilters(feedback, args.filters)).filter((feedback) => feedback.feedbackType === args.feedbackType).filter(
      (feedback) => args.feedbackSource ? (feedback.feedbackSource ?? feedback.source ?? "") === args.feedbackSource : true
    ).filter((feedback) => this.getNumericFeedbackValue(feedback.value) !== null);
    const groupMap = /* @__PURE__ */ new Map();
    for (const feedback of filtered) {
      const dims = {};
      for (const col of args.groupBy) {
        const rawValue = feedback[col];
        dims[col] = rawValue === null || rawValue === void 0 ? null : String(rawValue);
      }
      const key = JSON.stringify(dims);
      if (!groupMap.has(key)) groupMap.set(key, []);
      groupMap.get(key).push(feedback);
    }
    const groups = Array.from(groupMap.entries()).map(([key, records]) => ({
      dimensions: JSON.parse(key),
      value: (() => {
        const numericEntries = records.flatMap((record) => {
          const numericValue = this.getNumericFeedbackValue(record.value);
          return numericValue === null ? [] : [{ numericValue, timestamp: record.timestamp.getTime() }];
        });
        return this.aggregate(
          numericEntries.map((entry) => entry.numericValue),
          args.aggregation,
          numericEntries.map((entry) => entry.timestamp)
        ) ?? 0;
      })()
    }));
    groups.sort((a, b) => b.value - a.value);
    return { groups };
  }
  async getFeedbackTimeSeries(args) {
    const filtered = this.db.feedbackRecords.filter((feedback) => this.feedbackMatchesFilters(feedback, args.filters)).filter((feedback) => feedback.feedbackType === args.feedbackType).filter(
      (feedback) => args.feedbackSource ? (feedback.feedbackSource ?? feedback.source ?? "") === args.feedbackSource : true
    ).filter((feedback) => this.getNumericFeedbackValue(feedback.value) !== null);
    const intervalMs = this.intervalToMs(args.interval);
    if (args.groupBy && args.groupBy.length > 0) {
      const seriesMap = /* @__PURE__ */ new Map();
      const seriesNames = /* @__PURE__ */ new Map();
      for (const feedback of filtered) {
        const values = args.groupBy.map((col) => feedback[col] ?? "");
        const key = JSON.stringify(values);
        if (!seriesMap.has(key)) seriesMap.set(key, /* @__PURE__ */ new Map());
        if (!seriesNames.has(key)) {
          seriesNames.set(
            key,
            values.map((value) => value === null || value === void 0 ? "" : String(value)).join("|")
          );
        }
        const bucket = Math.floor(feedback.timestamp.getTime() / intervalMs) * intervalMs;
        const bucketMap2 = seriesMap.get(key);
        if (!bucketMap2.has(bucket)) bucketMap2.set(bucket, []);
        bucketMap2.get(bucket).push(feedback);
      }
      return {
        series: Array.from(seriesMap.entries()).map(([key, bucketMap2]) => ({
          name: seriesNames.get(key),
          points: Array.from(bucketMap2.entries()).sort(([a], [b]) => a - b).map(([ts, records]) => ({
            timestamp: new Date(ts),
            value: (() => {
              const numericEntries = records.flatMap((record) => {
                const numericValue = this.getNumericFeedbackValue(record.value);
                return numericValue === null ? [] : [{ numericValue, timestamp: record.timestamp.getTime() }];
              });
              return this.aggregate(
                numericEntries.map((entry) => entry.numericValue),
                args.aggregation,
                numericEntries.map((entry) => entry.timestamp)
              ) ?? 0;
            })()
          }))
        }))
      };
    }
    const bucketMap = /* @__PURE__ */ new Map();
    for (const feedback of filtered) {
      const bucket = Math.floor(feedback.timestamp.getTime() / intervalMs) * intervalMs;
      if (!bucketMap.has(bucket)) bucketMap.set(bucket, []);
      bucketMap.get(bucket).push(feedback);
    }
    return {
      series: [
        {
          name: args.feedbackSource ? `${args.feedbackType}|${args.feedbackSource}` : args.feedbackType,
          points: Array.from(bucketMap.entries()).sort(([a], [b]) => a - b).map(([ts, records]) => ({
            timestamp: new Date(ts),
            value: (() => {
              const numericEntries = records.flatMap((record) => {
                const numericValue = this.getNumericFeedbackValue(record.value);
                return numericValue === null ? [] : [{ numericValue, timestamp: record.timestamp.getTime() }];
              });
              return this.aggregate(
                numericEntries.map((entry) => entry.numericValue),
                args.aggregation,
                numericEntries.map((entry) => entry.timestamp)
              ) ?? 0;
            })()
          }))
        }
      ]
    };
  }
  async getFeedbackPercentiles(args) {
    const filtered = this.db.feedbackRecords.filter((feedback) => this.feedbackMatchesFilters(feedback, args.filters)).filter((feedback) => feedback.feedbackType === args.feedbackType).filter(
      (feedback) => args.feedbackSource ? (feedback.feedbackSource ?? feedback.source ?? "") === args.feedbackSource : true
    );
    const intervalMs = this.intervalToMs(args.interval);
    const bucketMap = /* @__PURE__ */ new Map();
    for (const feedback of filtered) {
      const numericValue = this.getNumericFeedbackValue(feedback.value);
      if (numericValue === null) continue;
      const bucket = Math.floor(feedback.timestamp.getTime() / intervalMs) * intervalMs;
      if (!bucketMap.has(bucket)) bucketMap.set(bucket, []);
      bucketMap.get(bucket).push(numericValue);
    }
    const sortedBuckets = Array.from(bucketMap.entries()).sort(([a], [b]) => a - b);
    return {
      series: args.percentiles.map((percentile) => ({
        percentile,
        points: sortedBuckets.map(([ts, values]) => {
          const sorted = [...values].sort((a, b) => a - b);
          return { timestamp: new Date(ts), value: this.interpolatePercentile(sorted, percentile) };
        })
      }))
    };
  }
  feedbackMatchesFilters(fb, filters) {
    if (!filters) return true;
    if (filters.timestamp) {
      if (filters.timestamp.start && fb.timestamp < filters.timestamp.start) return false;
      if (filters.timestamp.end && fb.timestamp > filters.timestamp.end) return false;
    }
    if (filters.traceId !== void 0 && fb.traceId !== filters.traceId) return false;
    if (filters.spanId !== void 0 && fb.spanId !== filters.spanId) return false;
    if (filters.entityType !== void 0 && fb.entityType !== filters.entityType) return false;
    if (filters.entityName !== void 0 && fb.entityName !== filters.entityName) return false;
    if (filters.entityVersionId !== void 0 && fb.entityVersionId !== filters.entityVersionId) return false;
    if (filters.parentEntityVersionId !== void 0 && fb.parentEntityVersionId !== filters.parentEntityVersionId)
      return false;
    if (filters.rootEntityVersionId !== void 0 && fb.rootEntityVersionId !== filters.rootEntityVersionId)
      return false;
    if (filters.userId !== void 0 && fb.userId !== filters.userId) return false;
    if (filters.organizationId !== void 0 && fb.organizationId !== filters.organizationId) return false;
    if (filters.resourceId !== void 0 && fb.resourceId !== filters.resourceId) return false;
    if (filters.runId !== void 0 && fb.runId !== filters.runId) return false;
    if (filters.sessionId !== void 0 && fb.sessionId !== filters.sessionId) return false;
    if (filters.threadId !== void 0 && fb.threadId !== filters.threadId) return false;
    if (filters.requestId !== void 0 && fb.requestId !== filters.requestId) return false;
    if (filters.parentEntityType !== void 0 && fb.parentEntityType !== filters.parentEntityType) return false;
    if (filters.parentEntityName !== void 0 && fb.parentEntityName !== filters.parentEntityName) return false;
    if (filters.rootEntityType !== void 0 && fb.rootEntityType !== filters.rootEntityType) return false;
    if (filters.rootEntityName !== void 0 && fb.rootEntityName !== filters.rootEntityName) return false;
    if (filters.serviceName !== void 0 && fb.serviceName !== filters.serviceName) return false;
    if (filters.environment !== void 0 && fb.environment !== filters.environment) return false;
    if (filters.executionSource !== void 0 && fb.executionSource !== filters.executionSource) return false;
    if (filters.feedbackType !== void 0) {
      const types = Array.isArray(filters.feedbackType) ? filters.feedbackType : [filters.feedbackType];
      if (!types.includes(fb.feedbackType)) return false;
    }
    const feedbackSource = fb.feedbackSource ?? fb.source ?? "";
    if (filters.feedbackSource !== void 0 && feedbackSource !== filters.feedbackSource) return false;
    if (filters.source !== void 0 && feedbackSource !== filters.source) return false;
    if (filters.experimentId !== void 0 && fb.experimentId !== filters.experimentId) return false;
    if (filters.feedbackUserId !== void 0 && fb.feedbackUserId !== filters.feedbackUserId) return false;
    if (filters.tags != null && filters.tags.length > 0) {
      if (fb.tags == null) return false;
      for (const tag of filters.tags) {
        if (!fb.tags.includes(tag)) return false;
      }
    }
    return true;
  }
};

// src/storage/domains/observability/record-builders.ts
new Set(Object.values(EntityType));

// src/storage/domains/versioned.ts
var ENTITY_ORDER_BY_SET = {
  createdAt: true,
  updatedAt: true
};
var SORT_DIRECTION_SET = {
  ASC: true,
  DESC: true
};
var VERSION_ORDER_BY_SET = {
  versionNumber: true,
  createdAt: true
};
var VersionedStorageDomain = class extends StorageDomain {
  // ==========================================================================
  // Concrete resolution methods
  // ==========================================================================
  /**
   * Strips version metadata fields from a version row, leaving only snapshot config fields.
   */
  extractSnapshotConfig(version) {
    const result = {};
    const metadataSet = new Set(this.versionMetadataFields);
    for (const [key, value] of Object.entries(version)) {
      if (!metadataSet.has(key)) {
        result[key] = value;
      }
    }
    return result;
  }
  /**
   * Resolves an entity by merging its thin record with the active or latest version config.
   * - `{ status: 'draft' }` — resolve with the latest version.
   * - `{ status: 'published' }` (default) — resolve with the active version, falling back to latest.
   * - `{ versionId: '...' }` — resolve with a specific version by ID.
   */
  async getByIdResolved(id, options) {
    const entity = await this.getById(id);
    if (!entity) {
      return null;
    }
    return this.resolveEntity(entity, options);
  }
  /**
   * Lists entities with version resolution.
   * When `status` is `'draft'`, each entity is resolved with its latest version.
   * When `status` is `'published'` (default), each entity is resolved with its active version.
   */
  async listResolved(args) {
    const result = await this.list(args);
    const status = args?.status;
    const entities = result[this.listKey];
    const resolved = await Promise.all(
      entities.map((entity) => this.resolveEntity(entity, { status }))
    );
    return {
      ...result,
      [this.listKey]: resolved
    };
  }
  /**
   * Resolves a single entity by merging it with its active or latest version.
   * - `{ versionId: '...' }` — resolve with a specific version by ID.
   * - `{ status: 'published' }` (default) — use activeVersionId, fall back to latest.
   * - `{ status: 'draft' }` — always use the latest version.
   */
  async resolveEntity(entity, options) {
    const status = options?.status || "published";
    let version = null;
    if (options?.versionId) {
      version = await this.getVersion(options.versionId);
    } else if (status === "draft") {
      version = await this.getLatestVersion(entity.id);
    } else {
      if (entity.activeVersionId) {
        version = await this.getVersion(entity.activeVersionId);
        if (!version) {
          this.logger?.warn?.(
            `Entity ${entity.id} has activeVersionId ${entity.activeVersionId} but version not found. Falling back to latest version.`
          );
        }
      }
      if (!version) {
        version = await this.getLatestVersion(entity.id);
      }
    }
    if (version) {
      const snapshotConfig = this.extractSnapshotConfig(version);
      return {
        ...entity,
        ...snapshotConfig,
        resolvedVersionId: version.id
      };
    }
    return entity;
  }
  // ==========================================================================
  // Protected Helper Methods
  // ==========================================================================
  parseOrderBy(orderBy, defaultDirection = "DESC") {
    return {
      field: orderBy?.field && orderBy.field in ENTITY_ORDER_BY_SET ? orderBy.field : "createdAt",
      direction: orderBy?.direction && orderBy.direction in SORT_DIRECTION_SET ? orderBy.direction : defaultDirection
    };
  }
  parseVersionOrderBy(orderBy, defaultDirection = "DESC") {
    return {
      field: orderBy?.field && orderBy.field in VERSION_ORDER_BY_SET ? orderBy.field : "versionNumber",
      direction: orderBy?.direction && orderBy.direction in SORT_DIRECTION_SET ? orderBy.direction : defaultDirection
    };
  }
};

// src/storage/domains/agents/base.ts
var AgentsStorage = class extends VersionedStorageDomain {
  listKey = "agents";
  versionMetadataFields = [
    "id",
    "agentId",
    "versionNumber",
    "changedFields",
    "changeMessage",
    "createdAt"
  ];
  constructor() {
    super({
      component: "STORAGE",
      name: "AGENTS"
    });
  }
};

// src/storage/domains/agents/inmemory.ts
var InMemoryAgentsStorage = class extends AgentsStorage {
  db;
  constructor({ db }) {
    super();
    this.db = db;
  }
  async dangerouslyClearAll() {
    this.db.agents.clear();
    this.db.agentVersions.clear();
  }
  // ==========================================================================
  // Agent CRUD Methods
  // ==========================================================================
  async getById(id) {
    const agent = this.db.agents.get(id);
    return agent ? this.deepCopyAgent(agent) : null;
  }
  async create(input) {
    const { agent } = input;
    if (this.db.agents.has(agent.id)) {
      throw new Error(`Agent with id ${agent.id} already exists`);
    }
    const now = /* @__PURE__ */ new Date();
    const newAgent = {
      id: agent.id,
      status: "draft",
      activeVersionId: void 0,
      authorId: agent.authorId,
      metadata: agent.metadata,
      createdAt: now,
      updatedAt: now
    };
    this.db.agents.set(agent.id, newAgent);
    const { id: _id, authorId: _authorId, metadata: _metadata, ...snapshotConfig } = agent;
    const versionId = crypto.randomUUID();
    await this.createVersion({
      id: versionId,
      agentId: agent.id,
      versionNumber: 1,
      ...snapshotConfig,
      changedFields: Object.keys(snapshotConfig),
      changeMessage: "Initial version"
    });
    return this.deepCopyAgent(newAgent);
  }
  async update(input) {
    const { id, ...updates } = input;
    const existingAgent = this.db.agents.get(id);
    if (!existingAgent) {
      throw new Error(`Agent with id ${id} not found`);
    }
    const { authorId, activeVersionId, metadata, status } = updates;
    const updatedAgent = {
      ...existingAgent,
      ...authorId !== void 0 && { authorId },
      ...activeVersionId !== void 0 && { activeVersionId },
      ...metadata !== void 0 && {
        metadata: { ...existingAgent.metadata, ...metadata }
      },
      ...status !== void 0 && { status },
      updatedAt: /* @__PURE__ */ new Date()
    };
    this.db.agents.set(id, updatedAgent);
    return this.deepCopyAgent(updatedAgent);
  }
  async delete(id) {
    this.db.agents.delete(id);
    await this.deleteVersionsByParentId(id);
  }
  async list(args) {
    const { page = 0, perPage: perPageInput, orderBy, authorId, metadata, status } = args || {};
    const { field, direction } = this.parseOrderBy(orderBy);
    const perPage = normalizePerPage(perPageInput, 100);
    if (page < 0) {
      throw new Error("page must be >= 0");
    }
    const maxOffset = Number.MAX_SAFE_INTEGER / 2;
    if (page * perPage > maxOffset) {
      throw new Error("page value too large");
    }
    let agents = Array.from(this.db.agents.values());
    if (status) {
      agents = agents.filter((agent) => agent.status === status);
    }
    if (authorId !== void 0) {
      agents = agents.filter((agent) => agent.authorId === authorId);
    }
    if (metadata && Object.keys(metadata).length > 0) {
      agents = agents.filter((agent) => {
        if (!agent.metadata) return false;
        return Object.entries(metadata).every(([key, value]) => deepEqual(agent.metadata[key], value));
      });
    }
    const sortedAgents = this.sortAgents(agents, field, direction);
    const clonedAgents = sortedAgents.map((agent) => this.deepCopyAgent(agent));
    const { offset, perPage: perPageForResponse } = calculatePagination(page, perPageInput, perPage);
    return {
      agents: clonedAgents.slice(offset, offset + perPage),
      total: clonedAgents.length,
      page,
      perPage: perPageForResponse,
      hasMore: offset + perPage < clonedAgents.length
    };
  }
  // ==========================================================================
  // Agent Version Methods
  // ==========================================================================
  async createVersion(input) {
    if (this.db.agentVersions.has(input.id)) {
      throw new Error(`Version with id ${input.id} already exists`);
    }
    for (const version2 of this.db.agentVersions.values()) {
      if (version2.agentId === input.agentId && version2.versionNumber === input.versionNumber) {
        throw new Error(`Version number ${input.versionNumber} already exists for agent ${input.agentId}`);
      }
    }
    const version = {
      ...input,
      createdAt: /* @__PURE__ */ new Date()
    };
    this.db.agentVersions.set(input.id, this.deepCopyVersion(version));
    return this.deepCopyVersion(version);
  }
  async getVersion(id) {
    const version = this.db.agentVersions.get(id);
    return version ? this.deepCopyVersion(version) : null;
  }
  async getVersionByNumber(agentId, versionNumber) {
    for (const version of this.db.agentVersions.values()) {
      if (version.agentId === agentId && version.versionNumber === versionNumber) {
        return this.deepCopyVersion(version);
      }
    }
    return null;
  }
  async getLatestVersion(agentId) {
    let latest = null;
    for (const version of this.db.agentVersions.values()) {
      if (version.agentId === agentId) {
        if (!latest || version.versionNumber > latest.versionNumber) {
          latest = version;
        }
      }
    }
    return latest ? this.deepCopyVersion(latest) : null;
  }
  async listVersions(input) {
    const { agentId, page = 0, perPage: perPageInput, orderBy } = input;
    const { field, direction } = this.parseVersionOrderBy(orderBy);
    const perPage = normalizePerPage(perPageInput, 20);
    if (page < 0) {
      throw new Error("page must be >= 0");
    }
    const maxOffset = Number.MAX_SAFE_INTEGER / 2;
    if (page * perPage > maxOffset) {
      throw new Error("page value too large");
    }
    let versions = Array.from(this.db.agentVersions.values()).filter((v) => v.agentId === agentId);
    versions = this.sortVersions(versions, field, direction);
    const clonedVersions = versions.map((v) => this.deepCopyVersion(v));
    const total = clonedVersions.length;
    const { offset, perPage: perPageForResponse } = calculatePagination(page, perPageInput, perPage);
    const paginatedVersions = clonedVersions.slice(offset, offset + perPage);
    return {
      versions: paginatedVersions,
      total,
      page,
      perPage: perPageForResponse,
      hasMore: offset + perPage < total
    };
  }
  async deleteVersion(id) {
    this.db.agentVersions.delete(id);
  }
  async deleteVersionsByParentId(entityId) {
    const idsToDelete = [];
    for (const [id, version] of this.db.agentVersions.entries()) {
      if (version.agentId === entityId) {
        idsToDelete.push(id);
      }
    }
    for (const id of idsToDelete) {
      this.db.agentVersions.delete(id);
    }
  }
  async countVersions(agentId) {
    let count = 0;
    for (const version of this.db.agentVersions.values()) {
      if (version.agentId === agentId) {
        count++;
      }
    }
    return count;
  }
  // ==========================================================================
  // Private Helper Methods
  // ==========================================================================
  /**
   * Deep copy a thin agent record to prevent external mutation of stored data
   */
  deepCopyAgent(agent) {
    return {
      ...agent,
      metadata: agent.metadata ? { ...agent.metadata } : agent.metadata
    };
  }
  /**
   * Deep copy a version to prevent external mutation of stored data
   */
  deepCopyVersion(version) {
    return structuredClone(version);
  }
  sortAgents(agents, field, direction) {
    return agents.sort((a, b) => {
      const aValue = new Date(a[field]).getTime();
      const bValue = new Date(b[field]).getTime();
      return direction === "ASC" ? aValue - bValue : bValue - aValue;
    });
  }
  sortVersions(versions, field, direction) {
    return versions.sort((a, b) => {
      let aVal;
      let bVal;
      if (field === "createdAt") {
        aVal = a.createdAt.getTime();
        bVal = b.createdAt.getTime();
      } else {
        aVal = a.versionNumber;
        bVal = b.versionNumber;
      }
      return direction === "ASC" ? aVal - bVal : bVal - aVal;
    });
  }
};

// src/storage/domains/blobs/base.ts
var BlobStore = class extends MastraBase {
  constructor() {
    super({
      component: "STORAGE",
      name: "BLOBS"
    });
  }
};

// src/storage/domains/blobs/inmemory.ts
var InMemoryBlobStore = class extends BlobStore {
  #blobs = /* @__PURE__ */ new Map();
  async init() {
  }
  async put(entry) {
    if (!this.#blobs.has(entry.hash)) {
      this.#blobs.set(entry.hash, entry);
    }
  }
  async get(hash) {
    return this.#blobs.get(hash) ?? null;
  }
  async has(hash) {
    return this.#blobs.has(hash);
  }
  async delete(hash) {
    return this.#blobs.delete(hash);
  }
  async putMany(entries) {
    for (const entry of entries) {
      await this.put(entry);
    }
  }
  async getMany(hashes) {
    const result = /* @__PURE__ */ new Map();
    for (const hash of hashes) {
      const blob = this.#blobs.get(hash);
      if (blob) {
        result.set(hash, blob);
      }
    }
    return result;
  }
  async dangerouslyClearAll() {
    this.#blobs.clear();
  }
};

// src/datasets/validation/errors.ts
var SchemaValidationError = class extends Error {
  constructor(field, errors) {
    const summary = errors.slice(0, 3).map((e) => e.message).join("; ");
    super(`Validation failed for ${field}: ${summary}`);
    this.field = field;
    this.errors = errors;
    this.name = "SchemaValidationError";
  }
  field;
  errors;
};
var SchemaUpdateValidationError = class extends Error {
  constructor(failingItems) {
    const count = failingItems.length;
    super(`Cannot update schema: ${count} existing item(s) would fail validation`);
    this.failingItems = failingItems;
    this.name = "SchemaUpdateValidationError";
  }
  failingItems;
};

// src/datasets/validation/validator.ts
function resolveZodSchema(zodString) {
  return Function("z", `"use strict";return (${zodString});`)(z);
}
var SchemaValidator = class {
  cache = /* @__PURE__ */ new Map();
  /** Get or compile validator for schema */
  getValidator(schema, cacheKey) {
    let zodSchema = this.cache.get(cacheKey);
    if (!zodSchema) {
      const zodString = jsonSchemaToZod(schema);
      zodSchema = resolveZodSchema(zodString);
      this.cache.set(cacheKey, zodSchema);
    }
    return zodSchema;
  }
  /** Clear cached validator (call when schema changes) */
  clearCache(cacheKey) {
    this.cache.delete(cacheKey);
  }
  /** Validate data against schema */
  validate(data, schema, field, cacheKey) {
    const zodSchema = this.getValidator(schema, cacheKey);
    const result = zodSchema.safeParse(data);
    if (!result.success) {
      throw new SchemaValidationError(field, this.formatErrors(result.error));
    }
  }
  /** Validate multiple items, returning valid/invalid split */
  validateBatch(items, inputSchema, outputSchema, cacheKeyPrefix, maxErrors = 10) {
    const result = { valid: [], invalid: [] };
    const inputValidator = inputSchema ? this.getValidator(inputSchema, `${cacheKeyPrefix}:input`) : null;
    const outputValidator = outputSchema ? this.getValidator(outputSchema, `${cacheKeyPrefix}:output`) : null;
    for (const [i, item] of items.entries()) {
      let hasError = false;
      if (inputValidator) {
        const inputResult = inputValidator.safeParse(item.input);
        if (!inputResult.success) {
          result.invalid.push({
            index: i,
            data: item,
            field: "input",
            errors: this.formatErrors(inputResult.error)
          });
          hasError = true;
          if (result.invalid.length >= maxErrors) break;
        }
      }
      if (!hasError && outputValidator && item.groundTruth !== void 0) {
        const outputResult = outputValidator.safeParse(item.groundTruth);
        if (!outputResult.success) {
          result.invalid.push({
            index: i,
            data: item,
            field: "groundTruth",
            errors: this.formatErrors(outputResult.error)
          });
          hasError = true;
          if (result.invalid.length >= maxErrors) break;
        }
      }
      if (!hasError) {
        result.valid.push({ index: i, data: item });
      }
    }
    return result;
  }
  /** Format Zod errors to FieldError array */
  formatErrors(error) {
    return error.issues.slice(0, 5).map((issue) => ({
      // Convert Zod path array to JSON Pointer string
      path: issue.path.length > 0 ? "/" + issue.path.join("/") : "/",
      code: issue.code,
      message: issue.message
    }));
  }
};
var validatorInstance = null;
function getSchemaValidator() {
  if (!validatorInstance) {
    validatorInstance = new SchemaValidator();
  }
  return validatorInstance;
}

// src/storage/domains/datasets/base.ts
var DatasetsStorage = class extends StorageDomain {
  constructor() {
    super({
      component: "STORAGE",
      name: "DATASETS"
    });
  }
  async dangerouslyClearAll() {
  }
  /**
   * Update a dataset. Validates existing items against new schemas if schemas are changing.
   * Subclasses implement _doUpdateDataset for actual storage operation.
   */
  async updateDataset(args) {
    const existing = await this.getDatasetById({ id: args.id });
    if (!existing) {
      throw new Error(`Dataset not found: ${args.id}`);
    }
    const inputSchemaChanging = args.inputSchema !== void 0 && JSON.stringify(args.inputSchema) !== JSON.stringify(existing.inputSchema);
    const groundTruthSchemaChanging = args.groundTruthSchema !== void 0 && JSON.stringify(args.groundTruthSchema) !== JSON.stringify(existing.groundTruthSchema);
    if (inputSchemaChanging || groundTruthSchemaChanging) {
      const itemsResult = await this.listItems({
        datasetId: args.id,
        pagination: { page: 0, perPage: false }
        // Get all items
      });
      const items = itemsResult.items;
      if (items.length > 0) {
        const validator = getSchemaValidator();
        const newInputSchema = args.inputSchema !== void 0 ? args.inputSchema : existing.inputSchema;
        const newOutputSchema = args.groundTruthSchema !== void 0 ? args.groundTruthSchema : existing.groundTruthSchema;
        const result = validator.validateBatch(
          items.map((i) => ({ input: i.input, groundTruth: i.groundTruth })),
          newInputSchema,
          newOutputSchema,
          `dataset:${args.id}:schema-update`,
          10
          // Max 10 errors to report
        );
        if (result.invalid.length > 0) {
          throw new SchemaUpdateValidationError(result.invalid);
        }
        validator.clearCache(`dataset:${args.id}:input`);
        validator.clearCache(`dataset:${args.id}:output`);
      }
    }
    return this._doUpdateDataset(args);
  }
  /**
   * Add an item to a dataset. Validates input/groundTruth against dataset schemas.
   * Subclasses implement _doAddItem which handles SCD-2 versioning internally.
   */
  async addItem(args) {
    const dataset = await this.getDatasetById({ id: args.datasetId });
    if (!dataset) {
      throw new Error(`Dataset not found: ${args.datasetId}`);
    }
    const validator = getSchemaValidator();
    const cacheKey = `dataset:${args.datasetId}`;
    if (dataset.inputSchema) {
      validator.validate(args.input, dataset.inputSchema, "input", `${cacheKey}:input`);
    }
    if (dataset.groundTruthSchema && args.groundTruth !== void 0) {
      validator.validate(args.groundTruth, dataset.groundTruthSchema, "groundTruth", `${cacheKey}:output`);
    }
    return this._doAddItem(args);
  }
  /**
   * Update an item in a dataset. Validates changed fields against dataset schemas.
   * Subclasses implement _doUpdateItem which handles SCD-2 versioning internally.
   */
  async updateItem(args) {
    const dataset = await this.getDatasetById({ id: args.datasetId });
    if (!dataset) {
      throw new Error(`Dataset not found: ${args.datasetId}`);
    }
    const validator = getSchemaValidator();
    const cacheKey = `dataset:${args.datasetId}`;
    if (args.input !== void 0 && dataset.inputSchema) {
      validator.validate(args.input, dataset.inputSchema, "input", `${cacheKey}:input`);
    }
    if (args.groundTruth !== void 0 && dataset.groundTruthSchema) {
      validator.validate(args.groundTruth, dataset.groundTruthSchema, "groundTruth", `${cacheKey}:output`);
    }
    return this._doUpdateItem(args);
  }
  /**
   * Delete an item from a dataset. Creates a tombstone row via SCD-2.
   * Subclasses implement _doDeleteItem which handles SCD-2 versioning internally.
   */
  async deleteItem(args) {
    return this._doDeleteItem(args);
  }
  /**
   * Batch insert items to a dataset. Validates all items against dataset schemas,
   * then delegates to subclass which handles SCD-2 versioning internally.
   */
  async batchInsertItems(input) {
    const dataset = await this.getDatasetById({ id: input.datasetId });
    if (!dataset) {
      throw new Error(`Dataset not found: ${input.datasetId}`);
    }
    const validator = getSchemaValidator();
    const cacheKey = `dataset:${input.datasetId}`;
    for (const itemData of input.items) {
      if (dataset.inputSchema) {
        validator.validate(itemData.input, dataset.inputSchema, "input", `${cacheKey}:input`);
      }
      if (dataset.groundTruthSchema && itemData.groundTruth !== void 0) {
        validator.validate(itemData.groundTruth, dataset.groundTruthSchema, "groundTruth", `${cacheKey}:output`);
      }
    }
    return this._doBatchInsertItems(input);
  }
  /**
   * Batch delete items from a dataset. Creates tombstone rows via SCD-2.
   * Subclasses implement _doBatchDeleteItems which handles SCD-2 versioning internally.
   */
  async batchDeleteItems(input) {
    const dataset = await this.getDatasetById({ id: input.datasetId });
    if (!dataset) {
      throw new Error(`Dataset not found: ${input.datasetId}`);
    }
    return this._doBatchDeleteItems(input);
  }
};

// src/storage/domains/datasets/inmemory.ts
function toDatasetItem(row) {
  return {
    id: row.id,
    datasetId: row.datasetId,
    datasetVersion: row.datasetVersion,
    input: row.input,
    groundTruth: row.groundTruth,
    expectedTrajectory: row.expectedTrajectory,
    requestContext: row.requestContext,
    metadata: row.metadata,
    source: row.source,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}
function toDatasetRecord(record) {
  return {
    ...record,
    inputSchema: record.inputSchema ?? void 0,
    groundTruthSchema: record.groundTruthSchema ?? void 0,
    requestContextSchema: record.requestContextSchema ?? void 0
  };
}
var DatasetsInMemory = class extends DatasetsStorage {
  db;
  constructor({ db }) {
    super();
    this.db = db;
  }
  async dangerouslyClearAll() {
    this.db.datasets.clear();
    this.db.datasetItems.clear();
    this.db.datasetVersions.clear();
  }
  // Dataset CRUD
  async createDataset(input) {
    const id = crypto.randomUUID();
    const now = /* @__PURE__ */ new Date();
    const dataset = {
      id,
      name: input.name,
      description: input.description,
      metadata: input.metadata,
      inputSchema: input.inputSchema,
      groundTruthSchema: input.groundTruthSchema,
      requestContextSchema: input.requestContextSchema,
      targetType: input.targetType,
      targetIds: input.targetIds,
      scorerIds: input.scorerIds ?? null,
      version: 0,
      createdAt: now,
      updatedAt: now
    };
    this.db.datasets.set(id, dataset);
    return toDatasetRecord(dataset);
  }
  async getDatasetById({ id }) {
    const record = this.db.datasets.get(id);
    return record ? toDatasetRecord(record) : null;
  }
  async _doUpdateDataset(args) {
    const existing = this.db.datasets.get(args.id);
    if (!existing) {
      throw new Error(`Dataset not found: ${args.id}`);
    }
    const updated = {
      ...existing,
      name: args.name ?? existing.name,
      description: args.description ?? existing.description,
      metadata: args.metadata ?? existing.metadata,
      inputSchema: args.inputSchema !== void 0 ? args.inputSchema : existing.inputSchema,
      groundTruthSchema: args.groundTruthSchema !== void 0 ? args.groundTruthSchema : existing.groundTruthSchema,
      requestContextSchema: args.requestContextSchema !== void 0 ? args.requestContextSchema : existing.requestContextSchema,
      tags: args.tags !== void 0 ? args.tags : existing.tags,
      targetType: args.targetType !== void 0 ? args.targetType : existing.targetType,
      targetIds: args.targetIds !== void 0 ? args.targetIds : existing.targetIds,
      scorerIds: args.scorerIds !== void 0 ? args.scorerIds : existing.scorerIds,
      updatedAt: /* @__PURE__ */ new Date()
    };
    this.db.datasets.set(args.id, updated);
    return toDatasetRecord(updated);
  }
  async deleteDataset({ id }) {
    for (const [itemId, rows] of this.db.datasetItems) {
      if (rows.length > 0 && rows[0].datasetId === id) {
        this.db.datasetItems.delete(itemId);
      }
    }
    for (const [vId, v] of this.db.datasetVersions) {
      if (v.datasetId === id) {
        this.db.datasetVersions.delete(vId);
      }
    }
    for (const [expId, exp] of this.db.experiments) {
      if (exp.datasetId === id) {
        this.db.experiments.set(expId, { ...exp, datasetId: null, datasetVersion: null });
      }
    }
    this.db.datasets.delete(id);
  }
  async listDatasets(args) {
    const datasets = Array.from(this.db.datasets.values());
    datasets.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const { page, perPage: perPageInput } = args.pagination;
    const perPage = normalizePerPage(perPageInput, 100);
    const { offset: start, perPage: perPageForResponse } = calculatePagination(page, perPageInput, perPage);
    const end = perPageInput === false ? datasets.length : start + perPage;
    return {
      datasets: datasets.slice(start, end).map(toDatasetRecord),
      pagination: {
        total: datasets.length,
        page,
        perPage: perPageForResponse,
        hasMore: perPageInput === false ? false : datasets.length > end
      }
    };
  }
  // --- SCD-2 item mutations ---
  async _doAddItem(args) {
    const dataset = this.db.datasets.get(args.datasetId);
    if (!dataset) {
      throw new Error(`Dataset not found: ${args.datasetId}`);
    }
    const newVersion = dataset.version + 1;
    this.db.datasets.set(args.datasetId, { ...dataset, version: newVersion });
    const now = /* @__PURE__ */ new Date();
    const id = crypto.randomUUID();
    const row = {
      id,
      datasetId: args.datasetId,
      datasetVersion: newVersion,
      validTo: null,
      isDeleted: false,
      input: args.input,
      groundTruth: args.groundTruth,
      expectedTrajectory: args.expectedTrajectory,
      requestContext: args.requestContext,
      metadata: args.metadata,
      source: args.source,
      createdAt: now,
      updatedAt: now
    };
    this.db.datasetItems.set(id, [row]);
    await this.createDatasetVersion(args.datasetId, newVersion);
    return toDatasetItem(row);
  }
  async _doUpdateItem(args) {
    const rows = this.db.datasetItems.get(args.id);
    if (!rows || rows.length === 0) {
      throw new Error(`Item not found: ${args.id}`);
    }
    const currentRow = rows.find((r) => r.validTo === null && !r.isDeleted);
    if (!currentRow) {
      throw new Error(`Item not found: ${args.id}`);
    }
    if (currentRow.datasetId !== args.datasetId) {
      throw new Error(`Item ${args.id} does not belong to dataset ${args.datasetId}`);
    }
    const dataset = this.db.datasets.get(args.datasetId);
    if (!dataset) {
      throw new Error(`Dataset not found: ${args.datasetId}`);
    }
    const newVersion = dataset.version + 1;
    this.db.datasets.set(args.datasetId, { ...dataset, version: newVersion });
    currentRow.validTo = newVersion;
    const now = /* @__PURE__ */ new Date();
    const newRow = {
      id: args.id,
      datasetId: args.datasetId,
      datasetVersion: newVersion,
      validTo: null,
      isDeleted: false,
      input: args.input !== void 0 ? args.input : currentRow.input,
      groundTruth: args.groundTruth !== void 0 ? args.groundTruth : currentRow.groundTruth,
      expectedTrajectory: args.expectedTrajectory !== void 0 ? args.expectedTrajectory : currentRow.expectedTrajectory,
      requestContext: args.requestContext !== void 0 ? args.requestContext : currentRow.requestContext,
      metadata: args.metadata !== void 0 ? args.metadata : currentRow.metadata,
      source: args.source !== void 0 ? args.source : currentRow.source,
      createdAt: currentRow.createdAt,
      updatedAt: now
    };
    rows.push(newRow);
    await this.createDatasetVersion(args.datasetId, newVersion);
    return toDatasetItem(newRow);
  }
  async _doDeleteItem({ id, datasetId }) {
    const rows = this.db.datasetItems.get(id);
    if (!rows || rows.length === 0) {
      return;
    }
    const currentRow = rows.find((r) => r.validTo === null && !r.isDeleted);
    if (!currentRow) {
      return;
    }
    if (currentRow.datasetId !== datasetId) {
      throw new Error(`Item ${id} does not belong to dataset ${datasetId}`);
    }
    const dataset = this.db.datasets.get(datasetId);
    if (!dataset) {
      throw new Error(`Dataset not found: ${datasetId}`);
    }
    const newVersion = dataset.version + 1;
    this.db.datasets.set(datasetId, { ...dataset, version: newVersion });
    currentRow.validTo = newVersion;
    const now = /* @__PURE__ */ new Date();
    rows.push({
      id,
      datasetId,
      datasetVersion: newVersion,
      validTo: null,
      isDeleted: true,
      input: currentRow.input,
      groundTruth: currentRow.groundTruth,
      requestContext: currentRow.requestContext,
      metadata: currentRow.metadata,
      createdAt: currentRow.createdAt,
      updatedAt: now
    });
    await this.createDatasetVersion(datasetId, newVersion);
  }
  // --- SCD-2 queries ---
  async getItemById(args) {
    const rows = this.db.datasetItems.get(args.id);
    if (!rows || rows.length === 0) return null;
    if (args.datasetVersion !== void 0) {
      const row = rows.find((r) => r.datasetVersion === args.datasetVersion && !r.isDeleted);
      return row ? toDatasetItem(row) : null;
    }
    const current = rows.find((r) => r.validTo === null && !r.isDeleted);
    return current ? toDatasetItem(current) : null;
  }
  async getItemsByVersion({ datasetId, version }) {
    const items = [];
    for (const rows of this.db.datasetItems.values()) {
      if (rows.length === 0 || rows[0].datasetId !== datasetId) continue;
      const visible = rows.find(
        (r) => r.datasetVersion <= version && (r.validTo === null || r.validTo > version) && !r.isDeleted
      );
      if (visible) {
        items.push(toDatasetItem(visible));
      }
    }
    items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || b.id.localeCompare(a.id));
    return items;
  }
  async getItemHistory(itemId) {
    const rows = this.db.datasetItems.get(itemId);
    if (!rows) return [];
    return [...rows].sort((a, b) => b.datasetVersion - a.datasetVersion);
  }
  async listItems(args) {
    let items;
    if (args.version !== void 0) {
      items = await this.getItemsByVersion({ datasetId: args.datasetId, version: args.version });
    } else {
      items = [];
      for (const rows of this.db.datasetItems.values()) {
        if (rows.length === 0 || rows[0].datasetId !== args.datasetId) continue;
        const current = rows.find((r) => r.validTo === null && !r.isDeleted);
        if (current) {
          items.push(toDatasetItem(current));
        }
      }
    }
    if (args.search) {
      const searchLower = args.search.toLowerCase();
      items = items.filter((item) => {
        const inputStr = typeof item.input === "string" ? item.input : JSON.stringify(item.input);
        const outputStr = item.groundTruth ? typeof item.groundTruth === "string" ? item.groundTruth : JSON.stringify(item.groundTruth) : "";
        return inputStr.toLowerCase().includes(searchLower) || outputStr.toLowerCase().includes(searchLower);
      });
    }
    items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || b.id.localeCompare(a.id));
    const { page, perPage: perPageInput } = args.pagination;
    const perPage = normalizePerPage(perPageInput, 100);
    const { offset: start, perPage: perPageForResponse } = calculatePagination(page, perPageInput, perPage);
    const end = perPageInput === false ? items.length : start + perPage;
    return {
      items: items.slice(start, end),
      pagination: {
        total: items.length,
        page,
        perPage: perPageForResponse,
        hasMore: perPageInput === false ? false : items.length > end
      }
    };
  }
  // --- Dataset version methods ---
  async createDatasetVersion(datasetId, version) {
    const id = crypto.randomUUID();
    const dsVersion = {
      id,
      datasetId,
      version,
      createdAt: /* @__PURE__ */ new Date()
    };
    this.db.datasetVersions.set(id, dsVersion);
    return dsVersion;
  }
  async listDatasetVersions(input) {
    const versions = [];
    for (const v of this.db.datasetVersions.values()) {
      if (v.datasetId === input.datasetId) {
        versions.push(v);
      }
    }
    versions.sort((a, b) => b.version - a.version);
    const { page, perPage: perPageInput } = input.pagination;
    const perPage = normalizePerPage(perPageInput, 100);
    const { offset: start, perPage: perPageForResponse } = calculatePagination(page, perPageInput, perPage);
    const end = perPageInput === false ? versions.length : start + perPage;
    return {
      versions: versions.slice(start, end),
      pagination: {
        total: versions.length,
        page,
        perPage: perPageForResponse,
        hasMore: perPageInput === false ? false : versions.length > end
      }
    };
  }
  // --- Bulk operations (SCD-2 internally) ---
  async _doBatchInsertItems(input) {
    const dataset = this.db.datasets.get(input.datasetId);
    if (!dataset) {
      throw new Error(`Dataset not found: ${input.datasetId}`);
    }
    const newVersion = dataset.version + 1;
    this.db.datasets.set(input.datasetId, { ...dataset, version: newVersion });
    const now = /* @__PURE__ */ new Date();
    const items = [];
    for (const itemInput of input.items) {
      const id = crypto.randomUUID();
      const row = {
        id,
        datasetId: input.datasetId,
        datasetVersion: newVersion,
        validTo: null,
        isDeleted: false,
        input: itemInput.input,
        groundTruth: itemInput.groundTruth,
        expectedTrajectory: itemInput.expectedTrajectory,
        requestContext: itemInput.requestContext,
        metadata: itemInput.metadata,
        source: itemInput.source,
        createdAt: now,
        updatedAt: now
      };
      this.db.datasetItems.set(id, [row]);
      items.push(toDatasetItem(row));
    }
    await this.createDatasetVersion(input.datasetId, newVersion);
    return items;
  }
  async _doBatchDeleteItems(input) {
    const dataset = this.db.datasets.get(input.datasetId);
    if (!dataset) {
      throw new Error(`Dataset not found: ${input.datasetId}`);
    }
    const newVersion = dataset.version + 1;
    this.db.datasets.set(input.datasetId, { ...dataset, version: newVersion });
    const now = /* @__PURE__ */ new Date();
    for (const itemId of input.itemIds) {
      const rows = this.db.datasetItems.get(itemId);
      if (!rows) continue;
      const currentRow = rows.find((r) => r.validTo === null && !r.isDeleted);
      if (!currentRow || currentRow.datasetId !== input.datasetId) continue;
      currentRow.validTo = newVersion;
      rows.push({
        id: itemId,
        datasetId: input.datasetId,
        datasetVersion: newVersion,
        validTo: null,
        isDeleted: true,
        input: currentRow.input,
        groundTruth: currentRow.groundTruth,
        requestContext: currentRow.requestContext,
        metadata: currentRow.metadata,
        createdAt: currentRow.createdAt,
        updatedAt: now
      });
    }
    await this.createDatasetVersion(input.datasetId, newVersion);
  }
};

// src/storage/domains/experiments/base.ts
var ExperimentsStorage = class extends StorageDomain {
  constructor() {
    super({
      component: "STORAGE",
      name: "EXPERIMENTS"
    });
  }
  async dangerouslyClearAll() {
  }
};

// src/storage/domains/experiments/inmemory.ts
var ExperimentsInMemory = class extends ExperimentsStorage {
  db;
  constructor({ db }) {
    super();
    this.db = db;
  }
  async dangerouslyClearAll() {
    this.db.experiments.clear();
    this.db.experimentResults.clear();
  }
  // Experiment lifecycle
  async createExperiment(input) {
    const now = /* @__PURE__ */ new Date();
    const experiment = {
      id: input.id ?? crypto.randomUUID(),
      datasetId: input.datasetId,
      datasetVersion: input.datasetVersion,
      agentVersion: input.agentVersion ?? null,
      targetType: input.targetType,
      targetId: input.targetId,
      name: input.name,
      description: input.description,
      metadata: input.metadata,
      status: "pending",
      totalItems: input.totalItems,
      succeededCount: 0,
      failedCount: 0,
      skippedCount: 0,
      startedAt: null,
      completedAt: null,
      createdAt: now,
      updatedAt: now
    };
    this.db.experiments.set(experiment.id, experiment);
    return experiment;
  }
  async updateExperiment(input) {
    const existing = this.db.experiments.get(input.id);
    if (!existing) {
      throw new Error(`Experiment not found: ${input.id}`);
    }
    const updated = {
      ...existing,
      status: input.status ?? existing.status,
      totalItems: input.totalItems ?? existing.totalItems,
      succeededCount: input.succeededCount ?? existing.succeededCount,
      failedCount: input.failedCount ?? existing.failedCount,
      skippedCount: input.skippedCount ?? existing.skippedCount,
      startedAt: input.startedAt ?? existing.startedAt,
      completedAt: input.completedAt ?? existing.completedAt,
      name: input.name ?? existing.name,
      description: input.description ?? existing.description,
      metadata: input.metadata ?? existing.metadata,
      updatedAt: /* @__PURE__ */ new Date()
    };
    this.db.experiments.set(input.id, updated);
    return updated;
  }
  async getExperimentById(args) {
    return this.db.experiments.get(args.id) ?? null;
  }
  async listExperiments(args) {
    let experiments = Array.from(this.db.experiments.values());
    if (args.datasetId) {
      experiments = experiments.filter((r) => r.datasetId === args.datasetId);
    }
    if (args.targetType) {
      experiments = experiments.filter((r) => r.targetType === args.targetType);
    }
    if (args.targetId) {
      experiments = experiments.filter((r) => r.targetId === args.targetId);
    }
    if (args.agentVersion) {
      experiments = experiments.filter((r) => r.agentVersion === args.agentVersion);
    }
    if (args.status) {
      experiments = experiments.filter((r) => r.status === args.status);
    }
    experiments.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const { page, perPage: perPageInput } = args.pagination;
    const perPage = normalizePerPage(perPageInput, 100);
    const { offset: start, perPage: perPageForResponse } = calculatePagination(page, perPageInput, perPage);
    const end = perPageInput === false ? experiments.length : start + perPage;
    return {
      experiments: experiments.slice(start, end),
      pagination: {
        total: experiments.length,
        page,
        perPage: perPageForResponse,
        hasMore: perPageInput === false ? false : experiments.length > end
      }
    };
  }
  async deleteExperiment(args) {
    this.db.experiments.delete(args.id);
    for (const [resultId, result] of this.db.experimentResults) {
      if (result.experimentId === args.id) {
        this.db.experimentResults.delete(resultId);
      }
    }
  }
  // Results (per-item)
  async addExperimentResult(input) {
    const now = /* @__PURE__ */ new Date();
    const result = {
      id: input.id ?? crypto.randomUUID(),
      experimentId: input.experimentId,
      itemId: input.itemId,
      itemDatasetVersion: input.itemDatasetVersion,
      input: input.input,
      output: input.output,
      groundTruth: input.groundTruth,
      error: input.error,
      startedAt: input.startedAt,
      completedAt: input.completedAt,
      retryCount: input.retryCount,
      traceId: input.traceId ?? null,
      status: input.status ?? null,
      tags: input.tags ?? null,
      createdAt: now
    };
    this.db.experimentResults.set(result.id, result);
    return result;
  }
  async updateExperimentResult(input) {
    const existing = this.db.experimentResults.get(input.id);
    if (!existing) {
      throw new Error(`Experiment result not found: ${input.id}`);
    }
    if (input.experimentId && existing.experimentId !== input.experimentId) {
      throw new Error(`Experiment result ${input.id} does not belong to experiment ${input.experimentId}`);
    }
    const updated = {
      ...existing,
      status: input.status !== void 0 ? input.status : existing.status,
      tags: input.tags !== void 0 ? input.tags : existing.tags
    };
    this.db.experimentResults.set(input.id, updated);
    return updated;
  }
  async getExperimentResultById(args) {
    return this.db.experimentResults.get(args.id) ?? null;
  }
  async listExperimentResults(args) {
    let results = Array.from(this.db.experimentResults.values()).filter((r) => r.experimentId === args.experimentId);
    if (args.traceId) {
      results = results.filter((r) => r.traceId === args.traceId);
    }
    if (args.status) {
      results = results.filter((r) => r.status === args.status);
    }
    results.sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime());
    const { page, perPage: perPageInput } = args.pagination;
    const perPage = normalizePerPage(perPageInput, 100);
    const { offset: start, perPage: perPageForResponse } = calculatePagination(page, perPageInput, perPage);
    const end = perPageInput === false ? results.length : start + perPage;
    return {
      results: results.slice(start, end),
      pagination: {
        total: results.length,
        page,
        perPage: perPageForResponse,
        hasMore: perPageInput === false ? false : results.length > end
      }
    };
  }
  async deleteExperimentResults(args) {
    for (const [resultId, result] of this.db.experimentResults) {
      if (result.experimentId === args.experimentId) {
        this.db.experimentResults.delete(resultId);
      }
    }
  }
  async getReviewSummary() {
    const counts = /* @__PURE__ */ new Map();
    for (const result of this.db.experimentResults.values()) {
      let entry = counts.get(result.experimentId);
      if (!entry) {
        entry = { experimentId: result.experimentId, total: 0, needsReview: 0, reviewed: 0, complete: 0 };
        counts.set(result.experimentId, entry);
      }
      entry.total++;
      if (result.status === "needs-review") entry.needsReview++;
      else if (result.status === "reviewed") entry.reviewed++;
      else if (result.status === "complete") entry.complete++;
    }
    return Array.from(counts.values());
  }
};

// src/storage/domains/inmemory-db.ts
var InMemoryDB = class {
  threads = /* @__PURE__ */ new Map();
  messages = /* @__PURE__ */ new Map();
  resources = /* @__PURE__ */ new Map();
  workflows = /* @__PURE__ */ new Map();
  scores = /* @__PURE__ */ new Map();
  traces = /* @__PURE__ */ new Map();
  metricRecords = [];
  logRecords = [];
  scoreRecords = [];
  feedbackRecords = [];
  agents = /* @__PURE__ */ new Map();
  agentVersions = /* @__PURE__ */ new Map();
  promptBlocks = /* @__PURE__ */ new Map();
  promptBlockVersions = /* @__PURE__ */ new Map();
  scorerDefinitions = /* @__PURE__ */ new Map();
  scorerDefinitionVersions = /* @__PURE__ */ new Map();
  mcpClients = /* @__PURE__ */ new Map();
  mcpClientVersions = /* @__PURE__ */ new Map();
  mcpServers = /* @__PURE__ */ new Map();
  mcpServerVersions = /* @__PURE__ */ new Map();
  workspaces = /* @__PURE__ */ new Map();
  workspaceVersions = /* @__PURE__ */ new Map();
  skills = /* @__PURE__ */ new Map();
  skillVersions = /* @__PURE__ */ new Map();
  /** Observational memory records, keyed by resourceId, each holding array of records (generations) */
  observationalMemory = /* @__PURE__ */ new Map();
  // Dataset domain maps
  datasets = /* @__PURE__ */ new Map();
  datasetItems = /* @__PURE__ */ new Map();
  datasetVersions = /* @__PURE__ */ new Map();
  // Experiment domain maps
  experiments = /* @__PURE__ */ new Map();
  experimentResults = /* @__PURE__ */ new Map();
  /**
   * Clears all data from all collections.
   * Useful for testing.
   */
  clear() {
    this.threads.clear();
    this.messages.clear();
    this.resources.clear();
    this.workflows.clear();
    this.scores.clear();
    this.traces.clear();
    this.metricRecords.length = 0;
    this.logRecords.length = 0;
    this.scoreRecords.length = 0;
    this.feedbackRecords.length = 0;
    this.agents.clear();
    this.agentVersions.clear();
    this.promptBlocks.clear();
    this.promptBlockVersions.clear();
    this.scorerDefinitions.clear();
    this.scorerDefinitionVersions.clear();
    this.mcpClients.clear();
    this.mcpClientVersions.clear();
    this.mcpServers.clear();
    this.mcpServerVersions.clear();
    this.workspaces.clear();
    this.workspaceVersions.clear();
    this.skills.clear();
    this.skillVersions.clear();
    this.observationalMemory.clear();
    this.datasets.clear();
    this.datasetItems.clear();
    this.datasetVersions.clear();
    this.experiments.clear();
    this.experimentResults.clear();
  }
};

// src/storage/domains/mcp-clients/base.ts
var MCPClientsStorage = class extends VersionedStorageDomain {
  listKey = "mcpClients";
  versionMetadataFields = [
    "id",
    "mcpClientId",
    "versionNumber",
    "changedFields",
    "changeMessage",
    "createdAt"
  ];
  constructor() {
    super({
      component: "STORAGE",
      name: "MCP_CLIENTS"
    });
  }
};

// src/storage/domains/mcp-clients/inmemory.ts
var InMemoryMCPClientsStorage = class extends MCPClientsStorage {
  db;
  constructor({ db }) {
    super();
    this.db = db;
  }
  async dangerouslyClearAll() {
    this.db.mcpClients.clear();
    this.db.mcpClientVersions.clear();
  }
  // ==========================================================================
  // MCP Client CRUD Methods
  // ==========================================================================
  async getById(id) {
    const config = this.db.mcpClients.get(id);
    return config ? this.deepCopyConfig(config) : null;
  }
  async create(input) {
    const { mcpClient } = input;
    if (this.db.mcpClients.has(mcpClient.id)) {
      throw new Error(`MCP client with id ${mcpClient.id} already exists`);
    }
    const now = /* @__PURE__ */ new Date();
    const newConfig = {
      id: mcpClient.id,
      status: "draft",
      activeVersionId: void 0,
      authorId: mcpClient.authorId,
      metadata: mcpClient.metadata,
      createdAt: now,
      updatedAt: now
    };
    this.db.mcpClients.set(mcpClient.id, newConfig);
    const { id: _id, authorId: _authorId, metadata: _metadata, ...snapshotConfig } = mcpClient;
    const versionId = crypto.randomUUID();
    await this.createVersion({
      id: versionId,
      mcpClientId: mcpClient.id,
      versionNumber: 1,
      ...snapshotConfig,
      changedFields: Object.keys(snapshotConfig),
      changeMessage: "Initial version"
    });
    return this.deepCopyConfig(newConfig);
  }
  async update(input) {
    const { id, ...updates } = input;
    const existingConfig = this.db.mcpClients.get(id);
    if (!existingConfig) {
      throw new Error(`MCP client with id ${id} not found`);
    }
    const { authorId, activeVersionId, metadata, status } = updates;
    const updatedConfig = {
      ...existingConfig,
      ...authorId !== void 0 && { authorId },
      ...activeVersionId !== void 0 && { activeVersionId },
      ...status !== void 0 && { status },
      ...metadata !== void 0 && {
        metadata: { ...existingConfig.metadata, ...metadata }
      },
      updatedAt: /* @__PURE__ */ new Date()
    };
    this.db.mcpClients.set(id, updatedConfig);
    return this.deepCopyConfig(updatedConfig);
  }
  async delete(id) {
    this.db.mcpClients.delete(id);
    await this.deleteVersionsByParentId(id);
  }
  async list(args) {
    const { page = 0, perPage: perPageInput, orderBy, authorId, metadata, status } = args || {};
    const { field, direction } = this.parseOrderBy(orderBy);
    const perPage = normalizePerPage(perPageInput, 100);
    if (page < 0) {
      throw new Error("page must be >= 0");
    }
    const maxOffset = Number.MAX_SAFE_INTEGER / 2;
    if (page * perPage > maxOffset) {
      throw new Error("page value too large");
    }
    let configs = Array.from(this.db.mcpClients.values());
    if (status) {
      configs = configs.filter((config) => config.status === status);
    }
    if (authorId !== void 0) {
      configs = configs.filter((config) => config.authorId === authorId);
    }
    if (metadata && Object.keys(metadata).length > 0) {
      configs = configs.filter((config) => {
        if (!config.metadata) return false;
        return Object.entries(metadata).every(([key, value]) => deepEqual(config.metadata[key], value));
      });
    }
    const sortedConfigs = this.sortConfigs(configs, field, direction);
    const clonedConfigs = sortedConfigs.map((config) => this.deepCopyConfig(config));
    const { offset, perPage: perPageForResponse } = calculatePagination(page, perPageInput, perPage);
    return {
      mcpClients: clonedConfigs.slice(offset, offset + perPage),
      total: clonedConfigs.length,
      page,
      perPage: perPageForResponse,
      hasMore: offset + perPage < clonedConfigs.length
    };
  }
  // ==========================================================================
  // MCP Client Version Methods
  // ==========================================================================
  async createVersion(input) {
    if (this.db.mcpClientVersions.has(input.id)) {
      throw new Error(`Version with id ${input.id} already exists`);
    }
    for (const version2 of this.db.mcpClientVersions.values()) {
      if (version2.mcpClientId === input.mcpClientId && version2.versionNumber === input.versionNumber) {
        throw new Error(`Version number ${input.versionNumber} already exists for MCP client ${input.mcpClientId}`);
      }
    }
    const version = {
      ...input,
      createdAt: /* @__PURE__ */ new Date()
    };
    this.db.mcpClientVersions.set(input.id, this.deepCopyVersion(version));
    return this.deepCopyVersion(version);
  }
  async getVersion(id) {
    const version = this.db.mcpClientVersions.get(id);
    return version ? this.deepCopyVersion(version) : null;
  }
  async getVersionByNumber(mcpClientId, versionNumber) {
    for (const version of this.db.mcpClientVersions.values()) {
      if (version.mcpClientId === mcpClientId && version.versionNumber === versionNumber) {
        return this.deepCopyVersion(version);
      }
    }
    return null;
  }
  async getLatestVersion(mcpClientId) {
    let latest = null;
    for (const version of this.db.mcpClientVersions.values()) {
      if (version.mcpClientId === mcpClientId) {
        if (!latest || version.versionNumber > latest.versionNumber) {
          latest = version;
        }
      }
    }
    return latest ? this.deepCopyVersion(latest) : null;
  }
  async listVersions(input) {
    const { mcpClientId, page = 0, perPage: perPageInput, orderBy } = input;
    const { field, direction } = this.parseVersionOrderBy(orderBy);
    const perPage = normalizePerPage(perPageInput, 20);
    if (page < 0) {
      throw new Error("page must be >= 0");
    }
    const maxOffset = Number.MAX_SAFE_INTEGER / 2;
    if (page * perPage > maxOffset) {
      throw new Error("page value too large");
    }
    let versions = Array.from(this.db.mcpClientVersions.values()).filter((v) => v.mcpClientId === mcpClientId);
    versions = this.sortVersions(versions, field, direction);
    const clonedVersions = versions.map((v) => this.deepCopyVersion(v));
    const total = clonedVersions.length;
    const { offset, perPage: perPageForResponse } = calculatePagination(page, perPageInput, perPage);
    const paginatedVersions = clonedVersions.slice(offset, offset + perPage);
    return {
      versions: paginatedVersions,
      total,
      page,
      perPage: perPageForResponse,
      hasMore: offset + perPage < total
    };
  }
  async deleteVersion(id) {
    this.db.mcpClientVersions.delete(id);
  }
  async deleteVersionsByParentId(entityId) {
    const idsToDelete = [];
    for (const [id, version] of this.db.mcpClientVersions.entries()) {
      if (version.mcpClientId === entityId) {
        idsToDelete.push(id);
      }
    }
    for (const id of idsToDelete) {
      this.db.mcpClientVersions.delete(id);
    }
  }
  async countVersions(mcpClientId) {
    let count = 0;
    for (const version of this.db.mcpClientVersions.values()) {
      if (version.mcpClientId === mcpClientId) {
        count++;
      }
    }
    return count;
  }
  // ==========================================================================
  // Private Helper Methods
  // ==========================================================================
  deepCopyConfig(config) {
    return {
      ...config,
      metadata: config.metadata ? { ...config.metadata } : config.metadata
    };
  }
  deepCopyVersion(version) {
    return {
      ...version,
      servers: version.servers ? JSON.parse(JSON.stringify(version.servers)) : version.servers,
      changedFields: version.changedFields ? [...version.changedFields] : version.changedFields
    };
  }
  sortConfigs(configs, field, direction) {
    return configs.sort((a, b) => {
      const aValue = a[field].getTime();
      const bValue = b[field].getTime();
      return direction === "ASC" ? aValue - bValue : bValue - aValue;
    });
  }
  sortVersions(versions, field, direction) {
    return versions.sort((a, b) => {
      let aVal;
      let bVal;
      if (field === "createdAt") {
        aVal = a.createdAt.getTime();
        bVal = b.createdAt.getTime();
      } else {
        aVal = a.versionNumber;
        bVal = b.versionNumber;
      }
      return direction === "ASC" ? aVal - bVal : bVal - aVal;
    });
  }
};

// src/storage/domains/mcp-servers/base.ts
var MCPServersStorage = class extends VersionedStorageDomain {
  listKey = "mcpServers";
  versionMetadataFields = [
    "id",
    "mcpServerId",
    "versionNumber",
    "changedFields",
    "changeMessage",
    "createdAt"
  ];
  constructor() {
    super({
      component: "STORAGE",
      name: "MCP_SERVERS"
    });
  }
};

// src/storage/domains/mcp-servers/inmemory.ts
var InMemoryMCPServersStorage = class extends MCPServersStorage {
  db;
  constructor({ db }) {
    super();
    this.db = db;
  }
  async dangerouslyClearAll() {
    this.db.mcpServers.clear();
    this.db.mcpServerVersions.clear();
  }
  // ==========================================================================
  // MCP Server CRUD Methods
  // ==========================================================================
  async getById(id) {
    const config = this.db.mcpServers.get(id);
    return config ? this.deepCopyConfig(config) : null;
  }
  async create(input) {
    const { mcpServer } = input;
    if (this.db.mcpServers.has(mcpServer.id)) {
      throw new Error(`MCP server with id ${mcpServer.id} already exists`);
    }
    const now = /* @__PURE__ */ new Date();
    const newConfig = {
      id: mcpServer.id,
      status: "draft",
      activeVersionId: void 0,
      authorId: mcpServer.authorId,
      metadata: mcpServer.metadata,
      createdAt: now,
      updatedAt: now
    };
    this.db.mcpServers.set(mcpServer.id, newConfig);
    const { id: _id, authorId: _authorId, metadata: _metadata, ...snapshotConfig } = mcpServer;
    const versionId = crypto.randomUUID();
    await this.createVersion({
      id: versionId,
      mcpServerId: mcpServer.id,
      versionNumber: 1,
      ...snapshotConfig,
      changedFields: Object.keys(snapshotConfig),
      changeMessage: "Initial version"
    });
    return this.deepCopyConfig(newConfig);
  }
  async update(input) {
    const { id, ...updates } = input;
    const existingConfig = this.db.mcpServers.get(id);
    if (!existingConfig) {
      throw new Error(`MCP server with id ${id} not found`);
    }
    const { authorId, activeVersionId, metadata, status } = updates;
    const updatedConfig = {
      ...existingConfig,
      ...authorId !== void 0 && { authorId },
      ...activeVersionId !== void 0 && { activeVersionId },
      ...status !== void 0 && { status },
      ...metadata !== void 0 && {
        metadata: { ...existingConfig.metadata, ...metadata }
      },
      updatedAt: /* @__PURE__ */ new Date()
    };
    this.db.mcpServers.set(id, updatedConfig);
    return this.deepCopyConfig(updatedConfig);
  }
  async delete(id) {
    this.db.mcpServers.delete(id);
    await this.deleteVersionsByParentId(id);
  }
  async list(args) {
    const { page = 0, perPage: perPageInput, orderBy, authorId, metadata, status = "published" } = args || {};
    const { field, direction } = this.parseOrderBy(orderBy);
    const perPage = normalizePerPage(perPageInput, 100);
    if (page < 0) {
      throw new Error("page must be >= 0");
    }
    const maxOffset = Number.MAX_SAFE_INTEGER / 2;
    if (page * perPage > maxOffset) {
      throw new Error("page value too large");
    }
    let configs = Array.from(this.db.mcpServers.values());
    if (status) {
      configs = configs.filter((config) => config.status === status);
    }
    if (authorId !== void 0) {
      configs = configs.filter((config) => config.authorId === authorId);
    }
    if (metadata && Object.keys(metadata).length > 0) {
      configs = configs.filter((config) => {
        if (!config.metadata) return false;
        return Object.entries(metadata).every(([key, value]) => deepEqual(config.metadata[key], value));
      });
    }
    const sortedConfigs = this.sortConfigs(configs, field, direction);
    const clonedConfigs = sortedConfigs.map((config) => this.deepCopyConfig(config));
    const { offset, perPage: perPageForResponse } = calculatePagination(page, perPageInput, perPage);
    return {
      mcpServers: clonedConfigs.slice(offset, offset + perPage),
      total: clonedConfigs.length,
      page,
      perPage: perPageForResponse,
      hasMore: offset + perPage < clonedConfigs.length
    };
  }
  // ==========================================================================
  // MCP Server Version Methods
  // ==========================================================================
  async createVersion(input) {
    if (this.db.mcpServerVersions.has(input.id)) {
      throw new Error(`Version with id ${input.id} already exists`);
    }
    for (const version2 of this.db.mcpServerVersions.values()) {
      if (version2.mcpServerId === input.mcpServerId && version2.versionNumber === input.versionNumber) {
        throw new Error(`Version number ${input.versionNumber} already exists for MCP server ${input.mcpServerId}`);
      }
    }
    const version = {
      ...input,
      createdAt: /* @__PURE__ */ new Date()
    };
    this.db.mcpServerVersions.set(input.id, this.deepCopyVersion(version));
    return this.deepCopyVersion(version);
  }
  async getVersion(id) {
    const version = this.db.mcpServerVersions.get(id);
    return version ? this.deepCopyVersion(version) : null;
  }
  async getVersionByNumber(mcpServerId, versionNumber) {
    for (const version of this.db.mcpServerVersions.values()) {
      if (version.mcpServerId === mcpServerId && version.versionNumber === versionNumber) {
        return this.deepCopyVersion(version);
      }
    }
    return null;
  }
  async getLatestVersion(mcpServerId) {
    let latest = null;
    for (const version of this.db.mcpServerVersions.values()) {
      if (version.mcpServerId === mcpServerId) {
        if (!latest || version.versionNumber > latest.versionNumber) {
          latest = version;
        }
      }
    }
    return latest ? this.deepCopyVersion(latest) : null;
  }
  async listVersions(input) {
    const { mcpServerId, page = 0, perPage: perPageInput, orderBy } = input;
    const { field, direction } = this.parseVersionOrderBy(orderBy);
    const perPage = normalizePerPage(perPageInput, 20);
    if (page < 0) {
      throw new Error("page must be >= 0");
    }
    const maxOffset = Number.MAX_SAFE_INTEGER / 2;
    if (page * perPage > maxOffset) {
      throw new Error("page value too large");
    }
    let versions = Array.from(this.db.mcpServerVersions.values()).filter((v) => v.mcpServerId === mcpServerId);
    versions = this.sortVersions(versions, field, direction);
    const clonedVersions = versions.map((v) => this.deepCopyVersion(v));
    const total = clonedVersions.length;
    const { offset, perPage: perPageForResponse } = calculatePagination(page, perPageInput, perPage);
    const paginatedVersions = clonedVersions.slice(offset, offset + perPage);
    return {
      versions: paginatedVersions,
      total,
      page,
      perPage: perPageForResponse,
      hasMore: offset + perPage < total
    };
  }
  async deleteVersion(id) {
    this.db.mcpServerVersions.delete(id);
  }
  async deleteVersionsByParentId(entityId) {
    const idsToDelete = [];
    for (const [id, version] of this.db.mcpServerVersions.entries()) {
      if (version.mcpServerId === entityId) {
        idsToDelete.push(id);
      }
    }
    for (const id of idsToDelete) {
      this.db.mcpServerVersions.delete(id);
    }
  }
  async countVersions(mcpServerId) {
    let count = 0;
    for (const version of this.db.mcpServerVersions.values()) {
      if (version.mcpServerId === mcpServerId) {
        count++;
      }
    }
    return count;
  }
  // ==========================================================================
  // Private Helper Methods
  // ==========================================================================
  deepCopyConfig(config) {
    return {
      ...config,
      metadata: config.metadata ? { ...config.metadata } : config.metadata
    };
  }
  deepCopyVersion(version) {
    return {
      ...version,
      tools: version.tools ? JSON.parse(JSON.stringify(version.tools)) : version.tools,
      agents: version.agents ? JSON.parse(JSON.stringify(version.agents)) : version.agents,
      workflows: version.workflows ? JSON.parse(JSON.stringify(version.workflows)) : version.workflows,
      repository: version.repository ? { ...version.repository } : version.repository,
      changedFields: version.changedFields ? [...version.changedFields] : version.changedFields
    };
  }
  sortConfigs(configs, field, direction) {
    return configs.sort((a, b) => {
      const aValue = a[field].getTime();
      const bValue = b[field].getTime();
      return direction === "ASC" ? aValue - bValue : bValue - aValue;
    });
  }
  sortVersions(versions, field, direction) {
    return versions.sort((a, b) => {
      let aVal;
      let bVal;
      if (field === "createdAt") {
        aVal = a.createdAt.getTime();
        bVal = b.createdAt.getTime();
      } else {
        aVal = a.versionNumber;
        bVal = b.versionNumber;
      }
      return direction === "ASC" ? aVal - bVal : bVal - aVal;
    });
  }
};

// src/storage/domains/memory/base.ts
function isPlainObj(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
var SAFE_METADATA_KEY_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
var MAX_METADATA_KEY_LENGTH = 128;
var DISALLOWED_METADATA_KEYS = /* @__PURE__ */ new Set(["__proto__", "prototype", "constructor"]);
var MemoryStorage = class extends StorageDomain {
  /**
   * Whether this storage adapter supports Observational Memory.
   * Adapters that implement OM methods should set this to true.
   * Defaults to false for backwards compatibility with custom adapters.
   */
  supportsObservationalMemory = false;
  constructor() {
    super({
      component: "STORAGE",
      name: "MEMORY"
    });
  }
  /**
   * List messages by resource ID only (across all threads).
   * Used by Observational Memory and LongMemEval for resource-scoped queries.
   *
   * @param args - Resource ID and pagination/filtering options
   * @returns Paginated list of messages for the resource
   */
  async listMessagesByResourceId(_args) {
    throw new Error(
      `Resource-scoped message listing is not implemented by this storage adapter (${this.constructor.name}). Use an adapter that supports Observational Memory (pg, libsql, mongodb) or disable observational memory.`
    );
  }
  async deleteMessages(_messageIds) {
    throw new Error(
      `Message deletion is not supported by this storage adapter (${this.constructor.name}). The deleteMessages method needs to be implemented in the storage adapter.`
    );
  }
  /**
   * Clone a thread and its messages to create a new independent thread.
   * The cloned thread will have clone metadata stored in its metadata field.
   *
   * @param args - Clone configuration options
   * @returns The newly created thread and the cloned messages
   */
  async cloneThread(_args) {
    throw new Error(
      `Thread cloning is not implemented by this storage adapter (${this.constructor.name}). The cloneThread method needs to be implemented in the storage adapter.`
    );
  }
  async getResourceById(_) {
    throw new Error(
      `Resource working memory is not implemented by this storage adapter (${this.constructor.name}). This is likely a bug - all Mastra storage adapters should implement resource support. Please report this issue at https://github.com/mastra-ai/mastra/issues`
    );
  }
  async saveResource(_) {
    throw new Error(
      `Resource working memory is not implemented by this storage adapter (${this.constructor.name}). This is likely a bug - all Mastra storage adapters should implement resource support. Please report this issue at https://github.com/mastra-ai/mastra/issues`
    );
  }
  async updateResource(_) {
    throw new Error(
      `Resource working memory is not implemented by this storage adapter (${this.constructor.name}). This is likely a bug - all Mastra storage adapters should implement resource support. Please report this issue at https://github.com/mastra-ai/mastra/issues`
    );
  }
  parseOrderBy(orderBy, defaultDirection = "DESC") {
    return {
      field: orderBy?.field && orderBy.field in THREAD_ORDER_BY_SET ? orderBy.field : "createdAt",
      direction: orderBy?.direction && orderBy.direction in THREAD_THREAD_SORT_DIRECTION_SET ? orderBy.direction : defaultDirection
    };
  }
  // ============================================
  // Observational Memory Methods
  // ============================================
  /**
   * Get the current observational memory record for a thread/resource.
   * Returns the most recent active record.
   */
  async getObservationalMemory(_threadId, _resourceId) {
    throw new Error(`Observational memory is not implemented by this storage adapter (${this.constructor.name}).`);
  }
  /**
   * Get observational memory history (previous generations).
   * Returns records in reverse chronological order (newest first).
   */
  async getObservationalMemoryHistory(_threadId, _resourceId, _limit, _options) {
    throw new Error(`Observational memory is not implemented by this storage adapter (${this.constructor.name}).`);
  }
  /**
   * Create a new observational memory record.
   * Called when starting observations for a new thread/resource.
   */
  async initializeObservationalMemory(_input) {
    throw new Error(`Observational memory is not implemented by this storage adapter (${this.constructor.name}).`);
  }
  /**
   * Update active observations.
   * Called when observations are created and immediately activated (no buffering).
   */
  async updateActiveObservations(_input) {
    throw new Error(`Observational memory is not implemented by this storage adapter (${this.constructor.name}).`);
  }
  // ============================================
  // Buffering Methods (for async observation/reflection)
  // These methods support async buffering when `bufferTokens` is configured.
  // ============================================
  /**
   * Update buffered observations.
   * Called when observations are created asynchronously via `bufferTokens`.
   */
  async updateBufferedObservations(_input) {
    throw new Error(`Observational memory is not implemented by this storage adapter (${this.constructor.name}).`);
  }
  /**
   * Swap buffered observations to active.
   * Atomic operation that:
   * 1. Appends bufferedObservations → activeObservations (based on activationRatio)
   * 2. Moves activated bufferedMessageIds → observedMessageIds
   * 3. Keeps remaining buffered content if activationRatio < 100
   * 4. Updates lastObservedAt
   *
   * Returns info about what was activated for UI feedback.
   */
  async swapBufferedToActive(_input) {
    throw new Error(`Observational memory is not implemented by this storage adapter (${this.constructor.name}).`);
  }
  /**
   * Create a new generation from a reflection.
   * Creates a new record with:
   * - originType: 'reflection'
   * - activeObservations containing the reflection
   * - generationCount incremented from the current record
   */
  async createReflectionGeneration(_input) {
    throw new Error(`Observational memory is not implemented by this storage adapter (${this.constructor.name}).`);
  }
  /**
   * Update buffered reflection (async reflection in progress).
   * Called when reflection runs asynchronously via `bufferTokens`.
   */
  async updateBufferedReflection(_input) {
    throw new Error(`Observational memory is not implemented by this storage adapter (${this.constructor.name}).`);
  }
  /**
   * Swap buffered reflection to active observations.
   * Creates a new generation where activeObservations = bufferedReflection + unreflected observations.
   * The `tokenCount` in input is the processor-computed token count for the combined content.
   */
  async swapBufferedReflectionToActive(_input) {
    throw new Error(`Observational memory is not implemented by this storage adapter (${this.constructor.name}).`);
  }
  /**
   * Set the isReflecting flag.
   */
  async setReflectingFlag(_id, _isReflecting) {
    throw new Error(`Observational memory is not implemented by this storage adapter (${this.constructor.name}).`);
  }
  /**
   * Set the isObserving flag.
   */
  async setObservingFlag(_id, _isObserving) {
    throw new Error(`Observational memory is not implemented by this storage adapter (${this.constructor.name}).`);
  }
  /**
   * Set the isBufferingObservation flag and update lastBufferedAtTokens.
   * Called when async observation buffering starts (true) or ends/fails (false).
   * @param id - Record ID
   * @param isBuffering - Whether buffering is in progress
   * @param lastBufferedAtTokens - The pending token count at which this buffer was triggered (only set when isBuffering=true)
   */
  async setBufferingObservationFlag(_id, _isBuffering, _lastBufferedAtTokens) {
    throw new Error(`Observational memory is not implemented by this storage adapter (${this.constructor.name}).`);
  }
  /**
   * Set the isBufferingReflection flag.
   * Called when async reflection buffering starts (true) or ends/fails (false).
   */
  async setBufferingReflectionFlag(_id, _isBuffering) {
    throw new Error(`Observational memory is not implemented by this storage adapter (${this.constructor.name}).`);
  }
  /**
   * Insert a fully-formed observational memory record.
   * Used by thread cloning to copy OM state with remapped IDs.
   */
  async insertObservationalMemoryRecord(_record) {
    throw new Error(`Observational memory is not implemented by this storage adapter (${this.constructor.name}).`);
  }
  /**
   * Clear all observational memory for a thread/resource.
   * Removes all records and history.
   */
  async clearObservationalMemory(_threadId, _resourceId) {
    throw new Error(`Observational memory is not implemented by this storage adapter (${this.constructor.name}).`);
  }
  /**
   * Set the pending message token count.
   * Called at the end of each OM processing step to persist the current
   * context window token count so the UI can display it on page load.
   */
  async setPendingMessageTokens(_id, _tokenCount) {
    throw new Error(`Observational memory is not implemented by this storage adapter (${this.constructor.name}).`);
  }
  /**
   * Update the config of an existing observational memory record.
   * The provided config is deep-merged into the record's existing config.
   */
  async updateObservationalMemoryConfig(_input) {
    throw new Error(`Observational memory is not implemented by this storage adapter (${this.constructor.name}).`);
  }
  /**
   * Deep-merge two plain objects. Available for subclasses to merge
   * partial config overrides into existing record configs.
   */
  deepMergeConfig(target, source) {
    const output = { ...target };
    for (const key of Object.keys(source)) {
      const tVal = target[key];
      const sVal = source[key];
      if (isPlainObj(tVal) && isPlainObj(sVal)) {
        output[key] = this.deepMergeConfig(tVal, sVal);
      } else if (sVal !== void 0) {
        output[key] = sVal;
      }
    }
    return output;
  }
  /**
   * Validates metadata keys to prevent SQL injection attacks and prototype pollution.
   * Keys must start with a letter or underscore, followed by alphanumeric characters or underscores.
   * @param metadata - The metadata object to validate
   * @throws Error if any key contains invalid characters or is a disallowed key
   */
  validateMetadataKeys(metadata) {
    if (!metadata) return;
    for (const key of Object.keys(metadata)) {
      if (DISALLOWED_METADATA_KEYS.has(key)) {
        throw new Error(`Invalid metadata key: "${key}".`);
      }
      if (!SAFE_METADATA_KEY_PATTERN.test(key)) {
        throw new Error(
          `Invalid metadata key: "${key}". Keys must start with a letter or underscore and contain only alphanumeric characters and underscores.`
        );
      }
      if (key.length > MAX_METADATA_KEY_LENGTH) {
        throw new Error(`Metadata key "${key}" exceeds maximum length of ${MAX_METADATA_KEY_LENGTH} characters.`);
      }
    }
  }
  /**
   * Validates pagination parameters and returns safe offset.
   * @param page - Page number (0-indexed)
   * @param perPage - Items per page (0 is allowed and returns empty results)
   * @throws Error if page is negative, perPage is negative/invalid, or offset would overflow
   */
  validatePagination(page, perPage) {
    if (!Number.isFinite(page) || !Number.isSafeInteger(page) || page < 0) {
      throw new Error("page must be >= 0");
    }
    if (!Number.isFinite(perPage) || !Number.isSafeInteger(perPage) || perPage < 0) {
      throw new Error("perPage must be >= 0");
    }
    if (perPage === 0) {
      return;
    }
    const offset = page * perPage;
    if (!Number.isSafeInteger(offset) || offset > Number.MAX_SAFE_INTEGER) {
      throw new Error("page value too large");
    }
  }
  /**
   * Validates pagination input before normalization.
   * Use this when accepting raw perPageInput (number | false) from callers.
   *
   * When perPage is false (fetch all), page must be 0 since pagination is disabled.
   * When perPage is a number, delegates to validatePagination for full validation.
   *
   * @param page - Page number (0-indexed)
   * @param perPageInput - Items per page as number, or false to fetch all results
   * @throws Error if perPageInput is false and page !== 0
   * @throws Error if perPageInput is invalid (not false or a non-negative safe integer)
   * @throws Error if page is invalid or offset would overflow
   */
  validatePaginationInput(page, perPageInput) {
    if (perPageInput !== false) {
      if (typeof perPageInput !== "number" || !Number.isFinite(perPageInput) || !Number.isSafeInteger(perPageInput)) {
        throw new Error("perPage must be false or a safe integer");
      }
      if (perPageInput < 0) {
        throw new Error("perPage must be >= 0");
      }
    }
    if (perPageInput === false) {
      if (page !== 0) {
        throw new Error("page must be 0 when perPage is false");
      }
      if (!Number.isFinite(page) || !Number.isSafeInteger(page)) {
        throw new Error("page must be >= 0");
      }
      return;
    }
    this.validatePagination(page, perPageInput);
  }
};
var THREAD_ORDER_BY_SET = {
  createdAt: true,
  updatedAt: true
};
var THREAD_THREAD_SORT_DIRECTION_SET = {
  ASC: true,
  DESC: true
};

// src/storage/domains/memory/inmemory.ts
var InMemoryMemory = class extends MemoryStorage {
  supportsObservationalMemory = true;
  db;
  constructor({ db }) {
    super();
    this.db = db;
  }
  async dangerouslyClearAll() {
    this.db.threads.clear();
    this.db.messages.clear();
    this.db.resources.clear();
    this.db.observationalMemory.clear();
  }
  async getThreadById({ threadId }) {
    const thread = this.db.threads.get(threadId);
    return thread ? { ...thread, metadata: thread.metadata ? { ...thread.metadata } : thread.metadata } : null;
  }
  async saveThread({ thread }) {
    const key = thread.id;
    this.db.threads.set(key, thread);
    return thread;
  }
  async updateThread({
    id,
    title,
    metadata
  }) {
    const thread = this.db.threads.get(id);
    if (!thread) {
      throw new Error(`Thread with id ${id} not found`);
    }
    if (thread) {
      thread.title = title;
      thread.metadata = { ...thread.metadata, ...metadata };
      thread.updatedAt = /* @__PURE__ */ new Date();
    }
    return thread;
  }
  async deleteThread({ threadId }) {
    this.db.threads.delete(threadId);
    this.db.messages.forEach((msg, key) => {
      if (msg.thread_id === threadId) {
        this.db.messages.delete(key);
      }
    });
  }
  async listMessages({
    threadId,
    resourceId: optionalResourceId,
    include,
    filter,
    perPage: perPageInput,
    page = 0,
    orderBy
  }) {
    const threadIds = Array.isArray(threadId) ? threadId : [threadId];
    if (threadIds.length === 0 || threadIds.some((id) => !id.trim())) {
      throw new Error("threadId must be a non-empty string or array of non-empty strings");
    }
    const threadIdSet = new Set(threadIds);
    const { field, direction } = this.parseOrderBy(orderBy, "ASC");
    const perPage = normalizePerPage(perPageInput, 40);
    if (page < 0) {
      throw new Error("page must be >= 0");
    }
    const maxOffset = Number.MAX_SAFE_INTEGER / 2;
    if (page * perPage > maxOffset) {
      throw new Error("page value too large");
    }
    const { offset, perPage: perPageForResponse } = calculatePagination(page, perPageInput, perPage);
    let threadMessages = Array.from(this.db.messages.values()).filter((msg) => {
      if (threadIdSet && !threadIdSet.has(msg.thread_id)) return false;
      if (optionalResourceId && msg.resourceId !== optionalResourceId) return false;
      return true;
    });
    threadMessages = filterByDateRange(threadMessages, (msg) => new Date(msg.createdAt), filter?.dateRange);
    threadMessages.sort((a, b) => {
      const isDateField = field === "createdAt" || field === "updatedAt";
      const aValue = isDateField ? new Date(a[field]).getTime() : a[field];
      const bValue = isDateField ? new Date(b[field]).getTime() : b[field];
      if (typeof aValue === "number" && typeof bValue === "number") {
        return direction === "ASC" ? aValue - bValue : bValue - aValue;
      }
      return direction === "ASC" ? String(aValue).localeCompare(String(bValue)) : String(bValue).localeCompare(String(aValue));
    });
    const totalThreadMessages = threadMessages.length;
    const start = offset;
    const end = start + perPage;
    const paginatedThreadMessages = threadMessages.slice(start, end);
    const messages = [];
    const messageIds = /* @__PURE__ */ new Set();
    for (const msg of paginatedThreadMessages) {
      const convertedMessage = this.parseStoredMessage(msg);
      messages.push(convertedMessage);
      messageIds.add(msg.id);
    }
    if (include && include.length > 0) {
      for (const includeItem of include) {
        const targetMessage = this.db.messages.get(includeItem.id);
        if (targetMessage) {
          const convertedMessage = {
            id: targetMessage.id,
            threadId: targetMessage.thread_id,
            content: safelyParseJSON(targetMessage.content),
            role: targetMessage.role,
            type: targetMessage.type,
            createdAt: targetMessage.createdAt,
            resourceId: targetMessage.resourceId
          };
          if (!messageIds.has(convertedMessage.id)) {
            messages.push(convertedMessage);
            messageIds.add(convertedMessage.id);
          }
          if (includeItem.withPreviousMessages) {
            const allThreadMessages = Array.from(this.db.messages.values()).filter((msg) => msg.thread_id === (includeItem.threadId || threadId)).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
            const targetIndex = allThreadMessages.findIndex((msg) => msg.id === includeItem.id);
            if (targetIndex !== -1) {
              const startIndex = Math.max(0, targetIndex - (includeItem.withPreviousMessages || 0));
              for (let i = startIndex; i < targetIndex; i++) {
                const message = allThreadMessages[i];
                if (message && !messageIds.has(message.id)) {
                  const convertedPrevMessage = {
                    id: message.id,
                    threadId: message.thread_id,
                    content: safelyParseJSON(message.content),
                    role: message.role,
                    type: message.type,
                    createdAt: message.createdAt,
                    resourceId: message.resourceId
                  };
                  messages.push(convertedPrevMessage);
                  messageIds.add(message.id);
                }
              }
            }
          }
          if (includeItem.withNextMessages) {
            const allThreadMessages = Array.from(this.db.messages.values()).filter((msg) => msg.thread_id === (includeItem.threadId || threadId)).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
            const targetIndex = allThreadMessages.findIndex((msg) => msg.id === includeItem.id);
            if (targetIndex !== -1) {
              const endIndex = Math.min(
                allThreadMessages.length,
                targetIndex + (includeItem.withNextMessages || 0) + 1
              );
              for (let i = targetIndex + 1; i < endIndex; i++) {
                const message = allThreadMessages[i];
                if (message && !messageIds.has(message.id)) {
                  const convertedNextMessage = {
                    id: message.id,
                    threadId: message.thread_id,
                    content: safelyParseJSON(message.content),
                    role: message.role,
                    type: message.type,
                    createdAt: message.createdAt,
                    resourceId: message.resourceId
                  };
                  messages.push(convertedNextMessage);
                  messageIds.add(message.id);
                }
              }
            }
          }
        }
      }
    }
    messages.sort((a, b) => {
      const isDateField = field === "createdAt" || field === "updatedAt";
      const aValue = isDateField ? new Date(a[field]).getTime() : a[field];
      const bValue = isDateField ? new Date(b[field]).getTime() : b[field];
      if (typeof aValue === "number" && typeof bValue === "number") {
        return direction === "ASC" ? aValue - bValue : bValue - aValue;
      }
      return direction === "ASC" ? String(aValue).localeCompare(String(bValue)) : String(bValue).localeCompare(String(aValue));
    });
    let hasMore;
    if (include && include.length > 0) {
      const returnedThreadMessageIds = new Set(messages.filter((m) => m.threadId === threadId).map((m) => m.id));
      hasMore = returnedThreadMessageIds.size < totalThreadMessages;
    } else {
      hasMore = end < totalThreadMessages;
    }
    return {
      messages,
      total: totalThreadMessages,
      page,
      perPage: perPageForResponse,
      hasMore
    };
  }
  async listMessagesByResourceId({
    resourceId,
    filter,
    perPage: perPageInput,
    page = 0,
    orderBy
  }) {
    const { field, direction } = this.parseOrderBy(orderBy, "ASC");
    const perPage = normalizePerPage(perPageInput, 40);
    if (page < 0) {
      throw new Error("page must be >= 0");
    }
    const maxOffset = Number.MAX_SAFE_INTEGER / 2;
    if (page * perPage > maxOffset) {
      throw new Error("page value too large");
    }
    const { offset, perPage: perPageForResponse } = calculatePagination(page, perPageInput, perPage);
    let messages = Array.from(this.db.messages.values()).filter((msg) => msg.resourceId === resourceId);
    messages = filterByDateRange(messages, (msg) => new Date(msg.createdAt), filter?.dateRange);
    messages.sort((a, b) => {
      const isDateField = field === "createdAt" || field === "updatedAt";
      const aValue = isDateField ? new Date(a[field]).getTime() : a[field];
      const bValue = isDateField ? new Date(b[field]).getTime() : b[field];
      if (typeof aValue === "number" && typeof bValue === "number") {
        return direction === "ASC" ? aValue - bValue : bValue - aValue;
      }
      return direction === "ASC" ? String(aValue).localeCompare(String(bValue)) : String(bValue).localeCompare(String(aValue));
    });
    const total = messages.length;
    const paginatedMessages = messages.slice(offset, offset + perPage);
    const list = new MessageList().add(
      paginatedMessages.map((m) => this.parseStoredMessage(m)),
      "memory"
    );
    const hasMore = offset + paginatedMessages.length < total;
    return {
      messages: list.get.all.db(),
      total,
      page,
      perPage: perPageForResponse,
      hasMore
    };
  }
  parseStoredMessage(message) {
    const { resourceId, content, role, thread_id, ...rest } = message;
    let parsedContent = safelyParseJSON(content);
    if (typeof parsedContent === "string") {
      parsedContent = {
        format: 2,
        content: parsedContent,
        parts: [{ type: "text", text: parsedContent }]
      };
    }
    return {
      ...rest,
      threadId: thread_id,
      ...message.resourceId && { resourceId: message.resourceId },
      content: parsedContent,
      role
    };
  }
  async listMessagesById({ messageIds }) {
    const rawMessages = messageIds.map((id) => this.db.messages.get(id)).filter((message) => !!message);
    const list = new MessageList().add(
      rawMessages.map((m) => this.parseStoredMessage(m)),
      "memory"
    );
    return { messages: list.get.all.db() };
  }
  async saveMessages(args) {
    const { messages } = args;
    if (messages.some((msg) => msg.id === "error-message" || msg.resourceId === null)) {
      throw new Error("Simulated error for testing");
    }
    const threadIds = new Set(messages.map((msg) => msg.threadId).filter((id) => Boolean(id)));
    for (const threadId of threadIds) {
      const thread = this.db.threads.get(threadId);
      if (thread) {
        thread.updatedAt = /* @__PURE__ */ new Date();
      }
    }
    for (const message of messages) {
      const key = message.id;
      const storageMessage = {
        id: message.id,
        thread_id: message.threadId || "",
        content: JSON.stringify(message.content),
        role: message.role || "user",
        type: message.type || "text",
        createdAt: message.createdAt,
        resourceId: message.resourceId || null
      };
      this.db.messages.set(key, storageMessage);
    }
    const list = new MessageList().add(messages, "memory");
    return { messages: list.get.all.db() };
  }
  async updateMessages(args) {
    const updatedMessages = [];
    for (const update of args.messages) {
      const storageMsg = this.db.messages.get(update.id);
      if (!storageMsg) continue;
      const oldThreadId = storageMsg.thread_id;
      const newThreadId = update.threadId || oldThreadId;
      let threadIdChanged = false;
      if (update.threadId && update.threadId !== oldThreadId) {
        threadIdChanged = true;
      }
      if (update.role !== void 0) storageMsg.role = update.role;
      if (update.type !== void 0) storageMsg.type = update.type;
      if (update.createdAt !== void 0) storageMsg.createdAt = update.createdAt;
      if (update.resourceId !== void 0) storageMsg.resourceId = update.resourceId;
      if (update.content !== void 0) {
        let oldContent = safelyParseJSON(storageMsg.content);
        let newContent = update.content;
        if (typeof newContent === "object" && typeof oldContent === "object") {
          newContent = { ...oldContent, ...newContent };
          if (oldContent.metadata && newContent.metadata) {
            newContent.metadata = { ...oldContent.metadata, ...newContent.metadata };
          }
        }
        storageMsg.content = JSON.stringify(newContent);
      }
      if (threadIdChanged) {
        storageMsg.thread_id = newThreadId;
        const base = Date.now();
        let oldThreadNewTime;
        const oldThread = this.db.threads.get(oldThreadId);
        if (oldThread) {
          const prev = new Date(oldThread.updatedAt).getTime();
          oldThreadNewTime = Math.max(base, prev + 1);
          oldThread.updatedAt = new Date(oldThreadNewTime);
        }
        const newThread = this.db.threads.get(newThreadId);
        if (newThread) {
          const prev = new Date(newThread.updatedAt).getTime();
          let newThreadNewTime = Math.max(base + 1, prev + 1);
          if (oldThreadNewTime !== void 0 && newThreadNewTime <= oldThreadNewTime) {
            newThreadNewTime = oldThreadNewTime + 1;
          }
          newThread.updatedAt = new Date(newThreadNewTime);
        }
      } else {
        const thread = this.db.threads.get(oldThreadId);
        if (thread) {
          const prev = new Date(thread.updatedAt).getTime();
          let newTime = Date.now();
          if (newTime <= prev) newTime = prev + 1;
          thread.updatedAt = new Date(newTime);
        }
      }
      this.db.messages.set(update.id, storageMsg);
      updatedMessages.push({
        id: storageMsg.id,
        threadId: storageMsg.thread_id,
        content: safelyParseJSON(storageMsg.content),
        role: storageMsg.role === "user" || storageMsg.role === "assistant" ? storageMsg.role : "user",
        type: storageMsg.type,
        createdAt: storageMsg.createdAt,
        resourceId: storageMsg.resourceId === null ? void 0 : storageMsg.resourceId
      });
    }
    return updatedMessages;
  }
  async deleteMessages(messageIds) {
    if (!messageIds || messageIds.length === 0) {
      return;
    }
    const threadIds = /* @__PURE__ */ new Set();
    for (const messageId of messageIds) {
      const message = this.db.messages.get(messageId);
      if (message && message.thread_id) {
        threadIds.add(message.thread_id);
      }
      this.db.messages.delete(messageId);
    }
    const now = /* @__PURE__ */ new Date();
    for (const threadId of threadIds) {
      const thread = this.db.threads.get(threadId);
      if (thread) {
        thread.updatedAt = now;
      }
    }
  }
  async listThreads(args) {
    const { page = 0, perPage: perPageInput, orderBy, filter } = args;
    const { field, direction } = this.parseOrderBy(orderBy);
    this.validatePaginationInput(page, perPageInput ?? 100);
    const perPage = normalizePerPage(perPageInput, 100);
    let threads = Array.from(this.db.threads.values());
    if (filter?.resourceId) {
      threads = threads.filter((t) => t.resourceId === filter.resourceId);
    }
    this.validateMetadataKeys(filter?.metadata);
    if (filter?.metadata && Object.keys(filter.metadata).length > 0) {
      threads = threads.filter((thread) => {
        if (!thread.metadata) return false;
        return Object.entries(filter.metadata).every(([key, value]) => jsonValueEquals(thread.metadata[key], value));
      });
    }
    const sortedThreads = this.sortThreads(threads, field, direction);
    const clonedThreads = sortedThreads.map((thread) => ({
      ...thread,
      metadata: thread.metadata ? { ...thread.metadata } : thread.metadata
    }));
    const { offset, perPage: perPageForResponse } = calculatePagination(page, perPageInput, perPage);
    return {
      threads: clonedThreads.slice(offset, offset + perPage),
      total: clonedThreads.length,
      page,
      perPage: perPageForResponse,
      hasMore: offset + perPage < clonedThreads.length
    };
  }
  async getResourceById({ resourceId }) {
    const resource = this.db.resources.get(resourceId);
    return resource ? { ...resource, metadata: resource.metadata ? { ...resource.metadata } : resource.metadata } : null;
  }
  async saveResource({ resource }) {
    this.db.resources.set(resource.id, resource);
    return resource;
  }
  async updateResource({
    resourceId,
    workingMemory,
    metadata
  }) {
    let resource = this.db.resources.get(resourceId);
    if (!resource) {
      resource = {
        id: resourceId,
        workingMemory,
        metadata: metadata || {},
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      };
    } else {
      resource = {
        ...resource,
        workingMemory: workingMemory !== void 0 ? workingMemory : resource.workingMemory,
        metadata: {
          ...resource.metadata,
          ...metadata
        },
        updatedAt: /* @__PURE__ */ new Date()
      };
    }
    this.db.resources.set(resourceId, resource);
    return resource;
  }
  async cloneThread(args) {
    const { sourceThreadId, newThreadId: providedThreadId, resourceId, title, metadata, options } = args;
    const sourceThread = this.db.threads.get(sourceThreadId);
    if (!sourceThread) {
      throw new Error(`Source thread with id ${sourceThreadId} not found`);
    }
    const newThreadId = providedThreadId || crypto.randomUUID();
    if (this.db.threads.has(newThreadId)) {
      throw new Error(`Thread with id ${newThreadId} already exists`);
    }
    let sourceMessages = Array.from(this.db.messages.values()).filter((msg) => msg.thread_id === sourceThreadId).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    if (options?.messageFilter) {
      const { startDate, endDate, messageIds } = options.messageFilter;
      if (messageIds && messageIds.length > 0) {
        const messageIdSet = new Set(messageIds);
        sourceMessages = sourceMessages.filter((msg) => messageIdSet.has(msg.id));
      }
      if (startDate) {
        sourceMessages = sourceMessages.filter((msg) => new Date(msg.createdAt) >= startDate);
      }
      if (endDate) {
        sourceMessages = sourceMessages.filter((msg) => new Date(msg.createdAt) <= endDate);
      }
    }
    if (options?.messageLimit && options.messageLimit > 0 && sourceMessages.length > options.messageLimit) {
      sourceMessages = sourceMessages.slice(-options.messageLimit);
    }
    const now = /* @__PURE__ */ new Date();
    const lastMessageId = sourceMessages.length > 0 ? sourceMessages[sourceMessages.length - 1].id : void 0;
    const cloneMetadata = {
      sourceThreadId,
      clonedAt: now,
      ...lastMessageId && { lastMessageId }
    };
    const newThread = {
      id: newThreadId,
      resourceId: resourceId || sourceThread.resourceId,
      title: title || (sourceThread.title ? `Clone of ${sourceThread.title}` : void 0),
      metadata: {
        ...metadata,
        clone: cloneMetadata
      },
      createdAt: now,
      updatedAt: now
    };
    this.db.threads.set(newThreadId, newThread);
    const clonedMessages = [];
    const messageIdMap = {};
    for (const sourceMsg of sourceMessages) {
      const newMessageId = crypto.randomUUID();
      messageIdMap[sourceMsg.id] = newMessageId;
      const parsedContent = safelyParseJSON(sourceMsg.content);
      const newStorageMessage = {
        id: newMessageId,
        thread_id: newThreadId,
        content: sourceMsg.content,
        role: sourceMsg.role,
        type: sourceMsg.type,
        createdAt: sourceMsg.createdAt,
        resourceId: resourceId || sourceMsg.resourceId
      };
      this.db.messages.set(newMessageId, newStorageMessage);
      clonedMessages.push({
        id: newMessageId,
        threadId: newThreadId,
        content: parsedContent,
        role: sourceMsg.role,
        type: sourceMsg.type,
        createdAt: sourceMsg.createdAt,
        resourceId: resourceId || sourceMsg.resourceId || void 0
      });
    }
    return {
      thread: newThread,
      clonedMessages,
      messageIdMap
    };
  }
  sortThreads(threads, field, direction) {
    return threads.sort((a, b) => {
      const isDateField = field === "createdAt" || field === "updatedAt";
      const aValue = isDateField ? new Date(a[field]).getTime() : a[field];
      const bValue = isDateField ? new Date(b[field]).getTime() : b[field];
      if (typeof aValue === "number" && typeof bValue === "number") {
        if (direction === "ASC") {
          return aValue - bValue;
        } else {
          return bValue - aValue;
        }
      }
      return direction === "ASC" ? String(aValue).localeCompare(String(bValue)) : String(bValue).localeCompare(String(aValue));
    });
  }
  // ============================================
  // Observational Memory Implementation
  // ============================================
  getObservationalMemoryKey(threadId, resourceId) {
    if (threadId) {
      return `thread:${threadId}`;
    }
    return `resource:${resourceId}`;
  }
  async getObservationalMemory(threadId, resourceId) {
    const key = this.getObservationalMemoryKey(threadId, resourceId);
    const records = this.db.observationalMemory.get(key);
    return records?.[0] ?? null;
  }
  async getObservationalMemoryHistory(threadId, resourceId, limit, options) {
    const key = this.getObservationalMemoryKey(threadId, resourceId);
    let records = this.db.observationalMemory.get(key) ?? [];
    if (options?.from) {
      records = records.filter((r) => r.createdAt >= options.from);
    }
    if (options?.to) {
      records = records.filter((r) => r.createdAt <= options.to);
    }
    if (options?.offset != null) {
      records = records.slice(options.offset);
    }
    return limit != null ? records.slice(0, limit) : records;
  }
  async initializeObservationalMemory(input) {
    const { threadId, resourceId, scope, config, observedTimezone } = input;
    const key = this.getObservationalMemoryKey(threadId, resourceId);
    const now = /* @__PURE__ */ new Date();
    const record = {
      id: crypto.randomUUID(),
      scope,
      threadId,
      resourceId,
      // Timestamps at top level
      createdAt: now,
      updatedAt: now,
      // lastObservedAt starts undefined - all messages are "unobserved" initially
      // This ensures historical data (like LongMemEval fixtures) works correctly
      lastObservedAt: void 0,
      originType: "initial",
      generationCount: 0,
      activeObservations: "",
      // Buffering (for async observation/reflection)
      bufferedObservations: void 0,
      bufferedReflection: void 0,
      // Message tracking
      // Note: Message ID tracking removed in favor of cursor-based lastObservedAt
      // Token tracking
      totalTokensObserved: 0,
      observationTokenCount: 0,
      pendingMessageTokens: 0,
      // State flags
      isReflecting: false,
      isObserving: false,
      isBufferingObservation: false,
      isBufferingReflection: false,
      lastBufferedAtTokens: 0,
      lastBufferedAtTime: null,
      // Configuration
      config,
      // Timezone used for observation date formatting
      observedTimezone,
      // Extensible metadata (optional)
      metadata: {}
    };
    const existing = this.db.observationalMemory.get(key) ?? [];
    this.db.observationalMemory.set(key, [record, ...existing]);
    return record;
  }
  async insertObservationalMemoryRecord(record) {
    const key = this.getObservationalMemoryKey(record.threadId, record.resourceId);
    const existing = this.db.observationalMemory.get(key) ?? [];
    let inserted = false;
    for (let i = 0; i < existing.length; i++) {
      if (record.generationCount >= existing[i].generationCount) {
        existing.splice(i, 0, record);
        inserted = true;
        break;
      }
    }
    if (!inserted) existing.push(record);
    this.db.observationalMemory.set(key, existing);
  }
  async updateActiveObservations(input) {
    const { id, observations, tokenCount, lastObservedAt, observedMessageIds } = input;
    const record = this.findObservationalMemoryRecordById(id);
    if (!record) {
      throw new Error(`Observational memory record not found: ${id}`);
    }
    record.activeObservations = observations;
    record.observationTokenCount = tokenCount;
    record.totalTokensObserved += tokenCount;
    record.pendingMessageTokens = 0;
    record.lastObservedAt = lastObservedAt;
    record.updatedAt = /* @__PURE__ */ new Date();
    if (observedMessageIds) {
      record.observedMessageIds = observedMessageIds;
    }
  }
  async updateBufferedObservations(input) {
    const { id, chunk } = input;
    const record = this.findObservationalMemoryRecordById(id);
    if (!record) {
      throw new Error(`Observational memory record not found: ${id}`);
    }
    const newChunk = {
      id: `ombuf-${crypto.randomUUID()}`,
      cycleId: chunk.cycleId,
      observations: chunk.observations,
      tokenCount: chunk.tokenCount,
      messageIds: chunk.messageIds,
      messageTokens: chunk.messageTokens,
      lastObservedAt: chunk.lastObservedAt,
      createdAt: /* @__PURE__ */ new Date(),
      suggestedContinuation: chunk.suggestedContinuation,
      currentTask: chunk.currentTask,
      threadTitle: chunk.threadTitle
    };
    const existingChunks = Array.isArray(record.bufferedObservationChunks) ? record.bufferedObservationChunks : [];
    record.bufferedObservationChunks = [...existingChunks, newChunk];
    if (input.lastBufferedAtTime) {
      record.lastBufferedAtTime = input.lastBufferedAtTime;
    }
    record.updatedAt = /* @__PURE__ */ new Date();
  }
  async swapBufferedToActive(input) {
    const { id, activationRatio, lastObservedAt } = input;
    const record = this.findObservationalMemoryRecordById(id);
    if (!record) {
      throw new Error(`Observational memory record not found: ${id}`);
    }
    const persistedChunks = Array.isArray(record.bufferedObservationChunks) ? record.bufferedObservationChunks : [];
    const chunks = Array.isArray(input.bufferedChunks) ? input.bufferedChunks : persistedChunks;
    if (chunks.length === 0) {
      return {
        chunksActivated: 0,
        messageTokensActivated: 0,
        observationTokensActivated: 0,
        messagesActivated: 0,
        activatedCycleIds: [],
        activatedMessageIds: []
      };
    }
    const retentionFloor = input.messageTokensThreshold * (1 - activationRatio);
    const targetMessageTokens = Math.max(0, input.currentPendingTokens - retentionFloor);
    let cumulativeMessageTokens = 0;
    let bestOverBoundary = 0;
    let bestOverTokens = 0;
    let bestUnderBoundary = 0;
    let bestUnderTokens = 0;
    for (let i = 0; i < chunks.length; i++) {
      cumulativeMessageTokens += chunks[i].messageTokens ?? 0;
      const boundary = i + 1;
      if (cumulativeMessageTokens >= targetMessageTokens) {
        if (bestOverBoundary === 0 || cumulativeMessageTokens < bestOverTokens) {
          bestOverBoundary = boundary;
          bestOverTokens = cumulativeMessageTokens;
        }
      } else {
        if (cumulativeMessageTokens > bestUnderTokens) {
          bestUnderBoundary = boundary;
          bestUnderTokens = cumulativeMessageTokens;
        }
      }
    }
    const maxOvershoot = retentionFloor * 0.95;
    const overshoot = bestOverTokens - targetMessageTokens;
    const remainingAfterOver = input.currentPendingTokens - bestOverTokens;
    const remainingAfterUnder = input.currentPendingTokens - bestUnderTokens;
    const minRemaining = Math.min(1e3, retentionFloor);
    let chunksToActivate;
    if (input.forceMaxActivation && bestOverBoundary > 0 && remainingAfterOver >= minRemaining) {
      chunksToActivate = bestOverBoundary;
    } else if (bestOverBoundary > 0 && overshoot <= maxOvershoot && remainingAfterOver >= minRemaining) {
      chunksToActivate = bestOverBoundary;
    } else if (bestUnderBoundary > 0 && remainingAfterUnder >= minRemaining) {
      chunksToActivate = bestUnderBoundary;
    } else if (bestOverBoundary > 0) {
      chunksToActivate = bestOverBoundary;
    } else {
      chunksToActivate = 1;
    }
    const activatedChunks = chunks.slice(0, chunksToActivate);
    const remainingChunks = chunks.slice(chunksToActivate);
    const activatedContent = activatedChunks.map((c) => c.observations).join("\n\n");
    const activatedTokens = activatedChunks.reduce((sum, c) => sum + c.tokenCount, 0);
    const activatedMessageTokens = activatedChunks.reduce((sum, c) => sum + (c.messageTokens ?? 0), 0);
    const activatedMessageCount = activatedChunks.reduce((sum, c) => sum + c.messageIds.length, 0);
    const activatedCycleIds = activatedChunks.map((c) => c.cycleId).filter((id2) => !!id2);
    const activatedMessageIds = activatedChunks.flatMap((c) => c.messageIds);
    const latestChunk = activatedChunks[activatedChunks.length - 1];
    const derivedLastObservedAt = lastObservedAt ?? (latestChunk?.lastObservedAt ? new Date(latestChunk.lastObservedAt) : /* @__PURE__ */ new Date());
    if (record.activeObservations) {
      const boundary = `

--- message boundary (${derivedLastObservedAt.toISOString()}) ---

`;
      record.activeObservations = `${record.activeObservations}${boundary}${activatedContent}`;
    } else {
      record.activeObservations = activatedContent;
    }
    record.observationTokenCount = (record.observationTokenCount ?? 0) + activatedTokens;
    record.pendingMessageTokens = Math.max(0, (record.pendingMessageTokens ?? 0) - activatedMessageTokens);
    record.bufferedObservationChunks = remainingChunks.length > 0 ? remainingChunks : void 0;
    record.lastObservedAt = derivedLastObservedAt;
    record.updatedAt = /* @__PURE__ */ new Date();
    const latestChunkHints = activatedChunks[activatedChunks.length - 1];
    return {
      chunksActivated: activatedChunks.length,
      messageTokensActivated: activatedMessageTokens,
      observationTokensActivated: activatedTokens,
      messagesActivated: activatedMessageCount,
      activatedCycleIds,
      activatedMessageIds,
      observations: activatedContent,
      perChunk: activatedChunks.map((c) => ({
        cycleId: c.cycleId ?? "",
        messageTokens: c.messageTokens ?? 0,
        observationTokens: c.tokenCount,
        messageCount: c.messageIds.length,
        observations: c.observations
      })),
      suggestedContinuation: latestChunkHints?.suggestedContinuation ?? void 0,
      currentTask: latestChunkHints?.currentTask ?? void 0
    };
  }
  async createReflectionGeneration(input) {
    const { currentRecord, reflection, tokenCount } = input;
    const key = this.getObservationalMemoryKey(currentRecord.threadId, currentRecord.resourceId);
    const now = /* @__PURE__ */ new Date();
    const newRecord = {
      id: crypto.randomUUID(),
      scope: currentRecord.scope,
      threadId: currentRecord.threadId,
      resourceId: currentRecord.resourceId,
      // Timestamps at top level
      createdAt: now,
      updatedAt: now,
      lastObservedAt: currentRecord.lastObservedAt ?? now,
      // Carry over from observation (which always runs before reflection)
      originType: "reflection",
      generationCount: currentRecord.generationCount + 1,
      activeObservations: reflection,
      config: currentRecord.config,
      totalTokensObserved: currentRecord.totalTokensObserved,
      observationTokenCount: tokenCount,
      pendingMessageTokens: 0,
      isReflecting: false,
      isObserving: false,
      isBufferingObservation: false,
      isBufferingReflection: false,
      lastBufferedAtTokens: 0,
      lastBufferedAtTime: null,
      // Timezone used for observation date formatting
      observedTimezone: currentRecord.observedTimezone,
      // Extensible metadata (optional)
      metadata: {}
    };
    const existing = this.db.observationalMemory.get(key) ?? [];
    this.db.observationalMemory.set(key, [newRecord, ...existing]);
    return newRecord;
  }
  async updateBufferedReflection(input) {
    const { id, reflection, tokenCount, inputTokenCount, reflectedObservationLineCount } = input;
    const record = this.findObservationalMemoryRecordById(id);
    if (!record) {
      throw new Error(`Observational memory record not found: ${id}`);
    }
    const existing = record.bufferedReflection || "";
    record.bufferedReflection = existing ? `${existing}

${reflection}` : reflection;
    record.bufferedReflectionTokens = (record.bufferedReflectionTokens || 0) + tokenCount;
    record.bufferedReflectionInputTokens = (record.bufferedReflectionInputTokens || 0) + inputTokenCount;
    record.reflectedObservationLineCount = reflectedObservationLineCount;
    record.updatedAt = /* @__PURE__ */ new Date();
  }
  async swapBufferedReflectionToActive(input) {
    const { currentRecord } = input;
    const record = this.findObservationalMemoryRecordById(currentRecord.id);
    if (!record) {
      throw new Error(`Observational memory record not found: ${currentRecord.id}`);
    }
    if (!record.bufferedReflection) {
      throw new Error("No buffered reflection to swap");
    }
    const bufferedReflection = record.bufferedReflection;
    const reflectedLineCount = record.reflectedObservationLineCount ?? 0;
    const currentObservations = record.activeObservations ?? "";
    const allLines = currentObservations.split("\n");
    const unreflectedLines = allLines.slice(reflectedLineCount);
    const unreflectedContent = unreflectedLines.join("\n").trim();
    const newObservations = unreflectedContent ? `${bufferedReflection}

${unreflectedContent}` : bufferedReflection;
    const newRecord = await this.createReflectionGeneration({
      currentRecord: record,
      reflection: newObservations,
      tokenCount: input.tokenCount
    });
    record.bufferedReflection = void 0;
    record.bufferedReflectionTokens = void 0;
    record.bufferedReflectionInputTokens = void 0;
    record.reflectedObservationLineCount = void 0;
    return newRecord;
  }
  async setReflectingFlag(id, isReflecting) {
    const record = this.findObservationalMemoryRecordById(id);
    if (!record) {
      throw new Error(`Observational memory record not found: ${id}`);
    }
    record.isReflecting = isReflecting;
    record.updatedAt = /* @__PURE__ */ new Date();
  }
  async setObservingFlag(id, isObserving) {
    const record = this.findObservationalMemoryRecordById(id);
    if (!record) {
      throw new Error(`Observational memory record not found: ${id}`);
    }
    record.isObserving = isObserving;
    record.updatedAt = /* @__PURE__ */ new Date();
  }
  async setBufferingObservationFlag(id, isBuffering, lastBufferedAtTokens) {
    const record = this.findObservationalMemoryRecordById(id);
    if (!record) {
      throw new Error(`Observational memory record not found: ${id}`);
    }
    record.isBufferingObservation = isBuffering;
    if (lastBufferedAtTokens !== void 0) {
      record.lastBufferedAtTokens = lastBufferedAtTokens;
    }
    record.updatedAt = /* @__PURE__ */ new Date();
  }
  async setBufferingReflectionFlag(id, isBuffering) {
    const record = this.findObservationalMemoryRecordById(id);
    if (!record) {
      throw new Error(`Observational memory record not found: ${id}`);
    }
    record.isBufferingReflection = isBuffering;
    record.updatedAt = /* @__PURE__ */ new Date();
  }
  async clearObservationalMemory(threadId, resourceId) {
    const key = this.getObservationalMemoryKey(threadId, resourceId);
    this.db.observationalMemory.delete(key);
  }
  async setPendingMessageTokens(id, tokenCount) {
    const record = this.findObservationalMemoryRecordById(id);
    if (!record) {
      throw new Error(`Observational memory record not found: ${id}`);
    }
    record.pendingMessageTokens = tokenCount;
    record.updatedAt = /* @__PURE__ */ new Date();
  }
  async updateObservationalMemoryConfig(input) {
    const record = this.findObservationalMemoryRecordById(input.id);
    if (!record) {
      throw new Error(`Observational memory record not found: ${input.id}`);
    }
    record.config = this.deepMergeConfig(record.config, input.config);
    record.updatedAt = /* @__PURE__ */ new Date();
  }
  /**
   * Helper to find an observational memory record by ID across all keys
   */
  findObservationalMemoryRecordById(id) {
    for (const records of this.db.observationalMemory.values()) {
      const record = records.find((r) => r.id === id);
      if (record) return record;
    }
    return null;
  }
};

// src/storage/domains/prompt-blocks/base.ts
var PromptBlocksStorage = class extends VersionedStorageDomain {
  listKey = "promptBlocks";
  versionMetadataFields = [
    "id",
    "blockId",
    "versionNumber",
    "changedFields",
    "changeMessage",
    "createdAt"
  ];
  constructor() {
    super({
      component: "STORAGE",
      name: "PROMPT_BLOCKS"
    });
  }
};

// src/storage/domains/prompt-blocks/inmemory.ts
var InMemoryPromptBlocksStorage = class extends PromptBlocksStorage {
  db;
  constructor({ db }) {
    super();
    this.db = db;
  }
  async dangerouslyClearAll() {
    this.db.promptBlocks.clear();
    this.db.promptBlockVersions.clear();
  }
  // ==========================================================================
  // Prompt Block CRUD Methods
  // ==========================================================================
  async getById(id) {
    const block = this.db.promptBlocks.get(id);
    return block ? this.deepCopyBlock(block) : null;
  }
  async create(input) {
    const { promptBlock } = input;
    if (this.db.promptBlocks.has(promptBlock.id)) {
      throw new Error(`Prompt block with id ${promptBlock.id} already exists`);
    }
    const now = /* @__PURE__ */ new Date();
    const newBlock = {
      id: promptBlock.id,
      status: "draft",
      activeVersionId: void 0,
      authorId: promptBlock.authorId,
      metadata: promptBlock.metadata,
      createdAt: now,
      updatedAt: now
    };
    this.db.promptBlocks.set(promptBlock.id, newBlock);
    const { id: _id, authorId: _authorId, metadata: _metadata, ...snapshotConfig } = promptBlock;
    const versionId = crypto.randomUUID();
    await this.createVersion({
      id: versionId,
      blockId: promptBlock.id,
      versionNumber: 1,
      ...snapshotConfig,
      changedFields: Object.keys(snapshotConfig),
      changeMessage: "Initial version"
    });
    return this.deepCopyBlock(newBlock);
  }
  async update(input) {
    const { id, ...updates } = input;
    const existingBlock = this.db.promptBlocks.get(id);
    if (!existingBlock) {
      throw new Error(`Prompt block with id ${id} not found`);
    }
    const { authorId, activeVersionId, metadata, status } = updates;
    const updatedBlock = {
      ...existingBlock,
      ...authorId !== void 0 && { authorId },
      ...activeVersionId !== void 0 && { activeVersionId },
      ...status !== void 0 && { status },
      ...metadata !== void 0 && {
        metadata: { ...existingBlock.metadata, ...metadata }
      },
      updatedAt: /* @__PURE__ */ new Date()
    };
    this.db.promptBlocks.set(id, updatedBlock);
    return this.deepCopyBlock(updatedBlock);
  }
  async delete(id) {
    this.db.promptBlocks.delete(id);
    await this.deleteVersionsByParentId(id);
  }
  async list(args) {
    const { page = 0, perPage: perPageInput, orderBy, authorId, metadata, status } = args || {};
    const { field, direction } = this.parseOrderBy(orderBy);
    const perPage = normalizePerPage(perPageInput, 100);
    if (page < 0) {
      throw new Error("page must be >= 0");
    }
    const maxOffset = Number.MAX_SAFE_INTEGER / 2;
    if (page * perPage > maxOffset) {
      throw new Error("page value too large");
    }
    let blocks = Array.from(this.db.promptBlocks.values());
    if (status) {
      blocks = blocks.filter((block) => block.status === status);
    }
    if (authorId !== void 0) {
      blocks = blocks.filter((block) => block.authorId === authorId);
    }
    if (metadata && Object.keys(metadata).length > 0) {
      blocks = blocks.filter((block) => {
        if (!block.metadata) return false;
        return Object.entries(metadata).every(([key, value]) => deepEqual(block.metadata[key], value));
      });
    }
    const sortedBlocks = this.sortBlocks(blocks, field, direction);
    const clonedBlocks = sortedBlocks.map((block) => this.deepCopyBlock(block));
    const { offset, perPage: perPageForResponse } = calculatePagination(page, perPageInput, perPage);
    return {
      promptBlocks: clonedBlocks.slice(offset, offset + perPage),
      total: clonedBlocks.length,
      page,
      perPage: perPageForResponse,
      hasMore: offset + perPage < clonedBlocks.length
    };
  }
  // ==========================================================================
  // Prompt Block Version Methods
  // ==========================================================================
  async createVersion(input) {
    if (this.db.promptBlockVersions.has(input.id)) {
      throw new Error(`Version with id ${input.id} already exists`);
    }
    for (const version2 of this.db.promptBlockVersions.values()) {
      if (version2.blockId === input.blockId && version2.versionNumber === input.versionNumber) {
        throw new Error(`Version number ${input.versionNumber} already exists for prompt block ${input.blockId}`);
      }
    }
    const version = {
      ...input,
      createdAt: /* @__PURE__ */ new Date()
    };
    this.db.promptBlockVersions.set(input.id, this.deepCopyVersion(version));
    return this.deepCopyVersion(version);
  }
  async getVersion(id) {
    const version = this.db.promptBlockVersions.get(id);
    return version ? this.deepCopyVersion(version) : null;
  }
  async getVersionByNumber(blockId, versionNumber) {
    for (const version of this.db.promptBlockVersions.values()) {
      if (version.blockId === blockId && version.versionNumber === versionNumber) {
        return this.deepCopyVersion(version);
      }
    }
    return null;
  }
  async getLatestVersion(blockId) {
    let latest = null;
    for (const version of this.db.promptBlockVersions.values()) {
      if (version.blockId === blockId) {
        if (!latest || version.versionNumber > latest.versionNumber) {
          latest = version;
        }
      }
    }
    return latest ? this.deepCopyVersion(latest) : null;
  }
  async listVersions(input) {
    const { blockId, page = 0, perPage: perPageInput, orderBy } = input;
    const { field, direction } = this.parseVersionOrderBy(orderBy);
    const perPage = normalizePerPage(perPageInput, 20);
    if (page < 0) {
      throw new Error("page must be >= 0");
    }
    const maxOffset = Number.MAX_SAFE_INTEGER / 2;
    if (page * perPage > maxOffset) {
      throw new Error("page value too large");
    }
    let versions = Array.from(this.db.promptBlockVersions.values()).filter((v) => v.blockId === blockId);
    versions = this.sortVersions(versions, field, direction);
    const clonedVersions = versions.map((v) => this.deepCopyVersion(v));
    const total = clonedVersions.length;
    const { offset, perPage: perPageForResponse } = calculatePagination(page, perPageInput, perPage);
    const paginatedVersions = clonedVersions.slice(offset, offset + perPage);
    return {
      versions: paginatedVersions,
      total,
      page,
      perPage: perPageForResponse,
      hasMore: offset + perPage < total
    };
  }
  async deleteVersion(id) {
    this.db.promptBlockVersions.delete(id);
  }
  async deleteVersionsByParentId(entityId) {
    const idsToDelete = [];
    for (const [id, version] of this.db.promptBlockVersions.entries()) {
      if (version.blockId === entityId) {
        idsToDelete.push(id);
      }
    }
    for (const id of idsToDelete) {
      this.db.promptBlockVersions.delete(id);
    }
  }
  async countVersions(blockId) {
    let count = 0;
    for (const version of this.db.promptBlockVersions.values()) {
      if (version.blockId === blockId) {
        count++;
      }
    }
    return count;
  }
  // ==========================================================================
  // Private Helper Methods
  // ==========================================================================
  deepCopyBlock(block) {
    return {
      ...block,
      metadata: block.metadata ? { ...block.metadata } : block.metadata
    };
  }
  deepCopyVersion(version) {
    return {
      ...version,
      rules: version.rules ? JSON.parse(JSON.stringify(version.rules)) : version.rules,
      changedFields: version.changedFields ? [...version.changedFields] : version.changedFields
    };
  }
  sortBlocks(blocks, field, direction) {
    return blocks.sort((a, b) => {
      const aValue = a[field].getTime();
      const bValue = b[field].getTime();
      return direction === "ASC" ? aValue - bValue : bValue - aValue;
    });
  }
  sortVersions(versions, field, direction) {
    return versions.sort((a, b) => {
      let aVal;
      let bVal;
      if (field === "createdAt") {
        aVal = a.createdAt.getTime();
        bVal = b.createdAt.getTime();
      } else {
        aVal = a.versionNumber;
        bVal = b.versionNumber;
      }
      return direction === "ASC" ? aVal - bVal : bVal - aVal;
    });
  }
};

// src/storage/domains/scorer-definitions/base.ts
var ScorerDefinitionsStorage = class extends VersionedStorageDomain {
  listKey = "scorerDefinitions";
  versionMetadataFields = [
    "id",
    "scorerDefinitionId",
    "versionNumber",
    "changedFields",
    "changeMessage",
    "createdAt"
  ];
  constructor() {
    super({
      component: "STORAGE",
      name: "SCORER_DEFINITIONS"
    });
  }
};

// src/storage/domains/scorer-definitions/inmemory.ts
var InMemoryScorerDefinitionsStorage = class extends ScorerDefinitionsStorage {
  db;
  constructor({ db }) {
    super();
    this.db = db;
  }
  async dangerouslyClearAll() {
    this.db.scorerDefinitions.clear();
    this.db.scorerDefinitionVersions.clear();
  }
  // ==========================================================================
  // Scorer Definition CRUD Methods
  // ==========================================================================
  async getById(id) {
    const scorer = this.db.scorerDefinitions.get(id);
    return scorer ? this.deepCopyScorer(scorer) : null;
  }
  async create(input) {
    const { scorerDefinition } = input;
    if (this.db.scorerDefinitions.has(scorerDefinition.id)) {
      throw new Error(`Scorer definition with id ${scorerDefinition.id} already exists`);
    }
    const now = /* @__PURE__ */ new Date();
    const newScorer = {
      id: scorerDefinition.id,
      status: "draft",
      activeVersionId: void 0,
      authorId: scorerDefinition.authorId,
      metadata: scorerDefinition.metadata,
      createdAt: now,
      updatedAt: now
    };
    this.db.scorerDefinitions.set(scorerDefinition.id, newScorer);
    const { id: _id, authorId: _authorId, metadata: _metadata, ...snapshotConfig } = scorerDefinition;
    const versionId = crypto.randomUUID();
    await this.createVersion({
      id: versionId,
      scorerDefinitionId: scorerDefinition.id,
      versionNumber: 1,
      ...snapshotConfig,
      changedFields: Object.keys(snapshotConfig),
      changeMessage: "Initial version"
    });
    return this.deepCopyScorer(newScorer);
  }
  async update(input) {
    const { id, ...updates } = input;
    const existingScorer = this.db.scorerDefinitions.get(id);
    if (!existingScorer) {
      throw new Error(`Scorer definition with id ${id} not found`);
    }
    const { authorId, activeVersionId, metadata, status } = updates;
    const updatedScorer = {
      ...existingScorer,
      ...authorId !== void 0 && { authorId },
      ...activeVersionId !== void 0 && { activeVersionId },
      ...status !== void 0 && { status },
      ...metadata !== void 0 && {
        metadata: { ...existingScorer.metadata, ...metadata }
      },
      updatedAt: /* @__PURE__ */ new Date()
    };
    this.db.scorerDefinitions.set(id, updatedScorer);
    return this.deepCopyScorer(updatedScorer);
  }
  async delete(id) {
    this.db.scorerDefinitions.delete(id);
    await this.deleteVersionsByParentId(id);
  }
  async list(args) {
    const { page = 0, perPage: perPageInput, orderBy, authorId, metadata, status } = args || {};
    const { field, direction } = this.parseOrderBy(orderBy);
    const perPage = normalizePerPage(perPageInput, 100);
    if (page < 0) {
      throw new Error("page must be >= 0");
    }
    const maxOffset = Number.MAX_SAFE_INTEGER / 2;
    if (page * perPage > maxOffset) {
      throw new Error("page value too large");
    }
    let scorers = Array.from(this.db.scorerDefinitions.values());
    if (status) {
      scorers = scorers.filter((scorer) => scorer.status === status);
    }
    if (authorId !== void 0) {
      scorers = scorers.filter((scorer) => scorer.authorId === authorId);
    }
    if (metadata && Object.keys(metadata).length > 0) {
      scorers = scorers.filter((scorer) => {
        if (!scorer.metadata) return false;
        return Object.entries(metadata).every(([key, value]) => deepEqual(scorer.metadata[key], value));
      });
    }
    const sortedScorers = this.sortScorers(scorers, field, direction);
    const clonedScorers = sortedScorers.map((scorer) => this.deepCopyScorer(scorer));
    const { offset, perPage: perPageForResponse } = calculatePagination(page, perPageInput, perPage);
    return {
      scorerDefinitions: clonedScorers.slice(offset, offset + perPage),
      total: clonedScorers.length,
      page,
      perPage: perPageForResponse,
      hasMore: offset + perPage < clonedScorers.length
    };
  }
  // ==========================================================================
  // Scorer Definition Version Methods
  // ==========================================================================
  async createVersion(input) {
    if (this.db.scorerDefinitionVersions.has(input.id)) {
      throw new Error(`Version with id ${input.id} already exists`);
    }
    for (const version2 of this.db.scorerDefinitionVersions.values()) {
      if (version2.scorerDefinitionId === input.scorerDefinitionId && version2.versionNumber === input.versionNumber) {
        throw new Error(
          `Version number ${input.versionNumber} already exists for scorer definition ${input.scorerDefinitionId}`
        );
      }
    }
    const version = {
      ...input,
      createdAt: /* @__PURE__ */ new Date()
    };
    this.db.scorerDefinitionVersions.set(input.id, this.deepCopyVersion(version));
    return this.deepCopyVersion(version);
  }
  async getVersion(id) {
    const version = this.db.scorerDefinitionVersions.get(id);
    return version ? this.deepCopyVersion(version) : null;
  }
  async getVersionByNumber(scorerDefinitionId, versionNumber) {
    for (const version of this.db.scorerDefinitionVersions.values()) {
      if (version.scorerDefinitionId === scorerDefinitionId && version.versionNumber === versionNumber) {
        return this.deepCopyVersion(version);
      }
    }
    return null;
  }
  async getLatestVersion(scorerDefinitionId) {
    let latest = null;
    for (const version of this.db.scorerDefinitionVersions.values()) {
      if (version.scorerDefinitionId === scorerDefinitionId) {
        if (!latest || version.versionNumber > latest.versionNumber) {
          latest = version;
        }
      }
    }
    return latest ? this.deepCopyVersion(latest) : null;
  }
  async listVersions(input) {
    const { scorerDefinitionId, page = 0, perPage: perPageInput, orderBy } = input;
    const { field, direction } = this.parseVersionOrderBy(orderBy);
    const perPage = normalizePerPage(perPageInput, 20);
    if (page < 0) {
      throw new Error("page must be >= 0");
    }
    const maxOffset = Number.MAX_SAFE_INTEGER / 2;
    if (page * perPage > maxOffset) {
      throw new Error("page value too large");
    }
    let versions = Array.from(this.db.scorerDefinitionVersions.values()).filter(
      (v) => v.scorerDefinitionId === scorerDefinitionId
    );
    versions = this.sortVersions(versions, field, direction);
    const clonedVersions = versions.map((v) => this.deepCopyVersion(v));
    const total = clonedVersions.length;
    const { offset, perPage: perPageForResponse } = calculatePagination(page, perPageInput, perPage);
    const paginatedVersions = clonedVersions.slice(offset, offset + perPage);
    return {
      versions: paginatedVersions,
      total,
      page,
      perPage: perPageForResponse,
      hasMore: offset + perPage < total
    };
  }
  async deleteVersion(id) {
    this.db.scorerDefinitionVersions.delete(id);
  }
  async deleteVersionsByParentId(entityId) {
    const idsToDelete = [];
    for (const [id, version] of this.db.scorerDefinitionVersions.entries()) {
      if (version.scorerDefinitionId === entityId) {
        idsToDelete.push(id);
      }
    }
    for (const id of idsToDelete) {
      this.db.scorerDefinitionVersions.delete(id);
    }
  }
  async countVersions(scorerDefinitionId) {
    let count = 0;
    for (const version of this.db.scorerDefinitionVersions.values()) {
      if (version.scorerDefinitionId === scorerDefinitionId) {
        count++;
      }
    }
    return count;
  }
  // ==========================================================================
  // Private Helper Methods
  // ==========================================================================
  deepCopyScorer(scorer) {
    return {
      ...scorer,
      metadata: scorer.metadata ? { ...scorer.metadata } : scorer.metadata
    };
  }
  deepCopyVersion(version) {
    return {
      ...version,
      model: version.model ? JSON.parse(JSON.stringify(version.model)) : version.model,
      scoreRange: version.scoreRange ? JSON.parse(JSON.stringify(version.scoreRange)) : version.scoreRange,
      presetConfig: version.presetConfig ? JSON.parse(JSON.stringify(version.presetConfig)) : version.presetConfig,
      defaultSampling: version.defaultSampling ? JSON.parse(JSON.stringify(version.defaultSampling)) : version.defaultSampling,
      changedFields: version.changedFields ? [...version.changedFields] : version.changedFields
    };
  }
  sortScorers(scorers, field, direction) {
    return scorers.sort((a, b) => {
      const aValue = a[field].getTime();
      const bValue = b[field].getTime();
      return direction === "ASC" ? aValue - bValue : bValue - aValue;
    });
  }
  sortVersions(versions, field, direction) {
    return versions.sort((a, b) => {
      let aVal;
      let bVal;
      if (field === "createdAt") {
        aVal = a.createdAt.getTime();
        bVal = b.createdAt.getTime();
      } else {
        aVal = a.versionNumber;
        bVal = b.versionNumber;
      }
      return direction === "ASC" ? aVal - bVal : bVal - aVal;
    });
  }
};

// src/storage/domains/scores/base.ts
var ScoresStorage = class extends StorageDomain {
  constructor() {
    super({
      component: "STORAGE",
      name: "SCORES"
    });
  }
  async dangerouslyClearAll() {
  }
  async listScoresBySpan({
    traceId,
    spanId,
    pagination: _pagination
  }) {
    throw new MastraError({
      id: "SCORES_STORAGE_GET_SCORES_BY_SPAN_NOT_IMPLEMENTED",
      domain: "STORAGE" /* STORAGE */,
      category: "SYSTEM" /* SYSTEM */,
      details: { traceId, spanId }
    });
  }
};

// src/storage/domains/scores/inmemory.ts
var ScoresInMemory = class extends ScoresStorage {
  db;
  constructor({ db }) {
    super();
    this.db = db;
  }
  async dangerouslyClearAll() {
    this.db.scores.clear();
  }
  async getScoreById({ id }) {
    return this.db.scores.get(id) ?? null;
  }
  async saveScore(score) {
    const newScore = { id: crypto.randomUUID(), createdAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date(), ...score };
    this.db.scores.set(newScore.id, newScore);
    return { score: newScore };
  }
  async listScoresByScorerId({
    scorerId,
    pagination,
    entityId,
    entityType,
    source
  }) {
    const scores = Array.from(this.db.scores.values()).filter((score) => {
      let baseFilter = score.scorerId === scorerId;
      if (entityId) {
        baseFilter = baseFilter && score.entityId === entityId;
      }
      if (entityType) {
        baseFilter = baseFilter && score.entityType === entityType;
      }
      if (source) {
        baseFilter = baseFilter && score.source === source;
      }
      return baseFilter;
    });
    const { page, perPage: perPageInput } = pagination;
    const perPage = normalizePerPage(perPageInput, Number.MAX_SAFE_INTEGER);
    const { offset: start, perPage: perPageForResponse } = calculatePagination(page, perPageInput, perPage);
    const end = perPageInput === false ? scores.length : start + perPage;
    return {
      scores: scores.slice(start, end),
      pagination: {
        total: scores.length,
        page,
        perPage: perPageForResponse,
        hasMore: perPageInput === false ? false : scores.length > end
      }
    };
  }
  async listScoresByRunId({
    runId,
    pagination
  }) {
    const scores = Array.from(this.db.scores.values()).filter((score) => score.runId === runId);
    const { page, perPage: perPageInput } = pagination;
    const perPage = normalizePerPage(perPageInput, Number.MAX_SAFE_INTEGER);
    const { offset: start, perPage: perPageForResponse } = calculatePagination(page, perPageInput, perPage);
    const end = perPageInput === false ? scores.length : start + perPage;
    return {
      scores: scores.slice(start, end),
      pagination: {
        total: scores.length,
        page,
        perPage: perPageForResponse,
        hasMore: perPageInput === false ? false : scores.length > end
      }
    };
  }
  async listScoresByEntityId({
    entityId,
    entityType,
    pagination
  }) {
    const scores = Array.from(this.db.scores.values()).filter((score) => {
      const baseFilter = score.entityId === entityId && score.entityType === entityType;
      return baseFilter;
    });
    const { page, perPage: perPageInput } = pagination;
    const perPage = normalizePerPage(perPageInput, Number.MAX_SAFE_INTEGER);
    const { offset: start, perPage: perPageForResponse } = calculatePagination(page, perPageInput, perPage);
    const end = perPageInput === false ? scores.length : start + perPage;
    return {
      scores: scores.slice(start, end),
      pagination: {
        total: scores.length,
        page,
        perPage: perPageForResponse,
        hasMore: perPageInput === false ? false : scores.length > end
      }
    };
  }
  async listScoresBySpan({
    traceId,
    spanId,
    pagination
  }) {
    const scores = Array.from(this.db.scores.values()).filter(
      (score) => score.traceId === traceId && score.spanId === spanId
    );
    scores.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const { page, perPage: perPageInput } = pagination;
    const perPage = normalizePerPage(perPageInput, Number.MAX_SAFE_INTEGER);
    const { offset: start, perPage: perPageForResponse } = calculatePagination(page, perPageInput, perPage);
    const end = perPageInput === false ? scores.length : start + perPage;
    return {
      scores: scores.slice(start, end),
      pagination: {
        total: scores.length,
        page,
        perPage: perPageForResponse,
        hasMore: perPageInput === false ? false : scores.length > end
      }
    };
  }
};

// src/storage/domains/skills/base.ts
var SkillsStorage = class extends VersionedStorageDomain {
  listKey = "skills";
  versionMetadataFields = [
    "id",
    "skillId",
    "versionNumber",
    "changedFields",
    "changeMessage",
    "createdAt"
  ];
  constructor() {
    super({
      component: "STORAGE",
      name: "SKILLS"
    });
  }
};

// src/storage/domains/skills/inmemory.ts
var InMemorySkillsStorage = class extends SkillsStorage {
  db;
  constructor({ db }) {
    super();
    this.db = db;
  }
  async dangerouslyClearAll() {
    this.db.skills.clear();
    this.db.skillVersions.clear();
  }
  // ==========================================================================
  // Skill CRUD Methods
  // ==========================================================================
  async getById(id) {
    const config = this.db.skills.get(id);
    return config ? this.deepCopyConfig(config) : null;
  }
  async create(input) {
    const { skill } = input;
    if (this.db.skills.has(skill.id)) {
      throw new Error(`Skill with id ${skill.id} already exists`);
    }
    const now = /* @__PURE__ */ new Date();
    const newConfig = {
      id: skill.id,
      status: "draft",
      activeVersionId: void 0,
      authorId: skill.authorId,
      createdAt: now,
      updatedAt: now
    };
    this.db.skills.set(skill.id, newConfig);
    const { id: _id, authorId: _authorId, ...snapshotConfig } = skill;
    const versionId = randomUUID();
    try {
      await this.createVersion({
        id: versionId,
        skillId: skill.id,
        versionNumber: 1,
        ...snapshotConfig,
        changedFields: Object.keys(snapshotConfig),
        changeMessage: "Initial version"
      });
    } catch (error) {
      this.db.skills.delete(skill.id);
      throw error;
    }
    return this.deepCopyConfig(newConfig);
  }
  async update(input) {
    const { id, ...updates } = input;
    const existingConfig = this.db.skills.get(id);
    if (!existingConfig) {
      throw new Error(`Skill with id ${id} not found`);
    }
    const { authorId, activeVersionId, status, ...configFields } = updates;
    const configFieldNames = [
      "name",
      "description",
      "instructions",
      "license",
      "compatibility",
      "source",
      "references",
      "scripts",
      "assets",
      "metadata",
      "tree"
    ];
    const hasConfigUpdate = configFieldNames.some((field) => field in configFields);
    const updatedConfig = {
      ...existingConfig,
      ...authorId !== void 0 && { authorId },
      ...activeVersionId !== void 0 && { activeVersionId },
      ...status !== void 0 && { status },
      updatedAt: /* @__PURE__ */ new Date()
    };
    if (activeVersionId !== void 0 && status === void 0) {
      updatedConfig.status = "published";
    }
    if (hasConfigUpdate) {
      const latestVersion = await this.getLatestVersion(id);
      if (!latestVersion) {
        throw new Error(`No versions found for skill ${id}`);
      }
      const {
        id: _versionId,
        skillId: _skillId,
        versionNumber: _versionNumber,
        changedFields: _changedFields,
        changeMessage: _changeMessage,
        createdAt: _createdAt,
        ...latestConfig
      } = latestVersion;
      const newConfig = {
        ...latestConfig,
        ...configFields
      };
      const changedFields = configFieldNames.filter(
        (field) => field in configFields && JSON.stringify(configFields[field]) !== JSON.stringify(latestConfig[field])
      );
      if (changedFields.length > 0) {
        const newVersionId = randomUUID();
        const newVersionNumber = latestVersion.versionNumber + 1;
        await this.createVersion({
          id: newVersionId,
          skillId: id,
          versionNumber: newVersionNumber,
          ...newConfig,
          changedFields,
          changeMessage: `Updated ${changedFields.join(", ")}`
        });
      }
    }
    this.db.skills.set(id, updatedConfig);
    return this.deepCopyConfig(updatedConfig);
  }
  async delete(id) {
    this.db.skills.delete(id);
    await this.deleteVersionsByParentId(id);
  }
  async list(args) {
    const { page = 0, perPage: perPageInput, orderBy, authorId, metadata } = args || {};
    const { field, direction } = this.parseOrderBy(orderBy);
    const perPage = normalizePerPage(perPageInput, 100);
    if (page < 0) {
      throw new Error("page must be >= 0");
    }
    const maxOffset = Number.MAX_SAFE_INTEGER / 2;
    if (page * perPage > maxOffset) {
      throw new Error("page value too large");
    }
    let configs = Array.from(this.db.skills.values());
    if (authorId !== void 0) {
      configs = configs.filter((config) => config.authorId === authorId);
    }
    if (metadata && Object.keys(metadata).length > 0) {
      configs = configs.filter((_config) => {
        return false;
      });
    }
    const sortedConfigs = this.sortConfigs(configs, field, direction);
    const clonedConfigs = sortedConfigs.map((config) => this.deepCopyConfig(config));
    const { offset, perPage: perPageForResponse } = calculatePagination(page, perPageInput, perPage);
    return {
      skills: clonedConfigs.slice(offset, offset + perPage),
      total: clonedConfigs.length,
      page,
      perPage: perPageForResponse,
      hasMore: offset + perPage < clonedConfigs.length
    };
  }
  // ==========================================================================
  // Skill Version Methods
  // ==========================================================================
  async createVersion(input) {
    if (this.db.skillVersions.has(input.id)) {
      throw new Error(`Version with id ${input.id} already exists`);
    }
    for (const version2 of this.db.skillVersions.values()) {
      if (version2.skillId === input.skillId && version2.versionNumber === input.versionNumber) {
        throw new Error(`Version number ${input.versionNumber} already exists for skill ${input.skillId}`);
      }
    }
    const version = {
      ...input,
      createdAt: /* @__PURE__ */ new Date()
    };
    this.db.skillVersions.set(input.id, this.deepCopyVersion(version));
    return this.deepCopyVersion(version);
  }
  async getVersion(id) {
    const version = this.db.skillVersions.get(id);
    return version ? this.deepCopyVersion(version) : null;
  }
  async getVersionByNumber(skillId, versionNumber) {
    for (const version of this.db.skillVersions.values()) {
      if (version.skillId === skillId && version.versionNumber === versionNumber) {
        return this.deepCopyVersion(version);
      }
    }
    return null;
  }
  async getLatestVersion(skillId) {
    let latest = null;
    for (const version of this.db.skillVersions.values()) {
      if (version.skillId === skillId) {
        if (!latest || version.versionNumber > latest.versionNumber) {
          latest = version;
        }
      }
    }
    return latest ? this.deepCopyVersion(latest) : null;
  }
  async listVersions(input) {
    const { skillId, page = 0, perPage: perPageInput, orderBy } = input;
    const { field, direction } = this.parseVersionOrderBy(orderBy);
    const perPage = normalizePerPage(perPageInput, 20);
    if (page < 0) {
      throw new Error("page must be >= 0");
    }
    const maxOffset = Number.MAX_SAFE_INTEGER / 2;
    if (page * perPage > maxOffset) {
      throw new Error("page value too large");
    }
    let versions = Array.from(this.db.skillVersions.values()).filter((v) => v.skillId === skillId);
    versions = this.sortVersions(versions, field, direction);
    const clonedVersions = versions.map((v) => this.deepCopyVersion(v));
    const total = clonedVersions.length;
    const { offset, perPage: perPageForResponse } = calculatePagination(page, perPageInput, perPage);
    const paginatedVersions = clonedVersions.slice(offset, offset + perPage);
    return {
      versions: paginatedVersions,
      total,
      page,
      perPage: perPageForResponse,
      hasMore: offset + perPage < total
    };
  }
  async deleteVersion(id) {
    this.db.skillVersions.delete(id);
  }
  async deleteVersionsByParentId(entityId) {
    const idsToDelete = [];
    for (const [id, version] of this.db.skillVersions.entries()) {
      if (version.skillId === entityId) {
        idsToDelete.push(id);
      }
    }
    for (const id of idsToDelete) {
      this.db.skillVersions.delete(id);
    }
  }
  async countVersions(skillId) {
    let count = 0;
    for (const version of this.db.skillVersions.values()) {
      if (version.skillId === skillId) {
        count++;
      }
    }
    return count;
  }
  // ==========================================================================
  // Private Helper Methods
  // ==========================================================================
  deepCopyConfig(config) {
    return {
      ...config
    };
  }
  deepCopyVersion(version) {
    return structuredClone(version);
  }
  sortConfigs(configs, field, direction) {
    return configs.sort((a, b) => {
      const aValue = a[field].getTime();
      const bValue = b[field].getTime();
      return direction === "ASC" ? aValue - bValue : bValue - aValue;
    });
  }
  sortVersions(versions, field, direction) {
    return versions.sort((a, b) => {
      let aVal;
      let bVal;
      if (field === "createdAt") {
        aVal = a.createdAt.getTime();
        bVal = b.createdAt.getTime();
      } else {
        aVal = a.versionNumber;
        bVal = b.versionNumber;
      }
      return direction === "ASC" ? aVal - bVal : bVal - aVal;
    });
  }
};

// src/workflows/evented/types.ts
var PENDING_MARKER_KEY = "__mastra_pending__";
function createPendingMarker() {
  return { [PENDING_MARKER_KEY]: true };
}
function isPendingMarker(val) {
  return val !== null && typeof val === "object" && PENDING_MARKER_KEY in val && val[PENDING_MARKER_KEY] === true;
}

// src/storage/domains/workflows/base.ts
var WorkflowsStorage = class extends StorageDomain {
  constructor() {
    super({
      component: "STORAGE",
      name: "WORKFLOWS"
    });
  }
};

// src/storage/domains/workflows/inmemory.ts
var WorkflowsInMemory = class extends WorkflowsStorage {
  db;
  constructor({ db }) {
    super();
    this.db = db;
  }
  supportsConcurrentUpdates() {
    return true;
  }
  async dangerouslyClearAll() {
    this.db.workflows.clear();
  }
  getWorkflowKey(workflowName, runId) {
    return `${workflowName}-${runId}`;
  }
  async updateWorkflowResults({
    workflowName,
    runId,
    stepId,
    result,
    requestContext
  }) {
    const key = this.getWorkflowKey(workflowName, runId);
    const run = this.db.workflows.get(key);
    if (!run) {
      return {};
    }
    let snapshot;
    if (!run.snapshot) {
      snapshot = {
        context: {},
        activePaths: [],
        activeStepsPath: {},
        timestamp: Date.now(),
        suspendedPaths: {},
        resumeLabels: {},
        serializedStepGraph: [],
        value: {},
        waitingPaths: {},
        status: "pending",
        runId: run.run_id
      };
      this.db.workflows.set(key, {
        ...run,
        snapshot
      });
    } else {
      snapshot = typeof run.snapshot === "string" ? JSON.parse(run.snapshot) : run.snapshot;
    }
    if (!snapshot || !snapshot?.context) {
      throw new Error(`Snapshot not found for runId ${runId}`);
    }
    const existingResult = snapshot.context[stepId];
    if (existingResult && "output" in existingResult && Array.isArray(existingResult.output) && result && typeof result === "object" && "output" in result && Array.isArray(result.output)) {
      const existingOutput = existingResult.output;
      const newOutput = result.output;
      const mergedOutput = [...existingOutput];
      for (let i = 0; i < Math.max(existingOutput.length, newOutput.length); i++) {
        if (i < newOutput.length) {
          const newVal = newOutput[i];
          if (isPendingMarker(newVal)) {
            mergedOutput[i] = null;
          } else if (newVal !== null) {
            mergedOutput[i] = newVal;
          }
        }
      }
      snapshot.context[stepId] = {
        ...existingResult,
        ...result,
        output: mergedOutput
      };
    } else {
      snapshot.context[stepId] = result;
    }
    snapshot.requestContext = { ...snapshot.requestContext, ...requestContext };
    this.db.workflows.set(key, {
      ...run,
      snapshot
    });
    return JSON.parse(JSON.stringify(snapshot.context));
  }
  async updateWorkflowState({
    workflowName,
    runId,
    opts
  }) {
    const key = this.getWorkflowKey(workflowName, runId);
    const run = this.db.workflows.get(key);
    if (!run) {
      return;
    }
    let snapshot;
    if (!run.snapshot) {
      snapshot = {
        context: {},
        activePaths: [],
        activeStepsPath: {},
        timestamp: Date.now(),
        suspendedPaths: {},
        resumeLabels: {},
        serializedStepGraph: [],
        value: {},
        waitingPaths: {},
        status: "pending",
        runId: run.run_id
      };
      this.db.workflows.set(key, {
        ...run,
        snapshot
      });
    } else {
      snapshot = typeof run.snapshot === "string" ? JSON.parse(run.snapshot) : run.snapshot;
    }
    if (!snapshot || !snapshot?.context) {
      throw new Error(`Snapshot not found for runId ${runId}`);
    }
    snapshot = { ...snapshot, ...opts };
    this.db.workflows.set(key, {
      ...run,
      snapshot
    });
    return snapshot;
  }
  async persistWorkflowSnapshot({
    workflowName,
    runId,
    resourceId,
    snapshot,
    createdAt,
    updatedAt
  }) {
    const key = this.getWorkflowKey(workflowName, runId);
    const now = /* @__PURE__ */ new Date();
    const data = {
      workflow_name: workflowName,
      run_id: runId,
      resourceId,
      snapshot,
      createdAt: createdAt ?? now,
      updatedAt: updatedAt ?? now
    };
    this.db.workflows.set(key, data);
  }
  async loadWorkflowSnapshot({
    workflowName,
    runId
  }) {
    const key = this.getWorkflowKey(workflowName, runId);
    const run = this.db.workflows.get(key);
    if (!run) {
      return null;
    }
    const snapshot = typeof run.snapshot === "string" ? JSON.parse(run.snapshot) : run.snapshot;
    return snapshot ? JSON.parse(JSON.stringify(snapshot)) : null;
  }
  async listWorkflowRuns({
    workflowName,
    fromDate,
    toDate,
    perPage,
    page,
    resourceId,
    status
  } = {}) {
    if (page !== void 0 && page < 0) {
      throw new Error("page must be >= 0");
    }
    let runs = Array.from(this.db.workflows.values());
    if (workflowName) runs = runs.filter((run) => run.workflow_name === workflowName);
    if (status) {
      runs = runs.filter((run) => {
        let snapshot = run?.snapshot;
        if (!snapshot) {
          return false;
        }
        if (typeof snapshot === "string") {
          try {
            snapshot = JSON.parse(snapshot);
          } catch {
            return false;
          }
        } else {
          snapshot = JSON.parse(JSON.stringify(snapshot));
        }
        return snapshot.status === status;
      });
    }
    if (fromDate && toDate) {
      runs = runs.filter(
        (run) => new Date(run.createdAt).getTime() >= fromDate.getTime() && new Date(run.createdAt).getTime() <= toDate.getTime()
      );
    } else if (fromDate) {
      runs = runs.filter((run) => new Date(run.createdAt).getTime() >= fromDate.getTime());
    } else if (toDate) {
      runs = runs.filter((run) => new Date(run.createdAt).getTime() <= toDate.getTime());
    }
    if (resourceId) runs = runs.filter((run) => run.resourceId === resourceId);
    const total = runs.length;
    runs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    if (perPage !== void 0 && page !== void 0) {
      const normalizedPerPage = normalizePerPage(perPage, Number.MAX_SAFE_INTEGER);
      const offset = page * normalizedPerPage;
      const start = offset;
      const end = start + normalizedPerPage;
      runs = runs.slice(start, end);
    }
    const parsedRuns = runs.map((run) => ({
      ...run,
      snapshot: typeof run.snapshot === "string" ? JSON.parse(run.snapshot) : JSON.parse(JSON.stringify(run.snapshot)),
      createdAt: new Date(run.createdAt),
      updatedAt: new Date(run.updatedAt),
      runId: run.run_id,
      workflowName: run.workflow_name,
      resourceId: run.resourceId
    }));
    return { runs: parsedRuns, total };
  }
  async getWorkflowRunById({
    runId,
    workflowName
  }) {
    const runs = Array.from(this.db.workflows.values()).filter((r) => r.run_id === runId);
    let run = runs.find((r) => r.workflow_name === workflowName);
    if (!run) return null;
    const parsedRun = {
      ...run,
      snapshot: typeof run.snapshot === "string" ? JSON.parse(run.snapshot) : JSON.parse(JSON.stringify(run.snapshot)),
      createdAt: new Date(run.createdAt),
      updatedAt: new Date(run.updatedAt),
      runId: run.run_id,
      workflowName: run.workflow_name,
      resourceId: run.resourceId
    };
    return parsedRun;
  }
  async deleteWorkflowRunById({ runId, workflowName }) {
    const key = this.getWorkflowKey(workflowName, runId);
    this.db.workflows.delete(key);
  }
};

// src/storage/domains/workspaces/base.ts
var WorkspacesStorage = class extends VersionedStorageDomain {
  listKey = "workspaces";
  versionMetadataFields = [
    "id",
    "workspaceId",
    "versionNumber",
    "changedFields",
    "changeMessage",
    "createdAt"
  ];
  constructor() {
    super({
      component: "STORAGE",
      name: "WORKSPACES"
    });
  }
};

// src/storage/domains/workspaces/inmemory.ts
var InMemoryWorkspacesStorage = class extends WorkspacesStorage {
  db;
  constructor({ db }) {
    super();
    this.db = db;
  }
  async dangerouslyClearAll() {
    this.db.workspaces.clear();
    this.db.workspaceVersions.clear();
  }
  // ==========================================================================
  // Workspace CRUD Methods
  // ==========================================================================
  async getById(id) {
    const config = this.db.workspaces.get(id);
    return config ? this.deepCopyConfig(config) : null;
  }
  async create(input) {
    const { workspace } = input;
    if (this.db.workspaces.has(workspace.id)) {
      throw new Error(`Workspace with id ${workspace.id} already exists`);
    }
    const now = /* @__PURE__ */ new Date();
    const newConfig = {
      id: workspace.id,
      status: "draft",
      activeVersionId: void 0,
      authorId: workspace.authorId,
      metadata: workspace.metadata,
      createdAt: now,
      updatedAt: now
    };
    this.db.workspaces.set(workspace.id, newConfig);
    const { id: _id, authorId: _authorId, metadata: _metadata, ...snapshotConfig } = workspace;
    const versionId = crypto.randomUUID();
    await this.createVersion({
      id: versionId,
      workspaceId: workspace.id,
      versionNumber: 1,
      ...snapshotConfig,
      changedFields: Object.keys(snapshotConfig),
      changeMessage: "Initial version"
    });
    return this.deepCopyConfig(newConfig);
  }
  async update(input) {
    const { id, ...updates } = input;
    const existingConfig = this.db.workspaces.get(id);
    if (!existingConfig) {
      throw new Error(`Workspace with id ${id} not found`);
    }
    const { authorId, activeVersionId, metadata, status, ...configFields } = updates;
    const configFieldNames = [
      "name",
      "description",
      "filesystem",
      "sandbox",
      "mounts",
      "search",
      "skills",
      "tools",
      "autoSync",
      "operationTimeout"
    ];
    const hasConfigUpdate = configFieldNames.some((field) => field in configFields);
    const updatedConfig = {
      ...existingConfig,
      ...authorId !== void 0 && { authorId },
      ...activeVersionId !== void 0 && { activeVersionId },
      ...status !== void 0 && { status },
      ...metadata !== void 0 && {
        metadata: { ...existingConfig.metadata, ...metadata }
      },
      updatedAt: /* @__PURE__ */ new Date()
    };
    if (activeVersionId !== void 0 && status === void 0) {
      updatedConfig.status = "published";
    }
    if (hasConfigUpdate) {
      const latestVersion = await this.getLatestVersion(id);
      if (!latestVersion) {
        throw new Error(`No versions found for workspace ${id}`);
      }
      const {
        id: _versionId,
        workspaceId: _workspaceId,
        versionNumber: _versionNumber,
        changedFields: _changedFields,
        changeMessage: _changeMessage,
        createdAt: _createdAt,
        ...latestConfig
      } = latestVersion;
      const newConfig = {
        ...latestConfig,
        ...configFields
      };
      const changedFields = configFieldNames.filter(
        (field) => field in configFields && JSON.stringify(configFields[field]) !== JSON.stringify(latestConfig[field])
      );
      if (changedFields.length > 0) {
        const newVersionId = crypto.randomUUID();
        const newVersionNumber = latestVersion.versionNumber + 1;
        await this.createVersion({
          id: newVersionId,
          workspaceId: id,
          versionNumber: newVersionNumber,
          ...newConfig,
          changedFields,
          changeMessage: `Updated ${changedFields.join(", ")}`
        });
      }
    }
    this.db.workspaces.set(id, updatedConfig);
    return this.deepCopyConfig(updatedConfig);
  }
  async delete(id) {
    this.db.workspaces.delete(id);
    await this.deleteVersionsByParentId(id);
  }
  async list(args) {
    const { page = 0, perPage: perPageInput, orderBy, authorId, metadata } = args || {};
    const { field, direction } = this.parseOrderBy(orderBy);
    const perPage = normalizePerPage(perPageInput, 100);
    if (page < 0) {
      throw new Error("page must be >= 0");
    }
    const maxOffset = Number.MAX_SAFE_INTEGER / 2;
    if (page * perPage > maxOffset) {
      throw new Error("page value too large");
    }
    let configs = Array.from(this.db.workspaces.values());
    if (authorId !== void 0) {
      configs = configs.filter((config) => config.authorId === authorId);
    }
    if (metadata && Object.keys(metadata).length > 0) {
      configs = configs.filter((config) => {
        if (!config.metadata) return false;
        return Object.entries(metadata).every(([key, value]) => deepEqual(config.metadata[key], value));
      });
    }
    const sortedConfigs = this.sortConfigs(configs, field, direction);
    const clonedConfigs = sortedConfigs.map((config) => this.deepCopyConfig(config));
    const { offset, perPage: perPageForResponse } = calculatePagination(page, perPageInput, perPage);
    return {
      workspaces: clonedConfigs.slice(offset, offset + perPage),
      total: clonedConfigs.length,
      page,
      perPage: perPageForResponse,
      hasMore: offset + perPage < clonedConfigs.length
    };
  }
  // ==========================================================================
  // Workspace Version Methods
  // ==========================================================================
  async createVersion(input) {
    if (this.db.workspaceVersions.has(input.id)) {
      throw new Error(`Version with id ${input.id} already exists`);
    }
    for (const version2 of this.db.workspaceVersions.values()) {
      if (version2.workspaceId === input.workspaceId && version2.versionNumber === input.versionNumber) {
        throw new Error(`Version number ${input.versionNumber} already exists for workspace ${input.workspaceId}`);
      }
    }
    const version = {
      ...input,
      createdAt: /* @__PURE__ */ new Date()
    };
    this.db.workspaceVersions.set(input.id, this.deepCopyVersion(version));
    return this.deepCopyVersion(version);
  }
  async getVersion(id) {
    const version = this.db.workspaceVersions.get(id);
    return version ? this.deepCopyVersion(version) : null;
  }
  async getVersionByNumber(workspaceId, versionNumber) {
    for (const version of this.db.workspaceVersions.values()) {
      if (version.workspaceId === workspaceId && version.versionNumber === versionNumber) {
        return this.deepCopyVersion(version);
      }
    }
    return null;
  }
  async getLatestVersion(workspaceId) {
    let latest = null;
    for (const version of this.db.workspaceVersions.values()) {
      if (version.workspaceId === workspaceId) {
        if (!latest || version.versionNumber > latest.versionNumber) {
          latest = version;
        }
      }
    }
    return latest ? this.deepCopyVersion(latest) : null;
  }
  async listVersions(input) {
    const { workspaceId, page = 0, perPage: perPageInput, orderBy } = input;
    const { field, direction } = this.parseVersionOrderBy(orderBy);
    const perPage = normalizePerPage(perPageInput, 20);
    if (page < 0) {
      throw new Error("page must be >= 0");
    }
    const maxOffset = Number.MAX_SAFE_INTEGER / 2;
    if (page * perPage > maxOffset) {
      throw new Error("page value too large");
    }
    let versions = Array.from(this.db.workspaceVersions.values()).filter((v) => v.workspaceId === workspaceId);
    versions = this.sortVersions(versions, field, direction);
    const clonedVersions = versions.map((v) => this.deepCopyVersion(v));
    const total = clonedVersions.length;
    const { offset, perPage: perPageForResponse } = calculatePagination(page, perPageInput, perPage);
    const paginatedVersions = clonedVersions.slice(offset, offset + perPage);
    return {
      versions: paginatedVersions,
      total,
      page,
      perPage: perPageForResponse,
      hasMore: offset + perPage < total
    };
  }
  async deleteVersion(id) {
    this.db.workspaceVersions.delete(id);
  }
  async deleteVersionsByParentId(entityId) {
    const idsToDelete = [];
    for (const [id, version] of this.db.workspaceVersions.entries()) {
      if (version.workspaceId === entityId) {
        idsToDelete.push(id);
      }
    }
    for (const id of idsToDelete) {
      this.db.workspaceVersions.delete(id);
    }
  }
  async countVersions(workspaceId) {
    let count = 0;
    for (const version of this.db.workspaceVersions.values()) {
      if (version.workspaceId === workspaceId) {
        count++;
      }
    }
    return count;
  }
  // ==========================================================================
  // Private Helper Methods
  // ==========================================================================
  deepCopyConfig(config) {
    return {
      ...config,
      metadata: config.metadata ? { ...config.metadata } : config.metadata
    };
  }
  deepCopyVersion(version) {
    return structuredClone(version);
  }
  sortConfigs(configs, field, direction) {
    return configs.sort((a, b) => {
      const aValue = a[field].getTime();
      const bValue = b[field].getTime();
      return direction === "ASC" ? aValue - bValue : bValue - aValue;
    });
  }
  sortVersions(versions, field, direction) {
    return versions.sort((a, b) => {
      let aVal;
      let bVal;
      if (field === "createdAt") {
        aVal = a.createdAt.getTime();
        bVal = b.createdAt.getTime();
      } else {
        aVal = a.versionNumber;
        bVal = b.versionNumber;
      }
      return direction === "ASC" ? aVal - bVal : bVal - aVal;
    });
  }
};

// src/storage/mock.ts
var InMemoryStore = class extends MastraCompositeStore {
  stores;
  /**
   * Internal database layer shared across all domains.
   * This is an implementation detail - domains interact with this
   * rather than managing their own data structures.
   */
  #db;
  constructor({ id = "in-memory" } = {}) {
    super({ id, name: "InMemoryStorage" });
    this.hasInitialized = Promise.resolve(true);
    this.#db = new InMemoryDB();
    this.stores = {
      memory: new InMemoryMemory({ db: this.#db }),
      workflows: new WorkflowsInMemory({ db: this.#db }),
      scores: new ScoresInMemory({ db: this.#db }),
      observability: new ObservabilityInMemory({ db: this.#db }),
      agents: new InMemoryAgentsStorage({ db: this.#db }),
      datasets: new DatasetsInMemory({ db: this.#db }),
      experiments: new ExperimentsInMemory({ db: this.#db }),
      promptBlocks: new InMemoryPromptBlocksStorage({ db: this.#db }),
      scorerDefinitions: new InMemoryScorerDefinitionsStorage({ db: this.#db }),
      mcpClients: new InMemoryMCPClientsStorage({ db: this.#db }),
      mcpServers: new InMemoryMCPServersStorage({ db: this.#db }),
      workspaces: new InMemoryWorkspacesStorage({ db: this.#db }),
      skills: new InMemorySkillsStorage({ db: this.#db }),
      blobs: new InMemoryBlobStore()
    };
  }
  /**
   * Clears all data from the in-memory database.
   * Useful for testing.
   * @deprecated Use dangerouslyClearAll() on individual domains instead.
   */
  clear() {
    this.#db.clear();
  }
};
var GitHistory = class {
  /** Cache: dir → repo root (string) or `false` if not a repo. */
  repoRootCache = /* @__PURE__ */ new Map();
  /** Cache: `dir:filename:limit` → ordered commits (newest first). */
  commitCache = /* @__PURE__ */ new Map();
  /** Cache: `dir:commitHash:filename` → parsed JSON. */
  snapshotCache = /* @__PURE__ */ new Map();
  // ===========================================================================
  // Public API
  // ===========================================================================
  /**
   * Returns `true` if `dir` is inside a Git repository.
   * Result is cached after the first call per directory.
   */
  async isGitRepo(dir) {
    const cached = this.repoRootCache.get(dir);
    if (cached === false) return false;
    if (typeof cached === "string") return true;
    try {
      const root = (await this.exec(dir, ["rev-parse", "--show-toplevel"])).trim();
      this.repoRootCache.set(dir, root);
      return true;
    } catch {
      this.repoRootCache.set(dir, false);
      return false;
    }
  }
  /**
   * Get the list of commits that touched a specific file, newest first.
   * Returns an empty array if Git is unavailable or the file has no history.
   *
   * @param dir      Absolute path to the storage directory
   * @param filename The JSON filename relative to `dir` (e.g., 'agents.json')
   * @param limit    Maximum number of commits to retrieve
   */
  async getFileHistory(dir, filename, limit = 50) {
    const cacheKey = `${dir}:${filename}:${limit}`;
    if (this.commitCache.has(cacheKey)) {
      return this.commitCache.get(cacheKey);
    }
    if (!await this.isGitRepo(dir)) {
      this.commitCache.set(cacheKey, []);
      return [];
    }
    try {
      const raw = await this.exec(dir, [
        "log",
        `--max-count=${limit}`,
        "--format=%H|%aI|%aN|%s",
        "--follow",
        "--",
        filename
      ]);
      const commits = [];
      for (const line of raw.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const pipeIdx1 = trimmed.indexOf("|");
        const pipeIdx2 = trimmed.indexOf("|", pipeIdx1 + 1);
        const pipeIdx3 = trimmed.indexOf("|", pipeIdx2 + 1);
        if (pipeIdx1 === -1 || pipeIdx2 === -1 || pipeIdx3 === -1) continue;
        commits.push({
          hash: trimmed.slice(0, pipeIdx1),
          date: new Date(trimmed.slice(pipeIdx1 + 1, pipeIdx2)),
          author: trimmed.slice(pipeIdx2 + 1, pipeIdx3),
          message: trimmed.slice(pipeIdx3 + 1)
        });
      }
      this.commitCache.set(cacheKey, commits);
      return commits;
    } catch {
      this.commitCache.set(cacheKey, []);
      return [];
    }
  }
  /**
   * Read and parse a JSON file at a specific Git commit.
   * Returns the parsed entity map, or `null` if the file didn't exist at that commit.
   *
   * @param dir        Absolute path to the storage directory
   * @param commitHash Full or abbreviated commit SHA
   * @param filename   The JSON filename relative to `dir` (e.g., 'agents.json')
   */
  async getFileAtCommit(dir, commitHash, filename) {
    const cacheKey = `${dir}:${commitHash}:${filename}`;
    if (this.snapshotCache.has(cacheKey)) {
      return this.snapshotCache.get(cacheKey);
    }
    if (!await this.isGitRepo(dir)) return null;
    try {
      const relPath = this.relativeToRepo(dir, filename);
      const raw = await this.exec(dir, ["show", `${commitHash}:${relPath}`]);
      const parsed = JSON.parse(raw);
      this.snapshotCache.set(cacheKey, parsed);
      return parsed;
    } catch {
      return null;
    }
  }
  /**
   * Invalidate all caches. Call after external operations that change Git state
   * (e.g., the user commits or pulls).
   */
  invalidateCache() {
    this.repoRootCache.clear();
    this.commitCache.clear();
    this.snapshotCache.clear();
  }
  // ===========================================================================
  // Internals
  // ===========================================================================
  /**
   * Get the relative path from the Git repo root to a file in the storage directory.
   */
  relativeToRepo(dir, filename) {
    const root = this.repoRootCache.get(dir);
    if (!root) {
      throw new Error(`Not a git repository: ${dir}`);
    }
    const realRoot = realpathSync(root);
    const realDir = realpathSync(dir);
    const relDir = relative(realRoot, realDir);
    return relDir ? `${relDir}/${filename}` : filename;
  }
  /**
   * Execute a git command and return stdout.
   */
  exec(cwd, args) {
    return new Promise((resolve3, reject) => {
      execFile("git", args, { cwd, maxBuffer: 10 * 1024 * 1024 }, (error, stdout) => {
        if (error) reject(error);
        else resolve3(stdout);
      });
    });
  }
};

// src/storage/filesystem-versioned.ts
var GIT_VERSION_PREFIX = "git-";
(class _FilesystemVersionedHelpers {
  db;
  entitiesFile;
  parentIdField;
  name;
  versionMetadataFields;
  gitHistoryLimit;
  /**
   * In-memory entity records (thin metadata), keyed by entity ID.
   */
  entities = /* @__PURE__ */ new Map();
  /**
   * In-memory version records, keyed by version ID.
   * Includes both in-memory/hydrated versions and git-based versions (metadata only).
   */
  versions = /* @__PURE__ */ new Map();
  /**
   * Whether we've loaded from disk yet.
   */
  hydrated = false;
  /**
   * Git history utility instance (shared across all helpers).
   */
  static gitHistory = new GitHistory();
  /**
   * Promise that resolves when git history has been loaded.
   * null means git history loading hasn't been triggered yet.
   */
  gitHistoryPromise = null;
  /**
   * The highest version number from git history, per entity ID.
   * Used to assign version numbers to new in-memory versions that continue
   * after the git history.
   */
  gitVersionCounts = /* @__PURE__ */ new Map();
  constructor(config) {
    this.db = config.db;
    this.entitiesFile = config.entitiesFile;
    this.parentIdField = config.parentIdField;
    this.name = config.name;
    this.versionMetadataFields = config.versionMetadataFields;
    this.gitHistoryLimit = config.gitHistoryLimit ?? 50;
  }
  /**
   * Check if a version ID represents a git-based version.
   */
  static isGitVersion(id) {
    return id.startsWith(GIT_VERSION_PREFIX);
  }
  /**
   * Hydrate in-memory state from the on-disk JSON file.
   * For each entry on disk, creates an in-memory entity (status: 'published')
   * and a synthetic version with the snapshot config.
   *
   * Also kicks off async git history loading in the background.
   * Version numbers for hydrated entities are assigned as 1 initially,
   * but will be reassigned after git history loads.
   */
  hydrate() {
    if (this.hydrated) return;
    this.hydrated = true;
    const diskData = this.db.readDomain(this.entitiesFile);
    for (const [entityId, snapshotConfig] of Object.entries(diskData)) {
      if (!snapshotConfig || typeof snapshotConfig !== "object") continue;
      const versionId = `hydrated-${entityId}-v1`;
      const now = /* @__PURE__ */ new Date();
      const entity = {
        id: entityId,
        status: "published",
        activeVersionId: versionId,
        createdAt: now,
        updatedAt: now
      };
      this.entities.set(entityId, entity);
      const version = {
        id: versionId,
        [this.parentIdField]: entityId,
        versionNumber: 1,
        ...snapshotConfig,
        createdAt: now
      };
      this.versions.set(versionId, version);
    }
    this.gitHistoryPromise = this.loadGitHistory();
  }
  /**
   * Ensure git history has been loaded before proceeding.
   * Call this in version-related methods to ensure git versions are available.
   */
  async ensureGitHistory() {
    this.hydrate();
    if (this.gitHistoryPromise) {
      await this.gitHistoryPromise;
    }
  }
  /**
   * Load git commit history for the domain's JSON file.
   * Creates read-only version records (metadata + snapshot config) for each
   * commit where an entity existed. Reassigns version numbers for
   * hydrated (current disk) versions to sit on top of git history.
   */
  async loadGitHistory() {
    const git = _FilesystemVersionedHelpers.gitHistory;
    const dir = this.db.dir;
    const isRepo = await git.isGitRepo(dir);
    if (!isRepo) return;
    const commits = await git.getFileHistory(dir, this.entitiesFile, this.gitHistoryLimit);
    if (commits.length === 0) return;
    const orderedCommits = [...commits].reverse();
    const entityVersionCount = /* @__PURE__ */ new Map();
    const previousSnapshots = /* @__PURE__ */ new Map();
    for (let i = 0; i < orderedCommits.length; i++) {
      const commit = orderedCommits[i];
      const fileContent = await git.getFileAtCommit(
        dir,
        commit.hash,
        this.entitiesFile
      );
      if (!fileContent) continue;
      for (const [entityId, snapshotConfig] of Object.entries(fileContent)) {
        if (!snapshotConfig || typeof snapshotConfig !== "object") continue;
        const serialized = JSON.stringify(snapshotConfig);
        if (previousSnapshots.get(entityId) === serialized) continue;
        previousSnapshots.set(entityId, serialized);
        const count = (entityVersionCount.get(entityId) ?? 0) + 1;
        entityVersionCount.set(entityId, count);
        const versionId = `${GIT_VERSION_PREFIX}${commit.hash}-${entityId}`;
        if (this.versions.has(versionId)) continue;
        const version = {
          id: versionId,
          [this.parentIdField]: entityId,
          versionNumber: count,
          changeMessage: commit.message,
          ...snapshotConfig,
          createdAt: commit.date
        };
        this.versions.set(versionId, version);
      }
    }
    this.gitVersionCounts = entityVersionCount;
    for (const [entityId, gitCount] of entityVersionCount) {
      const hydratedVersionId = `hydrated-${entityId}-v1`;
      const version = this.versions.get(hydratedVersionId);
      if (version) {
        version.versionNumber = gitCount + 1;
      }
    }
  }
  // ==========================================================================
  // Disk persistence — only published snapshot configs
  // ==========================================================================
  /**
   * Write the published snapshot config for an entity to disk.
   * Strips all entity metadata and version metadata fields, leaving only
   * the clean primitive configuration.
   */
  persistToDisk() {
    const diskData = {};
    for (const [entityId, entity] of this.entities) {
      if (entity.status !== "published" || !entity.activeVersionId) continue;
      const version = this.versions.get(entity.activeVersionId);
      if (!version) continue;
      const snapshotConfig = this.extractSnapshotConfig(version);
      diskData[entityId] = snapshotConfig;
    }
    this.db.writeDomain(this.entitiesFile, diskData);
  }
  /**
   * Extract the snapshot config from a version, stripping version metadata fields.
   */
  extractSnapshotConfig(version) {
    const metadataSet = new Set(this.versionMetadataFields);
    const result = {};
    for (const [key, value] of Object.entries(version)) {
      if (!metadataSet.has(key)) {
        result[key] = value;
      }
    }
    return result;
  }
  // ==========================================================================
  // Entity CRUD
  // ==========================================================================
  async getById(id) {
    this.hydrate();
    return this.entities.has(id) ? structuredClone(this.entities.get(id)) : null;
  }
  async createEntity(id, entity) {
    this.hydrate();
    if (this.entities.has(id)) {
      throw new Error(`${this.name}: entity with id ${id} already exists`);
    }
    this.entities.set(id, structuredClone(entity));
    return structuredClone(entity);
  }
  async updateEntity(id, updates) {
    this.hydrate();
    const existing = this.entities.get(id);
    if (!existing) {
      throw new Error(`${this.name}: entity with id ${id} not found`);
    }
    const updated = { ...existing };
    for (const [key, value] of Object.entries(updates)) {
      if (key === "id") continue;
      if (value === void 0) continue;
      if (key === "metadata" && typeof value === "object" && value !== null) {
        updated["metadata"] = {
          ...updated["metadata"] ?? {},
          ...value
        };
      } else {
        updated[key] = value;
      }
    }
    updated["updatedAt"] = /* @__PURE__ */ new Date();
    const updatedEntity = updated;
    this.entities.set(id, structuredClone(updatedEntity));
    const wasPublished = existing.status === "published";
    const isPublished = updatedEntity.status === "published" && updatedEntity.activeVersionId;
    if (isPublished || wasPublished && updates["status"] !== void 0) {
      this.persistToDisk();
    }
    return structuredClone(updatedEntity);
  }
  async deleteEntity(id) {
    this.hydrate();
    this.entities.delete(id);
    await this.deleteVersionsByParentId(id);
    this.persistToDisk();
  }
  async listEntities(args) {
    this.hydrate();
    const { page = 0, perPage: perPageInput, orderBy, filters, listKey } = args;
    const perPage = normalizePerPage(perPageInput, 100);
    if (page < 0) throw new Error("page must be >= 0");
    let entities = Array.from(this.entities.values());
    if (filters) {
      for (const [key, value] of Object.entries(filters)) {
        if (value === void 0) continue;
        if (key === "metadata" && typeof value === "object" && value !== null) {
          entities = entities.filter((e) => {
            const meta = e["metadata"];
            if (!meta) return false;
            return Object.entries(value).every(
              ([k, v]) => JSON.stringify(meta[k]) === JSON.stringify(v)
            );
          });
        } else {
          entities = entities.filter((e) => e[key] === value);
        }
      }
    }
    const field = orderBy?.field ?? "createdAt";
    const direction = orderBy?.direction ?? "DESC";
    entities.sort((a, b) => {
      const aVal = new Date(a[field]).getTime();
      const bVal = new Date(b[field]).getTime();
      return direction === "ASC" ? aVal - bVal : bVal - aVal;
    });
    const { offset, perPage: perPageForResponse } = calculatePagination(page, perPageInput, perPage);
    return {
      [listKey]: entities.slice(offset, offset + perPage),
      total: entities.length,
      page,
      perPage: perPageForResponse,
      hasMore: offset + perPage < entities.length
    };
  }
  // ==========================================================================
  // Version Methods (in-memory + git history)
  // ==========================================================================
  async createVersion(input) {
    await this.ensureGitHistory();
    if (this.versions.has(input.id)) {
      throw new Error(`${this.name}: version with id ${input.id} already exists`);
    }
    const parentId = input[this.parentIdField];
    for (const v of this.versions.values()) {
      if (v[this.parentIdField] === parentId && v.versionNumber === input.versionNumber) {
        throw new Error(`${this.name}: version number ${input.versionNumber} already exists for entity ${parentId}`);
      }
    }
    const version = {
      ...input,
      createdAt: /* @__PURE__ */ new Date()
    };
    this.versions.set(input.id, structuredClone(version));
    return structuredClone(version);
  }
  async getVersion(id) {
    await this.ensureGitHistory();
    return this.versions.has(id) ? structuredClone(this.versions.get(id)) : null;
  }
  async getVersionByNumber(entityId, versionNumber) {
    await this.ensureGitHistory();
    for (const v of this.versions.values()) {
      if (v[this.parentIdField] === entityId && v.versionNumber === versionNumber) {
        return structuredClone(v);
      }
    }
    return null;
  }
  async getLatestVersion(entityId) {
    await this.ensureGitHistory();
    let latest = null;
    for (const v of this.versions.values()) {
      if (v[this.parentIdField] === entityId) {
        if (!latest || v.versionNumber > latest.versionNumber) {
          latest = v;
        }
      }
    }
    return latest ? structuredClone(latest) : null;
  }
  async listVersions(input, parentIdField) {
    await this.ensureGitHistory();
    const { page = 0, perPage: perPageInput, orderBy } = input;
    const entityId = input[parentIdField];
    const perPage = normalizePerPage(perPageInput, 20);
    if (page < 0) throw new Error("page must be >= 0");
    let versions = Array.from(this.versions.values()).filter(
      (v) => v[this.parentIdField] === entityId
    );
    const field = orderBy?.field ?? "versionNumber";
    const direction = orderBy?.direction ?? "DESC";
    versions.sort((a, b) => {
      const aVal = field === "createdAt" ? new Date(a.createdAt).getTime() : a.versionNumber;
      const bVal = field === "createdAt" ? new Date(b.createdAt).getTime() : b.versionNumber;
      return direction === "ASC" ? aVal - bVal : bVal - aVal;
    });
    const { offset, perPage: perPageForResponse } = calculatePagination(page, perPageInput, perPage);
    return {
      versions: versions.slice(offset, offset + perPage),
      total: versions.length,
      page,
      perPage: perPageForResponse,
      hasMore: offset + perPage < versions.length
    };
  }
  async deleteVersion(id) {
    await this.ensureGitHistory();
    if (_FilesystemVersionedHelpers.isGitVersion(id)) return;
    this.versions.delete(id);
  }
  async deleteVersionsByParentId(entityId) {
    await this.ensureGitHistory();
    for (const [versionId, version] of this.versions) {
      if (version[this.parentIdField] === entityId) {
        if (_FilesystemVersionedHelpers.isGitVersion(versionId)) continue;
        this.versions.delete(versionId);
      }
    }
  }
  async countVersions(entityId) {
    await this.ensureGitHistory();
    let count = 0;
    for (const v of this.versions.values()) {
      if (v[this.parentIdField] === entityId) {
        count++;
      }
    }
    return count;
  }
  async getNextVersionNumber(entityId) {
    await this.ensureGitHistory();
    return this._getNextVersionNumber(entityId);
  }
  _getNextVersionNumber(entityId) {
    const gitCount = this.gitVersionCounts.get(entityId) ?? 0;
    let maxVersion = gitCount;
    for (const v of this.versions.values()) {
      if (v[this.parentIdField] === entityId) {
        maxVersion = Math.max(maxVersion, v.versionNumber);
      }
    }
    return maxVersion + 1;
  }
  async dangerouslyClearAll() {
    this.entities.clear();
    this.versions.clear();
    this.gitVersionCounts.clear();
    this.gitHistoryPromise = null;
    this.hydrated = false;
    this.db.clearDomain(this.entitiesFile);
  }
});

export { APICallError as A, InMemoryStore as I, MessageList as M, __commonJS as _, __require2 as a, coreContentToString as b, createPendingMarker as c, isAbortError as d, sanitizeToolName as e, injectJsonInstructionIntoMessages as f, generateId as g, asSchema as h, isDeepEqualData as i, parsePartialJson as p, require_token_error as r, stepCountIs as s, tool as t };
//# sourceMappingURL=chunk-EQOFWEGB.mjs.map
