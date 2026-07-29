# Architecture

## Overview

Screen Assistant is split into three workspaces so browser privileges, operating-system integration, and request validation remain separate:

| Workspace | Responsibility | Trust level |
| --- | --- | --- |
| `apps/firefox-extension` | Capture the active tab, collect bounded page context, render the sidebar, and copy answers | Handles untrusted webpage content |
| `apps/native-host` | Validate native messages, manage temporary screenshots, and run Codex | Local privileged bridge |
| `packages/protocol` | Define bounded request/response schemas and shared TypeScript types | Shared validation boundary |

## Request lifecycle

1. A trusted Firefox action captures the visible tab. Shortcut and toolbar captures include a one-time automation marker.
2. The sidebar waits for the user's sensitive-data consent. It then selects the explicit, previous, or default question and records the marker so the same capture cannot run twice.
3. `NativeClient` opens a Firefox Native Messaging port and sends a schema-bounded request.
4. The native host writes the decoded image into a random temporary directory.
5. The host starts `codex exec` without a shell, attaches the screenshot, and requests the final answer in a temporary file.
6. Codex runs ephemerally with a read-only sandbox and ignored project/user behavior rules.
7. The host returns a typed result or error, then deletes the temporary directory in a `finally` path.
8. The sidebar renders the answer and requests a clipboard write. Clipboard failure does not discard the answer.

## Trust boundaries

### Webpage to extension

Page titles, URLs, selections, visible text, and screenshot pixels are untrusted. Each text field and the screenshot data URL have explicit size limits in the shared protocol. Page content is data inside a controlled prompt and cannot add CLI arguments.

### Extension to native host

Firefox authorizes the native application identifier and extension ID. The host validates every incoming frame with Zod before touching the filesystem or starting Codex. Only one analysis runs at a time.

### Native host to Codex

The host uses `spawn` with `shell: false`, a fixed argument structure, an isolated working directory, a 90-second timeout, and a 2 MB output limit. It never forwards webpage content to a shell.

## Data retention

- Firefox local storage keeps the latest capture for up to one hour, the consent decision, and the most recent question used for repeat analysis.
- Native screenshots and answer files exist only inside a random temporary directory and are removed after each request.
- The extension stores no OpenAI credentials. Codex owns authentication and service-side data handling.
- Clearing the sidebar removes the stored capture, capture error, and previous question.

## Build invariants

- `pnpm check` must type-check, test, and build every workspace.
- Firefox loads `background.js` as a classic script. The production build fails if that file contains top-level `import` or `export` syntax.
- Native Messaging protocol output is the only content written to host stdout; diagnostics use stderr.
- The installed-host smoke test must return the exact answer `OK` and exits non-zero for typed error responses.

## Current constraints

- The native-host installer supports macOS only.
- The Firefox extension is not yet packaged or signed.
- The native host processes one analysis at a time.
- Conversation history is presentation-only; each Codex request receives the current screenshot, page context, and selected question.
