import type { SourceFile } from "ts-morph";
import type { FileRole } from "../../../../types/index.js";

const GUARD_INTERFACES = [
  "CanActivate",
  "CanMatch",
  "CanDeactivate",
  "CanLoad",
];

/**
 * Classifies an Angular source file into a semantic FileRole.
 *
 * Strategy (in priority order):
 * 1. Decorator-based — most reliable (@Component, @Injectable, etc.)
 * 2. Functional patterns — NgRx SignalStore, standalone stores
 * 3. Name-suffix-based — fallback for files without decorators
 * 4. Content-based — last resort
 */
export function classifyAngularFile(file: SourceFile): FileRole {
  const classes = file.getClasses();

  for (const cls of classes) {
    const decoratorNames = cls.getDecorators().map((d) => d.getName());

    if (decoratorNames.includes("Component")) {
      const name = cls.getName() ?? "";
      if (/Page(Component)?$/.test(name)) return "page";
      return "component";
    }

    if (decoratorNames.includes("Directive")) return "directive";
    if (decoratorNames.includes("Pipe")) return "pipe";

    if (decoratorNames.includes("Injectable")) {
      const implemented = cls
        .getImplements()
        .map((i) => i.getExpression().getText());

      if (implemented.some((i) => GUARD_INTERFACES.includes(i))) return "guard";

      const name = cls.getName() ?? "";
      if (/Guard$/.test(name)) return "guard";
      if (/Facade$/.test(name)) return "facade";
      if (/Store$/.test(name)) return "store";
      if (/Repository$/.test(name)) return "repository";
      return "service";
    }
  }

  // ── Functional patterns ──────────────────────────────────────────────────
  // NgRx SignalStore: `export const XStore = signalStore(...)`
  const SIGNAL_STORE_FNS = ["signalStore", "createStore", "createFeatureStore"];

  for (const decl of file.getVariableDeclarations()) {
    if (!decl.isExported()) continue;
    const init = decl.getInitializer();
    if (!init) continue;

    const callText = init.getText().trimStart();
    if (SIGNAL_STORE_FNS.some((fn) => callText.startsWith(fn))) return "store";

    // Zustand / Jotai patterns used in Angular (uncommon but possible)
    if (/^create\(/.test(callText) || /^atom\(/.test(callText)) return "store";
  }

  // ── Name-suffix fallback ─────────────────────────────────────────────────
  const base = file.getBaseNameWithoutExtension().toLowerCase();
  if (base.endsWith(".routes") || base === "routes") return "routes";
  if (base.endsWith(".model") || base.endsWith(".models")) return "model";
  if (base.endsWith(".util") || base.endsWith(".utils")) return "util";
  if (base.endsWith(".store")) return "store";

  // ── Functional Angular pages without @Component ──────────────────────────
  for (const fn of file.getFunctions()) {
    if (/Page$/.test(fn.getName() ?? "")) return "page";
  }

  return "unknown";
}
