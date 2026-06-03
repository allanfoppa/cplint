export function renderAutoBlock(name: string, content: string): string {
  return [
    `<!-- AUTO:START ${name} -->`,
    content,
    `<!-- AUTO:END ${name} -->`,
  ].join("\n");
}

export function renderManualBlock(name: string, content: string): string {
  return [
    `<!-- MANUAL:START ${name} -->`,
    content,
    `<!-- MANUAL:END ${name} -->`,
  ].join("\n");
}
