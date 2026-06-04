# Linkup CLI

Official command-line interface for [Linkup](https://linkup.so) — AI-powered web search from your terminal.

## Features

- **Search the web** with three depth modes: `fast`, `standard`, and `deep`.
- **Fetch** any URL as clean markdown.
- **Research** asynchronously, and batch mixed jobs with **tasks**.
- **Scriptable**: `--json` output for any command, plus stdin, file, and clipboard input.

## Install

```bash
npm install -g linkup-cli
```

> Requires Node.js >= 22

## Documentation

Find the complete documentation [here](https://docs.linkup.so).

## Setup

Get an API key from [app.linkup.so](https://app.linkup.so), then save it interactively or via the environment:

```bash
linkup setup
export LINKUP_API_KEY="your-api-key"   # takes precedence over the saved config
```

Run `linkup config` to inspect the resolved key, or `linkup logout` to remove a saved one.

## Usage

Add `--help` to any command for the full list of options. Use `--json` (or `-j`) to print the raw API response for scripting.

```bash
linkup search "What is the capital of France?"
linkup fetch https://example.com
linkup research "State of the semiconductor market in 2026"
```

### Search

Immediate web search. Pick the effort with `--depth`:

- `fast` — quickest turnaround on lightweight queries.
- `standard` — fast and straightforward, for everyday questions (default).
- `deep` — slower agentic search for complex, multi-step questions.

Choose the output with `--output` (`sourced-answer`, `search-results`, `structured`).

```bash
linkup search "query" --depth deep
linkup search "query" --output structured --schema-file schema.json
linkup search "query" --include-domains linkup.so --from-date 2025-01-01
```

### Fetch

Extract the content of a URL as markdown. Use `--render-js` for JS-heavy pages, `--include-raw-html`, or `--extract-images`.

```bash
linkup fetch https://example.com --render-js
```

### Research

Asynchronous deep research. By default it submits the task, prints its id, and exits; pass `--wait` to poll until it finishes.

```bash
linkup research "query"              # submit, prints id
linkup research get <id>             # fetch the result later
linkup research "query" --wait       # submit and wait for the answer
linkup research list                 # recent tasks
```

Control effort with `--mode` (`answer`, `auto`, `investigate`, `research`) and `--reasoning-depth` (`S`, `M`, `L`, `XL`). Tune polling with `--poll-interval` and `--timeout`.

```bash
linkup --json research "your question" --wait | jq '.output.answer'
```

### Tasks

Generic async API for batching and managing `search`, `fetch`, and `research` work. Create tasks from a JSON file or stdin (one object or an array, using camelCase fields):

```bash
linkup tasks create --file tasks.json --wait
linkup tasks get <id> --wait
linkup tasks list --status pending,processing --type search,research
```

For single `search`/`fetch` calls, add `--async` to enqueue them as tasks.

## Development

```bash
git clone https://github.com/LinkupPlatform/linkup-cli
cd linkup-cli
npm install
npm run build
npm link          # makes 'linkup' available from this local build
```

## Links

- [Linkup](https://linkup.so)
- [Documentation](https://docs.linkup.so)
- [Get your API key](https://app.linkup.so)
- [Linkup JavaScript SDK](https://github.com/LinkupPlatform/linkup-js-sdk)
