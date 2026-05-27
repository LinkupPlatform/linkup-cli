"""Linkup CLI - Search the web with AI from your terminal."""

import argparse
import os
import sys
from importlib.metadata import PackageNotFoundError, version as _pkg_version
from pathlib import Path

try:
    __version__ = _pkg_version("linkup-cli")
except PackageNotFoundError:
    __version__ = "0.0.0+local"

# Valid options
VALID_DEPTHS = ["fast", "standard", "deep"]
VALID_OUTPUT_TYPES = ["sourcedAnswer", "searchResults", "structured"]
VALID_RESEARCH_OUTPUT_TYPES = ["sourcedAnswer", "structured"]
VALID_REASONING = ["S", "M", "L", "XL"]
VALID_RESEARCH_MODES = ["answer", "auto", "investigate", "research"]

# Config paths
CONFIG_DIR = Path.home() / ".linkup"
CONFIG_FILE = CONFIG_DIR / "config"


def get_api_key():
    """Get API key from environment variable or config file."""
    # Environment variable takes priority
    api_key = os.environ.get("LINKUP_API_KEY")
    if api_key:
        return api_key

    # Try config file
    if CONFIG_FILE.exists():
        try:
            content = CONFIG_FILE.read_text().strip()
            for line in content.split("\n"):
                if line.startswith("api_key="):
                    return line.split("=", 1)[1].strip()
        except Exception:
            pass

    return None


def save_api_key(api_key):
    """Save API key to config file."""
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    CONFIG_FILE.write_text(f"api_key={api_key}\n")
    # Set file permissions to user-only (600)
    CONFIG_FILE.chmod(0o600)


def get_client():
    """Initialize and return the Linkup client."""
    api_key = get_api_key()
    if not api_key:
        print("Error: Linkup API key not configured")
        print("\nRun 'linkup setup' to configure your API key")
        print("Or set the LINKUP_API_KEY environment variable")
        sys.exit(1)

    from linkup import LinkupClient
    return LinkupClient(api_key=api_key)


def read_from_clipboard():
    """Read text from system clipboard. Returns (text, error_message)."""
    import subprocess
    import platform

    system = platform.system()

    if system == "Darwin":
        try:
            result = subprocess.run(["pbpaste"], capture_output=True, text=True)
            return result.stdout.strip(), None
        except FileNotFoundError:
            return None, "pbpaste not found"

    if system == "Linux":
        for cmd in (["xclip", "-selection", "clipboard", "-o"],
                    ["xsel", "--clipboard", "--output"],
                    ["wl-paste"]):
            try:
                result = subprocess.run(cmd, capture_output=True, text=True)
                return result.stdout.strip(), None
            except FileNotFoundError:
                continue
        return None, "No clipboard tool found. Install xclip, xsel, or wl-clipboard."

    if system == "Windows":
        try:
            result = subprocess.run(
                ["powershell", "-NoProfile", "-Command", "Get-Clipboard"],
                capture_output=True, text=True,
            )
            return result.stdout.strip(), None
        except FileNotFoundError:
            return None, "powershell not found"

    return None, f"Clipboard not supported on {system}"


