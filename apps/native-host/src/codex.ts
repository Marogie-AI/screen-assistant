import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { AnalyzeRequest } from "@screen-assistant/protocol";
import { HostError } from "./errors.js";
import { buildPrompt } from "./prompt.js";

const TIMEOUT_MS = Number(process.env.SCREEN_ASSISTANT_TIMEOUT_MS ?? 90_000);
const MAX_OUTPUT_BYTES = 2 * 1024 * 1024;

export type RunningCodex = {
  result: Promise<string>;
  cancel: () => void;
};

function classifyFailure(stderr: string, stdout: string, code: number | null): HostError {
  const detail = `${stderr}\n${stdout}`.trim();
  if (/not logged in|login|authenticat|missing.*api key/i.test(detail)) {
    return new HostError("CODEX_NOT_AUTHENTICATED", "Codex CLI is not authenticated. Run `codex login` and retry.");
  }
  return new HostError("CODEX_FAILED", detail.slice(0, 2_000) || `Codex exited with code ${code ?? "unknown"}.`);
}

export function runCodex(request: AnalyzeRequest, workingDirectory: string, screenshotPath: string): RunningCodex {
  const executable = process.env.CODEX_BIN || "codex";
  const prompt = buildPrompt(request, path.basename(screenshotPath));
  const answerPath = path.join(workingDirectory, "answer.txt");
  let child: ChildProcessWithoutNullStreams | undefined;
  let cancelled = false;
  let settled = false;

  const result = new Promise<string>((resolve, reject) => {
    const finishResolve = (answer: string) => {
      if (settled) return;
      settled = true;
      resolve(answer);
    };
    const finishReject = (error: unknown) => {
      if (settled) return;
      settled = true;
      reject(error);
    };

    const spawned = spawn(executable, [
      "exec",
      "--image", screenshotPath,
      "--sandbox", "read-only",
      "--ephemeral",
      "--ignore-user-config",
      "--ignore-rules",
      "--skip-git-repo-check",
      "--color", "never",
      "--output-last-message", answerPath,
      prompt
    ], {
      cwd: workingDirectory,
      shell: false,
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, NO_COLOR: "1" }
    });
    child = spawned;
    spawned.stdin.end();

    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      spawned.kill("SIGTERM");
      setTimeout(() => spawned.kill("SIGKILL"), 2_000).unref();
      finishReject(new HostError("CODEX_TIMEOUT", "Codex did not respond within 90 seconds."));
    }, TIMEOUT_MS);

    const append = (current: string, chunk: Buffer) => {
      const next = current + chunk.toString("utf8");
      if (Buffer.byteLength(next) > MAX_OUTPUT_BYTES) {
        spawned.kill("SIGTERM");
        throw new HostError("CODEX_FAILED", "Codex output exceeded the 2 MB limit.");
      }
      return next;
    };

    spawned.stdout.on("data", (chunk: Buffer) => {
      try { stdout = append(stdout, chunk); } catch (error) { finishReject(error); }
    });
    spawned.stderr.on("data", (chunk: Buffer) => {
      try { stderr = append(stderr, chunk); } catch (error) { finishReject(error); }
    });
    spawned.on("error", error => {
      clearTimeout(timer);
      finishReject(error.message.includes("ENOENT")
        ? new HostError("CODEX_NOT_INSTALLED", "Codex CLI could not be found. Install it and retry.")
        : error);
    });
    spawned.on("close", async code => {
      clearTimeout(timer);
      if (cancelled) {
        finishReject(new HostError("ANALYSIS_CANCELLED", "Analysis cancelled."));
        return;
      }
      if (code !== 0) {
        finishReject(classifyFailure(stderr, stdout, code));
        return;
      }
      try {
        const answer = (await readFile(answerPath, "utf8")).trim();
        if (!answer) throw new HostError("CODEX_FAILED", "Codex returned an empty answer.");
        finishResolve(answer);
      } catch (error) {
        finishReject(error instanceof HostError ? error : new HostError("CODEX_FAILED", "Codex did not write its final answer."));
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
