export function renderCriticalFlow(rows: string[], config: any): string {
  if (!rows.length) return "- none";

  if (!config.diagrams) {
    return rows.map((row) => `- ${row}`).join("\n");
  }

  // Transforma "A -> B -> C" em um fluxograma Mermaid
  const mermaidSteps = rows[0]
    .split(" -> ")
    .map((step, index) => `step${index}["${step}"]`)
    .join(" --> ");

  return [
    `## critical-flow`,
    "\`\`\`mermaid",
    "graph TD",
    `${mermaidSteps}`,
    "\`\`\`",
  ].join("\n");
}
