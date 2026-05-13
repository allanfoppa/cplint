import { Type, TypeChecker, Node as MorphNode } from "ts-morph";
import { StateField } from "../types/index.js";
import { shortType } from "../utils/short-type.js";

export function extractFieldsFromType(
  type: Type,
  node: MorphNode,
  checker: TypeChecker,
): StateField[] {
  const fields: StateField[] = [];
  const props = type.getProperties();

  // We only expand if it's an object and not too complex (e.g., avoid expanding HTMLElement)
  if (
    props.length > 0 &&
    !type.isBoolean() &&
    !type.isString() &&
    !type.isNumber() &&
    props.length < 15
  ) {
    props.forEach((p) => {
      const propType = checker.getTypeOfSymbolAtLocation(p, node);
      fields.push({
        name: p.getName(),
        type: shortType(propType.getText(node)),
      });
    });
  }
  return fields;
}
