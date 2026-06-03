# Linkup CLI

Official Node.js command-line interface for [Linkup](https://linkup.so) — AI-powered web search from your terminal.

## Installation

```bash
npm install -g linkup-cli
```

## Configuration

Configure your API key interactively:

```bash
linkup setup
```

Or set it through the environment:

```bash
export LINKUP_API_KEY="your-api-key"
```

`LINKUP_API_KEY` takes precedence over the local config file at `~/.linkup/config`.

Remove a saved local API key:

```bash
linkup logout
```

If `LINKUP_API_KEY` is set, `logout` cannot unset it from your shell environment.

## Usage

```bash
linkup --help
linkup --version
linkup -v
linkup -j search "query" # same as --json
```

Global flags can be placed before or after a command. Short command aliases are available for frequent commands (`s`, `f`, `r`); `setup`, `config`, and `logout` are intentionally spelled out. Note that `-c` on query commands means `--clipboard`.

### Search

```bash
linkup search "What is the capital of France?"
linkup "What is the capital of France?" # implicit search
```

Implicit search works when the query is the first argument. Put search options after the query, or use the explicit `search` command when starting with flags:

```bash
linkup "query" --depth deep
linkup search --depth deep "query"
```

Search options:

```bash
linkup search "query" --depth fast
linkup search "query" --depth standard
linkup search "query" --depth deep

linkup search "query" --output sourced-answer
linkup search "query" --output search-results
linkup search "query" --output structured --schema '{"type":"object","properties":{"answer":{"type":"string"}}}'
linkup search "query" --output structured --schema-file schema.json
linkup search "query" --schema-file schema.json # implies --output structured

linkup search "query" --include-domains linkup.so,docs.linkup.so
linkup search "query" --exclude-domains example.com
linkup search "query" --from-date 2025-01-01 --to-date 2025-01-31
linkup search "query" --output search-results --include-images --max-results 10
```

Date options accept JavaScript-parseable dates. ISO dates such as `YYYY-MM-DD` or full ISO timestamps are recommended.
Passing `--schema` or `--schema-file` implies `--output structured` unless you explicitly set another `--output`.
`--include-images` and `--max-results` only apply to `--output search-results`.

Query input sources:

```bash
linkup search --clipboard
linkup search --file query.txt
echo "query" | linkup search
linkup search # interactive prompt
```

Use one query source at a time. The CLI errors if you combine explicit sources such as `--clipboard`, `--file`, and a positional query.

### Fetch

```bash
linkup fetch https://example.com
linkup fetch https://example.com --render-js
linkup fetch https://example.com --include-raw-html
linkup fetch https://example.com --extract-images
```

Fetch extracts content from a URL through the Linkup API.
Use `--render-js` for pages that require JavaScript execution, `--include-raw-html` to print the raw HTML after the extracted markdown, and `--extract-images` to print extracted image metadata.

### Research

Research runs as an asynchronous task on the Linkup API: you submit a query, the API works on it in the background, and you fetch the result later. The CLI is async by default so it fits cleanly into scripts and automations.

```bash
linkup research "State of the semiconductor market in 2026"
```

By default this submits the task and prints its id immediately, then exits. Fetch the result later:

```bash
linkup research get <id>
```

For an interactive, "run it and show me the answer" experience, pass `--wait` to poll until the task completes (or fails) and then print the result:

```bash
linkup research "..." --wait
linkup research get <id> --wait
```

While waiting, a progress indicator is shown on stderr so piped stdout stays clean. Tune the polling loop with `--poll-interval <seconds>` (default 10) and `--timeout <seconds>` (default 1200, 20 minutes). On timeout the task keeps running on the server; the CLI prints the id so you can resume with `linkup research get <id> --wait`.

Research options:

```bash
linkup research "query" --mode answer
linkup research "query" --mode auto
linkup research "query" --mode investigate
linkup research "query" --mode research

linkup research "query" --reasoning-depth S
linkup research "query" --reasoning-depth M
linkup research "query" --reasoning-depth L
linkup research "query" --reasoning-depth XL

linkup research "query" --output sourced-answer
linkup research "query" --output structured --schema-file schema.json
linkup research "query" --output structured --schema '{"type":"object","properties":{"summary":{"type":"string"}}}'
linkup research "query" --schema-file schema.json # implies --output structured

linkup research "query" --include-domains linkup.so,docs.linkup.so
linkup research "query" --exclude-domains example.com
linkup research "query" --from-date 2025-01-01 --to-date 2025-01-31
```

Unlike `search`, research does not support `--output search-results` and has no `--depth`; control effort with `--mode` and `--reasoning-depth` (default `L`) instead. Think of `search --depth` as the simple effort control for immediate answers, and `research --mode` plus `--reasoning-depth` as the effort controls for asynchronous tasks.

Query input sources (same as `search`):

```bash
linkup research --clipboard
linkup research --file query.txt
echo "query" | linkup research
linkup research # interactive prompt
```

Use one query source at a time. The CLI errors if you combine explicit sources such as `--clipboard`, `--file`, and a positional query.

List recent research tasks:

```bash
linkup research list
linkup research list --page 1 --page-size 10 --sort-by createdAt --sort-direction desc
```

#### Automation

The async-by-default flow makes research easy to script. Submit with `--json` (or `-j`), capture the id, then poll later:

```bash
ID=$(linkup --json research "your question" | jq -r '.id')
# ... do other work, or run on a schedule ...
linkup --json research get "$ID" | jq '.output'
```

Or block until completion in a single step and consume the JSON result directly:

```bash
linkup --json research "your question" --wait | jq '.output.answer'
```

### JSON output

Use `--json` to print the raw API response as pretty-printed JSON:

```bash
linkup --json search "query"
linkup -j fetch https://example.com
linkup --json fetch https://example.com
linkup --json research "query" --wait
```

### Config

```bash
linkup config
```

Shows the resolved API key source, masked key, and config path.

## Development

```bash
git clone https://github.com/LinkupPlatform/linkup-cli-v2
cd linkup-cli-v2
npm install
npm run build
npm link          # makes 'linkup' available globally from this local build
linkup --help
```

To use the local [linkup-js-sdk](https://github.com/LinkupPlatform/linkup-js-sdk) during development:

```bash
npm install ../linkup-js-sdk
```

## Links

- [Linkup](https://linkup.so)
- [Documentation](https://docs.linkup.so)
- [Get your API key](https://app.linkup.so)
- [Linkup JavaScript SDK](https://github.com/LinkupPlatform/linkup-js-sdk)
