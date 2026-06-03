import type { Config } from "../../types/index.js";

export function renderCriticalFlow(rows: string[], config: Config): string {
  if (!rows.length) return "- none";

  if (!config.diagram) {
    return rows.map((row) => `- ${row}`).join("\n");
  }

  // Each row is expected to be a "A -> B -> C" string.
  // Build one mermaid node per unique step across all rows.
  const nodeIds = new Map<string, string>();
  let nodeCounter = 0;

  const getId = (label: string): string => {
    if (!nodeIds.has(label)) {
      nodeIds.set(label, `step${nodeCounter++}`);
    }
    return nodeIds.get(label)!;
  };

  const edges: string[] = [];

  for (const row of rows) {
    const steps = row
      .split(" -> ")
      .map((s) => s.trim())
      .filter(Boolean);
    for (let i = 0; i < steps.length - 1; i++) {
      const from = getId(steps[i]);
      const to = getId(steps[i + 1]);
      edges.push(`  ${from} --> ${to}`);
    }
  }

  const nodeDefs = Array.from(nodeIds.entries()).map(
    ([label, id]) => `  ${id}["${label}"]`,
  );

  // Note: the "## critical-flow" heading is rendered by render-document,
  // not here — this function returns only the block content.
  return ["```mermaid", "graph TD", ...nodeDefs, ...edges, "```"].join("\n");
}
