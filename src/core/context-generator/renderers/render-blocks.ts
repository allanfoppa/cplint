export function renderBlock(name: string, content: string): string {
  const indentedContent = content
    .split("\n")
    .map((line) => (line.trim() === "" ? "" : `  ${line}`))
    .join("\n");

  return `${name}:\n${indentedContent}`;
}
