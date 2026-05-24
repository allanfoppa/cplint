import path from "node:path";

const repoRoot = process.cwd();

export function normalizePath(filePath: string): string {
  return path.relative(repoRoot, filePath).split(path.sep).join("/");
}
