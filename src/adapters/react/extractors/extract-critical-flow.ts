import { Node, SyntaxKind } from "ts-morph";
import type { Node as MorphNode, TypeChecker } from "ts-morph";
import type { Config } from "../../../core/types/index.js";
import { getDisplayName } from "../../../core/utils/get-display-name.js";
import { pickPrimaryExport } from "../../../core/utils/pick-primary-export.js";
import { describeCall } from "../../../core/utils/describe-call.js";
import { isPrimitiveCall } from "../../../core/utils/is-primitive-call.js";

export function extractCriticalFlow(
  exported: ReadonlyMap<string, MorphNode[]>,
  checker: TypeChecker,
  config: Config,
): string[] {
  const primary = pickPrimaryExport(exported);
  if (!primary) return [];

  const name = getDisplayName(primary.exportName, primary.decl);
  const fnNode = getFnNode(primary.decl);
  if (!fnNode) return [];

  const steps: string[] = [name];
  const seen = new Set<string>([name]);

  for (const call of fnNode.getDescendantsOfKind(SyntaxKind.CallExpression)) {
    const callText = call.getExpression().getText();

    if (isReactNoise(callText) || isPrimitiveCall(callText)) continue;

    const step = describeCall(call, checker, config);
    if (!step || seen.has(step)) continue;

    seen.add(step);
    steps.push(step);

    if (steps.length >= config.maxFlowSteps) break;
  }

  return steps.length > 1 ? [steps.join(" -> ")] : [];
}

function getFnNode(decl: MorphNode): MorphNode | null {
  if (Node.isFunctionDeclaration(decl)) return decl;

  if (Node.isVariableDeclaration(decl)) {
    const init = decl.getInitializer();
    if (
      init &&
      (Node.isArrowFunction(init) || Node.isFunctionExpression(init))
    ) {
      return init;
    }
  }

  return null;
}

function isReactNoise(callText: string): boolean {
  return [
    "React.createElement",
    "jsx",
    "jsxs",
    "_jsx",
    "_jsxs",
    "Fragment",
    "React.Fragment",
    "console.log",
    "console.error",
  ].includes(callText);
}
