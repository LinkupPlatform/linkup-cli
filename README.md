# Linkup CLI

Official command-line interface for [Linkup](https://linkup.so) — AI-powered web search from your terminal.

## Features

- **Search the web** with three depth modes: `fast`, `standard`, and `deep`.
- **Fetch** any URL as clean markdown.
- **Research** asynchronously, and batch mixed jobs with **tasks**.
- **Scriptable**: `--json` output for any command, plus stdin and file input.

## Install

```bash
npm install -g @linkup/cli
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

### Synchronous commands

These commands run immediately and return the result in the same call.

#### Search

Run an immediate web search.

- Pick the effort with `--depth`: `fast`, `standard` (default), or `deep`.
- Choose the output with `--output`: `sourced-answer`, `search-results`, or `structured`.

```bash
linkup search "query" --depth deep
linkup search "query" --output structured --schema-file schema.json
linkup search "query" --include-domains linkup.so --from-date 2025-01-01
```

#### Fetch

Extract the content of a URL as markdown.

- Use `--render-js` for JS-heavy pages.
- Add `--include-raw-html` to include the source HTML.
- Add `--extract-images` to include image metadata.

```bash
linkup fetch https://example.com --render-js
```

### Asynchronous commands

These commands submit work that runs in the background. By default, they return a task id that you can use to fetch the result later.

#### Research

Run deep research asynchronously.

- Control effort with `--mode`: `answer`, `auto`, `investigate`, or `research`.
- Set reasoning depth with `--reasoning-depth`: `S`, `M`, `L`, or `XL`.

```bash
linkup research "query"              # submit, prints id
linkup research get <id>             # fetch the result later
linkup research list                 # recent tasks
```

#### Tasks

Generic async API for batching and managing `search`, `fetch`, and `research` work. Create tasks from a JSON file or stdin (one object or an array, using camelCase fields):

```bash
linkup tasks create --file tasks.json
linkup tasks get <id>
linkup tasks list --status pending,processing --type search,research
```

For single `search` or `fetch` calls, add `--async` to enqueue them as tasks.

#### Waiting automatically

Add `--wait` to any asynchronous command to poll until the task completes and print the result, instead of returning a task id immediately.

- Use `--poll-interval` to set the delay between checks (default: 5 seconds).
- Use `--timeout` to set the maximum wait time (default: 20 minutes).
- If the wait times out, the CLI prints a command you can run later to resume waiting.

```bash
linkup research "query" --wait                          # submit and wait for the answer
linkup tasks create --file tasks.json --wait            # create tasks and wait
linkup research get <id> --wait                          # resume waiting on an existing task
linkup --json research "your question" --wait | jq '.output.answer'
```

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
