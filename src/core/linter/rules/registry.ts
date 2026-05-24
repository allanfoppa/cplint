import type { Rule, Severity } from "../types.js";
import { noCrossFeatureImport } from "./built-in/architecture/no-cross-feature-import.js";

// ─── Rule Config ─────────────────────────────────────────────────────────────

export type RuleConfig =
  | "error"
  | "warn"
  | "info"
  | "off"
  | [Severity, Record<string, unknown>];

export type RulesConfig = Record<string, RuleConfig>;

// ─── Built-in Rules ──────────────────────────────────────────────────────────

const BUILT_IN_RULES: Record<string, Rule> = {
  "no-cross-feature-import": noCrossFeatureImport,
  // Future rules registered here:
  // "max-shared-dependencies": maxSharedDependencies,
  // "max-dependency-fan-out": maxDependencyFanOut,
  // "no-barrel-reexport-chains": noBarrelReexportChains,
  // "max-file-cognitive-load": maxFileCognitiveLoad,
  // "prefer-colocated-types": preferColocatedTypes,
};

// ─── Registry ────────────────────────────────────────────────────────────────

export interface ResolvedRule {
  rule: Rule;
  severity: Severity;
  options: Record<string, unknown>;
}

/**
 * Resolves the active rules from the user config.
 * Merges user-configured severity/options with built-in defaults.
 */
export function resolveRules(rulesConfig: RulesConfig): ResolvedRule[] {
  const resolved: ResolvedRule[] = [];

  for (const [ruleId, ruleConfig] of Object.entries(rulesConfig)) {
    if (ruleConfig === "off") continue;

    const rule = BUILT_IN_RULES[ruleId];
    if (!rule) {
      console.warn(`⚠️  Unknown rule "${ruleId}" — skipping.`);
      continue;
    }

    if (typeof ruleConfig === "string") {
      resolved.push({ rule, severity: ruleConfig, options: {} });
      continue;
    }

    const [severity, options] = ruleConfig;
    resolved.push({ rule, severity, options });
  }

  return resolved;
}

/**
 * Returns all built-in rule ids — useful for --list-rules CLI flag.
 */
export function listBuiltInRules(): string[] {
  return Object.keys(BUILT_IN_RULES);
}
