import { Node } from "ts-morph";
import type { Node as MorphNode, TypeChecker } from "ts-morph";
import type { ApiSurfaceRow, Config } from "../../../../types/index.js";
import { firstExportDecls } from "../../../../utils/first-export-decls.js";
import { getDisplayName } from "../../../../utils/get-display-name.js";
import { shortType } from "../../../../utils/short-type.js";
import { classifyDeclaration } from "../classifiers/classify-declaration.js";
import { buildApiRow } from "../../../../utils/api-surface-compat.js";

export function extractApiSurface(
  exported: ReadonlyMap<string, MorphNode[]>,
  checker: TypeChecker,
  config: Config,
): ApiSurfaceRow[] {
  const rows: ApiSurfaceRow[] = [];

  for (const { exportName, decl } of firstExportDecls(exported)) {
    const name = getDisplayName(exportName, decl);
    const kind = classifyDeclaration(decl, name, config);

    // ── Hook: params + return type ───────────────────────────────────────────
    if (kind === "hook") {
      const fn = Node.isFunctionDeclaration(decl)
        ? decl
        : Node.isVariableDeclaration(decl)
          ? decl.getInitializer()
          : null;

      if (
        fn &&
        (Node.isFunctionDeclaration(fn) ||
          Node.isArrowFunction(fn) ||
          Node.isFunctionExpression(fn))
      ) {
        const params =
          // @ts-ignore — getParameters exists on all function-like nodes
          fn
            .getParameters?.()
            ?.map(
              (p: any) =>
                `${p.getName()}: ${shortType(p.getType().getText(p))}`,
            )
            .join(", ") ?? "";

        const ret = shortType(checker.getTypeAtLocation(fn).getText(fn));
        rows.push(buildApiRow({ name, kind, type: ret, params }));
      }
      continue;
    }

    // ── Component: props type ────────────────────────────────────────────────
    if (kind === "component" || kind === "page") {
      const propsType = extractPropsType(decl, checker);
      rows.push(
        buildApiRow({
          name,
          kind,
          type: "JSX.Element",
          params: propsType ?? "",
        }),
      );
      continue;
    }

    // ── Everything else ──────────────────────────────────────────────────────
    rows.push(
      buildApiRow({
        name,
        kind,
        type: shortType(checker.getTypeAtLocation(decl).getText(decl)),
      }),
    );
  }

  return rows;
}

function extractPropsType(
  decl: MorphNode,
  checker: TypeChecker,
): string | null {
  if (Node.isFunctionDeclaration(decl)) {
    const firstParam = decl.getParameters()[0];
    if (firstParam) {
      return shortType(
        checker.getTypeAtLocation(firstParam).getText(firstParam),
      );
    }
  }

  if (Node.isVariableDeclaration(decl)) {
    const init = decl.getInitializer();
    if (
      init &&
      (Node.isArrowFunction(init) || Node.isFunctionExpression(init))
    ) {
      const firstParam = init.getParameters()[0];
      if (firstParam) {
        return shortType(
          checker.getTypeAtLocation(firstParam).getText(firstParam),
        );
      }
    }
  }

  return null;
}
