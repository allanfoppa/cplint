import {
  Node,
  SyntaxKind,
  type Node as MorphNode,
  type TypeChecker,
} from "ts-morph";
import type { ClassDeclaration } from "ts-morph";
import type { Config } from "../../../../types/index.js";
import { getDisplayName } from "../../../../utils/get-display-name.js";
import { pickPrimaryExport } from "../../../../utils/pick-primary-export.js";
import { getFunctionLikeNode } from "../../../../utils/get-function-like-node.js";
import { describeCall } from "../../../../utils/describe-call.js";

export function extractCriticalFlow(
  exported: ReadonlyMap<string, MorphNode[]>,
  checker: TypeChecker,
  config: Config,
): string[] {
  const primary = pickPrimaryExport(exported);
  if (!primary) return [];

  const rootName = getDisplayName(primary.exportName, primary.decl);

  // ── Class: one flow per public method ────────────────────────────────────
  if (Node.isClassDeclaration(primary.decl)) {
    return extractClassFlows(rootName, primary.decl, checker, config);
  }

  // ── Function / arrow: single linear flow ─────────────────────────────────
  const fnNode = getFunctionLikeNode(primary.decl);
  if (!fnNode) return [];

  const steps = extractStepsFromNode(rootName, fnNode, checker, config);
  return steps.length > 1 ? [steps.join(" -> ")] : [];
}

function extractClassFlows(
  className: string,
  cls: ClassDeclaration,
  checker: TypeChecker,
  config: Config,
): string[] {
  const flows: string[] = [];

  const methods = cls
    .getMethods()
    .filter((m) => m.getScope() === undefined || m.getScope() === "public")
    .filter((m) => !m.getName().startsWith("_"))
    .slice(0, config.maxFlowSteps);

  for (const method of methods) {
    const methodName = `${className}.${method.getName()}`;
    const calls = extractCallsFromNode(method, checker, config);
    const meaningful = calls.filter((c) => !isAngularNoise(c));
    if (!meaningful.length) continue;
    flows.push(`${methodName} -> ${meaningful.join(" -> ")}`);
  }

  return flows;
}

function extractStepsFromNode(
  rootName: string,
  node: MorphNode,
  checker: TypeChecker,
  config: Config,
): string[] {
  const steps = [rootName];
  const seen = new Set<string>([rootName]);

  for (const call of node.getDescendantsOfKind(SyntaxKind.CallExpression)) {
    const step = describeCall(call, checker, config);
    if (!step || seen.has(step) || isAngularNoise(step)) continue;
    seen.add(step);
    steps.push(step);
    if (steps.length >= config.maxFlowSteps) break;
  }

  return steps;
}

function extractCallsFromNode(
  node: MorphNode,
  checker: TypeChecker,
  config: Config,
): string[] {
  const calls: string[] = [];
  const seen = new Set<string>();

  for (const call of node.getDescendantsOfKind(SyntaxKind.CallExpression)) {
    const step = describeCall(call, checker, config);
    if (!step || seen.has(step)) continue;
    seen.add(step);
    calls.push(step);
    if (calls.length >= config.maxFlowSteps) break;
  }

  return calls;
}

function isAngularNoise(label: string): boolean {
  return [
    "Injectable",
    "inject",
    "Component",
    "Directive",
    "Pipe",
    "NgModule",
    "Input",
    "Output",
    "console.log",
    "console.error",
    "console.warn",
  ].some((noise) => label.startsWith(noise));
}
