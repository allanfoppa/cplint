export function shortType(text: string): string {
  const compact = text.replace(/\s+/g, " ").trim();

  return compact.length > 140 ? compact.slice(0, 137) + "..." : compact;
}
