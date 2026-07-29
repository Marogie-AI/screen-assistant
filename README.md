# Screen Assistant

[![CI](https://github.com/Marogie-AI/screen-assistant/actions/workflows/ci.yml/badge.svg)](https://github.com/Marogie-AI/screen-assistant/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A privacy-conscious Firefox assistant from **Marogie AI for Students**. Capture the visible tab, ask a question with the locally authenticated Codex CLI, and receive a concise answer without embedding an API key or exposing a local HTTP server.

> **Project status:** Early access for macOS and Firefox 126+. The extension is loaded as a temporary Firefox add-on while packaging and signing are being prepared.

## Highlights

- **One-shortcut workflow:** <kbd>Control</kbd> + <kbd>Shift</kbd> + <kbd>X</kbd> captures the visible tab and starts analysis.
- **Fast repeat analysis:** Shortcut and toolbar captures reuse the most recent question; **Recapture & analyze** does the same from the sidebar.
- **Clipboard delivery:** Successful answers are copied to the system clipboard automatically and remain visible in the sidebar.
- **Local authentication:** The native host delegates to the user's existing Codex CLI session. No API key is stored in the extension.
- **Bounded data handling:** Screenshots live in random temporary directories, requests are schema-validated, and Codex runs ephemerally with a read-only sandbox.
- **Regression protection:** Type checks, tests, production builds, and the Firefox background-bundle format run in one quality gate.

## How it works

```text
Firefox action or shortcut
        │
        ▼
Visible-tab capture + bounded page context
        │
        ▼
Firefox Native Messaging
        │
        ▼
Local native host ──► authenticated Codex CLI
        │
        ▼
Sidebar answer + system clipboard
```

The extension and native host communicate only through Firefox Native Messaging. See [Architecture](docs/ARCHITECTURE.md) for trust boundaries, protocol details, and design constraints.

## Requirements

- macOS
- Firefox 126 or newer
- Node.js 20 or newer
- pnpm 9.15.1
- [Codex CLI](https://developers.openai.com/codex/cli/) available as `codex`
- ImageMagick (`magick`) only when running the optional vision spike

Authenticate Codex before installing the native host:

```sh
codex login
```

## Install for local use

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm check
pnpm install:host
```

Load the extension in Firefox:

1. Open `about:debugging#/runtime/this-firefox`.
2. Select **Load Temporary Add-on**.
3. Choose `apps/firefox-extension/dist/manifest.json` from this repository.
4. Open a normal webpage and press <kbd>Control</kbd> + <kbd>Shift</kbd> + <kbd>X</kbd>.
5. Review and accept the one-time sensitive-data notice.

The first shortcut capture uses **Analyze this screen.** Subsequent captures reuse the most recent question. When Codex finishes, the answer appears in a light-gray bubble at the lower-right of the sidebar and is copied to the clipboard.

Firefox removes temporary add-ons when it exits. Repeat steps 1–3 after restarting Firefox.

## Development

```sh
pnpm dev          # Run the sidebar's Vite development build
pnpm typecheck    # Type-check all workspaces
pnpm test         # Run all unit and flow tests
pnpm build        # Create production extension and native-host builds
pnpm check        # Run the complete local/CI quality gate
pnpm install:host # Rebuild and install the macOS native host
pnpm smoke:host   # Verify the installed host with a real Codex request
pnpm spike        # Verify that Codex can inspect an attached image
```

Rebuild and click **Reload** in `about:debugging` after changing the background script, manifest, or production assets.

### Repository structure

```text
apps/firefox-extension  Firefox background script and React sidebar
apps/native-host        Native Messaging host, macOS installer, and CLI bridge
packages/protocol       Shared Zod schemas and protocol types
scripts                 Installed-host smoke checks
docs                    Architecture and operational documentation
```

## Privacy and security

Screen content is transmitted to the user's configured OpenAI service through Codex only after the one-time warning is accepted. Before capturing, check for passwords, private messages, financial information, health data, and other sensitive content.

The extension requests access to webpages so it can capture the visible tab and extract optional page text after a user action. It does not install persistent content scripts. Page text and screenshots are treated as untrusted input and are never allowed to change the native host's execution policy.

For the complete security model, read [Architecture](docs/ARCHITECTURE.md). To report a vulnerability, follow [Security Policy](SECURITY.md).

## Responsible student use

Screen Assistant is intended to support learning, accessibility, and comprehension. Follow your school or university's academic-integrity rules. Do not use it in examinations or assessments where AI assistance is prohibited, and ask for explanations when learning matters more than obtaining a final answer.

## Troubleshooting

### The shortcut does nothing

Rebuild with `pnpm build`, then reload the add-on in `about:debugging`. Firefox must load the generated `apps/firefox-extension/dist/manifest.json`, not the source manifest.

### Firefox cannot find the native host

Run `pnpm install:host`, reload the add-on, and retry. The installer pins the current Node and Codex executable paths in `~/.screen-assistant`.

### Codex is not authenticated

Run `codex login`, then verify the integration with `pnpm smoke:host`.

### The answer is not copied

Reload the add-on so Firefox applies the `clipboardWrite` permission. The sidebar keeps the answer visible and reports clipboard failures separately.

## Contributing

Read the [Contributing Guide](CONTRIBUTING.md) and [Code of Conduct](CODE_OF_CONDUCT.md) before opening a pull request. Every change must keep `pnpm check` green. For usage help, see [Support](SUPPORT.md); notable changes are tracked in the [Changelog](CHANGELOG.md).

## License

Screen Assistant is available under the [MIT License](LICENSE).
