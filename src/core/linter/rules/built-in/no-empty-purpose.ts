/**
 * @deprecated Use `no-empty-manual-blocks` instead — it covers all MANUAL
 * blocks, not just `purpose`. This file is kept for backwards compatibility
 * and re-exports the relevant violation from the general rule.
 */
import type { LintFile, LintRule, LintViolation } from "../../types.js";
import { noEmptyManualBlocks } from "./no-empty-manual-blocks.js";

export const noEmptyPurpose: LintRule = {
  name: "no-empty-purpose",
  severity: "error",

  run(file: LintFile): LintViolation[] {
    return noEmptyManualBlocks
      .run(file)
      .filter((v) => v.block === "purpose")
      .map((v) => ({ ...v, rule: "no-empty-purpose" }));
  },
};
