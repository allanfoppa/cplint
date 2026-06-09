import { Node, SyntaxKind } from "ts-morph";
import type { Node as MorphNode, SourceFile, TypeChecker } from "ts-morph";
import type { Config, StateShapeRow } from "../../../core/types/index.js";
import { firstExportDecls } from "../../../core/utils/first-export-decls.js";
import { getDisplayName } from "../../../core/utils/get-display-name.js";
import { addTypeSummary } from "../../../core/utils/add-type-summary.js";

const STATE_HOOK_PATTERNS = /^use(State|Reducer|Context|Store|Atom|Signal)$/;
const STORE_CREATE_PATTERNS = /^(create|createSlice|createStore|atom|signal)$/;

export function extractStateShape(
  sourceFile: SourceFile,
  exported: ReadonlyMap<string, MorphNode[]>,
  checker: TypeChecker,
  config: Config,
): StateShapeRow[] {
  const found = new Map<string, StateShapeRow>();

  // ── Interfaces and types (Props, State, etc.) ────────────────────────────
  for (const iface of sourceFile.getInterfaces()) {
    if (!config.includePrivateTypes && !iface.isExported()) continue;
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
    if (!config.includePrivateTypes && !alias.isExported()) continue;
    addTypeSummary(
      found,
      alias.getName(),
      checker.getTypeAtLocation(alias),
      alias,
      checker,
      config,
    );
  }

  // ── useState / useReducer inside exported functions/components ───────────
  for (const { exportName, decl } of firstExportDecls(exported)) {
    const name = getDisplayName(exportName, decl);

    const fnNode = Node.isFunctionDeclaration(decl)
      ? decl
      : Node.isVariableDeclaration(decl)
        ? decl.getInitializer()
        : null;

    if (!fnNode) continue;

    const calls = fnNode.getDescendantsOfKind(SyntaxKind.CallExpression);

    for (const call of calls) {
      const callName = call.getExpression().getText().split(".").pop() ?? "";

      if (!STATE_HOOK_PATTERNS.test(callName)) continue;

      // useState<T>() — extract T
      const typeArgs = call.getTypeArguments();
      if (typeArgs.length) {
        const stateType = checker.getTypeAtLocation(typeArgs[0]);
        addTypeSummary(
          found,
          `${name}.${callName}`,
          stateType,
          typeArgs[0],
          checker,
          config,
        );
        continue;
      }

      // useState(initialValue) — infer from initializer
      const args = call.getArguments();
      if (args.length) {
        const stateType = checker.getTypeAtLocation(args[0]);
        addTypeSummary(
          found,
          `${name}.${callName}`,
          stateType,
          args[0],
          checker,
          config,
        );
      }
    }
  }

  // ── Module-level store declarations (Zustand, Jotai, Redux Toolkit) ──────
  for (const decl of sourceFile.getVariableDeclarations()) {
    const init = decl.getInitializer();
    if (!init || !Node.isCallExpression(init)) continue;

    const callName = init.getExpression().getText().split(".").pop() ?? "";
    if (!STORE_CREATE_PATTERNS.test(callName)) continue;

    const type = checker.getTypeAtLocation(decl);
    addTypeSummary(found, decl.getName(), type, decl, checker, config);
  }

  return [...found.values()];
}
