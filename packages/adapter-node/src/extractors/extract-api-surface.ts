import { Node, Scope } from "ts-morph";
import type {
  ClassDeclaration,
  ExportedDeclarations,
  FunctionDeclaration,
  TypeChecker,
  VariableDeclaration,
} from "ts-morph";
import type { ApiSurfaceRow, Config } from "cplint";
import { getDisplayName, shortType, buildApiRow } from "cplint";
import { classifyNodeFile } from "../classifiers/classify-file.js";

const SIGNAL_STORE_FNS = new Set([
  "signalStore",
  "createStore",
  "createFeatureStore",
  "create",
  "atom",
]);

export function extractApiSurface(
  exported: ReadonlyMap<string, ExportedDeclarations[]>,
  checker: TypeChecker,
  config: Config,
): ApiSurfaceRow[] {
  const rows: ApiSurfaceRow[] = [];

  for (const [exportName, decls] of exported.entries()) {
    const decl = decls[0];
    if (!decl) continue;

    const name = getDisplayName(exportName, decl);
    const kind = classifyNodeFile(decl.getSourceFile());

    if (Node.isClassDeclaration(decl)) {
      rows.push(...extractClassMembers(name, decl, kind, checker));
      continue;
    }

    if (Node.isFunctionDeclaration(decl)) {
      rows.push(extractFunction(name, decl, kind));
      continue;
    }

    if (Node.isVariableDeclaration(decl)) {
      rows.push(extractVariable(name, decl, kind, checker));
      continue;
    }

    if (
      Node.isInterfaceDeclaration(decl) ||
      Node.isTypeAliasDeclaration(decl)
    ) {
      const cleanText = decl
        .getText()
        .replace(/^export\s+/, "")
        .replace(/\s+/g, " ")
        .trim();

      rows.push(
        buildApiRow({
          name,
          kind,
          type: shortType(cleanText),
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
  kind: string,
  checker: TypeChecker,
): ApiSurfaceRow[] {
  const rows: ApiSurfaceRow[] = [
    buildApiRow({ name: className, kind, type: className }),
  ];

  cls
    .getMethods()
    .filter((m) => m.getScope() === undefined || m.getScope() === Scope.Public)
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

function extractFunction(
  name: string,
  fn: FunctionDeclaration,
  kind: string,
): ApiSurfaceRow {
  const params = fn
    .getParameters()
    .map((p) => `${p.getName()}: ${shortType(p.getType().getText(p))}`)
    .join(", ");
  const ret = shortType(fn.getReturnType().getText(fn));
  const flags = fn.isAsync() ? ["async"] : [];
  return buildApiRow({ name, kind, type: ret, params, flags });
}

function extractVariable(
  name: string,
  decl: VariableDeclaration,
  kind: string,
  checker: TypeChecker,
): ApiSurfaceRow {
  const init = decl.getInitializer();

  // Functional store
  if (init && Node.isCallExpression(init)) {
    const callName = init.getExpression().getText();
    if (SIGNAL_STORE_FNS.has(callName)) {
      return buildApiRow({
        name,
        kind: "store",
        type: "Store",
        flags: ["functional"],
      });
    }
  }

  // Arrow function — render as call signature
  if (init && Node.isArrowFunction(init)) {
    const params = init
      .getParameters()
      .map((p) => `${p.getName()}: ${shortType(p.getType().getText(p))}`)
      .join(", ");
    const ret = shortType(init.getReturnType().getText(init));
    const flags = init.isAsync() ? ["async"] : [];
    return buildApiRow({ name, kind, type: ret, params, flags });
  }

  // Plain variable
  return buildApiRow({
    name,
    kind,
    type: shortType(decl.getType().getText(decl)),
  });
}
