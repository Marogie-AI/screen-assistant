import { describe, expect, it, vi } from "vitest";
import { chooseCaptureQuestion, copyAnswer, DEFAULT_SCREEN_QUESTION } from "./capture-flow";

describe("shortcut capture flow", () => {
  it("waits for consent before automatically analyzing", () => {
    expect(chooseCaptureQuestion({ autoAnalyzeAt: 123, consented: false })).toEqual({
      question: undefined,
      handledAutoAnalyzeAt: undefined
    });
  });

  it("uses the default question for the first shortcut capture", () => {
    expect(chooseCaptureQuestion({ autoAnalyzeAt: 123, consented: true })).toEqual({
      question: DEFAULT_SCREEN_QUESTION,
      handledAutoAnalyzeAt: 123
    });
  });

  it("reuses the last question for subsequent shortcut captures", () => {
    expect(chooseCaptureQuestion({
      autoAnalyzeAt: 456,
      handledAutoAnalyzeAt: 123,
      consented: true,
      lastQuestion: "What should I click next?"
    })).toEqual({
      question: "What should I click next?",
      handledAutoAnalyzeAt: 456
    });
  });

  it("does not analyze the same shortcut capture twice", () => {
    expect(chooseCaptureQuestion({
      autoAnalyzeAt: 123,
      handledAutoAnalyzeAt: 123,
      consented: true,
      lastQuestion: "What should I click next?"
    })).toEqual({ question: undefined, handledAutoAnalyzeAt: undefined });
  });

  it("honors an explicit recapture question", () => {
    expect(chooseCaptureQuestion({
      explicitQuestion: "Summarize the new screen.",
      consented: true
    }).question).toBe("Summarize the new screen.");
  });
});

describe("clipboard flow", () => {
  it("writes the exact Codex answer to the clipboard", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    await copyAnswer("Codex answer", writeText);
    expect(writeText).toHaveBeenCalledOnce();
    expect(writeText).toHaveBeenCalledWith("Codex answer");
  });

  it("surfaces clipboard failures", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("permission denied"));
    await expect(copyAnswer("Codex answer", writeText)).rejects.toThrow("permission denied");
  });
});
