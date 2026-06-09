import { Node } from "ts-morph";
import type { ExportedDeclarations, SourceFile, TypeChecker } from "ts-morph";
import type { Config, StateShapeRow } from "../../../core/types/index.js";
import { shortType } from "../../../core/utils/short-type.js";

const STATE_CALL_PATTERNS = /^(create|use|make|build|init)[A-Z]|Store$|State$/;

export function extractStateShape(
  file: SourceFile,
  _exported: ReadonlyMap<string, ExportedDeclarations[]>,
  checker: TypeChecker,
  config: Config,
): StateShapeRow[] {
  const stateMap = new Map<string, StateShapeRow>();

  // ── Class properties (exclude injected / readonly deps) ──────────────────
  for (const cls of file.getClasses()) {
    for (const prop of cls.getProperties()) {
      if (prop.isReadonly()) continue;

      const name = prop.getName();
      const type = prop.getType();
      const fields = type
        .getProperties()
        .slice(0, config.maxTypeFields)
        .map((p) => ({
          name: p.getName(),
          type: shortType(
            checker.getTypeOfSymbolAtLocation(p, prop).getText(prop),
          ),
        }));

      stateMap.set(name, {
        name: `${name}: ${shortType(type.getText(prop))}`,
        fields,
      });
    }
  }

  // ── Module-level variable declarations that look like state ───────────────
  for (const decl of file.getVariableDeclarations()) {
    const initializer = decl.getInitializer();
    if (!initializer || !Node.isCallExpression(initializer)) continue;

    const callText = initializer.getExpression().getText();
    if (!STATE_CALL_PATTERNS.test(callText)) continue;

    const name = decl.getName();
    const type = decl.getType();
    const fields = type
      .getProperties()
      .slice(0, config.maxTypeFields)
      .map((p) => ({
        name: p.getName(),
        type: shortType(
          checker.getTypeOfSymbolAtLocation(p, decl).getText(decl),
        ),
      }));

    stateMap.set(name, {
      name: `${name}: ${shortType(type.getText(decl))}`,
      fields,
    });
  }

  return Array.from(stateMap.values());
}
