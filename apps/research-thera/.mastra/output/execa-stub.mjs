// Stub for execa - not available at runtime in Cloudflare Workers
export const execa = () => { throw new Error('execa is not available in Cloudflare Workers'); };
export const execaNode = execa;
export const execaSync = execa;
export const execaCommand = execa;
export const execaCommandSync = execa;
export const $ = execa;