def cmd_search(args):
    """Execute a search query."""
    from rich.console import Console
    from rich.markdown import Markdown

    console = Console()
    client = get_client()

    query = ""

    # Priority 1: Read from clipboard if --clipboard flag
    if args.clipboard:
        query, err = read_from_clipboard()
        if err:
            console.print(f"[red]Error: {err}[/red]")
            sys.exit(1)
        if not query:
            console.print("[red]Error: Clipboard is empty[/red]")
            sys.exit(1)
        console.print(f"[dim]Read {len(query)} characters from clipboard[/dim]")

    # Priority 2: Read from file if --file flag
    elif args.file:
        try:
            with open(args.file, "r") as f:
                query = f.read().strip()
            console.print(f"[dim]Read query from {args.file}[/dim]")
        except Exception as e:
            console.print(f"[red]Error reading file: {e}[/red]")
            sys.exit(1)

    # Priority 3: Join command line args
    elif args.query:
        query = " ".join(args.query)

    # Priority 4: Read from stdin if piped
    elif not sys.stdin.isatty():
        query = sys.stdin.read().strip()

    # Priority 5: Interactive mode - prompt user to paste
    else:
        console.print("[bold]Enter your query[/bold] [dim](paste text, then press Ctrl+D on empty line to submit):[/dim]")
        console.print()
        try:
            lines = []
            while True:
                try:
                    line = input()
                    lines.append(line)
                except EOFError:
                    break
            query = "\n".join(lines).strip()
        except KeyboardInterrupt:
            console.print("\n[yellow]Cancelled[/yellow]")
            sys.exit(0)

    if not query:
        console.print("[red]Error: No query provided[/red]")
        console.print("[dim]Usage:[/dim]")
        console.print("[dim]  linkup search \"your query\"[/dim]")
        console.print("[dim]  linkup search --clipboard        # read from clipboard[/dim]")
        console.print("[dim]  linkup search --file query.txt   # read from file[/dim]")
        console.print("[dim]  linkup search                    # interactive mode[/dim]")
        sys.exit(1)

    # Resolve schema for structured output
    schema = None
    if args.output == "structured":
        if args.schema_file:
            try:
                schema = Path(args.schema_file).read_text()
            except Exception as e:
                console.print(f"[red]Error reading schema file: {e}[/red]")
                sys.exit(1)
        elif args.schema:
            schema = args.schema
        else:
            console.print("[red]Error: --output structured requires --schema-file or --schema[/red]")
            console.print("[dim]Example: linkup search \"...\" -o structured --schema-file schema.json[/dim]")
            sys.exit(1)

        # Validate JSON before sending
        import json
        try:
            json.loads(schema)
        except json.JSONDecodeError as e:
            console.print(f"[red]Error: schema is not valid JSON: {e}[/red]")
            sys.exit(1)
    elif args.schema_file or args.schema:
        console.print("[yellow]Warning: --schema/--schema-file ignored (only used with -o structured)[/yellow]")

    console.print(f"[dim]Depth: {args.depth} | Output: {args.output}[/dim]")

    try:
        with console.status("[bold blue]Searching...[/bold blue]"):
            response = client.search(
                query=query,
                depth=args.depth,
                output_type=args.output,
                structured_output_schema=schema,
            )
    except Exception as e:
        error_str = str(e).lower()
        if "403" in error_str or "forbidden" in error_str:
            console.print("[red]Error: Network request blocked (403 Forbidden)[/red]")
            console.print("[dim]This may be caused by a proxy, firewall, or sandbox restriction.[/dim]")
            console.print("[dim]If running in a sandboxed environment, enable full network access.[/dim]")
        elif "401" in error_str or "unauthorized" in error_str:
            console.print("[red]Error: Invalid or expired API key (401 Unauthorized)[/red]")
            console.print("[dim]Check your LINKUP_API_KEY or get a new one at https://app.linkup.so[/dim]")
        elif "timeout" in error_str or "timed out" in error_str:
            console.print("[red]Error: Request timed out[/red]")
            console.print("[dim]Try again or use --depth standard for faster results.[/dim]")
        else:
            console.print(f"[red]Error: {e}[/red]")
        sys.exit(1)

    if args.output == "searchResults":
        for i, result in enumerate(response.results, 1):
            console.print(f"\n[bold cyan]{i}. {result.name}[/bold cyan]")
            console.print(f"   [dim]{result.url}[/dim]")
            if result.content:
                console.print(f"   {result.content}")
    elif args.output == "structured":
        import json
        from rich.syntax import Syntax

        if hasattr(response, "model_dump"):
            data = response.model_dump()
        elif isinstance(response, dict):
            data = response
        else:
            data = response

        rendered = json.dumps(data, indent=2, default=str, ensure_ascii=False)
        console.print()
        console.print(Syntax(rendered, "json", theme="monokai", background_color="default"))
    else:
        console.print()
        console.print(Markdown(response.answer))

        if hasattr(response, "sources") and response.sources:
            console.print("\n[bold]Sources:[/bold]")
            for src in response.sources[:5]:
                console.print(f"  [dim]•[/dim] [link={src.url}]{src.name}[/link]")

    console.print()


