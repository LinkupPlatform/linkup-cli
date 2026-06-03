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

For one-off commands, pass an API key directly:

```bash
linkup --api-key "your-api-key" search "query"
```

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
```

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

linkup search "query" --include-domains linkup.so,docs.linkup.so
linkup search "query" --exclude-domains example.com
linkup search "query" --from-date 2025-01-01 --to-date 2025-01-31
linkup search "query" --output search-results --include-images --max-results 10
```

Date options accept JavaScript-parseable dates. ISO dates such as `YYYY-MM-DD` or full ISO timestamps are recommended.
`--include-images` and `--max-results` only apply to `--output search-results`.

Query input sources:

```bash
linkup search --clipboard
linkup search --file query.txt
echo "query" | linkup search
linkup search # interactive prompt
```

When multiple query sources are provided, the CLI uses this priority: clipboard, file, positional query, stdin, then interactive prompt.

### Fetch

```bash
linkup fetch https://example.com
linkup fetch https://example.com --render-js
linkup fetch https://example.com --include-raw-html
linkup fetch https://example.com --extract-images
```

Fetch extracts content from a URL through the Linkup API.
Use `--render-js` for pages that require JavaScript execution, `--include-raw-html` to print the raw HTML after the extracted markdown, and `--extract-images` to print extracted image metadata.

### JSON output

Use `--json` to print the raw API response as pretty-printed JSON:

```bash
linkup --json search "query"
linkup --json fetch https://example.com
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
