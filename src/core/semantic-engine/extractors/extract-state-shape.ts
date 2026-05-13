import { SourceFile } from "ts-morph";
import type { Node as MorphNode, TypeChecker } from "ts-morph";
import { Config, StateShapeRow } from "../types/index.js";
import { firstExportDecls } from "../utils/first-export-decls.js";
import { getDisplayName } from "../utils/get-display-name.js";
import { getFunctionLikeNode } from "../utils/get-function-like-node.js";
import { addTypeSummary } from "../utils/add-type-summary.js";

export function extractStateShape(
  sourceFile: SourceFile,
  exported: ReadonlyMap<string, MorphNode[]>,
  checker: TypeChecker,
  config: Config,
): StateShapeRow[] {
  const found = new Map<string, StateShapeRow>();

  for (const iface of sourceFile.getInterfaces()) {
    if (!config.includePrivateTypes && !iface.isExported()) {
      continue;
    }

    addTypeSummary(
      found,
      iface.getName(),
      checker.getTypeAtLocation(iface),
      iface,
      checker,
      config,
    );
  }

  for (const alias of sourceFile.getTypeAliases()) {
    if (!config.includePrivateTypes && !alias.isExported()) {
      continue;
    }

    addTypeSummary(
      found,
      alias.getName(),
      checker.getTypeAtLocation(alias),
      alias,
      checker,
      config,
    );
  }

  for (const { exportName, decl } of firstExportDecls(exported)) {
    const name = getDisplayName(exportName, decl);

    const fn = getFunctionLikeNode(decl);

    if (!fn) continue;

    for (const param of fn.getParameters()) {
      addTypeSummary(
        found,
        `${name}.${param.getName()}`,
        checker.getTypeAtLocation(param),
        param,
        checker,
        config,
      );
    }

    const signatures = checker.getTypeAtLocation(fn).getCallSignatures();

    if (signatures.length) {
      addTypeSummary(
        found,
        `${name}.return`,
        signatures[0].getReturnType(),
        fn,
        checker,
        config,
      );
    }
  }

  return [...found.values()];
}