def _parse_iso_date(s, name):
    from datetime import date
    try:
        return date.fromisoformat(s)
    except ValueError:
        print(f"Error: --{name} must be ISO format (YYYY-MM-DD), got: {s}", file=sys.stderr)
        sys.exit(1)


def _render_research_output(task, console):
    """Render a completed research task's output."""
    import json
    from rich.markdown import Markdown
    from rich.syntax import Syntax

    output = task.output

    # Structured output: pretty-print JSON
    if isinstance(output, (dict, list)):
        rendered = json.dumps(output, indent=2, default=str, ensure_ascii=False)
        console.print()
        console.print(Syntax(rendered, "json", theme="monokai", background_color="default"))
        return

    # Sourced answer object
    if hasattr(output, "answer"):
        console.print()
        console.print(Markdown(output.answer))
        if hasattr(output, "sources") and output.sources:
            console.print("\n[bold]Sources:[/bold]")
            for src in output.sources[:10]:
                name = getattr(src, "name", getattr(src, "url", "source"))
                url = getattr(src, "url", "")
                console.print(f"  [dim]•[/dim] [link={url}]{name}[/link]")
        return

    # Fallback — dump whatever we got
    if hasattr(output, "model_dump"):
        rendered = json.dumps(output.model_dump(), indent=2, default=str, ensure_ascii=False)
    else:
        rendered = str(output)
    console.print()
    console.print(rendered)


def cmd_research(args):
    """Submit, fetch, or list research tasks."""
    import time
    from rich.console import Console

    console = Console()
    client = get_client()

    # Fetch existing task by ID
    if args.id:
        try:
            task = client.get_research(research_id=args.id)
        except Exception as e:
            console.print(f"[red]Error fetching task: {e}[/red]")
            sys.exit(1)
        console.print(f"[dim]Task {task.id} — status: {task.status}[/dim]")
        if task.status == "completed":
            _render_research_output(task, console)
        elif task.status == "failed":
            console.print(f"[red]Task failed: {task.error or 'unknown error'}[/red]")
            sys.exit(1)
        else:
            console.print(f"[yellow]Task is still {task.status}. Try again later.[/yellow]")
        return

    # List past tasks
    if args.list:
        try:
            page = client.list_research(page_size=20, sort_by="createdAt", sort_direction="desc")
        except Exception as e:
            console.print(f"[red]Error listing tasks: {e}[/red]")
            sys.exit(1)
        from rich.table import Table
        table = Table(title="Recent Research Tasks")
        table.add_column("ID", style="cyan", overflow="fold")
        table.add_column("Status", style="green")
        table.add_column("Created", style="dim")
        table.add_column("Query", overflow="fold")
        for t in page.data:
            query = getattr(t.input, "query", "")
            table.add_row(t.id, t.status, t.created_at, query[:80])
        console.print()
        console.print(table)
        console.print()
        return

    # Resolve query (same priority as search)
    query = ""
    if args.clipboard:
        text, err = read_from_clipboard()
        if err:
            console.print(f"[red]Error: {err}[/red]")
            sys.exit(1)
        query = text or ""
    elif args.file:
        try:
            query = Path(args.file).read_text().strip()
        except Exception as e:
            console.print(f"[red]Error reading file: {e}[/red]")
            sys.exit(1)
    elif args.query:
        query = " ".join(args.query)
    elif not sys.stdin.isatty():
        query = sys.stdin.read().strip()

    if not query:
        console.print("[red]Error: No query provided[/red]")
        console.print("[dim]Usage: linkup research \"your question\"[/dim]")
        sys.exit(1)

    # Resolve schema
    schema = None
    if args.output == "structured":
        if args.schema_file:
            try:
                schema = Path(args.schema_file).read_text()
            except Exception as e:
                console.print(f"[red]Error reading schema file: {e}[/red]")
                sys.exit(1)
        elif args.schema:
            schema = args.schema
        else:
            console.print("[red]Error: --output structured requires --schema-file or --schema[/red]")
            sys.exit(1)
        import json
        try:
            json.loads(schema)
        except json.JSONDecodeError as e:
            console.print(f"[red]Error: schema is not valid JSON: {e}[/red]")
            sys.exit(1)

    # Parse dates and domains
    kwargs = {
        "query": query,
        "output_type": args.output,
        "reasoning_depth": args.reasoning,
        "mode": args.mode,
        "structured_output_schema": schema,
    }
    if args.from_date:
        kwargs["from_date"] = _parse_iso_date(args.from_date, "from")
    if args.to_date:
        kwargs["to_date"] = _parse_iso_date(args.to_date, "to")
    if args.include_domain:
        kwargs["include_domains"] = args.include_domain
    if args.exclude_domain:
        kwargs["exclude_domains"] = args.exclude_domain

    summary_bits = [f"mode: {args.mode or 'default'}", f"reasoning: {args.reasoning or 'default'}", f"output: {args.output}"]
    console.print(f"[dim]{' | '.join(summary_bits)}[/dim]")

    try:
        with console.status("[bold blue]Submitting research task...[/bold blue]"):
            task = client.research(**kwargs)
    except Exception as e:
        error_str = str(e).lower()
        if "401" in error_str or "unauthorized" in error_str:
            console.print("[red]Error: Invalid or expired API key (401 Unauthorized)[/red]")
        else:
            console.print(f"[red]Error: {e}[/red]")
        sys.exit(1)

    console.print(f"[dim]Task ID: {task.id}[/dim]")

    if args.no_wait:
        console.print(f"[yellow]Submitted. Check status with:[/yellow] linkup research --id {task.id}")
        return

    # Poll until terminal state
    delay = 2.0
    max_delay = 10.0
    try:
        with console.status("[bold blue]Researching...[/bold blue]") as status:
            while task.status not in ("completed", "failed"):
                status.update(f"[bold blue]Researching... ({task.status})[/bold blue]")
                time.sleep(delay)
                delay = min(delay * 1.5, max_delay)
                task = client.get_research(research_id=task.id)
    except KeyboardInterrupt:
        console.print(f"\n[yellow]Stopped polling. Task is still running.[/yellow]")
        console.print(f"[dim]Resume with: linkup research --id {task.id}[/dim]")
        sys.exit(0)

    if task.status == "failed":
        console.print(f"[red]Task failed: {task.error or 'unknown error'}[/red]")
        sys.exit(1)

    _render_research_output(task, console)


