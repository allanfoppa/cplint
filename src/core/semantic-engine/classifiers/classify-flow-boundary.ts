import { Config } from "../types/index.js";
import { normalizePath } from "../utils/normalize-path.js";

export function classifyFlowBoundary({
  exprText,
  ownerFile,
  currentFile,
  isExternal,
  config,
}: {
  exprText: string;
  ownerFile: string | null;
  currentFile: string;
  isExternal: boolean;
  config: Config;
}): string | null {
  for (const rule of config.flowBoundaryRules) {
    if (rule.matchExpr && new RegExp(rule.matchExpr).test(exprText)) {
      return rule.label;
    }

    if (
      rule.matchFile &&
      ownerFile &&
      new RegExp(rule.matchFile).test(ownerFile)
    ) {
      return rule.label;
    }
  }

  if (isExternal) {
    return "external-call";
  }

  if (ownerFile && normalizePath(ownerFile) !== normalizePath(currentFile)) {
    return "local-call";
  }

  return "call";
}
