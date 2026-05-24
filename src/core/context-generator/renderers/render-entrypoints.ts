import { EntryPoint } from "../../types/index.js";

export function renderEntryPoints(rows: EntryPoint[]): string {
  if (!rows.length) return "- none";

  return rows.map((row) => `- ${row.name}: ${row.kind}`).join("\n");
}
