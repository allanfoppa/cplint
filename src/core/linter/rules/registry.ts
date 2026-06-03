import type { LintRule } from "../types.js";
import type { RulesConfig } from "../types.js";
import { noEmptyManualBlocks } from "./built-in/no-empty-manual-blocks.js";
import { noEmptyPurpose } from "./built-in/no-empty-purpose.js";
import { noCrossFeatureImport } from "./built-in/no-cross-feature-import.js";

const BUILT_IN: Record<string, LintRule> = {
  "no-empty-manual-blocks": noEmptyManualBlocks,
  "no-cross-feature-import": noCrossFeatureImport,
};

const LEGACY: Record<string, LintRule> = {
  "no-empty-purpose": noEmptyPurpose,
};

/**
 * Resolves the active rule set from the user's RulesConfig.
 *
 * RulesConfig maps rule names to "error" | "warn" | "off".
 * When no config is provided all built-in rules run at their default severity.
 *
 * @param includeLegacy - also expose deprecated rule aliases
 * @param rulesConfig   - user config from cplint.config.ts `lint.rules`
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
      // Override severity from config
      return [{ ...rule, severity: level as "error" | "warn" }];
    });
}
