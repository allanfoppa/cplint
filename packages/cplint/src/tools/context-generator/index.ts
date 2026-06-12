import path from "node:path";
import fs from "node:fs";
import fg from "fast-glob";
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
import { resolveAdapter } from "../../adapters-in/resolve-adapter.js";
import { resolveEntrypoint } from "../../core/utils/resolve-entrypoint.js";

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
    console.error(
      "❌ Provide --entrypoint <file> or use --all to scan rootPath.",
    );
    process.exit(1);
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

  // Collect all .ts/.tsx files under rootPath
  const pattern = `${normalizePath(config.rootPath)}/**/*.{js,jsx,ts,tsx}`;
  const files = fg.sync(pattern, {
    ignore: [
      ...exclude,
      "**/*.spec.js",
      "**/*.spec.ts",
      "**/*.test.js",
      "**/*.test.ts",
      "**/*.spec.tsx",
      "**/*.test.tsx",
      "**/*.spec.jsx",
      "**/*.test.jsx",
      "**/*.d.ts",
      "**/*.cplint.yaml", // never process the context files themselves
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
      `  Tip       : Add a known suffix (.service.ts, .util.ts, .hook.ts, .store.ts) `,
      // TODO: add more suffixes or make them configurable in cplint.config.js
      // `or configure custom classifiers in cplint.config.js.`,
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

  // ── Quick skip for test files in single entrypoint mode ───────────────────
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

  // Warn when classifier could not resolve the role
  if (context.role === "unknown") {
    console.warn(
      `⚠ [CPLint] role: unknown for "${normalizePath(entrypoint)}" — context may be inaccurate. ` +
        `Check the classifier or rename the file with a known suffix.`,
    );
  }

  const outputPath = getOutputPath(sourceFile.getFilePath(), config);
  const existing = fs.existsSync(outputPath)
    ? fs.readFileSync(outputPath, "utf8")
    : "";

  const manualBlocks = extractManualBlocks(existing);
  const nextDoc = renderDocument(context, config, manualBlocks, sourceFile);

  fs.writeFileSync(outputPath, nextDoc, "utf8");

  if (!_silent) {
    console.log(`✔ Wrote ${normalizePath(outputPath)}`);
  }

  return { role: context.role };
}

function createProject(tsconfig: string): Project {
  if (fs.existsSync(tsconfig)) {
    return new Project({
      tsConfigFilePath: tsconfig,
    });
  }

  return new Project({
    compilerOptions: {
      allowJs: true,
      checkJs: true,
    },
  });
}
