import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { runCodex } from "../src/codex.js";

const originalBin = process.env.CODEX_BIN;

afterEach(() => {
  if (originalBin === undefined) delete process.env.CODEX_BIN;
  else process.env.CODEX_BIN = originalBin;
});

describe("runCodex", () => {
  it("returns normalized output from a fake executable", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "screen-assistant-test-"));
    const screenshot = path.join(directory, "capture.png");
    const fakeCodex = fileURLToPath(new URL("./fixtures/fake-codex.js", import.meta.url));
    await chmod(fakeCodex, 0o700);
    await writeFile(screenshot, "fake image");
    process.env.CODEX_BIN = fakeCodex;
    try {
      const running = runCodex({
        type: "analyze",
        requestId: "ad95bf70-68a2-4b96-b31c-6b171ea53db8",
        screenshotDataUrl: "data:image/png;base64,abc",
        question: "What is shown?"
      }, directory, screenshot);
      await expect(running.result).resolves.toBe("The fake Codex saw the screenshot.");
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
