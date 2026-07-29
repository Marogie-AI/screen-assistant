import type { PageContext } from "@screen-assistant/protocol";

type Capture = {
  screenshot: string;
  pageContext?: PageContext;
  capturedAt: number;
};

async function collectPageContext(tabId: number): Promise<PageContext | undefined> {
  try {
    const results = await browser.scripting.executeScript({
      target: { tabId },
      func: (() => ({
        title: document.title.slice(0, 1_000),
        url: window.location.href.slice(0, 8_000),
        selectedText: (window.getSelection()?.toString() ?? "").slice(0, 20_000),
        visibleText: (document.body?.innerText ?? "").slice(0, 20_000)
      })) as unknown as () => void
    });
    return results[0]?.result as PageContext | undefined;
  } catch (error) {
    console.warn("Page context unavailable:", error);
    return undefined;
  }
}

async function captureCurrentTab(): Promise<void> {
  try {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || tab.windowId === undefined) throw new Error("No active tab is available.");
    const screenshot = await browser.tabs.captureVisibleTab(tab.windowId, { format: "jpeg", quality: 85 });
    const capture: Capture = {
      screenshot,
      pageContext: await collectPageContext(tab.id),
      capturedAt: Date.now()
    };
    await browser.storage.local.set({ currentCapture: capture, captureError: null });
    await browser.sidebarAction.open();
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Firefox could not capture this page.";
    const message = /activeTab permission/i.test(detail)
      ? "Firefox needs a fresh tab grant. Close the sidebar, then use Command + Shift + A or the toolbar icon on the page you want to capture."
      : detail;
    await browser.storage.local.set({ captureError: message });
    console.error("Screenshot failed:", error);
    try { await browser.sidebarAction.open(); } catch { /* Sidebar API can reject outside a user gesture. */ }
  }
}

async function beginCapture(): Promise<void> {
  // Capture while Firefox's trusted action still owns the activeTab grant.
  // The sidebar blocks transmission to Codex until consent is acknowledged.
  await captureCurrentTab();
}

browser.action.onClicked.addListener(() => void beginCapture());

browser.runtime.onMessage.addListener(message => {
  if (message && typeof message === "object" && message.type === "capture") {
    return captureCurrentTab();
  }
  return undefined;
});
