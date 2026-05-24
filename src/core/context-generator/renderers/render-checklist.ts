export function renderChecklist(rows: string[]): string {
  if (!rows.length) return "- none";

  return rows.map((row) => `- ${row}`).join("\n");
}
