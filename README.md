# CPLint

[![npm version](https://img.shields.io/npm/v/cplint.svg?style=flat-square)](https://www.npmjs.com/package/cplint)
[![npm downloads](https://img.shields.io/npm/dm/cplint.svg?style=flat-square)](https://www.npmjs.com/package/cplint)
[![Status: Beta](https://img.shields.io/badge/status-beta-orange.svg?style=flat-square)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](https://opensource.org/licenses/MIT)

CPLint is a specialized, AST-powered context generator and structural YAML linter designed to feed Large Language Models (like Cursor, Copilot, or custom agents) with highly optimized repository metadata. It reduces LLM token consumption by executing static AST analysis (via `ts-morph`), stripping redundant ecosystem boilerplate, and outputting highly structured `*.context.ai.yaml` files.

**Inspired by the philosophy and structure of ESLint**, CPLint brings predictable, configuration-driven linting rules to AI context orchestration—ensuring developers document core business rules before sending prompts to the LLM.

> ⚠️ **Disclaimer:** CPLint is currently in **Beta**. It is under active development, and breaking changes to the configuration schema may occur before the stable `1.0.0` release. Feel free to open issues or contribute!

---

## Installation and Usage

### Prerequisites

To use CPLint, you must have Node.js (>=24) installed.

Install `cplint` as a development dependency in your project:

If you use CPLint's TypeScript type definitions, TypeScript 5.9.3 or later is required.

```bash
npm i --save-dev cplint
```

### Configuration

Create a `cplint.config.js` file at the root of your repository or (e.g backend, frontend):

```typescript
export default {
  // Root directories to scan for generating context
  rootPath: ["src/"],

  // Directories and paths to exclude from indexing
  exclude: ["node_modules", "dist", ".git", "**/*.spec.ts"],

  // Adapter architecture alignment ("node" | "react" | "angular") Defaults to "node"
  adapter: "react",

  // Linter validation policy engine
  lint: {
    rules: {
      // Flags manual description fields that are missing or left uncompleted
      "no-empty-manual-blocks": "error",
    },
  },
};
```

### CLI Command Reference

#### Generate Context Files

Scans your source files using the configured AST adapter and generates optimized `*.context.ai.yaml` files.

```bash
# Note: you can pass a list of files by separating them with spaces
npx cplint context-generate --entrypoint <path-to-file>
```

#### Run Linter Validations

Validates manual overrides against structural rules. If a mandatory block is empty, or framework modules bleed into the index, the linter will report it.

```bash
npx cplint lint
```

#### Lint Matrix (for Manual Blocks)

The engine evaluates developer input following a strict matrix designed to prioritize token preservation:

| Context State      | Block Condition | Description                                                                                        |
| ------------------ | --------------- | -------------------------------------------------------------------------------------------------- |
| **purpose**        | Mandatory       | What the file was created for and its core responsibility.                                         |
| **decisions**      | Optional        | Architectural choices, pattern adoptions, or trade-offs made within this scope.                    |
| **constraints**    | Optional        | Technical limitations, performance boundaries, or specific business rules that must be respected.  |
| **known-pitfalls** | Optional        | Edge cases, anti-patterns, common bugs, or tricky behaviors to watch out for during modifications. |
| **not-in-scope**   | Optional        | Explicit boundaries defining what this file or feature does _not_ handle to avoid scope creep.     |
| **open-questions** | Optional        | Unresolved issues, pending architectural choices, or design questions requiring future alignment.  |

### Built-in Linting Rules

- **`no-empty-manual-blocks`**: Scans the `manual:` block hierarchy. Flags keys that contain empty list placeholders (`- `) so developers remember to provide deep domain constraints or prune them completely to save tokens.

- **`no-stale-context`**: Compares the `generated` date in the `auto.meta` block against the last modified time of the source file. Warns when the source has changed since the context was last generated, preventing the LLM from reasoning over an outdated snapshot. Re-run `context-generate --entrypoint <file>` to resolve.

### Contributing

Contributions are welcome! To set up `cplint` locally for development:

1. Clone the repository.
2. Install standard dependencies: `pnpm install`
3. Compile the typescript binary using the lightning-fast native engine: `pnpm run build`
4. To run against any app: `npm link`

## License

Distributed under the MIT License. See `LICENSE` for more information.
