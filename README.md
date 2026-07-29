# Screen Assistant

A Firefox sidebar that captures the visible tab and asks the locally authenticated Claude CLI about it. The extension never embeds an API key and never exposes an HTTP server.

## Prerequisites

- macOS and Firefox 126+
- Node.js 20+
- pnpm
- Claude Code CLI available as `claude`
- ImageMagick (`magick`) only for the feasibility spike

Authenticate Claude before using the extension:

```sh
claude
/login
```

## Quick start

```sh
pnpm install
pnpm spike
pnpm check
pnpm install:host
```

Then load the extension temporarily:

1. Open `about:debugging#/runtime/this-firefox` in Firefox.
2. Select **Load Temporary Add-on**.
3. Choose `apps/firefox-extension/dist/manifest.json`.
4. Press <kbd>Command</kbd> + <kbd>Shift</kbd> + <kbd>A</kbd> on a normal webpage.
5. Accept the one-time sensitive-data warning, enter a question, and send it.

Run `pnpm dev` while working on the sidebar. Rebuild and reload the temporary add-on after background or manifest changes.

## What the vision spike proves

`pnpm spike` generates a known image in a random temporary directory, starts Claude in that directory, permits only the `Read` tool, and verifies that Claude reads the visible exit code. Do not treat the image path mechanism as working on a machine until this command passes.

The current CLI invocation is equivalent to:

```text
claude -p <controlled prompt> \
  --output-format json \
  --no-session-persistence \
  --permission-mode dontAsk \
  --tools Read
```

## Safety model

- Incoming messages are validated and bounded.
- JPEG/PNG screenshots are decoded into a random application-owned temp directory.
- Claude starts with `shell: false`, never receives user-controlled process arguments, and has only the `Read` tool.
- Claude never runs in this repository or another user project.
- Screenshot and session directory deletion happens in a `finally` block.
- Only one analysis may run at once; each analysis has a 90-second timeout and can be cancelled.
- Native Messaging authorizes only `screen-assistant@marogie.dev`.
- Native-host protocol output is the only data written to stdout; logs use stderr.

Page text is treated as untrusted input. This reduces prompt-injection exposure, but any visible screen sent to Claude should still be considered disclosed to the user’s configured Claude service.

## Useful commands

```sh
pnpm dev             # Vite development build
pnpm build           # Build protocol, extension, and native host
pnpm test            # Unit tests
pnpm typecheck       # TypeScript checks
pnpm check           # Typecheck, test, and production build
pnpm spike           # Verify local CLI image reading
pnpm install:host    # Build and install the macOS native host
```

To inspect native-host logs while Firefox is running, launch Firefox from a terminal during development. Firefox owns the native host process and forwards host stderr to its diagnostics.

## Repository map

```text
apps/firefox-extension   Firefox background script and React sidebar
apps/native-host         Native Messaging host, installer, tests, CLI spike
packages/protocol        Shared Zod schemas and TypeScript protocol types
```

## Known constraint

Temporary Firefox add-ons are removed when Firefox exits. Packaging/signing and a polished installer are intentionally outside the MVP.

