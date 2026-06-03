import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { CPLintAdapter } from "../core/types/index.js";
import type { RulesConfig } from "../core/linter/types.js";

export interface CPLintContextConfig {
  /** Root path to analyze (e.g. ['src/app/features'])
   * - The analyzer will recursively analyze all files under the specified paths.
   */
  rootPath: string[];

  /**
   * Glob patterns to exclude from analysis (e.g. ['**\/node_modules\/**', '**\/*.spec.ts'])
   */
  exclude?: string[];

  /**
   * Adapter to use for semantic analysis.
   * - String shorthand: 'angular' | 'react' | 'node'
   * - Object: any CPLintAdapter implementation
   * - Omit: defaults to 'node'
   */
  adapter?: string | CPLintAdapter;

  /**
   * Linter configuration.
   */
  lint?: {
    rules: RulesConfig;
  };
}

const CONFIG_FILES = [
  { name: "cplint.config.ts", type: "module" },
  { name: "cplint.config.mjs", type: "module" },
  { name: "cplint.config.js", type: "module" },
  { name: "cplint.config.cjs", type: "commonjs" },
  { name: "cplint.config.json", type: "json" },
] as const;

export async function loadConfig(): Promise<CPLintContextConfig> {
  const cwd = process.cwd();

  for (const { name, type } of CONFIG_FILES) {
    const filePath = resolve(cwd, name);
    if (!(await fileExists(filePath))) continue;

    try {
      if (type === "json") {
        const content = await readFile(filePath, "utf-8");
        return JSON.parse(content);
      }
      const mod = await import(pathToFileURL(filePath).href);
      return mod.default ?? mod;
    } catch (error) {
      throw new Error(
        `Failed to parse config file: ${name}. ${error instanceof Error ? error.message : ""}`,
      );
    }
  }

  handleConfigNotFound(cwd);
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function handleConfigNotFound(cwd: string): never {
  console.error(`
  ❌ CPLint config not found

  👉 Expected: cplint.config.ts, .js, .mjs, .cjs or .json
  📍 Location: ${cwd}

  💡 Example (cplint.config.ts):

    export default {
      rootPath: ['src/app/features'],
      adapter: 'angular',
      lint: {
        rules: {
          'no-cross-feature-import': 'error',
        }
      }
    }
  `);
  process.exit(1);
}
