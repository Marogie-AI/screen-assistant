import type { ErrorCode } from "@screen-assistant/protocol";

export class HostError extends Error {
  constructor(public readonly code: ErrorCode, message: string) {
    super(message);
    this.name = "HostError";
  }
}

export function normalizeError(error: unknown): HostError {
  if (error instanceof HostError) return error;
  const message = error instanceof Error ? error.message : "Unknown native host error";
  return new HostError("CLAUDE_FAILED", message);
}

