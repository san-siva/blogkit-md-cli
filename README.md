---
title: blogkit-md-cli
description: A CLI tool to preview markdown files as blogkit-md blog posts in your browser with live reload.
---

# blogkit-md-cli

A CLI tool to preview markdown files as [blogkit-md](https://www.npmjs.com/package/@san-siva/blogkit-md) blog posts in your browser with live reload.

## Installation

```bash
npm install -g @san-siva/blogkit-md-cli
```

## Usage

```bash
blogkit-md <path-to-markdown-file-or-directory> [options]
```

### Arguments

| Argument        | Description                                                                                |
| --------------- | ------------------------------------------------------------------------------------------ |
| `<path>`        | Path to a markdown file, or a directory containing markdown files (scanned recursively)    |

### Options

| Option               | Description                                                       |
| -------------------- | ----------------------------------------------------------------- |
| `--port=<port>`      | Port to run the preview server on (default: random free port)     |
| `-b`, `--background` | Run the preview server detached in the background                 |
| `-t`, `--tear`       | Stop the instance already serving this path, then start fresh     |
| `-s`, `--stop`       | Stop the instance serving the given path, then exit               |
| `-l`, `--list`       | Interactively list running instances and stop any of them         |
| `--non-interactive`  | With `-l`, print a plain `<port>\t<path>` list and exit            |
| `-n`, `--no-open`    | Start the server without opening it in the browser                |
| `-h`, `--help`       | Show help                                                         |

### Reusing running instances

The CLI avoids spinning up redundant servers for the same markdown tree:

- **Path already served** — running it again just reopens it in the browser.
  Pass `--tear` to stop the running instance and start fresh instead.
- **File inside a served folder** — if a directory is already being served and
  you open a markdown file under it, the existing server's port is reused and
  the file's URL opens directly (no second server).
- **Folder over narrower instances** — serving a whole directory stops any
  narrower instances (e.g. a single file) already running inside it, so the
  directory server owns the tree.

### Examples

```bash
# Preview a single markdown file
blogkit-md ./posts/my-post.md

# Preview a directory — lists all .md files recursively; click any to render
blogkit-md ./posts

# Preview on a specific port
blogkit-md ./posts/my-post.md --port=3001

# Run detached in the background
blogkit-md ./posts --background

# Start the server without opening the browser
blogkit-md ./posts --no-open

# Restart the instance serving a path from scratch
blogkit-md ./posts --tear

# Stop the instance serving a given path
blogkit-md ./posts --stop

# List running instances and stop one interactively
blogkit-md --list

# Print a plain "<port>\t<path>" list for scripting
blogkit-md --list --non-interactive
```

The browser will open automatically once the server is ready (unless you pass `--no-open`). The preview reloads whenever you save changes to the markdown file (or any markdown file under the directory).

### Managing background instances

Running instances are tracked in `~/.blogkit-md/instances.json` (background logs
live under `~/.blogkit-md/logs/`). Use `blogkit-md --list` to see what's running
and select an instance to stop it:

```text
   blogkit-md  ·  running instances

 ❯ localhost:3001  📁 ~/posts  pid 12345 · 4m bg

   ↑/↓ j/k move   ⏎ open in Chrome   x stop   q quit
```

`⏎` opens the selected instance in Chrome; `x` stops it. For scripting, `blogkit-md --list --non-interactive` prints one `<port>\t<path>` line per instance with no banner or colors.

## Requirements

- Node.js >= 18.0.0

## License

[MIT](./LICENSE)
