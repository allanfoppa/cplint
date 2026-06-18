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
  decisions: { severity: "error", required: true },
  constraints: { severity: "error", required: true },
  "known-pitfalls": { severity: "warn", required: false },
  "not-in-scope": { severity: "warn", required: false },
  "open-questions": { severity: "warn", required: false },
};

const PLACEHOLDER_PREFIXES = ["Required.", "Optional."];

function isBlankOrPlaceholder(value: string): boolean {
  if (!value || /^[\s\-]*$/.test(value.trim())) return true;
  const stripped = value.replace(/^-\s*/, "").trim();
  return PLACEHOLDER_PREFIXES.some((p) => stripped.startsWith(p));
}

export const noEmptyManualBlocks: LintRule = {
  name: "no-empty-manual-blocks",
  severity: "warn",

  run(file: LintFile, severity: LintSeverity): LintViolation[] {
    const violations: LintViolation[] = [];

    for (const [block, policy] of Object.entries(BLOCK_POLICIES)) {
      const value = file.manualBlocks[block];

      if (value === undefined) {
        if (policy.required) {
          violations.push({
            rule: "no-empty-manual-blocks",
            severity: policy.severity,
            file: file.path,
            block,
            message: `MANUAL block "${block}" is missing. It is mandatory for file context.`,
          });
        }
        continue;
      }

      if (isBlankOrPlaceholder(value)) {
        violations.push({
          rule: "no-empty-manual-blocks",
          severity: policy.severity,
          file: file.path,
          block,
          message: `MANUAL block "${block}" is empty. Fill it in or delete the key to save tokens if it doesn't apply.`,
        });
      }
    }

    return violations;
  },
};
