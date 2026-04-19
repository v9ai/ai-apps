import { M as MastraBase, R as RegisteredLogger } from './chunk-WENZPAHS.mjs';

// src/server/base.ts
var MastraServerBase = class extends MastraBase {
  #app;
  constructor({ app, name }) {
    super({ component: RegisteredLogger.SERVER, name: name ?? "Server" });
    this.#app = app;
  }
  /**
   * Get the app instance.
   *
   * Returns the server app that was passed to the constructor. This allows users
   * to access the underlying server framework's app for direct operations
   * like calling routes via app.fetch() (Hono) or using the app for testing.
   *
   * @template T - The expected type of the app (defaults to TApp)
   * @returns The app instance cast to T. Callers are responsible for ensuring T matches the actual app type.
   *
   * @example
   * ```typescript
   * const app = adapter.getApp<Hono>();
   * const response = await app.fetch(new Request('http://localhost/api/agents'));
   * ```
   */
  getApp() {
    return this.#app;
  }
  /**
   * Protected getter for subclasses to access the app.
   * This allows subclasses to use `this.app` naturally.
   */
  get app() {
    return this.#app;
  }
};

export { MastraServerBase };
//# sourceMappingURL=@mastra__core__server.mjs.map
