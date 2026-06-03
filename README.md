# Linkup CLI

Official Node.js command-line interface for [Linkup](https://linkup.so) — AI-powered web search from your terminal.

> **Work in progress.** This is the Node.js rewrite of the [Python CLI](https://github.com/LinkupPlatform/linkup-cli). Commands are being implemented incrementally. For full functionality today, use the Python CLI.

## Installation

```bash
npm install -g linkup-cli
```

## Usage

```bash
linkup --help
linkup --version
```

Full command documentation (search, fetch, setup, config) will be added here as each command is implemented.

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
