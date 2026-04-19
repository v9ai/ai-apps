// Stub for TypeScript - not available at runtime in Cloudflare Workers
// The @mastra/agent-builder package will fall back to basic validation
export default {};
export const createSourceFile = () => null;
export const createProgram = () => null;
export const findConfigFile = () => null;
export const readConfigFile = () => ({ error: new Error('TypeScript not available') });
export const parseJsonConfigFileContent = () => ({ errors: [new Error('TypeScript not available')], fileNames: [], options: {} });
export const flattenDiagnosticMessageText = (message) => typeof message === 'string' ? message : message?.messageText || '';
export const ScriptTarget = { Latest: 99 };
export const ModuleKind = { ESNext: 99 };
export const JsxEmit = { ReactJSX: 4 };
export const DiagnosticCategory = { Warning: 0, Error: 1, Suggestion: 2, Message: 3 };
export const sys = {
  fileExists: () => false,
  readFile: () => undefined,
};
