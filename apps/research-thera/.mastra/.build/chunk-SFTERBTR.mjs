import { c as commonjsRequire } from './_commonjs-dynamic-modules.mjs';
import { o as object$2, b as array$1, h as unknown, y as discriminatedUnion, s as string, l as literal, n as number, r as record, u as union, z as _instanceof, A as custom, B as lazy, C as _null, e as boolean, D as safeParseAsync, a as any, _ as _enum } from './schemas.mjs';
import { t as toJSONSchema } from './to-json-schema.mjs';
import { Z as ZodFirstPartyTypeKind, o as objectType, n as numberType, s as stringType, a as arrayType, e as enumType, u as unionType, i as instanceOfType, c as custom$1, l as lazyType, b as nullType, d as booleanType, r as recordType, f as literalType, g as unknownType, h as optionalType } from './types.mjs';

var __create$2 = Object.create;
var __defProp$3 = Object.defineProperty;
var __getOwnPropDesc$2 = Object.getOwnPropertyDescriptor;
var __getOwnPropNames$2 = Object.getOwnPropertyNames;
var __getProtoOf$2 = Object.getPrototypeOf;
var __hasOwnProp$2 = Object.prototype.hasOwnProperty;
var __require = /* @__PURE__ */ ((x) => typeof commonjsRequire !== "undefined" ? commonjsRequire : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof commonjsRequire !== "undefined" ? commonjsRequire : a)[b]
}) : x)(function(x) {
  if (typeof commonjsRequire !== "undefined") return commonjsRequire.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __commonJS$2 = (cb, mod) => function __require2() {
  return mod || (0, cb[__getOwnPropNames$2(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export$2 = (target, all) => {
  for (var name in all)
    __defProp$3(target, name, { get: all[name], enumerable: true });
};
var __copyProps$2 = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames$2(from))
      if (!__hasOwnProp$2.call(to, key) && key !== except)
        __defProp$3(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc$2(from, key)) || desc.enumerable });
  }
  return to;
};
var __reExport = (target, mod, secondTarget) => (__copyProps$2(target, mod, "default"), secondTarget && __copyProps$2(secondTarget, mod, "default"));
var __toESM$2 = (mod, isNodeMode, target) => (target = mod != null ? __create$2(__getProtoOf$2(mod)) : {}, __copyProps$2(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp$3(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// ../_vendored/ai_v6/dist/chunk-7D4SUZUM.js
var __create$1 = Object.create;
var __defProp$2 = Object.defineProperty;
var __getOwnPropDesc$1 = Object.getOwnPropertyDescriptor;
var __getOwnPropNames$1 = Object.getOwnPropertyNames;
var __getProtoOf$1 = Object.getPrototypeOf;
var __hasOwnProp$1 = Object.prototype.hasOwnProperty;
var __require2 = /* @__PURE__ */ ((x) => typeof __require !== "undefined" ? __require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof __require !== "undefined" ? __require : a)[b]
}) : x)(function(x) {
  if (typeof __require !== "undefined") return __require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __commonJS$1 = (cb, mod) => function __require22() {
  return mod || (0, cb[__getOwnPropNames$1(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps$1 = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames$1(from))
      if (!__hasOwnProp$1.call(to, key) && key !== except)
        __defProp$2(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc$1(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM$1 = (mod, isNodeMode, target) => (target = mod != null ? __create$1(__getProtoOf$1(mod)) : {}, __copyProps$1(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp$2(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// ../_vendored/ai_v6/dist/chunk-QOME2VME.js
var require_token_error = __commonJS$1({
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

var marker$1 = "vercel.ai.error";
var symbol$1 = Symbol.for(marker$1);
var _a$1;
var _b;
var AISDKError$1 = class _AISDKError extends (_b = Error, _a$1 = symbol$1, _b) {
  /**
   * Creates an AI SDK Error.
   *
   * @param {Object} params - The parameters for creating the error.
   * @param {string} params.name - The name of the error.
   * @param {string} params.message - The error message.
   * @param {unknown} [params.cause] - The underlying cause of the error.
   */
  constructor({
    name: name1422,
    message,
    cause
  }) {
    super(message);
    this[_a$1] = true;
    this.name = name1422;
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
  static hasMarker(error, marker1522) {
    const markerSymbol = Symbol.for(marker1522);
    return error != null && typeof error === "object" && markerSymbol in error && typeof error[markerSymbol] === "boolean" && error[markerSymbol] === true;
  }
};
var name$1 = "AI_APICallError";
var marker2$1 = `vercel.ai.error.${name$1}`;
var symbol2$1 = Symbol.for(marker2$1);
var _a2$1;
var _b2;
var APICallError$1 = class APICallError extends (_b2 = AISDKError$1, _a2$1 = symbol2$1, _b2) {
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
    return AISDKError$1.hasMarker(error, marker2$1);
  }
};
var name2 = "AI_EmptyResponseBodyError";
var marker3 = `vercel.ai.error.${name2}`;
var symbol3 = Symbol.for(marker3);
var _a3;
var _b3;
var EmptyResponseBodyError = class extends (_b3 = AISDKError$1, _a3 = symbol3, _b3) {
  // used in isInstance
  constructor({ message = "Empty response body" } = {}) {
    super({ name: name2, message });
    this[_a3] = true;
  }
  static isInstance(error) {
    return AISDKError$1.hasMarker(error, marker3);
  }
};
function getErrorMessage$1(error) {
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
var _b4;
var InvalidArgumentError$1 = class InvalidArgumentError extends (_b4 = AISDKError$1, _a4$1 = symbol4$1, _b4) {
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
    return AISDKError$1.hasMarker(error, marker4$1);
  }
};
var name4$1 = "AI_InvalidPromptError";
var marker5$1 = `vercel.ai.error.${name4$1}`;
var symbol5$1 = Symbol.for(marker5$1);
var _a5$1;
var _b5;
var InvalidPromptError$1 = class InvalidPromptError extends (_b5 = AISDKError$1, _a5$1 = symbol5$1, _b5) {
  constructor({
    prompt,
    message,
    cause
  }) {
    super({ name: name4$1, message: `Invalid prompt: ${message}`, cause });
    this[_a5$1] = true;
    this.prompt = prompt;
  }
  static isInstance(error) {
    return AISDKError$1.hasMarker(error, marker5$1);
  }
};
var name6$1 = "AI_JSONParseError";
var marker7$1 = `vercel.ai.error.${name6$1}`;
var symbol7$1 = Symbol.for(marker7$1);
var _a7$1;
var _b7;
var JSONParseError$1 = class JSONParseError extends (_b7 = AISDKError$1, _a7$1 = symbol7$1, _b7) {
  constructor({ text: text2, cause }) {
    super({
      name: name6$1,
      message: `JSON parsing failed: Text: ${text2}.
Error message: ${getErrorMessage$1(cause)}`,
      cause
    });
    this[_a7$1] = true;
    this.text = text2;
  }
  static isInstance(error) {
    return AISDKError$1.hasMarker(error, marker7$1);
  }
};
var name12$1 = "AI_TypeValidationError";
var marker13$1 = `vercel.ai.error.${name12$1}`;
var symbol13$1 = Symbol.for(marker13$1);
var _a13$1;
var _b13;
var TypeValidationError$1 = class _TypeValidationError extends (_b13 = AISDKError$1, _a13$1 = symbol13$1, _b13) {
  constructor({
    value,
    cause,
    context: context2
  }) {
    let contextPrefix = "Type validation failed";
    if (context2 == null ? void 0 : context2.field) {
      contextPrefix += ` for ${context2.field}`;
    }
    if ((context2 == null ? void 0 : context2.entityName) || (context2 == null ? void 0 : context2.entityId)) {
      contextPrefix += " (";
      const parts = [];
      if (context2.entityName) {
        parts.push(context2.entityName);
      }
      if (context2.entityId) {
        parts.push(`id: "${context2.entityId}"`);
      }
      contextPrefix += parts.join(", ");
      contextPrefix += ")";
    }
    super({
      name: name12$1,
      message: `${contextPrefix}: Value: ${JSON.stringify(value)}.
Error message: ${getErrorMessage$1(cause)}`,
      cause
    });
    this[_a13$1] = true;
    this.value = value;
    this.context = context2;
  }
  static isInstance(error) {
    return AISDKError$1.hasMarker(error, marker13$1);
  }
  /**
   * Wraps an error into a TypeValidationError.
   * If the cause is already a TypeValidationError with the same value and context, it returns the cause.
   * Otherwise, it creates a new TypeValidationError.
   *
   * @param {Object} params - The parameters for wrapping the error.
   * @param {unknown} params.value - The value that failed validation.
   * @param {unknown} params.cause - The original error or cause of the validation failure.
   * @param {TypeValidationContext} params.context - Optional context about what is being validated.
   * @returns {TypeValidationError} A TypeValidationError instance.
   */
  static wrap({
    value,
    cause,
    context: context2
  }) {
    var _a1522, _b152, _c;
    if (_TypeValidationError.isInstance(cause) && cause.value === value && ((_a1522 = cause.context) == null ? void 0 : _a1522.field) === (context2 == null ? void 0 : context2.field) && ((_b152 = cause.context) == null ? void 0 : _b152.entityName) === (context2 == null ? void 0 : context2.entityName) && ((_c = cause.context) == null ? void 0 : _c.entityId) === (context2 == null ? void 0 : context2.entityId)) {
      return cause;
    }
    return new _TypeValidationError({ value, cause, context: context2 });
  }
};
var name13$1 = "AI_UnsupportedFunctionalityError";
var marker14$1 = `vercel.ai.error.${name13$1}`;
var symbol14$1 = Symbol.for(marker14$1);
var _a14$1;
var _b14;
var UnsupportedFunctionalityError$1 = class UnsupportedFunctionalityError extends (_b14 = AISDKError$1, _a14$1 = symbol14$1, _b14) {
  constructor({
    functionality,
    message = `'${functionality}' functionality not supported.`
  }) {
    super({ name: name13$1, message });
    this[_a14$1] = true;
    this.functionality = functionality;
  }
  static isInstance(error) {
    return AISDKError$1.hasMarker(error, marker14$1);
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
async function delay$1(delayInMs, options) {
  if (delayInMs == null) {
    return Promise.resolve();
  }
  const signal = options == null ? void 0 : options.abortSignal;
  return new Promise((resolve2, reject) => {
    if (signal == null ? void 0 : signal.aborted) {
      reject(createAbortError());
      return;
    }
    const timeoutId = setTimeout(() => {
      cleanup();
      resolve2();
    }, delayInMs);
    const cleanup = () => {
      clearTimeout(timeoutId);
      signal == null ? void 0 : signal.removeEventListener("abort", onAbort);
    };
    const onAbort = () => {
      cleanup();
      reject(createAbortError());
    };
    signal == null ? void 0 : signal.addEventListener("abort", onAbort);
  });
}
function createAbortError() {
  return new DOMException("Delay was aborted", "AbortError");
}
var DelayedPromise$1 = class DelayedPromise {
  constructor() {
    this.status = { type: "pending" };
    this._resolve = void 0;
    this._reject = void 0;
  }
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
    var _a223;
    this.status = { type: "resolved", value };
    if (this._promise) {
      (_a223 = this._resolve) == null ? void 0 : _a223.call(this, value);
    }
  }
  reject(error) {
    var _a223;
    this.status = { type: "rejected", error };
    if (this._promise) {
      (_a223 = this._reject) == null ? void 0 : _a223.call(this, error);
    }
  }
  isResolved() {
    return this.status.type === "resolved";
  }
  isRejected() {
    return this.status.type === "rejected";
  }
  isPending() {
    return this.status.type === "pending";
  }
};
function extractResponseHeaders(response) {
  return Object.fromEntries([...response.headers]);
}
var { btoa: btoa$1, atob: atob$1 } = globalThis;
function convertBase64ToUint8Array$1(base64String) {
  const base64Url = base64String.replace(/-/g, "+").replace(/_/g, "/");
  const latin1string = atob$1(base64Url);
  return Uint8Array.from(latin1string, (byte) => byte.codePointAt(0));
}
function convertUint8ArrayToBase64$1(array2) {
  let latin1string = "";
  for (let i = 0; i < array2.length; i++) {
    latin1string += String.fromCodePoint(array2[i]);
  }
  return btoa$1(latin1string);
}
var name14$1 = "AI_DownloadError";
var marker15 = `vercel.ai.error.${name14$1}`;
var symbol15 = Symbol.for(marker15);
var _a15;
var _b15;
var DownloadError$1 = class DownloadError extends (_b15 = AISDKError$1, _a15 = symbol15, _b15) {
  constructor({
    url,
    statusCode,
    statusText,
    cause,
    message = cause == null ? `Failed to download ${url}: ${statusCode} ${statusText}` : `Failed to download ${url}: ${cause}`
  }) {
    super({ name: name14$1, message, cause });
    this[_a15] = true;
    this.url = url;
    this.statusCode = statusCode;
    this.statusText = statusText;
  }
  static isInstance(error) {
    return AISDKError$1.hasMarker(error, marker15);
  }
};
var DEFAULT_MAX_DOWNLOAD_SIZE = 2 * 1024 * 1024 * 1024;
async function readResponseWithSizeLimit({
  response,
  url,
  maxBytes = DEFAULT_MAX_DOWNLOAD_SIZE
}) {
  const contentLength = response.headers.get("content-length");
  if (contentLength != null) {
    const length = parseInt(contentLength, 10);
    if (!isNaN(length) && length > maxBytes) {
      throw new DownloadError$1({
        url,
        message: `Download of ${url} exceeded maximum size of ${maxBytes} bytes (Content-Length: ${length}).`
      });
    }
  }
  const body = response.body;
  if (body == null) {
    return new Uint8Array(0);
  }
  const reader = body.getReader();
  const chunks = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      totalBytes += value.length;
      if (totalBytes > maxBytes) {
        throw new DownloadError$1({
          url,
          message: `Download of ${url} exceeded maximum size of ${maxBytes} bytes.`
        });
      }
      chunks.push(value);
    }
  } finally {
    try {
      await reader.cancel();
    } finally {
      reader.releaseLock();
    }
  }
  const result = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}
function validateDownloadUrl(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch (e) {
    throw new DownloadError$1({
      url,
      message: `Invalid URL: ${url}`
    });
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new DownloadError$1({
      url,
      message: `URL scheme must be http or https, got ${parsed.protocol}`
    });
  }
  const hostname = parsed.hostname;
  if (!hostname) {
    throw new DownloadError$1({
      url,
      message: `URL must have a hostname`
    });
  }
  if (hostname === "localhost" || hostname.endsWith(".local") || hostname.endsWith(".localhost")) {
    throw new DownloadError$1({
      url,
      message: `URL with hostname ${hostname} is not allowed`
    });
  }
  if (hostname.startsWith("[") && hostname.endsWith("]")) {
    const ipv6 = hostname.slice(1, -1);
    if (isPrivateIPv6(ipv6)) {
      throw new DownloadError$1({
        url,
        message: `URL with IPv6 address ${hostname} is not allowed`
      });
    }
    return;
  }
  if (isIPv4(hostname)) {
    if (isPrivateIPv4(hostname)) {
      throw new DownloadError$1({
        url,
        message: `URL with IP address ${hostname} is not allowed`
      });
    }
    return;
  }
}
function isIPv4(hostname) {
  const parts = hostname.split(".");
  if (parts.length !== 4) return false;
  return parts.every((part) => {
    const num = Number(part);
    return Number.isInteger(num) && num >= 0 && num <= 255 && String(num) === part;
  });
}
function isPrivateIPv4(ip) {
  const parts = ip.split(".").map(Number);
  const [a, b] = parts;
  if (a === 0) return true;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}
function isPrivateIPv6(ip) {
  const normalized = ip.toLowerCase();
  if (normalized === "::1") return true;
  if (normalized === "::") return true;
  if (normalized.startsWith("::ffff:")) {
    const mappedPart = normalized.slice(7);
    if (isIPv4(mappedPart)) {
      return isPrivateIPv4(mappedPart);
    }
    const hexParts = mappedPart.split(":");
    if (hexParts.length === 2) {
      const high = parseInt(hexParts[0], 16);
      const low = parseInt(hexParts[1], 16);
      if (!isNaN(high) && !isNaN(low)) {
        const a = high >> 8 & 255;
        const b = high & 255;
        const c = low >> 8 & 255;
        const d = low & 255;
        return isPrivateIPv4(`${a}.${b}.${c}.${d}`);
      }
    }
  }
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
  if (normalized.startsWith("fe80")) return true;
  return false;
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
    throw new InvalidArgumentError$1({
      argument: "separator",
      message: `The separator "${separator}" must not be part of the alphabet "${alphabet}".`
    });
  }
  return () => `${prefix}${separator}${generator()}`;
};
createIdGenerator$1();
function getErrorMessage2$1(error) {
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
function isAbortError$1(error) {
  return (error instanceof Error || error instanceof DOMException) && (error.name === "AbortError" || error.name === "ResponseAborted" || // Next.js
  error.name === "TimeoutError");
}
var FETCH_FAILED_ERROR_MESSAGES = ["fetch failed", "failed to fetch"];
var BUN_ERROR_CODES = [
  "ConnectionRefused",
  "ConnectionClosed",
  "FailedToOpenSocket",
  "ECONNRESET",
  "ECONNREFUSED",
  "ETIMEDOUT",
  "EPIPE"
];
function isBunNetworkError(error) {
  if (!(error instanceof Error)) {
    return false;
  }
  const code = error.code;
  if (typeof code === "string" && BUN_ERROR_CODES.includes(code)) {
    return true;
  }
  return false;
}
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
      return new APICallError$1({
        message: `Cannot connect to API: ${cause.message}`,
        cause,
        url,
        requestBodyValues,
        isRetryable: true
        // retry when network error
      });
    }
  }
  if (isBunNetworkError(error)) {
    return new APICallError$1({
      message: `Cannot connect to API: ${error.message}`,
      cause: error,
      url,
      requestBodyValues,
      isRetryable: true
    });
  }
  return error;
}
function getRuntimeEnvironmentUserAgent(globalThisAny = globalThis) {
  var _a223, _b222, _c;
  if (globalThisAny.window) {
    return `runtime/browser`;
  }
  if ((_a223 = globalThisAny.navigator) == null ? void 0 : _a223.userAgent) {
    return `runtime/${globalThisAny.navigator.userAgent.toLowerCase()}`;
  }
  if ((_c = (_b222 = globalThisAny.process) == null ? void 0 : _b222.versions) == null ? void 0 : _c.node) {
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
var VERSION$1 = "4.0.19";
var getOriginalFetch = () => globalThis.fetch;
var getFromApi = async ({
  url,
  headers = {},
  successfulResponseHandler,
  failedResponseHandler,
  abortSignal,
  fetch: fetch2 = getOriginalFetch()
}) => {
  try {
    const response = await fetch2(url, {
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
        if (isAbortError$1(error) || APICallError$1.isInstance(error)) {
          throw error;
        }
        throw new APICallError$1({
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
        if (isAbortError$1(error) || APICallError$1.isInstance(error)) {
          throw error;
        }
      }
      throw new APICallError$1({
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
function _parse(text2) {
  const obj = JSON.parse(text2);
  if (obj === null || typeof obj !== "object") {
    return obj;
  }
  if (suspectProtoRx.test(text2) === false && suspectConstructorRx.test(text2) === false) {
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
function secureJsonParse(text2) {
  const { stackTraceLimit } = Error;
  try {
    Error.stackTraceLimit = 0;
  } catch (e) {
    return _parse(text2);
  }
  try {
    return _parse(text2);
  } finally {
    Error.stackTraceLimit = stackTraceLimit;
  }
}
function addAdditionalPropertiesToJsonSchema(jsonSchema2) {
  if (jsonSchema2.type === "object" || Array.isArray(jsonSchema2.type) && jsonSchema2.type.includes("object")) {
    jsonSchema2.additionalProperties = false;
    const { properties } = jsonSchema2;
    if (properties != null) {
      for (const key of Object.keys(properties)) {
        properties[key] = visit(properties[key]);
      }
    }
  }
  if (jsonSchema2.items != null) {
    jsonSchema2.items = Array.isArray(jsonSchema2.items) ? jsonSchema2.items.map(visit) : visit(jsonSchema2.items);
  }
  if (jsonSchema2.anyOf != null) {
    jsonSchema2.anyOf = jsonSchema2.anyOf.map(visit);
  }
  if (jsonSchema2.allOf != null) {
    jsonSchema2.allOf = jsonSchema2.allOf.map(visit);
  }
  if (jsonSchema2.oneOf != null) {
    jsonSchema2.oneOf = jsonSchema2.oneOf.map(visit);
  }
  const { definitions } = jsonSchema2;
  if (definitions != null) {
    for (const key of Object.keys(definitions)) {
      definitions[key] = visit(definitions[key]);
    }
  }
  return jsonSchema2;
}
function visit(def) {
  if (typeof def === "boolean") return def;
  return addAdditionalPropertiesToJsonSchema(def);
}
var ignoreOverride$1 = /* @__PURE__ */ Symbol(
  "Let zodToJsonSchema decide on which parser to use"
);
var defaultOptions$1 = {
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
var getDefaultOptions$1 = (options) => typeof options === "string" ? {
  ...defaultOptions$1,
  name: options
} : {
  ...defaultOptions$1,
  ...options
};
function parseAnyDef$1() {
  return {};
}
function parseArrayDef$1(def, refs) {
  var _a223, _b222, _c;
  const res = {
    type: "array"
  };
  if (((_a223 = def.type) == null ? void 0 : _a223._def) && ((_c = (_b222 = def.type) == null ? void 0 : _b222._def) == null ? void 0 : _c.typeName) !== ZodFirstPartyTypeKind.ZodAny) {
    res.items = parseDef$1(def.type._def, {
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
function parseBigintDef$1(def) {
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
function parseBooleanDef$1() {
  return { type: "boolean" };
}
function parseBrandedDef$1(_def, refs) {
  return parseDef$1(_def.type._def, refs);
}
var parseCatchDef$1 = (def, refs) => {
  return parseDef$1(def.innerType._def, refs);
};
function parseDateDef$1(def, refs, overrideDateStrategy) {
  const strategy = overrideDateStrategy != null ? overrideDateStrategy : refs.dateStrategy;
  if (Array.isArray(strategy)) {
    return {
      anyOf: strategy.map((item, i) => parseDateDef$1(def, refs, item))
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
      return integerDateParser$1(def);
  }
}
var integerDateParser$1 = (def) => {
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
function parseDefaultDef$1(_def, refs) {
  return {
    ...parseDef$1(_def.innerType._def, refs),
    default: _def.defaultValue()
  };
}
function parseEffectsDef$1(_def, refs) {
  return refs.effectStrategy === "input" ? parseDef$1(_def.schema._def, refs) : parseAnyDef$1();
}
function parseEnumDef$1(def) {
  return {
    type: "string",
    enum: Array.from(def.values)
  };
}
var isJsonSchema7AllOfType$1 = (type) => {
  if ("type" in type && type.type === "string") return false;
  return "allOf" in type;
};
function parseIntersectionDef$1(def, refs) {
  const allOf = [
    parseDef$1(def.left._def, {
      ...refs,
      currentPath: [...refs.currentPath, "allOf", "0"]
    }),
    parseDef$1(def.right._def, {
      ...refs,
      currentPath: [...refs.currentPath, "allOf", "1"]
    })
  ].filter((x) => !!x);
  const mergedAllOf = [];
  allOf.forEach((schema) => {
    if (isJsonSchema7AllOfType$1(schema)) {
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
function parseLiteralDef$1(def) {
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
var emojiRegex$1 = void 0;
var zodPatterns$1 = {
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
    if (emojiRegex$1 === void 0) {
      emojiRegex$1 = RegExp(
        "^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$",
        "u"
      );
    }
    return emojiRegex$1;
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
function parseStringDef$1(def, refs) {
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
              addFormat$1(res, "email", check.message, refs);
              break;
            case "format:idn-email":
              addFormat$1(res, "idn-email", check.message, refs);
              break;
            case "pattern:zod":
              addPattern$1(res, zodPatterns$1.email, check.message, refs);
              break;
          }
          break;
        case "url":
          addFormat$1(res, "uri", check.message, refs);
          break;
        case "uuid":
          addFormat$1(res, "uuid", check.message, refs);
          break;
        case "regex":
          addPattern$1(res, check.regex, check.message, refs);
          break;
        case "cuid":
          addPattern$1(res, zodPatterns$1.cuid, check.message, refs);
          break;
        case "cuid2":
          addPattern$1(res, zodPatterns$1.cuid2, check.message, refs);
          break;
        case "startsWith":
          addPattern$1(
            res,
            RegExp(`^${escapeLiteralCheckValue$1(check.value, refs)}`),
            check.message,
            refs
          );
          break;
        case "endsWith":
          addPattern$1(
            res,
            RegExp(`${escapeLiteralCheckValue$1(check.value, refs)}$`),
            check.message,
            refs
          );
          break;
        case "datetime":
          addFormat$1(res, "date-time", check.message, refs);
          break;
        case "date":
          addFormat$1(res, "date", check.message, refs);
          break;
        case "time":
          addFormat$1(res, "time", check.message, refs);
          break;
        case "duration":
          addFormat$1(res, "duration", check.message, refs);
          break;
        case "length":
          res.minLength = typeof res.minLength === "number" ? Math.max(res.minLength, check.value) : check.value;
          res.maxLength = typeof res.maxLength === "number" ? Math.min(res.maxLength, check.value) : check.value;
          break;
        case "includes": {
          addPattern$1(
            res,
            RegExp(escapeLiteralCheckValue$1(check.value, refs)),
            check.message,
            refs
          );
          break;
        }
        case "ip": {
          if (check.version !== "v6") {
            addFormat$1(res, "ipv4", check.message, refs);
          }
          if (check.version !== "v4") {
            addFormat$1(res, "ipv6", check.message, refs);
          }
          break;
        }
        case "base64url":
          addPattern$1(res, zodPatterns$1.base64url, check.message, refs);
          break;
        case "jwt":
          addPattern$1(res, zodPatterns$1.jwt, check.message, refs);
          break;
        case "cidr": {
          if (check.version !== "v6") {
            addPattern$1(res, zodPatterns$1.ipv4Cidr, check.message, refs);
          }
          if (check.version !== "v4") {
            addPattern$1(res, zodPatterns$1.ipv6Cidr, check.message, refs);
          }
          break;
        }
        case "emoji":
          addPattern$1(res, zodPatterns$1.emoji(), check.message, refs);
          break;
        case "ulid": {
          addPattern$1(res, zodPatterns$1.ulid, check.message, refs);
          break;
        }
        case "base64": {
          switch (refs.base64Strategy) {
            case "format:binary": {
              addFormat$1(res, "binary", check.message, refs);
              break;
            }
            case "contentEncoding:base64": {
              res.contentEncoding = "base64";
              break;
            }
            case "pattern:zod": {
              addPattern$1(res, zodPatterns$1.base64, check.message, refs);
              break;
            }
          }
          break;
        }
        case "nanoid": {
          addPattern$1(res, zodPatterns$1.nanoid, check.message, refs);
        }
      }
    }
  }
  return res;
}
function escapeLiteralCheckValue$1(literal, refs) {
  return refs.patternStrategy === "escape" ? escapeNonAlphaNumeric$1(literal) : literal;
}
var ALPHA_NUMERIC$1 = new Set(
  "ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvxyz0123456789"
);
function escapeNonAlphaNumeric$1(source) {
  let result = "";
  for (let i = 0; i < source.length; i++) {
    if (!ALPHA_NUMERIC$1.has(source[i])) {
      result += "\\";
    }
    result += source[i];
  }
  return result;
}
function addFormat$1(schema, value, message, refs) {
  var _a223;
  if (schema.format || ((_a223 = schema.anyOf) == null ? void 0 : _a223.some((x) => x.format))) {
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
function addPattern$1(schema, regex, message, refs) {
  var _a223;
  if (schema.pattern || ((_a223 = schema.allOf) == null ? void 0 : _a223.some((x) => x.pattern))) {
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
      pattern: stringifyRegExpWithFlags$1(regex, refs),
      ...message && refs.errorMessages && { errorMessage: { pattern: message } }
    });
  } else {
    schema.pattern = stringifyRegExpWithFlags$1(regex, refs);
  }
}
function stringifyRegExpWithFlags$1(regex, refs) {
  var _a223;
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
          } else if (source[i + 1] === "-" && ((_a223 = source[i + 2]) == null ? void 0 : _a223.match(/[a-z]/))) {
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
function parseRecordDef$1(def, refs) {
  var _a223, _b222, _c, _d, _e, _f;
  const schema = {
    type: "object",
    additionalProperties: (_a223 = parseDef$1(def.valueType._def, {
      ...refs,
      currentPath: [...refs.currentPath, "additionalProperties"]
    })) != null ? _a223 : refs.allowedAdditionalProperties
  };
  if (((_b222 = def.keyType) == null ? void 0 : _b222._def.typeName) === ZodFirstPartyTypeKind.ZodString && ((_c = def.keyType._def.checks) == null ? void 0 : _c.length)) {
    const { type, ...keyType } = parseStringDef$1(def.keyType._def, refs);
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
    const { type, ...keyType } = parseBrandedDef$1(
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
function parseMapDef$1(def, refs) {
  if (refs.mapStrategy === "record") {
    return parseRecordDef$1(def, refs);
  }
  const keys = parseDef$1(def.keyType._def, {
    ...refs,
    currentPath: [...refs.currentPath, "items", "items", "0"]
  }) || parseAnyDef$1();
  const values = parseDef$1(def.valueType._def, {
    ...refs,
    currentPath: [...refs.currentPath, "items", "items", "1"]
  }) || parseAnyDef$1();
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
function parseNativeEnumDef$1(def) {
  const object2 = def.values;
  const actualKeys = Object.keys(def.values).filter((key) => {
    return typeof object2[object2[key]] !== "number";
  });
  const actualValues = actualKeys.map((key) => object2[key]);
  const parsedTypes = Array.from(
    new Set(actualValues.map((values) => typeof values))
  );
  return {
    type: parsedTypes.length === 1 ? parsedTypes[0] === "string" ? "string" : "number" : ["string", "number"],
    enum: actualValues
  };
}
function parseNeverDef$1() {
  return { not: parseAnyDef$1() };
}
function parseNullDef$1() {
  return {
    type: "null"
  };
}
var primitiveMappings$1 = {
  ZodString: "string",
  ZodNumber: "number",
  ZodBigInt: "integer",
  ZodBoolean: "boolean",
  ZodNull: "null"
};
function parseUnionDef$1(def, refs) {
  const options = def.options instanceof Map ? Array.from(def.options.values()) : def.options;
  if (options.every(
    (x) => x._def.typeName in primitiveMappings$1 && (!x._def.checks || !x._def.checks.length)
  )) {
    const types = options.reduce((types2, x) => {
      const type = primitiveMappings$1[x._def.typeName];
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
  return asAnyOf$1(def, refs);
}
var asAnyOf$1 = (def, refs) => {
  const anyOf = (def.options instanceof Map ? Array.from(def.options.values()) : def.options).map(
    (x, i) => parseDef$1(x._def, {
      ...refs,
      currentPath: [...refs.currentPath, "anyOf", `${i}`]
    })
  ).filter(
    (x) => !!x && (!refs.strictUnions || typeof x === "object" && Object.keys(x).length > 0)
  );
  return anyOf.length ? { anyOf } : void 0;
};
function parseNullableDef$1(def, refs) {
  if (["ZodString", "ZodNumber", "ZodBigInt", "ZodBoolean", "ZodNull"].includes(
    def.innerType._def.typeName
  ) && (!def.innerType._def.checks || !def.innerType._def.checks.length)) {
    return {
      type: [
        primitiveMappings$1[def.innerType._def.typeName],
        "null"
      ]
    };
  }
  const base = parseDef$1(def.innerType._def, {
    ...refs,
    currentPath: [...refs.currentPath, "anyOf", "0"]
  });
  return base && { anyOf: [base, { type: "null" }] };
}
function parseNumberDef$1(def) {
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
function parseObjectDef$1(def, refs) {
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
    const propOptional = safeIsOptional$1(propDef);
    const parsedDef = parseDef$1(propDef._def, {
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
  const additionalProperties = decideAdditionalProperties$1(def, refs);
  if (additionalProperties !== void 0) {
    result.additionalProperties = additionalProperties;
  }
  return result;
}
function decideAdditionalProperties$1(def, refs) {
  if (def.catchall._def.typeName !== "ZodNever") {
    return parseDef$1(def.catchall._def, {
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
function safeIsOptional$1(schema) {
  try {
    return schema.isOptional();
  } catch (e) {
    return true;
  }
}
var parseOptionalDef$1 = (def, refs) => {
  var _a223;
  if (refs.currentPath.toString() === ((_a223 = refs.propertyPath) == null ? void 0 : _a223.toString())) {
    return parseDef$1(def.innerType._def, refs);
  }
  const innerSchema = parseDef$1(def.innerType._def, {
    ...refs,
    currentPath: [...refs.currentPath, "anyOf", "1"]
  });
  return innerSchema ? { anyOf: [{ not: parseAnyDef$1() }, innerSchema] } : parseAnyDef$1();
};
var parsePipelineDef$1 = (def, refs) => {
  if (refs.pipeStrategy === "input") {
    return parseDef$1(def.in._def, refs);
  } else if (refs.pipeStrategy === "output") {
    return parseDef$1(def.out._def, refs);
  }
  const a = parseDef$1(def.in._def, {
    ...refs,
    currentPath: [...refs.currentPath, "allOf", "0"]
  });
  const b = parseDef$1(def.out._def, {
    ...refs,
    currentPath: [...refs.currentPath, "allOf", a ? "1" : "0"]
  });
  return {
    allOf: [a, b].filter((x) => x !== void 0)
  };
};
function parsePromiseDef$1(def, refs) {
  return parseDef$1(def.type._def, refs);
}
function parseSetDef$1(def, refs) {
  const items = parseDef$1(def.valueType._def, {
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
function parseTupleDef$1(def, refs) {
  if (def.rest) {
    return {
      type: "array",
      minItems: def.items.length,
      items: def.items.map(
        (x, i) => parseDef$1(x._def, {
          ...refs,
          currentPath: [...refs.currentPath, "items", `${i}`]
        })
      ).reduce(
        (acc, x) => x === void 0 ? acc : [...acc, x],
        []
      ),
      additionalItems: parseDef$1(def.rest._def, {
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
        (x, i) => parseDef$1(x._def, {
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
function parseUndefinedDef$1() {
  return {
    not: parseAnyDef$1()
  };
}
function parseUnknownDef$1() {
  return parseAnyDef$1();
}
var parseReadonlyDef$1 = (def, refs) => {
  return parseDef$1(def.innerType._def, refs);
};
var selectParser$1 = (def, typeName, refs) => {
  switch (typeName) {
    case ZodFirstPartyTypeKind.ZodString:
      return parseStringDef$1(def, refs);
    case ZodFirstPartyTypeKind.ZodNumber:
      return parseNumberDef$1(def);
    case ZodFirstPartyTypeKind.ZodObject:
      return parseObjectDef$1(def, refs);
    case ZodFirstPartyTypeKind.ZodBigInt:
      return parseBigintDef$1(def);
    case ZodFirstPartyTypeKind.ZodBoolean:
      return parseBooleanDef$1();
    case ZodFirstPartyTypeKind.ZodDate:
      return parseDateDef$1(def, refs);
    case ZodFirstPartyTypeKind.ZodUndefined:
      return parseUndefinedDef$1();
    case ZodFirstPartyTypeKind.ZodNull:
      return parseNullDef$1();
    case ZodFirstPartyTypeKind.ZodArray:
      return parseArrayDef$1(def, refs);
    case ZodFirstPartyTypeKind.ZodUnion:
    case ZodFirstPartyTypeKind.ZodDiscriminatedUnion:
      return parseUnionDef$1(def, refs);
    case ZodFirstPartyTypeKind.ZodIntersection:
      return parseIntersectionDef$1(def, refs);
    case ZodFirstPartyTypeKind.ZodTuple:
      return parseTupleDef$1(def, refs);
    case ZodFirstPartyTypeKind.ZodRecord:
      return parseRecordDef$1(def, refs);
    case ZodFirstPartyTypeKind.ZodLiteral:
      return parseLiteralDef$1(def);
    case ZodFirstPartyTypeKind.ZodEnum:
      return parseEnumDef$1(def);
    case ZodFirstPartyTypeKind.ZodNativeEnum:
      return parseNativeEnumDef$1(def);
    case ZodFirstPartyTypeKind.ZodNullable:
      return parseNullableDef$1(def, refs);
    case ZodFirstPartyTypeKind.ZodOptional:
      return parseOptionalDef$1(def, refs);
    case ZodFirstPartyTypeKind.ZodMap:
      return parseMapDef$1(def, refs);
    case ZodFirstPartyTypeKind.ZodSet:
      return parseSetDef$1(def, refs);
    case ZodFirstPartyTypeKind.ZodLazy:
      return () => def.getter()._def;
    case ZodFirstPartyTypeKind.ZodPromise:
      return parsePromiseDef$1(def, refs);
    case ZodFirstPartyTypeKind.ZodNaN:
    case ZodFirstPartyTypeKind.ZodNever:
      return parseNeverDef$1();
    case ZodFirstPartyTypeKind.ZodEffects:
      return parseEffectsDef$1(def, refs);
    case ZodFirstPartyTypeKind.ZodAny:
      return parseAnyDef$1();
    case ZodFirstPartyTypeKind.ZodUnknown:
      return parseUnknownDef$1();
    case ZodFirstPartyTypeKind.ZodDefault:
      return parseDefaultDef$1(def, refs);
    case ZodFirstPartyTypeKind.ZodBranded:
      return parseBrandedDef$1(def, refs);
    case ZodFirstPartyTypeKind.ZodReadonly:
      return parseReadonlyDef$1(def, refs);
    case ZodFirstPartyTypeKind.ZodCatch:
      return parseCatchDef$1(def, refs);
    case ZodFirstPartyTypeKind.ZodPipeline:
      return parsePipelineDef$1(def, refs);
    case ZodFirstPartyTypeKind.ZodFunction:
    case ZodFirstPartyTypeKind.ZodVoid:
    case ZodFirstPartyTypeKind.ZodSymbol:
      return void 0;
    default:
      return /* @__PURE__ */ ((_) => void 0)();
  }
};
var getRelativePath$1 = (pathA, pathB) => {
  let i = 0;
  for (; i < pathA.length && i < pathB.length; i++) {
    if (pathA[i] !== pathB[i]) break;
  }
  return [(pathA.length - i).toString(), ...pathB.slice(i)].join("/");
};
function parseDef$1(def, refs, forceResolution = false) {
  var _a223;
  const seenItem = refs.seen.get(def);
  if (refs.override) {
    const overrideResult = (_a223 = refs.override) == null ? void 0 : _a223.call(
      refs,
      def,
      refs,
      seenItem,
      forceResolution
    );
    if (overrideResult !== ignoreOverride$1) {
      return overrideResult;
    }
  }
  if (seenItem && !forceResolution) {
    const seenSchema = get$ref$1(seenItem, refs);
    if (seenSchema !== void 0) {
      return seenSchema;
    }
  }
  const newItem = { def, path: refs.currentPath, jsonSchema: void 0 };
  refs.seen.set(def, newItem);
  const jsonSchemaOrGetter = selectParser$1(def, def.typeName, refs);
  const jsonSchema2 = typeof jsonSchemaOrGetter === "function" ? parseDef$1(jsonSchemaOrGetter(), refs) : jsonSchemaOrGetter;
  if (jsonSchema2) {
    addMeta$1(def, refs, jsonSchema2);
  }
  if (refs.postProcess) {
    const postProcessResult = refs.postProcess(jsonSchema2, def, refs);
    newItem.jsonSchema = jsonSchema2;
    return postProcessResult;
  }
  newItem.jsonSchema = jsonSchema2;
  return jsonSchema2;
}
var get$ref$1 = (item, refs) => {
  switch (refs.$refStrategy) {
    case "root":
      return { $ref: item.path.join("/") };
    case "relative":
      return { $ref: getRelativePath$1(refs.currentPath, item.path) };
    case "none":
    case "seen": {
      if (item.path.length < refs.currentPath.length && item.path.every((value, index) => refs.currentPath[index] === value)) {
        console.warn(
          `Recursive reference detected at ${refs.currentPath.join(
            "/"
          )}! Defaulting to any`
        );
        return parseAnyDef$1();
      }
      return refs.$refStrategy === "seen" ? parseAnyDef$1() : void 0;
    }
  }
};
var addMeta$1 = (def, refs, jsonSchema2) => {
  if (def.description) {
    jsonSchema2.description = def.description;
  }
  return jsonSchema2;
};
var getRefs$1 = (options) => {
  const _options = getDefaultOptions$1(options);
  const currentPath = _options.name !== void 0 ? [..._options.basePath, _options.definitionPath, _options.name] : _options.basePath;
  return {
    ..._options,
    currentPath,
    propertyPath: void 0,
    seen: new Map(
      Object.entries(_options.definitions).map(([name223, def]) => [
        def._def,
        {
          def: def._def,
          path: [..._options.basePath, _options.definitionPath, name223],
          // Resolution of references will be forced even though seen, so it's ok that the schema is undefined here for now.
          jsonSchema: void 0
        }
      ])
    )
  };
};
var zod3ToJsonSchema = (schema, options) => {
  var _a223;
  const refs = getRefs$1(options);
  let definitions = typeof options === "object" && options.definitions ? Object.entries(options.definitions).reduce(
    (acc, [name323, schema2]) => {
      var _a323;
      return {
        ...acc,
        [name323]: (_a323 = parseDef$1(
          schema2._def,
          {
            ...refs,
            currentPath: [...refs.basePath, refs.definitionPath, name323]
          },
          true
        )) != null ? _a323 : parseAnyDef$1()
      };
    },
    {}
  ) : void 0;
  const name223 = typeof options === "string" ? options : (options == null ? void 0 : options.nameStrategy) === "title" ? void 0 : options == null ? void 0 : options.name;
  const main = (_a223 = parseDef$1(
    schema._def,
    name223 === void 0 ? refs : {
      ...refs,
      currentPath: [...refs.basePath, refs.definitionPath, name223]
    },
    false
  )) != null ? _a223 : parseAnyDef$1();
  const title = typeof options === "object" && options.name !== void 0 && options.nameStrategy === "title" ? options.name : void 0;
  if (title !== void 0) {
    main.title = title;
  }
  const combined = name223 === void 0 ? definitions ? {
    ...main,
    [refs.definitionPath]: definitions
  } : main : {
    $ref: [
      ...refs.$refStrategy === "relative" ? [] : refs.basePath,
      refs.definitionPath,
      name223
    ].join("/"),
    [refs.definitionPath]: {
      ...definitions,
      [name223]: main
    }
  };
  combined.$schema = "http://json-schema.org/draft-07/schema#";
  return combined;
};
var schemaSymbol$1 = /* @__PURE__ */ Symbol.for("vercel.ai.schema");
function lazySchema(createSchema) {
  let schema;
  return () => {
    if (schema == null) {
      schema = createSchema();
    }
    return schema;
  };
}
function jsonSchema$1(jsonSchema2, {
  validate
} = {}) {
  return {
    [schemaSymbol$1]: true,
    _type: void 0,
    // should never be used directly
    get jsonSchema() {
      if (typeof jsonSchema2 === "function") {
        jsonSchema2 = jsonSchema2();
      }
      return jsonSchema2;
    },
    validate
  };
}
function isSchema$1(value) {
  return typeof value === "object" && value !== null && schemaSymbol$1 in value && value[schemaSymbol$1] === true && "jsonSchema" in value && "validate" in value;
}
function asSchema$1(schema) {
  return schema == null ? jsonSchema$1({ properties: {}, additionalProperties: false }) : isSchema$1(schema) ? schema : "~standard" in schema ? schema["~standard"].vendor === "zod" ? zodSchema$1(schema) : standardSchema(schema) : schema();
}
function standardSchema(standardSchema2) {
  return jsonSchema$1(
    () => addAdditionalPropertiesToJsonSchema(
      standardSchema2["~standard"].jsonSchema.input({
        target: "draft-07"
      })
    ),
    {
      validate: async (value) => {
        const result = await standardSchema2["~standard"].validate(value);
        return "value" in result ? { success: true, value: result.value } : {
          success: false,
          error: new TypeValidationError$1({
            value,
            cause: result.issues
          })
        };
      }
    }
  );
}
function zod3Schema(zodSchema2, options) {
  var _a223;
  const useReferences = (_a223 = void 0 ) != null ? _a223 : false;
  return jsonSchema$1(
    // defer json schema creation to avoid unnecessary computation when only validation is needed
    () => zod3ToJsonSchema(zodSchema2, {
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
  var _a223;
  const useReferences = (_a223 = void 0 ) != null ? _a223 : false;
  return jsonSchema$1(
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
function zodSchema$1(zodSchema2, options) {
  if (isZod4Schema(zodSchema2)) {
    return zod4Schema(zodSchema2);
  } else {
    return zod3Schema(zodSchema2);
  }
}
async function validateTypes({
  value,
  schema,
  context: context2
}) {
  const result = await safeValidateTypes$1({ value, schema, context: context2 });
  if (!result.success) {
    throw TypeValidationError$1.wrap({ value, cause: result.error, context: context2 });
  }
  return result.value;
}
async function safeValidateTypes$1({
  value,
  schema,
  context: context2
}) {
  const actualSchema = asSchema$1(schema);
  try {
    if (actualSchema.validate == null) {
      return { success: true, value, rawValue: value };
    }
    const result = await actualSchema.validate(value);
    if (result.success) {
      return { success: true, value: result.value, rawValue: value };
    }
    return {
      success: false,
      error: TypeValidationError$1.wrap({ value, cause: result.error, context: context2 }),
      rawValue: value
    };
  } catch (error) {
    return {
      success: false,
      error: TypeValidationError$1.wrap({ value, cause: error, context: context2 }),
      rawValue: value
    };
  }
}
async function parseJSON({
  text: text2,
  schema
}) {
  try {
    const value = secureJsonParse(text2);
    if (schema == null) {
      return value;
    }
    return validateTypes({ value, schema });
  } catch (error) {
    if (JSONParseError$1.isInstance(error) || TypeValidationError$1.isInstance(error)) {
      throw error;
    }
    throw new JSONParseError$1({ text: text2, cause: error });
  }
}
async function safeParseJSON$1({
  text: text2,
  schema
}) {
  try {
    const value = secureJsonParse(text2);
    if (schema == null) {
      return { success: true, value, rawValue: value };
    }
    return await safeValidateTypes$1({ value, schema });
  } catch (error) {
    return {
      success: false,
      error: JSONParseError$1.isInstance(error) ? error : new JSONParseError$1({ text: text2, cause: error }),
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
        controller.enqueue(await safeParseJSON$1({ text: data, schema }));
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
  fetch: fetch2
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
  fetch: fetch2
});
var postToApi = async ({
  url,
  headers = {},
  body,
  successfulResponseHandler,
  failedResponseHandler,
  abortSignal,
  fetch: fetch2 = getOriginalFetch2()
}) => {
  try {
    const response = await fetch2(url, {
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
        if (isAbortError$1(error) || APICallError$1.isInstance(error)) {
          throw error;
        }
        throw new APICallError$1({
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
        if (isAbortError$1(error) || APICallError$1.isInstance(error)) {
          throw error;
        }
      }
      throw new APICallError$1({
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
function createProviderToolFactoryWithOutputSchema({
  id,
  inputSchema,
  outputSchema: outputSchema2,
  supportsDeferredResults
}) {
  return ({
    execute,
    needsApproval,
    toModelOutput,
    onInputStart,
    onInputDelta,
    onInputAvailable,
    ...args
  }) => tool({
    type: "provider",
    id,
    args,
    inputSchema,
    outputSchema: outputSchema2,
    execute,
    needsApproval,
    toModelOutput,
    onInputStart,
    onInputDelta,
    onInputAvailable,
    supportsDeferredResults
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
      value: new APICallError$1({
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
      value: new APICallError$1({
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
      value: new APICallError$1({
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
  const parsedResult = await safeParseJSON$1({
    text: responseBody,
    schema: responseSchema
  });
  const responseHeaders = extractResponseHeaders(response);
  if (!parsedResult.success) {
    throw new APICallError$1({
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
function withoutTrailingSlash(url) {
  return url == null ? void 0 : url.replace(/\/$/, "");
}
function isAsyncIterable(obj) {
  return obj != null && typeof obj[Symbol.asyncIterator] === "function";
}
async function* executeTool({
  execute,
  input,
  options
}) {
  const result = execute(input, options);
  if (isAsyncIterable(result)) {
    let lastOutput;
    for await (const output of result) {
      lastOutput = output;
      yield { type: "preliminary", output };
    }
    yield { type: "final", output: lastOutput };
  } else {
    yield { type: "final", output: await result };
  }
}
var require_get_context = __commonJS$1({
  "../../../node_modules/.pnpm/@vercel+oidc@3.1.0/node_modules/@vercel/oidc/dist/get-context.js"(exports$1, module) {
    var __defProp2 = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export2 = (target, all) => {
      for (var name21 in all)
        __defProp2(target, name21, { get: all[name21], enumerable: true });
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
var require_get_vercel_oidc_token = __commonJS$1({
  "../../../node_modules/.pnpm/@vercel+oidc@3.1.0/node_modules/@vercel/oidc/dist/get-vercel-oidc-token.js"(exports$1, module) {
    var __defProp2 = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export2 = (target, all) => {
      for (var name21 in all)
        __defProp2(target, name21, { get: all[name21], enumerable: true });
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
          await import('./token-util-RMHT2CPJ-CEAUOCJP.mjs'),
          await import('./token-APYSY3BW-ZWRZO2RI.mjs')
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
var require_dist = __commonJS$1({
  "../../../node_modules/.pnpm/@vercel+oidc@3.1.0/node_modules/@vercel/oidc/dist/index.js"(exports$1, module) {
    var __defProp2 = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export2 = (target, all) => {
      for (var name21 in all)
        __defProp2(target, name21, { get: all[name21], enumerable: true });
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
var import_oidc = __toESM$1(require_dist(), 1);
var import_oidc2 = __toESM$1(require_dist(), 1);
var marker16 = "vercel.ai.gateway.error";
var symbol16 = Symbol.for(marker16);
var _a16;
var _b16;
var GatewayError = class _GatewayError extends (_b16 = Error, _a16 = symbol16, _b16) {
  constructor({
    message,
    statusCode = 500,
    cause,
    generationId
  }) {
    super(generationId ? `${message} [${generationId}]` : message);
    this[_a16] = true;
    this.statusCode = statusCode;
    this.cause = cause;
    this.generationId = generationId;
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
    return typeof error === "object" && error !== null && symbol16 in error && error[symbol16] === true;
  }
};
var name15 = "GatewayAuthenticationError";
var marker22$1 = `vercel.ai.gateway.error.${name15}`;
var symbol22$1 = Symbol.for(marker22$1);
var _a22$1;
var _b22;
var GatewayAuthenticationError = class _GatewayAuthenticationError extends (_b22 = GatewayError, _a22$1 = symbol22$1, _b22) {
  constructor({
    message = "Authentication failed",
    statusCode = 401,
    cause,
    generationId
  } = {}) {
    super({ message, statusCode, cause, generationId });
    this[_a22$1] = true;
    this.name = name15;
    this.type = "authentication_error";
  }
  static isInstance(error) {
    return GatewayError.hasMarker(error) && symbol22$1 in error;
  }
  /**
   * Creates a contextual error message when authentication fails
   */
  static createContextualError({
    apiKeyProvided,
    oidcTokenProvided,
    message = "Authentication failed",
    statusCode = 401,
    cause,
    generationId
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
      cause,
      generationId
    });
  }
};
var name22$1 = "GatewayInvalidRequestError";
var marker32 = `vercel.ai.gateway.error.${name22$1}`;
var symbol32 = Symbol.for(marker32);
var _a32;
var _b32;
var GatewayInvalidRequestError = class extends (_b32 = GatewayError, _a32 = symbol32, _b32) {
  constructor({
    message = "Invalid request",
    statusCode = 400,
    cause,
    generationId
  } = {}) {
    super({ message, statusCode, cause, generationId });
    this[_a32] = true;
    this.name = name22$1;
    this.type = "invalid_request_error";
  }
  static isInstance(error) {
    return GatewayError.hasMarker(error) && symbol32 in error;
  }
};
var name32 = "GatewayRateLimitError";
var marker42$1 = `vercel.ai.gateway.error.${name32}`;
var symbol42$1 = Symbol.for(marker42$1);
var _a42$1;
var _b42;
var GatewayRateLimitError = class extends (_b42 = GatewayError, _a42$1 = symbol42$1, _b42) {
  constructor({
    message = "Rate limit exceeded",
    statusCode = 429,
    cause,
    generationId
  } = {}) {
    super({ message, statusCode, cause, generationId });
    this[_a42$1] = true;
    this.name = name32;
    this.type = "rate_limit_exceeded";
  }
  static isInstance(error) {
    return GatewayError.hasMarker(error) && symbol42$1 in error;
  }
};
var name42$1 = "GatewayModelNotFoundError";
var marker52$1 = `vercel.ai.gateway.error.${name42$1}`;
var symbol52$1 = Symbol.for(marker52$1);
var modelNotFoundParamSchema = lazySchema(
  () => zodSchema$1(
    object$2({
      modelId: string()
    })
  )
);
var _a52$1;
var _b52;
var GatewayModelNotFoundError = class extends (_b52 = GatewayError, _a52$1 = symbol52$1, _b52) {
  constructor({
    message = "Model not found",
    statusCode = 404,
    modelId,
    cause,
    generationId
  } = {}) {
    super({ message, statusCode, cause, generationId });
    this[_a52$1] = true;
    this.name = name42$1;
    this.type = "model_not_found";
    this.modelId = modelId;
  }
  static isInstance(error) {
    return GatewayError.hasMarker(error) && symbol52$1 in error;
  }
};
var name52$1 = "GatewayInternalServerError";
var marker62$1 = `vercel.ai.gateway.error.${name52$1}`;
var symbol62$1 = Symbol.for(marker62$1);
var _a62$1;
var _b62;
var GatewayInternalServerError = class extends (_b62 = GatewayError, _a62$1 = symbol62$1, _b62) {
  constructor({
    message = "Internal server error",
    statusCode = 500,
    cause,
    generationId
  } = {}) {
    super({ message, statusCode, cause, generationId });
    this[_a62$1] = true;
    this.name = name52$1;
    this.type = "internal_server_error";
  }
  static isInstance(error) {
    return GatewayError.hasMarker(error) && symbol62$1 in error;
  }
};
var name62$1 = "GatewayResponseError";
var marker72$1 = `vercel.ai.gateway.error.${name62$1}`;
var symbol72$1 = Symbol.for(marker72$1);
var _a72$1;
var _b72;
var GatewayResponseError = class extends (_b72 = GatewayError, _a72$1 = symbol72$1, _b72) {
  constructor({
    message = "Invalid response from Gateway",
    statusCode = 502,
    response,
    validationError,
    cause,
    generationId
  } = {}) {
    super({ message, statusCode, cause, generationId });
    this[_a72$1] = true;
    this.name = name62$1;
    this.type = "response_error";
    this.response = response;
    this.validationError = validationError;
  }
  static isInstance(error) {
    return GatewayError.hasMarker(error) && symbol72$1 in error;
  }
};
async function createGatewayErrorFromResponse({
  response,
  statusCode,
  defaultMessage = "Gateway request failed",
  cause,
  authMethod
}) {
  var _a93;
  const parseResult = await safeValidateTypes$1({
    value: response,
    schema: gatewayErrorResponseSchema
  });
  if (!parseResult.success) {
    const rawGenerationId = typeof response === "object" && response !== null && "generationId" in response ? response.generationId : void 0;
    return new GatewayResponseError({
      message: `Invalid error response format: ${defaultMessage}`,
      statusCode,
      response,
      validationError: parseResult.error,
      cause,
      generationId: rawGenerationId
    });
  }
  const validatedResponse = parseResult.value;
  const errorType = validatedResponse.error.type;
  const message = validatedResponse.error.message;
  const generationId = (_a93 = validatedResponse.generationId) != null ? _a93 : void 0;
  switch (errorType) {
    case "authentication_error":
      return GatewayAuthenticationError.createContextualError({
        apiKeyProvided: authMethod === "api-key",
        oidcTokenProvided: authMethod === "oidc",
        statusCode,
        cause,
        generationId
      });
    case "invalid_request_error":
      return new GatewayInvalidRequestError({
        message,
        statusCode,
        cause,
        generationId
      });
    case "rate_limit_exceeded":
      return new GatewayRateLimitError({
        message,
        statusCode,
        cause,
        generationId
      });
    case "model_not_found": {
      const modelResult = await safeValidateTypes$1({
        value: validatedResponse.error.param,
        schema: modelNotFoundParamSchema
      });
      return new GatewayModelNotFoundError({
        message,
        statusCode,
        modelId: modelResult.success ? modelResult.value.modelId : void 0,
        cause,
        generationId
      });
    }
    case "internal_server_error":
      return new GatewayInternalServerError({
        message,
        statusCode,
        cause,
        generationId
      });
    default:
      return new GatewayInternalServerError({
        message,
        statusCode,
        cause,
        generationId
      });
  }
}
var gatewayErrorResponseSchema = lazySchema(
  () => zodSchema$1(
    object$2({
      error: object$2({
        message: string(),
        type: string().nullish(),
        param: unknown().nullish(),
        code: union([string(), number()]).nullish()
      }),
      generationId: string().nullish()
    })
  )
);
var name72$1 = "GatewayTimeoutError";
var marker82$1 = `vercel.ai.gateway.error.${name72$1}`;
var symbol82$1 = Symbol.for(marker82$1);
var _a82$1;
var _b82;
var GatewayTimeoutError = class _GatewayTimeoutError extends (_b82 = GatewayError, _a82$1 = symbol82$1, _b82) {
  constructor({
    message = "Request timed out",
    statusCode = 408,
    cause,
    generationId
  } = {}) {
    super({ message, statusCode, cause, generationId });
    this[_a82$1] = true;
    this.name = name72$1;
    this.type = "timeout_error";
  }
  static isInstance(error) {
    return GatewayError.hasMarker(error) && symbol82$1 in error;
  }
  /**
   * Creates a helpful timeout error message with troubleshooting guidance
   */
  static createTimeoutError({
    originalMessage,
    statusCode = 408,
    cause,
    generationId
  }) {
    const message = `Gateway request timed out: ${originalMessage}

    This is a client-side timeout. To resolve this, increase your timeout configuration: https://vercel.com/docs/ai-gateway/capabilities/video-generation#extending-timeouts-for-node.js`;
    return new _GatewayTimeoutError({
      message,
      statusCode,
      cause,
      generationId
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
  if (APICallError$1.isInstance(error)) {
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
  const result = await safeValidateTypes$1({
    value: headers[GATEWAY_AUTH_METHOD_HEADER],
    schema: gatewayAuthMethodSchema
  });
  return result.success ? result.value : void 0;
}
var gatewayAuthMethodSchema = lazySchema(
  () => zodSchema$1(union([literal("api-key"), literal("oidc")]))
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
var gatewayAvailableModelsResponseSchema = lazySchema(
  () => zodSchema$1(
    object$2({
      models: array$1(
        object$2({
          id: string(),
          name: string(),
          description: string().nullish(),
          pricing: object$2({
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
          specification: object$2({
            specificationVersion: literal("v3"),
            provider: string(),
            modelId: string()
          }),
          modelType: _enum(["embedding", "image", "language", "video"]).nullish()
        })
      )
    })
  )
);
var gatewayCreditsResponseSchema = lazySchema(
  () => zodSchema$1(
    object$2({
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
    this.specificationVersion = "v3";
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
      "ai-language-model-specification-version": "3",
      "ai-language-model-id": modelId,
      "ai-language-model-streaming": String(streaming)
    };
  }
};
var GatewayEmbeddingModel = class {
  constructor(modelId, config) {
    this.modelId = modelId;
    this.config = config;
    this.specificationVersion = "v3";
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
          values,
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
        response: { headers: responseHeaders, body: rawValue },
        warnings: []
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
      "ai-embedding-model-specification-version": "3",
      "ai-model-id": this.modelId
    };
  }
};
var gatewayEmbeddingResponseSchema = lazySchema(
  () => zodSchema$1(
    object$2({
      embeddings: array$1(array$1(number())),
      usage: object$2({ tokens: number() }).nullish(),
      providerMetadata: record(string(), record(string(), unknown())).optional()
    })
  )
);
var GatewayImageModel = class {
  constructor(modelId, config) {
    this.modelId = modelId;
    this.config = config;
    this.specificationVersion = "v3";
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
    files,
    mask,
    providerOptions,
    headers,
    abortSignal
  }) {
    var _a93, _b92, _c, _d;
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
          ...providerOptions && { providerOptions },
          ...files && {
            files: files.map((file) => maybeEncodeImageFile(file))
          },
          ...mask && { mask: maybeEncodeImageFile(mask) }
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
            inputTokens: (_b92 = responseBody.usage.inputTokens) != null ? _b92 : void 0,
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
      "ai-image-model-specification-version": "3",
      "ai-model-id": this.modelId
    };
  }
};
function maybeEncodeImageFile(file) {
  if (file.type === "file" && file.data instanceof Uint8Array) {
    return {
      ...file,
      data: convertUint8ArrayToBase64$1(file.data)
    };
  }
  return file;
}
var providerMetadataEntrySchema = object$2({
  images: array$1(unknown()).optional()
}).catchall(unknown());
var gatewayImageWarningSchema = discriminatedUnion("type", [
  object$2({
    type: literal("unsupported"),
    feature: string(),
    details: string().optional()
  }),
  object$2({
    type: literal("compatibility"),
    feature: string(),
    details: string().optional()
  }),
  object$2({
    type: literal("other"),
    message: string()
  })
]);
var gatewayImageUsageSchema = object$2({
  inputTokens: number().nullish(),
  outputTokens: number().nullish(),
  totalTokens: number().nullish()
});
var gatewayImageResponseSchema = object$2({
  images: array$1(string()),
  // Always base64 strings over the wire
  warnings: array$1(gatewayImageWarningSchema).optional(),
  providerMetadata: record(string(), providerMetadataEntrySchema).optional(),
  usage: gatewayImageUsageSchema.optional()
});
var GatewayVideoModel = class {
  constructor(modelId, config) {
    this.modelId = modelId;
    this.config = config;
    this.specificationVersion = "v3";
    this.maxVideosPerCall = Number.MAX_SAFE_INTEGER;
  }
  get provider() {
    return this.config.provider;
  }
  async doGenerate({
    prompt,
    n,
    aspectRatio,
    resolution,
    duration,
    fps,
    seed,
    image,
    providerOptions,
    headers,
    abortSignal
  }) {
    var _a93;
    const resolvedHeaders = await resolve(this.config.headers());
    try {
      const { responseHeaders, value: responseBody } = await postJsonToApi({
        url: this.getUrl(),
        headers: combineHeaders(
          resolvedHeaders,
          headers != null ? headers : {},
          this.getModelConfigHeaders(),
          await resolve(this.config.o11yHeaders),
          { accept: "text/event-stream" }
        ),
        body: {
          prompt,
          n,
          ...aspectRatio && { aspectRatio },
          ...resolution && { resolution },
          ...duration && { duration },
          ...fps && { fps },
          ...seed && { seed },
          ...providerOptions && { providerOptions },
          ...image && { image: maybeEncodeVideoFile(image) }
        },
        successfulResponseHandler: async ({
          response,
          url,
          requestBodyValues
        }) => {
          if (response.body == null) {
            throw new APICallError$1({
              message: "SSE response body is empty",
              url,
              requestBodyValues,
              statusCode: response.status
            });
          }
          const eventStream = parseJsonEventStream({
            stream: response.body,
            schema: gatewayVideoEventSchema
          });
          const reader = eventStream.getReader();
          const { done, value: parseResult } = await reader.read();
          reader.releaseLock();
          if (done || !parseResult) {
            throw new APICallError$1({
              message: "SSE stream ended without a data event",
              url,
              requestBodyValues,
              statusCode: response.status
            });
          }
          if (!parseResult.success) {
            throw new APICallError$1({
              message: "Failed to parse video SSE event",
              cause: parseResult.error,
              url,
              requestBodyValues,
              statusCode: response.status
            });
          }
          const event = parseResult.value;
          if (event.type === "error") {
            throw new APICallError$1({
              message: event.message,
              statusCode: event.statusCode,
              url,
              requestBodyValues,
              responseHeaders: Object.fromEntries([...response.headers]),
              responseBody: JSON.stringify(event),
              data: {
                error: {
                  message: event.message,
                  type: event.errorType,
                  param: event.param
                }
              }
            });
          }
          return {
            value: {
              videos: event.videos,
              warnings: event.warnings,
              providerMetadata: event.providerMetadata
            },
            responseHeaders: Object.fromEntries([...response.headers])
          };
        },
        failedResponseHandler: createJsonErrorResponseHandler({
          errorSchema: any(),
          errorToMessage: (data) => data
        }),
        ...abortSignal && { abortSignal },
        fetch: this.config.fetch
      });
      return {
        videos: responseBody.videos,
        warnings: (_a93 = responseBody.warnings) != null ? _a93 : [],
        providerMetadata: responseBody.providerMetadata,
        response: {
          timestamp: /* @__PURE__ */ new Date(),
          modelId: this.modelId,
          headers: responseHeaders
        }
      };
    } catch (error) {
      throw await asGatewayError(error, await parseAuthMethod(resolvedHeaders));
    }
  }
  getUrl() {
    return `${this.config.baseURL}/video-model`;
  }
  getModelConfigHeaders() {
    return {
      "ai-video-model-specification-version": "3",
      "ai-model-id": this.modelId
    };
  }
};
function maybeEncodeVideoFile(file) {
  if (file.type === "file" && file.data instanceof Uint8Array) {
    return {
      ...file,
      data: convertUint8ArrayToBase64$1(file.data)
    };
  }
  return file;
}
var providerMetadataEntrySchema2 = object$2({
  videos: array$1(unknown()).optional()
}).catchall(unknown());
var gatewayVideoDataSchema = union([
  object$2({
    type: literal("url"),
    url: string(),
    mediaType: string()
  }),
  object$2({
    type: literal("base64"),
    data: string(),
    mediaType: string()
  })
]);
var gatewayVideoWarningSchema = discriminatedUnion("type", [
  object$2({
    type: literal("unsupported"),
    feature: string(),
    details: string().optional()
  }),
  object$2({
    type: literal("compatibility"),
    feature: string(),
    details: string().optional()
  }),
  object$2({
    type: literal("other"),
    message: string()
  })
]);
var gatewayVideoEventSchema = discriminatedUnion("type", [
  object$2({
    type: literal("result"),
    videos: array$1(gatewayVideoDataSchema),
    warnings: array$1(gatewayVideoWarningSchema).optional(),
    providerMetadata: record(string(), providerMetadataEntrySchema2).optional()
  }),
  object$2({
    type: literal("error"),
    message: string(),
    errorType: string(),
    statusCode: number(),
    param: unknown().nullable()
  })
]);
var parallelSearchInputSchema = lazySchema(
  () => zodSchema$1(
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
  () => zodSchema$1(
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
var parallelSearchToolFactory = createProviderToolFactoryWithOutputSchema({
  id: "gateway.parallel_search",
  inputSchema: parallelSearchInputSchema,
  outputSchema: parallelSearchOutputSchema
});
var parallelSearch = (config = {}) => parallelSearchToolFactory(config);
var perplexitySearchInputSchema = lazySchema(
  () => zodSchema$1(
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
  () => zodSchema$1(
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
var perplexitySearchToolFactory = createProviderToolFactoryWithOutputSchema({
  id: "gateway.perplexity_search",
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
var VERSION2 = "3.0.66";
var AI_GATEWAY_PROTOCOL_VERSION = "0.0.1";
function createGatewayProvider(options = {}) {
  var _a93, _b92;
  let pendingMetadata = null;
  let metadataCache = null;
  const cacheRefreshMillis = (_a93 = options.metadataCacheRefreshMillis) != null ? _a93 : 1e3 * 60 * 5;
  let lastFetchTime = 0;
  const baseURL = (_b92 = withoutTrailingSlash(options.baseURL)) != null ? _b92 : "https://ai-gateway.vercel.sh/v3/ai";
  const getHeaders = async () => {
    try {
      const auth = await getGatewayAuthToken(options);
      return withUserAgentSuffix(
        {
          Authorization: `Bearer ${auth.token}`,
          "ai-gateway-protocol-version": AI_GATEWAY_PROTOCOL_VERSION,
          [GATEWAY_AUTH_METHOD_HEADER]: auth.authMethod,
          ...options.headers
        },
        `ai-sdk/gateway/${VERSION2}`
      );
    } catch (error) {
      throw GatewayAuthenticationError.createContextualError({
        apiKeyProvided: false,
        oidcTokenProvided: false,
        statusCode: 401,
        cause: error
      });
    }
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
    var _a1022, _b102, _c;
    const now2 = (_c = (_b102 = (_a1022 = options._internal) == null ? void 0 : _a1022.currentDate) == null ? void 0 : _b102.call(_a1022).getTime()) != null ? _c : Date.now();
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
  provider.specificationVersion = "v3";
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
  const createEmbeddingModel = (modelId) => {
    return new GatewayEmbeddingModel(modelId, {
      provider: "gateway",
      baseURL,
      headers: getHeaders,
      fetch: options.fetch,
      o11yHeaders: createO11yHeaders()
    });
  };
  provider.embeddingModel = createEmbeddingModel;
  provider.textEmbeddingModel = createEmbeddingModel;
  provider.videoModel = (modelId) => {
    return new GatewayVideoModel(modelId, {
      provider: "gateway",
      baseURL,
      headers: getHeaders,
      fetch: options.fetch,
      o11yHeaders: createO11yHeaders()
    });
  };
  provider.chat = provider.languageModel;
  provider.embedding = provider.embeddingModel;
  provider.image = provider.imageModel;
  provider.video = provider.videoModel;
  provider.tools = gatewayTools;
  return provider;
}
var gateway = createGatewayProvider();
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
  const oidcToken = await (0, import_oidc2.getVercelOidcToken)();
  return {
    token: oidcToken,
    authMethod: "oidc"
  };
}
var _globalThis$1 = typeof globalThis === "object" ? globalThis : global;
var VERSION22 = "1.9.0";
var re$1 = /^(\d+)\.(\d+)\.(\d+)(-(.+))?$/;
function _makeCompatibilityCheck$1(ownVersion) {
  var acceptedVersions = /* @__PURE__ */ new Set([ownVersion]);
  var rejectedVersions = /* @__PURE__ */ new Set();
  var myVersionMatch = ownVersion.match(re$1);
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
    var globalVersionMatch = globalVersion.match(re$1);
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
var isCompatible$1 = _makeCompatibilityCheck$1(VERSION22);
var major$1 = VERSION22.split(".")[0];
var GLOBAL_OPENTELEMETRY_API_KEY$1 = /* @__PURE__ */ Symbol.for("opentelemetry.js.api." + major$1);
var _global$1 = _globalThis$1;
function registerGlobal$1(type, instance, diag, allowOverride) {
  var _a21;
  if (allowOverride === void 0) {
    allowOverride = false;
  }
  var api = _global$1[GLOBAL_OPENTELEMETRY_API_KEY$1] = (_a21 = _global$1[GLOBAL_OPENTELEMETRY_API_KEY$1]) !== null && _a21 !== void 0 ? _a21 : {
    version: VERSION22
  };
  if (!allowOverride && api[type]) {
    var err = new Error("@opentelemetry/api: Attempted duplicate registration of API: " + type);
    diag.error(err.stack || err.message);
    return false;
  }
  if (api.version !== VERSION22) {
    var err = new Error("@opentelemetry/api: Registration of version v" + api.version + " for " + type + " does not match previously registered API v" + VERSION22);
    diag.error(err.stack || err.message);
    return false;
  }
  api[type] = instance;
  diag.debug("@opentelemetry/api: Registered a global for " + type + " v" + VERSION22 + ".");
  return true;
}
function getGlobal$1(type) {
  var _a21, _b92;
  var globalVersion = (_a21 = _global$1[GLOBAL_OPENTELEMETRY_API_KEY$1]) === null || _a21 === void 0 ? void 0 : _a21.version;
  if (!globalVersion || !isCompatible$1(globalVersion)) {
    return;
  }
  return (_b92 = _global$1[GLOBAL_OPENTELEMETRY_API_KEY$1]) === null || _b92 === void 0 ? void 0 : _b92[type];
}
function unregisterGlobal$1(type, diag) {
  diag.debug("@opentelemetry/api: Unregistering a global for " + type + " v" + VERSION22 + ".");
  var api = _global$1[GLOBAL_OPENTELEMETRY_API_KEY$1];
  if (api) {
    delete api[type];
  }
}
var __read$1 = function(o, n) {
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
var __spreadArray$1 = function(to, from, pack) {
  if (arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
    if (ar || !(i in from)) {
      if (!ar) ar = Array.prototype.slice.call(from, 0, i);
      ar[i] = from[i];
    }
  }
  return to.concat(ar || Array.prototype.slice.call(from));
};
var DiagComponentLogger$1 = (
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
      return logProxy$1("debug", this._namespace, args);
    };
    DiagComponentLogger2.prototype.error = function() {
      var args = [];
      for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
      }
      return logProxy$1("error", this._namespace, args);
    };
    DiagComponentLogger2.prototype.info = function() {
      var args = [];
      for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
      }
      return logProxy$1("info", this._namespace, args);
    };
    DiagComponentLogger2.prototype.warn = function() {
      var args = [];
      for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
      }
      return logProxy$1("warn", this._namespace, args);
    };
    DiagComponentLogger2.prototype.verbose = function() {
      var args = [];
      for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
      }
      return logProxy$1("verbose", this._namespace, args);
    };
    return DiagComponentLogger2;
  })()
);
function logProxy$1(funcName, namespace, args) {
  var logger = getGlobal$1("diag");
  if (!logger) {
    return;
  }
  args.unshift(namespace);
  return logger[funcName].apply(logger, __spreadArray$1([], __read$1(args), false));
}
var DiagLogLevel$1;
(function(DiagLogLevel2) {
  DiagLogLevel2[DiagLogLevel2["NONE"] = 0] = "NONE";
  DiagLogLevel2[DiagLogLevel2["ERROR"] = 30] = "ERROR";
  DiagLogLevel2[DiagLogLevel2["WARN"] = 50] = "WARN";
  DiagLogLevel2[DiagLogLevel2["INFO"] = 60] = "INFO";
  DiagLogLevel2[DiagLogLevel2["DEBUG"] = 70] = "DEBUG";
  DiagLogLevel2[DiagLogLevel2["VERBOSE"] = 80] = "VERBOSE";
  DiagLogLevel2[DiagLogLevel2["ALL"] = 9999] = "ALL";
})(DiagLogLevel$1 || (DiagLogLevel$1 = {}));
function createLogLevelDiagLogger$1(maxLevel, logger) {
  if (maxLevel < DiagLogLevel$1.NONE) {
    maxLevel = DiagLogLevel$1.NONE;
  } else if (maxLevel > DiagLogLevel$1.ALL) {
    maxLevel = DiagLogLevel$1.ALL;
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
    error: _filterFunc("error", DiagLogLevel$1.ERROR),
    warn: _filterFunc("warn", DiagLogLevel$1.WARN),
    info: _filterFunc("info", DiagLogLevel$1.INFO),
    debug: _filterFunc("debug", DiagLogLevel$1.DEBUG),
    verbose: _filterFunc("verbose", DiagLogLevel$1.VERBOSE)
  };
}
var __read2$1 = function(o, n) {
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
var __spreadArray2$1 = function(to, from, pack) {
  if (arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
    if (ar || !(i in from)) {
      if (!ar) ar = Array.prototype.slice.call(from, 0, i);
      ar[i] = from[i];
    }
  }
  return to.concat(ar || Array.prototype.slice.call(from));
};
var API_NAME$1 = "diag";
var DiagAPI$1 = (
  /** @class */
  (function() {
    function DiagAPI2() {
      function _logProxy(funcName) {
        return function() {
          var args = [];
          for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
          }
          var logger = getGlobal$1("diag");
          if (!logger)
            return;
          return logger[funcName].apply(logger, __spreadArray2$1([], __read2$1(args), false));
        };
      }
      var self = this;
      var setLogger = function(logger, optionsOrLogLevel) {
        var _a21, _b92, _c;
        if (optionsOrLogLevel === void 0) {
          optionsOrLogLevel = { logLevel: DiagLogLevel$1.INFO };
        }
        if (logger === self) {
          var err = new Error("Cannot use diag as the logger for itself. Please use a DiagLogger implementation like ConsoleDiagLogger or a custom implementation");
          self.error((_a21 = err.stack) !== null && _a21 !== void 0 ? _a21 : err.message);
          return false;
        }
        if (typeof optionsOrLogLevel === "number") {
          optionsOrLogLevel = {
            logLevel: optionsOrLogLevel
          };
        }
        var oldLogger = getGlobal$1("diag");
        var newLogger = createLogLevelDiagLogger$1((_b92 = optionsOrLogLevel.logLevel) !== null && _b92 !== void 0 ? _b92 : DiagLogLevel$1.INFO, logger);
        if (oldLogger && !optionsOrLogLevel.suppressOverrideMessage) {
          var stack = (_c = new Error().stack) !== null && _c !== void 0 ? _c : "<failed to generate stacktrace>";
          oldLogger.warn("Current logger will be overwritten from " + stack);
          newLogger.warn("Current logger will overwrite one already registered from " + stack);
        }
        return registerGlobal$1("diag", newLogger, self, true);
      };
      self.setLogger = setLogger;
      self.disable = function() {
        unregisterGlobal$1(API_NAME$1, self);
      };
      self.createComponentLogger = function(options) {
        return new DiagComponentLogger$1(options);
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
function createContextKey$1(description) {
  return Symbol.for(description);
}
var BaseContext$1 = (
  /** @class */
  /* @__PURE__ */ (function() {
    function BaseContext2(parentContext) {
      var self = this;
      self._currentContext = parentContext ? new Map(parentContext) : /* @__PURE__ */ new Map();
      self.getValue = function(key) {
        return self._currentContext.get(key);
      };
      self.setValue = function(key, value) {
        var context2 = new BaseContext2(self._currentContext);
        context2._currentContext.set(key, value);
        return context2;
      };
      self.deleteValue = function(key) {
        var context2 = new BaseContext2(self._currentContext);
        context2._currentContext.delete(key);
        return context2;
      };
    }
    return BaseContext2;
  })()
);
var ROOT_CONTEXT$1 = new BaseContext$1();
var __read3$1 = function(o, n) {
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
var __spreadArray3$1 = function(to, from, pack) {
  if (arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
    if (ar || !(i in from)) {
      if (!ar) ar = Array.prototype.slice.call(from, 0, i);
      ar[i] = from[i];
    }
  }
  return to.concat(ar || Array.prototype.slice.call(from));
};
var NoopContextManager$1 = (
  /** @class */
  (function() {
    function NoopContextManager2() {
    }
    NoopContextManager2.prototype.active = function() {
      return ROOT_CONTEXT$1;
    };
    NoopContextManager2.prototype.with = function(_context, fn, thisArg) {
      var args = [];
      for (var _i = 3; _i < arguments.length; _i++) {
        args[_i - 3] = arguments[_i];
      }
      return fn.call.apply(fn, __spreadArray3$1([thisArg], __read3$1(args), false));
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
var __read4$1 = function(o, n) {
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
var __spreadArray4$1 = function(to, from, pack) {
  if (arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
    if (ar || !(i in from)) {
      if (!ar) ar = Array.prototype.slice.call(from, 0, i);
      ar[i] = from[i];
    }
  }
  return to.concat(ar || Array.prototype.slice.call(from));
};
var API_NAME2$1 = "context";
var NOOP_CONTEXT_MANAGER$1 = new NoopContextManager$1();
var ContextAPI$1 = (
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
      return registerGlobal$1(API_NAME2$1, contextManager, DiagAPI$1.instance());
    };
    ContextAPI2.prototype.active = function() {
      return this._getContextManager().active();
    };
    ContextAPI2.prototype.with = function(context2, fn, thisArg) {
      var _a21;
      var args = [];
      for (var _i = 3; _i < arguments.length; _i++) {
        args[_i - 3] = arguments[_i];
      }
      return (_a21 = this._getContextManager()).with.apply(_a21, __spreadArray4$1([context2, fn, thisArg], __read4$1(args), false));
    };
    ContextAPI2.prototype.bind = function(context2, target) {
      return this._getContextManager().bind(context2, target);
    };
    ContextAPI2.prototype._getContextManager = function() {
      return getGlobal$1(API_NAME2$1) || NOOP_CONTEXT_MANAGER$1;
    };
    ContextAPI2.prototype.disable = function() {
      this._getContextManager().disable();
      unregisterGlobal$1(API_NAME2$1, DiagAPI$1.instance());
    };
    return ContextAPI2;
  })()
);
var TraceFlags$1;
(function(TraceFlags2) {
  TraceFlags2[TraceFlags2["NONE"] = 0] = "NONE";
  TraceFlags2[TraceFlags2["SAMPLED"] = 1] = "SAMPLED";
})(TraceFlags$1 || (TraceFlags$1 = {}));
var INVALID_SPANID$1 = "0000000000000000";
var INVALID_TRACEID$1 = "00000000000000000000000000000000";
var INVALID_SPAN_CONTEXT$1 = {
  traceId: INVALID_TRACEID$1,
  spanId: INVALID_SPANID$1,
  traceFlags: TraceFlags$1.NONE
};
var NonRecordingSpan$1 = (
  /** @class */
  (function() {
    function NonRecordingSpan2(_spanContext) {
      if (_spanContext === void 0) {
        _spanContext = INVALID_SPAN_CONTEXT$1;
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
var SPAN_KEY$1 = createContextKey$1("OpenTelemetry Context Key SPAN");
function getSpan$1(context2) {
  return context2.getValue(SPAN_KEY$1) || void 0;
}
function getActiveSpan$1() {
  return getSpan$1(ContextAPI$1.getInstance().active());
}
function setSpan$1(context2, span) {
  return context2.setValue(SPAN_KEY$1, span);
}
function deleteSpan$1(context2) {
  return context2.deleteValue(SPAN_KEY$1);
}
function setSpanContext$1(context2, spanContext) {
  return setSpan$1(context2, new NonRecordingSpan$1(spanContext));
}
function getSpanContext$1(context2) {
  var _a21;
  return (_a21 = getSpan$1(context2)) === null || _a21 === void 0 ? void 0 : _a21.spanContext();
}
var VALID_TRACEID_REGEX$1 = /^([0-9a-f]{32})$/i;
var VALID_SPANID_REGEX$1 = /^[0-9a-f]{16}$/i;
function isValidTraceId$1(traceId) {
  return VALID_TRACEID_REGEX$1.test(traceId) && traceId !== INVALID_TRACEID$1;
}
function isValidSpanId$1(spanId) {
  return VALID_SPANID_REGEX$1.test(spanId) && spanId !== INVALID_SPANID$1;
}
function isSpanContextValid$1(spanContext) {
  return isValidTraceId$1(spanContext.traceId) && isValidSpanId$1(spanContext.spanId);
}
function wrapSpanContext$1(spanContext) {
  return new NonRecordingSpan$1(spanContext);
}
var contextApi$1 = ContextAPI$1.getInstance();
var NoopTracer$1 = (
  /** @class */
  (function() {
    function NoopTracer2() {
    }
    NoopTracer2.prototype.startSpan = function(name21, options, context2) {
      if (context2 === void 0) {
        context2 = contextApi$1.active();
      }
      var root = Boolean(options === null || options === void 0 ? void 0 : options.root);
      if (root) {
        return new NonRecordingSpan$1();
      }
      var parentFromContext = context2 && getSpanContext$1(context2);
      if (isSpanContext$1(parentFromContext) && isSpanContextValid$1(parentFromContext)) {
        return new NonRecordingSpan$1(parentFromContext);
      } else {
        return new NonRecordingSpan$1();
      }
    };
    NoopTracer2.prototype.startActiveSpan = function(name21, arg2, arg3, arg4) {
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
      var parentContext = ctx !== null && ctx !== void 0 ? ctx : contextApi$1.active();
      var span = this.startSpan(name21, opts, parentContext);
      var contextWithSpanSet = setSpan$1(parentContext, span);
      return contextApi$1.with(contextWithSpanSet, fn, void 0, span);
    };
    return NoopTracer2;
  })()
);
function isSpanContext$1(spanContext) {
  return typeof spanContext === "object" && typeof spanContext["spanId"] === "string" && typeof spanContext["traceId"] === "string" && typeof spanContext["traceFlags"] === "number";
}
var NOOP_TRACER$1 = new NoopTracer$1();
var ProxyTracer$1 = (
  /** @class */
  (function() {
    function ProxyTracer2(_provider, name21, version, options) {
      this._provider = _provider;
      this.name = name21;
      this.version = version;
      this.options = options;
    }
    ProxyTracer2.prototype.startSpan = function(name21, options, context2) {
      return this._getTracer().startSpan(name21, options, context2);
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
        return NOOP_TRACER$1;
      }
      this._delegate = tracer;
      return this._delegate;
    };
    return ProxyTracer2;
  })()
);
var NoopTracerProvider$1 = (
  /** @class */
  (function() {
    function NoopTracerProvider2() {
    }
    NoopTracerProvider2.prototype.getTracer = function(_name, _version, _options) {
      return new NoopTracer$1();
    };
    return NoopTracerProvider2;
  })()
);
var NOOP_TRACER_PROVIDER$1 = new NoopTracerProvider$1();
var ProxyTracerProvider$1 = (
  /** @class */
  (function() {
    function ProxyTracerProvider2() {
    }
    ProxyTracerProvider2.prototype.getTracer = function(name21, version, options) {
      var _a21;
      return (_a21 = this.getDelegateTracer(name21, version, options)) !== null && _a21 !== void 0 ? _a21 : new ProxyTracer$1(this, name21, version, options);
    };
    ProxyTracerProvider2.prototype.getDelegate = function() {
      var _a21;
      return (_a21 = this._delegate) !== null && _a21 !== void 0 ? _a21 : NOOP_TRACER_PROVIDER$1;
    };
    ProxyTracerProvider2.prototype.setDelegate = function(delegate) {
      this._delegate = delegate;
    };
    ProxyTracerProvider2.prototype.getDelegateTracer = function(name21, version, options) {
      var _a21;
      return (_a21 = this._delegate) === null || _a21 === void 0 ? void 0 : _a21.getTracer(name21, version, options);
    };
    return ProxyTracerProvider2;
  })()
);
var SpanStatusCode$1;
(function(SpanStatusCode2) {
  SpanStatusCode2[SpanStatusCode2["UNSET"] = 0] = "UNSET";
  SpanStatusCode2[SpanStatusCode2["OK"] = 1] = "OK";
  SpanStatusCode2[SpanStatusCode2["ERROR"] = 2] = "ERROR";
})(SpanStatusCode$1 || (SpanStatusCode$1 = {}));
var context = ContextAPI$1.getInstance();
var API_NAME3$1 = "trace";
var TraceAPI$1 = (
  /** @class */
  (function() {
    function TraceAPI2() {
      this._proxyTracerProvider = new ProxyTracerProvider$1();
      this.wrapSpanContext = wrapSpanContext$1;
      this.isSpanContextValid = isSpanContextValid$1;
      this.deleteSpan = deleteSpan$1;
      this.getSpan = getSpan$1;
      this.getActiveSpan = getActiveSpan$1;
      this.getSpanContext = getSpanContext$1;
      this.setSpan = setSpan$1;
      this.setSpanContext = setSpanContext$1;
    }
    TraceAPI2.getInstance = function() {
      if (!this._instance) {
        this._instance = new TraceAPI2();
      }
      return this._instance;
    };
    TraceAPI2.prototype.setGlobalTracerProvider = function(provider) {
      var success = registerGlobal$1(API_NAME3$1, this._proxyTracerProvider, DiagAPI$1.instance());
      if (success) {
        this._proxyTracerProvider.setDelegate(provider);
      }
      return success;
    };
    TraceAPI2.prototype.getTracerProvider = function() {
      return getGlobal$1(API_NAME3$1) || this._proxyTracerProvider;
    };
    TraceAPI2.prototype.getTracer = function(name21, version) {
      return this.getTracerProvider().getTracer(name21, version);
    };
    TraceAPI2.prototype.disable = function() {
      unregisterGlobal$1(API_NAME3$1, DiagAPI$1.instance());
      this._proxyTracerProvider = new ProxyTracerProvider$1();
    };
    return TraceAPI2;
  })()
);
var trace$1 = TraceAPI$1.getInstance();
var __defProp$1 = Object.defineProperty;
var __export$1 = (target, all) => {
  for (var name21 in all)
    __defProp$1(target, name21, { get: all[name21], enumerable: true });
};
var name82$1 = "AI_InvalidArgumentError";
var marker92$1 = `vercel.ai.error.${name82$1}`;
var symbol92$1 = Symbol.for(marker92$1);
var _a92$1;
var InvalidArgumentError2$1 = class InvalidArgumentError2 extends AISDKError$1 {
  constructor({
    parameter,
    value,
    message
  }) {
    super({
      name: name82$1,
      message: `Invalid argument for parameter ${parameter}: ${message}`
    });
    this[_a92$1] = true;
    this.parameter = parameter;
    this.value = value;
  }
  static isInstance(error) {
    return AISDKError$1.hasMarker(error, marker92$1);
  }
};
_a92$1 = symbol92$1;
var name322 = "AI_InvalidToolApprovalError";
var marker322 = `vercel.ai.error.${name322}`;
var symbol322 = Symbol.for(marker322);
var _a322;
var InvalidToolApprovalError = class extends AISDKError$1 {
  constructor({ approvalId }) {
    super({
      name: name322,
      message: `Tool approval response references unknown approvalId: "${approvalId}". No matching tool-approval-request found in message history.`
    });
    this[_a322] = true;
    this.approvalId = approvalId;
  }
  static isInstance(error) {
    return AISDKError$1.hasMarker(error, marker322);
  }
};
_a322 = symbol322;
var name422 = "AI_InvalidToolInputError";
var marker422 = `vercel.ai.error.${name422}`;
var symbol422 = Symbol.for(marker422);
var _a422;
var InvalidToolInputError = class extends AISDKError$1 {
  constructor({
    toolInput,
    toolName,
    cause,
    message = `Invalid input for tool ${toolName}: ${getErrorMessage$1(cause)}`
  }) {
    super({ name: name422, message, cause });
    this[_a422] = true;
    this.toolInput = toolInput;
    this.toolName = toolName;
  }
  static isInstance(error) {
    return AISDKError$1.hasMarker(error, marker422);
  }
};
_a422 = symbol422;
var name522 = "AI_ToolCallNotFoundForApprovalError";
var marker522 = `vercel.ai.error.${name522}`;
var symbol522 = Symbol.for(marker522);
var _a522;
var ToolCallNotFoundForApprovalError = class extends AISDKError$1 {
  constructor({
    toolCallId,
    approvalId
  }) {
    super({
      name: name522,
      message: `Tool call "${toolCallId}" not found for approval request "${approvalId}".`
    });
    this[_a522] = true;
    this.toolCallId = toolCallId;
    this.approvalId = approvalId;
  }
  static isInstance(error) {
    return AISDKError$1.hasMarker(error, marker522);
  }
};
_a522 = symbol522;
var name622 = "AI_MissingToolResultsError";
var marker622 = `vercel.ai.error.${name622}`;
var symbol622 = Symbol.for(marker622);
var _a622;
var MissingToolResultsError = class extends AISDKError$1 {
  constructor({ toolCallIds }) {
    super({
      name: name622,
      message: `Tool result${toolCallIds.length > 1 ? "s are" : " is"} missing for tool call${toolCallIds.length > 1 ? "s" : ""} ${toolCallIds.join(
        ", "
      )}.`
    });
    this[_a622] = true;
    this.toolCallIds = toolCallIds;
  }
  static isInstance(error) {
    return AISDKError$1.hasMarker(error, marker622);
  }
};
_a622 = symbol622;
var name822 = "AI_NoObjectGeneratedError";
var marker822 = `vercel.ai.error.${name822}`;
var symbol822 = Symbol.for(marker822);
var _a822;
var NoObjectGeneratedError$1 = class NoObjectGeneratedError extends AISDKError$1 {
  constructor({
    message = "No object generated.",
    cause,
    text: text2,
    response,
    usage,
    finishReason
  }) {
    super({ name: name822, message, cause });
    this[_a822] = true;
    this.text = text2;
    this.response = response;
    this.usage = usage;
    this.finishReason = finishReason;
  }
  static isInstance(error) {
    return AISDKError$1.hasMarker(error, marker822);
  }
};
_a822 = symbol822;
var name92$1 = "AI_NoOutputGeneratedError";
var marker922 = `vercel.ai.error.${name92$1}`;
var symbol922 = Symbol.for(marker922);
var _a922;
var NoOutputGeneratedError = class extends AISDKError$1 {
  // used in isInstance
  constructor({
    message = "No output generated.",
    cause
  } = {}) {
    super({ name: name92$1, message, cause });
    this[_a922] = true;
  }
  static isInstance(error) {
    return AISDKError$1.hasMarker(error, marker922);
  }
};
_a922 = symbol922;
var name132$1 = "AI_NoSuchToolError";
var marker132$1 = `vercel.ai.error.${name132$1}`;
var symbol132$1 = Symbol.for(marker132$1);
var _a132$1;
var NoSuchToolError$1 = class NoSuchToolError extends AISDKError$1 {
  constructor({
    toolName,
    availableTools = void 0,
    message = `Model tried to call unavailable tool '${toolName}'. ${availableTools === void 0 ? "No tools are available." : `Available tools: ${availableTools.join(", ")}.`}`
  }) {
    super({ name: name132$1, message });
    this[_a132$1] = true;
    this.toolName = toolName;
    this.availableTools = availableTools;
  }
  static isInstance(error) {
    return AISDKError$1.hasMarker(error, marker132$1);
  }
};
_a132$1 = symbol132$1;
var name142 = "AI_ToolCallRepairError";
var marker142$1 = `vercel.ai.error.${name142}`;
var symbol142$1 = Symbol.for(marker142$1);
var _a142$1;
var ToolCallRepairError$1 = class ToolCallRepairError extends AISDKError$1 {
  constructor({
    cause,
    originalError,
    message = `Error repairing tool call: ${getErrorMessage$1(cause)}`
  }) {
    super({ name: name142, message, cause });
    this[_a142$1] = true;
    this.originalError = originalError;
  }
  static isInstance(error) {
    return AISDKError$1.hasMarker(error, marker142$1);
  }
};
_a142$1 = symbol142$1;
var UnsupportedModelVersionError$1 = class UnsupportedModelVersionError extends AISDKError$1 {
  constructor(options) {
    super({
      name: "AI_UnsupportedModelVersionError",
      message: `Unsupported model version ${options.version} for provider "${options.provider}" and model "${options.modelId}". AI SDK 5 only supports models that implement specification version "v2".`
    });
    this.version = options.version;
    this.provider = options.provider;
    this.modelId = options.modelId;
  }
};
var name152 = "AI_UIMessageStreamError";
var marker152 = `vercel.ai.error.${name152}`;
var symbol152 = Symbol.for(marker152);
var _a152;
var UIMessageStreamError = class extends AISDKError$1 {
  constructor({
    chunkType,
    chunkId,
    message
  }) {
    super({ name: name152, message });
    this[_a152] = true;
    this.chunkType = chunkType;
    this.chunkId = chunkId;
  }
  static isInstance(error) {
    return AISDKError$1.hasMarker(error, marker152);
  }
};
_a152 = symbol152;
var name17 = "AI_InvalidMessageRoleError";
var marker17 = `vercel.ai.error.${name17}`;
var symbol17 = Symbol.for(marker17);
var _a17;
var InvalidMessageRoleError$1 = class InvalidMessageRoleError extends AISDKError$1 {
  constructor({
    role,
    message = `Invalid message role: '${role}'. Must be one of: "system", "user", "assistant", "tool".`
  }) {
    super({ name: name17, message });
    this[_a17] = true;
    this.role = role;
  }
  static isInstance(error) {
    return AISDKError$1.hasMarker(error, marker17);
  }
};
_a17 = symbol17;
var name19 = "AI_RetryError";
var marker19 = `vercel.ai.error.${name19}`;
var symbol19 = Symbol.for(marker19);
var _a19;
var RetryError$1 = class RetryError extends AISDKError$1 {
  constructor({
    message,
    reason,
    errors
  }) {
    super({ name: name19, message });
    this[_a19] = true;
    this.reason = reason;
    this.errors = errors;
    this.lastError = errors[errors.length - 1];
  }
  static isInstance(error) {
    return AISDKError$1.hasMarker(error, marker19);
  }
};
_a19 = symbol19;
function asArray$1(value) {
  return value === void 0 ? [] : Array.isArray(value) ? value : [value];
}
async function notify(options) {
  for (const callback of asArray$1(options.callbacks)) {
    if (callback == null)
      continue;
    try {
      await callback(options.event);
    } catch (_ignored) {
    }
  }
}
function formatWarning({
  warning,
  provider,
  model
}) {
  const prefix = `AI SDK Warning (${provider} / ${model}):`;
  switch (warning.type) {
    case "unsupported": {
      let message = `${prefix} The feature "${warning.feature}" is not supported.`;
      if (warning.details) {
        message += ` ${warning.details}`;
      }
      return message;
    }
    case "compatibility": {
      let message = `${prefix} The feature "${warning.feature}" is used in a compatibility mode.`;
      if (warning.details) {
        message += ` ${warning.details}`;
      }
      return message;
    }
    case "other": {
      return `${prefix} ${warning.message}`;
    }
    default: {
      return `${prefix} ${JSON.stringify(warning, null, 2)}`;
    }
  }
}
var FIRST_WARNING_INFO_MESSAGE = "AI SDK Warning System: To turn off warning logging, set the AI_SDK_LOG_WARNINGS global to false.";
var hasLoggedBefore = false;
var logWarnings = (options) => {
  if (options.warnings.length === 0) {
    return;
  }
  const logger = globalThis.AI_SDK_LOG_WARNINGS;
  if (logger === false) {
    return;
  }
  if (typeof logger === "function") {
    logger(options);
    return;
  }
  if (!hasLoggedBefore) {
    hasLoggedBefore = true;
    console.info(FIRST_WARNING_INFO_MESSAGE);
  }
  for (const warning of options.warnings) {
    console.warn(
      formatWarning({
        warning,
        provider: options.provider,
        model: options.model
      })
    );
  }
};
function logV2CompatibilityWarning({
  provider,
  modelId
}) {
  logWarnings({
    warnings: [
      {
        type: "compatibility",
        feature: "specificationVersion",
        details: `Using v2 specification compatibility mode. Some features may not be available.`
      }
    ],
    provider,
    model: modelId
  });
}
function asLanguageModelV3(model) {
  if (model.specificationVersion === "v3") {
    return model;
  }
  logV2CompatibilityWarning({
    provider: model.provider,
    modelId: model.modelId
  });
  return new Proxy(model, {
    get(target, prop) {
      switch (prop) {
        case "specificationVersion":
          return "v3";
        case "doGenerate":
          return async (...args) => {
            const result = await target.doGenerate(...args);
            return {
              ...result,
              finishReason: convertV2FinishReasonToV3(result.finishReason),
              usage: convertV2UsageToV3(result.usage)
            };
          };
        case "doStream":
          return async (...args) => {
            const result = await target.doStream(...args);
            return {
              ...result,
              stream: convertV2StreamToV3(result.stream)
            };
          };
        default:
          return target[prop];
      }
    }
  });
}
function convertV2StreamToV3(stream) {
  return stream.pipeThrough(
    new TransformStream({
      transform(chunk, controller) {
        switch (chunk.type) {
          case "finish":
            controller.enqueue({
              ...chunk,
              finishReason: convertV2FinishReasonToV3(chunk.finishReason),
              usage: convertV2UsageToV3(chunk.usage)
            });
            break;
          default:
            controller.enqueue(chunk);
            break;
        }
      }
    })
  );
}
function convertV2FinishReasonToV3(finishReason) {
  return {
    unified: finishReason === "unknown" ? "other" : finishReason,
    raw: void 0
  };
}
function convertV2UsageToV3(usage) {
  return {
    inputTokens: {
      total: usage.inputTokens,
      noCache: void 0,
      cacheRead: usage.cachedInputTokens,
      cacheWrite: void 0
    },
    outputTokens: {
      total: usage.outputTokens,
      text: void 0,
      reasoning: usage.reasoningTokens
    }
  };
}
function resolveLanguageModel(model) {
  if (typeof model !== "string") {
    if (model.specificationVersion !== "v3" && model.specificationVersion !== "v2") {
      const unsupportedModel = model;
      throw new UnsupportedModelVersionError$1({
        version: unsupportedModel.specificationVersion,
        provider: unsupportedModel.provider,
        modelId: unsupportedModel.modelId
      });
    }
    return asLanguageModelV3(model);
  }
  return getGlobalProvider().languageModel(model);
}
function getGlobalProvider() {
  var _a21;
  return (_a21 = globalThis.AI_SDK_DEFAULT_PROVIDER) != null ? _a21 : gateway;
}
function getTotalTimeoutMs(timeout) {
  if (timeout == null) {
    return void 0;
  }
  if (typeof timeout === "number") {
    return timeout;
  }
  return timeout.totalMs;
}
function getStepTimeoutMs(timeout) {
  if (timeout == null || typeof timeout === "number") {
    return void 0;
  }
  return timeout.stepMs;
}
function getChunkTimeoutMs(timeout) {
  if (timeout == null || typeof timeout === "number") {
    return void 0;
  }
  return timeout.chunkMs;
}
var imageMediaTypeSignatures = [
  {
    mediaType: "image/gif",
    bytesPrefix: [71, 73, 70]
    // GIF
  },
  {
    mediaType: "image/png",
    bytesPrefix: [137, 80, 78, 71]
    // PNG
  },
  {
    mediaType: "image/jpeg",
    bytesPrefix: [255, 216]
    // JPEG
  },
  {
    mediaType: "image/webp",
    bytesPrefix: [
      82,
      73,
      70,
      70,
      // "RIFF"
      null,
      null,
      null,
      null,
      // file size (variable)
      87,
      69,
      66,
      80
      // "WEBP"
    ]
  },
  {
    mediaType: "image/bmp",
    bytesPrefix: [66, 77]
  },
  {
    mediaType: "image/tiff",
    bytesPrefix: [73, 73, 42, 0]
  },
  {
    mediaType: "image/tiff",
    bytesPrefix: [77, 77, 0, 42]
  },
  {
    mediaType: "image/avif",
    bytesPrefix: [
      0,
      0,
      0,
      32,
      102,
      116,
      121,
      112,
      97,
      118,
      105,
      102
    ]
  },
  {
    mediaType: "image/heic",
    bytesPrefix: [
      0,
      0,
      0,
      32,
      102,
      116,
      121,
      112,
      104,
      101,
      105,
      99
    ]
  }
];
var stripID3$1 = (data) => {
  const bytes = typeof data === "string" ? convertBase64ToUint8Array$1(data) : data;
  const id3Size = (bytes[6] & 127) << 21 | (bytes[7] & 127) << 14 | (bytes[8] & 127) << 7 | bytes[9] & 127;
  return bytes.slice(id3Size + 10);
};
function stripID3TagsIfPresent$1(data) {
  const hasId3 = typeof data === "string" && data.startsWith("SUQz") || typeof data !== "string" && data.length > 10 && data[0] === 73 && // 'I'
  data[1] === 68 && // 'D'
  data[2] === 51;
  return hasId3 ? stripID3$1(data) : data;
}
function detectMediaType({
  data,
  signatures
}) {
  const processedData = stripID3TagsIfPresent$1(data);
  const bytes = typeof processedData === "string" ? convertBase64ToUint8Array$1(
    processedData.substring(0, Math.min(processedData.length, 24))
  ) : processedData;
  for (const signature of signatures) {
    if (bytes.length >= signature.bytesPrefix.length && signature.bytesPrefix.every(
      (byte, index) => byte === null || bytes[index] === byte
    )) {
      return signature.mediaType;
    }
  }
  return void 0;
}
var VERSION3 = "6.0.116";
var download$1 = async ({
  url,
  maxBytes,
  abortSignal
}) => {
  var _a21;
  const urlText = url.toString();
  validateDownloadUrl(urlText);
  try {
    const response = await fetch(urlText, {
      headers: withUserAgentSuffix(
        {},
        `ai-sdk/${VERSION3}`,
        getRuntimeEnvironmentUserAgent()
      ),
      signal: abortSignal
    });
    if (!response.ok) {
      throw new DownloadError$1({
        url: urlText,
        statusCode: response.status,
        statusText: response.statusText
      });
    }
    const data = await readResponseWithSizeLimit({
      response,
      url: urlText,
      maxBytes: maxBytes != null ? maxBytes : DEFAULT_MAX_DOWNLOAD_SIZE
    });
    return {
      data,
      mediaType: (_a21 = response.headers.get("content-type")) != null ? _a21 : void 0
    };
  } catch (error) {
    if (DownloadError$1.isInstance(error)) {
      throw error;
    }
    throw new DownloadError$1({ url: urlText, cause: error });
  }
};
var createDefaultDownloadFunction = (download2 = download$1) => (requestedDownloads) => Promise.all(
  requestedDownloads.map(
    async (requestedDownload) => requestedDownload.isUrlSupportedByModel ? null : download2(requestedDownload)
  )
);
function splitDataUrl$1(dataUrl) {
  try {
    const [header, base64Content] = dataUrl.split(",");
    return {
      mediaType: header.split(";")[0].split(":")[1],
      base64Content
    };
  } catch (error) {
    return {
      mediaType: void 0,
      base64Content: void 0
    };
  }
}
var dataContentSchema$1 = union([
  string(),
  _instanceof(Uint8Array),
  _instanceof(ArrayBuffer),
  custom(
    // Buffer might not be available in some environments such as CloudFlare:
    (value) => {
      var _a21, _b92;
      return (_b92 = (_a21 = globalThis.Buffer) == null ? void 0 : _a21.isBuffer(value)) != null ? _b92 : false;
    },
    { message: "Must be a Buffer" }
  )
]);
function convertToLanguageModelV3DataContent(content) {
  if (content instanceof Uint8Array) {
    return { data: content, mediaType: void 0 };
  }
  if (content instanceof ArrayBuffer) {
    return { data: new Uint8Array(content), mediaType: void 0 };
  }
  if (typeof content === "string") {
    try {
      content = new URL(content);
    } catch (error) {
    }
  }
  if (content instanceof URL && content.protocol === "data:") {
    const { mediaType: dataUrlMediaType, base64Content } = splitDataUrl$1(
      content.toString()
    );
    if (dataUrlMediaType == null || base64Content == null) {
      throw new AISDKError$1({
        name: "InvalidDataContentError",
        message: `Invalid data URL format in content ${content.toString()}`
      });
    }
    return { data: base64Content, mediaType: dataUrlMediaType };
  }
  return { data: content, mediaType: void 0 };
}
function convertDataContentToBase64String$1(content) {
  if (typeof content === "string") {
    return content;
  }
  if (content instanceof ArrayBuffer) {
    return convertUint8ArrayToBase64$1(new Uint8Array(content));
  }
  return convertUint8ArrayToBase64$1(content);
}
async function convertToLanguageModelPrompt$1({
  prompt,
  supportedUrls,
  download: download2 = createDefaultDownloadFunction()
}) {
  const downloadedAssets = await downloadAssets$1(
    prompt.messages,
    download2,
    supportedUrls
  );
  const approvalIdToToolCallId = /* @__PURE__ */ new Map();
  for (const message of prompt.messages) {
    if (message.role === "assistant" && Array.isArray(message.content)) {
      for (const part of message.content) {
        if (part.type === "tool-approval-request" && "approvalId" in part && "toolCallId" in part) {
          approvalIdToToolCallId.set(
            part.approvalId,
            part.toolCallId
          );
        }
      }
    }
  }
  const approvedToolCallIds = /* @__PURE__ */ new Set();
  for (const message of prompt.messages) {
    if (message.role === "tool") {
      for (const part of message.content) {
        if (part.type === "tool-approval-response") {
          const toolCallId = approvalIdToToolCallId.get(part.approvalId);
          if (toolCallId) {
            approvedToolCallIds.add(toolCallId);
          }
        }
      }
    }
  }
  const messages = [
    ...prompt.system != null ? typeof prompt.system === "string" ? [{ role: "system", content: prompt.system }] : asArray$1(prompt.system).map((message) => ({
      role: "system",
      content: message.content,
      providerOptions: message.providerOptions
    })) : [],
    ...prompt.messages.map(
      (message) => convertToLanguageModelMessage$1({ message, downloadedAssets })
    )
  ];
  const combinedMessages = [];
  for (const message of messages) {
    if (message.role !== "tool") {
      combinedMessages.push(message);
      continue;
    }
    const lastCombinedMessage = combinedMessages.at(-1);
    if ((lastCombinedMessage == null ? void 0 : lastCombinedMessage.role) === "tool") {
      lastCombinedMessage.content.push(...message.content);
    } else {
      combinedMessages.push(message);
    }
  }
  const toolCallIds = /* @__PURE__ */ new Set();
  for (const message of combinedMessages) {
    switch (message.role) {
      case "assistant": {
        for (const content of message.content) {
          if (content.type === "tool-call" && !content.providerExecuted) {
            toolCallIds.add(content.toolCallId);
          }
        }
        break;
      }
      case "tool": {
        for (const content of message.content) {
          if (content.type === "tool-result") {
            toolCallIds.delete(content.toolCallId);
          }
        }
        break;
      }
      case "user":
      case "system":
        for (const id of approvedToolCallIds) {
          toolCallIds.delete(id);
        }
        if (toolCallIds.size > 0) {
          throw new MissingToolResultsError({
            toolCallIds: Array.from(toolCallIds)
          });
        }
        break;
    }
  }
  for (const id of approvedToolCallIds) {
    toolCallIds.delete(id);
  }
  if (toolCallIds.size > 0) {
    throw new MissingToolResultsError({ toolCallIds: Array.from(toolCallIds) });
  }
  return combinedMessages.filter(
    // Filter out empty tool messages (e.g. if they only contained
    // tool-approval-response parts that were removed).
    // This prevents sending invalid empty messages to the provider.
    // Note: provider-executed tool-approval-response parts are preserved.
    (message) => message.role !== "tool" || message.content.length > 0
  );
}
function convertToLanguageModelMessage$1({
  message,
  downloadedAssets
}) {
  const role = message.role;
  switch (role) {
    case "system": {
      return {
        role: "system",
        content: message.content,
        providerOptions: message.providerOptions
      };
    }
    case "user": {
      if (typeof message.content === "string") {
        return {
          role: "user",
          content: [{ type: "text", text: message.content }],
          providerOptions: message.providerOptions
        };
      }
      return {
        role: "user",
        content: message.content.map((part) => convertPartToLanguageModelPart$1(part, downloadedAssets)).filter((part) => part.type !== "text" || part.text !== ""),
        providerOptions: message.providerOptions
      };
    }
    case "assistant": {
      if (typeof message.content === "string") {
        return {
          role: "assistant",
          content: [{ type: "text", text: message.content }],
          providerOptions: message.providerOptions
        };
      }
      return {
        role: "assistant",
        content: message.content.filter(
          // remove empty text parts (no text, and no provider options):
          (part) => part.type !== "text" || part.text !== "" || part.providerOptions != null
        ).filter(
          (part) => part.type !== "tool-approval-request"
        ).map((part) => {
          const providerOptions = part.providerOptions;
          switch (part.type) {
            case "file": {
              const { data, mediaType } = convertToLanguageModelV3DataContent(
                part.data
              );
              return {
                type: "file",
                data,
                filename: part.filename,
                mediaType: mediaType != null ? mediaType : part.mediaType,
                providerOptions
              };
            }
            case "reasoning": {
              return {
                type: "reasoning",
                text: part.text,
                providerOptions
              };
            }
            case "text": {
              return {
                type: "text",
                text: part.text,
                providerOptions
              };
            }
            case "tool-call": {
              return {
                type: "tool-call",
                toolCallId: part.toolCallId,
                toolName: part.toolName,
                input: part.input,
                providerExecuted: part.providerExecuted,
                providerOptions
              };
            }
            case "tool-result": {
              return {
                type: "tool-result",
                toolCallId: part.toolCallId,
                toolName: part.toolName,
                output: mapToolResultOutput(part.output),
                providerOptions
              };
            }
          }
        }),
        providerOptions: message.providerOptions
      };
    }
    case "tool": {
      return {
        role: "tool",
        content: message.content.filter(
          // Only include tool-approval-response for provider-executed tools
          (part) => part.type !== "tool-approval-response" || part.providerExecuted
        ).map((part) => {
          switch (part.type) {
            case "tool-result": {
              return {
                type: "tool-result",
                toolCallId: part.toolCallId,
                toolName: part.toolName,
                output: mapToolResultOutput(part.output),
                providerOptions: part.providerOptions
              };
            }
            case "tool-approval-response": {
              return {
                type: "tool-approval-response",
                approvalId: part.approvalId,
                approved: part.approved,
                reason: part.reason
              };
            }
          }
        }),
        providerOptions: message.providerOptions
      };
    }
    default: {
      const _exhaustiveCheck = role;
      throw new InvalidMessageRoleError$1({ role: _exhaustiveCheck });
    }
  }
}
async function downloadAssets$1(messages, download2, supportedUrls) {
  const plannedDownloads = messages.filter((message) => message.role === "user").map((message) => message.content).filter(
    (content) => Array.isArray(content)
  ).flat().filter(
    (part) => part.type === "image" || part.type === "file"
  ).map((part) => {
    var _a21;
    const mediaType = (_a21 = part.mediaType) != null ? _a21 : part.type === "image" ? "image/*" : void 0;
    let data = part.type === "image" ? part.image : part.data;
    if (typeof data === "string") {
      try {
        data = new URL(data);
      } catch (ignored) {
      }
    }
    return { mediaType, data };
  }).filter(
    (part) => part.data instanceof URL
  ).map((part) => ({
    url: part.data,
    isUrlSupportedByModel: part.mediaType != null && isUrlSupported({
      url: part.data.toString(),
      mediaType: part.mediaType,
      supportedUrls
    })
  }));
  const downloadedFiles = await download2(plannedDownloads);
  return Object.fromEntries(
    downloadedFiles.map(
      (file, index) => file == null ? null : [
        plannedDownloads[index].url.toString(),
        { data: file.data, mediaType: file.mediaType }
      ]
    ).filter((file) => file != null)
  );
}
function convertPartToLanguageModelPart$1(part, downloadedAssets) {
  var _a21;
  if (part.type === "text") {
    return {
      type: "text",
      text: part.text,
      providerOptions: part.providerOptions
    };
  }
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
  const { data: convertedData, mediaType: convertedMediaType } = convertToLanguageModelV3DataContent(originalData);
  let mediaType = convertedMediaType != null ? convertedMediaType : part.mediaType;
  let data = convertedData;
  if (data instanceof URL) {
    const downloadedFile = downloadedAssets[data.toString()];
    if (downloadedFile) {
      data = downloadedFile.data;
      mediaType != null ? mediaType : mediaType = downloadedFile.mediaType;
    }
  }
  switch (type) {
    case "image": {
      if (data instanceof Uint8Array || typeof data === "string") {
        mediaType = (_a21 = detectMediaType({ data, signatures: imageMediaTypeSignatures })) != null ? _a21 : mediaType;
      }
      return {
        type: "file",
        mediaType: mediaType != null ? mediaType : "image/*",
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
function mapToolResultOutput(output) {
  if (output.type !== "content") {
    return output;
  }
  return {
    type: "content",
    value: output.value.map((item) => {
      if (item.type !== "media") {
        return item;
      }
      if (item.mediaType.startsWith("image/")) {
        return {
          type: "image-data",
          data: item.data,
          mediaType: item.mediaType
        };
      }
      return {
        type: "file-data",
        data: item.data,
        mediaType: item.mediaType
      };
    })
  };
}
async function createToolModelOutput({
  toolCallId,
  input,
  output,
  tool: tool2,
  errorMode
}) {
  if (errorMode === "text") {
    return { type: "error-text", value: getErrorMessage$1(output) };
  } else if (errorMode === "json") {
    return { type: "error-json", value: toJSONValue(output) };
  }
  if (tool2 == null ? void 0 : tool2.toModelOutput) {
    return await tool2.toModelOutput({ toolCallId, input, output });
  }
  return typeof output === "string" ? { type: "text", value: output } : { type: "json", value: toJSONValue(output) };
}
function toJSONValue(value) {
  return value === void 0 ? null : value;
}
function prepareCallSettings$1({
  maxOutputTokens,
  temperature,
  topP,
  topK,
  presencePenalty,
  frequencyPenalty,
  seed,
  stopSequences
}) {
  if (maxOutputTokens != null) {
    if (!Number.isInteger(maxOutputTokens)) {
      throw new InvalidArgumentError2$1({
        parameter: "maxOutputTokens",
        value: maxOutputTokens,
        message: "maxOutputTokens must be an integer"
      });
    }
    if (maxOutputTokens < 1) {
      throw new InvalidArgumentError2$1({
        parameter: "maxOutputTokens",
        value: maxOutputTokens,
        message: "maxOutputTokens must be >= 1"
      });
    }
  }
  if (temperature != null) {
    if (typeof temperature !== "number") {
      throw new InvalidArgumentError2$1({
        parameter: "temperature",
        value: temperature,
        message: "temperature must be a number"
      });
    }
  }
  if (topP != null) {
    if (typeof topP !== "number") {
      throw new InvalidArgumentError2$1({
        parameter: "topP",
        value: topP,
        message: "topP must be a number"
      });
    }
  }
  if (topK != null) {
    if (typeof topK !== "number") {
      throw new InvalidArgumentError2$1({
        parameter: "topK",
        value: topK,
        message: "topK must be a number"
      });
    }
  }
  if (presencePenalty != null) {
    if (typeof presencePenalty !== "number") {
      throw new InvalidArgumentError2$1({
        parameter: "presencePenalty",
        value: presencePenalty,
        message: "presencePenalty must be a number"
      });
    }
  }
  if (frequencyPenalty != null) {
    if (typeof frequencyPenalty !== "number") {
      throw new InvalidArgumentError2$1({
        parameter: "frequencyPenalty",
        value: frequencyPenalty,
        message: "frequencyPenalty must be a number"
      });
    }
  }
  if (seed != null) {
    if (!Number.isInteger(seed)) {
      throw new InvalidArgumentError2$1({
        parameter: "seed",
        value: seed,
        message: "seed must be an integer"
      });
    }
  }
  return {
    maxOutputTokens,
    temperature,
    topP,
    topK,
    presencePenalty,
    frequencyPenalty,
    stopSequences,
    seed
  };
}
function isNonEmptyObject$1(object2) {
  return object2 != null && Object.keys(object2).length > 0;
}
async function prepareToolsAndToolChoice$1({
  tools,
  toolChoice,
  activeTools
}) {
  if (!isNonEmptyObject$1(tools)) {
    return {
      tools: void 0,
      toolChoice: void 0
    };
  }
  const filteredTools = activeTools != null ? Object.entries(tools).filter(
    ([name21]) => activeTools.includes(name21)
  ) : Object.entries(tools);
  const languageModelTools = [];
  for (const [name21, tool2] of filteredTools) {
    const toolType = tool2.type;
    switch (toolType) {
      case void 0:
      case "dynamic":
      case "function":
        languageModelTools.push({
          type: "function",
          name: name21,
          description: tool2.description,
          inputSchema: await asSchema$1(tool2.inputSchema).jsonSchema,
          ...tool2.inputExamples != null ? { inputExamples: tool2.inputExamples } : {},
          providerOptions: tool2.providerOptions,
          ...tool2.strict != null ? { strict: tool2.strict } : {}
        });
        break;
      case "provider":
        languageModelTools.push({
          type: "provider",
          name: name21,
          id: tool2.id,
          args: tool2.args
        });
        break;
      default: {
        const exhaustiveCheck = toolType;
        throw new Error(`Unsupported tool type: ${exhaustiveCheck}`);
      }
    }
  }
  return {
    tools: languageModelTools,
    toolChoice: toolChoice == null ? { type: "auto" } : typeof toolChoice === "string" ? { type: toolChoice } : { type: "tool", toolName: toolChoice.toolName }
  };
}
var jsonValueSchema$1 = lazy(
  () => union([
    _null(),
    string(),
    number(),
    boolean(),
    record(string(), jsonValueSchema$1.optional()),
    array$1(jsonValueSchema$1)
  ])
);
var providerMetadataSchema$1 = record(
  string(),
  record(string(), jsonValueSchema$1.optional())
);
var textPartSchema$1 = object$2({
  type: literal("text"),
  text: string(),
  providerOptions: providerMetadataSchema$1.optional()
});
var imagePartSchema$1 = object$2({
  type: literal("image"),
  image: union([dataContentSchema$1, _instanceof(URL)]),
  mediaType: string().optional(),
  providerOptions: providerMetadataSchema$1.optional()
});
var filePartSchema$1 = object$2({
  type: literal("file"),
  data: union([dataContentSchema$1, _instanceof(URL)]),
  filename: string().optional(),
  mediaType: string(),
  providerOptions: providerMetadataSchema$1.optional()
});
var reasoningPartSchema$1 = object$2({
  type: literal("reasoning"),
  text: string(),
  providerOptions: providerMetadataSchema$1.optional()
});
var toolCallPartSchema$1 = object$2({
  type: literal("tool-call"),
  toolCallId: string(),
  toolName: string(),
  input: unknown(),
  providerOptions: providerMetadataSchema$1.optional(),
  providerExecuted: boolean().optional()
});
var outputSchema = discriminatedUnion(
  "type",
  [
    object$2({
      type: literal("text"),
      value: string(),
      providerOptions: providerMetadataSchema$1.optional()
    }),
    object$2({
      type: literal("json"),
      value: jsonValueSchema$1,
      providerOptions: providerMetadataSchema$1.optional()
    }),
    object$2({
      type: literal("execution-denied"),
      reason: string().optional(),
      providerOptions: providerMetadataSchema$1.optional()
    }),
    object$2({
      type: literal("error-text"),
      value: string(),
      providerOptions: providerMetadataSchema$1.optional()
    }),
    object$2({
      type: literal("error-json"),
      value: jsonValueSchema$1,
      providerOptions: providerMetadataSchema$1.optional()
    }),
    object$2({
      type: literal("content"),
      value: array$1(
        union([
          object$2({
            type: literal("text"),
            text: string(),
            providerOptions: providerMetadataSchema$1.optional()
          }),
          object$2({
            type: literal("media"),
            data: string(),
            mediaType: string()
          }),
          object$2({
            type: literal("file-data"),
            data: string(),
            mediaType: string(),
            filename: string().optional(),
            providerOptions: providerMetadataSchema$1.optional()
          }),
          object$2({
            type: literal("file-url"),
            url: string(),
            providerOptions: providerMetadataSchema$1.optional()
          }),
          object$2({
            type: literal("file-id"),
            fileId: union([string(), record(string(), string())]),
            providerOptions: providerMetadataSchema$1.optional()
          }),
          object$2({
            type: literal("image-data"),
            data: string(),
            mediaType: string(),
            providerOptions: providerMetadataSchema$1.optional()
          }),
          object$2({
            type: literal("image-url"),
            url: string(),
            providerOptions: providerMetadataSchema$1.optional()
          }),
          object$2({
            type: literal("image-file-id"),
            fileId: union([string(), record(string(), string())]),
            providerOptions: providerMetadataSchema$1.optional()
          }),
          object$2({
            type: literal("custom"),
            providerOptions: providerMetadataSchema$1.optional()
          })
        ])
      )
    })
  ]
);
var toolResultPartSchema$1 = object$2({
  type: literal("tool-result"),
  toolCallId: string(),
  toolName: string(),
  output: outputSchema,
  providerOptions: providerMetadataSchema$1.optional()
});
var toolApprovalRequestSchema = object$2({
  type: literal("tool-approval-request"),
  approvalId: string(),
  toolCallId: string()
});
var toolApprovalResponseSchema = object$2({
  type: literal("tool-approval-response"),
  approvalId: string(),
  approved: boolean(),
  reason: string().optional()
});
var systemModelMessageSchema = object$2(
  {
    role: literal("system"),
    content: string(),
    providerOptions: providerMetadataSchema$1.optional()
  }
);
var userModelMessageSchema = object$2({
  role: literal("user"),
  content: union([
    string(),
    array$1(union([textPartSchema$1, imagePartSchema$1, filePartSchema$1]))
  ]),
  providerOptions: providerMetadataSchema$1.optional()
});
var assistantModelMessageSchema = object$2({
  role: literal("assistant"),
  content: union([
    string(),
    array$1(
      union([
        textPartSchema$1,
        filePartSchema$1,
        reasoningPartSchema$1,
        toolCallPartSchema$1,
        toolResultPartSchema$1,
        toolApprovalRequestSchema
      ])
    )
  ]),
  providerOptions: providerMetadataSchema$1.optional()
});
var toolModelMessageSchema = object$2({
  role: literal("tool"),
  content: array$1(union([toolResultPartSchema$1, toolApprovalResponseSchema])),
  providerOptions: providerMetadataSchema$1.optional()
});
var modelMessageSchema = union([
  systemModelMessageSchema,
  userModelMessageSchema,
  assistantModelMessageSchema,
  toolModelMessageSchema
]);
async function standardizePrompt$1(prompt) {
  if (prompt.prompt == null && prompt.messages == null) {
    throw new InvalidPromptError$1({
      prompt,
      message: "prompt or messages must be defined"
    });
  }
  if (prompt.prompt != null && prompt.messages != null) {
    throw new InvalidPromptError$1({
      prompt,
      message: "prompt and messages cannot be defined at the same time"
    });
  }
  if (prompt.system != null && typeof prompt.system !== "string" && !asArray$1(prompt.system).every(
    (message) => typeof message === "object" && message !== null && "role" in message && message.role === "system"
  )) {
    throw new InvalidPromptError$1({
      prompt,
      message: "system must be a string, SystemModelMessage, or array of SystemModelMessage"
    });
  }
  let messages;
  if (prompt.prompt != null && typeof prompt.prompt === "string") {
    messages = [{ role: "user", content: prompt.prompt }];
  } else if (prompt.prompt != null && Array.isArray(prompt.prompt)) {
    messages = prompt.prompt;
  } else if (prompt.messages != null) {
    messages = prompt.messages;
  } else {
    throw new InvalidPromptError$1({
      prompt,
      message: "prompt or messages must be defined"
    });
  }
  if (messages.length === 0) {
    throw new InvalidPromptError$1({
      prompt,
      message: "messages must not be empty"
    });
  }
  const validationResult = await safeValidateTypes$1({
    value: messages,
    schema: array$1(modelMessageSchema)
  });
  if (!validationResult.success) {
    throw new InvalidPromptError$1({
      prompt,
      message: "The messages do not match the ModelMessage[] schema.",
      cause: validationResult.error
    });
  }
  return {
    messages,
    system: prompt.system
  };
}
function wrapGatewayError(error) {
  if (!GatewayAuthenticationError.isInstance(error))
    return error;
  const isProductionEnv = (process == null ? void 0 : process.env.NODE_ENV) === "production";
  const moreInfoURL = "https://ai-sdk.dev/unauthenticated-ai-gateway";
  if (isProductionEnv) {
    return new AISDKError$1({
      name: "GatewayError",
      message: `Unauthenticated. Configure AI_GATEWAY_API_KEY or use a provider module. Learn more: ${moreInfoURL}`
    });
  }
  return Object.assign(
    new Error(`\x1B[1m\x1B[31mUnauthenticated request to AI Gateway.\x1B[0m

To authenticate, set the \x1B[33mAI_GATEWAY_API_KEY\x1B[0m environment variable with your API key.

Alternatively, you can use a provider module instead of the AI Gateway.

Learn more: \x1B[34m${moreInfoURL}\x1B[0m

`),
    { name: "GatewayAuthenticationError" }
  );
}
function assembleOperationName$1({
  operationId,
  telemetry
}) {
  return {
    // standardized operation and resource name:
    "operation.name": `${operationId}${(telemetry == null ? void 0 : telemetry.functionId) != null ? ` ${telemetry.functionId}` : ""}`,
    "resource.name": telemetry == null ? void 0 : telemetry.functionId,
    // detailed, AI SDK specific data:
    "ai.operationId": operationId,
    "ai.telemetry.functionId": telemetry == null ? void 0 : telemetry.functionId
  };
}
function getBaseTelemetryAttributes$1({
  model,
  settings,
  telemetry,
  headers
}) {
  var _a21;
  return {
    "ai.model.provider": model.provider,
    "ai.model.id": model.modelId,
    // settings:
    ...Object.entries(settings).reduce((attributes, [key, value]) => {
      if (key === "timeout") {
        const totalTimeoutMs = getTotalTimeoutMs(
          value
        );
        if (totalTimeoutMs != null) {
          attributes[`ai.settings.${key}`] = totalTimeoutMs;
        }
      } else {
        attributes[`ai.settings.${key}`] = value;
      }
      return attributes;
    }, {}),
    // add metadata as attributes:
    ...Object.entries((_a21 = telemetry == null ? void 0 : telemetry.metadata) != null ? _a21 : {}).reduce(
      (attributes, [key, value]) => {
        attributes[`ai.telemetry.metadata.${key}`] = value;
        return attributes;
      },
      {}
    ),
    // request headers
    ...Object.entries(headers != null ? headers : {}).reduce((attributes, [key, value]) => {
      if (value !== void 0) {
        attributes[`ai.request.headers.${key}`] = value;
      }
      return attributes;
    }, {})
  };
}
var noopTracer$1 = {
  startSpan() {
    return noopSpan$1;
  },
  startActiveSpan(name21, arg1, arg2, arg3) {
    if (typeof arg1 === "function") {
      return arg1(noopSpan$1);
    }
    if (typeof arg2 === "function") {
      return arg2(noopSpan$1);
    }
    if (typeof arg3 === "function") {
      return arg3(noopSpan$1);
    }
  }
};
var noopSpan$1 = {
  spanContext() {
    return noopSpanContext$1;
  },
  setAttribute() {
    return this;
  },
  setAttributes() {
    return this;
  },
  addEvent() {
    return this;
  },
  addLink() {
    return this;
  },
  addLinks() {
    return this;
  },
  setStatus() {
    return this;
  },
  updateName() {
    return this;
  },
  end() {
    return this;
  },
  isRecording() {
    return false;
  },
  recordException() {
    return this;
  }
};
var noopSpanContext$1 = {
  traceId: "",
  spanId: "",
  traceFlags: 0
};
function getTracer$1({
  isEnabled = false,
  tracer
} = {}) {
  if (!isEnabled) {
    return noopTracer$1;
  }
  if (tracer) {
    return tracer;
  }
  return trace$1.getTracer("ai");
}
async function recordSpan$1({
  name: name21,
  tracer,
  attributes,
  fn,
  endWhenDone = true
}) {
  return tracer.startActiveSpan(
    name21,
    { attributes: await attributes },
    async (span) => {
      const ctx = context.active();
      try {
        const result = await context.with(ctx, () => fn(span));
        if (endWhenDone) {
          span.end();
        }
        return result;
      } catch (error) {
        try {
          recordErrorOnSpan$1(span, error);
        } finally {
          span.end();
        }
        throw error;
      }
    }
  );
}
function recordErrorOnSpan$1(span, error) {
  if (error instanceof Error) {
    span.recordException({
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    span.setStatus({
      code: SpanStatusCode$1.ERROR,
      message: error.message
    });
  } else {
    span.setStatus({ code: SpanStatusCode$1.ERROR });
  }
}
async function selectTelemetryAttributes$1({
  telemetry,
  attributes
}) {
  if ((telemetry == null ? void 0 : telemetry.isEnabled) !== true) {
    return {};
  }
  const resultAttributes = {};
  for (const [key, value] of Object.entries(attributes)) {
    if (value == null) {
      continue;
    }
    if (typeof value === "object" && "input" in value && typeof value.input === "function") {
      if ((telemetry == null ? void 0 : telemetry.recordInputs) === false) {
        continue;
      }
      const result = await value.input();
      if (result != null) {
        resultAttributes[key] = result;
      }
      continue;
    }
    if (typeof value === "object" && "output" in value && typeof value.output === "function") {
      if ((telemetry == null ? void 0 : telemetry.recordOutputs) === false) {
        continue;
      }
      const result = await value.output();
      if (result != null) {
        resultAttributes[key] = result;
      }
      continue;
    }
    resultAttributes[key] = value;
  }
  return resultAttributes;
}
function stringifyForTelemetry$1(prompt) {
  return JSON.stringify(
    prompt.map((message) => ({
      ...message,
      content: typeof message.content === "string" ? message.content : message.content.map(
        (part) => part.type === "file" ? {
          ...part,
          data: part.data instanceof Uint8Array ? convertDataContentToBase64String$1(part.data) : part.data
        } : part
      )
    }))
  );
}
function getGlobalTelemetryIntegrations() {
  var _a21;
  return (_a21 = globalThis.AI_SDK_TELEMETRY_INTEGRATIONS) != null ? _a21 : [];
}
function getGlobalTelemetryIntegration() {
  const globalIntegrations = getGlobalTelemetryIntegrations();
  return (integrations) => {
    const localIntegrations = asArray$1(integrations);
    const allIntegrations = [...globalIntegrations, ...localIntegrations];
    function createTelemetryComposite(getListenerFromIntegration) {
      const listeners = allIntegrations.map(getListenerFromIntegration).filter(Boolean);
      return async (event) => {
        for (const listener of listeners) {
          try {
            await listener(event);
          } catch (_ignored) {
          }
        }
      };
    }
    return {
      onStart: createTelemetryComposite((integration) => integration.onStart),
      onStepStart: createTelemetryComposite(
        (integration) => integration.onStepStart
      ),
      onToolCallStart: createTelemetryComposite(
        (integration) => integration.onToolCallStart
      ),
      onToolCallFinish: createTelemetryComposite(
        (integration) => integration.onToolCallFinish
      ),
      onStepFinish: createTelemetryComposite(
        (integration) => integration.onStepFinish
      ),
      onFinish: createTelemetryComposite((integration) => integration.onFinish)
    };
  };
}
function asLanguageModelUsage(usage) {
  return {
    inputTokens: usage.inputTokens.total,
    inputTokenDetails: {
      noCacheTokens: usage.inputTokens.noCache,
      cacheReadTokens: usage.inputTokens.cacheRead,
      cacheWriteTokens: usage.inputTokens.cacheWrite
    },
    outputTokens: usage.outputTokens.total,
    outputTokenDetails: {
      textTokens: usage.outputTokens.text,
      reasoningTokens: usage.outputTokens.reasoning
    },
    totalTokens: addTokenCounts(
      usage.inputTokens.total,
      usage.outputTokens.total
    ),
    raw: usage.raw,
    reasoningTokens: usage.outputTokens.reasoning,
    cachedInputTokens: usage.inputTokens.cacheRead
  };
}
function createNullLanguageModelUsage() {
  return {
    inputTokens: void 0,
    inputTokenDetails: {
      noCacheTokens: void 0,
      cacheReadTokens: void 0,
      cacheWriteTokens: void 0
    },
    outputTokens: void 0,
    outputTokenDetails: {
      textTokens: void 0,
      reasoningTokens: void 0
    },
    totalTokens: void 0,
    raw: void 0
  };
}
function addLanguageModelUsage$1(usage1, usage2) {
  var _a21, _b92, _c, _d, _e, _f, _g, _h, _i, _j;
  return {
    inputTokens: addTokenCounts(usage1.inputTokens, usage2.inputTokens),
    inputTokenDetails: {
      noCacheTokens: addTokenCounts(
        (_a21 = usage1.inputTokenDetails) == null ? void 0 : _a21.noCacheTokens,
        (_b92 = usage2.inputTokenDetails) == null ? void 0 : _b92.noCacheTokens
      ),
      cacheReadTokens: addTokenCounts(
        (_c = usage1.inputTokenDetails) == null ? void 0 : _c.cacheReadTokens,
        (_d = usage2.inputTokenDetails) == null ? void 0 : _d.cacheReadTokens
      ),
      cacheWriteTokens: addTokenCounts(
        (_e = usage1.inputTokenDetails) == null ? void 0 : _e.cacheWriteTokens,
        (_f = usage2.inputTokenDetails) == null ? void 0 : _f.cacheWriteTokens
      )
    },
    outputTokens: addTokenCounts(usage1.outputTokens, usage2.outputTokens),
    outputTokenDetails: {
      textTokens: addTokenCounts(
        (_g = usage1.outputTokenDetails) == null ? void 0 : _g.textTokens,
        (_h = usage2.outputTokenDetails) == null ? void 0 : _h.textTokens
      ),
      reasoningTokens: addTokenCounts(
        (_i = usage1.outputTokenDetails) == null ? void 0 : _i.reasoningTokens,
        (_j = usage2.outputTokenDetails) == null ? void 0 : _j.reasoningTokens
      )
    },
    totalTokens: addTokenCounts(usage1.totalTokens, usage2.totalTokens),
    reasoningTokens: addTokenCounts(
      usage1.reasoningTokens,
      usage2.reasoningTokens
    ),
    cachedInputTokens: addTokenCounts(
      usage1.cachedInputTokens,
      usage2.cachedInputTokens
    )
  };
}
function addTokenCounts(tokenCount1, tokenCount2) {
  return tokenCount1 == null && tokenCount2 == null ? void 0 : (tokenCount1 != null ? tokenCount1 : 0) + (tokenCount2 != null ? tokenCount2 : 0);
}
function mergeObjects(base, overrides) {
  if (base === void 0 && overrides === void 0) {
    return void 0;
  }
  if (base === void 0) {
    return overrides;
  }
  if (overrides === void 0) {
    return base;
  }
  const result = { ...base };
  for (const key in overrides) {
    if (Object.prototype.hasOwnProperty.call(overrides, key)) {
      const overridesValue = overrides[key];
      if (overridesValue === void 0)
        continue;
      const baseValue = key in base ? base[key] : void 0;
      const isSourceObject = overridesValue !== null && typeof overridesValue === "object" && !Array.isArray(overridesValue) && !(overridesValue instanceof Date) && !(overridesValue instanceof RegExp);
      const isTargetObject = baseValue !== null && baseValue !== void 0 && typeof baseValue === "object" && !Array.isArray(baseValue) && !(baseValue instanceof Date) && !(baseValue instanceof RegExp);
      if (isSourceObject && isTargetObject) {
        result[key] = mergeObjects(
          baseValue,
          overridesValue
        );
      } else {
        result[key] = overridesValue;
      }
    }
  }
  return result;
}
function getRetryDelayInMs({
  error,
  exponentialBackoffDelay
}) {
  const headers = error.responseHeaders;
  if (!headers)
    return exponentialBackoffDelay;
  let ms;
  const retryAfterMs = headers["retry-after-ms"];
  if (retryAfterMs) {
    const timeoutMs = parseFloat(retryAfterMs);
    if (!Number.isNaN(timeoutMs)) {
      ms = timeoutMs;
    }
  }
  const retryAfter = headers["retry-after"];
  if (retryAfter && ms === void 0) {
    const timeoutSeconds = parseFloat(retryAfter);
    if (!Number.isNaN(timeoutSeconds)) {
      ms = timeoutSeconds * 1e3;
    } else {
      ms = Date.parse(retryAfter) - Date.now();
    }
  }
  if (ms != null && !Number.isNaN(ms) && 0 <= ms && (ms < 60 * 1e3 || ms < exponentialBackoffDelay)) {
    return ms;
  }
  return exponentialBackoffDelay;
}
var retryWithExponentialBackoffRespectingRetryHeaders = ({
  maxRetries = 2,
  initialDelayInMs = 2e3,
  backoffFactor = 2,
  abortSignal
} = {}) => async (f) => _retryWithExponentialBackoff$1(f, {
  maxRetries,
  delayInMs: initialDelayInMs,
  backoffFactor,
  abortSignal
});
async function _retryWithExponentialBackoff$1(f, {
  maxRetries,
  delayInMs,
  backoffFactor,
  abortSignal
}, errors = []) {
  try {
    return await f();
  } catch (error) {
    if (isAbortError$1(error)) {
      throw error;
    }
    if (maxRetries === 0) {
      throw error;
    }
    const errorMessage = getErrorMessage2$1(error);
    const newErrors = [...errors, error];
    const tryNumber = newErrors.length;
    if (tryNumber > maxRetries) {
      throw new RetryError$1({
        message: `Failed after ${tryNumber} attempts. Last error: ${errorMessage}`,
        reason: "maxRetriesExceeded",
        errors: newErrors
      });
    }
    if (error instanceof Error && APICallError$1.isInstance(error) && error.isRetryable === true && tryNumber <= maxRetries) {
      await delay$1(
        getRetryDelayInMs({
          error,
          exponentialBackoffDelay: delayInMs
        }),
        { abortSignal }
      );
      return _retryWithExponentialBackoff$1(
        f,
        {
          maxRetries,
          delayInMs: backoffFactor * delayInMs,
          backoffFactor,
          abortSignal
        },
        newErrors
      );
    }
    if (tryNumber === 1) {
      throw error;
    }
    throw new RetryError$1({
      message: `Failed after ${tryNumber} attempts with non-retryable error: '${errorMessage}'`,
      reason: "errorNotRetryable",
      errors: newErrors
    });
  }
}
function prepareRetries$1({
  maxRetries,
  abortSignal
}) {
  if (maxRetries != null) {
    if (!Number.isInteger(maxRetries)) {
      throw new InvalidArgumentError2$1({
        parameter: "maxRetries",
        value: maxRetries,
        message: "maxRetries must be an integer"
      });
    }
    if (maxRetries < 0) {
      throw new InvalidArgumentError2$1({
        parameter: "maxRetries",
        value: maxRetries,
        message: "maxRetries must be >= 0"
      });
    }
  }
  const maxRetriesResult = maxRetries != null ? maxRetries : 2;
  return {
    maxRetries: maxRetriesResult,
    retry: retryWithExponentialBackoffRespectingRetryHeaders({
      maxRetries: maxRetriesResult,
      abortSignal
    })
  };
}
function collectToolApprovals({
  messages
}) {
  const lastMessage = messages.at(-1);
  if ((lastMessage == null ? void 0 : lastMessage.role) != "tool") {
    return {
      approvedToolApprovals: [],
      deniedToolApprovals: []
    };
  }
  const toolCallsByToolCallId = {};
  for (const message of messages) {
    if (message.role === "assistant" && typeof message.content !== "string") {
      const content = message.content;
      for (const part of content) {
        if (part.type === "tool-call") {
          toolCallsByToolCallId[part.toolCallId] = part;
        }
      }
    }
  }
  const toolApprovalRequestsByApprovalId = {};
  for (const message of messages) {
    if (message.role === "assistant" && typeof message.content !== "string") {
      const content = message.content;
      for (const part of content) {
        if (part.type === "tool-approval-request") {
          toolApprovalRequestsByApprovalId[part.approvalId] = part;
        }
      }
    }
  }
  const toolResults = {};
  for (const part of lastMessage.content) {
    if (part.type === "tool-result") {
      toolResults[part.toolCallId] = part;
    }
  }
  const approvedToolApprovals = [];
  const deniedToolApprovals = [];
  const approvalResponses = lastMessage.content.filter(
    (part) => part.type === "tool-approval-response"
  );
  for (const approvalResponse of approvalResponses) {
    const approvalRequest = toolApprovalRequestsByApprovalId[approvalResponse.approvalId];
    if (approvalRequest == null) {
      throw new InvalidToolApprovalError({
        approvalId: approvalResponse.approvalId
      });
    }
    if (toolResults[approvalRequest.toolCallId] != null) {
      continue;
    }
    const toolCall = toolCallsByToolCallId[approvalRequest.toolCallId];
    if (toolCall == null) {
      throw new ToolCallNotFoundForApprovalError({
        toolCallId: approvalRequest.toolCallId,
        approvalId: approvalRequest.approvalId
      });
    }
    const approval = {
      approvalRequest,
      approvalResponse,
      toolCall
    };
    if (approvalResponse.approved) {
      approvedToolApprovals.push(approval);
    } else {
      deniedToolApprovals.push(approval);
    }
  }
  return { approvedToolApprovals, deniedToolApprovals };
}
function now$1() {
  var _a21, _b92;
  return (_b92 = (_a21 = globalThis == null ? void 0 : globalThis.performance) == null ? void 0 : _a21.now()) != null ? _b92 : Date.now();
}
async function executeToolCall({
  toolCall,
  tools,
  tracer,
  telemetry,
  messages,
  abortSignal,
  experimental_context,
  stepNumber,
  model,
  onPreliminaryToolResult,
  onToolCallStart,
  onToolCallFinish
}) {
  const { toolName, toolCallId, input } = toolCall;
  const tool2 = tools == null ? void 0 : tools[toolName];
  if ((tool2 == null ? void 0 : tool2.execute) == null) {
    return void 0;
  }
  const baseCallbackEvent = {
    stepNumber,
    model,
    toolCall,
    messages,
    abortSignal,
    functionId: telemetry == null ? void 0 : telemetry.functionId,
    metadata: telemetry == null ? void 0 : telemetry.metadata,
    experimental_context
  };
  return recordSpan$1({
    name: "ai.toolCall",
    attributes: selectTelemetryAttributes$1({
      telemetry,
      attributes: {
        ...assembleOperationName$1({
          operationId: "ai.toolCall",
          telemetry
        }),
        "ai.toolCall.name": toolName,
        "ai.toolCall.id": toolCallId,
        "ai.toolCall.args": {
          output: () => JSON.stringify(input)
        }
      }
    }),
    tracer,
    fn: async (span) => {
      let output;
      await notify({ event: baseCallbackEvent, callbacks: onToolCallStart });
      const startTime = now$1();
      try {
        const stream = executeTool({
          execute: tool2.execute.bind(tool2),
          input,
          options: {
            toolCallId,
            messages,
            abortSignal,
            experimental_context
          }
        });
        for await (const part of stream) {
          if (part.type === "preliminary") {
            onPreliminaryToolResult == null ? void 0 : onPreliminaryToolResult({
              ...toolCall,
              type: "tool-result",
              output: part.output,
              preliminary: true
            });
          } else {
            output = part.output;
          }
        }
      } catch (error) {
        const durationMs2 = now$1() - startTime;
        await notify({
          event: {
            ...baseCallbackEvent,
            success: false,
            error,
            durationMs: durationMs2
          },
          callbacks: onToolCallFinish
        });
        recordErrorOnSpan$1(span, error);
        return {
          type: "tool-error",
          toolCallId,
          toolName,
          input,
          error,
          dynamic: tool2.type === "dynamic",
          ...toolCall.providerMetadata != null ? { providerMetadata: toolCall.providerMetadata } : {}
        };
      }
      const durationMs = now$1() - startTime;
      await notify({
        event: {
          ...baseCallbackEvent,
          success: true,
          output,
          durationMs
        },
        callbacks: onToolCallFinish
      });
      try {
        span.setAttributes(
          await selectTelemetryAttributes$1({
            telemetry,
            attributes: {
              "ai.toolCall.result": {
                output: () => JSON.stringify(output)
              }
            }
          })
        );
      } catch (ignored) {
      }
      return {
        type: "tool-result",
        toolCallId,
        toolName,
        input,
        output,
        dynamic: tool2.type === "dynamic",
        ...toolCall.providerMetadata != null ? { providerMetadata: toolCall.providerMetadata } : {}
      };
    }
  });
}
function extractReasoningContent(content) {
  const parts = content.filter(
    (content2) => content2.type === "reasoning"
  );
  return parts.length === 0 ? void 0 : parts.map((content2) => content2.text).join("\n");
}
function extractTextContent(content) {
  const parts = content.filter(
    (content2) => content2.type === "text"
  );
  if (parts.length === 0) {
    return void 0;
  }
  return parts.map((content2) => content2.text).join("");
}
var DefaultGeneratedFile$1 = class DefaultGeneratedFile {
  constructor({
    data,
    mediaType
  }) {
    const isUint8Array = data instanceof Uint8Array;
    this.base64Data = isUint8Array ? void 0 : data;
    this.uint8ArrayData = isUint8Array ? data : void 0;
    this.mediaType = mediaType;
  }
  // lazy conversion with caching to avoid unnecessary conversion overhead:
  get base64() {
    if (this.base64Data == null) {
      this.base64Data = convertUint8ArrayToBase64$1(this.uint8ArrayData);
    }
    return this.base64Data;
  }
  // lazy conversion with caching to avoid unnecessary conversion overhead:
  get uint8Array() {
    if (this.uint8ArrayData == null) {
      this.uint8ArrayData = convertBase64ToUint8Array$1(this.base64Data);
    }
    return this.uint8ArrayData;
  }
};
var DefaultGeneratedFileWithType$1 = class DefaultGeneratedFileWithType extends DefaultGeneratedFile$1 {
  constructor(options) {
    super(options);
    this.type = "file";
  }
};
async function isApprovalNeeded({
  tool: tool2,
  toolCall,
  messages,
  experimental_context
}) {
  if (tool2.needsApproval == null) {
    return false;
  }
  if (typeof tool2.needsApproval === "boolean") {
    return tool2.needsApproval;
  }
  return await tool2.needsApproval(toolCall.input, {
    toolCallId: toolCall.toolCallId,
    messages,
    experimental_context
  });
}
var output_exports$1 = {};
__export$1(output_exports$1, {
  array: () => array,
  choice: () => choice,
  json: () => json,
  object: () => object$1,
  text: () => text$1
});
function fixJson$1(input) {
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
async function parsePartialJson$1(jsonText) {
  if (jsonText === void 0) {
    return { value: void 0, state: "undefined-input" };
  }
  let result = await safeParseJSON$1({ text: jsonText });
  if (result.success) {
    return { value: result.value, state: "successful-parse" };
  }
  result = await safeParseJSON$1({ text: fixJson$1(jsonText) });
  if (result.success) {
    return { value: result.value, state: "repaired-parse" };
  }
  return { value: void 0, state: "failed-parse" };
}
var text$1 = () => ({
  name: "text",
  responseFormat: Promise.resolve({ type: "text" }),
  async parseCompleteOutput({ text: text2 }) {
    return text2;
  },
  async parsePartialOutput({ text: text2 }) {
    return { partial: text2 };
  },
  createElementStreamTransform() {
    return void 0;
  }
});
var object$1 = ({
  schema: inputSchema,
  name: name21,
  description
}) => {
  const schema = asSchema$1(inputSchema);
  return {
    name: "object",
    responseFormat: resolve(schema.jsonSchema).then((jsonSchema2) => ({
      type: "json",
      schema: jsonSchema2,
      ...name21 != null && { name: name21 },
      ...description != null && { description }
    })),
    async parseCompleteOutput({ text: text2 }, context2) {
      const parseResult = await safeParseJSON$1({ text: text2 });
      if (!parseResult.success) {
        throw new NoObjectGeneratedError$1({
          message: "No object generated: could not parse the response.",
          cause: parseResult.error,
          text: text2,
          response: context2.response,
          usage: context2.usage,
          finishReason: context2.finishReason
        });
      }
      const validationResult = await safeValidateTypes$1({
        value: parseResult.value,
        schema
      });
      if (!validationResult.success) {
        throw new NoObjectGeneratedError$1({
          message: "No object generated: response did not match schema.",
          cause: validationResult.error,
          text: text2,
          response: context2.response,
          usage: context2.usage,
          finishReason: context2.finishReason
        });
      }
      return validationResult.value;
    },
    async parsePartialOutput({ text: text2 }) {
      const result = await parsePartialJson$1(text2);
      switch (result.state) {
        case "failed-parse":
        case "undefined-input": {
          return void 0;
        }
        case "repaired-parse":
        case "successful-parse": {
          return {
            // Note: currently no validation of partial results:
            partial: result.value
          };
        }
      }
    },
    createElementStreamTransform() {
      return void 0;
    }
  };
};
var array = ({
  element: inputElementSchema,
  name: name21,
  description
}) => {
  const elementSchema = asSchema$1(inputElementSchema);
  return {
    name: "array",
    // JSON schema that describes an array of elements:
    responseFormat: resolve(elementSchema.jsonSchema).then((jsonSchema2) => {
      const { $schema, ...itemSchema } = jsonSchema2;
      return {
        type: "json",
        schema: {
          $schema: "http://json-schema.org/draft-07/schema#",
          type: "object",
          properties: {
            elements: { type: "array", items: itemSchema }
          },
          required: ["elements"],
          additionalProperties: false
        },
        ...name21 != null && { name: name21 },
        ...description != null && { description }
      };
    }),
    async parseCompleteOutput({ text: text2 }, context2) {
      const parseResult = await safeParseJSON$1({ text: text2 });
      if (!parseResult.success) {
        throw new NoObjectGeneratedError$1({
          message: "No object generated: could not parse the response.",
          cause: parseResult.error,
          text: text2,
          response: context2.response,
          usage: context2.usage,
          finishReason: context2.finishReason
        });
      }
      const outerValue = parseResult.value;
      if (outerValue == null || typeof outerValue !== "object" || !("elements" in outerValue) || !Array.isArray(outerValue.elements)) {
        throw new NoObjectGeneratedError$1({
          message: "No object generated: response did not match schema.",
          cause: new TypeValidationError$1({
            value: outerValue,
            cause: "response must be an object with an elements array"
          }),
          text: text2,
          response: context2.response,
          usage: context2.usage,
          finishReason: context2.finishReason
        });
      }
      for (const element of outerValue.elements) {
        const validationResult = await safeValidateTypes$1({
          value: element,
          schema: elementSchema
        });
        if (!validationResult.success) {
          throw new NoObjectGeneratedError$1({
            message: "No object generated: response did not match schema.",
            cause: validationResult.error,
            text: text2,
            response: context2.response,
            usage: context2.usage,
            finishReason: context2.finishReason
          });
        }
      }
      return outerValue.elements;
    },
    async parsePartialOutput({ text: text2 }) {
      const result = await parsePartialJson$1(text2);
      switch (result.state) {
        case "failed-parse":
        case "undefined-input": {
          return void 0;
        }
        case "repaired-parse":
        case "successful-parse": {
          const outerValue = result.value;
          if (outerValue == null || typeof outerValue !== "object" || !("elements" in outerValue) || !Array.isArray(outerValue.elements)) {
            return void 0;
          }
          const rawElements = result.state === "repaired-parse" && outerValue.elements.length > 0 ? outerValue.elements.slice(0, -1) : outerValue.elements;
          const parsedElements = [];
          for (const rawElement of rawElements) {
            const validationResult = await safeValidateTypes$1({
              value: rawElement,
              schema: elementSchema
            });
            if (validationResult.success) {
              parsedElements.push(validationResult.value);
            }
          }
          return { partial: parsedElements };
        }
      }
    },
    createElementStreamTransform() {
      let publishedElements = 0;
      return new TransformStream({
        transform({ partialOutput }, controller) {
          if (partialOutput != null) {
            for (; publishedElements < partialOutput.length; publishedElements++) {
              controller.enqueue(partialOutput[publishedElements]);
            }
          }
        }
      });
    }
  };
};
var choice = ({
  options: choiceOptions,
  name: name21,
  description
}) => {
  return {
    name: "choice",
    // JSON schema that describes an enumeration:
    responseFormat: Promise.resolve({
      type: "json",
      schema: {
        $schema: "http://json-schema.org/draft-07/schema#",
        type: "object",
        properties: {
          result: { type: "string", enum: choiceOptions }
        },
        required: ["result"],
        additionalProperties: false
      },
      ...name21 != null && { name: name21 },
      ...description != null && { description }
    }),
    async parseCompleteOutput({ text: text2 }, context2) {
      const parseResult = await safeParseJSON$1({ text: text2 });
      if (!parseResult.success) {
        throw new NoObjectGeneratedError$1({
          message: "No object generated: could not parse the response.",
          cause: parseResult.error,
          text: text2,
          response: context2.response,
          usage: context2.usage,
          finishReason: context2.finishReason
        });
      }
      const outerValue = parseResult.value;
      if (outerValue == null || typeof outerValue !== "object" || !("result" in outerValue) || typeof outerValue.result !== "string" || !choiceOptions.includes(outerValue.result)) {
        throw new NoObjectGeneratedError$1({
          message: "No object generated: response did not match schema.",
          cause: new TypeValidationError$1({
            value: outerValue,
            cause: "response must be an object that contains a choice value."
          }),
          text: text2,
          response: context2.response,
          usage: context2.usage,
          finishReason: context2.finishReason
        });
      }
      return outerValue.result;
    },
    async parsePartialOutput({ text: text2 }) {
      const result = await parsePartialJson$1(text2);
      switch (result.state) {
        case "failed-parse":
        case "undefined-input": {
          return void 0;
        }
        case "repaired-parse":
        case "successful-parse": {
          const outerValue = result.value;
          if (outerValue == null || typeof outerValue !== "object" || !("result" in outerValue) || typeof outerValue.result !== "string") {
            return void 0;
          }
          const potentialMatches = choiceOptions.filter(
            (choiceOption) => choiceOption.startsWith(outerValue.result)
          );
          if (result.state === "successful-parse") {
            return potentialMatches.includes(outerValue.result) ? { partial: outerValue.result } : void 0;
          } else {
            return potentialMatches.length === 1 ? { partial: potentialMatches[0] } : void 0;
          }
        }
      }
    },
    createElementStreamTransform() {
      return void 0;
    }
  };
};
var json = ({
  name: name21,
  description
} = {}) => {
  return {
    name: "json",
    responseFormat: Promise.resolve({
      type: "json",
      ...name21 != null && { name: name21 },
      ...description != null && { description }
    }),
    async parseCompleteOutput({ text: text2 }, context2) {
      const parseResult = await safeParseJSON$1({ text: text2 });
      if (!parseResult.success) {
        throw new NoObjectGeneratedError$1({
          message: "No object generated: could not parse the response.",
          cause: parseResult.error,
          text: text2,
          response: context2.response,
          usage: context2.usage,
          finishReason: context2.finishReason
        });
      }
      return parseResult.value;
    },
    async parsePartialOutput({ text: text2 }) {
      const result = await parsePartialJson$1(text2);
      switch (result.state) {
        case "failed-parse":
        case "undefined-input": {
          return void 0;
        }
        case "repaired-parse":
        case "successful-parse": {
          return result.value === void 0 ? void 0 : { partial: result.value };
        }
      }
    },
    createElementStreamTransform() {
      return void 0;
    }
  };
};
async function parseToolCall$1({
  toolCall,
  tools,
  repairToolCall,
  system,
  messages
}) {
  var _a21;
  try {
    if (tools == null) {
      if (toolCall.providerExecuted && toolCall.dynamic) {
        return await parseProviderExecutedDynamicToolCall(toolCall);
      }
      throw new NoSuchToolError$1({ toolName: toolCall.toolName });
    }
    try {
      return await doParseToolCall$1({ toolCall, tools });
    } catch (error) {
      if (repairToolCall == null || !(NoSuchToolError$1.isInstance(error) || InvalidToolInputError.isInstance(error))) {
        throw error;
      }
      let repairedToolCall = null;
      try {
        repairedToolCall = await repairToolCall({
          toolCall,
          tools,
          inputSchema: async ({ toolName }) => {
            const { inputSchema } = tools[toolName];
            return await asSchema$1(inputSchema).jsonSchema;
          },
          system,
          messages,
          error
        });
      } catch (repairError) {
        throw new ToolCallRepairError$1({
          cause: repairError,
          originalError: error
        });
      }
      if (repairedToolCall == null) {
        throw error;
      }
      return await doParseToolCall$1({ toolCall: repairedToolCall, tools });
    }
  } catch (error) {
    const parsedInput = await safeParseJSON$1({ text: toolCall.input });
    const input = parsedInput.success ? parsedInput.value : toolCall.input;
    return {
      type: "tool-call",
      toolCallId: toolCall.toolCallId,
      toolName: toolCall.toolName,
      input,
      dynamic: true,
      invalid: true,
      error,
      title: (_a21 = tools == null ? void 0 : tools[toolCall.toolName]) == null ? void 0 : _a21.title,
      providerExecuted: toolCall.providerExecuted,
      providerMetadata: toolCall.providerMetadata
    };
  }
}
async function parseProviderExecutedDynamicToolCall(toolCall) {
  const parseResult = toolCall.input.trim() === "" ? { success: true, value: {} } : await safeParseJSON$1({ text: toolCall.input });
  if (parseResult.success === false) {
    throw new InvalidToolInputError({
      toolName: toolCall.toolName,
      toolInput: toolCall.input,
      cause: parseResult.error
    });
  }
  return {
    type: "tool-call",
    toolCallId: toolCall.toolCallId,
    toolName: toolCall.toolName,
    input: parseResult.value,
    providerExecuted: true,
    dynamic: true,
    providerMetadata: toolCall.providerMetadata
  };
}
async function doParseToolCall$1({
  toolCall,
  tools
}) {
  const toolName = toolCall.toolName;
  const tool2 = tools[toolName];
  if (tool2 == null) {
    if (toolCall.providerExecuted && toolCall.dynamic) {
      return await parseProviderExecutedDynamicToolCall(toolCall);
    }
    throw new NoSuchToolError$1({
      toolName: toolCall.toolName,
      availableTools: Object.keys(tools)
    });
  }
  const schema = asSchema$1(tool2.inputSchema);
  const parseResult = toolCall.input.trim() === "" ? await safeValidateTypes$1({ value: {}, schema }) : await safeParseJSON$1({ text: toolCall.input, schema });
  if (parseResult.success === false) {
    throw new InvalidToolInputError({
      toolName,
      toolInput: toolCall.input,
      cause: parseResult.error
    });
  }
  return tool2.type === "dynamic" ? {
    type: "tool-call",
    toolCallId: toolCall.toolCallId,
    toolName: toolCall.toolName,
    input: parseResult.value,
    providerExecuted: toolCall.providerExecuted,
    providerMetadata: toolCall.providerMetadata,
    dynamic: true,
    title: tool2.title
  } : {
    type: "tool-call",
    toolCallId: toolCall.toolCallId,
    toolName,
    input: parseResult.value,
    providerExecuted: toolCall.providerExecuted,
    providerMetadata: toolCall.providerMetadata,
    title: tool2.title
  };
}
var DefaultStepResult = class {
  constructor({
    stepNumber,
    model,
    functionId,
    metadata,
    experimental_context,
    content,
    finishReason,
    rawFinishReason,
    usage,
    warnings,
    request,
    response,
    providerMetadata
  }) {
    this.stepNumber = stepNumber;
    this.model = model;
    this.functionId = functionId;
    this.metadata = metadata;
    this.experimental_context = experimental_context;
    this.content = content;
    this.finishReason = finishReason;
    this.rawFinishReason = rawFinishReason;
    this.usage = usage;
    this.warnings = warnings;
    this.request = request;
    this.response = response;
    this.providerMetadata = providerMetadata;
  }
  get text() {
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
    return this.toolCalls.filter(
      (toolCall) => toolCall.dynamic !== true
    );
  }
  get dynamicToolCalls() {
    return this.toolCalls.filter(
      (toolCall) => toolCall.dynamic === true
    );
  }
  get toolResults() {
    return this.content.filter((part) => part.type === "tool-result");
  }
  get staticToolResults() {
    return this.toolResults.filter(
      (toolResult) => toolResult.dynamic !== true
    );
  }
  get dynamicToolResults() {
    return this.toolResults.filter(
      (toolResult) => toolResult.dynamic === true
    );
  }
};
function stepCountIs(stepCount) {
  return ({ steps }) => steps.length === stepCount;
}
async function isStopConditionMet({
  stopConditions,
  steps
}) {
  return (await Promise.all(stopConditions.map((condition) => condition({ steps })))).some((result) => result);
}
async function toResponseMessages$1({
  content: inputContent,
  tools
}) {
  const responseMessages = [];
  const content = [];
  for (const part of inputContent) {
    if (part.type === "source") {
      continue;
    }
    if ((part.type === "tool-result" || part.type === "tool-error") && !part.providerExecuted) {
      continue;
    }
    if (part.type === "text" && part.text.length === 0) {
      continue;
    }
    switch (part.type) {
      case "text":
        content.push({
          type: "text",
          text: part.text,
          providerOptions: part.providerMetadata
        });
        break;
      case "reasoning":
        content.push({
          type: "reasoning",
          text: part.text,
          providerOptions: part.providerMetadata
        });
        break;
      case "file":
        content.push({
          type: "file",
          data: part.file.base64,
          mediaType: part.file.mediaType,
          providerOptions: part.providerMetadata
        });
        break;
      case "tool-call":
        content.push({
          type: "tool-call",
          toolCallId: part.toolCallId,
          toolName: part.toolName,
          input: part.input,
          providerExecuted: part.providerExecuted,
          providerOptions: part.providerMetadata
        });
        break;
      case "tool-result": {
        const output = await createToolModelOutput({
          toolCallId: part.toolCallId,
          input: part.input,
          tool: tools == null ? void 0 : tools[part.toolName],
          output: part.output,
          errorMode: "none"
        });
        content.push({
          type: "tool-result",
          toolCallId: part.toolCallId,
          toolName: part.toolName,
          output,
          providerOptions: part.providerMetadata
        });
        break;
      }
      case "tool-error": {
        const output = await createToolModelOutput({
          toolCallId: part.toolCallId,
          input: part.input,
          tool: tools == null ? void 0 : tools[part.toolName],
          output: part.error,
          errorMode: "json"
        });
        content.push({
          type: "tool-result",
          toolCallId: part.toolCallId,
          toolName: part.toolName,
          output,
          providerOptions: part.providerMetadata
        });
        break;
      }
      case "tool-approval-request":
        content.push({
          type: "tool-approval-request",
          approvalId: part.approvalId,
          toolCallId: part.toolCall.toolCallId
        });
        break;
    }
  }
  if (content.length > 0) {
    responseMessages.push({
      role: "assistant",
      content
    });
  }
  const toolResultContent = [];
  for (const part of inputContent) {
    if (!(part.type === "tool-result" || part.type === "tool-error") || part.providerExecuted) {
      continue;
    }
    const output = await createToolModelOutput({
      toolCallId: part.toolCallId,
      input: part.input,
      tool: tools == null ? void 0 : tools[part.toolName],
      output: part.type === "tool-result" ? part.output : part.error,
      errorMode: part.type === "tool-error" ? "text" : "none"
    });
    toolResultContent.push({
      type: "tool-result",
      toolCallId: part.toolCallId,
      toolName: part.toolName,
      output,
      ...part.providerMetadata != null ? { providerOptions: part.providerMetadata } : {}
    });
  }
  if (toolResultContent.length > 0) {
    responseMessages.push({
      role: "tool",
      content: toolResultContent
    });
  }
  return responseMessages;
}
function mergeAbortSignals(...signals) {
  const validSignals = signals.filter(
    (signal) => signal != null
  );
  if (validSignals.length === 0) {
    return void 0;
  }
  if (validSignals.length === 1) {
    return validSignals[0];
  }
  const controller = new AbortController();
  for (const signal of validSignals) {
    if (signal.aborted) {
      controller.abort(signal.reason);
      return controller.signal;
    }
    signal.addEventListener(
      "abort",
      () => {
        controller.abort(signal.reason);
      },
      { once: true }
    );
  }
  return controller.signal;
}
var originalGenerateId$1 = createIdGenerator$1({
  prefix: "aitxt",
  size: 24
});
async function generateText$1({
  model: modelArg,
  tools,
  toolChoice,
  system,
  prompt,
  messages,
  maxRetries: maxRetriesArg,
  abortSignal,
  timeout,
  headers,
  stopWhen = stepCountIs(1),
  experimental_output,
  output = experimental_output,
  experimental_telemetry: telemetry,
  providerOptions,
  experimental_activeTools,
  activeTools = experimental_activeTools,
  experimental_prepareStep,
  prepareStep = experimental_prepareStep,
  experimental_repairToolCall: repairToolCall,
  experimental_download: download2,
  experimental_context,
  experimental_include: include,
  _internal: { generateId: generateId2 = originalGenerateId$1 } = {},
  experimental_onStart: onStart,
  experimental_onStepStart: onStepStart,
  experimental_onToolCallStart: onToolCallStart,
  experimental_onToolCallFinish: onToolCallFinish,
  onStepFinish,
  onFinish,
  ...settings
}) {
  const model = resolveLanguageModel(modelArg);
  const createGlobalTelemetry = getGlobalTelemetryIntegration();
  const stopConditions = asArray$1(stopWhen);
  const totalTimeoutMs = getTotalTimeoutMs(timeout);
  const stepTimeoutMs = getStepTimeoutMs(timeout);
  const stepAbortController = stepTimeoutMs != null ? new AbortController() : void 0;
  const mergedAbortSignal = mergeAbortSignals(
    abortSignal,
    totalTimeoutMs != null ? AbortSignal.timeout(totalTimeoutMs) : void 0,
    stepAbortController == null ? void 0 : stepAbortController.signal
  );
  const { maxRetries, retry } = prepareRetries$1({
    maxRetries: maxRetriesArg,
    abortSignal: mergedAbortSignal
  });
  const callSettings = prepareCallSettings$1(settings);
  const headersWithUserAgent = withUserAgentSuffix(
    headers != null ? headers : {},
    `ai/${VERSION3}`
  );
  const baseTelemetryAttributes = getBaseTelemetryAttributes$1({
    model,
    telemetry,
    headers: headersWithUserAgent,
    settings: { ...callSettings, maxRetries }
  });
  const modelInfo = { provider: model.provider, modelId: model.modelId };
  const initialPrompt = await standardizePrompt$1({
    system,
    prompt,
    messages
  });
  const globalTelemetry = createGlobalTelemetry(telemetry == null ? void 0 : telemetry.integrations);
  await notify({
    event: {
      model: modelInfo,
      system,
      prompt,
      messages,
      tools,
      toolChoice,
      activeTools,
      maxOutputTokens: callSettings.maxOutputTokens,
      temperature: callSettings.temperature,
      topP: callSettings.topP,
      topK: callSettings.topK,
      presencePenalty: callSettings.presencePenalty,
      frequencyPenalty: callSettings.frequencyPenalty,
      stopSequences: callSettings.stopSequences,
      seed: callSettings.seed,
      maxRetries,
      timeout,
      headers,
      providerOptions,
      stopWhen,
      output,
      abortSignal,
      include,
      functionId: telemetry == null ? void 0 : telemetry.functionId,
      metadata: telemetry == null ? void 0 : telemetry.metadata,
      experimental_context
    },
    callbacks: [
      onStart,
      globalTelemetry.onStart
    ]
  });
  const tracer = getTracer$1(telemetry);
  try {
    return await recordSpan$1({
      name: "ai.generateText",
      attributes: selectTelemetryAttributes$1({
        telemetry,
        attributes: {
          ...assembleOperationName$1({
            operationId: "ai.generateText",
            telemetry
          }),
          ...baseTelemetryAttributes,
          // model:
          "ai.model.provider": model.provider,
          "ai.model.id": model.modelId,
          // specific settings that only make sense on the outer level:
          "ai.prompt": {
            input: () => JSON.stringify({ system, prompt, messages })
          }
        }
      }),
      tracer,
      fn: async (span) => {
        var _a21, _b92, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m;
        const initialMessages = initialPrompt.messages;
        const responseMessages = [];
        const { approvedToolApprovals, deniedToolApprovals } = collectToolApprovals({ messages: initialMessages });
        const localApprovedToolApprovals = approvedToolApprovals.filter(
          (toolApproval) => !toolApproval.toolCall.providerExecuted
        );
        if (deniedToolApprovals.length > 0 || localApprovedToolApprovals.length > 0) {
          const toolOutputs = await executeTools$1({
            toolCalls: localApprovedToolApprovals.map(
              (toolApproval) => toolApproval.toolCall
            ),
            tools,
            tracer,
            telemetry,
            messages: initialMessages,
            abortSignal: mergedAbortSignal,
            experimental_context,
            stepNumber: 0,
            model: modelInfo,
            onToolCallStart: [
              onToolCallStart,
              globalTelemetry.onToolCallStart
            ],
            onToolCallFinish: [
              onToolCallFinish,
              globalTelemetry.onToolCallFinish
            ]
          });
          const toolContent = [];
          for (const output2 of toolOutputs) {
            const modelOutput = await createToolModelOutput({
              toolCallId: output2.toolCallId,
              input: output2.input,
              tool: tools == null ? void 0 : tools[output2.toolName],
              output: output2.type === "tool-result" ? output2.output : output2.error,
              errorMode: output2.type === "tool-error" ? "text" : "none"
            });
            toolContent.push({
              type: "tool-result",
              toolCallId: output2.toolCallId,
              toolName: output2.toolName,
              output: modelOutput
            });
          }
          for (const toolApproval of deniedToolApprovals) {
            toolContent.push({
              type: "tool-result",
              toolCallId: toolApproval.toolCall.toolCallId,
              toolName: toolApproval.toolCall.toolName,
              output: {
                type: "execution-denied",
                reason: toolApproval.approvalResponse.reason,
                // For provider-executed tools, include approvalId so provider can correlate
                ...toolApproval.toolCall.providerExecuted && {
                  providerOptions: {
                    openai: {
                      approvalId: toolApproval.approvalResponse.approvalId
                    }
                  }
                }
              }
            });
          }
          responseMessages.push({
            role: "tool",
            content: toolContent
          });
        }
        const providerExecutedToolApprovals = [
          ...approvedToolApprovals,
          ...deniedToolApprovals
        ].filter((toolApproval) => toolApproval.toolCall.providerExecuted);
        if (providerExecutedToolApprovals.length > 0) {
          responseMessages.push({
            role: "tool",
            content: providerExecutedToolApprovals.map(
              (toolApproval) => ({
                type: "tool-approval-response",
                approvalId: toolApproval.approvalResponse.approvalId,
                approved: toolApproval.approvalResponse.approved,
                reason: toolApproval.approvalResponse.reason,
                providerExecuted: true
              })
            )
          });
        }
        const callSettings2 = prepareCallSettings$1(settings);
        let currentModelResponse;
        let clientToolCalls = [];
        let clientToolOutputs = [];
        const steps = [];
        const pendingDeferredToolCalls = /* @__PURE__ */ new Map();
        do {
          const stepTimeoutId = stepTimeoutMs != null ? setTimeout(() => stepAbortController.abort(), stepTimeoutMs) : void 0;
          try {
            const stepInputMessages = [...initialMessages, ...responseMessages];
            const prepareStepResult = await (prepareStep == null ? void 0 : prepareStep({
              model,
              steps,
              stepNumber: steps.length,
              messages: stepInputMessages,
              experimental_context
            }));
            const stepModel = resolveLanguageModel(
              (_a21 = prepareStepResult == null ? void 0 : prepareStepResult.model) != null ? _a21 : model
            );
            const stepModelInfo = {
              provider: stepModel.provider,
              modelId: stepModel.modelId
            };
            const promptMessages = await convertToLanguageModelPrompt$1({
              prompt: {
                system: (_b92 = prepareStepResult == null ? void 0 : prepareStepResult.system) != null ? _b92 : initialPrompt.system,
                messages: (_c = prepareStepResult == null ? void 0 : prepareStepResult.messages) != null ? _c : stepInputMessages
              },
              supportedUrls: await stepModel.supportedUrls,
              download: download2
            });
            experimental_context = (_d = prepareStepResult == null ? void 0 : prepareStepResult.experimental_context) != null ? _d : experimental_context;
            const stepActiveTools = (_e = prepareStepResult == null ? void 0 : prepareStepResult.activeTools) != null ? _e : activeTools;
            const { toolChoice: stepToolChoice, tools: stepTools } = await prepareToolsAndToolChoice$1({
              tools,
              toolChoice: (_f = prepareStepResult == null ? void 0 : prepareStepResult.toolChoice) != null ? _f : toolChoice,
              activeTools: stepActiveTools
            });
            const stepMessages = (_g = prepareStepResult == null ? void 0 : prepareStepResult.messages) != null ? _g : stepInputMessages;
            const stepSystem = (_h = prepareStepResult == null ? void 0 : prepareStepResult.system) != null ? _h : initialPrompt.system;
            const stepProviderOptions = mergeObjects(
              providerOptions,
              prepareStepResult == null ? void 0 : prepareStepResult.providerOptions
            );
            await notify({
              event: {
                stepNumber: steps.length,
                model: stepModelInfo,
                system: stepSystem,
                messages: stepMessages,
                tools,
                toolChoice: stepToolChoice,
                activeTools: stepActiveTools,
                steps: [...steps],
                providerOptions: stepProviderOptions,
                timeout,
                headers,
                stopWhen,
                output,
                abortSignal,
                include,
                functionId: telemetry == null ? void 0 : telemetry.functionId,
                metadata: telemetry == null ? void 0 : telemetry.metadata,
                experimental_context
              },
              callbacks: [
                onStepStart,
                globalTelemetry.onStepStart
              ]
            });
            currentModelResponse = await retry(
              () => {
                var _a2222;
                return recordSpan$1({
                  name: "ai.generateText.doGenerate",
                  attributes: selectTelemetryAttributes$1({
                    telemetry,
                    attributes: {
                      ...assembleOperationName$1({
                        operationId: "ai.generateText.doGenerate",
                        telemetry
                      }),
                      ...baseTelemetryAttributes,
                      // model:
                      "ai.model.provider": stepModel.provider,
                      "ai.model.id": stepModel.modelId,
                      // prompt:
                      "ai.prompt.messages": {
                        input: () => stringifyForTelemetry$1(promptMessages)
                      },
                      "ai.prompt.tools": {
                        // convert the language model level tools:
                        input: () => stepTools == null ? void 0 : stepTools.map((tool2) => JSON.stringify(tool2))
                      },
                      "ai.prompt.toolChoice": {
                        input: () => stepToolChoice != null ? JSON.stringify(stepToolChoice) : void 0
                      },
                      // standardized gen-ai llm span attributes:
                      "gen_ai.system": stepModel.provider,
                      "gen_ai.request.model": stepModel.modelId,
                      "gen_ai.request.frequency_penalty": settings.frequencyPenalty,
                      "gen_ai.request.max_tokens": settings.maxOutputTokens,
                      "gen_ai.request.presence_penalty": settings.presencePenalty,
                      "gen_ai.request.stop_sequences": settings.stopSequences,
                      "gen_ai.request.temperature": (_a2222 = settings.temperature) != null ? _a2222 : void 0,
                      "gen_ai.request.top_k": settings.topK,
                      "gen_ai.request.top_p": settings.topP
                    }
                  }),
                  tracer,
                  fn: async (span2) => {
                    var _a23, _b222, _c2, _d2, _e2, _f2, _g2, _h2;
                    const result = await stepModel.doGenerate({
                      ...callSettings2,
                      tools: stepTools,
                      toolChoice: stepToolChoice,
                      responseFormat: await (output == null ? void 0 : output.responseFormat),
                      prompt: promptMessages,
                      providerOptions: stepProviderOptions,
                      abortSignal: mergedAbortSignal,
                      headers: headersWithUserAgent
                    });
                    const responseData = {
                      id: (_b222 = (_a23 = result.response) == null ? void 0 : _a23.id) != null ? _b222 : generateId2(),
                      timestamp: (_d2 = (_c2 = result.response) == null ? void 0 : _c2.timestamp) != null ? _d2 : /* @__PURE__ */ new Date(),
                      modelId: (_f2 = (_e2 = result.response) == null ? void 0 : _e2.modelId) != null ? _f2 : stepModel.modelId,
                      headers: (_g2 = result.response) == null ? void 0 : _g2.headers,
                      body: (_h2 = result.response) == null ? void 0 : _h2.body
                    };
                    span2.setAttributes(
                      await selectTelemetryAttributes$1({
                        telemetry,
                        attributes: {
                          "ai.response.finishReason": result.finishReason.unified,
                          "ai.response.text": {
                            output: () => extractTextContent(result.content)
                          },
                          "ai.response.reasoning": {
                            output: () => extractReasoningContent(result.content)
                          },
                          "ai.response.toolCalls": {
                            output: () => {
                              const toolCalls = asToolCalls(result.content);
                              return toolCalls == null ? void 0 : JSON.stringify(toolCalls);
                            }
                          },
                          "ai.response.id": responseData.id,
                          "ai.response.model": responseData.modelId,
                          "ai.response.timestamp": responseData.timestamp.toISOString(),
                          "ai.response.providerMetadata": JSON.stringify(
                            result.providerMetadata
                          ),
                          // TODO rename telemetry attributes to inputTokens and outputTokens
                          "ai.usage.promptTokens": result.usage.inputTokens.total,
                          "ai.usage.completionTokens": result.usage.outputTokens.total,
                          // standardized gen-ai llm span attributes:
                          "gen_ai.response.finish_reasons": [
                            result.finishReason.unified
                          ],
                          "gen_ai.response.id": responseData.id,
                          "gen_ai.response.model": responseData.modelId,
                          "gen_ai.usage.input_tokens": result.usage.inputTokens.total,
                          "gen_ai.usage.output_tokens": result.usage.outputTokens.total
                        }
                      })
                    );
                    return { ...result, response: responseData };
                  }
                });
              }
            );
            const stepToolCalls = await Promise.all(
              currentModelResponse.content.filter(
                (part) => part.type === "tool-call"
              ).map(
                (toolCall) => parseToolCall$1({
                  toolCall,
                  tools,
                  repairToolCall,
                  system,
                  messages: stepInputMessages
                })
              )
            );
            const toolApprovalRequests = {};
            for (const toolCall of stepToolCalls) {
              if (toolCall.invalid) {
                continue;
              }
              const tool2 = tools == null ? void 0 : tools[toolCall.toolName];
              if (tool2 == null) {
                continue;
              }
              if ((tool2 == null ? void 0 : tool2.onInputAvailable) != null) {
                await tool2.onInputAvailable({
                  input: toolCall.input,
                  toolCallId: toolCall.toolCallId,
                  messages: stepInputMessages,
                  abortSignal: mergedAbortSignal,
                  experimental_context
                });
              }
              if (await isApprovalNeeded({
                tool: tool2,
                toolCall,
                messages: stepInputMessages,
                experimental_context
              })) {
                toolApprovalRequests[toolCall.toolCallId] = {
                  type: "tool-approval-request",
                  approvalId: generateId2(),
                  toolCall
                };
              }
            }
            const invalidToolCalls = stepToolCalls.filter(
              (toolCall) => toolCall.invalid && toolCall.dynamic
            );
            clientToolOutputs = [];
            for (const toolCall of invalidToolCalls) {
              clientToolOutputs.push({
                type: "tool-error",
                toolCallId: toolCall.toolCallId,
                toolName: toolCall.toolName,
                input: toolCall.input,
                error: getErrorMessage2$1(toolCall.error),
                dynamic: true
              });
            }
            clientToolCalls = stepToolCalls.filter(
              (toolCall) => !toolCall.providerExecuted
            );
            if (tools != null) {
              clientToolOutputs.push(
                ...await executeTools$1({
                  toolCalls: clientToolCalls.filter(
                    (toolCall) => !toolCall.invalid && toolApprovalRequests[toolCall.toolCallId] == null
                  ),
                  tools,
                  tracer,
                  telemetry,
                  messages: stepInputMessages,
                  abortSignal: mergedAbortSignal,
                  experimental_context,
                  stepNumber: steps.length,
                  model: stepModelInfo,
                  onToolCallStart: [
                    onToolCallStart,
                    globalTelemetry.onToolCallStart
                  ],
                  onToolCallFinish: [
                    onToolCallFinish,
                    globalTelemetry.onToolCallFinish
                  ]
                })
              );
            }
            for (const toolCall of stepToolCalls) {
              if (!toolCall.providerExecuted)
                continue;
              const tool2 = tools == null ? void 0 : tools[toolCall.toolName];
              if ((tool2 == null ? void 0 : tool2.type) === "provider" && tool2.supportsDeferredResults) {
                const hasResultInResponse = currentModelResponse.content.some(
                  (part) => part.type === "tool-result" && part.toolCallId === toolCall.toolCallId
                );
                if (!hasResultInResponse) {
                  pendingDeferredToolCalls.set(toolCall.toolCallId, {
                    toolName: toolCall.toolName
                  });
                }
              }
            }
            for (const part of currentModelResponse.content) {
              if (part.type === "tool-result") {
                pendingDeferredToolCalls.delete(part.toolCallId);
              }
            }
            const stepContent = asContent({
              content: currentModelResponse.content,
              toolCalls: stepToolCalls,
              toolOutputs: clientToolOutputs,
              toolApprovalRequests: Object.values(toolApprovalRequests),
              tools
            });
            responseMessages.push(
              ...await toResponseMessages$1({
                content: stepContent,
                tools
              })
            );
            const stepRequest = ((_i = include == null ? void 0 : include.requestBody) != null ? _i : true) ? (_j = currentModelResponse.request) != null ? _j : {} : { ...currentModelResponse.request, body: void 0 };
            const stepResponse = {
              ...currentModelResponse.response,
              // deep clone msgs to avoid mutating past messages in multi-step:
              messages: structuredClone(responseMessages),
              // Conditionally include response body:
              body: ((_k = include == null ? void 0 : include.responseBody) != null ? _k : true) ? (_l = currentModelResponse.response) == null ? void 0 : _l.body : void 0
            };
            const stepNumber = steps.length;
            const currentStepResult = new DefaultStepResult({
              stepNumber,
              model: stepModelInfo,
              functionId: telemetry == null ? void 0 : telemetry.functionId,
              metadata: telemetry == null ? void 0 : telemetry.metadata,
              experimental_context,
              content: stepContent,
              finishReason: currentModelResponse.finishReason.unified,
              rawFinishReason: currentModelResponse.finishReason.raw,
              usage: asLanguageModelUsage(currentModelResponse.usage),
              warnings: currentModelResponse.warnings,
              providerMetadata: currentModelResponse.providerMetadata,
              request: stepRequest,
              response: stepResponse
            });
            logWarnings({
              warnings: (_m = currentModelResponse.warnings) != null ? _m : [],
              provider: stepModelInfo.provider,
              model: stepModelInfo.modelId
            });
            steps.push(currentStepResult);
            await notify({
              event: currentStepResult,
              callbacks: [onStepFinish, globalTelemetry.onStepFinish]
            });
          } finally {
            if (stepTimeoutId != null) {
              clearTimeout(stepTimeoutId);
            }
          }
        } while (
          // Continue if:
          // 1. There are client tool calls that have all been executed, OR
          // 2. There are pending deferred results from provider-executed tools
          (clientToolCalls.length > 0 && clientToolOutputs.length === clientToolCalls.length || pendingDeferredToolCalls.size > 0) && // continue until a stop condition is met:
          !await isStopConditionMet({ stopConditions, steps })
        );
        span.setAttributes(
          await selectTelemetryAttributes$1({
            telemetry,
            attributes: {
              "ai.response.finishReason": currentModelResponse.finishReason.unified,
              "ai.response.text": {
                output: () => extractTextContent(currentModelResponse.content)
              },
              "ai.response.reasoning": {
                output: () => extractReasoningContent(currentModelResponse.content)
              },
              "ai.response.toolCalls": {
                output: () => {
                  const toolCalls = asToolCalls(currentModelResponse.content);
                  return toolCalls == null ? void 0 : JSON.stringify(toolCalls);
                }
              },
              "ai.response.providerMetadata": JSON.stringify(
                currentModelResponse.providerMetadata
              ),
              // TODO rename telemetry attributes to inputTokens and outputTokens
              "ai.usage.promptTokens": currentModelResponse.usage.inputTokens.total,
              "ai.usage.completionTokens": currentModelResponse.usage.outputTokens.total
            }
          })
        );
        const lastStep = steps[steps.length - 1];
        const totalUsage = steps.reduce(
          (totalUsage2, step) => {
            return addLanguageModelUsage$1(totalUsage2, step.usage);
          },
          {
            inputTokens: void 0,
            outputTokens: void 0,
            totalTokens: void 0,
            reasoningTokens: void 0,
            cachedInputTokens: void 0
          }
        );
        await notify({
          event: {
            stepNumber: lastStep.stepNumber,
            model: lastStep.model,
            functionId: lastStep.functionId,
            metadata: lastStep.metadata,
            experimental_context: lastStep.experimental_context,
            finishReason: lastStep.finishReason,
            rawFinishReason: lastStep.rawFinishReason,
            usage: lastStep.usage,
            content: lastStep.content,
            text: lastStep.text,
            reasoningText: lastStep.reasoningText,
            reasoning: lastStep.reasoning,
            files: lastStep.files,
            sources: lastStep.sources,
            toolCalls: lastStep.toolCalls,
            staticToolCalls: lastStep.staticToolCalls,
            dynamicToolCalls: lastStep.dynamicToolCalls,
            toolResults: lastStep.toolResults,
            staticToolResults: lastStep.staticToolResults,
            dynamicToolResults: lastStep.dynamicToolResults,
            request: lastStep.request,
            response: lastStep.response,
            warnings: lastStep.warnings,
            providerMetadata: lastStep.providerMetadata,
            steps,
            totalUsage
          },
          callbacks: [
            onFinish,
            globalTelemetry.onFinish
          ]
        });
        let resolvedOutput;
        if (lastStep.finishReason === "stop") {
          const outputSpecification = output != null ? output : text$1();
          resolvedOutput = await outputSpecification.parseCompleteOutput(
            { text: lastStep.text },
            {
              response: lastStep.response,
              usage: lastStep.usage,
              finishReason: lastStep.finishReason
            }
          );
        }
        return new DefaultGenerateTextResult$1({
          steps,
          totalUsage,
          output: resolvedOutput
        });
      }
    });
  } catch (error) {
    throw wrapGatewayError(error);
  }
}
async function executeTools$1({
  toolCalls,
  tools,
  tracer,
  telemetry,
  messages,
  abortSignal,
  experimental_context,
  stepNumber,
  model,
  onToolCallStart,
  onToolCallFinish
}) {
  const toolOutputs = await Promise.all(
    toolCalls.map(
      async (toolCall) => executeToolCall({
        toolCall,
        tools,
        tracer,
        telemetry,
        messages,
        abortSignal,
        experimental_context,
        stepNumber,
        model,
        onToolCallStart,
        onToolCallFinish
      })
    )
  );
  return toolOutputs.filter(
    (output) => output != null
  );
}
var DefaultGenerateTextResult$1 = class DefaultGenerateTextResult {
  constructor(options) {
    this.steps = options.steps;
    this._output = options.output;
    this.totalUsage = options.totalUsage;
  }
  get finalStep() {
    return this.steps[this.steps.length - 1];
  }
  get content() {
    return this.finalStep.content;
  }
  get text() {
    return this.finalStep.text;
  }
  get files() {
    return this.finalStep.files;
  }
  get reasoningText() {
    return this.finalStep.reasoningText;
  }
  get reasoning() {
    return this.finalStep.reasoning;
  }
  get toolCalls() {
    return this.finalStep.toolCalls;
  }
  get staticToolCalls() {
    return this.finalStep.staticToolCalls;
  }
  get dynamicToolCalls() {
    return this.finalStep.dynamicToolCalls;
  }
  get toolResults() {
    return this.finalStep.toolResults;
  }
  get staticToolResults() {
    return this.finalStep.staticToolResults;
  }
  get dynamicToolResults() {
    return this.finalStep.dynamicToolResults;
  }
  get sources() {
    return this.finalStep.sources;
  }
  get finishReason() {
    return this.finalStep.finishReason;
  }
  get rawFinishReason() {
    return this.finalStep.rawFinishReason;
  }
  get warnings() {
    return this.finalStep.warnings;
  }
  get providerMetadata() {
    return this.finalStep.providerMetadata;
  }
  get response() {
    return this.finalStep.response;
  }
  get request() {
    return this.finalStep.request;
  }
  get usage() {
    return this.finalStep.usage;
  }
  get experimental_output() {
    return this.output;
  }
  get output() {
    if (this._output == null) {
      throw new NoOutputGeneratedError();
    }
    return this._output;
  }
};
function asToolCalls(content) {
  const parts = content.filter(
    (part) => part.type === "tool-call"
  );
  if (parts.length === 0) {
    return void 0;
  }
  return parts.map((toolCall) => ({
    toolCallId: toolCall.toolCallId,
    toolName: toolCall.toolName,
    input: toolCall.input
  }));
}
function asContent({
  content,
  toolCalls,
  toolOutputs,
  toolApprovalRequests,
  tools
}) {
  const contentParts = [];
  for (const part of content) {
    switch (part.type) {
      case "text":
      case "reasoning":
      case "source":
        contentParts.push(part);
        break;
      case "file": {
        contentParts.push({
          type: "file",
          file: new DefaultGeneratedFile$1(part),
          ...part.providerMetadata != null ? { providerMetadata: part.providerMetadata } : {}
        });
        break;
      }
      case "tool-call": {
        contentParts.push(
          toolCalls.find((toolCall) => toolCall.toolCallId === part.toolCallId)
        );
        break;
      }
      case "tool-result": {
        const toolCall = toolCalls.find(
          (toolCall2) => toolCall2.toolCallId === part.toolCallId
        );
        if (toolCall == null) {
          const tool2 = tools == null ? void 0 : tools[part.toolName];
          const supportsDeferredResults = (tool2 == null ? void 0 : tool2.type) === "provider" && tool2.supportsDeferredResults;
          if (!supportsDeferredResults) {
            throw new Error(`Tool call ${part.toolCallId} not found.`);
          }
          if (part.isError) {
            contentParts.push({
              type: "tool-error",
              toolCallId: part.toolCallId,
              toolName: part.toolName,
              input: void 0,
              error: part.result,
              providerExecuted: true,
              dynamic: part.dynamic
            });
          } else {
            contentParts.push({
              type: "tool-result",
              toolCallId: part.toolCallId,
              toolName: part.toolName,
              input: void 0,
              output: part.result,
              providerExecuted: true,
              dynamic: part.dynamic
            });
          }
          break;
        }
        if (part.isError) {
          contentParts.push({
            type: "tool-error",
            toolCallId: part.toolCallId,
            toolName: part.toolName,
            input: toolCall.input,
            error: part.result,
            providerExecuted: true,
            dynamic: toolCall.dynamic
          });
        } else {
          contentParts.push({
            type: "tool-result",
            toolCallId: part.toolCallId,
            toolName: part.toolName,
            input: toolCall.input,
            output: part.result,
            providerExecuted: true,
            dynamic: toolCall.dynamic
          });
        }
        break;
      }
      case "tool-approval-request": {
        const toolCall = toolCalls.find(
          (toolCall2) => toolCall2.toolCallId === part.toolCallId
        );
        if (toolCall == null) {
          throw new ToolCallNotFoundForApprovalError({
            toolCallId: part.toolCallId,
            approvalId: part.approvalId
          });
        }
        contentParts.push({
          type: "tool-approval-request",
          approvalId: part.approvalId,
          toolCall
        });
        break;
      }
    }
  }
  return [...contentParts, ...toolOutputs, ...toolApprovalRequests];
}
function prepareHeaders(headers, defaultHeaders) {
  const responseHeaders = new Headers(headers != null ? headers : {});
  for (const [key, value] of Object.entries(defaultHeaders)) {
    if (!responseHeaders.has(key)) {
      responseHeaders.set(key, value);
    }
  }
  return responseHeaders;
}
function createTextStreamResponse({
  status,
  statusText,
  headers,
  textStream
}) {
  return new Response(textStream.pipeThrough(new TextEncoderStream()), {
    status: status != null ? status : 200,
    statusText,
    headers: prepareHeaders(headers, {
      "content-type": "text/plain; charset=utf-8"
    })
  });
}
function writeToServerResponse$1({
  response,
  status,
  statusText,
  headers,
  stream
}) {
  const statusCode = status != null ? status : 200;
  if (statusText !== void 0) {
    response.writeHead(statusCode, statusText, headers);
  } else {
    response.writeHead(statusCode, headers);
  }
  const reader = stream.getReader();
  const read = async () => {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done)
          break;
        const canContinue = response.write(value);
        if (!canContinue) {
          await new Promise((resolve3) => {
            response.once("drain", resolve3);
          });
        }
      }
    } catch (error) {
      throw error;
    } finally {
      response.end();
    }
  };
  read();
}
function pipeTextStreamToResponse({
  response,
  status,
  statusText,
  headers,
  textStream
}) {
  writeToServerResponse$1({
    response,
    status,
    statusText,
    headers: Object.fromEntries(
      prepareHeaders(headers, {
        "content-type": "text/plain; charset=utf-8"
      }).entries()
    ),
    stream: textStream.pipeThrough(new TextEncoderStream())
  });
}
var JsonToSseTransformStream = class extends TransformStream {
  constructor() {
    super({
      transform(part, controller) {
        controller.enqueue(`data: ${JSON.stringify(part)}

`);
      },
      flush(controller) {
        controller.enqueue("data: [DONE]\n\n");
      }
    });
  }
};
var UI_MESSAGE_STREAM_HEADERS = {
  "content-type": "text/event-stream",
  "cache-control": "no-cache",
  connection: "keep-alive",
  "x-vercel-ai-ui-message-stream": "v1",
  "x-accel-buffering": "no"
  // disable nginx buffering
};
function createUIMessageStreamResponse({
  status,
  statusText,
  headers,
  stream,
  consumeSseStream
}) {
  let sseStream = stream.pipeThrough(new JsonToSseTransformStream());
  if (consumeSseStream) {
    const [stream1, stream2] = sseStream.tee();
    sseStream = stream1;
    consumeSseStream({ stream: stream2 });
  }
  return new Response(sseStream.pipeThrough(new TextEncoderStream()), {
    status,
    statusText,
    headers: prepareHeaders(headers, UI_MESSAGE_STREAM_HEADERS)
  });
}
function getResponseUIMessageId({
  originalMessages,
  responseMessageId
}) {
  if (originalMessages == null) {
    return void 0;
  }
  const lastMessage = originalMessages[originalMessages.length - 1];
  return (lastMessage == null ? void 0 : lastMessage.role) === "assistant" ? lastMessage.id : typeof responseMessageId === "function" ? responseMessageId() : responseMessageId;
}
function isDataUIMessageChunk(chunk) {
  return chunk.type.startsWith("data-");
}
function isStaticToolUIPart(part) {
  return part.type.startsWith("tool-");
}
function isDynamicToolUIPart(part) {
  return part.type === "dynamic-tool";
}
function isToolUIPart(part) {
  return isStaticToolUIPart(part) || isDynamicToolUIPart(part);
}
function getStaticToolName(part) {
  return part.type.split("-").slice(1).join("-");
}
function createStreamingUIMessageState({
  lastMessage,
  messageId
}) {
  return {
    message: (lastMessage == null ? void 0 : lastMessage.role) === "assistant" ? lastMessage : {
      id: messageId,
      metadata: void 0,
      role: "assistant",
      parts: []
    },
    activeTextParts: {},
    activeReasoningParts: {},
    partialToolCalls: {}
  };
}
function processUIMessageStream({
  stream,
  messageMetadataSchema,
  dataPartSchemas,
  runUpdateMessageJob,
  onError,
  onToolCall,
  onData
}) {
  return stream.pipeThrough(
    new TransformStream({
      async transform(chunk, controller) {
        await runUpdateMessageJob(async ({ state, write }) => {
          var _a21, _b92, _c, _d;
          function getToolInvocation(toolCallId) {
            const toolInvocations = state.message.parts.filter(isToolUIPart);
            const toolInvocation = toolInvocations.find(
              (invocation) => invocation.toolCallId === toolCallId
            );
            if (toolInvocation == null) {
              throw new UIMessageStreamError({
                chunkType: "tool-invocation",
                chunkId: toolCallId,
                message: `No tool invocation found for tool call ID "${toolCallId}".`
              });
            }
            return toolInvocation;
          }
          function updateToolPart(options) {
            var _a2222;
            const part = state.message.parts.find(
              (part2) => isStaticToolUIPart(part2) && part2.toolCallId === options.toolCallId
            );
            const anyOptions = options;
            const anyPart = part;
            if (part != null) {
              part.state = options.state;
              anyPart.input = anyOptions.input;
              anyPart.output = anyOptions.output;
              anyPart.errorText = anyOptions.errorText;
              anyPart.rawInput = anyOptions.rawInput;
              anyPart.preliminary = anyOptions.preliminary;
              if (options.title !== void 0) {
                anyPart.title = options.title;
              }
              anyPart.providerExecuted = (_a2222 = anyOptions.providerExecuted) != null ? _a2222 : part.providerExecuted;
              if (anyOptions.providerMetadata != null) {
                part.callProviderMetadata = anyOptions.providerMetadata;
              }
            } else {
              state.message.parts.push({
                type: `tool-${options.toolName}`,
                toolCallId: options.toolCallId,
                state: options.state,
                title: options.title,
                input: anyOptions.input,
                output: anyOptions.output,
                rawInput: anyOptions.rawInput,
                errorText: anyOptions.errorText,
                providerExecuted: anyOptions.providerExecuted,
                preliminary: anyOptions.preliminary,
                ...anyOptions.providerMetadata != null ? { callProviderMetadata: anyOptions.providerMetadata } : {}
              });
            }
          }
          function updateDynamicToolPart(options) {
            var _a2222, _b222;
            const part = state.message.parts.find(
              (part2) => part2.type === "dynamic-tool" && part2.toolCallId === options.toolCallId
            );
            const anyOptions = options;
            const anyPart = part;
            if (part != null) {
              part.state = options.state;
              anyPart.toolName = options.toolName;
              anyPart.input = anyOptions.input;
              anyPart.output = anyOptions.output;
              anyPart.errorText = anyOptions.errorText;
              anyPart.rawInput = (_a2222 = anyOptions.rawInput) != null ? _a2222 : anyPart.rawInput;
              anyPart.preliminary = anyOptions.preliminary;
              if (options.title !== void 0) {
                anyPart.title = options.title;
              }
              anyPart.providerExecuted = (_b222 = anyOptions.providerExecuted) != null ? _b222 : part.providerExecuted;
              if (anyOptions.providerMetadata != null) {
                part.callProviderMetadata = anyOptions.providerMetadata;
              }
            } else {
              state.message.parts.push({
                type: "dynamic-tool",
                toolName: options.toolName,
                toolCallId: options.toolCallId,
                state: options.state,
                input: anyOptions.input,
                output: anyOptions.output,
                errorText: anyOptions.errorText,
                preliminary: anyOptions.preliminary,
                providerExecuted: anyOptions.providerExecuted,
                title: options.title,
                ...anyOptions.providerMetadata != null ? { callProviderMetadata: anyOptions.providerMetadata } : {}
              });
            }
          }
          async function updateMessageMetadata(metadata) {
            if (metadata != null) {
              const mergedMetadata = state.message.metadata != null ? mergeObjects(state.message.metadata, metadata) : metadata;
              if (messageMetadataSchema != null) {
                await validateTypes({
                  value: mergedMetadata,
                  schema: messageMetadataSchema,
                  context: {
                    field: "message.metadata",
                    entityId: state.message.id
                  }
                });
              }
              state.message.metadata = mergedMetadata;
            }
          }
          switch (chunk.type) {
            case "text-start": {
              const textPart = {
                type: "text",
                text: "",
                providerMetadata: chunk.providerMetadata,
                state: "streaming"
              };
              state.activeTextParts[chunk.id] = textPart;
              state.message.parts.push(textPart);
              write();
              break;
            }
            case "text-delta": {
              const textPart = state.activeTextParts[chunk.id];
              if (textPart == null) {
                throw new UIMessageStreamError({
                  chunkType: "text-delta",
                  chunkId: chunk.id,
                  message: `Received text-delta for missing text part with ID "${chunk.id}". Ensure a "text-start" chunk is sent before any "text-delta" chunks.`
                });
              }
              textPart.text += chunk.delta;
              textPart.providerMetadata = (_a21 = chunk.providerMetadata) != null ? _a21 : textPart.providerMetadata;
              write();
              break;
            }
            case "text-end": {
              const textPart = state.activeTextParts[chunk.id];
              if (textPart == null) {
                throw new UIMessageStreamError({
                  chunkType: "text-end",
                  chunkId: chunk.id,
                  message: `Received text-end for missing text part with ID "${chunk.id}". Ensure a "text-start" chunk is sent before any "text-end" chunks.`
                });
              }
              textPart.state = "done";
              textPart.providerMetadata = (_b92 = chunk.providerMetadata) != null ? _b92 : textPart.providerMetadata;
              delete state.activeTextParts[chunk.id];
              write();
              break;
            }
            case "reasoning-start": {
              const reasoningPart = {
                type: "reasoning",
                text: "",
                providerMetadata: chunk.providerMetadata,
                state: "streaming"
              };
              state.activeReasoningParts[chunk.id] = reasoningPart;
              state.message.parts.push(reasoningPart);
              write();
              break;
            }
            case "reasoning-delta": {
              const reasoningPart = state.activeReasoningParts[chunk.id];
              if (reasoningPart == null) {
                throw new UIMessageStreamError({
                  chunkType: "reasoning-delta",
                  chunkId: chunk.id,
                  message: `Received reasoning-delta for missing reasoning part with ID "${chunk.id}". Ensure a "reasoning-start" chunk is sent before any "reasoning-delta" chunks.`
                });
              }
              reasoningPart.text += chunk.delta;
              reasoningPart.providerMetadata = (_c = chunk.providerMetadata) != null ? _c : reasoningPart.providerMetadata;
              write();
              break;
            }
            case "reasoning-end": {
              const reasoningPart = state.activeReasoningParts[chunk.id];
              if (reasoningPart == null) {
                throw new UIMessageStreamError({
                  chunkType: "reasoning-end",
                  chunkId: chunk.id,
                  message: `Received reasoning-end for missing reasoning part with ID "${chunk.id}". Ensure a "reasoning-start" chunk is sent before any "reasoning-end" chunks.`
                });
              }
              reasoningPart.providerMetadata = (_d = chunk.providerMetadata) != null ? _d : reasoningPart.providerMetadata;
              reasoningPart.state = "done";
              delete state.activeReasoningParts[chunk.id];
              write();
              break;
            }
            case "file": {
              state.message.parts.push({
                type: "file",
                mediaType: chunk.mediaType,
                url: chunk.url,
                ...chunk.providerMetadata != null ? { providerMetadata: chunk.providerMetadata } : {}
              });
              write();
              break;
            }
            case "source-url": {
              state.message.parts.push({
                type: "source-url",
                sourceId: chunk.sourceId,
                url: chunk.url,
                title: chunk.title,
                providerMetadata: chunk.providerMetadata
              });
              write();
              break;
            }
            case "source-document": {
              state.message.parts.push({
                type: "source-document",
                sourceId: chunk.sourceId,
                mediaType: chunk.mediaType,
                title: chunk.title,
                filename: chunk.filename,
                providerMetadata: chunk.providerMetadata
              });
              write();
              break;
            }
            case "tool-input-start": {
              const toolInvocations = state.message.parts.filter(isStaticToolUIPart);
              state.partialToolCalls[chunk.toolCallId] = {
                text: "",
                toolName: chunk.toolName,
                index: toolInvocations.length,
                dynamic: chunk.dynamic,
                title: chunk.title
              };
              if (chunk.dynamic) {
                updateDynamicToolPart({
                  toolCallId: chunk.toolCallId,
                  toolName: chunk.toolName,
                  state: "input-streaming",
                  input: void 0,
                  providerExecuted: chunk.providerExecuted,
                  title: chunk.title,
                  providerMetadata: chunk.providerMetadata
                });
              } else {
                updateToolPart({
                  toolCallId: chunk.toolCallId,
                  toolName: chunk.toolName,
                  state: "input-streaming",
                  input: void 0,
                  providerExecuted: chunk.providerExecuted,
                  title: chunk.title,
                  providerMetadata: chunk.providerMetadata
                });
              }
              write();
              break;
            }
            case "tool-input-delta": {
              const partialToolCall = state.partialToolCalls[chunk.toolCallId];
              if (partialToolCall == null) {
                throw new UIMessageStreamError({
                  chunkType: "tool-input-delta",
                  chunkId: chunk.toolCallId,
                  message: `Received tool-input-delta for missing tool call with ID "${chunk.toolCallId}". Ensure a "tool-input-start" chunk is sent before any "tool-input-delta" chunks.`
                });
              }
              partialToolCall.text += chunk.inputTextDelta;
              const { value: partialArgs } = await parsePartialJson$1(
                partialToolCall.text
              );
              if (partialToolCall.dynamic) {
                updateDynamicToolPart({
                  toolCallId: chunk.toolCallId,
                  toolName: partialToolCall.toolName,
                  state: "input-streaming",
                  input: partialArgs,
                  title: partialToolCall.title
                });
              } else {
                updateToolPart({
                  toolCallId: chunk.toolCallId,
                  toolName: partialToolCall.toolName,
                  state: "input-streaming",
                  input: partialArgs,
                  title: partialToolCall.title
                });
              }
              write();
              break;
            }
            case "tool-input-available": {
              if (chunk.dynamic) {
                updateDynamicToolPart({
                  toolCallId: chunk.toolCallId,
                  toolName: chunk.toolName,
                  state: "input-available",
                  input: chunk.input,
                  providerExecuted: chunk.providerExecuted,
                  providerMetadata: chunk.providerMetadata,
                  title: chunk.title
                });
              } else {
                updateToolPart({
                  toolCallId: chunk.toolCallId,
                  toolName: chunk.toolName,
                  state: "input-available",
                  input: chunk.input,
                  providerExecuted: chunk.providerExecuted,
                  providerMetadata: chunk.providerMetadata,
                  title: chunk.title
                });
              }
              write();
              if (onToolCall && !chunk.providerExecuted) {
                await onToolCall({
                  toolCall: chunk
                });
              }
              break;
            }
            case "tool-input-error": {
              const existingPart = state.message.parts.filter(isToolUIPart).find((p) => p.toolCallId === chunk.toolCallId);
              const isDynamic = existingPart != null ? existingPart.type === "dynamic-tool" : !!chunk.dynamic;
              if (isDynamic) {
                updateDynamicToolPart({
                  toolCallId: chunk.toolCallId,
                  toolName: chunk.toolName,
                  state: "output-error",
                  input: chunk.input,
                  errorText: chunk.errorText,
                  providerExecuted: chunk.providerExecuted,
                  providerMetadata: chunk.providerMetadata
                });
              } else {
                updateToolPart({
                  toolCallId: chunk.toolCallId,
                  toolName: chunk.toolName,
                  state: "output-error",
                  input: void 0,
                  rawInput: chunk.input,
                  errorText: chunk.errorText,
                  providerExecuted: chunk.providerExecuted,
                  providerMetadata: chunk.providerMetadata
                });
              }
              write();
              break;
            }
            case "tool-approval-request": {
              const toolInvocation = getToolInvocation(chunk.toolCallId);
              toolInvocation.state = "approval-requested";
              toolInvocation.approval = { id: chunk.approvalId };
              write();
              break;
            }
            case "tool-output-denied": {
              const toolInvocation = getToolInvocation(chunk.toolCallId);
              toolInvocation.state = "output-denied";
              write();
              break;
            }
            case "tool-output-available": {
              const toolInvocation = getToolInvocation(chunk.toolCallId);
              if (toolInvocation.type === "dynamic-tool") {
                updateDynamicToolPart({
                  toolCallId: chunk.toolCallId,
                  toolName: toolInvocation.toolName,
                  state: "output-available",
                  input: toolInvocation.input,
                  output: chunk.output,
                  preliminary: chunk.preliminary,
                  providerExecuted: chunk.providerExecuted,
                  title: toolInvocation.title
                });
              } else {
                updateToolPart({
                  toolCallId: chunk.toolCallId,
                  toolName: getStaticToolName(toolInvocation),
                  state: "output-available",
                  input: toolInvocation.input,
                  output: chunk.output,
                  providerExecuted: chunk.providerExecuted,
                  preliminary: chunk.preliminary,
                  title: toolInvocation.title
                });
              }
              write();
              break;
            }
            case "tool-output-error": {
              const toolInvocation = getToolInvocation(chunk.toolCallId);
              if (toolInvocation.type === "dynamic-tool") {
                updateDynamicToolPart({
                  toolCallId: chunk.toolCallId,
                  toolName: toolInvocation.toolName,
                  state: "output-error",
                  input: toolInvocation.input,
                  errorText: chunk.errorText,
                  providerExecuted: chunk.providerExecuted,
                  title: toolInvocation.title
                });
              } else {
                updateToolPart({
                  toolCallId: chunk.toolCallId,
                  toolName: getStaticToolName(toolInvocation),
                  state: "output-error",
                  input: toolInvocation.input,
                  rawInput: toolInvocation.rawInput,
                  errorText: chunk.errorText,
                  providerExecuted: chunk.providerExecuted,
                  title: toolInvocation.title
                });
              }
              write();
              break;
            }
            case "start-step": {
              state.message.parts.push({ type: "step-start" });
              break;
            }
            case "finish-step": {
              state.activeTextParts = {};
              state.activeReasoningParts = {};
              break;
            }
            case "start": {
              if (chunk.messageId != null) {
                state.message.id = chunk.messageId;
              }
              await updateMessageMetadata(chunk.messageMetadata);
              if (chunk.messageId != null || chunk.messageMetadata != null) {
                write();
              }
              break;
            }
            case "finish": {
              if (chunk.finishReason != null) {
                state.finishReason = chunk.finishReason;
              }
              await updateMessageMetadata(chunk.messageMetadata);
              if (chunk.messageMetadata != null) {
                write();
              }
              break;
            }
            case "message-metadata": {
              await updateMessageMetadata(chunk.messageMetadata);
              if (chunk.messageMetadata != null) {
                write();
              }
              break;
            }
            case "error": {
              onError == null ? void 0 : onError(new Error(chunk.errorText));
              break;
            }
            default: {
              if (isDataUIMessageChunk(chunk)) {
                if ((dataPartSchemas == null ? void 0 : dataPartSchemas[chunk.type]) != null) {
                  const partIdx = state.message.parts.findIndex(
                    (p) => "id" in p && "data" in p && p.id === chunk.id && p.type === chunk.type
                  );
                  const actualPartIdx = partIdx >= 0 ? partIdx : state.message.parts.length;
                  await validateTypes({
                    value: chunk.data,
                    schema: dataPartSchemas[chunk.type],
                    context: {
                      field: `message.parts[${actualPartIdx}].data`,
                      entityName: chunk.type,
                      entityId: chunk.id
                    }
                  });
                }
                const dataChunk = chunk;
                if (dataChunk.transient) {
                  onData == null ? void 0 : onData(dataChunk);
                  break;
                }
                const existingUIPart = dataChunk.id != null ? state.message.parts.find(
                  (chunkArg) => dataChunk.type === chunkArg.type && dataChunk.id === chunkArg.id
                ) : void 0;
                if (existingUIPart != null) {
                  existingUIPart.data = dataChunk.data;
                } else {
                  state.message.parts.push(dataChunk);
                }
                onData == null ? void 0 : onData(dataChunk);
                write();
              }
            }
          }
          controller.enqueue(chunk);
        });
      }
    })
  );
}
function handleUIMessageStreamFinish({
  messageId,
  originalMessages = [],
  onStepFinish,
  onFinish,
  onError,
  stream
}) {
  let lastMessage = originalMessages == null ? void 0 : originalMessages[originalMessages.length - 1];
  if ((lastMessage == null ? void 0 : lastMessage.role) !== "assistant") {
    lastMessage = void 0;
  } else {
    messageId = lastMessage.id;
  }
  let isAborted = false;
  const idInjectedStream = stream.pipeThrough(
    new TransformStream({
      transform(chunk, controller) {
        if (chunk.type === "start") {
          const startChunk = chunk;
          if (startChunk.messageId == null && messageId != null) {
            startChunk.messageId = messageId;
          }
        }
        if (chunk.type === "abort") {
          isAborted = true;
        }
        controller.enqueue(chunk);
      }
    })
  );
  if (onFinish == null && onStepFinish == null) {
    return idInjectedStream;
  }
  const state = createStreamingUIMessageState({
    lastMessage: lastMessage ? structuredClone(lastMessage) : void 0,
    messageId: messageId != null ? messageId : ""
    // will be overridden by the stream
  });
  const runUpdateMessageJob = async (job) => {
    await job({ state, write: () => {
    } });
  };
  let finishCalled = false;
  const callOnFinish = async () => {
    if (finishCalled || !onFinish) {
      return;
    }
    finishCalled = true;
    const isContinuation = state.message.id === (lastMessage == null ? void 0 : lastMessage.id);
    await onFinish({
      isAborted,
      isContinuation,
      responseMessage: state.message,
      messages: [
        ...isContinuation ? originalMessages.slice(0, -1) : originalMessages,
        state.message
      ],
      finishReason: state.finishReason
    });
  };
  const callOnStepFinish = async () => {
    if (!onStepFinish) {
      return;
    }
    const isContinuation = state.message.id === (lastMessage == null ? void 0 : lastMessage.id);
    try {
      await onStepFinish({
        isContinuation,
        responseMessage: structuredClone(state.message),
        messages: [
          ...isContinuation ? originalMessages.slice(0, -1) : originalMessages,
          structuredClone(state.message)
        ]
      });
    } catch (error) {
      onError(error);
    }
  };
  return processUIMessageStream({
    stream: idInjectedStream,
    runUpdateMessageJob,
    onError
  }).pipeThrough(
    new TransformStream({
      async transform(chunk, controller) {
        if (chunk.type === "finish-step") {
          await callOnStepFinish();
        }
        controller.enqueue(chunk);
      },
      // @ts-expect-error cancel is still new and missing from types https://developer.mozilla.org/en-US/docs/Web/API/TransformStream#browser_compatibility
      async cancel() {
        await callOnFinish();
      },
      async flush() {
        await callOnFinish();
      }
    })
  );
}
function pipeUIMessageStreamToResponse({
  response,
  status,
  statusText,
  headers,
  stream,
  consumeSseStream
}) {
  let sseStream = stream.pipeThrough(new JsonToSseTransformStream());
  if (consumeSseStream) {
    const [stream1, stream2] = sseStream.tee();
    sseStream = stream1;
    consumeSseStream({ stream: stream2 });
  }
  writeToServerResponse$1({
    response,
    status,
    statusText,
    headers: Object.fromEntries(
      prepareHeaders(headers, UI_MESSAGE_STREAM_HEADERS).entries()
    ),
    stream: sseStream.pipeThrough(new TextEncoderStream())
  });
}
function createAsyncIterableStream$1(source) {
  const stream = source.pipeThrough(new TransformStream());
  stream[Symbol.asyncIterator] = function() {
    const reader = this.getReader();
    let finished = false;
    async function cleanup(cancelStream) {
      var _a21;
      if (finished)
        return;
      finished = true;
      try {
        {
          await ((_a21 = reader.cancel) == null ? void 0 : _a21.call(reader));
        }
      } finally {
        try {
          reader.releaseLock();
        } catch (e) {
        }
      }
    }
    return {
      /**
       * Reads the next chunk from the stream.
       * @returns A promise resolving to the next IteratorResult.
       */
      async next() {
        if (finished) {
          return { done: true, value: void 0 };
        }
        const { done, value } = await reader.read();
        if (done) {
          await cleanup();
          return { done: true, value: void 0 };
        }
        return { done: false, value };
      },
      /**
       * May be called on early exit (e.g., break from for-await) or after completion.
       * Ensures the stream is cancelled and resources are released.
       * @returns A promise resolving to a completed IteratorResult.
       */
      async return() {
        await cleanup();
        return { done: true, value: void 0 };
      },
      /**
       * Called on early exit with error.
       * Ensures the stream is cancelled and resources are released, then rethrows the error.
       * @param err The error to throw.
       * @returns A promise that rejects with the provided error.
       */
      async throw(err) {
        await cleanup();
        throw err;
      }
    };
  };
  return stream;
}
async function consumeStream$1({
  stream,
  onError
}) {
  const reader = stream.getReader();
  try {
    while (true) {
      const { done } = await reader.read();
      if (done)
        break;
    }
  } catch (error) {
    onError == null ? void 0 : onError(error);
  } finally {
    reader.releaseLock();
  }
}
function createResolvablePromise$1() {
  let resolve3;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve3 = res;
    reject = rej;
  });
  return {
    promise,
    resolve: resolve3,
    reject
  };
}
function createStitchableStream$1() {
  let innerStreamReaders = [];
  let controller = null;
  let isClosed = false;
  let waitForNewStream = createResolvablePromise$1();
  const terminate = () => {
    isClosed = true;
    waitForNewStream.resolve();
    innerStreamReaders.forEach((reader) => reader.cancel());
    innerStreamReaders = [];
    controller == null ? void 0 : controller.close();
  };
  const processPull = async () => {
    if (isClosed && innerStreamReaders.length === 0) {
      controller == null ? void 0 : controller.close();
      return;
    }
    if (innerStreamReaders.length === 0) {
      waitForNewStream = createResolvablePromise$1();
      await waitForNewStream.promise;
      return processPull();
    }
    try {
      const { value, done } = await innerStreamReaders[0].read();
      if (done) {
        innerStreamReaders.shift();
        if (innerStreamReaders.length === 0 && isClosed) {
          controller == null ? void 0 : controller.close();
        } else {
          await processPull();
        }
      } else {
        controller == null ? void 0 : controller.enqueue(value);
      }
    } catch (error) {
      controller == null ? void 0 : controller.error(error);
      innerStreamReaders.shift();
      terminate();
    }
  };
  return {
    stream: new ReadableStream({
      start(controllerParam) {
        controller = controllerParam;
      },
      pull: processPull,
      async cancel() {
        for (const reader of innerStreamReaders) {
          await reader.cancel();
        }
        innerStreamReaders = [];
        isClosed = true;
      }
    }),
    addStream: (innerStream) => {
      if (isClosed) {
        throw new Error("Cannot add inner stream: outer stream is closed");
      }
      innerStreamReaders.push(innerStream.getReader());
      waitForNewStream.resolve();
    },
    /**
     * Gracefully close the outer stream. This will let the inner streams
     * finish processing and then close the outer stream.
     */
    close: () => {
      isClosed = true;
      waitForNewStream.resolve();
      if (innerStreamReaders.length === 0) {
        controller == null ? void 0 : controller.close();
      }
    },
    /**
     * Immediately close the outer stream. This will cancel all inner streams
     * and close the outer stream.
     */
    terminate
  };
}
function runToolsTransformation$1({
  tools,
  generatorStream,
  tracer,
  telemetry,
  system,
  messages,
  abortSignal,
  repairToolCall,
  experimental_context,
  generateId: generateId2,
  stepNumber,
  model,
  onToolCallStart,
  onToolCallFinish
}) {
  let toolResultsStreamController = null;
  const toolResultsStream = new ReadableStream({
    start(controller) {
      toolResultsStreamController = controller;
    }
  });
  const outstandingToolResults = /* @__PURE__ */ new Set();
  const toolInputs = /* @__PURE__ */ new Map();
  const toolCallsByToolCallId = /* @__PURE__ */ new Map();
  let canClose = false;
  let finishChunk = void 0;
  function attemptClose() {
    if (canClose && outstandingToolResults.size === 0) {
      if (finishChunk != null) {
        toolResultsStreamController.enqueue(finishChunk);
      }
      toolResultsStreamController.close();
    }
  }
  const forwardStream = new TransformStream({
    async transform(chunk, controller) {
      const chunkType = chunk.type;
      switch (chunkType) {
        case "stream-start":
        case "text-start":
        case "text-delta":
        case "text-end":
        case "reasoning-start":
        case "reasoning-delta":
        case "reasoning-end":
        case "tool-input-start":
        case "tool-input-delta":
        case "tool-input-end":
        case "source":
        case "response-metadata":
        case "error":
        case "raw": {
          controller.enqueue(chunk);
          break;
        }
        case "file": {
          controller.enqueue({
            type: "file",
            file: new DefaultGeneratedFileWithType$1({
              data: chunk.data,
              mediaType: chunk.mediaType
            }),
            ...chunk.providerMetadata != null ? { providerMetadata: chunk.providerMetadata } : {}
          });
          break;
        }
        case "finish": {
          finishChunk = {
            type: "finish",
            finishReason: chunk.finishReason.unified,
            rawFinishReason: chunk.finishReason.raw,
            usage: asLanguageModelUsage(chunk.usage),
            providerMetadata: chunk.providerMetadata
          };
          break;
        }
        case "tool-approval-request": {
          const toolCall = toolCallsByToolCallId.get(chunk.toolCallId);
          if (toolCall == null) {
            toolResultsStreamController.enqueue({
              type: "error",
              error: new ToolCallNotFoundForApprovalError({
                toolCallId: chunk.toolCallId,
                approvalId: chunk.approvalId
              })
            });
            break;
          }
          controller.enqueue({
            type: "tool-approval-request",
            approvalId: chunk.approvalId,
            toolCall
          });
          break;
        }
        case "tool-call": {
          try {
            const toolCall = await parseToolCall$1({
              toolCall: chunk,
              tools,
              repairToolCall,
              system,
              messages
            });
            toolCallsByToolCallId.set(toolCall.toolCallId, toolCall);
            controller.enqueue(toolCall);
            if (toolCall.invalid) {
              toolResultsStreamController.enqueue({
                type: "tool-error",
                toolCallId: toolCall.toolCallId,
                toolName: toolCall.toolName,
                input: toolCall.input,
                error: getErrorMessage2$1(toolCall.error),
                dynamic: true,
                title: toolCall.title
              });
              break;
            }
            const tool2 = tools == null ? void 0 : tools[toolCall.toolName];
            if (tool2 == null) {
              break;
            }
            if (tool2.onInputAvailable != null) {
              await tool2.onInputAvailable({
                input: toolCall.input,
                toolCallId: toolCall.toolCallId,
                messages,
                abortSignal,
                experimental_context
              });
            }
            if (await isApprovalNeeded({
              tool: tool2,
              toolCall,
              messages,
              experimental_context
            })) {
              toolResultsStreamController.enqueue({
                type: "tool-approval-request",
                approvalId: generateId2(),
                toolCall
              });
              break;
            }
            toolInputs.set(toolCall.toolCallId, toolCall.input);
            if (tool2.execute != null && toolCall.providerExecuted !== true) {
              const toolExecutionId = generateId2();
              outstandingToolResults.add(toolExecutionId);
              executeToolCall({
                toolCall,
                tools,
                tracer,
                telemetry,
                messages,
                abortSignal,
                experimental_context,
                stepNumber,
                model,
                onToolCallStart,
                onToolCallFinish,
                onPreliminaryToolResult: (result) => {
                  toolResultsStreamController.enqueue(result);
                }
              }).then((result) => {
                toolResultsStreamController.enqueue(result);
              }).catch((error) => {
                toolResultsStreamController.enqueue({
                  type: "error",
                  error
                });
              }).finally(() => {
                outstandingToolResults.delete(toolExecutionId);
                attemptClose();
              });
            }
          } catch (error) {
            toolResultsStreamController.enqueue({ type: "error", error });
          }
          break;
        }
        case "tool-result": {
          const toolName = chunk.toolName;
          if (chunk.isError) {
            toolResultsStreamController.enqueue({
              type: "tool-error",
              toolCallId: chunk.toolCallId,
              toolName,
              input: toolInputs.get(chunk.toolCallId),
              providerExecuted: true,
              error: chunk.result,
              dynamic: chunk.dynamic
            });
          } else {
            controller.enqueue({
              type: "tool-result",
              toolCallId: chunk.toolCallId,
              toolName,
              input: toolInputs.get(chunk.toolCallId),
              output: chunk.result,
              providerExecuted: true,
              dynamic: chunk.dynamic
            });
          }
          break;
        }
        default: {
          const _exhaustiveCheck = chunkType;
          throw new Error(`Unhandled chunk type: ${_exhaustiveCheck}`);
        }
      }
    },
    flush() {
      canClose = true;
      attemptClose();
    }
  });
  return new ReadableStream({
    async start(controller) {
      return Promise.all([
        generatorStream.pipeThrough(forwardStream).pipeTo(
          new WritableStream({
            write(chunk) {
              controller.enqueue(chunk);
            },
            close() {
            }
          })
        ),
        toolResultsStream.pipeTo(
          new WritableStream({
            write(chunk) {
              controller.enqueue(chunk);
            },
            close() {
              controller.close();
            }
          })
        )
      ]);
    }
  });
}
var originalGenerateId2$1 = createIdGenerator$1({
  prefix: "aitxt",
  size: 24
});
function streamText$1({
  model,
  tools,
  toolChoice,
  system,
  prompt,
  messages,
  maxRetries,
  abortSignal,
  timeout,
  headers,
  stopWhen = stepCountIs(1),
  experimental_output,
  output = experimental_output,
  experimental_telemetry: telemetry,
  prepareStep,
  providerOptions,
  experimental_activeTools,
  activeTools = experimental_activeTools,
  experimental_repairToolCall: repairToolCall,
  experimental_transform: transform,
  experimental_download: download2,
  includeRawChunks = false,
  onChunk,
  onError = ({ error }) => {
    console.error(error);
  },
  onFinish,
  onAbort,
  onStepFinish,
  experimental_onStart: onStart,
  experimental_onStepStart: onStepStart,
  experimental_onToolCallStart: onToolCallStart,
  experimental_onToolCallFinish: onToolCallFinish,
  experimental_context,
  experimental_include: include,
  _internal: { now: now2 = now$1, generateId: generateId2 = originalGenerateId2$1 } = {},
  ...settings
}) {
  const totalTimeoutMs = getTotalTimeoutMs(timeout);
  const stepTimeoutMs = getStepTimeoutMs(timeout);
  const chunkTimeoutMs = getChunkTimeoutMs(timeout);
  const stepAbortController = stepTimeoutMs != null ? new AbortController() : void 0;
  const chunkAbortController = chunkTimeoutMs != null ? new AbortController() : void 0;
  return new DefaultStreamTextResult$1({
    model: resolveLanguageModel(model),
    telemetry,
    headers,
    settings,
    maxRetries,
    abortSignal: mergeAbortSignals(
      abortSignal,
      totalTimeoutMs != null ? AbortSignal.timeout(totalTimeoutMs) : void 0,
      stepAbortController == null ? void 0 : stepAbortController.signal,
      chunkAbortController == null ? void 0 : chunkAbortController.signal
    ),
    stepTimeoutMs,
    stepAbortController,
    chunkTimeoutMs,
    chunkAbortController,
    system,
    prompt,
    messages,
    tools,
    toolChoice,
    transforms: asArray$1(transform),
    activeTools,
    repairToolCall,
    stopConditions: asArray$1(stopWhen),
    output,
    providerOptions,
    prepareStep,
    includeRawChunks,
    timeout,
    stopWhen,
    originalAbortSignal: abortSignal,
    onChunk,
    onError,
    onFinish,
    onAbort,
    onStepFinish,
    onStart,
    onStepStart,
    onToolCallStart,
    onToolCallFinish,
    now: now2,
    generateId: generateId2,
    experimental_context,
    download: download2,
    include
  });
}
function createOutputTransformStream$1(output) {
  let firstTextChunkId = void 0;
  let text2 = "";
  let textChunk = "";
  let textProviderMetadata = void 0;
  let lastPublishedJson = "";
  function publishTextChunk({
    controller,
    partialOutput = void 0
  }) {
    controller.enqueue({
      part: {
        type: "text-delta",
        id: firstTextChunkId,
        text: textChunk,
        providerMetadata: textProviderMetadata
      },
      partialOutput
    });
    textChunk = "";
  }
  return new TransformStream({
    async transform(chunk, controller) {
      var _a21;
      if (chunk.type === "finish-step" && textChunk.length > 0) {
        publishTextChunk({ controller });
      }
      if (chunk.type !== "text-delta" && chunk.type !== "text-start" && chunk.type !== "text-end") {
        controller.enqueue({ part: chunk, partialOutput: void 0 });
        return;
      }
      if (firstTextChunkId == null) {
        firstTextChunkId = chunk.id;
      } else if (chunk.id !== firstTextChunkId) {
        controller.enqueue({ part: chunk, partialOutput: void 0 });
        return;
      }
      if (chunk.type === "text-start") {
        controller.enqueue({ part: chunk, partialOutput: void 0 });
        return;
      }
      if (chunk.type === "text-end") {
        if (textChunk.length > 0) {
          publishTextChunk({ controller });
        }
        controller.enqueue({ part: chunk, partialOutput: void 0 });
        return;
      }
      text2 += chunk.text;
      textChunk += chunk.text;
      textProviderMetadata = (_a21 = chunk.providerMetadata) != null ? _a21 : textProviderMetadata;
      const result = await output.parsePartialOutput({ text: text2 });
      if (result !== void 0) {
        const currentJson = JSON.stringify(result.partial);
        if (currentJson !== lastPublishedJson) {
          publishTextChunk({ controller, partialOutput: result.partial });
          lastPublishedJson = currentJson;
        }
      }
    }
  });
}
var DefaultStreamTextResult$1 = class DefaultStreamTextResult {
  constructor({
    model,
    telemetry,
    headers,
    settings,
    maxRetries: maxRetriesArg,
    abortSignal,
    stepTimeoutMs,
    stepAbortController,
    chunkTimeoutMs,
    chunkAbortController,
    system,
    prompt,
    messages,
    tools,
    toolChoice,
    transforms,
    activeTools,
    repairToolCall,
    stopConditions,
    output,
    providerOptions,
    prepareStep,
    includeRawChunks,
    now: now2,
    generateId: generateId2,
    timeout,
    stopWhen,
    originalAbortSignal,
    onChunk,
    onError,
    onFinish,
    onAbort,
    onStepFinish,
    onStart,
    onStepStart,
    onToolCallStart,
    onToolCallFinish,
    experimental_context,
    download: download2,
    include
  }) {
    this._totalUsage = new DelayedPromise$1();
    this._finishReason = new DelayedPromise$1();
    this._rawFinishReason = new DelayedPromise$1();
    this._steps = new DelayedPromise$1();
    this.outputSpecification = output;
    this.includeRawChunks = includeRawChunks;
    this.tools = tools;
    const createGlobalTelemetry = getGlobalTelemetryIntegration();
    const globalTelemetry = createGlobalTelemetry(telemetry == null ? void 0 : telemetry.integrations);
    let stepFinish;
    let recordedContent = [];
    const recordedResponseMessages = [];
    let recordedFinishReason = void 0;
    let recordedRawFinishReason = void 0;
    let recordedTotalUsage = void 0;
    let recordedRequest = {};
    let recordedWarnings = [];
    const recordedSteps = [];
    const pendingDeferredToolCalls = /* @__PURE__ */ new Map();
    let rootSpan;
    let activeTextContent = {};
    let activeReasoningContent = {};
    const eventProcessor = new TransformStream({
      async transform(chunk, controller) {
        var _a21, _b92, _c, _d;
        controller.enqueue(chunk);
        const { part } = chunk;
        if (part.type === "text-delta" || part.type === "reasoning-delta" || part.type === "source" || part.type === "tool-call" || part.type === "tool-result" || part.type === "tool-input-start" || part.type === "tool-input-delta" || part.type === "raw") {
          await (onChunk == null ? void 0 : onChunk({ chunk: part }));
        }
        if (part.type === "error") {
          await onError({ error: wrapGatewayError(part.error) });
        }
        if (part.type === "text-start") {
          activeTextContent[part.id] = {
            type: "text",
            text: "",
            providerMetadata: part.providerMetadata
          };
          recordedContent.push(activeTextContent[part.id]);
        }
        if (part.type === "text-delta") {
          const activeText = activeTextContent[part.id];
          if (activeText == null) {
            controller.enqueue({
              part: {
                type: "error",
                error: `text part ${part.id} not found`
              },
              partialOutput: void 0
            });
            return;
          }
          activeText.text += part.text;
          activeText.providerMetadata = (_a21 = part.providerMetadata) != null ? _a21 : activeText.providerMetadata;
        }
        if (part.type === "text-end") {
          const activeText = activeTextContent[part.id];
          if (activeText == null) {
            controller.enqueue({
              part: {
                type: "error",
                error: `text part ${part.id} not found`
              },
              partialOutput: void 0
            });
            return;
          }
          activeText.providerMetadata = (_b92 = part.providerMetadata) != null ? _b92 : activeText.providerMetadata;
          delete activeTextContent[part.id];
        }
        if (part.type === "reasoning-start") {
          activeReasoningContent[part.id] = {
            type: "reasoning",
            text: "",
            providerMetadata: part.providerMetadata
          };
          recordedContent.push(activeReasoningContent[part.id]);
        }
        if (part.type === "reasoning-delta") {
          const activeReasoning = activeReasoningContent[part.id];
          if (activeReasoning == null) {
            controller.enqueue({
              part: {
                type: "error",
                error: `reasoning part ${part.id} not found`
              },
              partialOutput: void 0
            });
            return;
          }
          activeReasoning.text += part.text;
          activeReasoning.providerMetadata = (_c = part.providerMetadata) != null ? _c : activeReasoning.providerMetadata;
        }
        if (part.type === "reasoning-end") {
          const activeReasoning = activeReasoningContent[part.id];
          if (activeReasoning == null) {
            controller.enqueue({
              part: {
                type: "error",
                error: `reasoning part ${part.id} not found`
              },
              partialOutput: void 0
            });
            return;
          }
          activeReasoning.providerMetadata = (_d = part.providerMetadata) != null ? _d : activeReasoning.providerMetadata;
          delete activeReasoningContent[part.id];
        }
        if (part.type === "file") {
          recordedContent.push({
            type: "file",
            file: part.file,
            ...part.providerMetadata != null ? { providerMetadata: part.providerMetadata } : {}
          });
        }
        if (part.type === "source") {
          recordedContent.push(part);
        }
        if (part.type === "tool-call") {
          recordedContent.push(part);
        }
        if (part.type === "tool-result" && !part.preliminary) {
          recordedContent.push(part);
        }
        if (part.type === "tool-approval-request") {
          recordedContent.push(part);
        }
        if (part.type === "tool-error") {
          recordedContent.push(part);
        }
        if (part.type === "start-step") {
          recordedContent = [];
          activeReasoningContent = {};
          activeTextContent = {};
          recordedRequest = part.request;
          recordedWarnings = part.warnings;
        }
        if (part.type === "finish-step") {
          const stepMessages = await toResponseMessages$1({
            content: recordedContent,
            tools
          });
          const currentStepResult = new DefaultStepResult({
            stepNumber: recordedSteps.length,
            model: modelInfo,
            ...callbackTelemetryProps,
            experimental_context,
            content: recordedContent,
            finishReason: part.finishReason,
            rawFinishReason: part.rawFinishReason,
            usage: part.usage,
            warnings: recordedWarnings,
            request: recordedRequest,
            response: {
              ...part.response,
              messages: [...recordedResponseMessages, ...stepMessages]
            },
            providerMetadata: part.providerMetadata
          });
          await notify({
            event: currentStepResult,
            callbacks: [onStepFinish, globalTelemetry.onStepFinish]
          });
          logWarnings({
            warnings: recordedWarnings,
            provider: modelInfo.provider,
            model: modelInfo.modelId
          });
          recordedSteps.push(currentStepResult);
          recordedResponseMessages.push(...stepMessages);
          stepFinish.resolve();
        }
        if (part.type === "finish") {
          recordedTotalUsage = part.totalUsage;
          recordedFinishReason = part.finishReason;
          recordedRawFinishReason = part.rawFinishReason;
        }
      },
      async flush(controller) {
        try {
          if (recordedSteps.length === 0) {
            const error = (abortSignal == null ? void 0 : abortSignal.aborted) ? abortSignal.reason : new NoOutputGeneratedError({
              message: "No output generated. Check the stream for errors."
            });
            self._finishReason.reject(error);
            self._rawFinishReason.reject(error);
            self._totalUsage.reject(error);
            self._steps.reject(error);
            return;
          }
          const finishReason = recordedFinishReason != null ? recordedFinishReason : "other";
          const totalUsage = recordedTotalUsage != null ? recordedTotalUsage : createNullLanguageModelUsage();
          self._finishReason.resolve(finishReason);
          self._rawFinishReason.resolve(recordedRawFinishReason);
          self._totalUsage.resolve(totalUsage);
          self._steps.resolve(recordedSteps);
          const finalStep = recordedSteps[recordedSteps.length - 1];
          await notify({
            event: {
              stepNumber: finalStep.stepNumber,
              model: finalStep.model,
              functionId: finalStep.functionId,
              metadata: finalStep.metadata,
              experimental_context: finalStep.experimental_context,
              finishReason: finalStep.finishReason,
              rawFinishReason: finalStep.rawFinishReason,
              totalUsage,
              usage: finalStep.usage,
              content: finalStep.content,
              text: finalStep.text,
              reasoningText: finalStep.reasoningText,
              reasoning: finalStep.reasoning,
              files: finalStep.files,
              sources: finalStep.sources,
              toolCalls: finalStep.toolCalls,
              staticToolCalls: finalStep.staticToolCalls,
              dynamicToolCalls: finalStep.dynamicToolCalls,
              toolResults: finalStep.toolResults,
              staticToolResults: finalStep.staticToolResults,
              dynamicToolResults: finalStep.dynamicToolResults,
              request: finalStep.request,
              response: finalStep.response,
              warnings: finalStep.warnings,
              providerMetadata: finalStep.providerMetadata,
              steps: recordedSteps
            },
            callbacks: [
              onFinish,
              globalTelemetry.onFinish
            ]
          });
          rootSpan.setAttributes(
            await selectTelemetryAttributes$1({
              telemetry,
              attributes: {
                "ai.response.finishReason": finishReason,
                "ai.response.text": { output: () => finalStep.text },
                "ai.response.reasoning": {
                  output: () => finalStep.reasoningText
                },
                "ai.response.toolCalls": {
                  output: () => {
                    var _a21;
                    return ((_a21 = finalStep.toolCalls) == null ? void 0 : _a21.length) ? JSON.stringify(finalStep.toolCalls) : void 0;
                  }
                },
                "ai.response.providerMetadata": JSON.stringify(
                  finalStep.providerMetadata
                ),
                "ai.usage.inputTokens": totalUsage.inputTokens,
                "ai.usage.outputTokens": totalUsage.outputTokens,
                "ai.usage.totalTokens": totalUsage.totalTokens,
                "ai.usage.reasoningTokens": totalUsage.reasoningTokens,
                "ai.usage.cachedInputTokens": totalUsage.cachedInputTokens
              }
            })
          );
        } catch (error) {
          controller.error(error);
        } finally {
          rootSpan.end();
        }
      }
    });
    const stitchableStream = createStitchableStream$1();
    this.addStream = stitchableStream.addStream;
    this.closeStream = stitchableStream.close;
    const reader = stitchableStream.stream.getReader();
    let stream = new ReadableStream({
      async start(controller) {
        controller.enqueue({ type: "start" });
      },
      async pull(controller) {
        function abort() {
          onAbort == null ? void 0 : onAbort({ steps: recordedSteps });
          controller.enqueue({
            type: "abort",
            // The `reason` is usually of type DOMException, but it can also be of any type,
            // so we use getErrorMessage for serialization because it is already designed to accept values of the unknown type.
            // See: https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/reason
            ...(abortSignal == null ? void 0 : abortSignal.reason) !== void 0 ? { reason: getErrorMessage$1(abortSignal.reason) } : {}
          });
          controller.close();
        }
        try {
          const { done, value } = await reader.read();
          if (done) {
            controller.close();
            return;
          }
          if (abortSignal == null ? void 0 : abortSignal.aborted) {
            abort();
            return;
          }
          controller.enqueue(value);
        } catch (error) {
          if (isAbortError$1(error) && (abortSignal == null ? void 0 : abortSignal.aborted)) {
            abort();
          } else {
            controller.error(error);
          }
        }
      },
      cancel(reason) {
        return stitchableStream.stream.cancel(reason);
      }
    });
    for (const transform of transforms) {
      stream = stream.pipeThrough(
        transform({
          tools,
          stopStream() {
            stitchableStream.terminate();
          }
        })
      );
    }
    this.baseStream = stream.pipeThrough(createOutputTransformStream$1(output != null ? output : text$1())).pipeThrough(eventProcessor);
    const { maxRetries, retry } = prepareRetries$1({
      maxRetries: maxRetriesArg,
      abortSignal
    });
    const tracer = getTracer$1(telemetry);
    const callSettings = prepareCallSettings$1(settings);
    const baseTelemetryAttributes = getBaseTelemetryAttributes$1({
      model,
      telemetry,
      headers,
      settings: { ...callSettings, maxRetries }
    });
    const self = this;
    const modelInfo = { provider: model.provider, modelId: model.modelId };
    const callbackTelemetryProps = {
      functionId: telemetry == null ? void 0 : telemetry.functionId,
      metadata: telemetry == null ? void 0 : telemetry.metadata
    };
    recordSpan$1({
      name: "ai.streamText",
      attributes: selectTelemetryAttributes$1({
        telemetry,
        attributes: {
          ...assembleOperationName$1({ operationId: "ai.streamText", telemetry }),
          ...baseTelemetryAttributes,
          // specific settings that only make sense on the outer level:
          "ai.prompt": {
            input: () => JSON.stringify({ system, prompt, messages })
          }
        }
      }),
      tracer,
      endWhenDone: false,
      fn: async (rootSpanArg) => {
        rootSpan = rootSpanArg;
        const initialPrompt = await standardizePrompt$1({
          system,
          prompt,
          messages
        });
        await notify({
          event: {
            model: modelInfo,
            system,
            prompt,
            messages,
            tools,
            toolChoice,
            activeTools,
            maxOutputTokens: callSettings.maxOutputTokens,
            temperature: callSettings.temperature,
            topP: callSettings.topP,
            topK: callSettings.topK,
            presencePenalty: callSettings.presencePenalty,
            frequencyPenalty: callSettings.frequencyPenalty,
            stopSequences: callSettings.stopSequences,
            seed: callSettings.seed,
            maxRetries,
            timeout,
            headers,
            providerOptions,
            stopWhen,
            output,
            abortSignal: originalAbortSignal,
            include,
            ...callbackTelemetryProps,
            experimental_context
          },
          callbacks: [
            onStart,
            globalTelemetry.onStart
          ]
        });
        const initialMessages = initialPrompt.messages;
        const initialResponseMessages = [];
        const { approvedToolApprovals, deniedToolApprovals } = collectToolApprovals({ messages: initialMessages });
        if (deniedToolApprovals.length > 0 || approvedToolApprovals.length > 0) {
          const providerExecutedToolApprovals = [
            ...approvedToolApprovals,
            ...deniedToolApprovals
          ].filter((toolApproval) => toolApproval.toolCall.providerExecuted);
          const localApprovedToolApprovals = approvedToolApprovals.filter(
            (toolApproval) => !toolApproval.toolCall.providerExecuted
          );
          const localDeniedToolApprovals = deniedToolApprovals.filter(
            (toolApproval) => !toolApproval.toolCall.providerExecuted
          );
          const deniedProviderExecutedToolApprovals = deniedToolApprovals.filter(
            (toolApproval) => toolApproval.toolCall.providerExecuted
          );
          let toolExecutionStepStreamController;
          const toolExecutionStepStream = new ReadableStream({
            start(controller) {
              toolExecutionStepStreamController = controller;
            }
          });
          self.addStream(toolExecutionStepStream);
          try {
            for (const toolApproval of [
              ...localDeniedToolApprovals,
              ...deniedProviderExecutedToolApprovals
            ]) {
              toolExecutionStepStreamController == null ? void 0 : toolExecutionStepStreamController.enqueue({
                type: "tool-output-denied",
                toolCallId: toolApproval.toolCall.toolCallId,
                toolName: toolApproval.toolCall.toolName
              });
            }
            const toolOutputs = [];
            await Promise.all(
              localApprovedToolApprovals.map(async (toolApproval) => {
                const result = await executeToolCall({
                  toolCall: toolApproval.toolCall,
                  tools,
                  tracer,
                  telemetry,
                  messages: initialMessages,
                  abortSignal,
                  experimental_context,
                  stepNumber: recordedSteps.length,
                  model: modelInfo,
                  onToolCallStart: [
                    onToolCallStart,
                    globalTelemetry.onToolCallStart
                  ],
                  onToolCallFinish: [
                    onToolCallFinish,
                    globalTelemetry.onToolCallFinish
                  ],
                  onPreliminaryToolResult: (result2) => {
                    toolExecutionStepStreamController == null ? void 0 : toolExecutionStepStreamController.enqueue(result2);
                  }
                });
                if (result != null) {
                  toolExecutionStepStreamController == null ? void 0 : toolExecutionStepStreamController.enqueue(result);
                  toolOutputs.push(result);
                }
              })
            );
            if (providerExecutedToolApprovals.length > 0) {
              initialResponseMessages.push({
                role: "tool",
                content: providerExecutedToolApprovals.map(
                  (toolApproval) => ({
                    type: "tool-approval-response",
                    approvalId: toolApproval.approvalResponse.approvalId,
                    approved: toolApproval.approvalResponse.approved,
                    reason: toolApproval.approvalResponse.reason,
                    providerExecuted: true
                  })
                )
              });
            }
            if (toolOutputs.length > 0 || localDeniedToolApprovals.length > 0) {
              const localToolContent = [];
              for (const output2 of toolOutputs) {
                localToolContent.push({
                  type: "tool-result",
                  toolCallId: output2.toolCallId,
                  toolName: output2.toolName,
                  output: await createToolModelOutput({
                    toolCallId: output2.toolCallId,
                    input: output2.input,
                    tool: tools == null ? void 0 : tools[output2.toolName],
                    output: output2.type === "tool-result" ? output2.output : output2.error,
                    errorMode: output2.type === "tool-error" ? "text" : "none"
                  })
                });
              }
              for (const toolApproval of localDeniedToolApprovals) {
                localToolContent.push({
                  type: "tool-result",
                  toolCallId: toolApproval.toolCall.toolCallId,
                  toolName: toolApproval.toolCall.toolName,
                  output: {
                    type: "execution-denied",
                    reason: toolApproval.approvalResponse.reason
                  }
                });
              }
              initialResponseMessages.push({
                role: "tool",
                content: localToolContent
              });
            }
          } finally {
            toolExecutionStepStreamController == null ? void 0 : toolExecutionStepStreamController.close();
          }
        }
        recordedResponseMessages.push(...initialResponseMessages);
        async function streamStep({
          currentStep,
          responseMessages,
          usage
        }) {
          var _a21, _b92, _c, _d, _e, _f, _g, _h, _i;
          const includeRawChunks2 = self.includeRawChunks;
          const stepTimeoutId = stepTimeoutMs != null ? setTimeout(() => stepAbortController.abort(), stepTimeoutMs) : void 0;
          let chunkTimeoutId = void 0;
          function resetChunkTimeout() {
            if (chunkTimeoutMs != null) {
              if (chunkTimeoutId != null) {
                clearTimeout(chunkTimeoutId);
              }
              chunkTimeoutId = setTimeout(
                () => chunkAbortController.abort(),
                chunkTimeoutMs
              );
            }
          }
          function clearChunkTimeout() {
            if (chunkTimeoutId != null) {
              clearTimeout(chunkTimeoutId);
              chunkTimeoutId = void 0;
            }
          }
          function clearStepTimeout() {
            if (stepTimeoutId != null) {
              clearTimeout(stepTimeoutId);
            }
          }
          try {
            stepFinish = new DelayedPromise$1();
            const stepInputMessages = [...initialMessages, ...responseMessages];
            const prepareStepResult = await (prepareStep == null ? void 0 : prepareStep({
              model,
              steps: recordedSteps,
              stepNumber: recordedSteps.length,
              messages: stepInputMessages,
              experimental_context
            }));
            const stepModel = resolveLanguageModel(
              (_a21 = prepareStepResult == null ? void 0 : prepareStepResult.model) != null ? _a21 : model
            );
            const stepModelInfo = {
              provider: stepModel.provider,
              modelId: stepModel.modelId
            };
            const promptMessages = await convertToLanguageModelPrompt$1({
              prompt: {
                system: (_b92 = prepareStepResult == null ? void 0 : prepareStepResult.system) != null ? _b92 : initialPrompt.system,
                messages: (_c = prepareStepResult == null ? void 0 : prepareStepResult.messages) != null ? _c : stepInputMessages
              },
              supportedUrls: await stepModel.supportedUrls,
              download: download2
            });
            const stepActiveTools = (_d = prepareStepResult == null ? void 0 : prepareStepResult.activeTools) != null ? _d : activeTools;
            const { toolChoice: stepToolChoice, tools: stepTools } = await prepareToolsAndToolChoice$1({
              tools,
              toolChoice: (_e = prepareStepResult == null ? void 0 : prepareStepResult.toolChoice) != null ? _e : toolChoice,
              activeTools: stepActiveTools
            });
            experimental_context = (_f = prepareStepResult == null ? void 0 : prepareStepResult.experimental_context) != null ? _f : experimental_context;
            const stepMessages = (_g = prepareStepResult == null ? void 0 : prepareStepResult.messages) != null ? _g : stepInputMessages;
            const stepSystem = (_h = prepareStepResult == null ? void 0 : prepareStepResult.system) != null ? _h : initialPrompt.system;
            const stepProviderOptions = mergeObjects(
              providerOptions,
              prepareStepResult == null ? void 0 : prepareStepResult.providerOptions
            );
            await notify({
              event: {
                stepNumber: recordedSteps.length,
                model: stepModelInfo,
                system: stepSystem,
                messages: stepMessages,
                tools,
                toolChoice: stepToolChoice,
                activeTools: stepActiveTools,
                steps: [...recordedSteps],
                providerOptions: stepProviderOptions,
                timeout,
                headers,
                stopWhen,
                output,
                abortSignal: originalAbortSignal,
                include,
                ...callbackTelemetryProps,
                experimental_context
              },
              callbacks: [
                onStepStart,
                globalTelemetry.onStepStart
              ]
            });
            const {
              result: { stream: stream2, response, request },
              doStreamSpan,
              startTimestampMs
            } = await retry(
              () => recordSpan$1({
                name: "ai.streamText.doStream",
                attributes: selectTelemetryAttributes$1({
                  telemetry,
                  attributes: {
                    ...assembleOperationName$1({
                      operationId: "ai.streamText.doStream",
                      telemetry
                    }),
                    ...baseTelemetryAttributes,
                    // model:
                    "ai.model.provider": stepModel.provider,
                    "ai.model.id": stepModel.modelId,
                    // prompt:
                    "ai.prompt.messages": {
                      input: () => stringifyForTelemetry$1(promptMessages)
                    },
                    "ai.prompt.tools": {
                      // convert the language model level tools:
                      input: () => stepTools == null ? void 0 : stepTools.map((tool2) => JSON.stringify(tool2))
                    },
                    "ai.prompt.toolChoice": {
                      input: () => stepToolChoice != null ? JSON.stringify(stepToolChoice) : void 0
                    },
                    // standardized gen-ai llm span attributes:
                    "gen_ai.system": stepModel.provider,
                    "gen_ai.request.model": stepModel.modelId,
                    "gen_ai.request.frequency_penalty": callSettings.frequencyPenalty,
                    "gen_ai.request.max_tokens": callSettings.maxOutputTokens,
                    "gen_ai.request.presence_penalty": callSettings.presencePenalty,
                    "gen_ai.request.stop_sequences": callSettings.stopSequences,
                    "gen_ai.request.temperature": callSettings.temperature,
                    "gen_ai.request.top_k": callSettings.topK,
                    "gen_ai.request.top_p": callSettings.topP
                  }
                }),
                tracer,
                endWhenDone: false,
                fn: async (doStreamSpan2) => ({
                  startTimestampMs: now2(),
                  // get before the call
                  doStreamSpan: doStreamSpan2,
                  result: await stepModel.doStream({
                    ...callSettings,
                    tools: stepTools,
                    toolChoice: stepToolChoice,
                    responseFormat: await (output == null ? void 0 : output.responseFormat),
                    prompt: promptMessages,
                    providerOptions: stepProviderOptions,
                    abortSignal,
                    headers,
                    includeRawChunks: includeRawChunks2
                  })
                })
              })
            );
            const streamWithToolResults = runToolsTransformation$1({
              tools,
              generatorStream: stream2,
              tracer,
              telemetry,
              system,
              messages: stepInputMessages,
              repairToolCall,
              abortSignal,
              experimental_context,
              generateId: generateId2,
              stepNumber: recordedSteps.length,
              model: stepModelInfo,
              onToolCallStart: [
                onToolCallStart,
                globalTelemetry.onToolCallStart
              ],
              onToolCallFinish: [
                onToolCallFinish,
                globalTelemetry.onToolCallFinish
              ]
            });
            const stepRequest = ((_i = include == null ? void 0 : include.requestBody) != null ? _i : true) ? request != null ? request : {} : { ...request, body: void 0 };
            const stepToolCalls = [];
            const stepToolOutputs = [];
            let warnings;
            const activeToolCallToolNames = {};
            let stepFinishReason = "other";
            let stepRawFinishReason = void 0;
            let stepUsage = createNullLanguageModelUsage();
            let stepProviderMetadata;
            let stepFirstChunk = true;
            let stepResponse = {
              id: generateId2(),
              timestamp: /* @__PURE__ */ new Date(),
              modelId: modelInfo.modelId
            };
            let activeText = "";
            self.addStream(
              streamWithToolResults.pipeThrough(
                new TransformStream({
                  async transform(chunk, controller) {
                    var _a2222, _b222, _c2, _d2, _e2;
                    resetChunkTimeout();
                    if (chunk.type === "stream-start") {
                      warnings = chunk.warnings;
                      return;
                    }
                    if (stepFirstChunk) {
                      const msToFirstChunk = now2() - startTimestampMs;
                      stepFirstChunk = false;
                      doStreamSpan.addEvent("ai.stream.firstChunk", {
                        "ai.response.msToFirstChunk": msToFirstChunk
                      });
                      doStreamSpan.setAttributes({
                        "ai.response.msToFirstChunk": msToFirstChunk
                      });
                      controller.enqueue({
                        type: "start-step",
                        request: stepRequest,
                        warnings: warnings != null ? warnings : []
                      });
                    }
                    const chunkType = chunk.type;
                    switch (chunkType) {
                      case "tool-approval-request":
                      case "text-start":
                      case "text-end": {
                        controller.enqueue(chunk);
                        break;
                      }
                      case "text-delta": {
                        if (chunk.delta.length > 0) {
                          controller.enqueue({
                            type: "text-delta",
                            id: chunk.id,
                            text: chunk.delta,
                            providerMetadata: chunk.providerMetadata
                          });
                          activeText += chunk.delta;
                        }
                        break;
                      }
                      case "reasoning-start":
                      case "reasoning-end": {
                        controller.enqueue(chunk);
                        break;
                      }
                      case "reasoning-delta": {
                        controller.enqueue({
                          type: "reasoning-delta",
                          id: chunk.id,
                          text: chunk.delta,
                          providerMetadata: chunk.providerMetadata
                        });
                        break;
                      }
                      case "tool-call": {
                        controller.enqueue(chunk);
                        stepToolCalls.push(chunk);
                        break;
                      }
                      case "tool-result": {
                        controller.enqueue(chunk);
                        if (!chunk.preliminary) {
                          stepToolOutputs.push(chunk);
                        }
                        break;
                      }
                      case "tool-error": {
                        controller.enqueue(chunk);
                        stepToolOutputs.push(chunk);
                        break;
                      }
                      case "response-metadata": {
                        stepResponse = {
                          id: (_a2222 = chunk.id) != null ? _a2222 : stepResponse.id,
                          timestamp: (_b222 = chunk.timestamp) != null ? _b222 : stepResponse.timestamp,
                          modelId: (_c2 = chunk.modelId) != null ? _c2 : stepResponse.modelId
                        };
                        break;
                      }
                      case "finish": {
                        stepUsage = chunk.usage;
                        stepFinishReason = chunk.finishReason;
                        stepRawFinishReason = chunk.rawFinishReason;
                        stepProviderMetadata = chunk.providerMetadata;
                        const msToFinish = now2() - startTimestampMs;
                        doStreamSpan.addEvent("ai.stream.finish");
                        doStreamSpan.setAttributes({
                          "ai.response.msToFinish": msToFinish,
                          "ai.response.avgOutputTokensPerSecond": 1e3 * ((_d2 = stepUsage.outputTokens) != null ? _d2 : 0) / msToFinish
                        });
                        break;
                      }
                      case "file": {
                        controller.enqueue(chunk);
                        break;
                      }
                      case "source": {
                        controller.enqueue(chunk);
                        break;
                      }
                      case "tool-input-start": {
                        activeToolCallToolNames[chunk.id] = chunk.toolName;
                        const tool2 = tools == null ? void 0 : tools[chunk.toolName];
                        if ((tool2 == null ? void 0 : tool2.onInputStart) != null) {
                          await tool2.onInputStart({
                            toolCallId: chunk.id,
                            messages: stepInputMessages,
                            abortSignal,
                            experimental_context
                          });
                        }
                        controller.enqueue({
                          ...chunk,
                          dynamic: (_e2 = chunk.dynamic) != null ? _e2 : (tool2 == null ? void 0 : tool2.type) === "dynamic",
                          title: tool2 == null ? void 0 : tool2.title
                        });
                        break;
                      }
                      case "tool-input-end": {
                        delete activeToolCallToolNames[chunk.id];
                        controller.enqueue(chunk);
                        break;
                      }
                      case "tool-input-delta": {
                        const toolName = activeToolCallToolNames[chunk.id];
                        const tool2 = tools == null ? void 0 : tools[toolName];
                        if ((tool2 == null ? void 0 : tool2.onInputDelta) != null) {
                          await tool2.onInputDelta({
                            inputTextDelta: chunk.delta,
                            toolCallId: chunk.id,
                            messages: stepInputMessages,
                            abortSignal,
                            experimental_context
                          });
                        }
                        controller.enqueue(chunk);
                        break;
                      }
                      case "error": {
                        controller.enqueue(chunk);
                        stepFinishReason = "error";
                        break;
                      }
                      case "raw": {
                        if (includeRawChunks2) {
                          controller.enqueue(chunk);
                        }
                        break;
                      }
                      default: {
                        const exhaustiveCheck = chunkType;
                        throw new Error(
                          `Unknown chunk type: ${exhaustiveCheck}`
                        );
                      }
                    }
                  },
                  // invoke onFinish callback and resolve toolResults promise when the stream is about to close:
                  async flush(controller) {
                    const stepToolCallsJson = stepToolCalls.length > 0 ? JSON.stringify(stepToolCalls) : void 0;
                    try {
                      doStreamSpan.setAttributes(
                        await selectTelemetryAttributes$1({
                          telemetry,
                          attributes: {
                            "ai.response.finishReason": stepFinishReason,
                            "ai.response.text": {
                              output: () => activeText
                            },
                            "ai.response.reasoning": {
                              output: () => {
                                const reasoningParts = recordedContent.filter(
                                  (c) => c.type === "reasoning"
                                );
                                return reasoningParts.length > 0 ? reasoningParts.map((r) => r.text).join("\n") : void 0;
                              }
                            },
                            "ai.response.toolCalls": {
                              output: () => stepToolCallsJson
                            },
                            "ai.response.id": stepResponse.id,
                            "ai.response.model": stepResponse.modelId,
                            "ai.response.timestamp": stepResponse.timestamp.toISOString(),
                            "ai.response.providerMetadata": JSON.stringify(stepProviderMetadata),
                            "ai.usage.inputTokens": stepUsage.inputTokens,
                            "ai.usage.outputTokens": stepUsage.outputTokens,
                            "ai.usage.totalTokens": stepUsage.totalTokens,
                            "ai.usage.reasoningTokens": stepUsage.reasoningTokens,
                            "ai.usage.cachedInputTokens": stepUsage.cachedInputTokens,
                            // standardized gen-ai llm span attributes:
                            "gen_ai.response.finish_reasons": [
                              stepFinishReason
                            ],
                            "gen_ai.response.id": stepResponse.id,
                            "gen_ai.response.model": stepResponse.modelId,
                            "gen_ai.usage.input_tokens": stepUsage.inputTokens,
                            "gen_ai.usage.output_tokens": stepUsage.outputTokens
                          }
                        })
                      );
                    } catch (error) {
                    } finally {
                      doStreamSpan.end();
                    }
                    controller.enqueue({
                      type: "finish-step",
                      finishReason: stepFinishReason,
                      rawFinishReason: stepRawFinishReason,
                      usage: stepUsage,
                      providerMetadata: stepProviderMetadata,
                      response: {
                        ...stepResponse,
                        headers: response == null ? void 0 : response.headers
                      }
                    });
                    const combinedUsage = addLanguageModelUsage$1(
                      usage,
                      stepUsage
                    );
                    await stepFinish.promise;
                    const clientToolCalls = stepToolCalls.filter(
                      (toolCall) => toolCall.providerExecuted !== true
                    );
                    const clientToolOutputs = stepToolOutputs.filter(
                      (toolOutput) => toolOutput.providerExecuted !== true
                    );
                    for (const toolCall of stepToolCalls) {
                      if (toolCall.providerExecuted !== true)
                        continue;
                      const tool2 = tools == null ? void 0 : tools[toolCall.toolName];
                      if ((tool2 == null ? void 0 : tool2.type) === "provider" && tool2.supportsDeferredResults) {
                        const hasResultInStep = stepToolOutputs.some(
                          (output2) => (output2.type === "tool-result" || output2.type === "tool-error") && output2.toolCallId === toolCall.toolCallId
                        );
                        if (!hasResultInStep) {
                          pendingDeferredToolCalls.set(toolCall.toolCallId, {
                            toolName: toolCall.toolName
                          });
                        }
                      }
                    }
                    for (const output2 of stepToolOutputs) {
                      if (output2.type === "tool-result" || output2.type === "tool-error") {
                        pendingDeferredToolCalls.delete(output2.toolCallId);
                      }
                    }
                    clearStepTimeout();
                    clearChunkTimeout();
                    if (
                      // Continue if:
                      // 1. There are client tool calls that have all been executed, OR
                      // 2. There are pending deferred results from provider-executed tools
                      (clientToolCalls.length > 0 && clientToolOutputs.length === clientToolCalls.length || pendingDeferredToolCalls.size > 0) && // continue until a stop condition is met:
                      !await isStopConditionMet({
                        stopConditions,
                        steps: recordedSteps
                      })
                    ) {
                      responseMessages.push(
                        ...await toResponseMessages$1({
                          content: (
                            // use transformed content to create the messages for the next step:
                            recordedSteps[recordedSteps.length - 1].content
                          ),
                          tools
                        })
                      );
                      try {
                        await streamStep({
                          currentStep: currentStep + 1,
                          responseMessages,
                          usage: combinedUsage
                        });
                      } catch (error) {
                        controller.enqueue({
                          type: "error",
                          error
                        });
                        self.closeStream();
                      }
                    } else {
                      controller.enqueue({
                        type: "finish",
                        finishReason: stepFinishReason,
                        rawFinishReason: stepRawFinishReason,
                        totalUsage: combinedUsage
                      });
                      self.closeStream();
                    }
                  }
                })
              )
            );
          } finally {
            clearStepTimeout();
            clearChunkTimeout();
          }
        }
        await streamStep({
          currentStep: 0,
          responseMessages: initialResponseMessages,
          usage: createNullLanguageModelUsage()
        });
      }
    }).catch((error) => {
      self.addStream(
        new ReadableStream({
          start(controller) {
            controller.enqueue({ type: "error", error });
            controller.close();
          }
        })
      );
      self.closeStream();
    });
  }
  get steps() {
    this.consumeStream();
    return this._steps.promise;
  }
  get finalStep() {
    return this.steps.then((steps) => steps[steps.length - 1]);
  }
  get content() {
    return this.finalStep.then((step) => step.content);
  }
  get warnings() {
    return this.finalStep.then((step) => step.warnings);
  }
  get providerMetadata() {
    return this.finalStep.then((step) => step.providerMetadata);
  }
  get text() {
    return this.finalStep.then((step) => step.text);
  }
  get reasoningText() {
    return this.finalStep.then((step) => step.reasoningText);
  }
  get reasoning() {
    return this.finalStep.then((step) => step.reasoning);
  }
  get sources() {
    return this.finalStep.then((step) => step.sources);
  }
  get files() {
    return this.finalStep.then((step) => step.files);
  }
  get toolCalls() {
    return this.finalStep.then((step) => step.toolCalls);
  }
  get staticToolCalls() {
    return this.finalStep.then((step) => step.staticToolCalls);
  }
  get dynamicToolCalls() {
    return this.finalStep.then((step) => step.dynamicToolCalls);
  }
  get toolResults() {
    return this.finalStep.then((step) => step.toolResults);
  }
  get staticToolResults() {
    return this.finalStep.then((step) => step.staticToolResults);
  }
  get dynamicToolResults() {
    return this.finalStep.then((step) => step.dynamicToolResults);
  }
  get usage() {
    return this.finalStep.then((step) => step.usage);
  }
  get request() {
    return this.finalStep.then((step) => step.request);
  }
  get response() {
    return this.finalStep.then((step) => step.response);
  }
  get totalUsage() {
    this.consumeStream();
    return this._totalUsage.promise;
  }
  get finishReason() {
    this.consumeStream();
    return this._finishReason.promise;
  }
  get rawFinishReason() {
    this.consumeStream();
    return this._rawFinishReason.promise;
  }
  /**
   * Split out a new stream from the original stream.
   * The original stream is replaced to allow for further splitting,
   * since we do not know how many times the stream will be split.
   *
   * Note: this leads to buffering the stream content on the server.
   * However, the LLM results are expected to be small enough to not cause issues.
   */
  teeStream() {
    const [stream1, stream2] = this.baseStream.tee();
    this.baseStream = stream2;
    return stream1;
  }
  get textStream() {
    return createAsyncIterableStream$1(
      this.teeStream().pipeThrough(
        new TransformStream({
          transform({ part }, controller) {
            if (part.type === "text-delta") {
              controller.enqueue(part.text);
            }
          }
        })
      )
    );
  }
  get fullStream() {
    return createAsyncIterableStream$1(
      this.teeStream().pipeThrough(
        new TransformStream({
          transform({ part }, controller) {
            controller.enqueue(part);
          }
        })
      )
    );
  }
  async consumeStream(options) {
    var _a21;
    try {
      await consumeStream$1({
        stream: this.fullStream,
        onError: options == null ? void 0 : options.onError
      });
    } catch (error) {
      (_a21 = options == null ? void 0 : options.onError) == null ? void 0 : _a21.call(options, error);
    }
  }
  get experimental_partialOutputStream() {
    return this.partialOutputStream;
  }
  get partialOutputStream() {
    return createAsyncIterableStream$1(
      this.teeStream().pipeThrough(
        new TransformStream({
          transform({ partialOutput }, controller) {
            if (partialOutput != null) {
              controller.enqueue(partialOutput);
            }
          }
        })
      )
    );
  }
  get elementStream() {
    var _a21, _b92, _c;
    const transform = (_a21 = this.outputSpecification) == null ? void 0 : _a21.createElementStreamTransform();
    if (transform == null) {
      throw new UnsupportedFunctionalityError$1({
        functionality: `element streams in ${(_c = (_b92 = this.outputSpecification) == null ? void 0 : _b92.name) != null ? _c : "text"} mode`
      });
    }
    return createAsyncIterableStream$1(this.teeStream().pipeThrough(transform));
  }
  get output() {
    return this.finalStep.then((step) => {
      var _a21;
      const output = (_a21 = this.outputSpecification) != null ? _a21 : text$1();
      return output.parseCompleteOutput(
        { text: step.text },
        {
          response: step.response,
          usage: step.usage,
          finishReason: step.finishReason
        }
      );
    });
  }
  toUIMessageStream({
    originalMessages,
    generateMessageId,
    onFinish,
    messageMetadata,
    sendReasoning = true,
    sendSources = false,
    sendStart = true,
    sendFinish = true,
    onError = getErrorMessage$1
  } = {}) {
    const responseMessageId = generateMessageId != null ? getResponseUIMessageId({
      originalMessages,
      responseMessageId: generateMessageId
    }) : void 0;
    const isDynamic = (part) => {
      var _a21;
      const tool2 = (_a21 = this.tools) == null ? void 0 : _a21[part.toolName];
      if (tool2 == null) {
        return part.dynamic;
      }
      return (tool2 == null ? void 0 : tool2.type) === "dynamic" ? true : void 0;
    };
    const baseStream = this.fullStream.pipeThrough(
      new TransformStream({
        transform: async (part, controller) => {
          const messageMetadataValue = messageMetadata == null ? void 0 : messageMetadata({ part });
          const partType = part.type;
          switch (partType) {
            case "text-start": {
              controller.enqueue({
                type: "text-start",
                id: part.id,
                ...part.providerMetadata != null ? { providerMetadata: part.providerMetadata } : {}
              });
              break;
            }
            case "text-delta": {
              controller.enqueue({
                type: "text-delta",
                id: part.id,
                delta: part.text,
                ...part.providerMetadata != null ? { providerMetadata: part.providerMetadata } : {}
              });
              break;
            }
            case "text-end": {
              controller.enqueue({
                type: "text-end",
                id: part.id,
                ...part.providerMetadata != null ? { providerMetadata: part.providerMetadata } : {}
              });
              break;
            }
            case "reasoning-start": {
              controller.enqueue({
                type: "reasoning-start",
                id: part.id,
                ...part.providerMetadata != null ? { providerMetadata: part.providerMetadata } : {}
              });
              break;
            }
            case "reasoning-delta": {
              if (sendReasoning) {
                controller.enqueue({
                  type: "reasoning-delta",
                  id: part.id,
                  delta: part.text,
                  ...part.providerMetadata != null ? { providerMetadata: part.providerMetadata } : {}
                });
              }
              break;
            }
            case "reasoning-end": {
              controller.enqueue({
                type: "reasoning-end",
                id: part.id,
                ...part.providerMetadata != null ? { providerMetadata: part.providerMetadata } : {}
              });
              break;
            }
            case "file": {
              controller.enqueue({
                type: "file",
                mediaType: part.file.mediaType,
                url: `data:${part.file.mediaType};base64,${part.file.base64}`,
                ...part.providerMetadata != null ? { providerMetadata: part.providerMetadata } : {}
              });
              break;
            }
            case "source": {
              if (sendSources && part.sourceType === "url") {
                controller.enqueue({
                  type: "source-url",
                  sourceId: part.id,
                  url: part.url,
                  title: part.title,
                  ...part.providerMetadata != null ? { providerMetadata: part.providerMetadata } : {}
                });
              }
              if (sendSources && part.sourceType === "document") {
                controller.enqueue({
                  type: "source-document",
                  sourceId: part.id,
                  mediaType: part.mediaType,
                  title: part.title,
                  filename: part.filename,
                  ...part.providerMetadata != null ? { providerMetadata: part.providerMetadata } : {}
                });
              }
              break;
            }
            case "tool-input-start": {
              const dynamic = isDynamic(part);
              controller.enqueue({
                type: "tool-input-start",
                toolCallId: part.id,
                toolName: part.toolName,
                ...part.providerExecuted != null ? { providerExecuted: part.providerExecuted } : {},
                ...part.providerMetadata != null ? { providerMetadata: part.providerMetadata } : {},
                ...dynamic != null ? { dynamic } : {},
                ...part.title != null ? { title: part.title } : {}
              });
              break;
            }
            case "tool-input-delta": {
              controller.enqueue({
                type: "tool-input-delta",
                toolCallId: part.id,
                inputTextDelta: part.delta
              });
              break;
            }
            case "tool-call": {
              const dynamic = isDynamic(part);
              if (part.invalid) {
                controller.enqueue({
                  type: "tool-input-error",
                  toolCallId: part.toolCallId,
                  toolName: part.toolName,
                  input: part.input,
                  ...part.providerExecuted != null ? { providerExecuted: part.providerExecuted } : {},
                  ...part.providerMetadata != null ? { providerMetadata: part.providerMetadata } : {},
                  ...dynamic != null ? { dynamic } : {},
                  errorText: onError(part.error),
                  ...part.title != null ? { title: part.title } : {}
                });
              } else {
                controller.enqueue({
                  type: "tool-input-available",
                  toolCallId: part.toolCallId,
                  toolName: part.toolName,
                  input: part.input,
                  ...part.providerExecuted != null ? { providerExecuted: part.providerExecuted } : {},
                  ...part.providerMetadata != null ? { providerMetadata: part.providerMetadata } : {},
                  ...dynamic != null ? { dynamic } : {},
                  ...part.title != null ? { title: part.title } : {}
                });
              }
              break;
            }
            case "tool-approval-request": {
              controller.enqueue({
                type: "tool-approval-request",
                approvalId: part.approvalId,
                toolCallId: part.toolCall.toolCallId
              });
              break;
            }
            case "tool-result": {
              const dynamic = isDynamic(part);
              controller.enqueue({
                type: "tool-output-available",
                toolCallId: part.toolCallId,
                output: part.output,
                ...part.providerExecuted != null ? { providerExecuted: part.providerExecuted } : {},
                ...part.preliminary != null ? { preliminary: part.preliminary } : {},
                ...dynamic != null ? { dynamic } : {}
              });
              break;
            }
            case "tool-error": {
              const dynamic = isDynamic(part);
              controller.enqueue({
                type: "tool-output-error",
                toolCallId: part.toolCallId,
                errorText: onError(part.error),
                ...part.providerExecuted != null ? { providerExecuted: part.providerExecuted } : {},
                ...dynamic != null ? { dynamic } : {}
              });
              break;
            }
            case "tool-output-denied": {
              controller.enqueue({
                type: "tool-output-denied",
                toolCallId: part.toolCallId
              });
              break;
            }
            case "error": {
              controller.enqueue({
                type: "error",
                errorText: onError(part.error)
              });
              break;
            }
            case "start-step": {
              controller.enqueue({ type: "start-step" });
              break;
            }
            case "finish-step": {
              controller.enqueue({ type: "finish-step" });
              break;
            }
            case "start": {
              if (sendStart) {
                controller.enqueue({
                  type: "start",
                  ...messageMetadataValue != null ? { messageMetadata: messageMetadataValue } : {},
                  ...responseMessageId != null ? { messageId: responseMessageId } : {}
                });
              }
              break;
            }
            case "finish": {
              if (sendFinish) {
                controller.enqueue({
                  type: "finish",
                  finishReason: part.finishReason,
                  ...messageMetadataValue != null ? { messageMetadata: messageMetadataValue } : {}
                });
              }
              break;
            }
            case "abort": {
              controller.enqueue(part);
              break;
            }
            case "tool-input-end": {
              break;
            }
            case "raw": {
              break;
            }
            default: {
              const exhaustiveCheck = partType;
              throw new Error(`Unknown chunk type: ${exhaustiveCheck}`);
            }
          }
          if (messageMetadataValue != null && partType !== "start" && partType !== "finish") {
            controller.enqueue({
              type: "message-metadata",
              messageMetadata: messageMetadataValue
            });
          }
        }
      })
    );
    return createAsyncIterableStream$1(
      handleUIMessageStreamFinish({
        stream: baseStream,
        messageId: responseMessageId != null ? responseMessageId : generateMessageId == null ? void 0 : generateMessageId(),
        originalMessages,
        onFinish,
        onError
      })
    );
  }
  pipeUIMessageStreamToResponse(response, {
    originalMessages,
    generateMessageId,
    onFinish,
    messageMetadata,
    sendReasoning,
    sendSources,
    sendFinish,
    sendStart,
    onError,
    ...init
  } = {}) {
    pipeUIMessageStreamToResponse({
      response,
      stream: this.toUIMessageStream({
        originalMessages,
        generateMessageId,
        onFinish,
        messageMetadata,
        sendReasoning,
        sendSources,
        sendFinish,
        sendStart,
        onError
      }),
      ...init
    });
  }
  pipeTextStreamToResponse(response, init) {
    pipeTextStreamToResponse({
      response,
      textStream: this.textStream,
      ...init
    });
  }
  toUIMessageStreamResponse({
    originalMessages,
    generateMessageId,
    onFinish,
    messageMetadata,
    sendReasoning,
    sendSources,
    sendFinish,
    sendStart,
    onError,
    ...init
  } = {}) {
    return createUIMessageStreamResponse({
      stream: this.toUIMessageStream({
        originalMessages,
        generateMessageId,
        onFinish,
        messageMetadata,
        sendReasoning,
        sendSources,
        sendFinish,
        sendStart,
        onError
      }),
      ...init
    });
  }
  toTextStreamResponse(init) {
    return createTextStreamResponse({
      textStream: this.textStream,
      ...init
    });
  }
};
var ToolLoopAgent = class {
  constructor(settings) {
    this.version = "agent-v1";
    this.settings = settings;
  }
  /**
   * The id of the agent.
   */
  get id() {
    return this.settings.id;
  }
  /**
   * The tools that the agent can use.
   */
  get tools() {
    return this.settings.tools;
  }
  async prepareCall(options) {
    var _a21, _b92, _c, _d;
    const {
      experimental_onStart: _settingsOnStart,
      experimental_onStepStart: _settingsOnStepStart,
      experimental_onToolCallStart: _settingsOnToolCallStart,
      experimental_onToolCallFinish: _settingsOnToolCallFinish,
      onStepFinish: _settingsOnStepFinish,
      onFinish: _settingsOnFinish,
      ...settingsWithoutCallbacks
    } = this.settings;
    const baseCallArgs = {
      ...settingsWithoutCallbacks,
      stopWhen: (_a21 = this.settings.stopWhen) != null ? _a21 : stepCountIs(20),
      ...options
    };
    const preparedCallArgs = (_d = await ((_c = (_b92 = this.settings).prepareCall) == null ? void 0 : _c.call(
      _b92,
      baseCallArgs
    ))) != null ? _d : baseCallArgs;
    const { instructions, messages, prompt, ...callArgs } = preparedCallArgs;
    return {
      ...callArgs,
      // restore prompt types
      ...{ system: instructions, messages, prompt }
    };
  }
  mergeCallbacks(settingsCallback, methodCallback) {
    if (methodCallback && settingsCallback) {
      return async (event) => {
        await settingsCallback(event);
        await methodCallback(event);
      };
    }
    return methodCallback != null ? methodCallback : settingsCallback;
  }
  /**
   * Generates an output from the agent (non-streaming).
   */
  async generate({
    abortSignal,
    timeout,
    experimental_onStart,
    experimental_onStepStart,
    experimental_onToolCallStart,
    experimental_onToolCallFinish,
    onStepFinish,
    onFinish,
    ...options
  }) {
    return generateText$1({
      ...await this.prepareCall(options),
      abortSignal,
      timeout,
      experimental_onStart: this.mergeCallbacks(
        this.settings.experimental_onStart,
        experimental_onStart
      ),
      experimental_onStepStart: this.mergeCallbacks(
        this.settings.experimental_onStepStart,
        experimental_onStepStart
      ),
      experimental_onToolCallStart: this.mergeCallbacks(
        this.settings.experimental_onToolCallStart,
        experimental_onToolCallStart
      ),
      experimental_onToolCallFinish: this.mergeCallbacks(
        this.settings.experimental_onToolCallFinish,
        experimental_onToolCallFinish
      ),
      onStepFinish: this.mergeCallbacks(
        this.settings.onStepFinish,
        onStepFinish
      ),
      onFinish: this.mergeCallbacks(this.settings.onFinish, onFinish)
    });
  }
  /**
   * Streams an output from the agent (streaming).
   */
  async stream({
    abortSignal,
    timeout,
    experimental_transform,
    experimental_onStart,
    experimental_onStepStart,
    experimental_onToolCallStart,
    experimental_onToolCallFinish,
    onStepFinish,
    onFinish,
    ...options
  }) {
    return streamText$1({
      ...await this.prepareCall(options),
      abortSignal,
      timeout,
      experimental_transform,
      experimental_onStart: this.mergeCallbacks(
        this.settings.experimental_onStart,
        experimental_onStart
      ),
      experimental_onStepStart: this.mergeCallbacks(
        this.settings.experimental_onStepStart,
        experimental_onStepStart
      ),
      experimental_onToolCallStart: this.mergeCallbacks(
        this.settings.experimental_onToolCallStart,
        experimental_onToolCallStart
      ),
      experimental_onToolCallFinish: this.mergeCallbacks(
        this.settings.experimental_onToolCallFinish,
        experimental_onToolCallFinish
      ),
      onStepFinish: this.mergeCallbacks(
        this.settings.onStepFinish,
        onStepFinish
      ),
      onFinish: this.mergeCallbacks(this.settings.onFinish, onFinish)
    });
  }
};
createIdGenerator$1({ prefix: "aiobj", size: 24 });
createIdGenerator$1({ prefix: "aiobj", size: 24 });

// ../_vendored/ai_v4/dist/chunk-OPIPXJLE.js
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require22() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  __defProp(target, "default", { value: mod, enumerable: true }),
  mod
));
var require_secure_json_parse = __commonJS({
  "../../../node_modules/.pnpm/secure-json-parse@2.7.0/node_modules/secure-json-parse/index.js"(exports$1, module) {
    var hasBuffer = typeof Buffer !== "undefined";
    var suspectProtoRx = /"(?:_|\\u005[Ff])(?:_|\\u005[Ff])(?:p|\\u0070)(?:r|\\u0072)(?:o|\\u006[Ff])(?:t|\\u0074)(?:o|\\u006[Ff])(?:_|\\u005[Ff])(?:_|\\u005[Ff])"\s*:/;
    var suspectConstructorRx = /"(?:c|\\u0063)(?:o|\\u006[Ff])(?:n|\\u006[Ee])(?:s|\\u0073)(?:t|\\u0074)(?:r|\\u0072)(?:u|\\u0075)(?:c|\\u0063)(?:t|\\u0074)(?:o|\\u006[Ff])(?:r|\\u0072)"\s*:/;
    function _parse(text2, reviver, options) {
      if (options == null) {
        if (reviver !== null && typeof reviver === "object") {
          options = reviver;
          reviver = void 0;
        }
      }
      if (hasBuffer && Buffer.isBuffer(text2)) {
        text2 = text2.toString();
      }
      if (text2 && text2.charCodeAt(0) === 65279) {
        text2 = text2.slice(1);
      }
      const obj = JSON.parse(text2, reviver);
      if (obj === null || typeof obj !== "object") {
        return obj;
      }
      const protoAction = options && options.protoAction || "error";
      const constructorAction = options && options.constructorAction || "error";
      if (protoAction === "ignore" && constructorAction === "ignore") {
        return obj;
      }
      if (protoAction !== "ignore" && constructorAction !== "ignore") {
        if (suspectProtoRx.test(text2) === false && suspectConstructorRx.test(text2) === false) {
          return obj;
        }
      } else if (protoAction !== "ignore" && constructorAction === "ignore") {
        if (suspectProtoRx.test(text2) === false) {
          return obj;
        }
      } else {
        if (suspectConstructorRx.test(text2) === false) {
          return obj;
        }
      }
      return filter(obj, { protoAction, constructorAction, safe: options && options.safe });
    }
    function filter(obj, { protoAction = "error", constructorAction = "error", safe } = {}) {
      let next = [obj];
      while (next.length) {
        const nodes = next;
        next = [];
        for (const node of nodes) {
          if (protoAction !== "ignore" && Object.prototype.hasOwnProperty.call(node, "__proto__")) {
            if (safe === true) {
              return null;
            } else if (protoAction === "error") {
              throw new SyntaxError("Object contains forbidden prototype property");
            }
            delete node.__proto__;
          }
          if (constructorAction !== "ignore" && Object.prototype.hasOwnProperty.call(node, "constructor") && Object.prototype.hasOwnProperty.call(node.constructor, "prototype")) {
            if (safe === true) {
              return null;
            } else if (constructorAction === "error") {
              throw new SyntaxError("Object contains forbidden prototype property");
            }
            delete node.constructor;
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
    function parse(text2, reviver, options) {
      const stackTraceLimit = Error.stackTraceLimit;
      Error.stackTraceLimit = 0;
      try {
        return _parse(text2, reviver, options);
      } finally {
        Error.stackTraceLimit = stackTraceLimit;
      }
    }
    function safeParse(text2, reviver) {
      const stackTraceLimit = Error.stackTraceLimit;
      Error.stackTraceLimit = 0;
      try {
        return _parse(text2, reviver, { safe: true });
      } catch (_e) {
        return null;
      } finally {
        Error.stackTraceLimit = stackTraceLimit;
      }
    }
    module.exports = parse;
    module.exports.default = parse;
    module.exports.parse = parse;
    module.exports.safeParse = safeParse;
    module.exports.scan = filter;
  }
});
var marker = "vercel.ai.error";
var symbol = Symbol.for(marker);
var _a;
var _AISDKError = class _AISDKError2 extends Error {
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
    this[_a] = true;
    this.name = name142;
    this.cause = cause;
  }
  /**
   * Checks if the given error is an AI SDK Error.
   * @param {unknown} error - The error to check.
   * @returns {boolean} True if the error is an AI SDK Error, false otherwise.
   */
  static isInstance(error) {
    return _AISDKError2.hasMarker(error, marker);
  }
  static hasMarker(error, marker152) {
    const markerSymbol = Symbol.for(marker152);
    return error != null && typeof error === "object" && markerSymbol in error && typeof error[markerSymbol] === "boolean" && error[markerSymbol] === true;
  }
};
_a = symbol;
var AISDKError = _AISDKError;
var name = "AI_APICallError";
var marker2 = `vercel.ai.error.${name}`;
var symbol2 = Symbol.for(marker2);
var _a2;
var APICallError = class extends AISDKError {
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
    super({ name, message, cause });
    this[_a2] = true;
    this.url = url;
    this.requestBodyValues = requestBodyValues;
    this.statusCode = statusCode;
    this.responseHeaders = responseHeaders;
    this.responseBody = responseBody;
    this.isRetryable = isRetryable;
    this.data = data;
  }
  static isInstance(error) {
    return AISDKError.hasMarker(error, marker2);
  }
};
_a2 = symbol2;
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
var name3 = "AI_InvalidArgumentError";
var marker4 = `vercel.ai.error.${name3}`;
var symbol4 = Symbol.for(marker4);
var _a4;
var InvalidArgumentError = class extends AISDKError {
  constructor({
    message,
    cause,
    argument
  }) {
    super({ name: name3, message, cause });
    this[_a4] = true;
    this.argument = argument;
  }
  static isInstance(error) {
    return AISDKError.hasMarker(error, marker4);
  }
};
_a4 = symbol4;
var name4 = "AI_InvalidPromptError";
var marker5 = `vercel.ai.error.${name4}`;
var symbol5 = Symbol.for(marker5);
var _a5;
var InvalidPromptError = class extends AISDKError {
  constructor({
    prompt,
    message,
    cause
  }) {
    super({ name: name4, message: `Invalid prompt: ${message}`, cause });
    this[_a5] = true;
    this.prompt = prompt;
  }
  static isInstance(error) {
    return AISDKError.hasMarker(error, marker5);
  }
};
_a5 = symbol5;
var name6 = "AI_JSONParseError";
var marker7 = `vercel.ai.error.${name6}`;
var symbol7 = Symbol.for(marker7);
var _a7;
var JSONParseError = class extends AISDKError {
  constructor({ text: text2, cause }) {
    super({
      name: name6,
      message: `JSON parsing failed: Text: ${text2}.
Error message: ${getErrorMessage(cause)}`,
      cause
    });
    this[_a7] = true;
    this.text = text2;
  }
  static isInstance(error) {
    return AISDKError.hasMarker(error, marker7);
  }
};
_a7 = symbol7;
var name12 = "AI_TypeValidationError";
var marker13 = `vercel.ai.error.${name12}`;
var symbol13 = Symbol.for(marker13);
var _a13;
var _TypeValidationError = class _TypeValidationError2 extends AISDKError {
  constructor({ value, cause }) {
    super({
      name: name12,
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
    return _TypeValidationError2.isInstance(cause) && cause.value === value ? cause : new _TypeValidationError2({ value, cause });
  }
};
_a13 = symbol13;
var TypeValidationError = _TypeValidationError;
var name13 = "AI_UnsupportedFunctionalityError";
var marker14 = `vercel.ai.error.${name13}`;
var symbol14 = Symbol.for(marker14);
var _a14;
var UnsupportedFunctionalityError = class extends AISDKError {
  constructor({
    functionality,
    message = `'${functionality}' functionality not supported.`
  }) {
    super({ name: name13, message });
    this[_a14] = true;
    this.functionality = functionality;
  }
  static isInstance(error) {
    return AISDKError.hasMarker(error, marker14);
  }
};
_a14 = symbol14;
function isJSONValue(value) {
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return true;
  }
  if (Array.isArray(value)) {
    return value.every(isJSONValue);
  }
  if (typeof value === "object") {
    return Object.entries(value).every(
      ([key, val]) => typeof key === "string" && isJSONValue(val)
    );
  }
  return false;
}
function isJSONArray(value) {
  return Array.isArray(value) && value.every(isJSONValue);
}
function isJSONObject(value) {
  return value != null && typeof value === "object" && Object.entries(value).every(
    ([key, val]) => typeof key === "string" && isJSONValue(val)
  );
}
var customAlphabet = (alphabet, defaultSize = 21) => {
  return (size = defaultSize) => {
    let id = "";
    let i = size | 0;
    while (i--) {
      id += alphabet[Math.random() * alphabet.length | 0];
    }
    return id;
  };
};
var import_secure_json_parse = __toESM(require_secure_json_parse());
function convertAsyncIteratorToReadableStream(iterator) {
  return new ReadableStream({
    /**
     * Called when the consumer wants to pull more data from the stream.
     *
     * @param {ReadableStreamDefaultController<T>} controller - The controller to enqueue data into the stream.
     * @returns {Promise<void>}
     */
    async pull(controller) {
      try {
        const { value, done } = await iterator.next();
        if (done) {
          controller.close();
        } else {
          controller.enqueue(value);
        }
      } catch (error) {
        controller.error(error);
      }
    },
    /**
     * Called when the consumer cancels the stream.
     */
    cancel() {
    }
  });
}
async function delay(delayInMs) {
  return delayInMs == null ? Promise.resolve() : new Promise((resolve2) => setTimeout(resolve2, delayInMs));
}
var createIdGenerator = ({
  prefix,
  size: defaultSize = 16,
  alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  separator = "-"
} = {}) => {
  const generator = customAlphabet(alphabet, defaultSize);
  if (prefix == null) {
    return generator;
  }
  if (alphabet.includes(separator)) {
    throw new InvalidArgumentError({
      argument: "separator",
      message: `The separator "${separator}" must not be part of the alphabet "${alphabet}".`
    });
  }
  return (size) => `${prefix}${separator}${generator(size)}`;
};
var generateId = createIdGenerator();
function getErrorMessage2(error) {
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
function isAbortError(error) {
  return error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError");
}
var validatorSymbol = /* @__PURE__ */ Symbol.for("vercel.ai.validator");
function validator(validate) {
  return { [validatorSymbol]: true, validate };
}
function isValidator(value) {
  return typeof value === "object" && value !== null && validatorSymbol in value && value[validatorSymbol] === true && "validate" in value;
}
function asValidator(value) {
  return isValidator(value) ? value : zodValidator(value);
}
function zodValidator(zodSchema2) {
  return validator((value) => {
    const result = zodSchema2.safeParse(value);
    return result.success ? { success: true, value: result.data } : { success: false, error: result.error };
  });
}
function safeValidateTypes({
  value,
  schema
}) {
  const validator2 = asValidator(schema);
  try {
    if (validator2.validate == null) {
      return { success: true, value };
    }
    const result = validator2.validate(value);
    if (result.success) {
      return result;
    }
    return {
      success: false,
      error: TypeValidationError.wrap({ value, cause: result.error })
    };
  } catch (error) {
    return {
      success: false,
      error: TypeValidationError.wrap({ value, cause: error })
    };
  }
}
function safeParseJSON({
  text: text2,
  schema
}) {
  try {
    const value = import_secure_json_parse.default.parse(text2);
    if (schema == null) {
      return { success: true, value, rawValue: value };
    }
    const validationResult = safeValidateTypes({ value, schema });
    return validationResult.success ? { ...validationResult, rawValue: value } : validationResult;
  } catch (error) {
    return {
      success: false,
      error: JSONParseError.isInstance(error) ? error : new JSONParseError({ text: text2, cause: error })
    };
  }
}
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
var ignoreOverride = /* @__PURE__ */ Symbol("Let zodToJsonSchema decide on which parser to use");
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
  target: "jsonSchema7",
  strictUnions: false,
  definitions: {},
  errorMessages: false,
  markdownDescription: false,
  patternStrategy: "escape",
  applyRegexFlags: false,
  emailStrategy: "format:email",
  base64Strategy: "contentEncoding:base64",
  nameStrategy: "ref",
  openAiAnyTypeName: "OpenAiAnyType"
};
var getDefaultOptions = (options) => typeof options === "string" ? {
  ...defaultOptions,
  name: options
} : {
  ...defaultOptions,
  ...options
};
var getRefs = (options) => {
  const _options = getDefaultOptions(options);
  const currentPath = _options.name !== void 0 ? [..._options.basePath, _options.definitionPath, _options.name] : _options.basePath;
  return {
    ..._options,
    flags: { hasReferencedOpenAiAnyType: false },
    currentPath,
    propertyPath: void 0,
    seen: new Map(Object.entries(_options.definitions).map(([name17, def]) => [
      def._def,
      {
        def: def._def,
        path: [..._options.basePath, _options.definitionPath, name17],
        // Resolution of references will be forced even though seen, so it's ok that the schema is undefined here for now.
        jsonSchema: void 0
      }
    ]))
  };
};
function addErrorMessage(res, key, errorMessage, refs) {
  if (!refs?.errorMessages)
    return;
  if (errorMessage) {
    res.errorMessage = {
      ...res.errorMessage,
      [key]: errorMessage
    };
  }
}
function setResponseValueAndErrors(res, key, value, errorMessage, refs) {
  res[key] = value;
  addErrorMessage(res, key, errorMessage, refs);
}
var getRelativePath = (pathA, pathB) => {
  let i = 0;
  for (; i < pathA.length && i < pathB.length; i++) {
    if (pathA[i] !== pathB[i])
      break;
  }
  return [(pathA.length - i).toString(), ...pathB.slice(i)].join("/");
};
function parseAnyDef(refs) {
  if (refs.target !== "openAi") {
    return {};
  }
  const anyDefinitionPath = [
    ...refs.basePath,
    refs.definitionPath,
    refs.openAiAnyTypeName
  ];
  refs.flags.hasReferencedOpenAiAnyType = true;
  return {
    $ref: refs.$refStrategy === "relative" ? getRelativePath(anyDefinitionPath, refs.currentPath) : anyDefinitionPath.join("/")
  };
}
function parseArrayDef(def, refs) {
  const res = {
    type: "array"
  };
  if (def.type?._def && def.type?._def?.typeName !== ZodFirstPartyTypeKind.ZodAny) {
    res.items = parseDef(def.type._def, {
      ...refs,
      currentPath: [...refs.currentPath, "items"]
    });
  }
  if (def.minLength) {
    setResponseValueAndErrors(res, "minItems", def.minLength.value, def.minLength.message, refs);
  }
  if (def.maxLength) {
    setResponseValueAndErrors(res, "maxItems", def.maxLength.value, def.maxLength.message, refs);
  }
  if (def.exactLength) {
    setResponseValueAndErrors(res, "minItems", def.exactLength.value, def.exactLength.message, refs);
    setResponseValueAndErrors(res, "maxItems", def.exactLength.value, def.exactLength.message, refs);
  }
  return res;
}
function parseBigintDef(def, refs) {
  const res = {
    type: "integer",
    format: "int64"
  };
  if (!def.checks)
    return res;
  for (const check of def.checks) {
    switch (check.kind) {
      case "min":
        if (refs.target === "jsonSchema7") {
          if (check.inclusive) {
            setResponseValueAndErrors(res, "minimum", check.value, check.message, refs);
          } else {
            setResponseValueAndErrors(res, "exclusiveMinimum", check.value, check.message, refs);
          }
        } else {
          if (!check.inclusive) {
            res.exclusiveMinimum = true;
          }
          setResponseValueAndErrors(res, "minimum", check.value, check.message, refs);
        }
        break;
      case "max":
        if (refs.target === "jsonSchema7") {
          if (check.inclusive) {
            setResponseValueAndErrors(res, "maximum", check.value, check.message, refs);
          } else {
            setResponseValueAndErrors(res, "exclusiveMaximum", check.value, check.message, refs);
          }
        } else {
          if (!check.inclusive) {
            res.exclusiveMaximum = true;
          }
          setResponseValueAndErrors(res, "maximum", check.value, check.message, refs);
        }
        break;
      case "multipleOf":
        setResponseValueAndErrors(res, "multipleOf", check.value, check.message, refs);
        break;
    }
  }
  return res;
}
function parseBooleanDef() {
  return {
    type: "boolean"
  };
}
function parseBrandedDef(_def, refs) {
  return parseDef(_def.type._def, refs);
}
var parseCatchDef = (def, refs) => {
  return parseDef(def.innerType._def, refs);
};
function parseDateDef(def, refs, overrideDateStrategy) {
  const strategy = overrideDateStrategy ?? refs.dateStrategy;
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
      return integerDateParser(def, refs);
  }
}
var integerDateParser = (def, refs) => {
  const res = {
    type: "integer",
    format: "unix-time"
  };
  if (refs.target === "openApi3") {
    return res;
  }
  for (const check of def.checks) {
    switch (check.kind) {
      case "min":
        setResponseValueAndErrors(
          res,
          "minimum",
          check.value,
          // This is in milliseconds
          check.message,
          refs
        );
        break;
      case "max":
        setResponseValueAndErrors(
          res,
          "maximum",
          check.value,
          // This is in milliseconds
          check.message,
          refs
        );
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
  return refs.effectStrategy === "input" ? parseDef(_def.schema._def, refs) : parseAnyDef(refs);
}
function parseEnumDef(def) {
  return {
    type: "string",
    enum: Array.from(def.values)
  };
}
var isJsonSchema7AllOfType = (type) => {
  if ("type" in type && type.type === "string")
    return false;
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
  let unevaluatedProperties = refs.target === "jsonSchema2019-09" ? { unevaluatedProperties: false } : void 0;
  const mergedAllOf = [];
  allOf.forEach((schema) => {
    if (isJsonSchema7AllOfType(schema)) {
      mergedAllOf.push(...schema.allOf);
      if (schema.unevaluatedProperties === void 0) {
        unevaluatedProperties = void 0;
      }
    } else {
      let nestedSchema = schema;
      if ("additionalProperties" in schema && schema.additionalProperties === false) {
        const { additionalProperties, ...rest } = schema;
        nestedSchema = rest;
      } else {
        unevaluatedProperties = void 0;
      }
      mergedAllOf.push(nestedSchema);
    }
  });
  return mergedAllOf.length ? {
    allOf: mergedAllOf,
    ...unevaluatedProperties
  } : void 0;
}
function parseLiteralDef(def, refs) {
  const parsedType = typeof def.value;
  if (parsedType !== "bigint" && parsedType !== "number" && parsedType !== "boolean" && parsedType !== "string") {
    return {
      type: Array.isArray(def.value) ? "array" : "object"
    };
  }
  if (refs.target === "openApi3") {
    return {
      type: parsedType === "bigint" ? "integer" : parsedType,
      enum: [def.value]
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
      emojiRegex = RegExp("^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$", "u");
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
          setResponseValueAndErrors(res, "minLength", typeof res.minLength === "number" ? Math.max(res.minLength, check.value) : check.value, check.message, refs);
          break;
        case "max":
          setResponseValueAndErrors(res, "maxLength", typeof res.maxLength === "number" ? Math.min(res.maxLength, check.value) : check.value, check.message, refs);
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
          addPattern(res, RegExp(`^${escapeLiteralCheckValue(check.value, refs)}`), check.message, refs);
          break;
        case "endsWith":
          addPattern(res, RegExp(`${escapeLiteralCheckValue(check.value, refs)}$`), check.message, refs);
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
          setResponseValueAndErrors(res, "minLength", typeof res.minLength === "number" ? Math.max(res.minLength, check.value) : check.value, check.message, refs);
          setResponseValueAndErrors(res, "maxLength", typeof res.maxLength === "number" ? Math.min(res.maxLength, check.value) : check.value, check.message, refs);
          break;
        case "includes": {
          addPattern(res, RegExp(escapeLiteralCheckValue(check.value, refs)), check.message, refs);
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
              setResponseValueAndErrors(res, "contentEncoding", "base64", check.message, refs);
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
var ALPHA_NUMERIC = new Set("ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvxyz0123456789");
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
  if (schema.format || schema.anyOf?.some((x) => x.format)) {
    if (!schema.anyOf) {
      schema.anyOf = [];
    }
    if (schema.format) {
      schema.anyOf.push({
        format: schema.format,
        ...schema.errorMessage && refs.errorMessages && {
          errorMessage: { format: schema.errorMessage.format }
        }
      });
      delete schema.format;
      if (schema.errorMessage) {
        delete schema.errorMessage.format;
        if (Object.keys(schema.errorMessage).length === 0) {
          delete schema.errorMessage;
        }
      }
    }
    schema.anyOf.push({
      format: value,
      ...message && refs.errorMessages && { errorMessage: { format: message } }
    });
  } else {
    setResponseValueAndErrors(schema, "format", value, message, refs);
  }
}
function addPattern(schema, regex, message, refs) {
  if (schema.pattern || schema.allOf?.some((x) => x.pattern)) {
    if (!schema.allOf) {
      schema.allOf = [];
    }
    if (schema.pattern) {
      schema.allOf.push({
        pattern: schema.pattern,
        ...schema.errorMessage && refs.errorMessages && {
          errorMessage: { pattern: schema.errorMessage.pattern }
        }
      });
      delete schema.pattern;
      if (schema.errorMessage) {
        delete schema.errorMessage.pattern;
        if (Object.keys(schema.errorMessage).length === 0) {
          delete schema.errorMessage;
        }
      }
    }
    schema.allOf.push({
      pattern: stringifyRegExpWithFlags(regex, refs),
      ...message && refs.errorMessages && { errorMessage: { pattern: message } }
    });
  } else {
    setResponseValueAndErrors(schema, "pattern", stringifyRegExpWithFlags(regex, refs), message, refs);
  }
}
function stringifyRegExpWithFlags(regex, refs) {
  if (!refs.applyRegexFlags || !regex.flags) {
    return regex.source;
  }
  const flags = {
    i: regex.flags.includes("i"),
    m: regex.flags.includes("m"),
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
          } else if (source[i + 1] === "-" && source[i + 2]?.match(/[a-z]/)) {
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
  if (refs.target === "openAi") {
    console.warn("Warning: OpenAI may not support records in schemas! Try an array of key-value pairs instead.");
  }
  if (refs.target === "openApi3" && def.keyType?._def.typeName === ZodFirstPartyTypeKind.ZodEnum) {
    return {
      type: "object",
      required: def.keyType._def.values,
      properties: def.keyType._def.values.reduce((acc, key) => ({
        ...acc,
        [key]: parseDef(def.valueType._def, {
          ...refs,
          currentPath: [...refs.currentPath, "properties", key]
        }) ?? parseAnyDef(refs)
      }), {}),
      additionalProperties: refs.rejectedAdditionalProperties
    };
  }
  const schema = {
    type: "object",
    additionalProperties: parseDef(def.valueType._def, {
      ...refs,
      currentPath: [...refs.currentPath, "additionalProperties"]
    }) ?? refs.allowedAdditionalProperties
  };
  if (refs.target === "openApi3") {
    return schema;
  }
  if (def.keyType?._def.typeName === ZodFirstPartyTypeKind.ZodString && def.keyType._def.checks?.length) {
    const { type, ...keyType } = parseStringDef(def.keyType._def, refs);
    return {
      ...schema,
      propertyNames: keyType
    };
  } else if (def.keyType?._def.typeName === ZodFirstPartyTypeKind.ZodEnum) {
    return {
      ...schema,
      propertyNames: {
        enum: def.keyType._def.values
      }
    };
  } else if (def.keyType?._def.typeName === ZodFirstPartyTypeKind.ZodBranded && def.keyType._def.type._def.typeName === ZodFirstPartyTypeKind.ZodString && def.keyType._def.type._def.checks?.length) {
    const { type, ...keyType } = parseBrandedDef(def.keyType._def, refs);
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
  }) || parseAnyDef(refs);
  const values = parseDef(def.valueType._def, {
    ...refs,
    currentPath: [...refs.currentPath, "items", "items", "1"]
  }) || parseAnyDef(refs);
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
  const object2 = def.values;
  const actualKeys = Object.keys(def.values).filter((key) => {
    return typeof object2[object2[key]] !== "number";
  });
  const actualValues = actualKeys.map((key) => object2[key]);
  const parsedTypes = Array.from(new Set(actualValues.map((values) => typeof values)));
  return {
    type: parsedTypes.length === 1 ? parsedTypes[0] === "string" ? "string" : "number" : ["string", "number"],
    enum: actualValues
  };
}
function parseNeverDef(refs) {
  return refs.target === "openAi" ? void 0 : {
    not: parseAnyDef({
      ...refs,
      currentPath: [...refs.currentPath, "not"]
    })
  };
}
function parseNullDef(refs) {
  return refs.target === "openApi3" ? {
    enum: ["null"],
    nullable: true
  } : {
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
  if (refs.target === "openApi3")
    return asAnyOf(def, refs);
  const options = def.options instanceof Map ? Array.from(def.options.values()) : def.options;
  if (options.every((x) => x._def.typeName in primitiveMappings && (!x._def.checks || !x._def.checks.length))) {
    const types = options.reduce((types2, x) => {
      const type = primitiveMappings[x._def.typeName];
      return type && !types2.includes(type) ? [...types2, type] : types2;
    }, []);
    return {
      type: types.length > 1 ? types : types[0]
    };
  } else if (options.every((x) => x._def.typeName === "ZodLiteral" && !x.description)) {
    const types = options.reduce((acc, x) => {
      const type = typeof x._def.value;
      switch (type) {
        case "string":
        case "number":
        case "boolean":
          return [...acc, type];
        case "bigint":
          return [...acc, "integer"];
        case "object":
          if (x._def.value === null)
            return [...acc, "null"];
        case "symbol":
        case "undefined":
        case "function":
        default:
          return acc;
      }
    }, []);
    if (types.length === options.length) {
      const uniqueTypes = types.filter((x, i, a) => a.indexOf(x) === i);
      return {
        type: uniqueTypes.length > 1 ? uniqueTypes : uniqueTypes[0],
        enum: options.reduce((acc, x) => {
          return acc.includes(x._def.value) ? acc : [...acc, x._def.value];
        }, [])
      };
    }
  } else if (options.every((x) => x._def.typeName === "ZodEnum")) {
    return {
      type: "string",
      enum: options.reduce((acc, x) => [
        ...acc,
        ...x._def.values.filter((x2) => !acc.includes(x2))
      ], [])
    };
  }
  return asAnyOf(def, refs);
}
var asAnyOf = (def, refs) => {
  const anyOf = (def.options instanceof Map ? Array.from(def.options.values()) : def.options).map((x, i) => parseDef(x._def, {
    ...refs,
    currentPath: [...refs.currentPath, "anyOf", `${i}`]
  })).filter((x) => !!x && (!refs.strictUnions || typeof x === "object" && Object.keys(x).length > 0));
  return anyOf.length ? { anyOf } : void 0;
};
function parseNullableDef(def, refs) {
  if (["ZodString", "ZodNumber", "ZodBigInt", "ZodBoolean", "ZodNull"].includes(def.innerType._def.typeName) && (!def.innerType._def.checks || !def.innerType._def.checks.length)) {
    if (refs.target === "openApi3") {
      return {
        type: primitiveMappings[def.innerType._def.typeName],
        nullable: true
      };
    }
    return {
      type: [
        primitiveMappings[def.innerType._def.typeName],
        "null"
      ]
    };
  }
  if (refs.target === "openApi3") {
    const base2 = parseDef(def.innerType._def, {
      ...refs,
      currentPath: [...refs.currentPath]
    });
    if (base2 && "$ref" in base2)
      return { allOf: [base2], nullable: true };
    return base2 && { ...base2, nullable: true };
  }
  const base = parseDef(def.innerType._def, {
    ...refs,
    currentPath: [...refs.currentPath, "anyOf", "0"]
  });
  return base && { anyOf: [base, { type: "null" }] };
}
function parseNumberDef(def, refs) {
  const res = {
    type: "number"
  };
  if (!def.checks)
    return res;
  for (const check of def.checks) {
    switch (check.kind) {
      case "int":
        res.type = "integer";
        addErrorMessage(res, "type", check.message, refs);
        break;
      case "min":
        if (refs.target === "jsonSchema7") {
          if (check.inclusive) {
            setResponseValueAndErrors(res, "minimum", check.value, check.message, refs);
          } else {
            setResponseValueAndErrors(res, "exclusiveMinimum", check.value, check.message, refs);
          }
        } else {
          if (!check.inclusive) {
            res.exclusiveMinimum = true;
          }
          setResponseValueAndErrors(res, "minimum", check.value, check.message, refs);
        }
        break;
      case "max":
        if (refs.target === "jsonSchema7") {
          if (check.inclusive) {
            setResponseValueAndErrors(res, "maximum", check.value, check.message, refs);
          } else {
            setResponseValueAndErrors(res, "exclusiveMaximum", check.value, check.message, refs);
          }
        } else {
          if (!check.inclusive) {
            res.exclusiveMaximum = true;
          }
          setResponseValueAndErrors(res, "maximum", check.value, check.message, refs);
        }
        break;
      case "multipleOf":
        setResponseValueAndErrors(res, "multipleOf", check.value, check.message, refs);
        break;
    }
  }
  return res;
}
function parseObjectDef(def, refs) {
  const forceOptionalIntoNullable = refs.target === "openAi";
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
    let propOptional = safeIsOptional(propDef);
    if (propOptional && forceOptionalIntoNullable) {
      if (propDef._def.typeName === "ZodOptional") {
        propDef = propDef._def.innerType;
      }
      if (!propDef.isNullable()) {
        propDef = propDef.nullable();
      }
      propOptional = false;
    }
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
  } catch {
    return true;
  }
}
var parseOptionalDef = (def, refs) => {
  if (refs.currentPath.toString() === refs.propertyPath?.toString()) {
    return parseDef(def.innerType._def, refs);
  }
  const innerSchema = parseDef(def.innerType._def, {
    ...refs,
    currentPath: [...refs.currentPath, "anyOf", "1"]
  });
  return innerSchema ? {
    anyOf: [
      {
        not: parseAnyDef(refs)
      },
      innerSchema
    ]
  } : parseAnyDef(refs);
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
    setResponseValueAndErrors(schema, "minItems", def.minSize.value, def.minSize.message, refs);
  }
  if (def.maxSize) {
    setResponseValueAndErrors(schema, "maxItems", def.maxSize.value, def.maxSize.message, refs);
  }
  return schema;
}
function parseTupleDef(def, refs) {
  if (def.rest) {
    return {
      type: "array",
      minItems: def.items.length,
      items: def.items.map((x, i) => parseDef(x._def, {
        ...refs,
        currentPath: [...refs.currentPath, "items", `${i}`]
      })).reduce((acc, x) => x === void 0 ? acc : [...acc, x], []),
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
      items: def.items.map((x, i) => parseDef(x._def, {
        ...refs,
        currentPath: [...refs.currentPath, "items", `${i}`]
      })).reduce((acc, x) => x === void 0 ? acc : [...acc, x], [])
    };
  }
}
function parseUndefinedDef(refs) {
  return {
    not: parseAnyDef(refs)
  };
}
function parseUnknownDef(refs) {
  return parseAnyDef(refs);
}
var parseReadonlyDef = (def, refs) => {
  return parseDef(def.innerType._def, refs);
};
var selectParser = (def, typeName, refs) => {
  switch (typeName) {
    case ZodFirstPartyTypeKind.ZodString:
      return parseStringDef(def, refs);
    case ZodFirstPartyTypeKind.ZodNumber:
      return parseNumberDef(def, refs);
    case ZodFirstPartyTypeKind.ZodObject:
      return parseObjectDef(def, refs);
    case ZodFirstPartyTypeKind.ZodBigInt:
      return parseBigintDef(def, refs);
    case ZodFirstPartyTypeKind.ZodBoolean:
      return parseBooleanDef();
    case ZodFirstPartyTypeKind.ZodDate:
      return parseDateDef(def, refs);
    case ZodFirstPartyTypeKind.ZodUndefined:
      return parseUndefinedDef(refs);
    case ZodFirstPartyTypeKind.ZodNull:
      return parseNullDef(refs);
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
      return parseLiteralDef(def, refs);
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
      return parseNeverDef(refs);
    case ZodFirstPartyTypeKind.ZodEffects:
      return parseEffectsDef(def, refs);
    case ZodFirstPartyTypeKind.ZodAny:
      return parseAnyDef(refs);
    case ZodFirstPartyTypeKind.ZodUnknown:
      return parseUnknownDef(refs);
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
  const seenItem = refs.seen.get(def);
  if (refs.override) {
    const overrideResult = refs.override?.(def, refs, seenItem, forceResolution);
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
        console.warn(`Recursive reference detected at ${refs.currentPath.join("/")}! Defaulting to any`);
        return parseAnyDef(refs);
      }
      return refs.$refStrategy === "seen" ? parseAnyDef(refs) : void 0;
    }
  }
};
var addMeta = (def, refs, jsonSchema2) => {
  if (def.description) {
    jsonSchema2.description = def.description;
    if (refs.markdownDescription) {
      jsonSchema2.markdownDescription = def.description;
    }
  }
  return jsonSchema2;
};
var zodToJsonSchema = (schema, options) => {
  const refs = getRefs(options);
  let definitions = typeof options === "object" && options.definitions ? Object.entries(options.definitions).reduce((acc, [name18, schema2]) => ({
    ...acc,
    [name18]: parseDef(schema2._def, {
      ...refs,
      currentPath: [...refs.basePath, refs.definitionPath, name18]
    }, true) ?? parseAnyDef(refs)
  }), {}) : void 0;
  const name17 = typeof options === "string" ? options : options?.nameStrategy === "title" ? void 0 : options?.name;
  const main = parseDef(schema._def, name17 === void 0 ? refs : {
    ...refs,
    currentPath: [...refs.basePath, refs.definitionPath, name17]
  }, false) ?? parseAnyDef(refs);
  const title = typeof options === "object" && options.name !== void 0 && options.nameStrategy === "title" ? options.name : void 0;
  if (title !== void 0) {
    main.title = title;
  }
  if (refs.flags.hasReferencedOpenAiAnyType) {
    if (!definitions) {
      definitions = {};
    }
    if (!definitions[refs.openAiAnyTypeName]) {
      definitions[refs.openAiAnyTypeName] = {
        // Skipping "object" as no properties can be defined and additionalProperties must be "false"
        type: ["string", "number", "integer", "boolean", "array", "null"],
        items: {
          $ref: refs.$refStrategy === "relative" ? "1" : [
            ...refs.basePath,
            refs.definitionPath,
            refs.openAiAnyTypeName
          ].join("/")
        }
      };
    }
  }
  const combined = name17 === void 0 ? definitions ? {
    ...main,
    [refs.definitionPath]: definitions
  } : main : {
    $ref: [
      ...refs.$refStrategy === "relative" ? [] : refs.basePath,
      refs.definitionPath,
      name17
    ].join("/"),
    [refs.definitionPath]: {
      ...definitions,
      [name17]: main
    }
  };
  if (refs.target === "jsonSchema7") {
    combined.$schema = "http://json-schema.org/draft-07/schema#";
  } else if (refs.target === "jsonSchema2019-09" || refs.target === "openAi") {
    combined.$schema = "https://json-schema.org/draft/2019-09/schema#";
  }
  if (refs.target === "openAi" && ("anyOf" in combined || "oneOf" in combined || "allOf" in combined || "type" in combined && Array.isArray(combined.type))) {
    console.warn("Warning: OpenAI may not support schemas with unions as roots! Try wrapping it in an object property.");
  }
  return combined;
};
var esm_default = zodToJsonSchema;
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
function parsePartialJson(jsonText) {
  if (jsonText === void 0) {
    return { value: void 0, state: "undefined-input" };
  }
  let result = safeParseJSON({ text: jsonText });
  if (result.success) {
    return { value: result.value, state: "successful-parse" };
  }
  result = safeParseJSON({ text: fixJson(jsonText) });
  if (result.success) {
    return { value: result.value, state: "repaired-parse" };
  }
  return { value: void 0, state: "failed-parse" };
}
var textStreamPart2 = {
  code: "0",
  name: "text",
  parse: (value) => {
    if (typeof value !== "string") {
      throw new Error('"text" parts expect a string value.');
    }
    return { type: "text", value };
  }
};
var dataStreamPart = {
  code: "2",
  name: "data",
  parse: (value) => {
    if (!Array.isArray(value)) {
      throw new Error('"data" parts expect an array value.');
    }
    return { type: "data", value };
  }
};
var errorStreamPart2 = {
  code: "3",
  name: "error",
  parse: (value) => {
    if (typeof value !== "string") {
      throw new Error('"error" parts expect a string value.');
    }
    return { type: "error", value };
  }
};
var messageAnnotationsStreamPart = {
  code: "8",
  name: "message_annotations",
  parse: (value) => {
    if (!Array.isArray(value)) {
      throw new Error('"message_annotations" parts expect an array value.');
    }
    return { type: "message_annotations", value };
  }
};
var toolCallStreamPart = {
  code: "9",
  name: "tool_call",
  parse: (value) => {
    if (value == null || typeof value !== "object" || !("toolCallId" in value) || typeof value.toolCallId !== "string" || !("toolName" in value) || typeof value.toolName !== "string" || !("args" in value) || typeof value.args !== "object") {
      throw new Error(
        '"tool_call" parts expect an object with a "toolCallId", "toolName", and "args" property.'
      );
    }
    return {
      type: "tool_call",
      value
    };
  }
};
var toolResultStreamPart = {
  code: "a",
  name: "tool_result",
  parse: (value) => {
    if (value == null || typeof value !== "object" || !("toolCallId" in value) || typeof value.toolCallId !== "string" || !("result" in value)) {
      throw new Error(
        '"tool_result" parts expect an object with a "toolCallId" and a "result" property.'
      );
    }
    return {
      type: "tool_result",
      value
    };
  }
};
var toolCallStreamingStartStreamPart = {
  code: "b",
  name: "tool_call_streaming_start",
  parse: (value) => {
    if (value == null || typeof value !== "object" || !("toolCallId" in value) || typeof value.toolCallId !== "string" || !("toolName" in value) || typeof value.toolName !== "string") {
      throw new Error(
        '"tool_call_streaming_start" parts expect an object with a "toolCallId" and "toolName" property.'
      );
    }
    return {
      type: "tool_call_streaming_start",
      value
    };
  }
};
var toolCallDeltaStreamPart = {
  code: "c",
  name: "tool_call_delta",
  parse: (value) => {
    if (value == null || typeof value !== "object" || !("toolCallId" in value) || typeof value.toolCallId !== "string" || !("argsTextDelta" in value) || typeof value.argsTextDelta !== "string") {
      throw new Error(
        '"tool_call_delta" parts expect an object with a "toolCallId" and "argsTextDelta" property.'
      );
    }
    return {
      type: "tool_call_delta",
      value
    };
  }
};
var finishMessageStreamPart = {
  code: "d",
  name: "finish_message",
  parse: (value) => {
    if (value == null || typeof value !== "object" || !("finishReason" in value) || typeof value.finishReason !== "string") {
      throw new Error(
        '"finish_message" parts expect an object with a "finishReason" property.'
      );
    }
    const result = {
      finishReason: value.finishReason
    };
    if ("usage" in value && value.usage != null && typeof value.usage === "object" && "promptTokens" in value.usage && "completionTokens" in value.usage) {
      result.usage = {
        promptTokens: typeof value.usage.promptTokens === "number" ? value.usage.promptTokens : Number.NaN,
        completionTokens: typeof value.usage.completionTokens === "number" ? value.usage.completionTokens : Number.NaN
      };
    }
    return {
      type: "finish_message",
      value: result
    };
  }
};
var finishStepStreamPart = {
  code: "e",
  name: "finish_step",
  parse: (value) => {
    if (value == null || typeof value !== "object" || !("finishReason" in value) || typeof value.finishReason !== "string") {
      throw new Error(
        '"finish_step" parts expect an object with a "finishReason" property.'
      );
    }
    const result = {
      finishReason: value.finishReason,
      isContinued: false
    };
    if ("usage" in value && value.usage != null && typeof value.usage === "object" && "promptTokens" in value.usage && "completionTokens" in value.usage) {
      result.usage = {
        promptTokens: typeof value.usage.promptTokens === "number" ? value.usage.promptTokens : Number.NaN,
        completionTokens: typeof value.usage.completionTokens === "number" ? value.usage.completionTokens : Number.NaN
      };
    }
    if ("isContinued" in value && typeof value.isContinued === "boolean") {
      result.isContinued = value.isContinued;
    }
    return {
      type: "finish_step",
      value: result
    };
  }
};
var startStepStreamPart = {
  code: "f",
  name: "start_step",
  parse: (value) => {
    if (value == null || typeof value !== "object" || !("messageId" in value) || typeof value.messageId !== "string") {
      throw new Error(
        '"start_step" parts expect an object with an "id" property.'
      );
    }
    return {
      type: "start_step",
      value: {
        messageId: value.messageId
      }
    };
  }
};
var reasoningStreamPart = {
  code: "g",
  name: "reasoning",
  parse: (value) => {
    if (typeof value !== "string") {
      throw new Error('"reasoning" parts expect a string value.');
    }
    return { type: "reasoning", value };
  }
};
var sourcePart = {
  code: "h",
  name: "source",
  parse: (value) => {
    if (value == null || typeof value !== "object") {
      throw new Error('"source" parts expect a Source object.');
    }
    return {
      type: "source",
      value
    };
  }
};
var redactedReasoningStreamPart = {
  code: "i",
  name: "redacted_reasoning",
  parse: (value) => {
    if (value == null || typeof value !== "object" || !("data" in value) || typeof value.data !== "string") {
      throw new Error(
        '"redacted_reasoning" parts expect an object with a "data" property.'
      );
    }
    return { type: "redacted_reasoning", value: { data: value.data } };
  }
};
var reasoningSignatureStreamPart = {
  code: "j",
  name: "reasoning_signature",
  parse: (value) => {
    if (value == null || typeof value !== "object" || !("signature" in value) || typeof value.signature !== "string") {
      throw new Error(
        '"reasoning_signature" parts expect an object with a "signature" property.'
      );
    }
    return {
      type: "reasoning_signature",
      value: { signature: value.signature }
    };
  }
};
var fileStreamPart = {
  code: "k",
  name: "file",
  parse: (value) => {
    if (value == null || typeof value !== "object" || !("data" in value) || typeof value.data !== "string" || !("mimeType" in value) || typeof value.mimeType !== "string") {
      throw new Error(
        '"file" parts expect an object with a "data" and "mimeType" property.'
      );
    }
    return { type: "file", value };
  }
};
var dataStreamParts = [
  textStreamPart2,
  dataStreamPart,
  errorStreamPart2,
  messageAnnotationsStreamPart,
  toolCallStreamPart,
  toolResultStreamPart,
  toolCallStreamingStartStreamPart,
  toolCallDeltaStreamPart,
  finishMessageStreamPart,
  finishStepStreamPart,
  startStepStreamPart,
  reasoningStreamPart,
  sourcePart,
  redactedReasoningStreamPart,
  reasoningSignatureStreamPart,
  fileStreamPart
];
Object.fromEntries(
  dataStreamParts.map((part) => [part.code, part])
);
Object.fromEntries(
  dataStreamParts.map((part) => [part.name, part.code])
);
function formatDataStreamPart(type, value) {
  const streamPart = dataStreamParts.find((part) => part.name === type);
  if (!streamPart) {
    throw new Error(`Invalid stream part type: ${type}`);
  }
  return `${streamPart.code}:${JSON.stringify(value)}
`;
}
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
function zodSchema(zodSchema2, options) {
  var _a17;
  const useReferences = (_a17 = void 0 ) != null ? _a17 : false;
  return jsonSchema(
    esm_default(zodSchema2, {
      $refStrategy: useReferences ? "root" : "none",
      target: "jsonSchema7"
      // note: openai mode breaks various gemini conversions
    }),
    {
      validate: (value) => {
        const result = zodSchema2.safeParse(value);
        return result.success ? { success: true, value: result.data } : { success: false, error: result.error };
      }
    }
  );
}
var schemaSymbol = /* @__PURE__ */ Symbol.for("vercel.ai.schema");
function jsonSchema(jsonSchema2, {
  validate
} = {}) {
  return {
    [schemaSymbol]: true,
    _type: void 0,
    // should never be used directly
    [validatorSymbol]: true,
    jsonSchema: jsonSchema2,
    validate
  };
}
function isSchema(value) {
  return typeof value === "object" && value !== null && schemaSymbol in value && value[schemaSymbol] === true && "jsonSchema" in value && "validate" in value;
}
function asSchema(schema) {
  return isSchema(schema) ? schema : zodSchema(schema);
}
var _globalThis = typeof globalThis === "object" ? globalThis : global;
var VERSION = "1.9.0";
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
var isCompatible = _makeCompatibilityCheck(VERSION);
var major = VERSION.split(".")[0];
var GLOBAL_OPENTELEMETRY_API_KEY = /* @__PURE__ */ Symbol.for("opentelemetry.js.api." + major);
var _global = _globalThis;
function registerGlobal(type, instance, diag, allowOverride) {
  var _a17;
  if (allowOverride === void 0) {
    allowOverride = false;
  }
  var api = _global[GLOBAL_OPENTELEMETRY_API_KEY] = (_a17 = _global[GLOBAL_OPENTELEMETRY_API_KEY]) !== null && _a17 !== void 0 ? _a17 : {
    version: VERSION
  };
  if (!allowOverride && api[type]) {
    var err = new Error("@opentelemetry/api: Attempted duplicate registration of API: " + type);
    diag.error(err.stack || err.message);
    return false;
  }
  if (api.version !== VERSION) {
    var err = new Error("@opentelemetry/api: Registration of version v" + api.version + " for " + type + " does not match previously registered API v" + VERSION);
    diag.error(err.stack || err.message);
    return false;
  }
  api[type] = instance;
  diag.debug("@opentelemetry/api: Registered a global for " + type + " v" + VERSION + ".");
  return true;
}
function getGlobal(type) {
  var _a17, _b;
  var globalVersion = (_a17 = _global[GLOBAL_OPENTELEMETRY_API_KEY]) === null || _a17 === void 0 ? void 0 : _a17.version;
  if (!globalVersion || !isCompatible(globalVersion)) {
    return;
  }
  return (_b = _global[GLOBAL_OPENTELEMETRY_API_KEY]) === null || _b === void 0 ? void 0 : _b[type];
}
function unregisterGlobal(type, diag) {
  diag.debug("@opentelemetry/api: Unregistering a global for " + type + " v" + VERSION + ".");
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
        var _a17, _b, _c;
        if (optionsOrLogLevel === void 0) {
          optionsOrLogLevel = { logLevel: DiagLogLevel.INFO };
        }
        if (logger === self) {
          var err = new Error("Cannot use diag as the logger for itself. Please use a DiagLogger implementation like ConsoleDiagLogger or a custom implementation");
          self.error((_a17 = err.stack) !== null && _a17 !== void 0 ? _a17 : err.message);
          return false;
        }
        if (typeof optionsOrLogLevel === "number") {
          optionsOrLogLevel = {
            logLevel: optionsOrLogLevel
          };
        }
        var oldLogger = getGlobal("diag");
        var newLogger = createLogLevelDiagLogger((_b = optionsOrLogLevel.logLevel) !== null && _b !== void 0 ? _b : DiagLogLevel.INFO, logger);
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
      var _a17;
      var args = [];
      for (var _i = 3; _i < arguments.length; _i++) {
        args[_i - 3] = arguments[_i];
      }
      return (_a17 = this._getContextManager()).with.apply(_a17, __spreadArray4([context, fn, thisArg], __read4(args), false));
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
  var _a17;
  return (_a17 = getSpan(context)) === null || _a17 === void 0 ? void 0 : _a17.spanContext();
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
    NoopTracer2.prototype.startSpan = function(name17, options, context) {
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
    NoopTracer2.prototype.startActiveSpan = function(name17, arg2, arg3, arg4) {
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
      var span = this.startSpan(name17, opts, parentContext);
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
    function ProxyTracer2(_provider, name17, version, options) {
      this._provider = _provider;
      this.name = name17;
      this.version = version;
      this.options = options;
    }
    ProxyTracer2.prototype.startSpan = function(name17, options, context) {
      return this._getTracer().startSpan(name17, options, context);
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
    ProxyTracerProvider2.prototype.getTracer = function(name17, version, options) {
      var _a17;
      return (_a17 = this.getDelegateTracer(name17, version, options)) !== null && _a17 !== void 0 ? _a17 : new ProxyTracer(this, name17, version, options);
    };
    ProxyTracerProvider2.prototype.getDelegate = function() {
      var _a17;
      return (_a17 = this._delegate) !== null && _a17 !== void 0 ? _a17 : NOOP_TRACER_PROVIDER;
    };
    ProxyTracerProvider2.prototype.setDelegate = function(delegate) {
      this._delegate = delegate;
    };
    ProxyTracerProvider2.prototype.getDelegateTracer = function(name17, version, options) {
      var _a17;
      return (_a17 = this._delegate) === null || _a17 === void 0 ? void 0 : _a17.getTracer(name17, version, options);
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
    TraceAPI2.prototype.getTracer = function(name17, version) {
      return this.getTracerProvider().getTracer(name17, version);
    };
    TraceAPI2.prototype.disable = function() {
      unregisterGlobal(API_NAME3, DiagAPI.instance());
      this._proxyTracerProvider = new ProxyTracerProvider();
    };
    return TraceAPI2;
  })()
);
var trace = TraceAPI.getInstance();
var __defProp2 = Object.defineProperty;
var __export = (target, all) => {
  for (var name17 in all)
    __defProp2(target, name17, { get: all[name17], enumerable: true });
};
function prepareResponseHeaders(headers, {
  contentType,
  dataStreamVersion
}) {
  const responseHeaders = new Headers(headers != null ? headers : {});
  if (!responseHeaders.has("Content-Type")) {
    responseHeaders.set("Content-Type", contentType);
  }
  if (dataStreamVersion !== void 0) {
    responseHeaders.set("X-Vercel-AI-Data-Stream", dataStreamVersion);
  }
  return responseHeaders;
}
function prepareOutgoingHttpHeaders(headers, {
  contentType,
  dataStreamVersion
}) {
  const outgoingHeaders = {};
  if (headers != null) {
    for (const [key, value] of Object.entries(headers)) {
      outgoingHeaders[key] = value;
    }
  }
  if (outgoingHeaders["Content-Type"] == null) {
    outgoingHeaders["Content-Type"] = contentType;
  }
  if (dataStreamVersion !== void 0) {
    outgoingHeaders["X-Vercel-AI-Data-Stream"] = dataStreamVersion;
  }
  return outgoingHeaders;
}
function writeToServerResponse({
  response,
  status,
  statusText,
  headers,
  stream
}) {
  response.writeHead(status != null ? status : 200, statusText, headers);
  const reader = stream.getReader();
  const read = async () => {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done)
          break;
        response.write(value);
      }
    } catch (error) {
      throw error;
    } finally {
      response.end();
    }
  };
  read();
}
var UnsupportedModelVersionError = class extends AISDKError {
  constructor() {
    super({
      name: "AI_UnsupportedModelVersionError",
      message: `Unsupported model version. AI SDK 4 only supports models that implement specification version "v1". Please upgrade to AI SDK 5 to use this model.`
    });
  }
};
var name8 = "AI_InvalidArgumentError";
var marker9 = `vercel.ai.error.${name8}`;
var symbol9 = Symbol.for(marker9);
var _a9;
var InvalidArgumentError2 = class extends AISDKError {
  constructor({
    parameter,
    value,
    message
  }) {
    super({
      name: name8,
      message: `Invalid argument for parameter ${parameter}: ${message}`
    });
    this[_a9] = true;
    this.parameter = parameter;
    this.value = value;
  }
  static isInstance(error) {
    return AISDKError.hasMarker(error, marker9);
  }
};
_a9 = symbol9;
var name22 = "AI_RetryError";
var marker22 = `vercel.ai.error.${name22}`;
var symbol22 = Symbol.for(marker22);
var _a22;
var RetryError = class extends AISDKError {
  constructor({
    message,
    reason,
    errors
  }) {
    super({ name: name22, message });
    this[_a22] = true;
    this.reason = reason;
    this.errors = errors;
    this.lastError = errors[errors.length - 1];
  }
  static isInstance(error) {
    return AISDKError.hasMarker(error, marker22);
  }
};
_a22 = symbol22;
var retryWithExponentialBackoff = ({
  maxRetries = 2,
  initialDelayInMs = 2e3,
  backoffFactor = 2
} = {}) => async (f) => _retryWithExponentialBackoff(f, {
  maxRetries,
  delayInMs: initialDelayInMs,
  backoffFactor
});
async function _retryWithExponentialBackoff(f, {
  maxRetries,
  delayInMs,
  backoffFactor
}, errors = []) {
  try {
    return await f();
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }
    if (maxRetries === 0) {
      throw error;
    }
    const errorMessage = getErrorMessage2(error);
    const newErrors = [...errors, error];
    const tryNumber = newErrors.length;
    if (tryNumber > maxRetries) {
      throw new RetryError({
        message: `Failed after ${tryNumber} attempts. Last error: ${errorMessage}`,
        reason: "maxRetriesExceeded",
        errors: newErrors
      });
    }
    if (error instanceof Error && APICallError.isInstance(error) && error.isRetryable === true && tryNumber <= maxRetries) {
      await delay(delayInMs);
      return _retryWithExponentialBackoff(
        f,
        { maxRetries, delayInMs: backoffFactor * delayInMs, backoffFactor },
        newErrors
      );
    }
    if (tryNumber === 1) {
      throw error;
    }
    throw new RetryError({
      message: `Failed after ${tryNumber} attempts with non-retryable error: '${errorMessage}'`,
      reason: "errorNotRetryable",
      errors: newErrors
    });
  }
}
function prepareRetries({
  maxRetries
}) {
  if (maxRetries != null) {
    if (!Number.isInteger(maxRetries)) {
      throw new InvalidArgumentError2({
        parameter: "maxRetries",
        value: maxRetries,
        message: "maxRetries must be an integer"
      });
    }
    if (maxRetries < 0) {
      throw new InvalidArgumentError2({
        parameter: "maxRetries",
        value: maxRetries,
        message: "maxRetries must be >= 0"
      });
    }
  }
  const maxRetriesResult = maxRetries != null ? maxRetries : 2;
  return {
    maxRetries: maxRetriesResult,
    retry: retryWithExponentialBackoff({ maxRetries: maxRetriesResult })
  };
}
function assembleOperationName({
  operationId,
  telemetry
}) {
  return {
    // standardized operation and resource name:
    "operation.name": `${operationId}${(telemetry == null ? void 0 : telemetry.functionId) != null ? ` ${telemetry.functionId}` : ""}`,
    "resource.name": telemetry == null ? void 0 : telemetry.functionId,
    // detailed, AI SDK specific data:
    "ai.operationId": operationId,
    "ai.telemetry.functionId": telemetry == null ? void 0 : telemetry.functionId
  };
}
function getBaseTelemetryAttributes({
  model,
  settings,
  telemetry,
  headers
}) {
  var _a17;
  return {
    "ai.model.provider": model.provider,
    "ai.model.id": model.modelId,
    // settings:
    ...Object.entries(settings).reduce((attributes, [key, value]) => {
      attributes[`ai.settings.${key}`] = value;
      return attributes;
    }, {}),
    // add metadata as attributes:
    ...Object.entries((_a17 = telemetry == null ? void 0 : telemetry.metadata) != null ? _a17 : {}).reduce(
      (attributes, [key, value]) => {
        attributes[`ai.telemetry.metadata.${key}`] = value;
        return attributes;
      },
      {}
    ),
    // request headers
    ...Object.entries(headers != null ? headers : {}).reduce((attributes, [key, value]) => {
      if (value !== void 0) {
        attributes[`ai.request.headers.${key}`] = value;
      }
      return attributes;
    }, {})
  };
}
var noopTracer = {
  startSpan() {
    return noopSpan;
  },
  startActiveSpan(name17, arg1, arg2, arg3) {
    if (typeof arg1 === "function") {
      return arg1(noopSpan);
    }
    if (typeof arg2 === "function") {
      return arg2(noopSpan);
    }
    if (typeof arg3 === "function") {
      return arg3(noopSpan);
    }
  }
};
var noopSpan = {
  spanContext() {
    return noopSpanContext;
  },
  setAttribute() {
    return this;
  },
  setAttributes() {
    return this;
  },
  addEvent() {
    return this;
  },
  addLink() {
    return this;
  },
  addLinks() {
    return this;
  },
  setStatus() {
    return this;
  },
  updateName() {
    return this;
  },
  end() {
    return this;
  },
  isRecording() {
    return false;
  },
  recordException() {
    return this;
  }
};
var noopSpanContext = {
  traceId: "",
  spanId: "",
  traceFlags: 0
};
function getTracer({
  isEnabled = false,
  tracer
} = {}) {
  if (!isEnabled) {
    return noopTracer;
  }
  if (tracer) {
    return tracer;
  }
  return trace.getTracer("ai");
}
function recordSpan({
  name: name17,
  tracer,
  attributes,
  fn,
  endWhenDone = true
}) {
  return tracer.startActiveSpan(name17, { attributes }, async (span) => {
    try {
      const result = await fn(span);
      if (endWhenDone) {
        span.end();
      }
      return result;
    } catch (error) {
      try {
        recordErrorOnSpan(span, error);
      } finally {
        span.end();
      }
      throw error;
    }
  });
}
function recordErrorOnSpan(span, error) {
  if (error instanceof Error) {
    span.recordException({
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message
    });
  } else {
    span.setStatus({ code: SpanStatusCode.ERROR });
  }
}
function selectTelemetryAttributes({
  telemetry,
  attributes
}) {
  if ((telemetry == null ? void 0 : telemetry.isEnabled) !== true) {
    return {};
  }
  return Object.entries(attributes).reduce((attributes2, [key, value]) => {
    if (value === void 0) {
      return attributes2;
    }
    if (typeof value === "object" && "input" in value && typeof value.input === "function") {
      if ((telemetry == null ? void 0 : telemetry.recordInputs) === false) {
        return attributes2;
      }
      const result = value.input();
      return result === void 0 ? attributes2 : { ...attributes2, [key]: result };
    }
    if (typeof value === "object" && "output" in value && typeof value.output === "function") {
      if ((telemetry == null ? void 0 : telemetry.recordOutputs) === false) {
        return attributes2;
      }
      const result = value.output();
      return result === void 0 ? attributes2 : { ...attributes2, [key]: result };
    }
    return { ...attributes2, [key]: value };
  }, {});
}
var DefaultGeneratedFile = class {
  constructor({
    data,
    mimeType
  }) {
    const isUint8Array = data instanceof Uint8Array;
    this.base64Data = isUint8Array ? void 0 : data;
    this.uint8ArrayData = isUint8Array ? data : void 0;
    this.mimeType = mimeType;
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
  constructor(options) {
    super(options);
    this.type = "file";
  }
};
var imageMimeTypeSignatures = [
  {
    mimeType: "image/gif",
    bytesPrefix: [71, 73, 70],
    base64Prefix: "R0lG"
  },
  {
    mimeType: "image/png",
    bytesPrefix: [137, 80, 78, 71],
    base64Prefix: "iVBORw"
  },
  {
    mimeType: "image/jpeg",
    bytesPrefix: [255, 216],
    base64Prefix: "/9j/"
  },
  {
    mimeType: "image/webp",
    bytesPrefix: [82, 73, 70, 70],
    base64Prefix: "UklGRg"
  },
  {
    mimeType: "image/bmp",
    bytesPrefix: [66, 77],
    base64Prefix: "Qk"
  },
  {
    mimeType: "image/tiff",
    bytesPrefix: [73, 73, 42, 0],
    base64Prefix: "SUkqAA"
  },
  {
    mimeType: "image/tiff",
    bytesPrefix: [77, 77, 0, 42],
    base64Prefix: "TU0AKg"
  },
  {
    mimeType: "image/avif",
    bytesPrefix: [
      0,
      0,
      0,
      32,
      102,
      116,
      121,
      112,
      97,
      118,
      105,
      102
    ],
    base64Prefix: "AAAAIGZ0eXBhdmlm"
  },
  {
    mimeType: "image/heic",
    bytesPrefix: [
      0,
      0,
      0,
      32,
      102,
      116,
      121,
      112,
      104,
      101,
      105,
      99
    ],
    base64Prefix: "AAAAIGZ0eXBoZWlj"
  }
];
var stripID3 = (data) => {
  const bytes = typeof data === "string" ? convertBase64ToUint8Array(data) : data;
  const id3Size = (bytes[6] & 127) << 21 | (bytes[7] & 127) << 14 | (bytes[8] & 127) << 7 | bytes[9] & 127;
  return bytes.slice(id3Size + 10);
};
function stripID3TagsIfPresent(data) {
  const hasId3 = typeof data === "string" && data.startsWith("SUQz") || typeof data !== "string" && data.length > 10 && data[0] === 73 && // 'I'
  data[1] === 68 && // 'D'
  data[2] === 51;
  return hasId3 ? stripID3(data) : data;
}
function detectMimeType({
  data,
  signatures
}) {
  const processedData = stripID3TagsIfPresent(data);
  for (const signature of signatures) {
    if (typeof processedData === "string" ? processedData.startsWith(signature.base64Prefix) : processedData.length >= signature.bytesPrefix.length && signature.bytesPrefix.every(
      (byte, index) => processedData[index] === byte
    )) {
      return signature.mimeType;
    }
  }
  return void 0;
}
var name42 = "AI_NoObjectGeneratedError";
var marker42 = `vercel.ai.error.${name42}`;
var symbol42 = Symbol.for(marker42);
var _a42;
var NoObjectGeneratedError = class extends AISDKError {
  constructor({
    message = "No object generated.",
    cause,
    text: text2,
    response,
    usage,
    finishReason
  }) {
    super({ name: name42, message, cause });
    this[_a42] = true;
    this.text = text2;
    this.response = response;
    this.usage = usage;
    this.finishReason = finishReason;
  }
  static isInstance(error) {
    return AISDKError.hasMarker(error, marker42);
  }
};
_a42 = symbol42;
var name52 = "AI_DownloadError";
var marker52 = `vercel.ai.error.${name52}`;
var symbol52 = Symbol.for(marker52);
var _a52;
var DownloadError = class extends AISDKError {
  constructor({
    url,
    statusCode,
    statusText,
    cause,
    message = cause == null ? `Failed to download ${url}: ${statusCode} ${statusText}` : `Failed to download ${url}: ${cause}`
  }) {
    super({ name: name52, message, cause });
    this[_a52] = true;
    this.url = url;
    this.statusCode = statusCode;
    this.statusText = statusText;
  }
  static isInstance(error) {
    return AISDKError.hasMarker(error, marker52);
  }
};
_a52 = symbol52;
async function download({ url }) {
  var _a17;
  const urlText = url.toString();
  try {
    const response = await fetch(urlText);
    if (!response.ok) {
      throw new DownloadError({
        url: urlText,
        statusCode: response.status,
        statusText: response.statusText
      });
    }
    return {
      data: new Uint8Array(await response.arrayBuffer()),
      mimeType: (_a17 = response.headers.get("content-type")) != null ? _a17 : void 0
    };
  } catch (error) {
    if (DownloadError.isInstance(error)) {
      throw error;
    }
    throw new DownloadError({ url: urlText, cause: error });
  }
}
var name62 = "AI_InvalidDataContentError";
var marker62 = `vercel.ai.error.${name62}`;
var symbol62 = Symbol.for(marker62);
var _a62;
var InvalidDataContentError = class extends AISDKError {
  constructor({
    content,
    cause,
    message = `Invalid data content. Expected a base64 string, Uint8Array, ArrayBuffer, or Buffer, but got ${typeof content}.`
  }) {
    super({ name: name62, message, cause });
    this[_a62] = true;
    this.content = content;
  }
  static isInstance(error) {
    return AISDKError.hasMarker(error, marker62);
  }
};
_a62 = symbol62;
var dataContentSchema = unionType([
  stringType(),
  instanceOfType(Uint8Array),
  instanceOfType(ArrayBuffer),
  custom$1(
    // Buffer might not be available in some environments such as CloudFlare:
    (value) => {
      var _a17, _b;
      return (_b = (_a17 = globalThis.Buffer) == null ? void 0 : _a17.isBuffer(value)) != null ? _b : false;
    },
    { message: "Must be a Buffer" }
  )
]);
function convertDataContentToBase64String(content) {
  if (typeof content === "string") {
    return content;
  }
  if (content instanceof ArrayBuffer) {
    return convertUint8ArrayToBase64(new Uint8Array(content));
  }
  return convertUint8ArrayToBase64(content);
}
function convertDataContentToUint8Array(content) {
  if (content instanceof Uint8Array) {
    return content;
  }
  if (typeof content === "string") {
    try {
      return convertBase64ToUint8Array(content);
    } catch (error) {
      throw new InvalidDataContentError({
        message: "Invalid data content. Content string is not a base64-encoded media.",
        content,
        cause: error
      });
    }
  }
  if (content instanceof ArrayBuffer) {
    return new Uint8Array(content);
  }
  throw new InvalidDataContentError({ content });
}
function convertUint8ArrayToText(uint8Array) {
  try {
    return new TextDecoder().decode(uint8Array);
  } catch (error) {
    throw new Error("Error decoding Uint8Array to text");
  }
}
var name72 = "AI_InvalidMessageRoleError";
var marker72 = `vercel.ai.error.${name72}`;
var symbol72 = Symbol.for(marker72);
var _a72;
var InvalidMessageRoleError = class extends AISDKError {
  constructor({
    role,
    message = `Invalid message role: '${role}'. Must be one of: "system", "user", "assistant", "tool".`
  }) {
    super({ name: name72, message });
    this[_a72] = true;
    this.role = role;
  }
  static isInstance(error) {
    return AISDKError.hasMarker(error, marker72);
  }
};
_a72 = symbol72;
function splitDataUrl(dataUrl) {
  try {
    const [header, base64Content] = dataUrl.split(",");
    return {
      mimeType: header.split(";")[0].split(":")[1],
      base64Content
    };
  } catch (error) {
    return {
      mimeType: void 0,
      base64Content: void 0
    };
  }
}
async function convertToLanguageModelPrompt({
  prompt,
  modelSupportsImageUrls = true,
  modelSupportsUrl = () => false,
  downloadImplementation = download
}) {
  const downloadedAssets = await downloadAssets(
    prompt.messages,
    downloadImplementation,
    modelSupportsImageUrls,
    modelSupportsUrl
  );
  return [
    ...prompt.system != null ? [{ role: "system", content: prompt.system }] : [],
    ...prompt.messages.map(
      (message) => convertToLanguageModelMessage(message, downloadedAssets)
    )
  ];
}
function convertToLanguageModelMessage(message, downloadedAssets) {
  var _a17, _b, _c, _d, _e, _f;
  const role = message.role;
  switch (role) {
    case "system": {
      return {
        role: "system",
        content: message.content,
        providerMetadata: (_a17 = message.providerOptions) != null ? _a17 : message.experimental_providerMetadata
      };
    }
    case "user": {
      if (typeof message.content === "string") {
        return {
          role: "user",
          content: [{ type: "text", text: message.content }],
          providerMetadata: (_b = message.providerOptions) != null ? _b : message.experimental_providerMetadata
        };
      }
      return {
        role: "user",
        content: message.content.map((part) => convertPartToLanguageModelPart(part, downloadedAssets)).filter((part) => part.type !== "text" || part.text !== ""),
        providerMetadata: (_c = message.providerOptions) != null ? _c : message.experimental_providerMetadata
      };
    }
    case "assistant": {
      if (typeof message.content === "string") {
        return {
          role: "assistant",
          content: [{ type: "text", text: message.content }],
          providerMetadata: (_d = message.providerOptions) != null ? _d : message.experimental_providerMetadata
        };
      }
      return {
        role: "assistant",
        content: message.content.filter(
          // remove empty text parts:
          (part) => part.type !== "text" || part.text !== ""
        ).map((part) => {
          var _a18;
          const providerOptions = (_a18 = part.providerOptions) != null ? _a18 : part.experimental_providerMetadata;
          switch (part.type) {
            case "file": {
              return {
                type: "file",
                data: part.data instanceof URL ? part.data : convertDataContentToBase64String(part.data),
                filename: part.filename,
                mimeType: part.mimeType,
                providerMetadata: providerOptions
              };
            }
            case "reasoning": {
              return {
                type: "reasoning",
                text: part.text,
                signature: part.signature,
                providerMetadata: providerOptions
              };
            }
            case "redacted-reasoning": {
              return {
                type: "redacted-reasoning",
                data: part.data,
                providerMetadata: providerOptions
              };
            }
            case "text": {
              return {
                type: "text",
                text: part.text,
                providerMetadata: providerOptions
              };
            }
            case "tool-call": {
              return {
                type: "tool-call",
                toolCallId: part.toolCallId,
                toolName: part.toolName,
                args: part.args,
                providerMetadata: providerOptions
              };
            }
          }
        }),
        providerMetadata: (_e = message.providerOptions) != null ? _e : message.experimental_providerMetadata
      };
    }
    case "tool": {
      return {
        role: "tool",
        content: message.content.map((part) => {
          var _a18;
          return {
            type: "tool-result",
            toolCallId: part.toolCallId,
            toolName: part.toolName,
            result: part.result,
            content: part.experimental_content,
            isError: part.isError,
            providerMetadata: (_a18 = part.providerOptions) != null ? _a18 : part.experimental_providerMetadata
          };
        }),
        providerMetadata: (_f = message.providerOptions) != null ? _f : message.experimental_providerMetadata
      };
    }
    default: {
      const _exhaustiveCheck = role;
      throw new InvalidMessageRoleError({ role: _exhaustiveCheck });
    }
  }
}
async function downloadAssets(messages, downloadImplementation, modelSupportsImageUrls, modelSupportsUrl) {
  const urls = messages.filter((message) => message.role === "user").map((message) => message.content).filter(
    (content) => Array.isArray(content)
  ).flat().filter(
    (part) => part.type === "image" || part.type === "file"
  ).filter(
    (part) => !(part.type === "image" && modelSupportsImageUrls === true)
  ).map((part) => part.type === "image" ? part.image : part.data).map(
    (part) => (
      // support string urls:
      typeof part === "string" && (part.startsWith("http:") || part.startsWith("https:")) ? new URL(part) : part
    )
  ).filter((image) => image instanceof URL).filter((url) => !modelSupportsUrl(url));
  const downloadedImages = await Promise.all(
    urls.map(async (url) => ({
      url,
      data: await downloadImplementation({ url })
    }))
  );
  return Object.fromEntries(
    downloadedImages.map(({ url, data }) => [url.toString(), data])
  );
}
function convertPartToLanguageModelPart(part, downloadedAssets) {
  var _a17, _b, _c, _d;
  if (part.type === "text") {
    return {
      type: "text",
      text: part.text,
      providerMetadata: (_a17 = part.providerOptions) != null ? _a17 : part.experimental_providerMetadata
    };
  }
  let mimeType = part.mimeType;
  let data;
  let content;
  let normalizedData;
  const type = part.type;
  switch (type) {
    case "image":
      data = part.image;
      break;
    case "file":
      data = part.data;
      break;
    default:
      throw new Error(`Unsupported part type: ${type}`);
  }
  try {
    content = typeof data === "string" ? new URL(data) : data;
  } catch (error) {
    content = data;
  }
  if (content instanceof URL) {
    if (content.protocol === "data:") {
      const { mimeType: dataUrlMimeType, base64Content } = splitDataUrl(
        content.toString()
      );
      if (dataUrlMimeType == null || base64Content == null) {
        throw new Error(`Invalid data URL format in part ${type}`);
      }
      mimeType = dataUrlMimeType;
      normalizedData = convertDataContentToUint8Array(base64Content);
    } else {
      const downloadedFile = downloadedAssets[content.toString()];
      if (downloadedFile) {
        normalizedData = downloadedFile.data;
        mimeType != null ? mimeType : mimeType = downloadedFile.mimeType;
      } else {
        normalizedData = content;
      }
    }
  } else {
    normalizedData = convertDataContentToUint8Array(content);
  }
  switch (type) {
    case "image": {
      if (normalizedData instanceof Uint8Array) {
        mimeType = (_b = detectMimeType({
          data: normalizedData,
          signatures: imageMimeTypeSignatures
        })) != null ? _b : mimeType;
      }
      return {
        type: "image",
        image: normalizedData,
        mimeType,
        providerMetadata: (_c = part.providerOptions) != null ? _c : part.experimental_providerMetadata
      };
    }
    case "file": {
      if (mimeType == null) {
        throw new Error(`Mime type is missing for file part`);
      }
      return {
        type: "file",
        data: normalizedData instanceof Uint8Array ? convertDataContentToBase64String(normalizedData) : normalizedData,
        filename: part.filename,
        mimeType,
        providerMetadata: (_d = part.providerOptions) != null ? _d : part.experimental_providerMetadata
      };
    }
  }
}
function prepareCallSettings({
  maxTokens,
  temperature,
  topP,
  topK,
  presencePenalty,
  frequencyPenalty,
  stopSequences,
  seed
}) {
  if (maxTokens != null) {
    if (!Number.isInteger(maxTokens)) {
      throw new InvalidArgumentError2({
        parameter: "maxTokens",
        value: maxTokens,
        message: "maxTokens must be an integer"
      });
    }
    if (maxTokens < 1) {
      throw new InvalidArgumentError2({
        parameter: "maxTokens",
        value: maxTokens,
        message: "maxTokens must be >= 1"
      });
    }
  }
  if (temperature != null) {
    if (typeof temperature !== "number") {
      throw new InvalidArgumentError2({
        parameter: "temperature",
        value: temperature,
        message: "temperature must be a number"
      });
    }
  }
  if (topP != null) {
    if (typeof topP !== "number") {
      throw new InvalidArgumentError2({
        parameter: "topP",
        value: topP,
        message: "topP must be a number"
      });
    }
  }
  if (topK != null) {
    if (typeof topK !== "number") {
      throw new InvalidArgumentError2({
        parameter: "topK",
        value: topK,
        message: "topK must be a number"
      });
    }
  }
  if (presencePenalty != null) {
    if (typeof presencePenalty !== "number") {
      throw new InvalidArgumentError2({
        parameter: "presencePenalty",
        value: presencePenalty,
        message: "presencePenalty must be a number"
      });
    }
  }
  if (frequencyPenalty != null) {
    if (typeof frequencyPenalty !== "number") {
      throw new InvalidArgumentError2({
        parameter: "frequencyPenalty",
        value: frequencyPenalty,
        message: "frequencyPenalty must be a number"
      });
    }
  }
  if (seed != null) {
    if (!Number.isInteger(seed)) {
      throw new InvalidArgumentError2({
        parameter: "seed",
        value: seed,
        message: "seed must be an integer"
      });
    }
  }
  return {
    maxTokens,
    // TODO v5 remove default 0 for temperature
    temperature: temperature != null ? temperature : 0,
    topP,
    topK,
    presencePenalty,
    frequencyPenalty,
    stopSequences: stopSequences != null && stopSequences.length > 0 ? stopSequences : void 0,
    seed
  };
}
function attachmentsToParts(attachments) {
  var _a17, _b, _c;
  const parts = [];
  for (const attachment of attachments) {
    let url;
    try {
      url = new URL(attachment.url);
    } catch (error) {
      throw new Error(`Invalid URL: ${attachment.url}`);
    }
    switch (url.protocol) {
      case "http:":
      case "https:": {
        if ((_a17 = attachment.contentType) == null ? void 0 : _a17.startsWith("image/")) {
          parts.push({ type: "image", image: url });
        } else {
          if (!attachment.contentType) {
            throw new Error(
              "If the attachment is not an image, it must specify a content type"
            );
          }
          parts.push({
            type: "file",
            data: url,
            mimeType: attachment.contentType
          });
        }
        break;
      }
      case "data:": {
        let header;
        let base64Content;
        let mimeType;
        try {
          [header, base64Content] = attachment.url.split(",");
          mimeType = header.split(";")[0].split(":")[1];
        } catch (error) {
          throw new Error(`Error processing data URL: ${attachment.url}`);
        }
        if (mimeType == null || base64Content == null) {
          throw new Error(`Invalid data URL format: ${attachment.url}`);
        }
        if ((_b = attachment.contentType) == null ? void 0 : _b.startsWith("image/")) {
          parts.push({
            type: "image",
            image: convertDataContentToUint8Array(base64Content)
          });
        } else if ((_c = attachment.contentType) == null ? void 0 : _c.startsWith("text/")) {
          parts.push({
            type: "text",
            text: convertUint8ArrayToText(
              convertDataContentToUint8Array(base64Content)
            )
          });
        } else {
          if (!attachment.contentType) {
            throw new Error(
              "If the attachment is not an image or text, it must specify a content type"
            );
          }
          parts.push({
            type: "file",
            data: base64Content,
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
var name82 = "AI_MessageConversionError";
var marker82 = `vercel.ai.error.${name82}`;
var symbol82 = Symbol.for(marker82);
var _a82;
var MessageConversionError = class extends AISDKError {
  constructor({
    originalMessage,
    message
  }) {
    super({ name: name82, message });
    this[_a82] = true;
    this.originalMessage = originalMessage;
  }
  static isInstance(error) {
    return AISDKError.hasMarker(error, marker82);
  }
};
_a82 = symbol82;
function convertToCoreMessages(messages, options) {
  var _a17, _b;
  const tools = (_a17 = options == null ? void 0 : options.tools) != null ? _a17 : {};
  const coreMessages = [];
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    const isLastMessage = i === messages.length - 1;
    const { role, content, experimental_attachments } = message;
    switch (role) {
      case "system": {
        coreMessages.push({
          role: "system",
          content
        });
        break;
      }
      case "user": {
        if (message.parts == null) {
          coreMessages.push({
            role: "user",
            content: experimental_attachments ? [
              { type: "text", text: content },
              ...attachmentsToParts(experimental_attachments)
            ] : content
          });
        } else {
          const textParts = message.parts.filter((part) => part.type === "text").map((part) => ({
            type: "text",
            text: part.text
          }));
          coreMessages.push({
            role: "user",
            content: experimental_attachments ? [...textParts, ...attachmentsToParts(experimental_attachments)] : textParts
          });
        }
        break;
      }
      case "assistant": {
        if (message.parts != null) {
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
                  content2.push({
                    type: "tool-call",
                    toolCallId: part.toolInvocation.toolCallId,
                    toolName: part.toolInvocation.toolName,
                    args: part.toolInvocation.args
                  });
                  break;
                default: {
                  const _exhaustiveCheck = part;
                  throw new Error(`Unsupported part: ${_exhaustiveCheck}`);
                }
              }
            }
            coreMessages.push({
              role: "assistant",
              content: content2
            });
            const stepInvocations = block.filter(
              (part) => part.type === "tool-invocation"
            ).map((part) => part.toolInvocation);
            if (stepInvocations.length > 0) {
              coreMessages.push({
                role: "tool",
                content: stepInvocations.map(
                  (toolInvocation) => {
                    if (!("result" in toolInvocation)) {
                      throw new MessageConversionError({
                        originalMessage: message,
                        message: "ToolInvocation must have a result: " + JSON.stringify(toolInvocation)
                      });
                    }
                    const { toolCallId, toolName, result } = toolInvocation;
                    const tool2 = tools[toolName];
                    return (tool2 == null ? void 0 : tool2.experimental_toToolResultContent) != null ? {
                      type: "tool-result",
                      toolCallId,
                      toolName,
                      result: tool2.experimental_toToolResultContent(result),
                      experimental_content: tool2.experimental_toToolResultContent(result)
                    } : {
                      type: "tool-result",
                      toolCallId,
                      toolName,
                      result
                    };
                  }
                )
              });
            }
            block = [];
            blockHasToolInvocations = false;
            currentStep++;
          };
          let currentStep = 0;
          let blockHasToolInvocations = false;
          let block = [];
          for (const part of message.parts) {
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
                if (((_b = part.toolInvocation.step) != null ? _b : 0) !== currentStep) {
                  processBlock2();
                }
                block.push(part);
                blockHasToolInvocations = true;
                break;
              }
            }
          }
          processBlock2();
          break;
        }
        const toolInvocations = message.toolInvocations;
        if (toolInvocations == null || toolInvocations.length === 0) {
          coreMessages.push({ role: "assistant", content });
          break;
        }
        const maxStep = toolInvocations.reduce((max, toolInvocation) => {
          var _a18;
          return Math.max(max, (_a18 = toolInvocation.step) != null ? _a18 : 0);
        }, 0);
        for (let i2 = 0; i2 <= maxStep; i2++) {
          const stepInvocations = toolInvocations.filter(
            (toolInvocation) => {
              var _a18;
              return ((_a18 = toolInvocation.step) != null ? _a18 : 0) === i2;
            }
          );
          if (stepInvocations.length === 0) {
            continue;
          }
          coreMessages.push({
            role: "assistant",
            content: [
              ...isLastMessage && content && i2 === 0 ? [{ type: "text", text: content }] : [],
              ...stepInvocations.map(
                ({ toolCallId, toolName, args }) => ({
                  type: "tool-call",
                  toolCallId,
                  toolName,
                  args
                })
              )
            ]
          });
          coreMessages.push({
            role: "tool",
            content: stepInvocations.map((toolInvocation) => {
              if (!("result" in toolInvocation)) {
                throw new MessageConversionError({
                  originalMessage: message,
                  message: "ToolInvocation must have a result: " + JSON.stringify(toolInvocation)
                });
              }
              const { toolCallId, toolName, result } = toolInvocation;
              const tool2 = tools[toolName];
              return (tool2 == null ? void 0 : tool2.experimental_toToolResultContent) != null ? {
                type: "tool-result",
                toolCallId,
                toolName,
                result: tool2.experimental_toToolResultContent(result),
                experimental_content: tool2.experimental_toToolResultContent(result)
              } : {
                type: "tool-result",
                toolCallId,
                toolName,
                result
              };
            })
          });
        }
        if (content && !isLastMessage) {
          coreMessages.push({ role: "assistant", content });
        }
        break;
      }
      case "data": {
        break;
      }
      default: {
        const _exhaustiveCheck = role;
        throw new MessageConversionError({
          originalMessage: message,
          message: `Unsupported role: ${_exhaustiveCheck}`
        });
      }
    }
  }
  return coreMessages;
}
var jsonValueSchema = lazyType(
  () => unionType([
    nullType(),
    stringType(),
    numberType(),
    booleanType(),
    recordType(stringType(), jsonValueSchema),
    arrayType(jsonValueSchema)
  ])
);
var providerMetadataSchema = recordType(
  stringType(),
  recordType(stringType(), jsonValueSchema)
);
var toolResultContentSchema = arrayType(
  unionType([
    objectType({ type: literalType("text"), text: stringType() }),
    objectType({
      type: literalType("image"),
      data: stringType(),
      mimeType: stringType().optional()
    })
  ])
);
var textPartSchema = objectType({
  type: literalType("text"),
  text: stringType(),
  providerOptions: providerMetadataSchema.optional(),
  experimental_providerMetadata: providerMetadataSchema.optional()
});
var imagePartSchema = objectType({
  type: literalType("image"),
  image: unionType([dataContentSchema, instanceOfType(URL)]),
  mimeType: stringType().optional(),
  providerOptions: providerMetadataSchema.optional(),
  experimental_providerMetadata: providerMetadataSchema.optional()
});
var filePartSchema = objectType({
  type: literalType("file"),
  data: unionType([dataContentSchema, instanceOfType(URL)]),
  filename: stringType().optional(),
  mimeType: stringType(),
  providerOptions: providerMetadataSchema.optional(),
  experimental_providerMetadata: providerMetadataSchema.optional()
});
var reasoningPartSchema = objectType({
  type: literalType("reasoning"),
  text: stringType(),
  providerOptions: providerMetadataSchema.optional(),
  experimental_providerMetadata: providerMetadataSchema.optional()
});
var redactedReasoningPartSchema = objectType({
  type: literalType("redacted-reasoning"),
  data: stringType(),
  providerOptions: providerMetadataSchema.optional(),
  experimental_providerMetadata: providerMetadataSchema.optional()
});
var toolCallPartSchema = objectType({
  type: literalType("tool-call"),
  toolCallId: stringType(),
  toolName: stringType(),
  args: unknownType(),
  providerOptions: providerMetadataSchema.optional(),
  experimental_providerMetadata: providerMetadataSchema.optional()
});
var toolResultPartSchema = objectType({
  type: literalType("tool-result"),
  toolCallId: stringType(),
  toolName: stringType(),
  result: unknownType(),
  content: toolResultContentSchema.optional(),
  isError: booleanType().optional(),
  providerOptions: providerMetadataSchema.optional(),
  experimental_providerMetadata: providerMetadataSchema.optional()
});
var coreSystemMessageSchema = objectType({
  role: literalType("system"),
  content: stringType(),
  providerOptions: providerMetadataSchema.optional(),
  experimental_providerMetadata: providerMetadataSchema.optional()
});
var coreUserMessageSchema = objectType({
  role: literalType("user"),
  content: unionType([
    stringType(),
    arrayType(unionType([textPartSchema, imagePartSchema, filePartSchema]))
  ]),
  providerOptions: providerMetadataSchema.optional(),
  experimental_providerMetadata: providerMetadataSchema.optional()
});
var coreAssistantMessageSchema = objectType({
  role: literalType("assistant"),
  content: unionType([
    stringType(),
    arrayType(
      unionType([
        textPartSchema,
        filePartSchema,
        reasoningPartSchema,
        redactedReasoningPartSchema,
        toolCallPartSchema
      ])
    )
  ]),
  providerOptions: providerMetadataSchema.optional(),
  experimental_providerMetadata: providerMetadataSchema.optional()
});
var coreToolMessageSchema = objectType({
  role: literalType("tool"),
  content: arrayType(toolResultPartSchema),
  providerOptions: providerMetadataSchema.optional(),
  experimental_providerMetadata: providerMetadataSchema.optional()
});
var coreMessageSchema = unionType([
  coreSystemMessageSchema,
  coreUserMessageSchema,
  coreAssistantMessageSchema,
  coreToolMessageSchema
]);
function standardizePrompt({
  prompt,
  tools
}) {
  if (prompt.prompt == null && prompt.messages == null) {
    throw new InvalidPromptError({
      prompt,
      message: "prompt or messages must be defined"
    });
  }
  if (prompt.prompt != null && prompt.messages != null) {
    throw new InvalidPromptError({
      prompt,
      message: "prompt and messages cannot be defined at the same time"
    });
  }
  if (prompt.system != null && typeof prompt.system !== "string") {
    throw new InvalidPromptError({
      prompt,
      message: "system must be a string"
    });
  }
  if (prompt.prompt != null) {
    if (typeof prompt.prompt !== "string") {
      throw new InvalidPromptError({
        prompt,
        message: "prompt must be a string"
      });
    }
    return {
      type: "prompt",
      system: prompt.system,
      messages: [
        {
          role: "user",
          content: prompt.prompt
        }
      ]
    };
  }
  if (prompt.messages != null) {
    const promptType = detectPromptType(prompt.messages);
    const messages = promptType === "ui-messages" ? convertToCoreMessages(prompt.messages, {
      tools
    }) : prompt.messages;
    if (messages.length === 0) {
      throw new InvalidPromptError({
        prompt,
        message: "messages must not be empty"
      });
    }
    const validationResult = safeValidateTypes({
      value: messages,
      schema: arrayType(coreMessageSchema)
    });
    if (!validationResult.success) {
      throw new InvalidPromptError({
        prompt,
        message: [
          "message must be a CoreMessage or a UI message",
          `Validation error: ${validationResult.error.message}`
        ].join("\n"),
        cause: validationResult.error
      });
    }
    return {
      type: "messages",
      messages,
      system: prompt.system
    };
  }
  throw new Error("unreachable");
}
function detectPromptType(prompt) {
  if (!Array.isArray(prompt)) {
    throw new InvalidPromptError({
      prompt,
      message: [
        "messages must be an array of CoreMessage or UIMessage",
        `Received non-array value: ${JSON.stringify(prompt)}`
      ].join("\n"),
      cause: prompt
    });
  }
  if (prompt.length === 0) {
    return "messages";
  }
  const characteristics = prompt.map(detectSingleMessageCharacteristics);
  if (characteristics.some((c) => c === "has-ui-specific-parts")) {
    return "ui-messages";
  }
  const nonMessageIndex = characteristics.findIndex(
    (c) => c !== "has-core-specific-parts" && c !== "message"
  );
  if (nonMessageIndex === -1) {
    return "messages";
  }
  throw new InvalidPromptError({
    prompt,
    message: [
      "messages must be an array of CoreMessage or UIMessage",
      `Received message of type: "${characteristics[nonMessageIndex]}" at index ${nonMessageIndex}`,
      `messages[${nonMessageIndex}]: ${JSON.stringify(prompt[nonMessageIndex])}`
    ].join("\n"),
    cause: prompt
  });
}
function detectSingleMessageCharacteristics(message) {
  if (typeof message === "object" && message !== null && (message.role === "function" || // UI-only role
  message.role === "data" || // UI-only role
  "toolInvocations" in message || // UI-specific field
  "parts" in message || // UI-specific field
  "experimental_attachments" in message)) {
    return "has-ui-specific-parts";
  } else if (typeof message === "object" && message !== null && "content" in message && (Array.isArray(message.content) || // Core messages can have array content
  "experimental_providerMetadata" in message || "providerOptions" in message)) {
    return "has-core-specific-parts";
  } else if (typeof message === "object" && message !== null && "role" in message && "content" in message && typeof message.content === "string" && ["system", "user", "assistant", "tool"].includes(message.role)) {
    return "message";
  } else {
    return "other";
  }
}
function calculateLanguageModelUsage({
  promptTokens,
  completionTokens
}) {
  return {
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens
  };
}
function addLanguageModelUsage(usage1, usage2) {
  return {
    promptTokens: usage1.promptTokens + usage2.promptTokens,
    completionTokens: usage1.completionTokens + usage2.completionTokens,
    totalTokens: usage1.totalTokens + usage2.totalTokens
  };
}
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
function createAsyncIterableStream(source) {
  const stream = source.pipeThrough(new TransformStream());
  stream[Symbol.asyncIterator] = () => {
    const reader = stream.getReader();
    return {
      async next() {
        const { done, value } = await reader.read();
        return done ? { done: true, value: void 0 } : { done: false, value };
      }
    };
  };
  return stream;
}
var noSchemaOutputStrategy = {
  type: "no-schema",
  jsonSchema: void 0,
  validatePartialResult({ value, textDelta }) {
    return { success: true, value: { partial: value, textDelta } };
  },
  validateFinalResult(value, context) {
    return value === void 0 ? {
      success: false,
      error: new NoObjectGeneratedError({
        message: "No object generated: response did not match schema.",
        text: context.text,
        response: context.response,
        usage: context.usage,
        finishReason: context.finishReason
      })
    } : { success: true, value };
  },
  createElementStream() {
    throw new UnsupportedFunctionalityError({
      functionality: "element streams in no-schema mode"
    });
  }
};
var objectOutputStrategy = (schema) => ({
  type: "object",
  jsonSchema: schema.jsonSchema,
  validatePartialResult({ value, textDelta }) {
    return {
      success: true,
      value: {
        // Note: currently no validation of partial results:
        partial: value,
        textDelta
      }
    };
  },
  validateFinalResult(value) {
    return safeValidateTypes({ value, schema });
  },
  createElementStream() {
    throw new UnsupportedFunctionalityError({
      functionality: "element streams in object mode"
    });
  }
});
var arrayOutputStrategy = (schema) => {
  const { $schema, ...itemSchema } = schema.jsonSchema;
  return {
    type: "enum",
    // wrap in object that contains array of elements, since most LLMs will not
    // be able to generate an array directly:
    // possible future optimization: use arrays directly when model supports grammar-guided generation
    jsonSchema: {
      $schema: "http://json-schema.org/draft-07/schema#",
      type: "object",
      properties: {
        elements: { type: "array", items: itemSchema }
      },
      required: ["elements"],
      additionalProperties: false
    },
    validatePartialResult({ value, latestObject, isFirstDelta, isFinalDelta }) {
      var _a17;
      if (!isJSONObject(value) || !isJSONArray(value.elements)) {
        return {
          success: false,
          error: new TypeValidationError({
            value,
            cause: "value must be an object that contains an array of elements"
          })
        };
      }
      const inputArray = value.elements;
      const resultArray = [];
      for (let i = 0; i < inputArray.length; i++) {
        const element = inputArray[i];
        const result = safeValidateTypes({ value: element, schema });
        if (i === inputArray.length - 1 && !isFinalDelta) {
          continue;
        }
        if (!result.success) {
          return result;
        }
        resultArray.push(result.value);
      }
      const publishedElementCount = (_a17 = latestObject == null ? void 0 : latestObject.length) != null ? _a17 : 0;
      let textDelta = "";
      if (isFirstDelta) {
        textDelta += "[";
      }
      if (publishedElementCount > 0) {
        textDelta += ",";
      }
      textDelta += resultArray.slice(publishedElementCount).map((element) => JSON.stringify(element)).join(",");
      if (isFinalDelta) {
        textDelta += "]";
      }
      return {
        success: true,
        value: {
          partial: resultArray,
          textDelta
        }
      };
    },
    validateFinalResult(value) {
      if (!isJSONObject(value) || !isJSONArray(value.elements)) {
        return {
          success: false,
          error: new TypeValidationError({
            value,
            cause: "value must be an object that contains an array of elements"
          })
        };
      }
      const inputArray = value.elements;
      for (const element of inputArray) {
        const result = safeValidateTypes({ value: element, schema });
        if (!result.success) {
          return result;
        }
      }
      return { success: true, value: inputArray };
    },
    createElementStream(originalStream) {
      let publishedElements = 0;
      return createAsyncIterableStream(
        originalStream.pipeThrough(
          new TransformStream({
            transform(chunk, controller) {
              switch (chunk.type) {
                case "object": {
                  const array = chunk.object;
                  for (; publishedElements < array.length; publishedElements++) {
                    controller.enqueue(array[publishedElements]);
                  }
                  break;
                }
                case "text-delta":
                case "finish":
                case "error":
                  break;
                default: {
                  const _exhaustiveCheck = chunk;
                  throw new Error(
                    `Unsupported chunk type: ${_exhaustiveCheck}`
                  );
                }
              }
            }
          })
        )
      );
    }
  };
};
var enumOutputStrategy = (enumValues) => {
  return {
    type: "enum",
    // wrap in object that contains result, since most LLMs will not
    // be able to generate an enum value directly:
    // possible future optimization: use enums directly when model supports top-level enums
    jsonSchema: {
      $schema: "http://json-schema.org/draft-07/schema#",
      type: "object",
      properties: {
        result: { type: "string", enum: enumValues }
      },
      required: ["result"],
      additionalProperties: false
    },
    validateFinalResult(value) {
      if (!isJSONObject(value) || typeof value.result !== "string") {
        return {
          success: false,
          error: new TypeValidationError({
            value,
            cause: 'value must be an object that contains a string in the "result" property.'
          })
        };
      }
      const result = value.result;
      return enumValues.includes(result) ? { success: true, value: result } : {
        success: false,
        error: new TypeValidationError({
          value,
          cause: "value must be a string in the enum"
        })
      };
    },
    validatePartialResult() {
      throw new UnsupportedFunctionalityError({
        functionality: "partial results in enum mode"
      });
    },
    createElementStream() {
      throw new UnsupportedFunctionalityError({
        functionality: "element streams in enum mode"
      });
    }
  };
};
function getOutputStrategy({
  output,
  schema,
  enumValues
}) {
  switch (output) {
    case "object":
      return objectOutputStrategy(asSchema(schema));
    case "array":
      return arrayOutputStrategy(asSchema(schema));
    case "enum":
      return enumOutputStrategy(enumValues);
    case "no-schema":
      return noSchemaOutputStrategy;
    default: {
      const _exhaustiveCheck = output;
      throw new Error(`Unsupported output: ${_exhaustiveCheck}`);
    }
  }
}
function validateObjectGenerationInput({
  output,
  mode,
  schema,
  schemaName,
  schemaDescription,
  enumValues
}) {
  if (output != null && output !== "object" && output !== "array" && output !== "enum" && output !== "no-schema") {
    throw new InvalidArgumentError2({
      parameter: "output",
      value: output,
      message: "Invalid output type."
    });
  }
  if (output === "no-schema") {
    if (mode === "auto" || mode === "tool") {
      throw new InvalidArgumentError2({
        parameter: "mode",
        value: mode,
        message: 'Mode must be "json" for no-schema output.'
      });
    }
    if (schema != null) {
      throw new InvalidArgumentError2({
        parameter: "schema",
        value: schema,
        message: "Schema is not supported for no-schema output."
      });
    }
    if (schemaDescription != null) {
      throw new InvalidArgumentError2({
        parameter: "schemaDescription",
        value: schemaDescription,
        message: "Schema description is not supported for no-schema output."
      });
    }
    if (schemaName != null) {
      throw new InvalidArgumentError2({
        parameter: "schemaName",
        value: schemaName,
        message: "Schema name is not supported for no-schema output."
      });
    }
    if (enumValues != null) {
      throw new InvalidArgumentError2({
        parameter: "enumValues",
        value: enumValues,
        message: "Enum values are not supported for no-schema output."
      });
    }
  }
  if (output === "object") {
    if (schema == null) {
      throw new InvalidArgumentError2({
        parameter: "schema",
        value: schema,
        message: "Schema is required for object output."
      });
    }
    if (enumValues != null) {
      throw new InvalidArgumentError2({
        parameter: "enumValues",
        value: enumValues,
        message: "Enum values are not supported for object output."
      });
    }
  }
  if (output === "array") {
    if (schema == null) {
      throw new InvalidArgumentError2({
        parameter: "schema",
        value: schema,
        message: "Element schema is required for array output."
      });
    }
    if (enumValues != null) {
      throw new InvalidArgumentError2({
        parameter: "enumValues",
        value: enumValues,
        message: "Enum values are not supported for array output."
      });
    }
  }
  if (output === "enum") {
    if (schema != null) {
      throw new InvalidArgumentError2({
        parameter: "schema",
        value: schema,
        message: "Schema is not supported for enum output."
      });
    }
    if (schemaDescription != null) {
      throw new InvalidArgumentError2({
        parameter: "schemaDescription",
        value: schemaDescription,
        message: "Schema description is not supported for enum output."
      });
    }
    if (schemaName != null) {
      throw new InvalidArgumentError2({
        parameter: "schemaName",
        value: schemaName,
        message: "Schema name is not supported for enum output."
      });
    }
    if (enumValues == null) {
      throw new InvalidArgumentError2({
        parameter: "enumValues",
        value: enumValues,
        message: "Enum values are required for enum output."
      });
    }
    for (const value of enumValues) {
      if (typeof value !== "string") {
        throw new InvalidArgumentError2({
          parameter: "enumValues",
          value,
          message: "Enum values must be strings."
        });
      }
    }
  }
}
function stringifyForTelemetry(prompt) {
  const processedPrompt = prompt.map((message) => {
    return {
      ...message,
      content: typeof message.content === "string" ? message.content : message.content.map(processPart)
    };
  });
  return JSON.stringify(processedPrompt);
}
function processPart(part) {
  if (part.type === "image") {
    return {
      ...part,
      image: part.image instanceof Uint8Array ? convertDataContentToBase64String(part.image) : part.image
    };
  }
  return part;
}
var originalGenerateId = createIdGenerator({ prefix: "aiobj", size: 24 });
async function generateObject({
  model,
  enum: enumValues,
  // rename bc enum is reserved by typescript
  schema: inputSchema,
  schemaName,
  schemaDescription,
  mode,
  output = "object",
  system,
  prompt,
  messages,
  maxRetries: maxRetriesArg,
  abortSignal,
  headers,
  experimental_repairText: repairText,
  experimental_telemetry: telemetry,
  experimental_providerMetadata,
  providerOptions = experimental_providerMetadata,
  _internal: {
    generateId: generateId3 = originalGenerateId,
    currentDate = () => /* @__PURE__ */ new Date()
  } = {},
  ...settings
}) {
  if (typeof model === "string" || model.specificationVersion !== "v1") {
    throw new UnsupportedModelVersionError();
  }
  validateObjectGenerationInput({
    output,
    mode,
    schema: inputSchema,
    schemaName,
    schemaDescription,
    enumValues
  });
  const { maxRetries, retry } = prepareRetries({ maxRetries: maxRetriesArg });
  const outputStrategy = getOutputStrategy({
    output,
    schema: inputSchema,
    enumValues
  });
  if (outputStrategy.type === "no-schema" && mode === void 0) {
    mode = "json";
  }
  const baseTelemetryAttributes = getBaseTelemetryAttributes({
    model,
    telemetry,
    headers,
    settings: { ...settings, maxRetries }
  });
  const tracer = getTracer(telemetry);
  return recordSpan({
    name: "ai.generateObject",
    attributes: selectTelemetryAttributes({
      telemetry,
      attributes: {
        ...assembleOperationName({
          operationId: "ai.generateObject",
          telemetry
        }),
        ...baseTelemetryAttributes,
        // specific settings that only make sense on the outer level:
        "ai.prompt": {
          input: () => JSON.stringify({ system, prompt, messages })
        },
        "ai.schema": outputStrategy.jsonSchema != null ? { input: () => JSON.stringify(outputStrategy.jsonSchema) } : void 0,
        "ai.schema.name": schemaName,
        "ai.schema.description": schemaDescription,
        "ai.settings.output": outputStrategy.type,
        "ai.settings.mode": mode
      }
    }),
    tracer,
    fn: async (span) => {
      var _a17, _b, _c, _d;
      if (mode === "auto" || mode == null) {
        mode = model.defaultObjectGenerationMode;
      }
      let result;
      let finishReason;
      let usage;
      let warnings;
      let rawResponse;
      let response;
      let request;
      let logprobs;
      let resultProviderMetadata;
      switch (mode) {
        case "json": {
          const standardizedPrompt = standardizePrompt({
            prompt: {
              system: outputStrategy.jsonSchema == null ? injectJsonInstruction({ prompt: system }) : model.supportsStructuredOutputs ? system : injectJsonInstruction({
                prompt: system,
                schema: outputStrategy.jsonSchema
              }),
              prompt,
              messages
            },
            tools: void 0
          });
          const promptMessages = await convertToLanguageModelPrompt({
            prompt: standardizedPrompt,
            modelSupportsImageUrls: model.supportsImageUrls,
            modelSupportsUrl: (_a17 = model.supportsUrl) == null ? void 0 : _a17.bind(model)
            // support 'this' context
          });
          const generateResult = await retry(
            () => recordSpan({
              name: "ai.generateObject.doGenerate",
              attributes: selectTelemetryAttributes({
                telemetry,
                attributes: {
                  ...assembleOperationName({
                    operationId: "ai.generateObject.doGenerate",
                    telemetry
                  }),
                  ...baseTelemetryAttributes,
                  "ai.prompt.format": {
                    input: () => standardizedPrompt.type
                  },
                  "ai.prompt.messages": {
                    input: () => JSON.stringify(promptMessages)
                  },
                  "ai.settings.mode": mode,
                  // standardized gen-ai llm span attributes:
                  "gen_ai.system": model.provider,
                  "gen_ai.request.model": model.modelId,
                  "gen_ai.request.frequency_penalty": settings.frequencyPenalty,
                  "gen_ai.request.max_tokens": settings.maxTokens,
                  "gen_ai.request.presence_penalty": settings.presencePenalty,
                  "gen_ai.request.temperature": settings.temperature,
                  "gen_ai.request.top_k": settings.topK,
                  "gen_ai.request.top_p": settings.topP
                }
              }),
              tracer,
              fn: async (span2) => {
                var _a18, _b2, _c2, _d2, _e, _f;
                const result2 = await model.doGenerate({
                  mode: {
                    type: "object-json",
                    schema: outputStrategy.jsonSchema,
                    name: schemaName,
                    description: schemaDescription
                  },
                  ...prepareCallSettings(settings),
                  inputFormat: standardizedPrompt.type,
                  prompt: promptMessages,
                  providerMetadata: providerOptions,
                  abortSignal,
                  headers
                });
                const responseData = {
                  id: (_b2 = (_a18 = result2.response) == null ? void 0 : _a18.id) != null ? _b2 : generateId3(),
                  timestamp: (_d2 = (_c2 = result2.response) == null ? void 0 : _c2.timestamp) != null ? _d2 : currentDate(),
                  modelId: (_f = (_e = result2.response) == null ? void 0 : _e.modelId) != null ? _f : model.modelId
                };
                if (result2.text === void 0) {
                  throw new NoObjectGeneratedError({
                    message: "No object generated: the model did not return a response.",
                    response: responseData,
                    usage: calculateLanguageModelUsage(result2.usage),
                    finishReason: result2.finishReason
                  });
                }
                span2.setAttributes(
                  selectTelemetryAttributes({
                    telemetry,
                    attributes: {
                      "ai.response.finishReason": result2.finishReason,
                      "ai.response.object": { output: () => result2.text },
                      "ai.response.id": responseData.id,
                      "ai.response.model": responseData.modelId,
                      "ai.response.timestamp": responseData.timestamp.toISOString(),
                      "ai.response.providerMetadata": JSON.stringify(
                        result2.providerMetadata
                      ),
                      "ai.usage.promptTokens": result2.usage.promptTokens,
                      "ai.usage.completionTokens": result2.usage.completionTokens,
                      // standardized gen-ai llm span attributes:
                      "gen_ai.response.finish_reasons": [result2.finishReason],
                      "gen_ai.response.id": responseData.id,
                      "gen_ai.response.model": responseData.modelId,
                      "gen_ai.usage.prompt_tokens": result2.usage.promptTokens,
                      "gen_ai.usage.completion_tokens": result2.usage.completionTokens
                    }
                  })
                );
                return { ...result2, objectText: result2.text, responseData };
              }
            })
          );
          result = generateResult.objectText;
          finishReason = generateResult.finishReason;
          usage = generateResult.usage;
          warnings = generateResult.warnings;
          rawResponse = generateResult.rawResponse;
          logprobs = generateResult.logprobs;
          resultProviderMetadata = generateResult.providerMetadata;
          request = (_b = generateResult.request) != null ? _b : {};
          response = generateResult.responseData;
          break;
        }
        case "tool": {
          const standardizedPrompt = standardizePrompt({
            prompt: { system, prompt, messages },
            tools: void 0
          });
          const promptMessages = await convertToLanguageModelPrompt({
            prompt: standardizedPrompt,
            modelSupportsImageUrls: model.supportsImageUrls,
            modelSupportsUrl: (_c = model.supportsUrl) == null ? void 0 : _c.bind(model)
            // support 'this' context,
          });
          const inputFormat = standardizedPrompt.type;
          const generateResult = await retry(
            () => recordSpan({
              name: "ai.generateObject.doGenerate",
              attributes: selectTelemetryAttributes({
                telemetry,
                attributes: {
                  ...assembleOperationName({
                    operationId: "ai.generateObject.doGenerate",
                    telemetry
                  }),
                  ...baseTelemetryAttributes,
                  "ai.prompt.format": {
                    input: () => inputFormat
                  },
                  "ai.prompt.messages": {
                    input: () => stringifyForTelemetry(promptMessages)
                  },
                  "ai.settings.mode": mode,
                  // standardized gen-ai llm span attributes:
                  "gen_ai.system": model.provider,
                  "gen_ai.request.model": model.modelId,
                  "gen_ai.request.frequency_penalty": settings.frequencyPenalty,
                  "gen_ai.request.max_tokens": settings.maxTokens,
                  "gen_ai.request.presence_penalty": settings.presencePenalty,
                  "gen_ai.request.temperature": settings.temperature,
                  "gen_ai.request.top_k": settings.topK,
                  "gen_ai.request.top_p": settings.topP
                }
              }),
              tracer,
              fn: async (span2) => {
                var _a18, _b2, _c2, _d2, _e, _f, _g, _h;
                const result2 = await model.doGenerate({
                  mode: {
                    type: "object-tool",
                    tool: {
                      type: "function",
                      name: schemaName != null ? schemaName : "json",
                      description: schemaDescription != null ? schemaDescription : "Respond with a JSON object.",
                      parameters: outputStrategy.jsonSchema
                    }
                  },
                  ...prepareCallSettings(settings),
                  inputFormat,
                  prompt: promptMessages,
                  providerMetadata: providerOptions,
                  abortSignal,
                  headers
                });
                const objectText = (_b2 = (_a18 = result2.toolCalls) == null ? void 0 : _a18[0]) == null ? void 0 : _b2.args;
                const responseData = {
                  id: (_d2 = (_c2 = result2.response) == null ? void 0 : _c2.id) != null ? _d2 : generateId3(),
                  timestamp: (_f = (_e = result2.response) == null ? void 0 : _e.timestamp) != null ? _f : currentDate(),
                  modelId: (_h = (_g = result2.response) == null ? void 0 : _g.modelId) != null ? _h : model.modelId
                };
                if (objectText === void 0) {
                  throw new NoObjectGeneratedError({
                    message: "No object generated: the tool was not called.",
                    response: responseData,
                    usage: calculateLanguageModelUsage(result2.usage),
                    finishReason: result2.finishReason
                  });
                }
                span2.setAttributes(
                  selectTelemetryAttributes({
                    telemetry,
                    attributes: {
                      "ai.response.finishReason": result2.finishReason,
                      "ai.response.object": { output: () => objectText },
                      "ai.response.id": responseData.id,
                      "ai.response.model": responseData.modelId,
                      "ai.response.timestamp": responseData.timestamp.toISOString(),
                      "ai.response.providerMetadata": JSON.stringify(
                        result2.providerMetadata
                      ),
                      "ai.usage.promptTokens": result2.usage.promptTokens,
                      "ai.usage.completionTokens": result2.usage.completionTokens,
                      // standardized gen-ai llm span attributes:
                      "gen_ai.response.finish_reasons": [result2.finishReason],
                      "gen_ai.response.id": responseData.id,
                      "gen_ai.response.model": responseData.modelId,
                      "gen_ai.usage.input_tokens": result2.usage.promptTokens,
                      "gen_ai.usage.output_tokens": result2.usage.completionTokens
                    }
                  })
                );
                return { ...result2, objectText, responseData };
              }
            })
          );
          result = generateResult.objectText;
          finishReason = generateResult.finishReason;
          usage = generateResult.usage;
          warnings = generateResult.warnings;
          rawResponse = generateResult.rawResponse;
          logprobs = generateResult.logprobs;
          resultProviderMetadata = generateResult.providerMetadata;
          request = (_d = generateResult.request) != null ? _d : {};
          response = generateResult.responseData;
          break;
        }
        case void 0: {
          throw new Error(
            "Model does not have a default object generation mode."
          );
        }
        default: {
          const _exhaustiveCheck = mode;
          throw new Error(`Unsupported mode: ${_exhaustiveCheck}`);
        }
      }
      function processResult(result2) {
        const parseResult = safeParseJSON({ text: result2 });
        if (!parseResult.success) {
          throw new NoObjectGeneratedError({
            message: "No object generated: could not parse the response.",
            cause: parseResult.error,
            text: result2,
            response,
            usage: calculateLanguageModelUsage(usage),
            finishReason
          });
        }
        const validationResult = outputStrategy.validateFinalResult(
          parseResult.value,
          {
            text: result2,
            response,
            usage: calculateLanguageModelUsage(usage)
          }
        );
        if (!validationResult.success) {
          throw new NoObjectGeneratedError({
            message: "No object generated: response did not match schema.",
            cause: validationResult.error,
            text: result2,
            response,
            usage: calculateLanguageModelUsage(usage),
            finishReason
          });
        }
        return validationResult.value;
      }
      let object2;
      try {
        object2 = processResult(result);
      } catch (error) {
        if (repairText != null && NoObjectGeneratedError.isInstance(error) && (JSONParseError.isInstance(error.cause) || TypeValidationError.isInstance(error.cause))) {
          const repairedText = await repairText({
            text: result,
            error: error.cause
          });
          if (repairedText === null) {
            throw error;
          }
          object2 = processResult(repairedText);
        } else {
          throw error;
        }
      }
      span.setAttributes(
        selectTelemetryAttributes({
          telemetry,
          attributes: {
            "ai.response.finishReason": finishReason,
            "ai.response.object": {
              output: () => JSON.stringify(object2)
            },
            "ai.usage.promptTokens": usage.promptTokens,
            "ai.usage.completionTokens": usage.completionTokens
          }
        })
      );
      return new DefaultGenerateObjectResult({
        object: object2,
        finishReason,
        usage: calculateLanguageModelUsage(usage),
        warnings,
        request,
        response: {
          ...response,
          headers: rawResponse == null ? void 0 : rawResponse.headers,
          body: rawResponse == null ? void 0 : rawResponse.body
        },
        logprobs,
        providerMetadata: resultProviderMetadata
      });
    }
  });
}
var DefaultGenerateObjectResult = class {
  constructor(options) {
    this.object = options.object;
    this.finishReason = options.finishReason;
    this.usage = options.usage;
    this.warnings = options.warnings;
    this.providerMetadata = options.providerMetadata;
    this.experimental_providerMetadata = options.providerMetadata;
    this.response = options.response;
    this.request = options.request;
    this.logprobs = options.logprobs;
  }
  toJsonResponse(init) {
    var _a17;
    return new Response(JSON.stringify(this.object), {
      status: (_a17 = init == null ? void 0 : init.status) != null ? _a17 : 200,
      headers: prepareResponseHeaders(init == null ? void 0 : init.headers, {
        contentType: "application/json; charset=utf-8"
      })
    });
  }
};
var DelayedPromise = class {
  constructor() {
    this.status = { type: "pending" };
    this._resolve = void 0;
    this._reject = void 0;
  }
  get value() {
    if (this.promise) {
      return this.promise;
    }
    this.promise = new Promise((resolve, reject) => {
      if (this.status.type === "resolved") {
        resolve(this.status.value);
      } else if (this.status.type === "rejected") {
        reject(this.status.error);
      }
      this._resolve = resolve;
      this._reject = reject;
    });
    return this.promise;
  }
  resolve(value) {
    var _a17;
    this.status = { type: "resolved", value };
    if (this.promise) {
      (_a17 = this._resolve) == null ? void 0 : _a17.call(this, value);
    }
  }
  reject(error) {
    var _a17;
    this.status = { type: "rejected", error };
    if (this.promise) {
      (_a17 = this._reject) == null ? void 0 : _a17.call(this, error);
    }
  }
};
function createResolvablePromise() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return {
    promise,
    resolve,
    reject
  };
}
function createStitchableStream() {
  let innerStreamReaders = [];
  let controller = null;
  let isClosed = false;
  let waitForNewStream = createResolvablePromise();
  const processPull = async () => {
    if (isClosed && innerStreamReaders.length === 0) {
      controller == null ? void 0 : controller.close();
      return;
    }
    if (innerStreamReaders.length === 0) {
      waitForNewStream = createResolvablePromise();
      await waitForNewStream.promise;
      return processPull();
    }
    try {
      const { value, done } = await innerStreamReaders[0].read();
      if (done) {
        innerStreamReaders.shift();
        if (innerStreamReaders.length > 0) {
          await processPull();
        } else if (isClosed) {
          controller == null ? void 0 : controller.close();
        }
      } else {
        controller == null ? void 0 : controller.enqueue(value);
      }
    } catch (error) {
      controller == null ? void 0 : controller.error(error);
      innerStreamReaders.shift();
      if (isClosed && innerStreamReaders.length === 0) {
        controller == null ? void 0 : controller.close();
      }
    }
  };
  return {
    stream: new ReadableStream({
      start(controllerParam) {
        controller = controllerParam;
      },
      pull: processPull,
      async cancel() {
        for (const reader of innerStreamReaders) {
          await reader.cancel();
        }
        innerStreamReaders = [];
        isClosed = true;
      }
    }),
    addStream: (innerStream) => {
      if (isClosed) {
        throw new Error("Cannot add inner stream: outer stream is closed");
      }
      innerStreamReaders.push(innerStream.getReader());
      waitForNewStream.resolve();
    },
    /**
     * Gracefully close the outer stream. This will let the inner streams
     * finish processing and then close the outer stream.
     */
    close: () => {
      isClosed = true;
      waitForNewStream.resolve();
      if (innerStreamReaders.length === 0) {
        controller == null ? void 0 : controller.close();
      }
    },
    /**
     * Immediately close the outer stream. This will cancel all inner streams
     * and close the outer stream.
     */
    terminate: () => {
      isClosed = true;
      waitForNewStream.resolve();
      innerStreamReaders.forEach((reader) => reader.cancel());
      innerStreamReaders = [];
      controller == null ? void 0 : controller.close();
    }
  };
}
function now() {
  var _a17, _b;
  return (_b = (_a17 = globalThis == null ? void 0 : globalThis.performance) == null ? void 0 : _a17.now()) != null ? _b : Date.now();
}
var originalGenerateId2 = createIdGenerator({ prefix: "aiobj", size: 24 });
function streamObject({
  model,
  schema: inputSchema,
  schemaName,
  schemaDescription,
  mode,
  output = "object",
  system,
  prompt,
  messages,
  maxRetries,
  abortSignal,
  headers,
  experimental_telemetry: telemetry,
  experimental_providerMetadata,
  providerOptions = experimental_providerMetadata,
  onError,
  onFinish,
  _internal: {
    generateId: generateId3 = originalGenerateId2,
    currentDate = () => /* @__PURE__ */ new Date(),
    now: now2 = now
  } = {},
  ...settings
}) {
  if (typeof model === "string" || model.specificationVersion !== "v1") {
    throw new UnsupportedModelVersionError();
  }
  validateObjectGenerationInput({
    output,
    mode,
    schema: inputSchema,
    schemaName,
    schemaDescription
  });
  const outputStrategy = getOutputStrategy({ output, schema: inputSchema });
  if (outputStrategy.type === "no-schema" && mode === void 0) {
    mode = "json";
  }
  return new DefaultStreamObjectResult({
    model,
    telemetry,
    headers,
    settings,
    maxRetries,
    abortSignal,
    outputStrategy,
    system,
    prompt,
    messages,
    schemaName,
    schemaDescription,
    providerOptions,
    mode,
    onError,
    onFinish,
    generateId: generateId3,
    currentDate,
    now: now2
  });
}
var DefaultStreamObjectResult = class {
  constructor({
    model,
    headers,
    telemetry,
    settings,
    maxRetries: maxRetriesArg,
    abortSignal,
    outputStrategy,
    system,
    prompt,
    messages,
    schemaName,
    schemaDescription,
    providerOptions,
    mode,
    onError,
    onFinish,
    generateId: generateId3,
    currentDate,
    now: now2
  }) {
    this.objectPromise = new DelayedPromise();
    this.usagePromise = new DelayedPromise();
    this.providerMetadataPromise = new DelayedPromise();
    this.warningsPromise = new DelayedPromise();
    this.requestPromise = new DelayedPromise();
    this.responsePromise = new DelayedPromise();
    const { maxRetries, retry } = prepareRetries({
      maxRetries: maxRetriesArg
    });
    const baseTelemetryAttributes = getBaseTelemetryAttributes({
      model,
      telemetry,
      headers,
      settings: { ...settings, maxRetries }
    });
    const tracer = getTracer(telemetry);
    const self = this;
    const stitchableStream = createStitchableStream();
    const eventProcessor = new TransformStream({
      transform(chunk, controller) {
        controller.enqueue(chunk);
        if (chunk.type === "error") {
          onError == null ? void 0 : onError({ error: chunk.error });
        }
      }
    });
    this.baseStream = stitchableStream.stream.pipeThrough(eventProcessor);
    recordSpan({
      name: "ai.streamObject",
      attributes: selectTelemetryAttributes({
        telemetry,
        attributes: {
          ...assembleOperationName({
            operationId: "ai.streamObject",
            telemetry
          }),
          ...baseTelemetryAttributes,
          // specific settings that only make sense on the outer level:
          "ai.prompt": {
            input: () => JSON.stringify({ system, prompt, messages })
          },
          "ai.schema": outputStrategy.jsonSchema != null ? { input: () => JSON.stringify(outputStrategy.jsonSchema) } : void 0,
          "ai.schema.name": schemaName,
          "ai.schema.description": schemaDescription,
          "ai.settings.output": outputStrategy.type,
          "ai.settings.mode": mode
        }
      }),
      tracer,
      endWhenDone: false,
      fn: async (rootSpan) => {
        var _a17, _b;
        if (mode === "auto" || mode == null) {
          mode = model.defaultObjectGenerationMode;
        }
        let callOptions;
        let transformer;
        switch (mode) {
          case "json": {
            const standardizedPrompt = standardizePrompt({
              prompt: {
                system: outputStrategy.jsonSchema == null ? injectJsonInstruction({ prompt: system }) : model.supportsStructuredOutputs ? system : injectJsonInstruction({
                  prompt: system,
                  schema: outputStrategy.jsonSchema
                }),
                prompt,
                messages
              },
              tools: void 0
            });
            callOptions = {
              mode: {
                type: "object-json",
                schema: outputStrategy.jsonSchema,
                name: schemaName,
                description: schemaDescription
              },
              ...prepareCallSettings(settings),
              inputFormat: standardizedPrompt.type,
              prompt: await convertToLanguageModelPrompt({
                prompt: standardizedPrompt,
                modelSupportsImageUrls: model.supportsImageUrls,
                modelSupportsUrl: (_a17 = model.supportsUrl) == null ? void 0 : _a17.bind(model)
                // support 'this' context
              }),
              providerMetadata: providerOptions,
              abortSignal,
              headers
            };
            transformer = {
              transform: (chunk, controller) => {
                switch (chunk.type) {
                  case "text-delta":
                    controller.enqueue(chunk.textDelta);
                    break;
                  case "response-metadata":
                  case "finish":
                  case "error":
                    controller.enqueue(chunk);
                    break;
                }
              }
            };
            break;
          }
          case "tool": {
            const standardizedPrompt = standardizePrompt({
              prompt: { system, prompt, messages },
              tools: void 0
            });
            callOptions = {
              mode: {
                type: "object-tool",
                tool: {
                  type: "function",
                  name: schemaName != null ? schemaName : "json",
                  description: schemaDescription != null ? schemaDescription : "Respond with a JSON object.",
                  parameters: outputStrategy.jsonSchema
                }
              },
              ...prepareCallSettings(settings),
              inputFormat: standardizedPrompt.type,
              prompt: await convertToLanguageModelPrompt({
                prompt: standardizedPrompt,
                modelSupportsImageUrls: model.supportsImageUrls,
                modelSupportsUrl: (_b = model.supportsUrl) == null ? void 0 : _b.bind(model)
                // support 'this' context,
              }),
              providerMetadata: providerOptions,
              abortSignal,
              headers
            };
            transformer = {
              transform(chunk, controller) {
                switch (chunk.type) {
                  case "tool-call-delta":
                    controller.enqueue(chunk.argsTextDelta);
                    break;
                  case "response-metadata":
                  case "finish":
                  case "error":
                    controller.enqueue(chunk);
                    break;
                }
              }
            };
            break;
          }
          case void 0: {
            throw new Error(
              "Model does not have a default object generation mode."
            );
          }
          default: {
            const _exhaustiveCheck = mode;
            throw new Error(`Unsupported mode: ${_exhaustiveCheck}`);
          }
        }
        const {
          result: { stream, warnings, rawResponse, request },
          doStreamSpan,
          startTimestampMs
        } = await retry(
          () => recordSpan({
            name: "ai.streamObject.doStream",
            attributes: selectTelemetryAttributes({
              telemetry,
              attributes: {
                ...assembleOperationName({
                  operationId: "ai.streamObject.doStream",
                  telemetry
                }),
                ...baseTelemetryAttributes,
                "ai.prompt.format": {
                  input: () => callOptions.inputFormat
                },
                "ai.prompt.messages": {
                  input: () => stringifyForTelemetry(callOptions.prompt)
                },
                "ai.settings.mode": mode,
                // standardized gen-ai llm span attributes:
                "gen_ai.system": model.provider,
                "gen_ai.request.model": model.modelId,
                "gen_ai.request.frequency_penalty": settings.frequencyPenalty,
                "gen_ai.request.max_tokens": settings.maxTokens,
                "gen_ai.request.presence_penalty": settings.presencePenalty,
                "gen_ai.request.temperature": settings.temperature,
                "gen_ai.request.top_k": settings.topK,
                "gen_ai.request.top_p": settings.topP
              }
            }),
            tracer,
            endWhenDone: false,
            fn: async (doStreamSpan2) => ({
              startTimestampMs: now2(),
              doStreamSpan: doStreamSpan2,
              result: await model.doStream(callOptions)
            })
          })
        );
        self.requestPromise.resolve(request != null ? request : {});
        let usage;
        let finishReason;
        let providerMetadata;
        let object2;
        let error;
        let accumulatedText = "";
        let textDelta = "";
        let response = {
          id: generateId3(),
          timestamp: currentDate(),
          modelId: model.modelId
        };
        let latestObjectJson = void 0;
        let latestObject = void 0;
        let isFirstChunk = true;
        let isFirstDelta = true;
        const transformedStream = stream.pipeThrough(new TransformStream(transformer)).pipeThrough(
          new TransformStream({
            async transform(chunk, controller) {
              var _a18, _b2, _c;
              if (isFirstChunk) {
                const msToFirstChunk = now2() - startTimestampMs;
                isFirstChunk = false;
                doStreamSpan.addEvent("ai.stream.firstChunk", {
                  "ai.stream.msToFirstChunk": msToFirstChunk
                });
                doStreamSpan.setAttributes({
                  "ai.stream.msToFirstChunk": msToFirstChunk
                });
              }
              if (typeof chunk === "string") {
                accumulatedText += chunk;
                textDelta += chunk;
                const { value: currentObjectJson, state: parseState } = parsePartialJson(accumulatedText);
                if (currentObjectJson !== void 0 && !isDeepEqualData(latestObjectJson, currentObjectJson)) {
                  const validationResult = outputStrategy.validatePartialResult({
                    value: currentObjectJson,
                    textDelta,
                    latestObject,
                    isFirstDelta,
                    isFinalDelta: parseState === "successful-parse"
                  });
                  if (validationResult.success && !isDeepEqualData(
                    latestObject,
                    validationResult.value.partial
                  )) {
                    latestObjectJson = currentObjectJson;
                    latestObject = validationResult.value.partial;
                    controller.enqueue({
                      type: "object",
                      object: latestObject
                    });
                    controller.enqueue({
                      type: "text-delta",
                      textDelta: validationResult.value.textDelta
                    });
                    textDelta = "";
                    isFirstDelta = false;
                  }
                }
                return;
              }
              switch (chunk.type) {
                case "response-metadata": {
                  response = {
                    id: (_a18 = chunk.id) != null ? _a18 : response.id,
                    timestamp: (_b2 = chunk.timestamp) != null ? _b2 : response.timestamp,
                    modelId: (_c = chunk.modelId) != null ? _c : response.modelId
                  };
                  break;
                }
                case "finish": {
                  if (textDelta !== "") {
                    controller.enqueue({ type: "text-delta", textDelta });
                  }
                  finishReason = chunk.finishReason;
                  usage = calculateLanguageModelUsage(chunk.usage);
                  providerMetadata = chunk.providerMetadata;
                  controller.enqueue({ ...chunk, usage, response });
                  self.usagePromise.resolve(usage);
                  self.providerMetadataPromise.resolve(providerMetadata);
                  self.responsePromise.resolve({
                    ...response,
                    headers: rawResponse == null ? void 0 : rawResponse.headers
                  });
                  const validationResult = outputStrategy.validateFinalResult(
                    latestObjectJson,
                    {
                      text: accumulatedText,
                      response,
                      usage
                    }
                  );
                  if (validationResult.success) {
                    object2 = validationResult.value;
                    self.objectPromise.resolve(object2);
                  } else {
                    error = new NoObjectGeneratedError({
                      message: "No object generated: response did not match schema.",
                      cause: validationResult.error,
                      text: accumulatedText,
                      response,
                      usage,
                      finishReason
                    });
                    self.objectPromise.reject(error);
                  }
                  break;
                }
                default: {
                  controller.enqueue(chunk);
                  break;
                }
              }
            },
            // invoke onFinish callback and resolve toolResults promise when the stream is about to close:
            async flush(controller) {
              try {
                const finalUsage = usage != null ? usage : {
                  promptTokens: NaN,
                  completionTokens: NaN,
                  totalTokens: NaN
                };
                doStreamSpan.setAttributes(
                  selectTelemetryAttributes({
                    telemetry,
                    attributes: {
                      "ai.response.finishReason": finishReason,
                      "ai.response.object": {
                        output: () => JSON.stringify(object2)
                      },
                      "ai.response.id": response.id,
                      "ai.response.model": response.modelId,
                      "ai.response.timestamp": response.timestamp.toISOString(),
                      "ai.response.providerMetadata": JSON.stringify(providerMetadata),
                      "ai.usage.promptTokens": finalUsage.promptTokens,
                      "ai.usage.completionTokens": finalUsage.completionTokens,
                      // standardized gen-ai llm span attributes:
                      "gen_ai.response.finish_reasons": [finishReason],
                      "gen_ai.response.id": response.id,
                      "gen_ai.response.model": response.modelId,
                      "gen_ai.usage.input_tokens": finalUsage.promptTokens,
                      "gen_ai.usage.output_tokens": finalUsage.completionTokens
                    }
                  })
                );
                doStreamSpan.end();
                rootSpan.setAttributes(
                  selectTelemetryAttributes({
                    telemetry,
                    attributes: {
                      "ai.usage.promptTokens": finalUsage.promptTokens,
                      "ai.usage.completionTokens": finalUsage.completionTokens,
                      "ai.response.object": {
                        output: () => JSON.stringify(object2)
                      },
                      "ai.response.providerMetadata": JSON.stringify(providerMetadata)
                    }
                  })
                );
                await (onFinish == null ? void 0 : onFinish({
                  usage: finalUsage,
                  object: object2,
                  error,
                  response: {
                    ...response,
                    headers: rawResponse == null ? void 0 : rawResponse.headers
                  },
                  warnings,
                  providerMetadata,
                  experimental_providerMetadata: providerMetadata
                }));
              } catch (error2) {
                controller.enqueue({ type: "error", error: error2 });
              } finally {
                rootSpan.end();
              }
            }
          })
        );
        stitchableStream.addStream(transformedStream);
      }
    }).catch((error) => {
      stitchableStream.addStream(
        new ReadableStream({
          start(controller) {
            controller.enqueue({ type: "error", error });
            controller.close();
          }
        })
      );
    }).finally(() => {
      stitchableStream.close();
    });
    this.outputStrategy = outputStrategy;
  }
  get object() {
    return this.objectPromise.value;
  }
  get usage() {
    return this.usagePromise.value;
  }
  get experimental_providerMetadata() {
    return this.providerMetadataPromise.value;
  }
  get providerMetadata() {
    return this.providerMetadataPromise.value;
  }
  get warnings() {
    return this.warningsPromise.value;
  }
  get request() {
    return this.requestPromise.value;
  }
  get response() {
    return this.responsePromise.value;
  }
  get partialObjectStream() {
    return createAsyncIterableStream(
      this.baseStream.pipeThrough(
        new TransformStream({
          transform(chunk, controller) {
            switch (chunk.type) {
              case "object":
                controller.enqueue(chunk.object);
                break;
              case "text-delta":
              case "finish":
              case "error":
                break;
              default: {
                const _exhaustiveCheck = chunk;
                throw new Error(`Unsupported chunk type: ${_exhaustiveCheck}`);
              }
            }
          }
        })
      )
    );
  }
  get elementStream() {
    return this.outputStrategy.createElementStream(this.baseStream);
  }
  get textStream() {
    return createAsyncIterableStream(
      this.baseStream.pipeThrough(
        new TransformStream({
          transform(chunk, controller) {
            switch (chunk.type) {
              case "text-delta":
                controller.enqueue(chunk.textDelta);
                break;
              case "object":
              case "finish":
              case "error":
                break;
              default: {
                const _exhaustiveCheck = chunk;
                throw new Error(`Unsupported chunk type: ${_exhaustiveCheck}`);
              }
            }
          }
        })
      )
    );
  }
  get fullStream() {
    return createAsyncIterableStream(this.baseStream);
  }
  pipeTextStreamToResponse(response, init) {
    writeToServerResponse({
      response,
      status: init == null ? void 0 : init.status,
      statusText: init == null ? void 0 : init.statusText,
      headers: prepareOutgoingHttpHeaders(init == null ? void 0 : init.headers, {
        contentType: "text/plain; charset=utf-8"
      }),
      stream: this.textStream.pipeThrough(new TextEncoderStream())
    });
  }
  toTextStreamResponse(init) {
    var _a17;
    return new Response(this.textStream.pipeThrough(new TextEncoderStream()), {
      status: (_a17 = init == null ? void 0 : init.status) != null ? _a17 : 200,
      headers: prepareResponseHeaders(init == null ? void 0 : init.headers, {
        contentType: "text/plain; charset=utf-8"
      })
    });
  }
};
var name92 = "AI_NoOutputSpecifiedError";
var marker92 = `vercel.ai.error.${name92}`;
var symbol92 = Symbol.for(marker92);
var _a92;
var NoOutputSpecifiedError = class extends AISDKError {
  // used in isInstance
  constructor({ message = "No output specified." } = {}) {
    super({ name: name92, message });
    this[_a92] = true;
  }
  static isInstance(error) {
    return AISDKError.hasMarker(error, marker92);
  }
};
_a92 = symbol92;
var name102 = "AI_ToolExecutionError";
var marker102 = `vercel.ai.error.${name102}`;
var symbol102 = Symbol.for(marker102);
var _a102;
var ToolExecutionError = class extends AISDKError {
  constructor({
    toolArgs,
    toolName,
    toolCallId,
    cause,
    message = `Error executing tool ${toolName}: ${getErrorMessage(cause)}`
  }) {
    super({ name: name102, message, cause });
    this[_a102] = true;
    this.toolArgs = toolArgs;
    this.toolName = toolName;
    this.toolCallId = toolCallId;
  }
  static isInstance(error) {
    return AISDKError.hasMarker(error, marker102);
  }
};
_a102 = symbol102;
function isNonEmptyObject(object2) {
  return object2 != null && Object.keys(object2).length > 0;
}
function prepareToolsAndToolChoice({
  tools,
  toolChoice,
  activeTools
}) {
  if (!isNonEmptyObject(tools)) {
    return {
      tools: void 0,
      toolChoice: void 0
    };
  }
  const filteredTools = activeTools != null ? Object.entries(tools).filter(
    ([name17]) => activeTools.includes(name17)
  ) : Object.entries(tools);
  return {
    tools: filteredTools.map(([name17, tool2]) => {
      const toolType = tool2.type;
      switch (toolType) {
        case void 0:
        case "function":
          return {
            type: "function",
            name: name17,
            description: tool2.description,
            parameters: asSchema(tool2.parameters).jsonSchema
          };
        case "provider-defined":
          return {
            type: "provider-defined",
            name: name17,
            id: tool2.id,
            args: tool2.args
          };
        default: {
          const exhaustiveCheck = toolType;
          throw new Error(`Unsupported tool type: ${exhaustiveCheck}`);
        }
      }
    }),
    toolChoice: toolChoice == null ? { type: "auto" } : typeof toolChoice === "string" ? { type: toolChoice } : { type: "tool", toolName: toolChoice.toolName }
  };
}
var lastWhitespaceRegexp = /^([\s\S]*?)(\s+)(\S*)$/;
function splitOnLastWhitespace(text2) {
  const match = text2.match(lastWhitespaceRegexp);
  return match ? { prefix: match[1], whitespace: match[2], suffix: match[3] } : void 0;
}
function removeTextAfterLastWhitespace(text2) {
  const match = splitOnLastWhitespace(text2);
  return match ? match.prefix + match.whitespace : text2;
}
var name11 = "AI_InvalidToolArgumentsError";
var marker112 = `vercel.ai.error.${name11}`;
var symbol112 = Symbol.for(marker112);
var _a112;
var InvalidToolArgumentsError = class extends AISDKError {
  constructor({
    toolArgs,
    toolName,
    cause,
    message = `Invalid arguments for tool ${toolName}: ${getErrorMessage(
      cause
    )}`
  }) {
    super({ name: name11, message, cause });
    this[_a112] = true;
    this.toolArgs = toolArgs;
    this.toolName = toolName;
  }
  static isInstance(error) {
    return AISDKError.hasMarker(error, marker112);
  }
};
_a112 = symbol112;
var name122 = "AI_NoSuchToolError";
var marker12 = `vercel.ai.error.${name122}`;
var symbol12 = Symbol.for(marker12);
var _a12;
var NoSuchToolError = class extends AISDKError {
  constructor({
    toolName,
    availableTools = void 0,
    message = `Model tried to call unavailable tool '${toolName}'. ${availableTools === void 0 ? "No tools are available." : `Available tools: ${availableTools.join(", ")}.`}`
  }) {
    super({ name: name122, message });
    this[_a12] = true;
    this.toolName = toolName;
    this.availableTools = availableTools;
  }
  static isInstance(error) {
    return AISDKError.hasMarker(error, marker12);
  }
};
_a12 = symbol12;
var name132 = "AI_ToolCallRepairError";
var marker132 = `vercel.ai.error.${name132}`;
var symbol132 = Symbol.for(marker132);
var _a132;
var ToolCallRepairError = class extends AISDKError {
  constructor({
    cause,
    originalError,
    message = `Error repairing tool call: ${getErrorMessage(cause)}`
  }) {
    super({ name: name132, message, cause });
    this[_a132] = true;
    this.originalError = originalError;
  }
  static isInstance(error) {
    return AISDKError.hasMarker(error, marker132);
  }
};
_a132 = symbol132;
async function parseToolCall({
  toolCall,
  tools,
  repairToolCall,
  system,
  messages
}) {
  if (tools == null) {
    throw new NoSuchToolError({ toolName: toolCall.toolName });
  }
  try {
    return await doParseToolCall({ toolCall, tools });
  } catch (error) {
    if (repairToolCall == null || !(NoSuchToolError.isInstance(error) || InvalidToolArgumentsError.isInstance(error))) {
      throw error;
    }
    let repairedToolCall = null;
    try {
      repairedToolCall = await repairToolCall({
        toolCall,
        tools,
        parameterSchema: ({ toolName }) => asSchema(tools[toolName].parameters).jsonSchema,
        system,
        messages,
        error
      });
    } catch (repairError) {
      throw new ToolCallRepairError({
        cause: repairError,
        originalError: error
      });
    }
    if (repairedToolCall == null) {
      throw error;
    }
    return await doParseToolCall({ toolCall: repairedToolCall, tools });
  }
}
async function doParseToolCall({
  toolCall,
  tools
}) {
  const toolName = toolCall.toolName;
  const tool2 = tools[toolName];
  if (tool2 == null) {
    throw new NoSuchToolError({
      toolName: toolCall.toolName,
      availableTools: Object.keys(tools)
    });
  }
  const schema = asSchema(tool2.parameters);
  const parseResult = toolCall.args.trim() === "" ? safeValidateTypes({ value: {}, schema }) : safeParseJSON({ text: toolCall.args, schema });
  if (parseResult.success === false) {
    throw new InvalidToolArgumentsError({
      toolName,
      toolArgs: toolCall.args,
      cause: parseResult.error
    });
  }
  return {
    type: "tool-call",
    toolCallId: toolCall.toolCallId,
    toolName,
    args: parseResult.value
  };
}
function asReasoningText(reasoning) {
  const reasoningText = reasoning.filter((part) => part.type === "text").map((part) => part.text).join("");
  return reasoningText.length > 0 ? reasoningText : void 0;
}
function toResponseMessages({
  text: text2 = "",
  files,
  reasoning,
  tools,
  toolCalls,
  toolResults,
  messageId,
  generateMessageId
}) {
  const responseMessages = [];
  const content = [];
  if (reasoning.length > 0) {
    content.push(
      ...reasoning.map(
        (part) => part.type === "text" ? { ...part, type: "reasoning" } : { ...part, type: "redacted-reasoning" }
      )
    );
  }
  if (files.length > 0) {
    content.push(
      ...files.map((file) => ({
        type: "file",
        data: file.base64,
        mimeType: file.mimeType
      }))
    );
  }
  if (text2.length > 0) {
    content.push({ type: "text", text: text2 });
  }
  if (toolCalls.length > 0) {
    content.push(...toolCalls);
  }
  if (content.length > 0) {
    responseMessages.push({
      role: "assistant",
      content,
      id: messageId
    });
  }
  if (toolResults.length > 0) {
    responseMessages.push({
      role: "tool",
      id: generateMessageId(),
      content: toolResults.map((toolResult) => {
        const tool2 = tools[toolResult.toolName];
        return (tool2 == null ? void 0 : tool2.experimental_toToolResultContent) != null ? {
          type: "tool-result",
          toolCallId: toolResult.toolCallId,
          toolName: toolResult.toolName,
          result: tool2.experimental_toToolResultContent(toolResult.result),
          experimental_content: tool2.experimental_toToolResultContent(
            toolResult.result
          )
        } : {
          type: "tool-result",
          toolCallId: toolResult.toolCallId,
          toolName: toolResult.toolName,
          result: toolResult.result
        };
      })
    });
  }
  return responseMessages;
}
var originalGenerateId3 = createIdGenerator({
  prefix: "aitxt",
  size: 24
});
var originalGenerateMessageId = createIdGenerator({
  prefix: "msg",
  size: 24
});
async function generateText({
  model,
  tools,
  toolChoice,
  system,
  prompt,
  messages,
  maxRetries: maxRetriesArg,
  abortSignal,
  headers,
  maxSteps = 1,
  experimental_generateMessageId: generateMessageId = originalGenerateMessageId,
  experimental_output: output,
  experimental_continueSteps: continueSteps = false,
  experimental_telemetry: telemetry,
  experimental_providerMetadata,
  providerOptions = experimental_providerMetadata,
  experimental_activeTools: activeTools,
  experimental_prepareStep: prepareStep,
  experimental_repairToolCall: repairToolCall,
  _internal: {
    generateId: generateId3 = originalGenerateId3,
    currentDate = () => /* @__PURE__ */ new Date()
  } = {},
  onStepFinish,
  ...settings
}) {
  var _a17;
  if (typeof model === "string" || model.specificationVersion !== "v1") {
    throw new UnsupportedModelVersionError();
  }
  if (maxSteps < 1) {
    throw new InvalidArgumentError2({
      parameter: "maxSteps",
      value: maxSteps,
      message: "maxSteps must be at least 1"
    });
  }
  const { maxRetries, retry } = prepareRetries({ maxRetries: maxRetriesArg });
  const baseTelemetryAttributes = getBaseTelemetryAttributes({
    model,
    telemetry,
    headers,
    settings: { ...settings, maxRetries }
  });
  const initialPrompt = standardizePrompt({
    prompt: {
      system: (_a17 = output == null ? void 0 : output.injectIntoSystemPrompt({ system, model })) != null ? _a17 : system,
      prompt,
      messages
    },
    tools
  });
  const tracer = getTracer(telemetry);
  return recordSpan({
    name: "ai.generateText",
    attributes: selectTelemetryAttributes({
      telemetry,
      attributes: {
        ...assembleOperationName({
          operationId: "ai.generateText",
          telemetry
        }),
        ...baseTelemetryAttributes,
        // model:
        "ai.model.provider": model.provider,
        "ai.model.id": model.modelId,
        // specific settings that only make sense on the outer level:
        "ai.prompt": {
          input: () => JSON.stringify({ system, prompt, messages })
        },
        "ai.settings.maxSteps": maxSteps
      }
    }),
    tracer,
    fn: async (span) => {
      var _a18, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n;
      const callSettings = prepareCallSettings(settings);
      let currentModelResponse;
      let currentToolCalls = [];
      let currentToolResults = [];
      let currentReasoningDetails = [];
      let stepCount = 0;
      const responseMessages = [];
      let text2 = "";
      const sources = [];
      const steps = [];
      let usage = {
        completionTokens: 0,
        promptTokens: 0,
        totalTokens: 0
      };
      let stepType = "initial";
      do {
        const promptFormat = stepCount === 0 ? initialPrompt.type : "messages";
        const stepInputMessages = [
          ...initialPrompt.messages,
          ...responseMessages
        ];
        const prepareStepResult = await (prepareStep == null ? void 0 : prepareStep({
          model,
          steps,
          maxSteps,
          stepNumber: stepCount
        }));
        const stepToolChoice = (_a18 = prepareStepResult == null ? void 0 : prepareStepResult.toolChoice) != null ? _a18 : toolChoice;
        const stepActiveTools = (_b = prepareStepResult == null ? void 0 : prepareStepResult.experimental_activeTools) != null ? _b : activeTools;
        const stepModel = (_c = prepareStepResult == null ? void 0 : prepareStepResult.model) != null ? _c : model;
        const promptMessages = await convertToLanguageModelPrompt({
          prompt: {
            system: initialPrompt.system,
            messages: stepInputMessages
          },
          modelSupportsImageUrls: stepModel.supportsImageUrls,
          modelSupportsUrl: (_d = stepModel.supportsUrl) == null ? void 0 : _d.bind(stepModel)
          // support 'this' context
        });
        const mode = {
          type: "regular",
          ...prepareToolsAndToolChoice({
            tools,
            toolChoice: stepToolChoice,
            activeTools: stepActiveTools
          })
        };
        currentModelResponse = await retry(
          () => recordSpan({
            name: "ai.generateText.doGenerate",
            attributes: selectTelemetryAttributes({
              telemetry,
              attributes: {
                ...assembleOperationName({
                  operationId: "ai.generateText.doGenerate",
                  telemetry
                }),
                ...baseTelemetryAttributes,
                // model:
                "ai.model.provider": stepModel.provider,
                "ai.model.id": stepModel.modelId,
                // prompt:
                "ai.prompt.format": { input: () => promptFormat },
                "ai.prompt.messages": {
                  input: () => stringifyForTelemetry(promptMessages)
                },
                "ai.prompt.tools": {
                  // convert the language model level tools:
                  input: () => {
                    var _a19;
                    return (_a19 = mode.tools) == null ? void 0 : _a19.map((tool2) => JSON.stringify(tool2));
                  }
                },
                "ai.prompt.toolChoice": {
                  input: () => mode.toolChoice != null ? JSON.stringify(mode.toolChoice) : void 0
                },
                // standardized gen-ai llm span attributes:
                "gen_ai.system": stepModel.provider,
                "gen_ai.request.model": stepModel.modelId,
                "gen_ai.request.frequency_penalty": settings.frequencyPenalty,
                "gen_ai.request.max_tokens": settings.maxTokens,
                "gen_ai.request.presence_penalty": settings.presencePenalty,
                "gen_ai.request.stop_sequences": settings.stopSequences,
                "gen_ai.request.temperature": settings.temperature,
                "gen_ai.request.top_k": settings.topK,
                "gen_ai.request.top_p": settings.topP
              }
            }),
            tracer,
            fn: async (span2) => {
              var _a19, _b2, _c2, _d2, _e2, _f2;
              const result = await stepModel.doGenerate({
                mode,
                ...callSettings,
                inputFormat: promptFormat,
                responseFormat: output == null ? void 0 : output.responseFormat({ model }),
                prompt: promptMessages,
                providerMetadata: providerOptions,
                abortSignal,
                headers
              });
              const responseData = {
                id: (_b2 = (_a19 = result.response) == null ? void 0 : _a19.id) != null ? _b2 : generateId3(),
                timestamp: (_d2 = (_c2 = result.response) == null ? void 0 : _c2.timestamp) != null ? _d2 : currentDate(),
                modelId: (_f2 = (_e2 = result.response) == null ? void 0 : _e2.modelId) != null ? _f2 : stepModel.modelId
              };
              span2.setAttributes(
                selectTelemetryAttributes({
                  telemetry,
                  attributes: {
                    "ai.response.finishReason": result.finishReason,
                    "ai.response.text": {
                      output: () => result.text
                    },
                    "ai.response.toolCalls": {
                      output: () => JSON.stringify(result.toolCalls)
                    },
                    "ai.response.id": responseData.id,
                    "ai.response.model": responseData.modelId,
                    "ai.response.timestamp": responseData.timestamp.toISOString(),
                    "ai.response.providerMetadata": JSON.stringify(
                      result.providerMetadata
                    ),
                    "ai.usage.promptTokens": result.usage.promptTokens,
                    "ai.usage.completionTokens": result.usage.completionTokens,
                    // standardized gen-ai llm span attributes:
                    "gen_ai.response.finish_reasons": [result.finishReason],
                    "gen_ai.response.id": responseData.id,
                    "gen_ai.response.model": responseData.modelId,
                    "gen_ai.usage.input_tokens": result.usage.promptTokens,
                    "gen_ai.usage.output_tokens": result.usage.completionTokens
                  }
                })
              );
              return { ...result, response: responseData };
            }
          })
        );
        currentToolCalls = await Promise.all(
          ((_e = currentModelResponse.toolCalls) != null ? _e : []).map(
            (toolCall) => parseToolCall({
              toolCall,
              tools,
              repairToolCall,
              system,
              messages: stepInputMessages
            })
          )
        );
        currentToolResults = tools == null ? [] : await executeTools({
          toolCalls: currentToolCalls,
          tools,
          tracer,
          telemetry,
          messages: stepInputMessages,
          abortSignal
        });
        const currentUsage = calculateLanguageModelUsage(
          currentModelResponse.usage
        );
        usage = addLanguageModelUsage(usage, currentUsage);
        let nextStepType = "done";
        if (++stepCount < maxSteps) {
          if (continueSteps && currentModelResponse.finishReason === "length" && // only use continue when there are no tool calls:
          currentToolCalls.length === 0) {
            nextStepType = "continue";
          } else if (
            // there are tool calls:
            currentToolCalls.length > 0 && // all current tool calls have results:
            currentToolResults.length === currentToolCalls.length
          ) {
            nextStepType = "tool-result";
          }
        }
        const originalText = (_f = currentModelResponse.text) != null ? _f : "";
        const stepTextLeadingWhitespaceTrimmed = stepType === "continue" && // only for continue steps
        text2.trimEnd() !== text2 ? originalText.trimStart() : originalText;
        const stepText = nextStepType === "continue" ? removeTextAfterLastWhitespace(stepTextLeadingWhitespaceTrimmed) : stepTextLeadingWhitespaceTrimmed;
        text2 = nextStepType === "continue" || stepType === "continue" ? text2 + stepText : stepText;
        currentReasoningDetails = asReasoningDetails(
          currentModelResponse.reasoning
        );
        sources.push(...(_g = currentModelResponse.sources) != null ? _g : []);
        if (stepType === "continue") {
          const lastMessage = responseMessages[responseMessages.length - 1];
          if (typeof lastMessage.content === "string") {
            lastMessage.content += stepText;
          } else {
            lastMessage.content.push({
              text: stepText,
              type: "text"
            });
          }
        } else {
          responseMessages.push(
            ...toResponseMessages({
              text: text2,
              files: asFiles(currentModelResponse.files),
              reasoning: asReasoningDetails(currentModelResponse.reasoning),
              tools: tools != null ? tools : {},
              toolCalls: currentToolCalls,
              toolResults: currentToolResults,
              messageId: generateMessageId(),
              generateMessageId
            })
          );
        }
        const currentStepResult = {
          stepType,
          text: stepText,
          // TODO v5: rename reasoning to reasoningText (and use reasoning for composite array)
          reasoning: asReasoningText(currentReasoningDetails),
          reasoningDetails: currentReasoningDetails,
          files: asFiles(currentModelResponse.files),
          sources: (_h = currentModelResponse.sources) != null ? _h : [],
          toolCalls: currentToolCalls,
          toolResults: currentToolResults,
          finishReason: currentModelResponse.finishReason,
          usage: currentUsage,
          warnings: currentModelResponse.warnings,
          logprobs: currentModelResponse.logprobs,
          request: (_i = currentModelResponse.request) != null ? _i : {},
          response: {
            ...currentModelResponse.response,
            headers: (_j = currentModelResponse.rawResponse) == null ? void 0 : _j.headers,
            body: (_k = currentModelResponse.rawResponse) == null ? void 0 : _k.body,
            // deep clone msgs to avoid mutating past messages in multi-step:
            messages: structuredClone(responseMessages)
          },
          providerMetadata: currentModelResponse.providerMetadata,
          experimental_providerMetadata: currentModelResponse.providerMetadata,
          isContinued: nextStepType === "continue"
        };
        steps.push(currentStepResult);
        await (onStepFinish == null ? void 0 : onStepFinish(currentStepResult));
        stepType = nextStepType;
      } while (stepType !== "done");
      span.setAttributes(
        selectTelemetryAttributes({
          telemetry,
          attributes: {
            "ai.response.finishReason": currentModelResponse.finishReason,
            "ai.response.text": {
              output: () => currentModelResponse.text
            },
            "ai.response.toolCalls": {
              output: () => JSON.stringify(currentModelResponse.toolCalls)
            },
            "ai.usage.promptTokens": currentModelResponse.usage.promptTokens,
            "ai.usage.completionTokens": currentModelResponse.usage.completionTokens,
            "ai.response.providerMetadata": JSON.stringify(
              currentModelResponse.providerMetadata
            )
          }
        })
      );
      return new DefaultGenerateTextResult({
        text: text2,
        files: asFiles(currentModelResponse.files),
        reasoning: asReasoningText(currentReasoningDetails),
        reasoningDetails: currentReasoningDetails,
        sources,
        outputResolver: () => {
          if (output == null) {
            throw new NoOutputSpecifiedError();
          }
          return output.parseOutput(
            { text: text2 },
            {
              response: currentModelResponse.response,
              usage,
              finishReason: currentModelResponse.finishReason
            }
          );
        },
        toolCalls: currentToolCalls,
        toolResults: currentToolResults,
        finishReason: currentModelResponse.finishReason,
        usage,
        warnings: currentModelResponse.warnings,
        request: (_l = currentModelResponse.request) != null ? _l : {},
        response: {
          ...currentModelResponse.response,
          headers: (_m = currentModelResponse.rawResponse) == null ? void 0 : _m.headers,
          body: (_n = currentModelResponse.rawResponse) == null ? void 0 : _n.body,
          messages: responseMessages
        },
        logprobs: currentModelResponse.logprobs,
        steps,
        providerMetadata: currentModelResponse.providerMetadata
      });
    }
  });
}
async function executeTools({
  toolCalls,
  tools,
  tracer,
  telemetry,
  messages,
  abortSignal
}) {
  const toolResults = await Promise.all(
    toolCalls.map(async ({ toolCallId, toolName, args }) => {
      const tool2 = tools[toolName];
      if ((tool2 == null ? void 0 : tool2.execute) == null) {
        return void 0;
      }
      const result = await recordSpan({
        name: "ai.toolCall",
        attributes: selectTelemetryAttributes({
          telemetry,
          attributes: {
            ...assembleOperationName({
              operationId: "ai.toolCall",
              telemetry
            }),
            "ai.toolCall.name": toolName,
            "ai.toolCall.id": toolCallId,
            "ai.toolCall.args": {
              output: () => JSON.stringify(args)
            }
          }
        }),
        tracer,
        fn: async (span) => {
          try {
            const result2 = await tool2.execute(args, {
              toolCallId,
              messages,
              abortSignal
            });
            try {
              span.setAttributes(
                selectTelemetryAttributes({
                  telemetry,
                  attributes: {
                    "ai.toolCall.result": {
                      output: () => JSON.stringify(result2)
                    }
                  }
                })
              );
            } catch (ignored) {
            }
            return result2;
          } catch (error) {
            recordErrorOnSpan(span, error);
            throw new ToolExecutionError({
              toolCallId,
              toolName,
              toolArgs: args,
              cause: error
            });
          }
        }
      });
      return {
        type: "tool-result",
        toolCallId,
        toolName,
        args,
        result
      };
    })
  );
  return toolResults.filter(
    (result) => result != null
  );
}
var DefaultGenerateTextResult = class {
  constructor(options) {
    this.text = options.text;
    this.files = options.files;
    this.reasoning = options.reasoning;
    this.reasoningDetails = options.reasoningDetails;
    this.toolCalls = options.toolCalls;
    this.toolResults = options.toolResults;
    this.finishReason = options.finishReason;
    this.usage = options.usage;
    this.warnings = options.warnings;
    this.request = options.request;
    this.response = options.response;
    this.steps = options.steps;
    this.experimental_providerMetadata = options.providerMetadata;
    this.providerMetadata = options.providerMetadata;
    this.logprobs = options.logprobs;
    this.outputResolver = options.outputResolver;
    this.sources = options.sources;
  }
  get experimental_output() {
    return this.outputResolver();
  }
};
function asReasoningDetails(reasoning) {
  if (reasoning == null) {
    return [];
  }
  if (typeof reasoning === "string") {
    return [{ type: "text", text: reasoning }];
  }
  return reasoning;
}
function asFiles(files) {
  var _a17;
  return (_a17 = files == null ? void 0 : files.map((file) => new DefaultGeneratedFile(file))) != null ? _a17 : [];
}
var output_exports = {};
__export(output_exports, {
  object: () => object,
  text: () => text
});
var name14 = "AI_InvalidStreamPartError";
var marker142 = `vercel.ai.error.${name14}`;
var symbol142 = Symbol.for(marker142);
var _a142;
var InvalidStreamPartError = class extends AISDKError {
  constructor({
    chunk,
    message
  }) {
    super({ name: name14, message });
    this[_a142] = true;
    this.chunk = chunk;
  }
  static isInstance(error) {
    return AISDKError.hasMarker(error, marker142);
  }
};
_a142 = symbol142;
var text = () => ({
  type: "text",
  responseFormat: () => ({ type: "text" }),
  injectIntoSystemPrompt({ system }) {
    return system;
  },
  parsePartial({ text: text2 }) {
    return { partial: text2 };
  },
  parseOutput({ text: text2 }) {
    return text2;
  }
});
var object = ({
  schema: inputSchema
}) => {
  const schema = asSchema(inputSchema);
  return {
    type: "object",
    responseFormat: ({ model }) => ({
      type: "json",
      schema: model.supportsStructuredOutputs ? schema.jsonSchema : void 0
    }),
    injectIntoSystemPrompt({ system, model }) {
      return model.supportsStructuredOutputs ? system : injectJsonInstruction({
        prompt: system,
        schema: schema.jsonSchema
      });
    },
    parsePartial({ text: text2 }) {
      const result = parsePartialJson(text2);
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
    parseOutput({ text: text2 }, context) {
      const parseResult = safeParseJSON({ text: text2 });
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
      const validationResult = safeValidateTypes({
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
function asArray(value) {
  return value === void 0 ? [] : Array.isArray(value) ? value : [value];
}
async function consumeStream({
  stream,
  onError
}) {
  const reader = stream.getReader();
  try {
    while (true) {
      const { done } = await reader.read();
      if (done)
        break;
    }
  } catch (error) {
    onError == null ? void 0 : onError(error);
  } finally {
    reader.releaseLock();
  }
}
function mergeStreams(stream1, stream2) {
  const reader1 = stream1.getReader();
  const reader2 = stream2.getReader();
  let lastRead1 = void 0;
  let lastRead2 = void 0;
  let stream1Done = false;
  let stream2Done = false;
  async function readStream1(controller) {
    try {
      if (lastRead1 == null) {
        lastRead1 = reader1.read();
      }
      const result = await lastRead1;
      lastRead1 = void 0;
      if (!result.done) {
        controller.enqueue(result.value);
      } else {
        controller.close();
      }
    } catch (error) {
      controller.error(error);
    }
  }
  async function readStream2(controller) {
    try {
      if (lastRead2 == null) {
        lastRead2 = reader2.read();
      }
      const result = await lastRead2;
      lastRead2 = void 0;
      if (!result.done) {
        controller.enqueue(result.value);
      } else {
        controller.close();
      }
    } catch (error) {
      controller.error(error);
    }
  }
  return new ReadableStream({
    async pull(controller) {
      try {
        if (stream1Done) {
          await readStream2(controller);
          return;
        }
        if (stream2Done) {
          await readStream1(controller);
          return;
        }
        if (lastRead1 == null) {
          lastRead1 = reader1.read();
        }
        if (lastRead2 == null) {
          lastRead2 = reader2.read();
        }
        const { result, reader } = await Promise.race([
          lastRead1.then((result2) => ({ result: result2, reader: reader1 })),
          lastRead2.then((result2) => ({ result: result2, reader: reader2 }))
        ]);
        if (!result.done) {
          controller.enqueue(result.value);
        }
        if (reader === reader1) {
          lastRead1 = void 0;
          if (result.done) {
            await readStream2(controller);
            stream1Done = true;
          }
        } else {
          lastRead2 = void 0;
          if (result.done) {
            stream2Done = true;
            await readStream1(controller);
          }
        }
      } catch (error) {
        controller.error(error);
      }
    },
    cancel() {
      reader1.cancel();
      reader2.cancel();
    }
  });
}
function runToolsTransformation({
  tools,
  generatorStream,
  toolCallStreaming,
  tracer,
  telemetry,
  system,
  messages,
  abortSignal,
  repairToolCall
}) {
  let toolResultsStreamController = null;
  const toolResultsStream = new ReadableStream({
    start(controller) {
      toolResultsStreamController = controller;
    }
  });
  const activeToolCalls = {};
  const outstandingToolResults = /* @__PURE__ */ new Set();
  let canClose = false;
  let finishChunk = void 0;
  function attemptClose() {
    if (canClose && outstandingToolResults.size === 0) {
      if (finishChunk != null) {
        toolResultsStreamController.enqueue(finishChunk);
      }
      toolResultsStreamController.close();
    }
  }
  const forwardStream = new TransformStream({
    async transform(chunk, controller) {
      const chunkType = chunk.type;
      switch (chunkType) {
        case "text-delta":
        case "reasoning":
        case "reasoning-signature":
        case "redacted-reasoning":
        case "source":
        case "response-metadata":
        case "error": {
          controller.enqueue(chunk);
          break;
        }
        case "file": {
          controller.enqueue(
            new DefaultGeneratedFileWithType({
              data: chunk.data,
              mimeType: chunk.mimeType
            })
          );
          break;
        }
        case "tool-call-delta": {
          if (toolCallStreaming) {
            if (!activeToolCalls[chunk.toolCallId]) {
              controller.enqueue({
                type: "tool-call-streaming-start",
                toolCallId: chunk.toolCallId,
                toolName: chunk.toolName
              });
              activeToolCalls[chunk.toolCallId] = true;
            }
            controller.enqueue({
              type: "tool-call-delta",
              toolCallId: chunk.toolCallId,
              toolName: chunk.toolName,
              argsTextDelta: chunk.argsTextDelta
            });
          }
          break;
        }
        case "tool-call": {
          try {
            const toolCall = await parseToolCall({
              toolCall: chunk,
              tools,
              repairToolCall,
              system,
              messages
            });
            controller.enqueue(toolCall);
            const tool2 = tools[toolCall.toolName];
            if (tool2.execute != null) {
              const toolExecutionId = generateId();
              outstandingToolResults.add(toolExecutionId);
              recordSpan({
                name: "ai.toolCall",
                attributes: selectTelemetryAttributes({
                  telemetry,
                  attributes: {
                    ...assembleOperationName({
                      operationId: "ai.toolCall",
                      telemetry
                    }),
                    "ai.toolCall.name": toolCall.toolName,
                    "ai.toolCall.id": toolCall.toolCallId,
                    "ai.toolCall.args": {
                      output: () => JSON.stringify(toolCall.args)
                    }
                  }
                }),
                tracer,
                fn: async (span) => tool2.execute(toolCall.args, {
                  toolCallId: toolCall.toolCallId,
                  messages,
                  abortSignal
                }).then(
                  (result) => {
                    toolResultsStreamController.enqueue({
                      ...toolCall,
                      type: "tool-result",
                      result
                    });
                    outstandingToolResults.delete(toolExecutionId);
                    attemptClose();
                    try {
                      span.setAttributes(
                        selectTelemetryAttributes({
                          telemetry,
                          attributes: {
                            "ai.toolCall.result": {
                              output: () => JSON.stringify(result)
                            }
                          }
                        })
                      );
                    } catch (ignored) {
                    }
                  },
                  (error) => {
                    recordErrorOnSpan(span, error);
                    toolResultsStreamController.enqueue({
                      type: "error",
                      error: new ToolExecutionError({
                        toolCallId: toolCall.toolCallId,
                        toolName: toolCall.toolName,
                        toolArgs: toolCall.args,
                        cause: error
                      })
                    });
                    outstandingToolResults.delete(toolExecutionId);
                    attemptClose();
                  }
                )
              });
            }
          } catch (error) {
            toolResultsStreamController.enqueue({
              type: "error",
              error
            });
          }
          break;
        }
        case "finish": {
          finishChunk = {
            type: "finish",
            finishReason: chunk.finishReason,
            logprobs: chunk.logprobs,
            usage: calculateLanguageModelUsage(chunk.usage),
            experimental_providerMetadata: chunk.providerMetadata
          };
          break;
        }
        default: {
          const _exhaustiveCheck = chunkType;
          throw new Error(`Unhandled chunk type: ${_exhaustiveCheck}`);
        }
      }
    },
    flush() {
      canClose = true;
      attemptClose();
    }
  });
  return new ReadableStream({
    async start(controller) {
      return Promise.all([
        generatorStream.pipeThrough(forwardStream).pipeTo(
          new WritableStream({
            write(chunk) {
              controller.enqueue(chunk);
            },
            close() {
            }
          })
        ),
        toolResultsStream.pipeTo(
          new WritableStream({
            write(chunk) {
              controller.enqueue(chunk);
            },
            close() {
              controller.close();
            }
          })
        )
      ]);
    }
  });
}
var originalGenerateId4 = createIdGenerator({
  prefix: "aitxt",
  size: 24
});
var originalGenerateMessageId2 = createIdGenerator({
  prefix: "msg",
  size: 24
});
function streamText({
  model,
  tools,
  toolChoice,
  system,
  prompt,
  messages,
  maxRetries,
  abortSignal,
  headers,
  maxSteps = 1,
  experimental_generateMessageId: generateMessageId = originalGenerateMessageId2,
  experimental_output: output,
  experimental_continueSteps: continueSteps = false,
  experimental_telemetry: telemetry,
  experimental_providerMetadata,
  providerOptions = experimental_providerMetadata,
  experimental_toolCallStreaming = false,
  toolCallStreaming = experimental_toolCallStreaming,
  experimental_activeTools: activeTools,
  experimental_repairToolCall: repairToolCall,
  experimental_transform: transform,
  onChunk,
  onError,
  onFinish,
  onStepFinish,
  _internal: {
    now: now2 = now,
    generateId: generateId3 = originalGenerateId4,
    currentDate = () => /* @__PURE__ */ new Date()
  } = {},
  ...settings
}) {
  if (typeof model === "string" || model.specificationVersion !== "v1") {
    throw new UnsupportedModelVersionError();
  }
  return new DefaultStreamTextResult({
    model,
    telemetry,
    headers,
    settings,
    maxRetries,
    abortSignal,
    system,
    prompt,
    messages,
    tools,
    toolChoice,
    toolCallStreaming,
    transforms: asArray(transform),
    activeTools,
    repairToolCall,
    maxSteps,
    output,
    continueSteps,
    providerOptions,
    onChunk,
    onError,
    onFinish,
    onStepFinish,
    now: now2,
    currentDate,
    generateId: generateId3,
    generateMessageId
  });
}
function createOutputTransformStream(output) {
  if (!output) {
    return new TransformStream({
      transform(chunk, controller) {
        controller.enqueue({ part: chunk, partialOutput: void 0 });
      }
    });
  }
  let text2 = "";
  let textChunk = "";
  let lastPublishedJson = "";
  function publishTextChunk({
    controller,
    partialOutput = void 0
  }) {
    controller.enqueue({
      part: { type: "text-delta", textDelta: textChunk },
      partialOutput
    });
    textChunk = "";
  }
  return new TransformStream({
    transform(chunk, controller) {
      if (chunk.type === "step-finish") {
        publishTextChunk({ controller });
      }
      if (chunk.type !== "text-delta") {
        controller.enqueue({ part: chunk, partialOutput: void 0 });
        return;
      }
      text2 += chunk.textDelta;
      textChunk += chunk.textDelta;
      const result = output.parsePartial({ text: text2 });
      if (result != null) {
        const currentJson = JSON.stringify(result.partial);
        if (currentJson !== lastPublishedJson) {
          publishTextChunk({ controller, partialOutput: result.partial });
          lastPublishedJson = currentJson;
        }
      }
    },
    flush(controller) {
      if (textChunk.length > 0) {
        publishTextChunk({ controller });
      }
    }
  });
}
var DefaultStreamTextResult = class {
  constructor({
    model,
    telemetry,
    headers,
    settings,
    maxRetries: maxRetriesArg,
    abortSignal,
    system,
    prompt,
    messages,
    tools,
    toolChoice,
    toolCallStreaming,
    transforms,
    activeTools,
    repairToolCall,
    maxSteps,
    output,
    continueSteps,
    providerOptions,
    now: now2,
    currentDate,
    generateId: generateId3,
    generateMessageId,
    onChunk,
    onError,
    onFinish,
    onStepFinish
  }) {
    this.warningsPromise = new DelayedPromise();
    this.usagePromise = new DelayedPromise();
    this.finishReasonPromise = new DelayedPromise();
    this.providerMetadataPromise = new DelayedPromise();
    this.textPromise = new DelayedPromise();
    this.reasoningPromise = new DelayedPromise();
    this.reasoningDetailsPromise = new DelayedPromise();
    this.sourcesPromise = new DelayedPromise();
    this.filesPromise = new DelayedPromise();
    this.toolCallsPromise = new DelayedPromise();
    this.toolResultsPromise = new DelayedPromise();
    this.requestPromise = new DelayedPromise();
    this.responsePromise = new DelayedPromise();
    this.stepsPromise = new DelayedPromise();
    var _a17;
    if (maxSteps < 1) {
      throw new InvalidArgumentError2({
        parameter: "maxSteps",
        value: maxSteps,
        message: "maxSteps must be at least 1"
      });
    }
    this.output = output;
    let recordedStepText = "";
    let recordedContinuationText = "";
    let recordedFullText = "";
    let stepReasoning = [];
    let stepFiles = [];
    let activeReasoningText = void 0;
    let recordedStepSources = [];
    const recordedSources = [];
    const recordedResponse = {
      id: generateId3(),
      timestamp: currentDate(),
      modelId: model.modelId,
      messages: []
    };
    let recordedToolCalls = [];
    let recordedToolResults = [];
    let recordedFinishReason = void 0;
    let recordedUsage = void 0;
    let stepType = "initial";
    const recordedSteps = [];
    let rootSpan;
    const eventProcessor = new TransformStream({
      async transform(chunk, controller) {
        controller.enqueue(chunk);
        const { part } = chunk;
        if (part.type === "text-delta" || part.type === "reasoning" || part.type === "source" || part.type === "tool-call" || part.type === "tool-result" || part.type === "tool-call-streaming-start" || part.type === "tool-call-delta") {
          await (onChunk == null ? void 0 : onChunk({ chunk: part }));
        }
        if (part.type === "error") {
          await (onError == null ? void 0 : onError({ error: part.error }));
        }
        if (part.type === "text-delta") {
          recordedStepText += part.textDelta;
          recordedContinuationText += part.textDelta;
          recordedFullText += part.textDelta;
        }
        if (part.type === "reasoning") {
          if (activeReasoningText == null) {
            activeReasoningText = { type: "text", text: part.textDelta };
            stepReasoning.push(activeReasoningText);
          } else {
            activeReasoningText.text += part.textDelta;
          }
        }
        if (part.type === "reasoning-signature") {
          if (activeReasoningText == null) {
            throw new AISDKError({
              name: "InvalidStreamPart",
              message: "reasoning-signature without reasoning"
            });
          }
          activeReasoningText.signature = part.signature;
          activeReasoningText = void 0;
        }
        if (part.type === "redacted-reasoning") {
          stepReasoning.push({ type: "redacted", data: part.data });
        }
        if (part.type === "file") {
          stepFiles.push(part);
        }
        if (part.type === "source") {
          recordedSources.push(part.source);
          recordedStepSources.push(part.source);
        }
        if (part.type === "tool-call") {
          recordedToolCalls.push(part);
        }
        if (part.type === "tool-result") {
          recordedToolResults.push(part);
        }
        if (part.type === "step-finish") {
          const stepMessages = toResponseMessages({
            text: recordedContinuationText,
            files: stepFiles,
            reasoning: stepReasoning,
            tools: tools != null ? tools : {},
            toolCalls: recordedToolCalls,
            toolResults: recordedToolResults,
            messageId: part.messageId,
            generateMessageId
          });
          const currentStep = recordedSteps.length;
          let nextStepType = "done";
          if (currentStep + 1 < maxSteps) {
            if (continueSteps && part.finishReason === "length" && // only use continue when there are no tool calls:
            recordedToolCalls.length === 0) {
              nextStepType = "continue";
            } else if (
              // there are tool calls:
              recordedToolCalls.length > 0 && // all current tool calls have results:
              recordedToolResults.length === recordedToolCalls.length
            ) {
              nextStepType = "tool-result";
            }
          }
          const currentStepResult = {
            stepType,
            text: recordedStepText,
            reasoning: asReasoningText(stepReasoning),
            reasoningDetails: stepReasoning,
            files: stepFiles,
            sources: recordedStepSources,
            toolCalls: recordedToolCalls,
            toolResults: recordedToolResults,
            finishReason: part.finishReason,
            usage: part.usage,
            warnings: part.warnings,
            logprobs: part.logprobs,
            request: part.request,
            response: {
              ...part.response,
              messages: [...recordedResponse.messages, ...stepMessages]
            },
            providerMetadata: part.experimental_providerMetadata,
            experimental_providerMetadata: part.experimental_providerMetadata,
            isContinued: part.isContinued
          };
          await (onStepFinish == null ? void 0 : onStepFinish(currentStepResult));
          recordedSteps.push(currentStepResult);
          recordedToolCalls = [];
          recordedToolResults = [];
          recordedStepText = "";
          recordedStepSources = [];
          stepReasoning = [];
          stepFiles = [];
          activeReasoningText = void 0;
          if (nextStepType !== "done") {
            stepType = nextStepType;
          }
          if (nextStepType !== "continue") {
            recordedResponse.messages.push(...stepMessages);
            recordedContinuationText = "";
          }
        }
        if (part.type === "finish") {
          recordedResponse.id = part.response.id;
          recordedResponse.timestamp = part.response.timestamp;
          recordedResponse.modelId = part.response.modelId;
          recordedResponse.headers = part.response.headers;
          recordedUsage = part.usage;
          recordedFinishReason = part.finishReason;
        }
      },
      async flush(controller) {
        var _a18;
        try {
          if (recordedSteps.length === 0) {
            return;
          }
          const lastStep = recordedSteps[recordedSteps.length - 1];
          self.warningsPromise.resolve(lastStep.warnings);
          self.requestPromise.resolve(lastStep.request);
          self.responsePromise.resolve(lastStep.response);
          self.toolCallsPromise.resolve(lastStep.toolCalls);
          self.toolResultsPromise.resolve(lastStep.toolResults);
          self.providerMetadataPromise.resolve(
            lastStep.experimental_providerMetadata
          );
          self.reasoningPromise.resolve(lastStep.reasoning);
          self.reasoningDetailsPromise.resolve(lastStep.reasoningDetails);
          const finishReason = recordedFinishReason != null ? recordedFinishReason : "unknown";
          const usage = recordedUsage != null ? recordedUsage : {
            completionTokens: NaN,
            promptTokens: NaN,
            totalTokens: NaN
          };
          self.finishReasonPromise.resolve(finishReason);
          self.usagePromise.resolve(usage);
          self.textPromise.resolve(recordedFullText);
          self.sourcesPromise.resolve(recordedSources);
          self.filesPromise.resolve(lastStep.files);
          self.stepsPromise.resolve(recordedSteps);
          await (onFinish == null ? void 0 : onFinish({
            finishReason,
            logprobs: void 0,
            usage,
            text: recordedFullText,
            reasoning: lastStep.reasoning,
            reasoningDetails: lastStep.reasoningDetails,
            files: lastStep.files,
            sources: lastStep.sources,
            toolCalls: lastStep.toolCalls,
            toolResults: lastStep.toolResults,
            request: (_a18 = lastStep.request) != null ? _a18 : {},
            response: lastStep.response,
            warnings: lastStep.warnings,
            providerMetadata: lastStep.providerMetadata,
            experimental_providerMetadata: lastStep.experimental_providerMetadata,
            steps: recordedSteps
          }));
          rootSpan.setAttributes(
            selectTelemetryAttributes({
              telemetry,
              attributes: {
                "ai.response.finishReason": finishReason,
                "ai.response.text": { output: () => recordedFullText },
                "ai.response.toolCalls": {
                  output: () => {
                    var _a19;
                    return ((_a19 = lastStep.toolCalls) == null ? void 0 : _a19.length) ? JSON.stringify(lastStep.toolCalls) : void 0;
                  }
                },
                "ai.usage.promptTokens": usage.promptTokens,
                "ai.usage.completionTokens": usage.completionTokens,
                "ai.response.providerMetadata": JSON.stringify(
                  lastStep.providerMetadata
                )
              }
            })
          );
        } catch (error) {
          controller.error(error);
        } finally {
          rootSpan.end();
        }
      }
    });
    const stitchableStream = createStitchableStream();
    this.addStream = stitchableStream.addStream;
    this.closeStream = stitchableStream.close;
    let stream = stitchableStream.stream;
    for (const transform of transforms) {
      stream = stream.pipeThrough(
        transform({
          tools,
          stopStream() {
            stitchableStream.terminate();
          }
        })
      );
    }
    this.baseStream = stream.pipeThrough(createOutputTransformStream(output)).pipeThrough(eventProcessor);
    const { maxRetries, retry } = prepareRetries({
      maxRetries: maxRetriesArg
    });
    const tracer = getTracer(telemetry);
    const baseTelemetryAttributes = getBaseTelemetryAttributes({
      model,
      telemetry,
      headers,
      settings: { ...settings, maxRetries }
    });
    const initialPrompt = standardizePrompt({
      prompt: {
        system: (_a17 = output == null ? void 0 : output.injectIntoSystemPrompt({ system, model })) != null ? _a17 : system,
        prompt,
        messages
      },
      tools
    });
    const self = this;
    recordSpan({
      name: "ai.streamText",
      attributes: selectTelemetryAttributes({
        telemetry,
        attributes: {
          ...assembleOperationName({ operationId: "ai.streamText", telemetry }),
          ...baseTelemetryAttributes,
          // specific settings that only make sense on the outer level:
          "ai.prompt": {
            input: () => JSON.stringify({ system, prompt, messages })
          },
          "ai.settings.maxSteps": maxSteps
        }
      }),
      tracer,
      endWhenDone: false,
      fn: async (rootSpanArg) => {
        rootSpan = rootSpanArg;
        async function streamStep({
          currentStep,
          responseMessages,
          usage,
          stepType: stepType2,
          previousStepText,
          hasLeadingWhitespace,
          messageId
        }) {
          var _a18;
          const promptFormat = responseMessages.length === 0 ? initialPrompt.type : "messages";
          const stepInputMessages = [
            ...initialPrompt.messages,
            ...responseMessages
          ];
          const promptMessages = await convertToLanguageModelPrompt({
            prompt: {
              system: initialPrompt.system,
              messages: stepInputMessages
            },
            modelSupportsImageUrls: model.supportsImageUrls,
            modelSupportsUrl: (_a18 = model.supportsUrl) == null ? void 0 : _a18.bind(model)
            // support 'this' context
          });
          const mode = {
            type: "regular",
            ...prepareToolsAndToolChoice({ tools, toolChoice, activeTools })
          };
          const {
            result: { stream: stream2, warnings, rawResponse, request },
            doStreamSpan,
            startTimestampMs
          } = await retry(
            () => recordSpan({
              name: "ai.streamText.doStream",
              attributes: selectTelemetryAttributes({
                telemetry,
                attributes: {
                  ...assembleOperationName({
                    operationId: "ai.streamText.doStream",
                    telemetry
                  }),
                  ...baseTelemetryAttributes,
                  "ai.prompt.format": {
                    input: () => promptFormat
                  },
                  "ai.prompt.messages": {
                    input: () => stringifyForTelemetry(promptMessages)
                  },
                  "ai.prompt.tools": {
                    // convert the language model level tools:
                    input: () => {
                      var _a19;
                      return (_a19 = mode.tools) == null ? void 0 : _a19.map((tool2) => JSON.stringify(tool2));
                    }
                  },
                  "ai.prompt.toolChoice": {
                    input: () => mode.toolChoice != null ? JSON.stringify(mode.toolChoice) : void 0
                  },
                  // standardized gen-ai llm span attributes:
                  "gen_ai.system": model.provider,
                  "gen_ai.request.model": model.modelId,
                  "gen_ai.request.frequency_penalty": settings.frequencyPenalty,
                  "gen_ai.request.max_tokens": settings.maxTokens,
                  "gen_ai.request.presence_penalty": settings.presencePenalty,
                  "gen_ai.request.stop_sequences": settings.stopSequences,
                  "gen_ai.request.temperature": settings.temperature,
                  "gen_ai.request.top_k": settings.topK,
                  "gen_ai.request.top_p": settings.topP
                }
              }),
              tracer,
              endWhenDone: false,
              fn: async (doStreamSpan2) => ({
                startTimestampMs: now2(),
                // get before the call
                doStreamSpan: doStreamSpan2,
                result: await model.doStream({
                  mode,
                  ...prepareCallSettings(settings),
                  inputFormat: promptFormat,
                  responseFormat: output == null ? void 0 : output.responseFormat({ model }),
                  prompt: promptMessages,
                  providerMetadata: providerOptions,
                  abortSignal,
                  headers
                })
              })
            })
          );
          const transformedStream = runToolsTransformation({
            tools,
            generatorStream: stream2,
            toolCallStreaming,
            tracer,
            telemetry,
            system,
            messages: stepInputMessages,
            repairToolCall,
            abortSignal
          });
          const stepRequest = request != null ? request : {};
          const stepToolCalls = [];
          const stepToolResults = [];
          const stepReasoning2 = [];
          const stepFiles2 = [];
          let activeReasoningText2 = void 0;
          let stepFinishReason = "unknown";
          let stepUsage = {
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0
          };
          let stepProviderMetadata;
          let stepFirstChunk = true;
          let stepText = "";
          let fullStepText = stepType2 === "continue" ? previousStepText : "";
          let stepLogProbs;
          let stepResponse = {
            id: generateId3(),
            timestamp: currentDate(),
            modelId: model.modelId
          };
          let chunkBuffer = "";
          let chunkTextPublished = false;
          let inWhitespacePrefix = true;
          let hasWhitespaceSuffix = false;
          async function publishTextChunk({
            controller,
            chunk
          }) {
            controller.enqueue(chunk);
            stepText += chunk.textDelta;
            fullStepText += chunk.textDelta;
            chunkTextPublished = true;
            hasWhitespaceSuffix = chunk.textDelta.trimEnd() !== chunk.textDelta;
          }
          self.addStream(
            transformedStream.pipeThrough(
              new TransformStream({
                async transform(chunk, controller) {
                  var _a19, _b, _c;
                  if (stepFirstChunk) {
                    const msToFirstChunk = now2() - startTimestampMs;
                    stepFirstChunk = false;
                    doStreamSpan.addEvent("ai.stream.firstChunk", {
                      "ai.response.msToFirstChunk": msToFirstChunk
                    });
                    doStreamSpan.setAttributes({
                      "ai.response.msToFirstChunk": msToFirstChunk
                    });
                    controller.enqueue({
                      type: "step-start",
                      messageId,
                      request: stepRequest,
                      warnings: warnings != null ? warnings : []
                    });
                  }
                  if (chunk.type === "text-delta" && chunk.textDelta.length === 0) {
                    return;
                  }
                  const chunkType = chunk.type;
                  switch (chunkType) {
                    case "text-delta": {
                      if (continueSteps) {
                        const trimmedChunkText = inWhitespacePrefix && hasLeadingWhitespace ? chunk.textDelta.trimStart() : chunk.textDelta;
                        if (trimmedChunkText.length === 0) {
                          break;
                        }
                        inWhitespacePrefix = false;
                        chunkBuffer += trimmedChunkText;
                        const split = splitOnLastWhitespace(chunkBuffer);
                        if (split != null) {
                          chunkBuffer = split.suffix;
                          await publishTextChunk({
                            controller,
                            chunk: {
                              type: "text-delta",
                              textDelta: split.prefix + split.whitespace
                            }
                          });
                        }
                      } else {
                        await publishTextChunk({ controller, chunk });
                      }
                      break;
                    }
                    case "reasoning": {
                      controller.enqueue(chunk);
                      if (activeReasoningText2 == null) {
                        activeReasoningText2 = {
                          type: "text",
                          text: chunk.textDelta
                        };
                        stepReasoning2.push(activeReasoningText2);
                      } else {
                        activeReasoningText2.text += chunk.textDelta;
                      }
                      break;
                    }
                    case "reasoning-signature": {
                      controller.enqueue(chunk);
                      if (activeReasoningText2 == null) {
                        throw new InvalidStreamPartError({
                          chunk,
                          message: "reasoning-signature without reasoning"
                        });
                      }
                      activeReasoningText2.signature = chunk.signature;
                      activeReasoningText2 = void 0;
                      break;
                    }
                    case "redacted-reasoning": {
                      controller.enqueue(chunk);
                      stepReasoning2.push({
                        type: "redacted",
                        data: chunk.data
                      });
                      break;
                    }
                    case "tool-call": {
                      controller.enqueue(chunk);
                      stepToolCalls.push(chunk);
                      break;
                    }
                    case "tool-result": {
                      controller.enqueue(chunk);
                      stepToolResults.push(chunk);
                      break;
                    }
                    case "response-metadata": {
                      stepResponse = {
                        id: (_a19 = chunk.id) != null ? _a19 : stepResponse.id,
                        timestamp: (_b = chunk.timestamp) != null ? _b : stepResponse.timestamp,
                        modelId: (_c = chunk.modelId) != null ? _c : stepResponse.modelId
                      };
                      break;
                    }
                    case "finish": {
                      stepUsage = chunk.usage;
                      stepFinishReason = chunk.finishReason;
                      stepProviderMetadata = chunk.experimental_providerMetadata;
                      stepLogProbs = chunk.logprobs;
                      const msToFinish = now2() - startTimestampMs;
                      doStreamSpan.addEvent("ai.stream.finish");
                      doStreamSpan.setAttributes({
                        "ai.response.msToFinish": msToFinish,
                        "ai.response.avgCompletionTokensPerSecond": 1e3 * stepUsage.completionTokens / msToFinish
                      });
                      break;
                    }
                    case "file": {
                      stepFiles2.push(chunk);
                      controller.enqueue(chunk);
                      break;
                    }
                    case "source":
                    case "tool-call-streaming-start":
                    case "tool-call-delta": {
                      controller.enqueue(chunk);
                      break;
                    }
                    case "error": {
                      controller.enqueue(chunk);
                      stepFinishReason = "error";
                      break;
                    }
                    default: {
                      const exhaustiveCheck = chunkType;
                      throw new Error(`Unknown chunk type: ${exhaustiveCheck}`);
                    }
                  }
                },
                // invoke onFinish callback and resolve toolResults promise when the stream is about to close:
                async flush(controller) {
                  const stepToolCallsJson = stepToolCalls.length > 0 ? JSON.stringify(stepToolCalls) : void 0;
                  let nextStepType = "done";
                  if (currentStep + 1 < maxSteps) {
                    if (continueSteps && stepFinishReason === "length" && // only use continue when there are no tool calls:
                    stepToolCalls.length === 0) {
                      nextStepType = "continue";
                    } else if (
                      // there are tool calls:
                      stepToolCalls.length > 0 && // all current tool calls have results:
                      stepToolResults.length === stepToolCalls.length
                    ) {
                      nextStepType = "tool-result";
                    }
                  }
                  if (continueSteps && chunkBuffer.length > 0 && (nextStepType !== "continue" || // when the next step is a regular step, publish the buffer
                  stepType2 === "continue" && !chunkTextPublished)) {
                    await publishTextChunk({
                      controller,
                      chunk: {
                        type: "text-delta",
                        textDelta: chunkBuffer
                      }
                    });
                    chunkBuffer = "";
                  }
                  try {
                    doStreamSpan.setAttributes(
                      selectTelemetryAttributes({
                        telemetry,
                        attributes: {
                          "ai.response.finishReason": stepFinishReason,
                          "ai.response.text": { output: () => stepText },
                          "ai.response.toolCalls": {
                            output: () => stepToolCallsJson
                          },
                          "ai.response.id": stepResponse.id,
                          "ai.response.model": stepResponse.modelId,
                          "ai.response.timestamp": stepResponse.timestamp.toISOString(),
                          "ai.response.providerMetadata": JSON.stringify(stepProviderMetadata),
                          "ai.usage.promptTokens": stepUsage.promptTokens,
                          "ai.usage.completionTokens": stepUsage.completionTokens,
                          // standardized gen-ai llm span attributes:
                          "gen_ai.response.finish_reasons": [stepFinishReason],
                          "gen_ai.response.id": stepResponse.id,
                          "gen_ai.response.model": stepResponse.modelId,
                          "gen_ai.usage.input_tokens": stepUsage.promptTokens,
                          "gen_ai.usage.output_tokens": stepUsage.completionTokens
                        }
                      })
                    );
                  } catch (error) {
                  } finally {
                    doStreamSpan.end();
                  }
                  controller.enqueue({
                    type: "step-finish",
                    finishReason: stepFinishReason,
                    usage: stepUsage,
                    providerMetadata: stepProviderMetadata,
                    experimental_providerMetadata: stepProviderMetadata,
                    logprobs: stepLogProbs,
                    request: stepRequest,
                    response: {
                      ...stepResponse,
                      headers: rawResponse == null ? void 0 : rawResponse.headers
                    },
                    warnings,
                    isContinued: nextStepType === "continue",
                    messageId
                  });
                  const combinedUsage = addLanguageModelUsage(usage, stepUsage);
                  if (nextStepType === "done") {
                    controller.enqueue({
                      type: "finish",
                      finishReason: stepFinishReason,
                      usage: combinedUsage,
                      providerMetadata: stepProviderMetadata,
                      experimental_providerMetadata: stepProviderMetadata,
                      logprobs: stepLogProbs,
                      response: {
                        ...stepResponse,
                        headers: rawResponse == null ? void 0 : rawResponse.headers
                      }
                    });
                    self.closeStream();
                  } else {
                    if (stepType2 === "continue") {
                      const lastMessage = responseMessages[responseMessages.length - 1];
                      if (typeof lastMessage.content === "string") {
                        lastMessage.content += stepText;
                      } else {
                        lastMessage.content.push({
                          text: stepText,
                          type: "text"
                        });
                      }
                    } else {
                      responseMessages.push(
                        ...toResponseMessages({
                          text: stepText,
                          files: stepFiles2,
                          reasoning: stepReasoning2,
                          tools: tools != null ? tools : {},
                          toolCalls: stepToolCalls,
                          toolResults: stepToolResults,
                          messageId,
                          generateMessageId
                        })
                      );
                    }
                    await streamStep({
                      currentStep: currentStep + 1,
                      responseMessages,
                      usage: combinedUsage,
                      stepType: nextStepType,
                      previousStepText: fullStepText,
                      hasLeadingWhitespace: hasWhitespaceSuffix,
                      messageId: (
                        // keep the same id when continuing a step:
                        nextStepType === "continue" ? messageId : generateMessageId()
                      )
                    });
                  }
                }
              })
            )
          );
        }
        await streamStep({
          currentStep: 0,
          responseMessages: [],
          usage: {
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0
          },
          previousStepText: "",
          stepType: "initial",
          hasLeadingWhitespace: false,
          messageId: generateMessageId()
        });
      }
    }).catch((error) => {
      self.addStream(
        new ReadableStream({
          start(controller) {
            controller.enqueue({ type: "error", error });
            controller.close();
          }
        })
      );
      self.closeStream();
    });
  }
  get warnings() {
    return this.warningsPromise.value;
  }
  get usage() {
    return this.usagePromise.value;
  }
  get finishReason() {
    return this.finishReasonPromise.value;
  }
  get experimental_providerMetadata() {
    return this.providerMetadataPromise.value;
  }
  get providerMetadata() {
    return this.providerMetadataPromise.value;
  }
  get text() {
    return this.textPromise.value;
  }
  get reasoning() {
    return this.reasoningPromise.value;
  }
  get reasoningDetails() {
    return this.reasoningDetailsPromise.value;
  }
  get sources() {
    return this.sourcesPromise.value;
  }
  get files() {
    return this.filesPromise.value;
  }
  get toolCalls() {
    return this.toolCallsPromise.value;
  }
  get toolResults() {
    return this.toolResultsPromise.value;
  }
  get request() {
    return this.requestPromise.value;
  }
  get response() {
    return this.responsePromise.value;
  }
  get steps() {
    return this.stepsPromise.value;
  }
  /**
  Split out a new stream from the original stream.
  The original stream is replaced to allow for further splitting,
  since we do not know how many times the stream will be split.
  
  Note: this leads to buffering the stream content on the server.
  However, the LLM results are expected to be small enough to not cause issues.
     */
  teeStream() {
    const [stream1, stream2] = this.baseStream.tee();
    this.baseStream = stream2;
    return stream1;
  }
  get textStream() {
    return createAsyncIterableStream(
      this.teeStream().pipeThrough(
        new TransformStream({
          transform({ part }, controller) {
            if (part.type === "text-delta") {
              controller.enqueue(part.textDelta);
            }
          }
        })
      )
    );
  }
  get fullStream() {
    return createAsyncIterableStream(
      this.teeStream().pipeThrough(
        new TransformStream({
          transform({ part }, controller) {
            controller.enqueue(part);
          }
        })
      )
    );
  }
  async consumeStream(options) {
    var _a17;
    try {
      await consumeStream({
        stream: this.fullStream,
        onError: options == null ? void 0 : options.onError
      });
    } catch (error) {
      (_a17 = options == null ? void 0 : options.onError) == null ? void 0 : _a17.call(options, error);
    }
  }
  get experimental_partialOutputStream() {
    if (this.output == null) {
      throw new NoOutputSpecifiedError();
    }
    return createAsyncIterableStream(
      this.teeStream().pipeThrough(
        new TransformStream({
          transform({ partialOutput }, controller) {
            if (partialOutput != null) {
              controller.enqueue(partialOutput);
            }
          }
        })
      )
    );
  }
  toDataStreamInternal({
    getErrorMessage: getErrorMessage5 = () => "An error occurred.",
    // mask error messages for safety by default
    sendUsage = true,
    sendReasoning = false,
    sendSources = false,
    experimental_sendFinish = true
  }) {
    return this.fullStream.pipeThrough(
      new TransformStream({
        transform: async (chunk, controller) => {
          const chunkType = chunk.type;
          switch (chunkType) {
            case "text-delta": {
              controller.enqueue(formatDataStreamPart("text", chunk.textDelta));
              break;
            }
            case "reasoning": {
              if (sendReasoning) {
                controller.enqueue(
                  formatDataStreamPart("reasoning", chunk.textDelta)
                );
              }
              break;
            }
            case "redacted-reasoning": {
              if (sendReasoning) {
                controller.enqueue(
                  formatDataStreamPart("redacted_reasoning", {
                    data: chunk.data
                  })
                );
              }
              break;
            }
            case "reasoning-signature": {
              if (sendReasoning) {
                controller.enqueue(
                  formatDataStreamPart("reasoning_signature", {
                    signature: chunk.signature
                  })
                );
              }
              break;
            }
            case "file": {
              controller.enqueue(
                formatDataStreamPart("file", {
                  mimeType: chunk.mimeType,
                  data: chunk.base64
                })
              );
              break;
            }
            case "source": {
              if (sendSources) {
                controller.enqueue(
                  formatDataStreamPart("source", chunk.source)
                );
              }
              break;
            }
            case "tool-call-streaming-start": {
              controller.enqueue(
                formatDataStreamPart("tool_call_streaming_start", {
                  toolCallId: chunk.toolCallId,
                  toolName: chunk.toolName
                })
              );
              break;
            }
            case "tool-call-delta": {
              controller.enqueue(
                formatDataStreamPart("tool_call_delta", {
                  toolCallId: chunk.toolCallId,
                  argsTextDelta: chunk.argsTextDelta
                })
              );
              break;
            }
            case "tool-call": {
              controller.enqueue(
                formatDataStreamPart("tool_call", {
                  toolCallId: chunk.toolCallId,
                  toolName: chunk.toolName,
                  args: chunk.args
                })
              );
              break;
            }
            case "tool-result": {
              controller.enqueue(
                formatDataStreamPart("tool_result", {
                  toolCallId: chunk.toolCallId,
                  result: chunk.result
                })
              );
              break;
            }
            case "error": {
              controller.enqueue(
                formatDataStreamPart("error", getErrorMessage5(chunk.error))
              );
              break;
            }
            case "step-start": {
              controller.enqueue(
                formatDataStreamPart("start_step", {
                  messageId: chunk.messageId
                })
              );
              break;
            }
            case "step-finish": {
              controller.enqueue(
                formatDataStreamPart("finish_step", {
                  finishReason: chunk.finishReason,
                  usage: sendUsage ? {
                    promptTokens: chunk.usage.promptTokens,
                    completionTokens: chunk.usage.completionTokens
                  } : void 0,
                  isContinued: chunk.isContinued
                })
              );
              break;
            }
            case "finish": {
              if (experimental_sendFinish) {
                controller.enqueue(
                  formatDataStreamPart("finish_message", {
                    finishReason: chunk.finishReason,
                    usage: sendUsage ? {
                      promptTokens: chunk.usage.promptTokens,
                      completionTokens: chunk.usage.completionTokens
                    } : void 0
                  })
                );
              }
              break;
            }
            default: {
              const exhaustiveCheck = chunkType;
              throw new Error(`Unknown chunk type: ${exhaustiveCheck}`);
            }
          }
        }
      })
    );
  }
  pipeDataStreamToResponse(response, {
    status,
    statusText,
    headers,
    data,
    getErrorMessage: getErrorMessage5,
    sendUsage,
    sendReasoning,
    sendSources,
    experimental_sendFinish
  } = {}) {
    writeToServerResponse({
      response,
      status,
      statusText,
      headers: prepareOutgoingHttpHeaders(headers, {
        contentType: "text/plain; charset=utf-8",
        dataStreamVersion: "v1"
      }),
      stream: this.toDataStream({
        data,
        getErrorMessage: getErrorMessage5,
        sendUsage,
        sendReasoning,
        sendSources,
        experimental_sendFinish
      })
    });
  }
  pipeTextStreamToResponse(response, init) {
    writeToServerResponse({
      response,
      status: init == null ? void 0 : init.status,
      statusText: init == null ? void 0 : init.statusText,
      headers: prepareOutgoingHttpHeaders(init == null ? void 0 : init.headers, {
        contentType: "text/plain; charset=utf-8"
      }),
      stream: this.textStream.pipeThrough(new TextEncoderStream())
    });
  }
  // TODO breaking change 5.0: remove pipeThrough(new TextEncoderStream())
  toDataStream(options) {
    const stream = this.toDataStreamInternal({
      getErrorMessage: options == null ? void 0 : options.getErrorMessage,
      sendUsage: options == null ? void 0 : options.sendUsage,
      sendReasoning: options == null ? void 0 : options.sendReasoning,
      sendSources: options == null ? void 0 : options.sendSources,
      experimental_sendFinish: options == null ? void 0 : options.experimental_sendFinish
    }).pipeThrough(new TextEncoderStream());
    return (options == null ? void 0 : options.data) ? mergeStreams(options == null ? void 0 : options.data.stream, stream) : stream;
  }
  mergeIntoDataStream(writer, options) {
    writer.merge(
      this.toDataStreamInternal({
        getErrorMessage: writer.onError,
        sendUsage: options == null ? void 0 : options.sendUsage,
        sendReasoning: options == null ? void 0 : options.sendReasoning,
        sendSources: options == null ? void 0 : options.sendSources,
        experimental_sendFinish: options == null ? void 0 : options.experimental_sendFinish
      })
    );
  }
  toDataStreamResponse({
    headers,
    status,
    statusText,
    data,
    getErrorMessage: getErrorMessage5,
    sendUsage,
    sendReasoning,
    sendSources,
    experimental_sendFinish
  } = {}) {
    return new Response(
      this.toDataStream({
        data,
        getErrorMessage: getErrorMessage5,
        sendUsage,
        sendReasoning,
        sendSources,
        experimental_sendFinish
      }),
      {
        status,
        statusText,
        headers: prepareResponseHeaders(headers, {
          contentType: "text/plain; charset=utf-8",
          dataStreamVersion: "v1"
        })
      }
    );
  }
  toTextStreamResponse(init) {
    var _a17;
    return new Response(this.textStream.pipeThrough(new TextEncoderStream()), {
      status: (_a17 = init == null ? void 0 : init.status) != null ? _a17 : 200,
      headers: prepareResponseHeaders(init == null ? void 0 : init.headers, {
        contentType: "text/plain; charset=utf-8"
      })
    });
  }
};
var ClientOrServerImplementationSchema = objectType({
  name: stringType(),
  version: stringType()
}).passthrough();
var BaseParamsSchema = objectType({
  _meta: optionalType(objectType({}).passthrough())
}).passthrough();
var ResultSchema = BaseParamsSchema;
var RequestSchema = objectType({
  method: stringType(),
  params: optionalType(BaseParamsSchema)
});
var ServerCapabilitiesSchema = objectType({
  experimental: optionalType(objectType({}).passthrough()),
  logging: optionalType(objectType({}).passthrough()),
  prompts: optionalType(
    objectType({
      listChanged: optionalType(booleanType())
    }).passthrough()
  ),
  resources: optionalType(
    objectType({
      subscribe: optionalType(booleanType()),
      listChanged: optionalType(booleanType())
    }).passthrough()
  ),
  tools: optionalType(
    objectType({
      listChanged: optionalType(booleanType())
    }).passthrough()
  )
}).passthrough();
ResultSchema.extend({
  protocolVersion: stringType(),
  capabilities: ServerCapabilitiesSchema,
  serverInfo: ClientOrServerImplementationSchema,
  instructions: optionalType(stringType())
});
var PaginatedResultSchema = ResultSchema.extend({
  nextCursor: optionalType(stringType())
});
var ToolSchema = objectType({
  name: stringType(),
  description: optionalType(stringType()),
  inputSchema: objectType({
    type: literalType("object"),
    properties: optionalType(objectType({}).passthrough())
  }).passthrough()
}).passthrough();
PaginatedResultSchema.extend({
  tools: arrayType(ToolSchema)
});
var TextContentSchema = objectType({
  type: literalType("text"),
  text: stringType()
}).passthrough();
var ImageContentSchema = objectType({
  type: literalType("image"),
  data: stringType().base64(),
  mimeType: stringType()
}).passthrough();
var ResourceContentsSchema = objectType({
  /**
   * The URI of this resource.
   */
  uri: stringType(),
  /**
   * The MIME type of this resource, if known.
   */
  mimeType: optionalType(stringType())
}).passthrough();
var TextResourceContentsSchema = ResourceContentsSchema.extend({
  text: stringType()
});
var BlobResourceContentsSchema = ResourceContentsSchema.extend({
  blob: stringType().base64()
});
var EmbeddedResourceSchema = objectType({
  type: literalType("resource"),
  resource: unionType([TextResourceContentsSchema, BlobResourceContentsSchema])
}).passthrough();
ResultSchema.extend({
  content: arrayType(
    unionType([TextContentSchema, ImageContentSchema, EmbeddedResourceSchema])
  ),
  isError: booleanType().default(false).optional()
}).or(
  ResultSchema.extend({
    toolResult: unknownType()
  })
);
var JSONRPC_VERSION = "2.0";
var JSONRPCRequestSchema = objectType({
  jsonrpc: literalType(JSONRPC_VERSION),
  id: unionType([stringType(), numberType().int()])
}).merge(RequestSchema).strict();
var JSONRPCResponseSchema = objectType({
  jsonrpc: literalType(JSONRPC_VERSION),
  id: unionType([stringType(), numberType().int()]),
  result: ResultSchema
}).strict();
var JSONRPCErrorSchema = objectType({
  jsonrpc: literalType(JSONRPC_VERSION),
  id: unionType([stringType(), numberType().int()]),
  error: objectType({
    code: numberType().int(),
    message: stringType(),
    data: optionalType(unknownType())
  })
}).strict();
var JSONRPCNotificationSchema = objectType({
  jsonrpc: literalType(JSONRPC_VERSION)
}).merge(
  objectType({
    method: stringType(),
    params: optionalType(BaseParamsSchema)
  })
).strict();
unionType([
  JSONRPCRequestSchema,
  JSONRPCNotificationSchema,
  JSONRPCResponseSchema,
  JSONRPCErrorSchema
]);
var langchain_adapter_exports = {};
__export(langchain_adapter_exports, {
  mergeIntoDataStream: () => mergeIntoDataStream,
  toDataStream: () => toDataStream,
  toDataStreamResponse: () => toDataStreamResponse
});
function createCallbacksTransformer(callbacks = {}) {
  const textEncoder = new TextEncoder();
  let aggregatedResponse = "";
  return new TransformStream({
    async start() {
      if (callbacks.onStart)
        await callbacks.onStart();
    },
    async transform(message, controller) {
      controller.enqueue(textEncoder.encode(message));
      aggregatedResponse += message;
      if (callbacks.onToken)
        await callbacks.onToken(message);
      if (callbacks.onText && typeof message === "string") {
        await callbacks.onText(message);
      }
    },
    async flush() {
      if (callbacks.onCompletion) {
        await callbacks.onCompletion(aggregatedResponse);
      }
      if (callbacks.onFinal) {
        await callbacks.onFinal(aggregatedResponse);
      }
    }
  });
}
function toDataStreamInternal(stream, callbacks) {
  return stream.pipeThrough(
    new TransformStream({
      transform: async (value, controller) => {
        var _a17;
        if (typeof value === "string") {
          controller.enqueue(value);
          return;
        }
        if ("event" in value) {
          if (value.event === "on_chat_model_stream") {
            forwardAIMessageChunk(
              (_a17 = value.data) == null ? void 0 : _a17.chunk,
              controller
            );
          }
          return;
        }
        forwardAIMessageChunk(value, controller);
      }
    })
  ).pipeThrough(createCallbacksTransformer(callbacks)).pipeThrough(new TextDecoderStream()).pipeThrough(
    new TransformStream({
      transform: async (chunk, controller) => {
        controller.enqueue(formatDataStreamPart("text", chunk));
      }
    })
  );
}
function toDataStream(stream, callbacks) {
  return toDataStreamInternal(stream, callbacks).pipeThrough(
    new TextEncoderStream()
  );
}
function toDataStreamResponse(stream, options) {
  var _a17;
  const dataStream = toDataStreamInternal(
    stream,
    options == null ? void 0 : options.callbacks
  ).pipeThrough(new TextEncoderStream());
  const data = options == null ? void 0 : options.data;
  const init = options == null ? void 0 : options.init;
  const responseStream = data ? mergeStreams(data.stream, dataStream) : dataStream;
  return new Response(responseStream, {
    status: (_a17 = init == null ? void 0 : init.status) != null ? _a17 : 200,
    statusText: init == null ? void 0 : init.statusText,
    headers: prepareResponseHeaders(init == null ? void 0 : init.headers, {
      contentType: "text/plain; charset=utf-8",
      dataStreamVersion: "v1"
    })
  });
}
function mergeIntoDataStream(stream, options) {
  options.dataStream.merge(toDataStreamInternal(stream, options.callbacks));
}
function forwardAIMessageChunk(chunk, controller) {
  if (typeof chunk.content === "string") {
    controller.enqueue(chunk.content);
  } else {
    const content = chunk.content;
    for (const item of content) {
      if (item.type === "text") {
        controller.enqueue(item.text);
      }
    }
  }
}
var llamaindex_adapter_exports = {};
__export(llamaindex_adapter_exports, {
  mergeIntoDataStream: () => mergeIntoDataStream2,
  toDataStream: () => toDataStream2,
  toDataStreamResponse: () => toDataStreamResponse2
});
function toDataStreamInternal2(stream, callbacks) {
  const trimStart = trimStartOfStream();
  return convertAsyncIteratorToReadableStream(stream[Symbol.asyncIterator]()).pipeThrough(
    new TransformStream({
      async transform(message, controller) {
        controller.enqueue(trimStart(message.delta));
      }
    })
  ).pipeThrough(createCallbacksTransformer(callbacks)).pipeThrough(new TextDecoderStream()).pipeThrough(
    new TransformStream({
      transform: async (chunk, controller) => {
        controller.enqueue(formatDataStreamPart("text", chunk));
      }
    })
  );
}
function toDataStream2(stream, callbacks) {
  return toDataStreamInternal2(stream, callbacks).pipeThrough(
    new TextEncoderStream()
  );
}
function toDataStreamResponse2(stream, options = {}) {
  var _a17;
  const { init, data, callbacks } = options;
  const dataStream = toDataStreamInternal2(stream, callbacks).pipeThrough(
    new TextEncoderStream()
  );
  const responseStream = data ? mergeStreams(data.stream, dataStream) : dataStream;
  return new Response(responseStream, {
    status: (_a17 = init == null ? void 0 : init.status) != null ? _a17 : 200,
    statusText: init == null ? void 0 : init.statusText,
    headers: prepareResponseHeaders(init == null ? void 0 : init.headers, {
      contentType: "text/plain; charset=utf-8",
      dataStreamVersion: "v1"
    })
  });
}
function mergeIntoDataStream2(stream, options) {
  options.dataStream.merge(toDataStreamInternal2(stream, options.callbacks));
}
function trimStartOfStream() {
  let isStreamStart = true;
  return (text2) => {
    if (isStreamStart) {
      text2 = text2.trimStart();
      if (text2)
        isStreamStart = false;
    }
    return text2;
  };
}

export { ToolLoopAgent as T, __commonJS$1 as _, __require2 as a, __require as b, convertToCoreMessages as c, __export$2 as d, __reExport as e, createGatewayProvider as f, generateText as g, generateObject as h, isToolUIPart as i, streamObject as j, __commonJS$2 as k, __toESM$2 as l, output_exports as o, require_token_error as r, streamText as s };
//# sourceMappingURL=chunk-SFTERBTR.mjs.map
