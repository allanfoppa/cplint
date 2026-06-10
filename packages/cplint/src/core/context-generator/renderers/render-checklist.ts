export function renderChecklist(rows: string[]): string {
  if (!rows.length) return "none";
  return rows.map((row) => `- "${row.replace(/"/g, "'")}"`).join("\n");
}
