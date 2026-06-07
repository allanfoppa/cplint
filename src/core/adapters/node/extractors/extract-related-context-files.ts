import path from "node:path";
import fs from "node:fs";
import type { SourceFile } from "ts-morph";
import type { Config } from "../../../types/index.js";
import { normalizePath } from "../../../utils/normalize-path.js";

export function extractRelatedContextFiles(
  file: SourceFile,
  config: Config,
): string[] {
  const related: string[] = [];
  const dir = path.dirname(file.getFilePath());

  for (const importDecl of file.getImportDeclarations()) {
    const module = importDecl.getModuleSpecifierValue();
    if (!module.startsWith(".")) continue;

    const resolved = path.resolve(dir, module);
    const candidates = [
      `${resolved}.cplint.yaml`,
      `${resolved}/index.cplint.yaml`,
    ];

    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        related.push(normalizePath(candidate));
        break;
      }
    }

    if (related.length >= config.maxReferenceFiles) break;
  }

  return related;
}
