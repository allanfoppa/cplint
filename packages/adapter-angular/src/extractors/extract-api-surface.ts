import { Node, Scope } from "ts-morph";
import type {
  ClassDeclaration,
  Node as MorphNode,
  TypeChecker,
} from "ts-morph";
import type { ApiSurfaceRow, Config, FileRole } from "cplint";
import {
  firstExportDecls,
  getDisplayName,
  shortType,
  getTypeTargetNode,
  buildApiRow,
} from "cplint";
import { classifyDeclaration } from "../classifiers/classify-declaration.js";

const SIGNAL_STORE_FNS = new Set([
  "signalStore",
  "createStore",
  "createFeatureStore",
  "create",
  "atom",
]);

const CLASS_INPUT_DECORATORS = new Set([
  "Input",
  "Output",
  "ViewChild",
  "ViewChildren",
  "ContentChild",
  "ContentChildren",
]);

export function extractApiSurface(
  exported: ReadonlyMap<string, MorphNode[]>,
  checker: TypeChecker,
  config: Config,
): ApiSurfaceRow[] {
  const rows: ApiSurfaceRow[] = [];

  for (const { exportName, decl } of firstExportDecls(exported)) {
    const name = getDisplayName(exportName, decl);
    const kind = classifyDeclaration(decl, name, config);

    // ── Class (component, service, facade, guard, pipe…) ──────────────────
    if (Node.isClassDeclaration(decl)) {
      rows.push(...extractClassMembers(name, decl, kind, checker));
      continue;
    }

    // ── Functional store variable (NgRx SignalStore, etc.) ─────────────────
    if (Node.isVariableDeclaration(decl)) {
      const init = decl.getInitializer();

      if (init && Node.isCallExpression(init)) {
        const callName = init.getExpression().getText();
        if (SIGNAL_STORE_FNS.has(callName)) {
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
  kind: FileRole,
  checker: TypeChecker,
): ApiSurfaceRow[] {
  const rows: ApiSurfaceRow[] = [
    buildApiRow({ name: className, kind, type: className }),
  ];

  // ── Public properties with Angular decorators ──────────────────────────
  cls
    .getProperties()
    .filter((p) => {
      const isPublic =
        p.getScope() === undefined || p.getScope() === Scope.Public;
      const hasAngularDecorator = p
        .getDecorators()
        .some((d) => CLASS_INPUT_DECORATORS.has(d.getName()));
      return isPublic && hasAngularDecorator;
    })
    .forEach((prop) => {
      const decoratorName =
        prop
          .getDecorators()
          .find((d) => CLASS_INPUT_DECORATORS.has(d.getName()))
          ?.getName() ?? "property";
      const type = shortType(prop.getType().getText(prop));
      rows.push(
        buildApiRow({
          name: prop.getName(),
          kind: decoratorName.toLowerCase() as FileRole,
          type,
          flags: [decoratorName.toLowerCase()],
        }),
      );
    });

  // ── Public methods ─────────────────────────────────────────────────────
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