def cmd_fetch(args):
    """Fetch and extract content from a URL."""
    from rich.console import Console
    from rich.markdown import Markdown

    console = Console()
    client = get_client()

    try:
        with console.status(f"[bold blue]Fetching {args.url}...[/bold blue]"):
            response = client.fetch(url=args.url)

        console.print()
        console.print(Markdown(response.markdown))
        console.print()
    except Exception as e:
        error_str = str(e).lower()
        if "403" in error_str or "forbidden" in error_str:
            console.print("[red]Error: Network request blocked (403 Forbidden)[/red]")
            console.print("[dim]This may be caused by a proxy, firewall, or sandbox restriction.[/dim]")
        elif "401" in error_str or "unauthorized" in error_str:
            console.print("[red]Error: Invalid or expired API key (401 Unauthorized)[/red]")
            console.print("[dim]Check your LINKUP_API_KEY or get a new one at https://app.linkup.so[/dim]")
        elif "404" in error_str or "not found" in error_str:
            console.print(f"[red]Error: URL not found or inaccessible[/red]")
            console.print(f"[dim]Check that the URL is correct: {args.url}[/dim]")
        else:
            console.print(f"[red]Error fetching URL: {e}[/red]")
        sys.exit(1)


def cmd_setup(args):
    """Interactive setup for Linkup CLI."""
    import webbrowser
    import getpass
    from rich.console import Console
    from rich.panel import Panel

    console = Console()

    console.print()
    console.print(Panel.fit("[bold blue]Welcome to Linkup CLI![/bold blue]\n\nLet's get you set up.", title="Setup"))
    console.print()

    # Step 1: Get API key
    console.print("[bold]Step 1:[/bold] Get your API key")
    console.print("─" * 40)

    console.print("\nOpening [link=https://app.linkup.so]https://app.linkup.so[/link] in your browser...")
    try:
        webbrowser.open("https://app.linkup.so")
    except Exception:
        pass

    console.print("[dim](If it didn't open, visit the URL above)[/dim]\n")

    # Prompt for API key
    try:
        api_key = getpass.getpass("Paste your API key: ")
    except (KeyboardInterrupt, EOFError):
        console.print("\n[yellow]Setup cancelled.[/yellow]")
        sys.exit(0)

    if not api_key or len(api_key) < 10:
        console.print("[red]Error: Invalid API key[/red]")
        sys.exit(1)

    # Step 2: Save configuration
    console.print("\n[bold]Step 2:[/bold] Save configuration")
    console.print("─" * 40)

    try:
        save_api_key(api_key)
        console.print(f"[green]✓[/green] API key saved to [dim]{CONFIG_FILE}[/dim]")
    except Exception as e:
        console.print(f"[red]Error saving config: {e}[/red]")
        sys.exit(1)

    # Step 3: Test connection
    console.print("\n[bold]Step 3:[/bold] Test connection")
    console.print("─" * 40)

    try:
        from linkup import LinkupClient
        client = LinkupClient(api_key=api_key)
        with console.status("[dim]Testing connection...[/dim]"):
            client.search(query="test", depth="fast", output_type="searchResults")
        console.print("[green]✓[/green] Connected to Linkup API")
    except Exception as e:
        console.print(f"[yellow]⚠[/yellow] Connection test failed: {e}")
        console.print("[dim]Your API key was saved. You can test it with 'linkup search \"hello\"'[/dim]")

    # Done
    console.print()
    console.print(Panel.fit(
        "[green]You're all set![/green]\n\n"
        "Try it out:\n"
        "  [bold]linkup search \"What is the capital of France?\"[/bold]",
        title="Setup Complete"
    ))
    console.print()


