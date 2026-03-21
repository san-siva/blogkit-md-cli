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
blogkit-md <path-to-markdown-file> [--port=<port>]
```

### Arguments

| Argument                  | Description                                                   |
| ------------------------- | ------------------------------------------------------------- |
| `<path-to-markdown-file>` | Path to the markdown file to preview                          |
| `--port=<port>`           | Port to run the preview server on (default: random free port) |

### Examples

```bash
# Preview a markdown file
blogkit-md ./posts/my-post.md

# Preview on a specific port
blogkit-md ./posts/my-post.md --port=3001
```

The browser will open automatically once the server is ready. The preview reloads whenever you save changes to the markdown file.

## Requirements

- Node.js >= 18.0.0

## License

[MIT](./LICENSE)
