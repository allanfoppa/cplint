import { Project } from "ts-morph";
import fg from "fast-glob";

import type { FeatureContext, FileContext } from "./types.js";

export async function parseFeature(
  featurePath: string,
): Promise<FeatureContext> {
  const project = new Project();

  const files = await fg(`${featurePath}/**/*.ts`);

  const contexts: FileContext[] = [];

  for (const file of files) {
    const sourceFile = project.addSourceFileAtPath(file);

    const imports = sourceFile
      .getImportDeclarations()
      .map((i) => i.getModuleSpecifierValue());

    const classes = sourceFile
      .getClasses()
      .map((c) => c.getName() || "AnonymousClass");

    const methods = sourceFile
      .getFunctions()
      .map((f) => f.getName() || "anonymous");

    contexts.push({
      path: file,
      imports,
      classes,
      methods,
    });
  }

  return {
    name: featurePath.split("/").pop() || "unknown",
    files: contexts,
  };
}
