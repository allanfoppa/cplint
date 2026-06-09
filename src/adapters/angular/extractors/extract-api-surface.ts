import { Node } from "ts-morph";
import type {
  ClassDeclaration,
  Node as MorphNode,
  TypeChecker,
} from "ts-morph";
import type { ApiSurfaceRow, Config } from "../../../core/types/index.js";
import { firstExportDecls } from "../../../core/utils/first-export-decls.js";
import { getDisplayName } from "../../../core/utils/get-display-name.js";
import { classifyAngularFile } from "../classifiers/classify-import-role.js";
import { shortType } from "../../../core/utils/short-type.js";
import { getTypeTargetNode } from "../../../core/utils/get-type-target-node.js";
import { buildApiRow } from "../../../core/utils/api-surface-compat.js";

const SIGNAL_STORE_FNS = ["signalStore", "createStore", "createFeatureStore"];

export function extractApiSurface(
  exported: ReadonlyMap<string, MorphNode[]>,
  checker: TypeChecker,
  config: Config,
): ApiSurfaceRow[] {
  const rows: ApiSurfaceRow[] = [];

  for (const { exportName, decl } of firstExportDecls(exported)) {
    const name = getDisplayName(exportName, decl);
    const kind = classifyAngularFile(decl.getSourceFile());

    // ── Class (component, service, facade, guard, pipe…) ──────────────────
    if (Node.isClassDeclaration(decl)) {
      rows.push(...extractClassMembers(name, decl, kind, checker));
      continue;
    }

    // ── Functional store variable (NgRx SignalStore, etc.) ─────────────────
    if (Node.isVariableDeclaration(decl)) {
      const init = decl.getInitializer();
      const isSignalStore =
        init &&
        SIGNAL_STORE_FNS.some((fn) =>
          init.getText().trimStart().startsWith(fn),
        );

      if (isSignalStore) {
        // The inferred type is a massive generic — summarise instead
        rows.push(
          buildApiRow({
            name,
            kind: "store",
            type: "SignalStore",
            flags: ["functional"],
          }),
        );
        continue;
      }
    }

    // ── Everything else (functions, types, interfaces, enums, variables) ───
    const target = getTypeTargetNode(decl);
    const type = shortType(checker.getTypeAtLocation(target).getText(target));
    rows.push(buildApiRow({ name, kind, type }));
  }

  return rows;
}

function extractClassMembers(
  className: string,
  cls: ClassDeclaration,
  kind: string,
  checker: TypeChecker,
): ApiSurfaceRow[] {
  const rows: ApiSurfaceRow[] = [
    buildApiRow({ name: className, kind, type: className }),
  ];

  cls
    .getMethods()
    .filter((m) => m.getScope() === undefined || m.getScope() === "public")
    .forEach((method) => {
      const params = method
        .getParameters()
        .map((p) => `${p.getName()}: ${shortType(p.getType().getText(p))}`)
        .join(", ");
      const ret = shortType(method.getReturnType().getText(method));
      const flags = method.isAsync() ? ["async"] : [];
      rows.push(
        buildApiRow({
          name: method.getName(),
          kind: "method",
          type: ret,
          params,
          flags,
        }),
      );
    });

  return rows;
}
