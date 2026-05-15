import { SemanticContext, ContextMetrics } from "../types/index.js";

export function extractMetrics(
  partialContext: Partial<SemanticContext>,
): ContextMetrics {
  const localDeps =
    partialContext.deps?.filter((d) => d.type === "local").length || 0;
  const externalDeps =
    partialContext.deps?.filter((d) => d.type === "external").length || 0;

  // Count how many steps are in the critical flow (based on '->')
  const flowSteps = partialContext.criticalFlow?.[0]?.split("->").length || 0;

  // Local Deps (40%), Flow (40%), External Deps (20%)
  const entropy = Math.min(
    10,
    localDeps * 0.5 + flowSteps * 0.8 + externalDeps * 0.1,
  );

  let grade: ContextMetrics["grade"] = "A";
  if (entropy > 8) grade = "F";
  else if (entropy > 6) grade = "D";
  else if (entropy > 4) grade = "C";
  else if (entropy > 2) grade = "B";

  return {
    entropy: Number(entropy.toFixed(1)),
    grade,
    signals: {
      fragmentation: localDeps,
      flowComplexity: flowSteps,
      externalLoad: externalDeps,
    },
  };
}
