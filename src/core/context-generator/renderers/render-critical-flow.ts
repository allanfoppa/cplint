export function renderCriticalFlow(rows: string[]): string {
  if (!rows.length) return "none";

  // Linear flow outputs directly to safe strings inside YAML lists
  return rows
    .map((row) => {
      const cleanRow = row.replace(/"/g, "'");
      return `- "${cleanRow}"`;
    })
    .join("\n");
}
