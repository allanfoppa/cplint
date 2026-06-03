import type { Config } from "../../types/index.js";

export function renderCriticalFlow(rows: string[], config: Config): string {
  if (!rows.length) return "- none";

  if (!config.diagram) {
    return rows.map((row) => `- ${row}`).join("\n");
  }

  // Each row is a "A -> B -> C" flow (one per method or function).
  // Nodes are scoped per-row with a row prefix to prevent cross-row
  // label collisions (e.g. `lastValueFrom` appearing in multiple methods
  // would create a shared hub node with incorrect cross-method edges).
  const nodeDefs: string[] = [];
  const edges: string[] = [];
  let globalCounter = 0;

  for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
    const steps = rows[rowIdx]
      .split(" -> ")
      .map((s) => s.trim())
      .filter(Boolean);

    if (steps.length < 2) continue;

    // Each step in this row gets its own unique node id
    const rowNodeIds: string[] = [];
    for (const label of steps) {
      const id = `step${globalCounter++}`;
      rowNodeIds.push(id);
      // Escape double quotes inside labels
      const safeLabel = label.replace(/"/g, "'");
      nodeDefs.push(`  ${id}["${safeLabel}"]`);
    }

    for (let i = 0; i < rowNodeIds.length - 1; i++) {
      edges.push(`  ${rowNodeIds[i]} --> ${rowNodeIds[i + 1]}`);
    }
  }

  if (!nodeDefs.length) return "- none";

  return ["```mermaid", "graph TD", ...nodeDefs, ...edges, "```"].join("\n");
}
