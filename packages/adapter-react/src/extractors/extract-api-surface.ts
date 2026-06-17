import { Node } from "ts-morph";
import type {
  ArrowFunction,
  FunctionDeclaration,
  FunctionExpression,
  Node as MorphNode,
  TypeChecker,
} from "ts-morph";
import type { ApiSurfaceRow, Config } from "cplint";
import {
  firstExportDecls,
  getDisplayName,
  shortType,
  buildApiRow,
} from "cplint";
import { classifyDeclaration } from "../classifiers/classify-declaration.js";

type FunctionLike = FunctionDeclaration | ArrowFunction | FunctionExpression;

function extractFunctionLike(decl: MorphNode): FunctionLike | null {
  if (Node.isFunctionDeclaration(decl)) return decl;
  if (Node.isVariableDeclaration(decl)) {
    const init = decl.getInitializer();
    if (!init) return null;
    if (Node.isArrowFunction(init) || Node.isFunctionExpression(init))
      return init;
  }
  return null;
}

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
      const fn = extractFunctionLike(decl);
      if (fn) {
        const params = fn
          .getParameters()
          .map((p) => `${p.getName()}: ${shortType(p.getType().getText(p))}`)
          .join(", ");
        const ret = shortType(checker.getTypeAtLocation(fn).getText(fn));
        rows.push(buildApiRow({ name, kind, type: ret, params }));
      }
      continue;
    }

    // ── Component / Page: props type ─────────────────────────────────────────
    if (kind === "component" || kind === "page") {
      const fn = extractFunctionLike(decl);
      const firstParam = fn?.getParameters()[0];
      const propsType = firstParam
        ? shortType(checker.getTypeAtLocation(firstParam).getText(firstParam))
        : "";
      rows.push(
        buildApiRow({ name, kind, type: "JSX.Element", params: propsType }),
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
