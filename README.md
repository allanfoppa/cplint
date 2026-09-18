# CPLint

CPLint is a specialized, AST-powered context generator and structural YAML linter designed to feed Large Language Models (like Cursor, Copilot, or custom agents) with highly optimized repository metadata. It reduces LLM token consumption by executing static AST analysis (via `ts-morph`), stripping redundant ecosystem boilerplate, and outputting highly structured `*.cplint.yaml` files.

**Inspired by the philosophy and structure of ESLint**, CPLint brings predictable, configuration-driven linting rules to AI context orchestration—ensuring developers document core business rules before sending prompts to the LLM.

> ⚠️ **Disclaimer:** CPLint is currently in **Beta**. It is under active development, and breaking changes to the configuration schema may occur before the stable `1.0.0` release. Feel free to open issues or contribute!

---

## Installation and Usage

### Prerequisites

To use CPLint, you must have Node.js (>=20) installed.

Install `cplint` as a development dependency in your project:

If you use CPLint's TypeScript type definitions, TypeScript 5 or later is required.

```bash
npm i --save-dev cplint @cplint/adapter-react
```

### Configuration

Create a `cplint.config.js` file at the root of your repository or (e.g backend, frontend):

```typescript
export default {
  // Root directories to scan for generating context
  rootPath: "src/",

  // Directories and paths to exclude from indexing
  exclude: ["node_modules", "dist", ".git", "**/*.spec.ts"],

  // Adapter architecture alignment ("node" | "react" | "angular") Defaults to "node" if field is ommited
  adapter: "react",

  // Linter validation policy engine
  lint: {
    rules: {
      // Flags manual description fields that are missing or left uncompleted
      "no-empty-manual-blocks": "error",
      // Warns when the source has changed since the context was last generated
      "no-stale-context": "error",
    },
  },
};
```

### CLI Command Reference

#### Generate Context Files

Scans your source files using the configured AST adapter and generates optimized `*.cplint.yaml` files.

```bash
# Note: you can pass a list of files by separating them with spaces
npx cplint generate --entrypoint <path-to-file>
```

#### Context Conceptual Explanation

Every `*.cplint.yaml` file balances abstract human knowledge with automated structural intelligence, split into two root keys: `global:` and `scopes:`.

The `global:` Block (Abstract Context, Business Rules & File Metadata)

This section captures high-level human intent, architectural guardrails that static code analysis cannot infer on its own, and the file's overall metadata.

- **`purpose`** (`Mandatory`): **Intent of Existence.** Defines the primary responsibility of the file. It explains why the file exists and what business or architectural problem it solves.
- **`decisions`** (`Mandatory`): **Design History.** Records past architectural choices, design patterns, or technical trade-offs. This prevents the LLM from suggesting refactorings that were already intentionally discarded.
- **`constraints`** (`Mandatory`): **Hard Boundaries.** Outlines strict technical limitations, security rules, performance requirements, or data formatting standards that the code must adhere to.
- **`known-pitfalls`** (`Optional`): **Points of Attention.** Warns about tricky edge cases, asynchronous side effects, historical bugs, or logical anti-patterns hiding within the scope of the file. Delete the block if empty.
- **`not-in-scope`** (`Optional`): **Scope Boundaries.** Explicitly defines what the file does _not_ handle. This prevents scope creep during AI-driven code generation. Delete the block if empty.
- **`open-questions`** (`Optional`): **Technical Debt & Pending Alignment.** Logs unresolved architectural concerns, pending design choices, or future refactoring ideas that require upcoming alignment. Delete the block if empty.
- **`meta`**: **File-level Metadata.**
  - **`role`**: **Architectural Role.** The classification of the file within the system's architecture (e.g., `component`, `service`, `store`, `util`).
  - **`entry`**: **Physical Location.** The exact relative workspace path to the source file within the repository.
  - **`generated`**: **Traceability.** A timestamp (`YYYY-MM-DD`) indicating when the automation engine last scanned the file.
  - **`relatedContextFiles`**: **Semantic Links.** A list of external file paths that operate in tight coupling or close synergy with this file.
