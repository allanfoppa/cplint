import type { SemanticContext } from "../../types/index.js";

export function renderMeta(
  meta: SemanticContext["meta"],
  role: SemanticContext["role"],
): string {
  const relatedFiles = meta.related.length
    ? meta.related.map((x) => `  - ${x}`).join("\n")
    : "  - none";

  return [
    `role: ${role}`,
    `entry: ${meta.entry}`,
    `generated: ${meta.generated}`,
    "related:",
    relatedFiles,
  ].join("\n");
}
