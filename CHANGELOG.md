# Changelog

All notable changes to the Linkup CLI are documented in this file.

## [0.7.0] - 2026-05-27

### Added
- **`linkup research` subcommand**: submit deep research tasks that poll asynchronously
  - `--reasoning S|M|L|XL`: control reasoning depth
  - `--mode answer|auto|investigate|research`: control research mode
  - `--output sourcedAnswer|structured` with `--schema-file` / `--schema`
  - `--from` / `--to` (ISO date) for source date range
  - `--include-domain` / `--exclude-domain` (repeatable) for domain filters
  - `--no-wait`: submit and print task ID without polling
  - `--id <task-id>`: fetch a previously submitted task
  - `--list`: show recent research tasks
  - Same `--clipboard`, `--file`, stdin, positional input modes as search

## [0.6.0] - 2026-05-26

### Added
- **Structured output** (`-o structured`): Get JSON results matching a custom schema
  - `--schema-file FILE`: Load JSON schema from a file
  - `--schema JSON`: Pass inline JSON schema string
  - Schema is validated as JSON before sending to the API
  - Response is pretty-printed with syntax highlighting

### Changed
- Version is now read from package metadata (single source of truth in `pyproject.toml`)
- Clipboard helper now surfaces specific error messages (e.g., "Install xclip, xsel, or wl-clipboard")
- Added Wayland `wl-paste` fallback for Linux clipboard reads

### Fixed
- Repository URLs in `pyproject.toml` now point to `LinkupPlatform/linkup-cli`
- Removed dead default-fallback code in search command
- Removed misleading `render_js` comment in fetch command

## [0.5.2] - 2025-03-26

### Changed
- Search results now show full content (removed 300 character truncation)

## [0.5.1] - 2025-03-24

### Fixed
- Fixed query priority: positional args now checked before stdin
- Previously, in non-interactive environments (CI, scripts), stdin check would fail even when query was passed as argument

## [0.5.0] - 2025-03-22

### Added
- **Clipboard mode** (`--clipboard` / `-c`): Read query directly from system clipboard
- **File mode** (`--file` / `-f`): Read query from a file
- **Interactive mode**: When no query provided, prompts user to paste text and submit with Ctrl+D
- Cross-platform clipboard support (macOS, Linux, Windows)

### Why
Multi-line prompts are critical for Linkup to work properly. Shell command lines don't handle multi-line input well, so these new modes allow users to paste complex prompts.

## [0.4.1] - 2025-03-22

### Added
- Stdin support: Pipe content directly to linkup (`echo "query" | linkup search`)

## [0.4.0] - 2025-03-22

### Added
- `linkup setup` command for interactive onboarding
- Opens browser to get API key
- Saves API key securely to `~/.linkup/config` with 600 permissions
- Tests connection after setup

## [0.3.3] - 2025-03-22

### Added
- Friendly error messages for common issues:
  - 403 Forbidden (proxy/firewall/sandbox)
  - 401 Unauthorized (invalid API key)
  - 404 Not Found (URL issues)
  - Timeout errors

## [0.3.2] - 2025-03-22

### Fixed
- `linkup fetch` now correctly uses `.markdown` attribute instead of `.content`

## [0.3.1] - 2025-03-22

### Fixed
- Version display now shows correct version
- Updated repository URLs in pyproject.toml

## [0.3.0] - 2025-03-22

### Added
- `fast` depth option (quickest, no LLM processing)

## [0.2.0] - 2025-03-22

### Added
- `--depth` flag: `fast`, `standard`, `deep`
- `--output` flag: `sourcedAnswer`, `searchResults`

## [0.1.0] - 2025-03-22

### Added
- Initial release
- `linkup search` command
- `linkup fetch` command
- `linkup config` command
- API key configuration via environment variable or config file

---

*This CLI was developed with assistance from Claude Code.*
