export const DEFAULT_SCREEN_QUESTION = "Analyze this screen.";

export function chooseCaptureQuestion(options: {
  explicitQuestion?: string;
  autoAnalyzeAt?: number;
  handledAutoAnalyzeAt?: number;
  consented: boolean;
  lastQuestion?: string;
}): { question?: string; handledAutoAnalyzeAt?: number } {
  const shouldAutoAnalyze = options.consented
    && options.autoAnalyzeAt !== undefined
    && options.autoAnalyzeAt !== options.handledAutoAnalyzeAt;

  return {
    question: options.explicitQuestion
      || (shouldAutoAnalyze ? options.lastQuestion || DEFAULT_SCREEN_QUESTION : undefined),
    handledAutoAnalyzeAt: shouldAutoAnalyze ? options.autoAnalyzeAt : undefined
  };
}

export async function copyAnswer(
  answer: string,
  writeText: (text: string) => Promise<void> = text => navigator.clipboard.writeText(text)
): Promise<void> {
  await writeText(answer);
}
