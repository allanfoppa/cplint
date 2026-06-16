import path from "node:path";
import fs from "node:fs";
import fg from "fast-glob";
import { normalizePath } from "../../core/utils/normalize-path.js";
import { loadConfig } from "../../config/load-config.js";
import {
  Config,
  CPLintAdapter,
  DEFAULT_CONFIG,
} from "../../core/types/index.js";
import { buildContext } from "../../core/generator/build-context.js";
import { getOutputPath } from "../../core/utils/get-output-path.js";
import { resolveAdapter } from "../../adapters-in/resolve-adapter.js";
import { resolveEntrypoint } from "../../core/utils/resolve-entrypoint.js";
import { exitWithError } from "../../core/utils/errors.js";
import { createProject } from "../../core/utils/create-project.js";
import { interleaveYaml } from "../../core/utils/interleave-yaml.js";

type GenerateContextOptions = {
  entrypoint?: string[];
  all?: boolean;
};

type BatchResult = {
  generated: string[];
  skipped: string[]; // role: unknown
  failed: { file: string; error: string }[];
};

export async function contextGenerator(
  options: GenerateContextOptions,
): Promise<void> {
  const config = await loadConfig();
  const adapter = await resolveAdapter(config.adapter);

  console.log(`\n🔌 Adapter: ${adapter.name}`);

  // ── Batch mode: --all ────────────────────────────────────────────────────
  if (options.all) {
    await generateAll(adapter, config, options);
    return;
  }

  // ── Single / multi entrypoint mode ───────────────────────────────────────
  if (!options.entrypoint?.length) {
    exitWithError("NO_PROVIDED_ENTRYPOINT");
  }

  const resolved = options.entrypoint.map((e) =>
    resolveEntrypoint(config.rootPath, e),
  );

  console.log(`📂 Entrypoints (${resolved.length}):\n`);

  for (const entrypoint of resolved) {
    await generate(entrypoint, adapter, { _silent: true });
  }
}

async function generateAll(
  adapter: CPLintAdapter,
  config: Awaited<ReturnType<typeof loadConfig>>,
  options: GenerateContextOptions,
): Promise<void> {
  const exclude = config.exclude ?? ["node_modules", "dist", ".git"];
  const pattern = `${normalizePath(config.rootPath)}/**/*.{js,jsx,ts,tsx}`;
  const files = fg.sync(pattern, {
    ignore: [
      ...exclude,
      "**/*.{spec,test}.{js,jsx,ts,tsx}",
      "**/*.d.ts",
      "**/*.cplint.yaml",
    ],
  });

  if (!files.length) {
    console.log(
      `⚠ No Javascript or TypeScript files found under "${config.rootPath}".`,
    );
    return;
  }

  console.log(`📂 Found ${files.length} file(s) under "${config.rootPath}".\n`);

  const result: BatchResult = { generated: [], skipped: [], failed: [] };
  const startTime = Date.now();

  for (const file of files) {
    try {
      const context = await generate(file, adapter, {
        _silent: true, // suppress per-file ✔ log in batch mode
      });

      if (context?.role === "unknown") {
        result.skipped.push(file);
        console.log(`⚠ Skipped (unknown role): ${normalizePath(file)}`);
      } else {
        result.generated.push(file);
        console.log(`✔ ${normalizePath(file)}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      result.failed.push({ file, error: message });
      console.log(`✖ Failed: ${normalizePath(file)}`);
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`\n${"─".repeat(50)}`);
  console.log(`✔ Generated : ${result.generated.length} file(s)`);

  if (result.skipped.length) {
    console.log(
      `⚠ Skipped   : ${result.skipped.length} file(s) — role: unknown`,
    );
    console.log(
      `  Tip       : Add a known suffix (.service.ts, .util.ts, .hook.ts, .store.ts) or add an issue.`,
    );
  }

  if (result.failed.length) {
    console.log(`✖ Failed    : ${result.failed.length} file(s)`);
    for (const { file, error } of result.failed) {
      console.log(`  • ${normalizePath(file)}: ${error}`);
    }
  }

  console.log(`⏱ Time      : ${elapsed}s`);
}
export async function generate(
  entrypoint: string,
  adapter: CPLintAdapter,
  configOverrides: Partial<Config> & { _silent?: boolean } = {},
): Promise<{ role: string } | undefined> {
  if (!entrypoint) {
    throw new Error("Usage: cplint generate --entrypoint <entry-file>");
  }

  const isTestFile = /\.(spec|test)\.[a-z]+$/.test(entrypoint.toLowerCase());
  if (isTestFile) {
    throw new Error(
      `ℹ Skipped: "${normalizePath(entrypoint)}" is a test file.`,
    );
  }

  const { _silent, ...rest } = configOverrides;
  const config: Config = { ...DEFAULT_CONFIG, ...rest };

  const tsConfigPath = path.resolve(process.cwd(), config.tsConfigFilePath);
  const project = createProject(tsConfigPath);

  const sourceFile =
    project.getSourceFile(entrypoint) ||
    project.addSourceFileAtPathIfExists(entrypoint);

  if (!sourceFile) {
    throw new Error(`Source file not found: ${entrypoint}`);
  }

  const checker = project.getTypeChecker();
  const context = buildContext({ sourceFile, checker, config, adapter });

  const outputPath = getOutputPath(sourceFile.getFilePath(), config);

  // Recupera o conteúdo antigo nativamente se ele já existir
  const existingYaml = fs.existsSync(outputPath)
    ? fs.readFileSync(outputPath, "utf8")
    : "";

  // Renderiza o esqueleto automático injetando o conteúdo manual pré-existente
  const finalYaml = interleaveYaml(
    context,
    existingYaml,
    config.manualDefaults,
  );

  fs.writeFileSync(outputPath, finalYaml, "utf8");

  if (!_silent) {
    console.log(`✔ Wrote ${normalizePath(outputPath)}`);
  }

  return { role: context.role };
}
