# Contributing

Thanks for improving Screen Assistant. Keep changes small, reviewable, and safe around browser and native-host trust boundaries.

## Setup

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm check
```

Use Node.js 20 or newer and the pnpm version declared in `package.json`.

## Development workflow

1. Create a focused branch from `main`.
2. Add or update tests for behavior changes.
3. Run the narrowest relevant test while iterating.
4. Run `pnpm check` before committing.
5. Use imperative, scoped commit messages such as `fix: reject oversized native frames`.
6. Open a pull request that explains the user impact, security implications, and verification performed.

Prefer fine-grained commits that each leave the repository in a working state. Do not mix generated files, unrelated refactors, and behavior changes in one commit.

## Pull-request checklist

- [ ] The change has a clear user or maintenance benefit.
- [ ] New behavior has automated coverage where practical.
- [ ] `pnpm check` passes locally.
- [ ] Browser permission changes are documented and minimized.
- [ ] Untrusted page content remains bounded and treated only as data.
- [ ] Native-host stdout remains reserved for protocol frames.
- [ ] Documentation reflects user-visible or architectural changes.

## Manual Firefox verification

After `pnpm build`, load `apps/firefox-extension/dist/manifest.json` from `about:debugging#/runtime/this-firefox`. Verify the shortcut, consent gate, automatic analysis, sidebar result, and clipboard confirmation on a non-sensitive test page.

## Reporting problems

Use GitHub issues for reproducible bugs and feature requests. Do not include screenshots, logs, or page content containing personal or confidential information. Report security issues through the process in [SECURITY.md](SECURITY.md).
