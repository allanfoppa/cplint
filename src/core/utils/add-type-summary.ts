import { Type, TypeChecker, type Node as MorphNode } from "ts-morph";
import { Config, StateShapeRow } from "../types/index.js";
import { shortType } from "./short-type.js";

export function addTypeSummary(
  store: Map<string, StateShapeRow>,
  label: string,
  type: Type,
  node: MorphNode,
  checker: TypeChecker,
  config: Config,
): void {
  const fields = type
    .getProperties()
    .slice(0, config.maxTypeFields)
    .map((prop) => ({
      name: prop.getName(),

      type: shortType(
        checker.getTypeOfSymbolAtLocation(prop, node).getText(node),
      ),
    }));

  if (!fields.length) return;

  if (store.has(label)) return;

  store.set(label, {
    name: label,
    fields,
  });
}
