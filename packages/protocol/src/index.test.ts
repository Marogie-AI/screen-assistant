import { describe, expect, it } from "vitest";
import { analyzeRequestSchema, MAX_QUESTION_LENGTH } from "./index.js";

describe("analyzeRequestSchema", () => {
  const base = {
    type: "analyze" as const,
    requestId: "ad95bf70-68a2-4b96-b31c-6b171ea53db8",
    screenshotDataUrl: `data:image/jpeg;base64,${"A".repeat(32)}`,
    question: "What is shown?"
  };

  it("accepts a bounded request", () => {
    expect(analyzeRequestSchema.parse(base)).toEqual(base);
  });

  it("rejects oversized questions", () => {
    expect(() => analyzeRequestSchema.parse({ ...base, question: "x".repeat(MAX_QUESTION_LENGTH + 1) })).toThrow();
  });
});
