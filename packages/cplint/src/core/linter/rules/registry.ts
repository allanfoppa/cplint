import type { LintRule } from "../types.js";
import type { RulesConfig } from "../types.js";
import { noEmptyManualBlocks } from "./built-in/no-empty-manual-blocks.js";
import { noStaleContext } from "./built-in/no-stale-context.js";
import { preferExplicitRole } from "./built-in/prefer-explicit-role.js";

export type { RulesConfig };

const AVAILABLE_RULES: Record<string, LintRule> = {
  "no-empty-manual-blocks": noEmptyManualBlocks,
  "no-stale-context": noStaleContext,
  "prefer-explicit-role": preferExplicitRole,
};

/**
 * Resolves the active rule set strictly from the user's RulesConfig.
 * Only the rules explicitly defined and not set to "off" will run.
 */
export function resolveRules(rulesConfig?: RulesConfig): LintRule[] {
  if (!rulesConfig) {
    return [];
  }

  const activeRules: LintRule[] = [];

  for (const [name, severity] of Object.entries(rulesConfig)) {
    if (severity === "off") continue;

    const rule = AVAILABLE_RULES[name];
    if (!rule) {
      console.warn(`[CPLint] Unknown rule "${name}" in config — skipped.`);
      continue;
    }

    activeRules.push({
      ...rule,
      severity: severity as "error" | "warn",
    });
  }

  return activeRules;
}
