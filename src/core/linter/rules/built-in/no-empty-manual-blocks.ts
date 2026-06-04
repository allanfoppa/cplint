import type {
  LintFile,
  LintRule,
  LintViolation,
  LintSeverity,
} from "../../types.js";

type BlockPolicy = {
  severity: "error" | "warn";
  required: boolean;
};

const BLOCK_POLICIES: Record<string, BlockPolicy> = {
  purpose: { severity: "error", required: true },
  decisions: { severity: "warn", required: false },
  constraints: { severity: "warn", required: false },
  "known-pitfalls": { severity: "warn", required: false },
  "not-in-scope": { severity: "warn", required: false },
  "open-questions": { severity: "warn", required: false },
};

function isBlank(value: string): boolean {
  return !value || /^[\s\-]*$/.test(value.trim());
}

export const noEmptyManualBlocks: LintRule = {
  name: "no-empty-manual-blocks",
  severity: "warn",

  run(file: LintFile, severity: LintSeverity): LintViolation[] {
    const violations: LintViolation[] = [];

    for (const [block, policy] of Object.entries(BLOCK_POLICIES)) {
      const value = file.manualBlocks[block];

      // Scenario: Not in context (undefined)
      if (value === undefined) {
        // Not in context and required? warn/error
        if (policy.required) {
          violations.push({
            rule: "no-empty-manual-blocks",
            severity: policy.severity,
            file: file.path,
            block,
            message: `MANUAL block "${block}" is missing. It is mandatory for file context.`,
          });
        }
        // Not in context and not required? ok (skip directly)
        continue;
      }

      // Scenario: Is in context (value exists)
      if (isBlank(value)) {
        // Is in context and empty? warn/error
        violations.push({
          rule: "no-empty-manual-blocks",
          severity: policy.severity,
          file: file.path,
          block,
          message: `MANUAL block "${block}" is empty. Fill it in or delete the key to save tokens if it doesn't apply.`,
        });
      }

      // Is in context and filled? ok (falls through, continues the loop)
    }

    return violations;
  },
};
