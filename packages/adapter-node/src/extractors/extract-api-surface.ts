import { Node } from "ts-morph";
import type {
  ClassDeclaration,
  ExportedDeclarations,
  FunctionDeclaration,
  TypeChecker,
  VariableDeclaration,
} from "ts-morph";
import type { ApiSurfaceRow, Config } from "cplint";
import { getDisplayName, shortType, buildApiRow } from "cplint";

export function extractApiSurface(
  exported: ReadonlyMap<string, ExportedDeclarations[]>,
  checker: TypeChecker,
  _config: Config,
): ApiSurfaceRow[] {
  const rows: ApiSurfaceRow[] = [];

  for (const [exportName, decls] of exported.entries()) {
    const decl = decls[0];
    if (!decl) continue;

    const name = getDisplayName(exportName, decl);

    if (Node.isClassDeclaration(decl)) {
      rows.push(...extractClassMembers(name, decl, checker));
      continue;
    }

    if (Node.isFunctionDeclaration(decl)) {
      rows.push(extractFunction(name, decl, checker));
      continue;
    }

    if (Node.isVariableDeclaration(decl)) {
      rows.push(extractVariable(name, decl, checker));
      continue;
    }

    if (
      Node.isInterfaceDeclaration(decl) ||
      Node.isTypeAliasDeclaration(decl)
    ) {
      rows.push(
        buildApiRow({
          name,
          kind: "type",
          type: shortType(decl.getText()),
        }),
      );
      continue;
    }
  }

  return rows;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractClassMembers(
  className: string,
  cls: ClassDeclaration,
  checker: TypeChecker,
): ApiSurfaceRow[] {
  const rows: ApiSurfaceRow[] = [
    buildApiRow({ name: className, kind: "class", type: className }),
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
      rows.push(
        buildApiRow({
          name: `  ${method.getName()}`,
          kind: "method",
          type: ret,
          params,
        }),
      );
    });

  return rows;
}

function extractFunction(
  name: string,
  fn: FunctionDeclaration,
  _checker: TypeChecker,
): ApiSurfaceRow {
  const params = fn
    .getParameters()
    .map((p) => `${p.getName()}: ${shortType(p.getType().getText(p))}`)
    .join(", ");
  const ret = shortType(fn.getReturnType().getText(fn));
  const flags = fn.isAsync() ? ["async"] : [];
  return buildApiRow({ name, kind: "function", type: ret, params, flags });
}

function extractVariable(
  name: string,
  decl: VariableDeclaration,
  _checker: TypeChecker,
): ApiSurfaceRow {
  return buildApiRow({
    name,
    kind: "variable",
    type: shortType(decl.getType().getText(decl)),
  });
}
