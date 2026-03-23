import { LangfuseSpanProcessor, type ShouldExportSpan } from "@langfuse/otel";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import type { ReadableSpan, SpanProcessor } from "@opentelemetry/sdk-trace-node";

/**
 * Custom SpanProcessor that enriches AI SDK spans with classification metadata.
 *
 * When an AI SDK span carries classification results (via semantic conventions
 * or output attributes), this processor stamps additional attributes for
 * downstream Langfuse filtering and dashboards:
 *
 *   classification.result   — boolean (isRemoteEU)
 *   classification.confidence — "high" | "medium" | "low"
 *   classification.job_id   — test case / job identifier
 */
class ClassificationSpanProcessor implements SpanProcessor {
  forceFlush(): Promise<void> {
    return Promise.resolve();
  }

  shutdown(): Promise<void> {
    return Promise.resolve();
  }

  onStart(): void {
    // no-op — attributes are set at end when output is available
  }

  onEnd(span: ReadableSpan): void {
    // Only enrich spans from AI SDK instrumentation
    if (span.instrumentationScope.name === "next.js") return;

    const attrs = span.attributes;

    // Look for classification metadata in span attributes.
    // The AI SDK experimental_telemetry writes function metadata as
    // `ai.telemetry.metadata.*` attributes on generations.
    const jobId = attrs["ai.telemetry.functionId"];
    const output = attrs["ai.response.text"] ?? attrs["gen_ai.completion.0.text"];

    if (!output || typeof output !== "string") return;

    try {
      const parsed = JSON.parse(output);
      if (typeof parsed.isRemoteEU === "boolean" && parsed.confidence) {
        // ReadableSpan is read-only, so we store enrichment via resource attributes.
        // For Langfuse, the safest approach is to set attributes on the underlying
        // otel Span before it becomes read-only. Since we're in onEnd, we use
        // a mutable cast — this is intentional and scoped to our enrichment.
        const mutableSpan = span as unknown as {
          attributes: Record<string, unknown>;
        };
        mutableSpan.attributes["classification.result"] = parsed.isRemoteEU;
        mutableSpan.attributes["classification.confidence"] = parsed.confidence;
        if (jobId) {
          mutableSpan.attributes["classification.job_id"] = String(jobId);
        }
      }
    } catch {
      // Not JSON or not a classification output — skip silently
    }
  }
}

export async function register() {
  // ── Chrome extension dev-reload WebSocket server ──
  await startExtensionReloadServer();

  // Guard: skip Langfuse if not configured
  if (
    !process.env.LANGFUSE_PUBLIC_KEY ||
    !process.env.LANGFUSE_SECRET_KEY ||
    !process.env.LANGFUSE_BASE_URL
  ) {
    console.warn(
      "[instrumentation] Langfuse env vars missing — OTel tracing disabled",
    );
    return;
  }

  // Filter out Next.js infrastructure spans — only export AI SDK spans
  const shouldExportSpan: ShouldExportSpan = (span) => {
    return span.otelSpan.instrumentationScope.name !== "next.js";
  };

  const langfuseProcessor = new LangfuseSpanProcessor({ shouldExportSpan });
  const classificationProcessor = new ClassificationSpanProcessor();

  const provider = new NodeTracerProvider({
    spanProcessors: [classificationProcessor, langfuseProcessor],
  });

  provider.register();

  // Flush pending spans on shutdown
  process.on("SIGTERM", async () => {
    await provider.shutdown();
  });
}

async function startExtensionReloadServer() {
  if (process.env.NODE_ENV !== "development") return;

  const key = "__ext_reload_wss" as keyof typeof globalThis;
  if ((globalThis as Record<string, unknown>)[key]) return;

  const { WebSocketServer } = await import("ws");
  const { watch } = await import("fs");
  const { resolve } = await import("path");

  const PORT = 35729;
  const DIST_DIR = resolve(process.cwd(), "chrome-extension/dist_chrome");

  const wss = new WebSocketServer({ port: PORT });
  (globalThis as Record<string, unknown>)[key] = wss;

  wss.on("listening", () => {
    console.log(`[ext-reload] ws://localhost:${PORT} — watching ${DIST_DIR}`);
  });

  let debounce: ReturnType<typeof setTimeout> | null = null;
  watch(DIST_DIR, { recursive: true }, (_event, filename) => {
    if (!filename || filename.startsWith(".")) return;
    if (debounce) clearTimeout(debounce);
    debounce = setTimeout(() => {
      console.log(`[ext-reload] ${filename} changed — reloading extension`);
      wss.clients.forEach((client) => client.send("reload"));
    }, 300);
  });
}
