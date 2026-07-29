import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import type { AnalyzeResponse, PageContext } from "@screen-assistant/protocol";
import { NativeClient } from "./api";

type Capture = { screenshot: string; pageContext?: PageContext; capturedAt: number };
type Message = { role: "user" | "assistant"; text: string };

export function App() {
  const client = useMemo(() => new NativeClient(), []);
  const [capture, setCapture] = useState<Capture>();
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [consented, setConsented] = useState<boolean | undefined>();
  const activeRequest = useRef<string | undefined>(undefined);

  useEffect(() => {
    void browser.storage.local.get(["currentCapture", "captureError", "consentAcknowledged"]).then(values => {
      const saved = values.currentCapture as Capture | undefined;
      if (saved && Date.now() - saved.capturedAt < 60 * 60 * 1_000) setCapture(saved);
      else if (saved) void browser.storage.local.remove("currentCapture");
      setError(typeof values.captureError === "string" ? values.captureError : "");
      setConsented(Boolean(values.consentAcknowledged));
    });
    const listener = (changes: Record<string, browser.storage.StorageChange>) => {
      if (changes.currentCapture?.newValue) {
        setCapture(changes.currentCapture.newValue as Capture);
        setMessages([]);
        setError("");
      }
      if (typeof changes.captureError?.newValue === "string") setError(changes.captureError.newValue);
    };
    browser.storage.onChanged.addListener(listener);
    return () => browser.storage.onChanged.removeListener(listener);
  }, []);

  async function acceptCapture() {
    await browser.storage.local.set({ consentAcknowledged: true });
    setConsented(true);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const trimmed = question.trim();
    if (!capture || !trimmed || loading) return;
    const requestId = crypto.randomUUID();
    activeRequest.current = requestId;
    setQuestion("");
    setMessages(previous => [...previous, { role: "user", text: trimmed }]);
    setLoading(true);
    setError("");
    try {
      const response: AnalyzeResponse = await client.analyze({
        type: "analyze",
        requestId,
        screenshotDataUrl: capture.screenshot,
        question: trimmed,
        pageContext: capture.pageContext
      });
      if (response.type === "result") setMessages(previous => [...previous, { role: "assistant", text: response.answer }]);
      else setError(response.message);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The native host failed.");
    } finally {
      activeRequest.current = undefined;
      setLoading(false);
    }
  }

  function cancel() {
    if (activeRequest.current) client.cancel(activeRequest.current);
  }

  async function clear() {
    if (activeRequest.current) client.cancel(activeRequest.current);
    await browser.storage.local.remove(["currentCapture", "captureError"]);
    setCapture(undefined);
    setMessages([]);
    setError("");
  }

  if (consented === undefined) return <main className="shell"><p className="muted">Loading…</p></main>;

  if (!consented) {
    return (
      <main className="shell warning-screen">
        <div className="brand"><span className="spark">✦</span><span>Screen Assistant</span></div>
        <section className="warning-card">
          <span className="warning-icon">◉</span>
          <h1>Check the screen before sharing</h1>
          <p>The screen was captured locally. It is sent to your Codex CLI only after you ask a question.</p>
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
          <p>Use <kbd>⌘</kbd> <kbd>⇧</kbd> <kbd>Y</kbd> or the toolbar button to start.</p>
          <button className="primary" onClick={() => void browser.runtime.sendMessage({ type: "capture" })}>Capture current tab</button>
        </section>
      ) : (
        <>
          <section className="capture-card">
            <img src={capture.screenshot} alt="Captured Firefox tab" />
            <div className="capture-meta">
              <span className="status-dot" />
              <span>{capture.pageContext?.title || "Current tab"}</span>
              <button className="quiet" onClick={() => void browser.runtime.sendMessage({ type: "capture" })}>Recapture</button>
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
