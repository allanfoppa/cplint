import { SemanticContext } from "../../../core/types/index.js";

export function renderMeta(meta: SemanticContext["meta"]): string {
  return [
    `generated: ${meta.generated}`,
    `entry: ${meta.entry}`,
    "related:",

    ...(meta.related.length
      ? meta.related.map((x) => `  - ${x}`)
      : ["  - none"]),
  ].join("\n");
}
