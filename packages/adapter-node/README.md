# @cplint/adapter-node

[![npm version](https://img.shields.io/npm/v/@cplint/adapter-node.svg?style=flat-square)](https://www.npmjs.com/package/@cplint/adapter-node)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](https://opensource.org/licenses/MIT)

Official Node.js adapter for [CPLint](https://www.npmjs.com/package/cplint). Teaches the core AST engine how to interpret plain Node/TypeScript backend constructs — modules, classes, middleware, factories — and translate them into CPLint's `role` and `scopes` model.

> **This is the default adapter.** It ships bundled with the `cplint` core package, so there is nothing extra to install for standard Node/TypeScript projects.

---

## Installation

No separate install needed — it's included automatically:

```bash
npm i --save-dev cplint
```

This package is published standalone on npm mainly for internal resolution and for cases where you want to depend on it explicitly (e.g. custom tooling built on top of CPLint). Most users will never need to `npm install` it directly.

## Configuration

The `adapter` field is optional and defaults to `"node"`:

```typescript
export default {
  rootPath: "src/",
  exclude: ["node_modules", "dist", ".git", "**/*.spec.ts"],
  // adapter: "node" — implicit, can be omitted
  lint: {
    rules: {
      "no-empty-manual-blocks": "error",
      "no-stale-context": "error",
    },
  },
};
```

## What this adapter resolves

The Node adapter is the baseline classifier every other adapter extends. It relies primarily on the `SUFFIX_ROLE_MAP` (filename convention) and falls back to export-shape analysis when no suffix matches:

| Convention | Resolved `role` |
| --- | --- |
| `*.service.ts` | `factory` or `util`, depending on export shape (class vs. plain functions) |
| `*.middleware.ts` | `middleware` |
| `*.guard.ts` | `guard` |
| `*.model.ts` | `model` |
| `*.schema.ts` | `schema` |
| `*.config.ts` | `config` |
| `*.constants.ts` | `constants` |
| `*.types.ts` / `*.d.ts` | `types` |
| `*.decorator.ts` | `decorator` |
| `*.event.ts` | `event` |
| `*.plugin.ts` | `plugin` |
| `index.ts` / `main.ts` / `server.ts` | `entrypoint` |
| No suffix match | Fallback via export-shape (class → `factory`, plain functions → `util`) — flagged by `prefer-explicit-role` under `--strict-roles` |

### `state-shape` for classes

For class-based exports (services, factories), `state-shape` reflects constructor-injected properties and class fields with their inferred types.

### `critical-flow` for middleware and guards

For `middleware` and `guard` roles, `critical-flow` traces the call chain through to `next()` (or the equivalent control-flow return), including any early-return branches, so the LLM can reason about request short-circuiting without reading the full handler.

### `deps`

Node built-ins (`fs`, `path`, `http`, etc.) are tagged `role: "external"` with `type: "external"` and excluded from `relatedContextFiles`, since they carry no project-specific context value.

## Known pitfalls the adapter flags automatically

- A file with no suffix match and a single default function export is the most ambiguous case for role inference — always prefer an explicit suffix when the fallback role doesn't match intent (e.g. `windowTitle.ts` mutating shared state is semantically a `store`, not a `util`).
- Barrel files (`index.ts` re-exporting from sibling modules) are classified as `entrypoint` even when they don't contain application bootstrap logic — review `purpose` manually for these.

## Compatible with

- Node.js >= 20
- Any Node/TypeScript backend without a UI framework (Express, Fastify, NestJS without decorators, plain scripts, CLIs)

## License

MIT — see the root [`cplint`](https://www.npmjs.com/package/cplint) package for full license text.
