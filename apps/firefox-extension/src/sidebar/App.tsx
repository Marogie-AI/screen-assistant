import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import type { AnalyzeResponse, PageContext } from "@screen-assistant/protocol";
import { chooseCaptureQuestion, copyAnswer } from "../capture-flow";
import { NativeClient } from "./api";

type Capture = { screenshot: string; pageContext?: PageContext; capturedAt: number; autoAnalyzeAt?: number };
type Message = { role: "user" | "assistant"; text: string };

export function App() {
  const client = useMemo(() => new NativeClient(), []);
  const [capture, setCapture] = useState<Capture>();
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState("");
  const [clipboardStatus, setClipboardStatus] = useState("");
  const [clipboardError, setClipboardError] = useState("");
  const [loading, setLoading] = useState(false);
  const [consented, setConsented] = useState<boolean | undefined>();
  const activeRequest = useRef<string | undefined>(undefined);
  const pendingRecaptureQuestion = useRef<string | undefined>(undefined);
  const lastQuestion = useRef<string | undefined>(undefined);
  const handledAutoAnalyzeAt = useRef<number | undefined>(undefined);
  const consentedRef = useRef(false);

  useEffect(() => {
    void browser.storage.local.get([
      "currentCapture",
      "captureError",
      "consentAcknowledged",
      "lastQuestion",
      "handledAutoAnalyzeAt"
    ]).then(values => {
      const saved = values.currentCapture as Capture | undefined;
      lastQuestion.current = typeof values.lastQuestion === "string" ? values.lastQuestion : undefined;
      handledAutoAnalyzeAt.current = typeof values.handledAutoAnalyzeAt === "number" ? values.handledAutoAnalyzeAt : undefined;
      consentedRef.current = Boolean(values.consentAcknowledged);
      if (saved && Date.now() - saved.capturedAt < 60 * 60 * 1_000) receiveCapture(saved);
      else if (saved) void browser.storage.local.remove("currentCapture");
      setError(typeof values.captureError === "string" ? values.captureError : "");
      setConsented(consentedRef.current);
    });
    const listener = (changes: Record<string, browser.storage.StorageChange>) => {
      if (changes.currentCapture?.newValue) {
        const nextCapture = changes.currentCapture.newValue as Capture;
        receiveCapture(nextCapture);
        setError("");
        setClipboardStatus("");
        setClipboardError("");
      }
      if (typeof changes.captureError?.newValue === "string") {
        pendingRecaptureQuestion.current = undefined;
        setError(changes.captureError.newValue);
      }
    };
    browser.storage.onChanged.addListener(listener);
    return () => browser.storage.onChanged.removeListener(listener);
  }, []);

  async function acceptCapture() {
    await browser.storage.local.set({ consentAcknowledged: true });
    consentedRef.current = true;
    setConsented(true);
    if (capture) receiveCapture(capture);
  }

  function receiveCapture(nextCapture: Capture) {
    const explicitQuestion = pendingRecaptureQuestion.current;
    pendingRecaptureQuestion.current = undefined;
    const decision = chooseCaptureQuestion({
      explicitQuestion,
      autoAnalyzeAt: nextCapture.autoAnalyzeAt,
      handledAutoAnalyzeAt: handledAutoAnalyzeAt.current,
      consented: consentedRef.current,
      lastQuestion: lastQuestion.current
    });

    if (decision.handledAutoAnalyzeAt !== undefined) {
      handledAutoAnalyzeAt.current = decision.handledAutoAnalyzeAt;
      void browser.storage.local.set({ handledAutoAnalyzeAt: decision.handledAutoAnalyzeAt });
    }

    setCapture(nextCapture);
    if (decision.question) void analyzeCapture(nextCapture, decision.question);
    else setMessages([]);
  }

  async function analyzeCapture(captureToAnalyze: Capture, trimmed: string) {
    lastQuestion.current = trimmed;
    void browser.storage.local.set({ lastQuestion: trimmed });
    const requestId = crypto.randomUUID();
    activeRequest.current = requestId;
    setMessages(previous => [...previous, { role: "user", text: trimmed }]);
    setLoading(true);
    setError("");
    setClipboardStatus("");
    setClipboardError("");
    try {
      const response: AnalyzeResponse = await client.analyze({
        type: "analyze",
        requestId,
        screenshotDataUrl: captureToAnalyze.screenshot,
        question: trimmed,
        pageContext: captureToAnalyze.pageContext
      });
      if (response.type === "result") {
        setMessages(previous => [...previous, { role: "assistant", text: response.answer }]);
        try {
          await copyAnswer(response.answer);
          setClipboardStatus("Answer copied to clipboard.");
        } catch {
          setClipboardError("Codex answered, but Firefox could not copy it to the clipboard.");
        }
      } else setError(response.message);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The native host failed.");
    } finally {
      activeRequest.current = undefined;
      setLoading(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const trimmed = question.trim();
    if (!capture || !trimmed || loading) return;
    setQuestion("");
    await analyzeCapture(capture, trimmed);
  }

  async function recapture() {
    if (loading) return;
    const latestVisibleQuestion = [...messages].reverse().find(message => message.role === "user")?.text;
    pendingRecaptureQuestion.current = latestVisibleQuestion || lastQuestion.current || question.trim() || "Analyze this screen.";
    setQuestion("");
    try {
      await browser.runtime.sendMessage({ type: "capture" });
    } catch (caught) {
      pendingRecaptureQuestion.current = undefined;
      setError(caught instanceof Error ? caught.message : "Firefox could not recapture this tab.");
    }
  }

  function cancel() {
    if (activeRequest.current) client.cancel(activeRequest.current);
    pendingRecaptureQuestion.current = undefined;
  }

  async function clear() {
    if (activeRequest.current) client.cancel(activeRequest.current);
    await browser.storage.local.remove(["currentCapture", "captureError", "lastQuestion"]);
    lastQuestion.current = undefined;
    setCapture(undefined);
    setMessages([]);
    setError("");
    setClipboardStatus("");
    setClipboardError("");
  }

  if (consented === undefined) return <main className="shell"><p className="muted">Loading…</p></main>;

  if (!consented) {
    return (
      <main className="shell warning-screen">
        <div className="brand"><span className="spark">✦</span><span>Screen Assistant</span></div>
        <section className="warning-card">
          <span className="warning-icon">◉</span>
          <h1>Check the screen before sharing</h1>
          <p>The screen was captured locally. After you continue, keyboard-shortcut captures are sent automatically to your Codex CLI.</p>
          <p>Review the screen for passwords, private messages, financial information, and personal data.</p>
          <button className="primary" onClick={() => void acceptCapture()}>I understand — continue</button>
        </section>
      </main>
    );
  }

  return (
    <main className="shell">
      <header>
        <div className="brand"><span className="spark">✦</span><span>Screen Assistant</span></div>
        {capture && <button className="quiet" onClick={() => void clear()}>Clear</button>}
      </header>

      {!capture ? (
        <section className="empty">
          <div className="empty-icon">⌗</div>
          <h1>Capture a browser tab</h1>
          <p>Use <kbd>⌃</kbd> <kbd>⇧</kbd> <kbd>X</kbd> or the toolbar button to start.</p>
          <button className="primary" onClick={() => void browser.runtime.sendMessage({ type: "capture" })}>Capture current tab</button>
        </section>
      ) : (
        <>
          <section className="capture-card">
            <img src={capture.screenshot} alt="Captured Firefox tab" />
            <div className="capture-meta">
              <span className="status-dot" />
              <span>{capture.pageContext?.title || "Current tab"}</span>
              <button className="quiet" disabled={loading} onClick={() => void recapture()}>Recapture &amp; analyze</button>
            </div>
          </section>

          <section className="conversation" aria-live="polite">
            {messages.length === 0 && <p className="hint">Ask what’s happening, what to click next, or for a summary.</p>}
            {messages.map((message, index) => (
              <article className={`message ${message.role}`} key={`${message.role}-${index}`}>
                <span>{message.role === "user" ? "You" : "Codex"}</span>
                <p>{message.text}</p>
              </article>
            ))}
            {loading && <article className="message assistant"><span>Codex</span><p className="thinking">Analyzing the screen…</p></article>}
          </section>
        </>
      )}

      {error && <div className="error" role="alert"><strong>Couldn’t analyze</strong><span>{error}</span></div>}
      {clipboardError && <div className="error" role="alert"><strong>Couldn’t copy answer</strong><span>{clipboardError}</span></div>}
      {clipboardStatus && <div className="clipboard-status" role="status">✓ {clipboardStatus}</div>}

      {capture && (
        <form onSubmit={event => void submit(event)}>
          <textarea
            value={question}
            maxLength={4_000}
            onChange={event => setQuestion(event.target.value)}
            onKeyDown={event => {
              if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); }
            }}
            placeholder="Ask about this screen…"
            disabled={loading}
            rows={3}
          />
          {loading
            ? <button type="button" className="cancel" onClick={cancel}>Cancel</button>
            : <button type="submit" className="send" disabled={!question.trim()} aria-label="Send question">↑</button>}
        </form>
      )}
    </main>
  );
}
