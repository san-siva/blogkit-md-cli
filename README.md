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

| Option                 | Description                                                                              |
| ---------------------- | ---------------------------------------------------------------------------------------- |
| `--port=<port>`        | Port to run the preview server on (default: random free port)                            |
| `-b`, `--background`   | Run the preview server detached in the background                                        |
| `-r`, `--reuse`        | If this path is already being served, just open it in the browser instead of starting    |
| `-l`, `--list`         | Interactively list running instances and stop any of them                                |
| `-h`, `--help`         | Show help                                                                                |

If you try to preview a path that already has a running instance, you'll be
prompted to stop the existing one (or pass `--reuse` to just open it).

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

# Re-open a path that's already being served
blogkit-md ./posts --reuse

# List running instances and stop one interactively
blogkit-md --list
```

The browser will open automatically once the server is ready. The preview reloads whenever you save changes to the markdown file (or any markdown file under the directory).

### Managing background instances

Running instances are tracked in `~/.blogkit-md/instances.json` (background logs
live under `~/.blogkit-md/logs/`). Use `blogkit-md --list` to see what's running
and select an instance to stop it:

```text
   blogkit-md  ·  running instances

 ❯ localhost:3001  📁 ~/posts  pid 12345 · 4m bg

   ↑/↓ move   ⏎ open in Chrome   k stop   q quit
```

`⏎` opens the selected instance in Chrome; `k` stops it.

## Requirements

- Node.js >= 18.0.0

## License

[MIT](./LICENSE)