def cmd_config(args):
    """Show or set configuration."""
    from rich.console import Console
    from rich.table import Table

    console = Console()

    table = Table(title="Linkup CLI Configuration")
    table.add_column("Setting", style="cyan")
    table.add_column("Value", style="green")

    # Check both sources
    env_key = os.environ.get("LINKUP_API_KEY", "")
    file_key = ""
    if CONFIG_FILE.exists():
        try:
            content = CONFIG_FILE.read_text().strip()
            for line in content.split("\n"):
                if line.startswith("api_key="):
                    file_key = line.split("=", 1)[1].strip()
        except Exception:
            pass

    # Determine active key and source
    if env_key:
        active_key = env_key
        source = "Environment variable"
    elif file_key:
        active_key = file_key
        source = str(CONFIG_FILE)
    else:
        active_key = ""
        source = "(not configured)"

    masked_key = f"{active_key[:8]}...{active_key[-4:]}" if len(active_key) > 12 else "[red](not set)[/red]"

    table.add_row("API Key", masked_key)
    table.add_row("Source", source)
    table.add_row("Config File", str(CONFIG_FILE))

    console.print()
    console.print(table)
    console.print()

    if not active_key:
        console.print("[yellow]Run 'linkup setup' to configure your API key[/yellow]")
        console.print()


