import type { SourceFile } from "ts-morph";
import type {
  Config,
  ManualBlocks,
  ManualDefaults,
  SemanticContext,
} from "../../types/index.js";
import { renderMeta } from "./render-meta.js";
import { renderEntryPoints } from "./render-entrypoints.js";
import { renderApiSurface } from "./render-api-surface.js";
import { renderDeps } from "./render-deps.js";
import { renderCriticalFlow } from "./render-critical-flow.js";
import { renderChecklist } from "./render-checklist.js";
import { renderAutoBlock, renderManualBlock } from "./render-blocks.js";
import { renderStateShape } from "./render-state-shape.js";
import { renderSummary } from "./render-summary.js";

export function renderDocument(
  context: SemanticContext,
  config: Config,
  manualBlocks: ManualBlocks,
  _sourceFile: SourceFile,
): string {
  const manual = {
    ...config.manualDefaults,
    ...manualBlocks,
  };

  // 1. Build the auto-generated section items
  const autoSections: string[] = [
    renderAutoBlock("meta", renderMeta(context.meta, context.role)),
    `summary: ${renderSummary(context.summary)}`,
    renderAutoBlock(
      "entry-points",
      renderEntryPoints(context.entryPoints) || "- none",
    ),
    renderAutoBlock("api-surface", renderApiSurface(context.apiSurface)),
    renderAutoBlock("deps", renderDeps(context.deps)),
    ...(context.stateShape.length
      ? [renderAutoBlock("state-shape", renderStateShape(context.stateShape))]
      : []),
    ...(context.criticalFlow.length
      ? [
          renderAutoBlock(
            "critical-flow",
            renderCriticalFlow(context.criticalFlow),
          ),
        ]
      : []),
    renderAutoBlock(
      "change-checklist",
      renderChecklist(context.changeChecklist),
    ),
  ];

  // 2. Build ALL manual section items (Always emit them so the dev can fill them)
  const manualKeys: (keyof ManualDefaults)[] = [
    "purpose",
    "decisions",
    "constraints",
    "known-pitfalls",
    "not-in-scope",
    "open-questions",
  ];

  const manualSections: string[] = [];

  for (const key of manualKeys) {
    const content = manual[key] ?? "- ";
    manualSections.push(renderManualBlock(key, content));
  }

  function indentBlock(content: string, spaces = 2): string {
    const prefix = " ".repeat(spaces);

    return content
      .split("\n")
      .map((line) => (line ? prefix + line : line))
      .join("\n");
  }

  // 3. Assemble the final YAML structure with proper indentation
  const sections: string[] = [
    "# cplint-config: edit-only-manual-blocks",
    "",
    "manual:",
    ...manualSections.map((block) => indentBlock(block, 2)),
    "",
    "auto:",
    ...autoSections.map((block) => indentBlock(block, 2)),
  ];

  return sections
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trimEnd()
    .concat("\n");
}
