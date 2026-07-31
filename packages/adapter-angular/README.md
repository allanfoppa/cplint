# @cplint/adapter-angular

[![npm version](https://img.shields.io/npm/v/@cplint/adapter-angular.svg?style=flat-square)](https://www.npmjs.com/package/@cplint/adapter-angular)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](https://opensource.org/licenses/MIT)

Official Angular adapter for [CPLint](https://www.npmjs.com/package/cplint). Teaches the core AST engine how to interpret Angular decorators, dependency injection, and template bindings, translating them into CPLint's `role` and `scopes` model.

> Requires the `cplint` core package as a peer dependency.

---

## Installation

```bash
npm i --save-dev cplint @cplint/adapter-angular
```

## Configuration

Set `adapter: "angular"` in your `cplint.config.js`:

```typescript
export default {
  rootPath: "src/",
  exclude: ["node_modules", "dist", ".git", "**/*.spec.ts"],
  adapter: "angular",
  lint: {
    rules: {
      "no-empty-manual-blocks": "error",
      "no-stale-context": "error",
    },
  },
};
```

## What this adapter resolves

The Angular adapter reads decorator metadata directly, rather than relying on filename suffixes alone, since Angular's own conventions (`.component.ts`, `.service.ts`, `.guard.ts`) already carry strong signal:

| Decorator | Resolved `role` |
| --- | --- |
| `@Component` | `component` |
| `@Injectable` | `service` |
| `@Directive` | `directive` (mapped to `middleware` for cross-adapter `FileRole` compatibility) |
| `@Pipe` | `util` |
| `@NgModule` | `entrypoint` |
| `CanActivate` / `CanDeactivate` implementation | `guard` |

Because decorator presence is unambiguous, files classified this way are never flagged by `prefer-explicit-role`, even without `--strict-roles`.

### `state-shape` for components and services

For `@Component` classes, `state-shape` is derived from `@Input()` / `@Output()` bindings and class properties bound in the template (when the adapter can resolve the paired `.html` file). For `@Injectable` services, `state-shape` reflects `BehaviorSubject` / `Signal` fields exposed publicly.

### `critical-flow` for lifecycle hooks

Angular lifecycle methods (`ngOnInit`, `ngOnChanges`, `ngOnDestroy`, etc.) are walked in their guaranteed execution order to build `critical-flow`, including calls into injected services, so the LLM understands initialization and teardown sequencing without needing the full class body.

### `deps` and dependency injection

Constructor-injected dependencies are resolved through Angular's DI tokens and listed under `deps` with `role: "service"` (or the role resolved from that dependency's own file), distinguishing them from plain imports.

### Known pitfalls the adapter flags automatically

- Standalone components (`standalone: true`) that import other standalone components directly bypass `NgModule` declarations — the adapter still resolves their `role` correctly, but `relatedContextFiles` may need manual review since module-level `change-checklist` inference is reduced.
- Structural directives (`*ngIf`, `*ngFor`) are not tracked as own scopes; only the host directive/component is.

## Compatible with

- Angular 15+ (standalone components)
- Angular 12–14 (NgModule-based, decorator detection only)

## License

MIT — see the root [`cplint`](https://www.npmjs.com/package/cplint) package for full license text.
