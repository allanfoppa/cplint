import type { LintRule } from "../types.js";
import type { RulesConfig } from "../types.js";
import { noEmptyManualBlocks } from "./built-in/no-empty-manual-blocks.js";
import { noEmptyPurpose } from "./built-in/no-empty-purpose.js";
import { noStaleContext } from "./built-in/no-stale-context.js";
import { preferExplicitRole } from "./built-in/prefer-explicit-role.js";

export type { RulesConfig };

const BUILT_IN: Record<string, LintRule> = {
  "no-empty-manual-blocks": noEmptyManualBlocks,
  "no-stale-context": noStaleContext,
  "prefer-explicit-role": preferExplicitRole,
};

const LEGACY: Record<string, LintRule> = {
  "no-empty-purpose": noEmptyPurpose,
};

/**
 * Resolves the active rule set from the user's RulesConfig.
 *
 * When no config is provided all built-in rules run at their default severity.
 * "off" disables a rule entirely.
 */
export function resolveRules(
  includeLegacy = false,
  rulesConfig?: RulesConfig,
): LintRule[] {
  const pool = includeLegacy ? { ...BUILT_IN, ...LEGACY } : { ...BUILT_IN };

  if (!rulesConfig) {
    return Object.values(pool);
  }

  return Object.entries(rulesConfig)
    .filter(([, level]) => level !== "off")
    .flatMap(([name, level]) => {
      const rule = pool[name];
      if (!rule) {
        console.warn(`[CPLint] Unknown rule "${name}" in config — skipped.`);
        return [];
      }
      return [{ ...rule, severity: level as "error" | "warn" }];
    });
}
