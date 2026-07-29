import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import path from "node:path";
import type { AnalyzeRequest } from "@screen-assistant/protocol";
import { HostError } from "./errors.js";
import { buildPrompt } from "./prompt.js";

const TIMEOUT_MS = Number(process.env.SCREEN_ASSISTANT_TIMEOUT_MS ?? 90_000);
const MAX_OUTPUT_BYTES = 2 * 1024 * 1024;

type ClaudeJson = { result?: string; is_error?: boolean; terminal_reason?: string };

export type RunningClaude = {
  result: Promise<string>;
  cancel: () => void;
};

function classifyFailure(stderr: string, stdout: string, code: number | null): HostError {
  const detail = `${stderr}\n${stdout}`.trim();
  if (/not logged in|login|authenticat/i.test(detail)) {
    return new HostError("CLAUDE_NOT_AUTHENTICATED", "Claude CLI is not authenticated. Run `claude`, then `/login`, and retry.");
  }
  return new HostError("CLAUDE_FAILED", detail.slice(0, 2_000) || `Claude exited with code ${code ?? "unknown"}.`);
}

export function runClaude(request: AnalyzeRequest, workingDirectory: string, screenshotPath: string): RunningClaude {
  const executable = process.env.CLAUDE_BIN || "claude";
  const prompt = buildPrompt(request, path.basename(screenshotPath));
  let child: ChildProcessWithoutNullStreams | undefined;
  let cancelled = false;

  const result = new Promise<string>((resolve, reject) => {
    const spawned = spawn(executable, [
      "-p", prompt,
      "--output-format", "json",
      "--no-session-persistence",
      "--permission-mode", "dontAsk",
      "--tools", "Read"
    ], {
      cwd: workingDirectory,
      shell: false,
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1" }
    });
    child = spawned;
    spawned.stdin.end();

    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child?.kill("SIGTERM");
      setTimeout(() => child?.kill("SIGKILL"), 2_000).unref();
      reject(new HostError("CLAUDE_TIMEOUT", "Claude did not respond within 90 seconds."));
    }, TIMEOUT_MS);

    const append = (current: string, chunk: Buffer) => {
      const next = current + chunk.toString("utf8");
      if (Buffer.byteLength(next) > MAX_OUTPUT_BYTES) {
        child?.kill("SIGTERM");
        throw new HostError("CLAUDE_FAILED", "Claude output exceeded the 2 MB limit.");
      }
      return next;
    };

    spawned.stdout.on("data", (chunk: Buffer) => {
      try { stdout = append(stdout, chunk); } catch (error) { reject(error); }
    });
    spawned.stderr.on("data", (chunk: Buffer) => {
      try { stderr = append(stderr, chunk); } catch (error) { reject(error); }
    });
    spawned.on("error", error => {
      clearTimeout(timer);
      reject(error.message.includes("ENOENT")
        ? new HostError("CLAUDE_NOT_INSTALLED", "Claude CLI could not be found. Install it and retry.")
        : error);
    });
    spawned.on("close", code => {
      clearTimeout(timer);
      if (cancelled) {
        reject(new HostError("ANALYSIS_CANCELLED", "Analysis cancelled."));
        return;
      }
      if (code !== 0) {
        reject(classifyFailure(stderr, stdout, code));
        return;
      }
      try {
        const parsed = JSON.parse(stdout) as ClaudeJson;
        if (parsed.is_error || !parsed.result?.trim()) {
          reject(classifyFailure(stderr, parsed.result ?? stdout, code));
          return;
        }
        resolve(parsed.result.trim());
      } catch {
        reject(new HostError("CLAUDE_FAILED", "Claude returned invalid JSON output."));
      }
    });
  });

  return {
    result,
    cancel: () => {
      cancelled = true;
      child?.kill("SIGTERM");
      setTimeout(() => child?.kill("SIGKILL"), 2_000).unref();
    }
  };
}
