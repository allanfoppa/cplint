import { Node, SyntaxKind } from "ts-morph";
import type { Node as MorphNode, TypeChecker } from "ts-morph";
import type { ApiSurfaceRow, Config } from "../../../../types/index.js";
import { firstExportDecls } from "../../../../utils/first-export-decls.js";
import { getDisplayName } from "../../../../utils/get-display-name.js";
import { shortType } from "../../../../utils/short-type.js";
import { classifyDeclaration } from "../classifiers/classify-declaration.js";

export function extractApiSurface(
  exported: ReadonlyMap<string, MorphNode[]>,
  checker: TypeChecker,
  config: Config,
): ApiSurfaceRow[] {
  const rows: ApiSurfaceRow[] = [];

  for (const { exportName, decl } of firstExportDecls(exported)) {
    const name = getDisplayName(exportName, decl);
    const kind = classifyDeclaration(decl, name, config);

    // ── Hook: extract return type (what the hook exposes) ───────────────────
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
          (Node.isFunctionDeclaration(fn) ? fn : fn)
            // @ts-ignore — getParameters exists on all function-like nodes
            .getParameters?.()
            ?.map(
              (p: any) =>
                `${p.getName()}: ${shortType(p.getType().getText(p))}`,
            )
            .join(", ") ?? "";

        const ret = shortType(checker.getTypeAtLocation(fn).getText(fn));

        rows.push({ name: `${name}(${params})`, kind, type: ret });
      }
      continue;
    }

    // ── Component: extract Props type ────────────────────────────────────────
    if (kind === "component") {
      const propsType = extractPropsType(decl, checker);
      rows.push({ name, kind, type: propsType ?? "void" });
      continue;
    }

    // ── Everything else: type at location ────────────────────────────────────
    rows.push({
      name,
      kind,
      type: shortType(checker.getTypeAtLocation(decl).getText(decl)),
    });
  }

  return rows;
}

function extractPropsType(
  decl: MorphNode,
  checker: TypeChecker,
): string | null {
  // Function declaration: first parameter = props
  if (Node.isFunctionDeclaration(decl)) {
    const firstParam = decl.getParameters()[0];
    if (firstParam) {
      return shortType(
        checker.getTypeAtLocation(firstParam).getText(firstParam),
      );
    }
  }

  // Arrow function / function expression in variable
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
