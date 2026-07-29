# Screen Assistant

[![CI](https://github.com/Marogie-AI/screen-assistant/actions/workflows/ci.yml/badge.svg)](https://github.com/Marogie-AI/screen-assistant/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-yellow.svg)](LICENSE)

A privacy-conscious Firefox assistant from **Marogie AI for Students**. Capture the visible tab, ask Codex a question, and copy the answer to your clipboard—all through your locally authenticated Codex CLI.

> **Status:** Early access for macOS and Firefox 126+. Firefox packaging and signing are not yet available.

## What it does

- Captures the visible Firefox tab with <kbd>Control</kbd> + <kbd>Shift</kbd> + <kbd>X</kbd>.
- Sends bounded screenshot and page context through Firefox Native Messaging.
- Reuses the previous question when you capture again.
- Shows the answer in the sidebar and copies it to the system clipboard.
- Stores no API key and exposes no local HTTP server.

## Quick start

### Requirements

- macOS
- Firefox 126+
- Node.js 20+
- pnpm 9.15.1
- An authenticated [Codex CLI](https://developers.openai.com/codex/cli/)

### Install

```sh
codex login
corepack enable
pnpm install --frozen-lockfile
pnpm check
pnpm install:host
```

### Load in Firefox

1. Open `about:debugging#/runtime/this-firefox`.
2. Select **Load Temporary Add-on**.
3. Choose `apps/firefox-extension/dist/manifest.json`.
4. Open a normal webpage and press <kbd>Control</kbd> + <kbd>Shift</kbd> + <kbd>X</kbd>.
5. Review and accept the one-time privacy notice.

Firefox removes temporary add-ons when it exits. Load the generated manifest again after restarting Firefox.

## Usage

| Action | Result |
| --- | --- |
| Press the shortcut or toolbar button | Capture and analyze the current tab |
| Capture for the first time | Ask Codex to “Analyze this screen.” |
| Capture again | Repeat the most recent question on the new screen |
| Select **Recapture & analyze** | Capture and rerun from the sidebar |
| Receive an answer | Display it at the lower-right and copy it to the clipboard |

## Architecture

```text
Firefox capture
      │
      ▼
Native Messaging
      │
      ▼
Local host ──► Codex CLI
      │
      ▼
Sidebar + clipboard
```

The browser extension, native host, and shared protocol are separate workspaces with explicit trust boundaries. Read [Architecture](docs/ARCHITECTURE.md) for the request lifecycle, storage policy, and security invariants.

## Privacy

Screen content is sent through your configured Codex service only after you accept the privacy notice. Check the page for passwords, private messages, financial information, and other sensitive data before capturing it.

Screen Assistant is designed for learning, accessibility, and comprehension. Follow your institution's academic-integrity rules and do not use it where AI assistance is prohibited.

## Development

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Run the Firefox sidebar development build |
| `pnpm docs:check` | Validate Markdown structure and local links |
| `pnpm typecheck` | Type-check every workspace |
| `pnpm test` | Run unit and flow tests |
| `pnpm build` | Build the extension and native host |
| `pnpm check` | Run the complete CI quality gate |
| `pnpm install:host` | Build and install the macOS native host |
| `pnpm smoke:host` | Test the installed host with a real Codex request |
| `pnpm spike` | Verify Codex image inspection; requires ImageMagick |

After extension changes, run `pnpm build` and select **Reload** in Firefox's `about:debugging` page.

## Documentation

See the [documentation index](docs/README.md) for architecture, contributing, support, security, and community guidance. Notable project changes are tracked in the [changelog](CHANGELOG.md).

## License

[MIT](LICENSE) © 2026 Marogie AI
