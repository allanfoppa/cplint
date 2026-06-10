import { SourceFile } from "ts-morph";
import {
  Config,
  DependencyRow,
  getImportBindingNodes,
  isImportBindingUsedInFile,
} from "cplint";

/**
 * Infers the semantic role of a dependency module.
 * Separate from FileRole — this describes what the dep *does*, not what it *is*.
 */
function inferDepRole(module: string): string {
  if (module.startsWith("@angular/core")) return "framework";
  if (module.startsWith("@angular/")) return "framework";
  if (module.startsWith("rxjs")) return "reactive";
  if (module.includes("store") || module.includes("ngrx")) return "state";
  if (module.includes("router")) return "router";
  if (module.includes("http")) return "http-client";
  if (module.startsWith(".")) return "local";
  return "external";
}

function inferDepType(module: string): string {
  if (module.startsWith(".")) return "local";
  return "external";
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
    if (module.startsWith("@angular/") || module.startsWith("rxjs")) {
      continue;
    }

    rows.push({
      module,
      role: inferDepRole(module),
      type: inferDepType(module),
      symbols,
    });
  }

  return rows;
}
