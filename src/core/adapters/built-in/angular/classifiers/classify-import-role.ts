import type { SourceFile } from "ts-morph";
import type { FileRole } from "../../../../types/index.js";

const GUARD_INTERFACES = [
  "CanActivate",
  "CanMatch",
  "CanDeactivate",
  "CanLoad",
];

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
      if (/Guard$/.test(name)) return "guard"; // fallback por nome
      if (/Facade$/.test(name)) return "facade";
      if (/Store$/.test(name)) return "store";
      if (/Repository$/.test(name)) return "repository";
      return "service";
    }
  }

  const base = file.getBaseNameWithoutExtension().toLowerCase();
  if (base.endsWith(".routes") || base === "routes") return "routes";
  if (base.endsWith(".model") || base.endsWith(".models")) return "model";
  if (base.endsWith(".util") || base.endsWith(".utils")) return "util";

  const functions = file.getFunctions();
  for (const fn of functions) {
    if (/Page$/.test(fn.getName() ?? "")) return "page";
  }

  return "unknown";
}