def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(
        prog="linkup",
        description="Linkup CLI - AI-powered web search from your terminal",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  linkup setup                              # First-time setup
  linkup search "What is the capital of France?"
  linkup search "Latest AI news" --depth deep
  linkup search "iPhone 16 specs" -o structured --schema-file schema.json
  linkup search --clipboard                 # Search using clipboard content
  linkup search --file prompt.txt           # Search using file content
  linkup search                             # Interactive mode (paste + Ctrl+D)
  linkup research "Find the top LLM companies and their CEOs" --reasoning L
  linkup fetch "https://example.com"
  linkup config                             # Show configuration

Get your API key at: https://app.linkup.so
Documentation: https://docs.linkup.so
        """,
    )
    parser.add_argument(
        "--version", "-V", action="version", version=f"%(prog)s {__version__}"
    )

    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # Search command
    search_parser = subparsers.add_parser(
        "search", aliases=["s"], help="Search the web"
    )
    search_parser.add_argument("query", nargs="*", help="Search query")
    search_parser.add_argument(
        "--depth", "-d",
        choices=VALID_DEPTHS,
        default="standard",
        help="Search depth: fast (quickest, no LLM), standard (balanced), or deep (most thorough). Default: standard"
    )
    search_parser.add_argument(
        "--output", "-o",
        choices=VALID_OUTPUT_TYPES,
        default="sourcedAnswer",
        help="Output type: sourcedAnswer (AI summary), searchResults (raw results), or structured (JSON matching --schema). Default: sourcedAnswer"
    )
    search_parser.add_argument(
        "--schema-file",
        metavar="FILE",
        help="Path to a JSON schema file (required with -o structured)"
    )
    search_parser.add_argument(
        "--schema",
        metavar="JSON",
        help="Inline JSON schema string (required with -o structured if --schema-file not used)"
    )
    search_parser.add_argument(
        "--clipboard", "-c",
        action="store_true",
        help="Read query from clipboard (supports multi-line prompts)"
    )
    search_parser.add_argument(
        "--file", "-f",
        metavar="FILE",
        help="Read query from a file"
    )
    search_parser.set_defaults(func=cmd_search)

    # Fetch command
    fetch_parser = subparsers.add_parser(
        "fetch", aliases=["f"], help="Fetch and extract content from a URL"
    )
    fetch_parser.add_argument("url", help="URL to fetch")
    fetch_parser.set_defaults(func=cmd_fetch)

    # Research command
    research_parser = subparsers.add_parser(
        "research", aliases=["r"], help="Run a deep research task (async, polls until complete)"
    )
    research_parser.add_argument("query", nargs="*", help="Research query")
    research_parser.add_argument(
        "--reasoning", "-r",
        choices=VALID_REASONING,
        help="Reasoning depth: S (light), M, L, or XL (most thorough). Default: server default"
    )
    research_parser.add_argument(
        "--mode", "-m",
        choices=VALID_RESEARCH_MODES,
        help="Mode: answer, auto, investigate, or research. Default: server default"
    )
    research_parser.add_argument(
        "--output", "-o",
        choices=VALID_RESEARCH_OUTPUT_TYPES,
        default="sourcedAnswer",
        help="Output type: sourcedAnswer or structured. Default: sourcedAnswer"
    )
    research_parser.add_argument("--schema-file", metavar="FILE", help="JSON schema file (with -o structured)")
    research_parser.add_argument("--schema", metavar="JSON", help="Inline JSON schema (with -o structured)")
    research_parser.add_argument("--from", dest="from_date", metavar="YYYY-MM-DD", help="Earliest date for sources")
    research_parser.add_argument("--to", dest="to_date", metavar="YYYY-MM-DD", help="Latest date for sources")
    research_parser.add_argument("--include-domain", action="append", metavar="DOMAIN", help="Restrict to this domain (repeatable)")
    research_parser.add_argument("--exclude-domain", action="append", metavar="DOMAIN", help="Exclude this domain (repeatable)")
    research_parser.add_argument("--clipboard", "-c", action="store_true", help="Read query from clipboard")
    research_parser.add_argument("--file", "-f", metavar="FILE", help="Read query from a file")
    research_parser.add_argument("--no-wait", action="store_true", help="Submit and print task ID without polling")
    research_parser.add_argument("--id", metavar="ID", help="Fetch an existing task by ID")
    research_parser.add_argument("--list", action="store_true", help="List recent research tasks")
    research_parser.set_defaults(func=cmd_research)

    # Setup command
    setup_parser = subparsers.add_parser(
        "setup", help="Interactive setup - configure your API key"
    )
    setup_parser.set_defaults(func=cmd_setup)

    # Config command
    config_parser = subparsers.add_parser(
        "config", aliases=["c"], help="Show configuration"
    )
    config_parser.set_defaults(func=cmd_config)

    # Parse args
    args = parser.parse_args()

    # Handle no command - default to search if args look like a query
    if args.command is None:
        # Check if there are extra args that might be a query
        if len(sys.argv) > 1 and not sys.argv[1].startswith("-"):
            # Treat as implicit search
            sys.argv.insert(1, "search")
            args = parser.parse_args()
        else:
            parser.print_help()
            sys.exit(0)

    # Execute command
    if hasattr(args, "func"):
        args.func(args)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
