import { SourceFile } from "ts-morph";
import type { Config, DependencyRow } from "../../../types/index.js";
import { getImportBindingNodes } from "../../../utils/get-import-binding-nodes.js";
import { isImportBindingUsedInFile } from "../../../utils/is-import-binding-used-in-file.js";

function inferDepRole(module: string, symbols: string[]): string {
  // React core
  if (module === "react") return "framework";
  if (module.startsWith("react-")) return "framework";
  if (module.startsWith("@types/react")) return "framework";

  // State management
  if (
    module.includes("redux") ||
    module.includes("zustand") ||
    module.includes("jotai") ||
    module.includes("recoil")
  )
    return "state";
  if (module.includes("mobx")) return "state";

  // Routing
  if (
    module.includes("react-router") ||
    module.includes("next/router") ||
    module.includes("next/navigation")
  )
    return "router";

  // Data fetching
  if (
    module.includes("react-query") ||
    module.includes("swr") ||
    module.includes("apollo")
  )
    return "data-fetching";

  // Styling
  if (
    module.includes("styled-components") ||
    module.includes("@emotion") ||
    module.includes("tailwind")
  )
    return "styling";

  // Local — infer by symbol name pattern
  if (module.startsWith(".")) {
    if (symbols.some((s) => /^use[A-Z]/.test(s))) return "hook";
    if (symbols.some((s) => /Context$/.test(s))) return "context";
    if (symbols.some((s) => /Store$|Slice$/.test(s))) return "store";
    if (symbols.some((s) => /Service$/.test(s))) return "service";
    return "local";
  }

  return "external";
}

function inferDepType(module: string): string {
  return module.startsWith(".") ? "local" : "external";
}

export function extractDeps(
  sourceFile: SourceFile,
  config: Config,
): DependencyRow[] {
  const rows: DependencyRow[] = [];

  for (const imp of sourceFile.getImportDeclarations()) {
    if (imp.isTypeOnly()) continue;

    const symbols = getImportBindingNodes(imp)
      .filter((node) => isImportBindingUsedInFile(node, sourceFile))
      .map((node) => node.getText());

    if (!symbols.length) continue;

    const module = imp.getModuleSpecifierValue();

    // Skips standard framework boilerplate that the LLM already knows by config adapter
    if (module.startsWith("react")) {
      continue;
    }

    rows.push({
      module,
      role: inferDepRole(module, symbols),
      type: inferDepType(module),
      symbols,
    });
  }

  return rows;
}
