/**
 * Renders the primary semantic summary.
 * Envelops the text in double quotes to keep it strictly on a single line
 * and avoid YAML multiline syntax breaking the document hierarchy.
 */
export function renderSummary(summary: string): string {
  if (!summary || summary.trim() === "") {
    return '""';
  }

  // Escape any existing double quotes inside the summary to maintain valid YAML
  const safeSummary = summary.replace(/"/g, '\\"');

  return `"${safeSummary}"`;
}
