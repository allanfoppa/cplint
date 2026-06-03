import type { ManualBlocks } from "../../types/index.js";

/**
 * Extracts all MANUAL blocks from an existing .context.ai.yaml file.
 * Parsed by matching top-level properties indented under the 'manual:' block scope.
 */
export function extractManualBlocks(yamlContent: string): ManualBlocks {
  const blocks: ManualBlocks = {};

  // Locates the start index of the manual partition block
  const manualSectionIndex = yamlContent.search(/^manual:\s*$/m);
  if (manualSectionIndex === -1) return blocks;

  // Isolates everything written below the 'manual:' key
  const manualZone = yamlContent.substring(manualSectionIndex);

  // Matches child keys (indented by 2 spaces) and grabs everything until the next key or file end
  const blockRegex = /^  ([a-z-]+):\s*\n((?:^    .*\n?)*)/gm;

  for (const match of manualZone.matchAll(blockRegex)) {
    const key = match[1];
    // Captures the block content and strips the baseline 4-space indentation used in the file layer
    const body = match[2]
      .split("\n")
      .map((line) => line.substring(4))
      .join("\n")
      .trimEnd();

    blocks[key] = body;
  }

  return blocks;
}
