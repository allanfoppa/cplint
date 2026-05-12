import path from "node:path";

export function resolveTargetPath(target: string) {
  return path.resolve(process.cwd(), target);
}
