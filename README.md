# Linkup CLI

Official command-line interface for [Linkup](https://linkup.so) — AI-powered web search from your terminal.

## Installation

```bash
pipx install linkup-cli
```

Don't have `pipx`?

```bash
brew install pipx        # macOS
# or: python3 -m pip install --user pipx
```

> `pipx` installs CLI tools in isolated environments and is the recommended way to install Python CLIs on modern macOS/Linux. Plain `pip install linkup-cli` also works, but on macOS Sonoma+ and most Linux distros you'll hit an "externally-managed-environment" error from the system Python.

## Quick Start

```bash
# 1. Configure your API key (opens browser to app.linkup.so)
linkup setup

# 2. Search
linkup search "What is the capital of France?"
```

## Usage

### Search

```bash
# Basic search (standard depth, AI-summarized answer with sources)
linkup search "your query"

# Deep search (more thorough, slower)
linkup search "complex research topic" --depth deep

# Raw search results (URLs + content, no AI summary)
linkup search "python tutorials" --output searchResults

# Structured output (JSON matching your schema)
linkup search "Tell me about the movie Inception" \
  --output structured --schema-file movie.json

# Short aliases
linkup s "your query" -d deep -o searchResults
```

### Multi-line / long prompts

Shell quoting doesn't handle long prompts well. Use one of these instead:

```bash
# From clipboard
linkup search --clipboard

# From a file
linkup search --file prompt.txt

# From stdin (pipe)
echo "your query" | linkup search
cat prompt.txt | linkup search

# Interactive mode (paste text, then Ctrl+D to submit)
linkup search
```

On Linux, clipboard mode requires one of `xclip`, `xsel`, or `wl-clipboard`.

### Structured output

Get JSON results conforming to a schema you define.

```bash
# Schema in a file
cat > movie.json <<'EOF'
{
  "type": "object",
  "properties": {
    "title": {"type": "string"},
    "year": {"type": "integer"},
    "director": {"type": "string"},
    "main_cast": {"type": "array", "items": {"type": "string"}}
  },
  "required": ["title", "year", "director"]
}
EOF

linkup search "Inception (2010)" -o structured --schema-file movie.json

# Inline schema (good for short one-liners)
linkup search "iPhone 16 Pro release date and starting price" -o structured \
  --schema '{"type":"object","properties":{"release_date":{"type":"string"},"starting_price_usd":{"type":"number"}}}'
```

### Research

Run a deep, multi-step research task. Unlike `search`, this is asynchronous on the server — the CLI submits the task, polls until it finishes, then prints the result.

```bash
# Submit and wait for the result
linkup research "Find the top 5 LLM companies and their CEOs"

# Tune reasoning depth and mode
linkup research "..." --reasoning L --mode investigate

# Filter sources by date or domain
linkup research "..." --from 2025-01-01 --include-domain arxiv.org

# Structured output (same flags as search)
linkup research "..." -o structured --schema-file out.json

# Fire and forget — print task ID without polling
linkup research "..." --no-wait

# Fetch a task you submitted earlier
linkup research --id <task-id>

# List your recent tasks
linkup research --list
```

### Fetch

Extract clean markdown from any URL:

```bash
linkup fetch "https://example.com"
```

### Configuration

```bash
linkup config              # show current config + API key source
linkup setup               # re-run interactive setup
```

API key is stored at `~/.linkup/config` (chmod 600). You can also set it via env var:

```bash
export LINKUP_API_KEY="your-key-here"
```

Env var takes precedence over the config file.

## Commands

| Command | Alias | Description |
|---------|-------|-------------|
| `linkup setup` | | Interactive setup — open app.linkup.so, save API key, test connection |
| `linkup search` | `linkup s` | Search the web |
| `linkup research` | `linkup r` | Run a deep research task (async, polls until complete) |
| `linkup fetch` | `linkup f` | Fetch and extract content from a URL |
| `linkup config` | `linkup c` | Show current configuration |

## Search flags

| Flag | Short | Values | Description |
|------|-------|--------|-------------|
| `--depth` | `-d` | `fast`, `standard`, `deep` | Search depth (default: `standard`) |
| `--output` | `-o` | `sourcedAnswer`, `searchResults`, `structured` | Output type (default: `sourcedAnswer`) |
| `--schema-file` | | path | JSON schema file (required with `-o structured`) |
| `--schema` | | JSON string | Inline JSON schema (required with `-o structured` if `--schema-file` not used) |
| `--clipboard` | `-c` | | Read query from system clipboard |
| `--file` | `-f` | path | Read query from a file |

## Environment variables

| Variable | Description |
|----------|-------------|
| `LINKUP_API_KEY` | Your Linkup API key. Overrides the config file when set. |

## Examples

```bash
# Quick fact
linkup search "population of tokyo"

# Deep research
linkup search "latest developments in quantum computing" --depth deep

# Raw search results (URLs + content)
linkup search "best python web frameworks" --output searchResults

# Extract article content
linkup fetch "https://example.com/article"

# Pipe a long prompt
cat long-prompt.txt | linkup search --depth deep
```

## Links

- [Linkup Website](https://linkup.so)
- [Documentation](https://docs.linkup.so)
- [Get API Key](https://app.linkup.so)
- [Python SDK](https://github.com/LinkupPlatform/linkup-python-sdk)

## License

MIT
