import { type Node as MorphNode, TypeChecker, SyntaxKind } from "ts-morph";
import { Config } from "../types/index.js";
import { getFunctionLikeNode } from "../utils/get-function-like-node.js";
import { getDisplayName } from "../utils/get-display-name.js";
import { pickPrimaryExport } from "../utils/pick-primary-export.js";
import { describeCall } from "../utils/describe-call.js";

export function extractCriticalFlow(
  exported: ReadonlyMap<string, MorphNode[]>,
  checker: TypeChecker,
  config: Config,
): string[] {
  const primary = pickPrimaryExport(exported);

  if (!primary) return [];

  const root = getFunctionLikeNode(primary.decl) || primary.decl;

  const steps: string[] = [];

  const seen = new Set<string>();

  const rootName = getDisplayName(primary.exportName, primary.decl);

  steps.push(rootName);

  seen.add(rootName);

  const calls = root.getDescendantsOfKind(SyntaxKind.CallExpression);

  for (const call of calls) {
    const step = describeCall(call, checker, config);

    if (!step) continue;

    if (seen.has(step)) continue;

    seen.add(step);

    steps.push(step);

    if (steps.length >= config.maxFlowSteps) {
      break;
    }
  }

  return steps.length ? [steps.join(" -> ")] : [];
}
