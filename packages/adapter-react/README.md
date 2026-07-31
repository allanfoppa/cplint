# @cplint/adapter-react

[![npm version](https://img.shields.io/npm/v/@cplint/adapter-react.svg?style=flat-square)](https://www.npmjs.com/package/@cplint/adapter-react)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](https://opensource.org/licenses/MIT)

Official React adapter for [CPLint](https://www.npmjs.com/package/cplint). Teaches the core AST engine how to interpret React-specific constructs — components, hooks, JSX, context providers — and translate them into CPLint's `role` and `scopes` model.

> Requires the `cplint` core package as a peer dependency.

---

## Installation

```bash
npm i --save-dev cplint @cplint/adapter-react
```

## Configuration

Set `adapter: "react"` in your `cplint.config.js`:

```typescript
export default {
  rootPath: "src/",
  exclude: ["node_modules", "dist", ".git", "**/*.spec.tsx"],
  adapter: "react",
  lint: {
    rules: {
      "no-empty-manual-blocks": "error",
      "no-stale-context": "error",
    },
  },
};
```

## What this adapter resolves

The React adapter extends the base suffix/AST classification with framework-aware heuristics:

| Construct | Detection | Resolved `role` |
| --- | --- | --- |
| Function returning JSX | Return type / JSX.Element analysis | `component` |
| `useXxx` function export | Naming convention (`use*`) + hook-call analysis | `hook` |
| `createContext` result | Call-expression detection | `context` |
| Higher-order component | Function wrapping a component + returning a component | `factory` |
| Custom `.store.ts` (Zustand/Redux slice, etc.) | Suffix-driven, same as core | `store` |

### `state-shape` for hooks and components

When a component or hook calls `useState`, `useReducer`, or a recognized state library, the adapter populates `state-shape` with the inferred property names and types — collapsed to single-line entries via the same normalization used by the core (`normalizeParams` / `normalizeInlineText`), so multiline destructured signatures never break the YAML output.

### `critical-flow` for effects

`useEffect` / `useLayoutEffect` bodies are walked to build the `critical-flow` call chain, including cleanup-function invocations, so the LLM understands side-effect ordering without reading the full source.

### Known pitfalls the adapter flags automatically

- Components that mutate external module-level state (a `.tsx` file with no local `useState` but with side effects) may be misclassified as `util` — use `--strict-roles` with an explicit filename suffix (e.g. `Header.component.tsx`) to force `component`.
- Conditional hook calls are not statically resolvable and are reported as `known-pitfalls` rather than silently ignored.

## Compatible with

- React 17, 18, and 19
- Function components only (class components are treated as a generic `constructor`-based export and receive reduced `state-shape` inference)

## License

MIT — see the root [`cplint`](https://www.npmjs.com/package/cplint) package for full license text.
