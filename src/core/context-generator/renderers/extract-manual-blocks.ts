import type { ManualBlocks } from "../../types/index.js";

/**
 * Extracts all MANUAL blocks from an existing .context.ai.md file.
 * AUTO blocks are intentionally ignored — they are always regenerated.
 *
 * The regex captures the block key and its trimmed content, preserving
 * any developer-written text between the START/END markers.
 */
export function extractManualBlocks(markdown: string): ManualBlocks {
  const blocks: ManualBlocks = {};

  const regex =
    /<!-- MANUAL:START ([a-z-]+) -->([\s\S]*?)<!-- MANUAL:END \1 -->/g;

  for (const match of markdown.matchAll(regex)) {
    const key = match[1];
    const body = match[2].replace(/^\n/, "").replace(/\n\s*$/, "");
    blocks[key] = body;
  }

  return blocks;
}
