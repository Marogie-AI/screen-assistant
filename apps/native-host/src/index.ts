#!/usr/bin/env node
import { nativeRequestSchema, type AnalyzeRequest, type AnalyzeResponse } from "@screen-assistant/protocol";
import { NativeMessageDecoder, writeMessage } from "./native-io.js";
import { normalizeError, HostError } from "./errors.js";
import { withTemporaryScreenshot } from "./temp-files.js";
import { runClaude, type RunningClaude } from "./claude.js";

const active = new Map<string, RunningClaude>();
let busy = false;

function send(response: AnalyzeResponse): void {
  writeMessage(response);
}

async function analyze(request: AnalyzeRequest): Promise<void> {
  if (busy) {
    send({ type: "error", requestId: request.requestId, code: "INVALID_REQUEST", message: "Another analysis is already running." });
    return;
  }
  busy = true;
  try {
    const answer = await withTemporaryScreenshot(request.screenshotDataUrl, async (directory, screenshotPath) => {
      const running = runClaude(request, directory, screenshotPath);
      active.set(request.requestId, running);
      return running.result;
    });
    send({ type: "result", requestId: request.requestId, answer });
  } catch (error) {
    const normalized = normalizeError(error);
    console.error(`[${request.requestId}] ${normalized.code}: ${normalized.message}`);
    send({ type: "error", requestId: request.requestId, code: normalized.code, message: normalized.message });
  } finally {
    active.delete(request.requestId);
    busy = false;
  }
}

const decoder = new NativeMessageDecoder();
process.stdin.pipe(decoder);

decoder.on("data", (raw: unknown) => {
  const parsed = nativeRequestSchema.safeParse(raw);
  if (!parsed.success) {
    const requestId = typeof raw === "object" && raw !== null && "requestId" in raw && typeof raw.requestId === "string"
      ? raw.requestId
      : "invalid";
    send({ type: "error", requestId, code: "INVALID_REQUEST", message: "Request validation failed." });
    return;
  }
  if (parsed.data.type === "cancel") {
    const running = active.get(parsed.data.requestId);
    if (running) running.cancel();
    else send({ type: "error", requestId: parsed.data.requestId, code: "ANALYSIS_CANCELLED", message: "No active analysis was found." });
    return;
  }
  void analyze(parsed.data);
});

decoder.on("error", error => {
  const normalized = error instanceof HostError ? error : normalizeError(error);
  console.error(`Native messaging failure: ${normalized.message}`);
  process.exitCode = 1;
});

process.on("SIGTERM", () => {
  for (const running of active.values()) running.cancel();
  process.exit(0);
});
