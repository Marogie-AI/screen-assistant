import { access } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { decodeScreenshot, withTemporaryScreenshot } from "../src/temp-files.js";

const ONE_PIXEL_PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL3WQAAAABJRU5ErkJggg==";

describe("temporary screenshot handling", () => {
  it("rejects non-image data URLs", () => {
    expect(() => decodeScreenshot("data:text/plain;base64,SGVsbG8=")).toThrow();
  });

  it("deletes the whole session directory after use", async () => {
    let directory = "";
    await withTemporaryScreenshot(ONE_PIXEL_PNG, async (currentDirectory, file) => {
      directory = currentDirectory;
      await expect(access(file)).resolves.toBeUndefined();
    });
    await expect(access(directory)).rejects.toThrow();
  });
});

