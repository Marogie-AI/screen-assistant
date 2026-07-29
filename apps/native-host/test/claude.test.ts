import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { runClaude } from "../src/claude.js";

const originalBin = process.env.CLAUDE_BIN;

afterEach(() => {
  if (originalBin === undefined) delete process.env.CLAUDE_BIN;
  else process.env.CLAUDE_BIN = originalBin;
});

describe("runClaude", () => {
  it("returns normalized output from a fake executable", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "screen-assistant-test-"));
    const screenshot = path.join(directory, "capture.png");
    const fakeClaude = fileURLToPath(new URL("./fixtures/fake-claude.js", import.meta.url));
    await chmod(fakeClaude, 0o700);
    await writeFile(screenshot, "fake image");
    process.env.CLAUDE_BIN = fakeClaude;
    try {
      const running = runClaude({
        type: "analyze",
        requestId: "ad95bf70-68a2-4b96-b31c-6b171ea53db8",
        screenshotDataUrl: "data:image/png;base64,abc",
        question: "What is shown?"
      }, directory, screenshot);
      await expect(running.result).resolves.toBe("The fake Claude saw the screenshot.");
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
