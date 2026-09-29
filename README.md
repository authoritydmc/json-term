# json-term 🌳

[![CI](https://github.com/authoritydmc/json-term/actions/workflows/ci.yml/badge.svg)](https://github.com/authoritydmc/json-term/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/json-term.svg?style=flat&color=brightgreen)](https://www.npmjs.com/package/json-term)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-green.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)

> **High-fidelity interactive terminal JSON viewer, collapsible tree explorer, type syntax highlighter, and structural diff tool** across macOS, Linux, and Windows.

Never drown in unformatted 5,000-line JSON outputs or fight with false-positive line diffs again. `json-term` lets you interactively collapse/expand nested objects, inspect JSONPaths, copy values to your clipboard, and perform key-order independent structural diffs directly inside your terminal.

---

## ✨ Features

- 🌳 **Interactive Collapsible Tree**: Expand and collapse objects/arrays with `Enter`, `Space`, or arrow keys (`▶ 25 items` / `▼`).
- 🎨 **Type-Aware Syntax Highlighting**: Bold cyan keys, green strings, yellow numbers, magenta booleans, and dimmed nulls.
- ⚡ **Key-Aware Structural Diffing**: Ignores arbitrary key order differences and visually highlights additions (`+`), removals (`-`), and mutations (`~`).
- 🎯 **1-Key JSONPath & Value Copying**: Hit `p` to copy the node's JSONPath (`data.users[0].address.city`) or `y` to copy its formatted JSON value to the system clipboard.
- 🔎 **Interactive Search & Filter (`/`)**: Instant fuzzy search across keys and values with automatic matched node expansion.
- 🚰 **Pipe-Friendly & CI Mode (`--print`)**: Easily pipe `curl`, `kubectl`, or `docker` logs into interactive viewer or non-interactive formatted trees.
- 📦 **Zero Native C++ Build Dependencies**: Pure JavaScript / TypeScript running anywhere Node.js runs.

---

## 🚀 Installation

### Global CLI Tool
```bash
npm install -g json-term
# or run directly with npx
npx json-term data.json
# or shorthand alias
npx jsonx data.json
```

### In Your Project (Library)
```bash
npm install json-term
```

---

## 🛠️ CLI Usage & Examples

### 1. Interactive Tree Viewer
```bash
# View local JSON file
jsonx package.json

# View piped API response
curl -s https://api.github.com/repos/nodejs/node | jsonx
```

### 2. Structural JSON Diffing
```bash
# Compare two JSON configuration files
jsonx diff config.old.json config.new.json

# Diff against piped stdin
curl -s https://api.com/v2/config | jsonx diff config.v1.json

# Hide unchanged lines in diff
jsonx diff a.json b.json --no-unchanged
```

### 3. Non-Interactive Pretty-Print (for scripts & CI)
```bash
# Print formatted tree to stdout
jsonx --print data.json

# Set initial collapse depth (e.g. depth 2)
jsonx data.json --depth 2 --print
```

---

## ⌨️ Interactive TUI Keybindings

| Key | Action |
| :--- | :--- |
| `↑` / `k` | Move cursor up |
| `↓` / `j` | Move cursor down |
| `Enter` / `Space` / `→` | Toggle expand / collapse node |
| `e` | Expand all nodes |
| `c` | Collapse all nodes |
| `p` | Copy current node's **JSONPath** to clipboard (e.g. `$.users[0].id`) |
| `y` / `v` | Copy current node's **JSON value** to clipboard |
| `/` | Interactive search / filter |
| `Esc` | Clear search query |
| `q` / `Ctrl+C` | Exit viewer |

---

## 📖 Programmatic API (TypeScript & JavaScript)

```typescript
import { 
  buildTree, 
  prettyPrintTree, 
  diffJSON, 
  prettyPrintDiff, 
  calculateDiffStats,
  InteractiveViewer 
} from "json-term";

const data = {
  service: "Gateway",
  port: 8080,
  endpoints: ["/auth", "/users", "/metrics"],
  active: true,
};

// 1. Pretty Print Formatted Tree String
const tree = buildTree(data, "myService", "$", 0, 2);
console.log(prettyPrintTree(tree));

// 2. Compute Structural Diff
const oldConfig = { port: 8080, debug: true };
const newConfig = { port: 8443, debug: true, ssl: true };

const diffTree = diffJSON(oldConfig, newConfig, "configDiff");
const stats = calculateDiffStats(diffTree);
console.log(`Changes: +${stats.added} -${stats.removed} ~${stats.modified}`);
console.log(prettyPrintDiff(diffTree));

// 3. Launch Interactive TUI Programmatically
const viewer = new InteractiveViewer(tree);
await viewer.start();
```

---

## ⚙️ CLI Options Reference

| Option | Shorthand | Default | Description |
| :--- | :--- | :--- | :--- |
| `--print` | `-p` | `false` | Non-interactive formatted print to stdout |
| `--depth <number>` | `-d` | `2` | Initial tree expansion depth |
| `--search <query>` | `-s` | `""` | Initial filter query for keys/values |
| `--no-unchanged` | | `false` | Hide unchanged nodes in diff output |
| `--version` | `-v` | | Output version |
| `--help` | `-h` | | Display help menu |

---

## 🧪 Development & Testing

```bash
git clone https://github.com/authoritydmc/json-term.git
cd json-term
npm install
npm test
npm run build
```

---

## 🚀 Automated Release & Versioning

### 1-Click from GitHub Actions
Go to **Actions** -> **Automated Version & Release** -> Select `patch`, `minor`, or `major` -> Click **Run workflow**.

### From Terminal
```bash
npm run release:patch
npm run release:minor
npm run release:major
```

---

## 📄 License

[MIT](LICENSE) © 2026 authoritydmc
