import type { AnalyzeRequest, AnalyzeResponse, CancelRequest } from "@screen-assistant/protocol";

const HOST_NAME = "dev.marogie.screen_assistant";

export class NativeClient {
  private port?: browser.runtime.Port;
  private pending = new Map<string, { resolve: (response: AnalyzeResponse) => void; reject: (error: Error) => void }>();

  analyze(request: AnalyzeRequest): Promise<AnalyzeResponse> {
    return new Promise((resolve, reject) => {
      try {
        this.ensureConnected();
        this.pending.set(request.requestId, { resolve, reject });
        this.port?.postMessage(request);
      } catch (error) {
        reject(error);
      }
    });
  }

  cancel(requestId: string): void {
    const message: CancelRequest = { type: "cancel", requestId };
    this.port?.postMessage(message);
  }

  private ensureConnected(): void {
    if (this.port) return;
    this.port = browser.runtime.connectNative(HOST_NAME);
    this.port.onMessage.addListener((message: unknown) => {
      if (!message || typeof message !== "object" || !("requestId" in message) || typeof message.requestId !== "string") return;
      const pending = this.pending.get(message.requestId);
      if (!pending) return;
      this.pending.delete(message.requestId);
      pending.resolve(message as AnalyzeResponse);
    });
    this.port.onDisconnect.addListener(() => {
      const detail = browser.runtime.lastError?.message || "Native host disconnected.";
      const error = new Error(detail.includes("not found") ? "Native host is not installed. Run `pnpm install:host`." : detail);
      for (const pending of this.pending.values()) pending.reject(error);
      this.pending.clear();
      this.port = undefined;
    });
  }
}
