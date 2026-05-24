import { CallExpression, TypeChecker } from "ts-morph";
import { Config } from "../types/index.js";
import { classifyFlowBoundary } from "./classify-flow-boundary.js";

export function describeCall(
  call: CallExpression,
  checker: TypeChecker,
  config: Config,
): string | null {
  const expr = call.getExpression();
  const text = expr.getText();
  const signature = checker.getResolvedSignature(call);
  const decl = signature && signature.getDeclaration();
  const ownerFile = decl ? decl.getSourceFile().getFilePath() : null;
  const boundaryKind = classifyFlowBoundary({
    exprText: text,
    ownerFile,
    currentFile: call.getSourceFile().getFilePath(),
    isExternal: ownerFile ? ownerFile.includes("node_modules") : false,
    config,
  });

  if (!boundaryKind) return null;

  return `${text} (${boundaryKind})`;
}
