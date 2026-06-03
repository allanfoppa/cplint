export function renderAutoBlock(name: string, content: string): string {
  // Ajusta o conteúdo interno para ficar indentado +2 espaços para dentro da chave filha
  const indentedContent = content
    .split("\n")
    .map((line) => (line.trim() === "" ? "" : `  ${line}`))
    .join("\n");

  return `${name}:\n${indentedContent}`;
}

export function renderManualBlock(name: string, content: string): string {
  const indentedContent = content
    .split("\n")
    .map((line) => (line.trim() === "" ? "" : `  ${line}`))
    .join("\n");

  return `${name}:\n${indentedContent}`;
}
