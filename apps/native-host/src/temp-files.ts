import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { MAX_SCREENSHOT_BYTES } from "@screen-assistant/protocol";
import { HostError } from "./errors.js";

const DATA_URL = /^data:image\/(jpeg|png);base64,([A-Za-z0-9+/]+={0,2})$/;

export function decodeScreenshot(dataUrl: string): { bytes: Buffer; extension: "jpg" | "png" } {
  const match = DATA_URL.exec(dataUrl);
  if (!match?.[1] || !match[2]) {
    throw new HostError("INVALID_REQUEST", "Screenshot must be a Base64 JPEG or PNG data URL.");
  }
  const bytes = Buffer.from(match[2], "base64");
  if (bytes.byteLength > MAX_SCREENSHOT_BYTES) {
    throw new HostError("SCREENSHOT_TOO_LARGE", "Screenshot exceeds the 10 MB limit.");
  }
  if (bytes.byteLength === 0) {
    throw new HostError("INVALID_REQUEST", "Screenshot is empty.");
  }
  return { bytes, extension: match[1] === "jpeg" ? "jpg" : "png" };
}

export async function withTemporaryScreenshot<T>(
  dataUrl: string,
  operation: (sessionDirectory: string, screenshotPath: string) => Promise<T>
): Promise<T> {
  const { bytes, extension } = decodeScreenshot(dataUrl);
  const directory = await mkdtemp(path.join(tmpdir(), "screen-assistant-"));
  const screenshotPath = path.join(directory, `capture.${extension}`);
  try {
    await writeFile(screenshotPath, bytes, { mode: 0o600, flag: "wx" });
    return await operation(directory, screenshotPath);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

