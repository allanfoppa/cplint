import { SourceFile } from "ts-morph";

export function humanizeTitle(sourceFile: SourceFile): string {
  return sourceFile
    .getBaseNameWithoutExtension()
    .replace(/[._-]+/g, " ")
    .trim();
}
