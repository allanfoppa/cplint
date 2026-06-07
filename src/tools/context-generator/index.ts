import path from "node:path";
import fs from "node:fs";
import { normalizePath } from "../../core/utils/normalize-path.js";
import { extractManualBlocks } from "../../core/context-generator/renderers/extract-manual-blocks.js";
import { loadConfig } from "../../config/load-config.js";
import {
  Config,
  CPLintAdapter,
  DEFAULT_CONFIG,
} from "../../core/types/index.js";
import { Project } from "ts-morph";
import { buildContext } from "../../core/context-generator/build-context.js";
import { getOutputPath } from "../../core/utils/get-output-path.js";
import { renderDocument } from "../../core/context-generator/renderers/render-document.js";
import { resolveAdapter } from "../../core/utils/resolve-adapter.js";
import { resolveEntrypoint } from "../../core/utils/resolve-entrypoint.js";

type GenerateContextOptions = {
  entrypoint: string[];
  diagrams?: boolean;
};

export async function contextGenerator(
  options: GenerateContextOptions,
): Promise<void> {
  const config = await loadConfig();
  const adapter = await resolveAdapter(config.adapter);

  const resolved = options.entrypoint.map((e) =>
    resolveEntrypoint(config.rootPath, e),
  );

  console.log(`\n🔌 Adapter: ${adapter.name}`);
  console.log(`📂 Entrypoints (${resolved.length}):\n`);

  for (const entrypoint of resolved) {
    await generate(entrypoint, adapter, {
      diagram: options.diagrams,
    });
  }
}

export async function generate(
  entrypoint: string,
  adapter: CPLintAdapter,
  configOverrides: Partial<Config> = {},
): Promise<void> {
  if (!entrypoint) {
    throw new Error("Usage: cplint generate-context --entrypoint <entry-file>");
  }

  const config: Config = { ...DEFAULT_CONFIG, ...configOverrides };

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
  const context = buildContext({ sourceFile, checker, config, adapter });

  const outputPath = getOutputPath(sourceFile.getFilePath(), config);
  const existing = fs.existsSync(outputPath)
    ? fs.readFileSync(outputPath, "utf8")
    : "";

  const manualBlocks = extractManualBlocks(existing);
  const nextDoc = renderDocument(context, config, manualBlocks, sourceFile);

  fs.writeFileSync(outputPath, nextDoc, "utf8");
  console.log(`✔ Wrote ${normalizePath(outputPath)}`);
}
