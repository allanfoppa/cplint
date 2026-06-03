export type LintSeverity = "error" | "warn";

export type LintViolation = {
  rule: string;
  severity: LintSeverity;
  file: string;
  message: string;
  /** Optional: which block or section triggered the violation */
  block?: string;
};

export type LintRule = {
  name: string;
  severity: LintSeverity;
  run(file: LintFile): LintViolation[];
};

/**
 * Parsed representation of a .context.ai.md file passed to each rule.
 */
export type LintFile = {
  /** Absolute path to the .context.ai.md file */
  path: string;
  /** Raw markdown content */
  content: string;
  /** All MANUAL block values keyed by block name */
  manualBlocks: Record<string, string>;
  /** All AUTO block values keyed by block name */
  autoBlocks: Record<string, string>;
};

/**
 * Maps rule names to their active severity level.
 * "off" disables the rule entirely.
 *
 * Example (cplint.config.ts):
 *   lint: {
 *     rules: {
 *       'no-empty-manual-blocks': 'error',
 *       'no-cross-feature-import': 'warn',
 *     }
 *   }
 */
export type RulesConfig = Record<string, LintSeverity | "off">;
