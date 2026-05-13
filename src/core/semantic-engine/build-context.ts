import fs from "node:fs";
import path from "node:path";
import { Project } from "ts-morph";
import type { SourceFile, TypeChecker } from "ts-morph";
import { Config, DEFAULT_CONFIG, SemanticContext } from "./types/index.js";
import { renderDocument } from "./renderers/render-document.js";
import { getOutputPath } from "./utils/get-output-path.js";
import { normalizePath } from "./utils/normalize-path.js";
import { extractRelatedContextFiles } from "./extractors/extract-related-context-files.js";
import { extractEntryPoints } from "./extractors/extract-entrypoints.js";
import { extractApiSurface } from "./extractors/extract-api-surface.js";
import { extractDeps } from "./extractors/extract-deps.js";
import { extractStateShape } from "./extractors/extract-state-shape.js";
import { extractCriticalFlow } from "./extractors/extract-critical-flow.js";
import { extractChangeChecklist } from "./extractors/extract-change-checlist.js";
import { extractManualBlocks } from "./extractors/extract-manual-blocks.js";

export async function semanticContextGenerator(entrypoint: string) {
  if (!entrypoint) {
    throw new Error("Usage: cplint context --entrypoint <entry-file>");
  }

  const config: Config = DEFAULT_CONFIG;

  const project = new Project({
    tsConfigFilePath: path.resolve(process.cwd(), config.tsConfigFilePath),
    skipAddingFilesFromTsConfig: false,
  });

  const sourceFile =
    project.getSourceFile(entrypoint) ||
    project.addSourceFileAtPathIfExists(entrypoint);

  if (!sourceFile) {
    throw new Error(`Source file not found: ${entrypoint}`);
  }

  const checker = project.getTypeChecker();

  const context = buildContext({
    sourceFile,
    checker,
    config,
  });

  const outputPath = getOutputPath(sourceFile.getFilePath(), config);

  const existing = fs.existsSync(outputPath)
    ? fs.readFileSync(outputPath, "utf8")
    : "";

  const manualBlocks = extractManualBlocks(existing);

  const nextDoc = renderDocument(context, config, manualBlocks, sourceFile);

  fs.writeFileSync(outputPath, nextDoc, "utf8");

  console.log(`Wrote ${normalizePath(outputPath)}`);
}

function buildContext({
  sourceFile,
  checker,
  config,
}: {
  sourceFile: SourceFile;
  checker: TypeChecker;
  config: Config;
}): SemanticContext {
  const exported = sourceFile.getExportedDeclarations();

  return {
    title: humanizeTitle(sourceFile),
    meta: {
      generated: new Date().toISOString().slice(0, 10),
      entry: normalizePath(sourceFile.getFilePath()),
      related: extractRelatedContextFiles(sourceFile, config),
    },
    entryPoints: extractEntryPoints(exported, sourceFile, config),
    apiSurface: extractApiSurface(exported, checker, config),
    deps: extractDeps(sourceFile, config),
    stateShape: extractStateShape(sourceFile, exported, checker, config),
    criticalFlow: extractCriticalFlow(exported, checker, config),
    changeChecklist: extractChangeChecklist(sourceFile, exported, config),
  };
}

function humanizeTitle(sourceFile: SourceFile): string {
  return sourceFile
    .getBaseNameWithoutExtension()
    .replace(/[._-]+/g, " ")
    .trim();
}
