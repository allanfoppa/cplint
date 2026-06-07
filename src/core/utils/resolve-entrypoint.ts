import path from "node:path";

export function resolveEntrypoint(
  rootPath: string,
  entrypoint: string,
): string {
  return path.join(process.cwd(), rootPath, entrypoint);
}
