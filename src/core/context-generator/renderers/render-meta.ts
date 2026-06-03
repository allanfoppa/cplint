import type { SemanticContext } from "../../../core/types/index.js";

export function renderMeta(
  meta: SemanticContext["meta"],
  role: SemanticContext["role"],
): string {
  return [
    `role: ${role}`,
    `entry: ${meta.entry}`,
    `generated: ${meta.generated}`,
    "related:",
    ...(meta.related.length
      ? meta.related.map((x) => `  - ${x}`)
      : ["  - none"]),
  ].join("\n");
}
