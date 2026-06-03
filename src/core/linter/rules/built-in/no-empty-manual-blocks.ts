import type { LintFile, LintRule, LintViolation } from "../../types.js";

/**
 * Flags any MANUAL block whose content is blank or only contains the
 * default placeholder ("- ").
 *
 * Each block has its own severity so teams can decide which ones are
 * mandatory (error) vs optional (warn).
 */

type BlockPolicy = {
  severity: "error" | "warn";
};

const BLOCK_POLICIES: Record<string, BlockPolicy> = {
  purpose: { severity: "error" },
  decisions: { severity: "warn" },
  constraints: { severity: "warn" },
  "known-pitfalls": { severity: "warn" },
  "not-in-scope": { severity: "warn" },
  "open-questions": { severity: "warn" },
};

function isBlank(value: string): boolean {
  return !value || /^[\s\-]*$/.test(value.trim());
}

export const noEmptyManualBlocks: LintRule = {
  name: "no-empty-manual-blocks",
  severity: "warn", // overall rule severity; per-block overrides apply below

  run(file: LintFile): LintViolation[] {
    const violations: LintViolation[] = [];

    for (const [block, policy] of Object.entries(BLOCK_POLICIES)) {
      const value = file.manualBlocks[block];

      if (value === undefined) {
        violations.push({
          rule: "no-empty-manual-blocks",
          severity: policy.severity,
          file: file.path,
          block,
          message: `MANUAL block "${block}" is missing. Re-run context-generate to restore it.`,
        });
        continue;
      }

      if (isBlank(value)) {
        violations.push({
          rule: "no-empty-manual-blocks",
          severity: policy.severity,
          file: file.path,
          block,
          message: `MANUAL block "${block}" is empty. Fill it in or document why it does not apply.`,
        });
      }
    }

    return violations;
  },
};
