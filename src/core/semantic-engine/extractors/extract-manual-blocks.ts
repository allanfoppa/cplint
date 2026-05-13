import { ManualBlocks } from "../types/index.js";

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
