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
blogkit-md <path-to-markdown-file-or-directory> [--port=<port>]
```

### Arguments

| Argument        | Description                                                                                |
| --------------- | ------------------------------------------------------------------------------------------ |
| `<path>`        | Path to a markdown file, or a directory containing markdown files (scanned recursively)    |
| `--port=<port>` | Port to run the preview server on (default: random free port)                              |

### Examples

```bash
# Preview a single markdown file
blogkit-md ./posts/my-post.md

# Preview a directory — lists all .md files recursively; click any to render
blogkit-md ./posts

# Preview on a specific port
blogkit-md ./posts/my-post.md --port=3001
```

The browser will open automatically once the server is ready. The preview reloads whenever you save changes to the markdown file (or any markdown file under the directory).

## Requirements

- Node.js >= 18.0.0

## License

[MIT](./LICENSE)
