# Linkup CLI Agent Guide

This repository contains the Linkup CLI for the Linkup API.

## Goal

Keep the CLI aligned with the current public, stable Linkup JS SDK while preserving a clean CLI developer experience.

## Working Rules

- Read this file before making changes.
- Prefer minimal diffs focused on the public JS SDK change being synchronized.
- Do not expose internal, beta, deprecated, or undocumented SDK behavior unless explicitly requested.
- Preserve the repo's CLI conventions:
  - use kebab-case flags in the public CLI surface;
  - convert to SDK camelCase only at the `linkup-sdk` call boundary;
  - follow existing commands as the template (including `--json`, `--wait`, `--async`, and stdin / `--file`).
- Synchronize public `LinkupClient` methods and their request parameters; ignore SDK internals and `linkup-sdk/x402`.
- Avoid unnecessary breaking changes. If a change would be breaking or ambiguous, stop and explain instead of guessing.
- If a CLI change requires a newer SDK, bump the `linkup-sdk` dependency in the same change.

## When Updating the CLI

When adding or changing a public CLI capability, update the relevant pieces together:
- CLI commands,
- CLI options,
- CLI output,
- CLI error handling,
- CLI tests,
- CLI README/examples if the user-facing CLI changed.

## Validation

Before opening a PR, run the narrowest relevant checks:
- `npm run build`
- `npm run lint`
- `npm test`

## Non-Goals

- Do not change package version, release config, or publish settings unless the task explicitly asks for it.
- Do not refactor unrelated code while performing SDK synchronization.

## Sync Decisions

Add durable exceptions here when a proposed sync should not be repeated.

- Do not expose SDK capabilities that are not clearly public and stable.
- Do not implement a `credits` command unless explicitly requested.
- Do not implement a `responses` command unless explicitly requested.
- Do not implement x402 / wallet payment unless explicitly requested.
- If a capability was intentionally rejected for product/design reasons, do not propose it again until this file is updated.
