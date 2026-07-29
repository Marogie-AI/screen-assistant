import { z } from "zod";

export const MAX_SCREENSHOT_BYTES = 10 * 1024 * 1024;
export const MAX_QUESTION_LENGTH = 4_000;
export const MAX_VISIBLE_TEXT_LENGTH = 20_000;

export const pageContextSchema = z.object({
  title: z.string().max(1_000),
  url: z.string().max(8_000),
  selectedText: z.string().max(MAX_VISIBLE_TEXT_LENGTH),
  visibleText: z.string().max(MAX_VISIBLE_TEXT_LENGTH)
});

export type PageContext = z.infer<typeof pageContextSchema>;

export const analyzeRequestSchema = z.object({
  type: z.literal("analyze"),
  requestId: z.string().uuid(),
  screenshotDataUrl: z.string().min(32).max(14_100_000),
  question: z.string().trim().min(1).max(MAX_QUESTION_LENGTH),
  pageContext: pageContextSchema.optional()
});

export const cancelRequestSchema = z.object({
  type: z.literal("cancel"),
  requestId: z.string().uuid()
});

export const nativeRequestSchema = z.discriminatedUnion("type", [
  analyzeRequestSchema,
  cancelRequestSchema
]);

export const errorCodeSchema = z.enum([
  "NATIVE_HOST_NOT_INSTALLED",
  "NATIVE_HOST_DISCONNECTED",
  "CLAUDE_NOT_INSTALLED",
  "CLAUDE_NOT_AUTHENTICATED",
  "CLAUDE_TIMEOUT",
  "CLAUDE_FAILED",
  "SCREENSHOT_FAILED",
  "SCREENSHOT_TOO_LARGE",
  "INVALID_REQUEST",
  "UNSUPPORTED_PAGE",
  "ANALYSIS_CANCELLED"
]);

export type ErrorCode = z.infer<typeof errorCodeSchema>;
export type AnalyzeRequest = z.infer<typeof analyzeRequestSchema>;
export type CancelRequest = z.infer<typeof cancelRequestSchema>;
export type NativeRequest = z.infer<typeof nativeRequestSchema>;

export type AnalyzeResponse =
  | { type: "result"; requestId: string; answer: string }
  | { type: "error"; requestId: string; code: ErrorCode; message: string };

