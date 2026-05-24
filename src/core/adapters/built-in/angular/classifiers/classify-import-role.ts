import type { SourceFile } from "ts-morph";
import type { FileRole } from "../../../../types/index.js";

/**
 * Classifies an Angular source file into a semantic FileRole.
 *
 * Strategy (in priority order):
 * 1. Decorator-based — most reliable (@Component, @Injectable, etc.)
 * 2. Name-suffix-based — fallback for files without decorators (routes, models)
 * 3. Content-based — last resort (e.g. pure function files like hooks/utils)
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
      const name = cls.getName() ?? "";
      if (/Facade$/.test(name)) return "facade";
      if (/Store$/.test(name)) return "store";
      if (/Repository$/.test(name)) return "repository";
      if (/Service$/.test(name)) return "service";
      return "service"; // Injectable without a known suffix → service
    }
  }

  // Decorator-less files — use file name as signal
  const base = file.getBaseNameWithoutExtension().toLowerCase();

  if (base.endsWith(".routes") || base === "routes") return "routes";
  if (base.endsWith(".model") || base.endsWith(".models")) return "model";
  if (base.endsWith(".util") || base.endsWith(".utils")) return "util";

  // Functional Angular (signals-based pages without @Component in some patterns)
  const functions = file.getFunctions();
  for (const fn of functions) {
    const name = fn.getName() ?? "";
    if (/Page$/.test(name)) return "page";
  }

  return "unknown";
}
