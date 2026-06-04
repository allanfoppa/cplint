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

#### Context Conceptual Explanation

##### Context File Anatomy

Every `*.context.ai.yaml` file balance abstract human knowledge with automated structural intelligence, split into two main root keys:

##### 1. The `manual:` Block (Abstract Context & Business Rules)

This section captures high-level human intent and architectural guardrails that static code analysis cannot infer on its own.

- **`purpose`** (`Mandatory`): **Intent of Existence.** Defines the primary responsibility of the file. It explains why the file exists and what business or architectural problem it solves.
- **`decisions`** (`Optional`): **Design History.** Records past architectural choices, design patterns, or technical trade-offs. This prevents the LLM from suggesting refactorings that were already intentionally discarded.
- **`constraints`** (`Optional`): **Hard Boundaries.** Outlines strict technical limitations, security rules, performance requirements, or data formatting standards that the code must adhere to.
- **`known-pitfalls`** (`Optional`): **Points of Attention.** Warns about tricky edge cases, asynchronous side effects, historical bugs, or logical anti-patterns hiding within the scope of the file.
- **`not-in-scope`** (`Optional`): **Scope Boundaries.** Explicitly defines what the file does _not_ handle. This prevents scope creep during AI-driven code generation.
- **`open-questions`** (`Optional`): **Technical Debt & Pending Alignment.** Logs unresolved architectural concerns, pending design choices, or future refactoring ideas that require upcoming alignment.

##### 2. The `auto:` Block (Technical Metadata & Structure)

Automatically generated via static Abstract Syntax Tree (AST) analysis. It translates complex source code engineering into dense, token-efficient metadata.

###### `meta:` (Global Blueprint)

- **`role`**: **Architectural Role.** The classification of the file within the system's architecture (e.g., presentation layer, state manager, core domain entity, or infrastructure).
- **`entry`**: **Physical Location.** The exact relative workspace path to the source file within the repository.
- **`generated`**: **Traceability.** A timestamp indicating exactly when the automation engine last scanned the file.
- **`related`**: **Semantic Links.** A list of external file paths that operate in tight coupling or close synergy with this file.

###### Structural Body

- **`summary`**: **Executive Summary.** A single-line overview summarizing the nature of the exports and the technical surface discovered.
- **`entry-points`**: **Access Points.** Lists the names and technical classifications of the main public exports (classes, functions, tokens).
- **`api-surface`**: **Public Contract.** Maps the strict signature of everything exposed to the outside world. It details method names, input arguments, return types, and properties, tagged with behavior flags.
- **`deps`**: **Scope Dependencies.** Tracks internal project imports consumed by this file, identifying their architectural roles and the exact symbols brought into scope. Type-only and unused imports are excluded to reduce noise.
- **`state-shape`**: **Internal Modeling.** Outlines the schemas, properties, and data types of internal memory, local states, or reactive mechanisms embedded inside the file.
- **`critical-flow`**: **Linear Execution Chain.** A per-method call graph tracing the sequence of internal function invocations, lifecycle hooks, and side effects triggered from each public entry point.
- **`change-checklist`**: **Regression Guardrails.** An automated list of files that reference this module's public exports and must be reviewed if the public contract changes.

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