- **`summary`**: **Executive Summary.** A single-line overview summarizing the nature of the exports and the technical surface discovered.
- **`deps`**: **Scope Dependencies.** Tracks internal and external imports consumed by this file, identifying their architectural `role`, `type` (`external` | `local`), and the exact `symbols` brought into scope. Type-only and unused imports are excluded to reduce noise.

The `scopes:` Block (Per-Export Structural Data)

Automatically generated via static Abstract Syntax Tree (AST) analysis. Each public export of the file (component, function, class, hook, etc.) gets its own named entry under `scopes:`, translating complex source code engineering into dense, token-efficient metadata scoped to that individual export.

For each scope (keyed by the export name, e.g. `Header:`):

- **`api-surface`**: **Public Contract.** Describes the exposed signature of that export — `name`, a single-line `signature` (e.g. `Header() → JSX.Element`), and behavior `flags` (e.g. `component`, `exported`).
- **`state-shape`** _(when applicable)_: **Internal Modeling.** Outlines the schemas, properties, and data types of internal memory, local state, or reactive mechanisms embedded inside that export.
- **`critical-flow`** _(when applicable)_: **Linear Execution Chain.** A per-method call graph tracing the sequence of internal function invocations, lifecycle hooks, and side effects triggered from that export.
- **`change-checklist`** _(when applicable)_: **Regression Guardrails.** An automated list of files that reference this export's public contract and must be reviewed if it changes.

> Note: `state-shape`, `critical-flow`, and `change-checklist` are only emitted when relevant to the export (e.g. a plain stateless component may only carry `api-surface`).

#### Run Linter Validations

Validates the `global:` block against structural rules. If a mandatory field is empty, or the recorded role doesn't match filename conventions, the linter will report it.

```bash
npx cplint lint
```

#### Lint Matrix (for Global Blocks)

The engine evaluates developer input following a strict matrix designed to prioritize token preservation:

| Context State      | Block Condition | Description                                                                                        |
| ------------------ | --------------- | -------------------------------------------------------------------------------------------------- |
| **purpose**        | Mandatory       | What the file was created for and its core responsibility.                                         |
| **decisions**      | Mandatory       | Architectural choices, pattern adoptions, or trade-offs made within this scope.                    |
| **constraints**    | Mandatory       | Technical limitations, performance boundaries, or specific business rules that must be respected.  |
| **known-pitfalls** | Optional        | Edge cases, anti-patterns, common bugs, or tricky behaviors to watch out for during modifications. |
| **not-in-scope**   | Optional        | Explicit boundaries defining what this file or feature does _not_ handle to avoid scope creep.     |
| **open-questions** | Optional        | Unresolved issues, pending architectural choices, or design questions requiring future alignment.  |

### Built-in Linting Rules

- **`no-empty-manual-blocks`**: Scans the `global:` block hierarchy. Flags keys that contain empty list placeholders (`- `) so developers remember to provide deep domain constraints or prune them completely to save tokens.

- **`no-stale-context`**: Compares the `generated` date in the `global.meta` block against the last modified time of the source file. Warns when the source has changed since the context was last generated, preventing the LLM from reasoning over an outdated snapshot. Re-run `cplint generate --entrypoint <file>` to resolve.

- **`prefer-explicit-role`**: Checks whether the `role` recorded in `global.meta` was resolved from an explicit filename suffix (`.service.ts`, `.store.ts`, etc.) or inferred via export-shape fallback. Flags cases where no suffix matches the role, since heuristic classification is unreliable (e.g. `windowTitle.ts` mutating `document.title` may look like a `util` but is semantically a `store`). The violation message suggests the idiomatic suffix for that role.

### Contributing

Contributions are welcome!

## License

Distributed under the MIT License. See `LICENSE` for more information.
