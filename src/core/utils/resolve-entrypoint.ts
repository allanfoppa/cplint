import path from "node:path";

export function resolveEntrypoint(
  rootPaths: string[],
  entrypoint: string,
): string {
  const cwd = process.cwd();
  const root = rootPaths[0];
  return path.join(cwd, root, entrypoint);
}
