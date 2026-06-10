import type { SourceFile } from "ts-morph";
import type { Config, DependencyRow } from "cplint";

const NODE_BUILTINS = new Set([
  "fs",
  "path",
  "os",
  "url",
  "http",
  "https",
  "crypto",
  "stream",
  "events",
  "util",
  "child_process",
  "worker_threads",
  "buffer",
  "node:fs",
  "node:path",
  "node:os",
  "node:url",
  "node:http",
  "node:https",
  "node:crypto",
  "node:stream",
  "node:events",
  "node:util",
  "node:child_process",
  "node:worker_threads",
  "node:buffer",
]);

export function extractDeps(file: SourceFile, config: Config): DependencyRow[] {
  const rows: DependencyRow[] = [];
  const filePath = file.getFilePath();

  for (const decl of file.getImportDeclarations()) {
    const module = decl.getModuleSpecifierValue();
    const symbols = decl
      .getNamedImports()
      .map((n) => n.getName())
      .concat(
        decl.getDefaultImport() ? [decl.getDefaultImport()!.getText()] : [],
      );

    const isRelative = module.startsWith(".");
    const isBuiltin = NODE_BUILTINS.has(module);
    const isExternal = !isRelative && !isBuiltin;

    const role = isBuiltin
      ? "builtin"
      : isRelative
        ? inferLocalRole(module, filePath)
        : inferExternalRole(module, config);

    rows.push({
      module,
      role,
      symbols,
      type: isBuiltin ? "builtin" : isRelative ? "local" : "external",
    });
  }

  return rows;
}

function inferLocalRole(module: string, _filePath: string): string {
  if (module.includes("repository") || module.includes("repo"))
    return "repository";
  if (module.includes("service")) return "service";
  if (module.includes("model") || module.includes("types")) return "model";
  if (module.includes("util") || module.includes("helper")) return "util";
  if (module.includes("config")) return "config";
  return "local";
}

function inferExternalRole(module: string, _config: Config): string {
  if (module.startsWith("@nestjs")) return "framework";
  if (module === "express" || module === "fastify" || module === "hono")
    return "framework";
  if (
    module.includes("prisma") ||
    module.includes("typeorm") ||
    module.includes("mongoose")
  )
    return "orm";
  if (
    module.includes("test") ||
    module.includes("jest") ||
    module.includes("vitest")
  )
    return "test";
  return "external";
}
