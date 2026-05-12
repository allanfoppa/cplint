import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export interface CPLintContextConfig {
  rootPath: string[];
  exclude?: string[];
}

export async function loadConfig(): Promise<CPLintContextConfig> {
  const cwd = process.cwd();
  const configFiles = [
    { name: "cplint.config.ts", type: "module" },
    { name: "cplint.config.mjs", type: "module" },
    { name: "cplint.config.js", type: "module" },
    { name: "cplint.config.cjs", type: "commonjs" },
    { name: "cplint.config.json", type: "json" },
  ];

  for (const { name, type } of configFiles) {
    const filePath = resolve(cwd, name);

    if (!(await fileExists(filePath))) continue;

    try {
      if (type === "json") {
        const content = await readFile(filePath, "utf-8");
        return JSON.parse(content);
      }

      // Dynamic import handles both ESM and CJS
      const module = await import(pathToFileURL(filePath).href);

      // If the file uses module.exports (CJS), it will be under module.default
      // If it's ESM with export default, it's also under module.default
      return module.default || module;
    } catch (error) {
      throw new Error(
        `Failed to parse config file: ${name}. ${error instanceof Error ? error.message : ""}`,
      );
    }
  }

  handleConfigNotFound(cwd);
}

/**
 * Check if file exists using promises
 */
async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Handle missing configuration error
 */
function handleConfigNotFound(cwd: string): never {
  const message = `
    ❌ CPLint config not found

    👉 Expected: cplint.config.ts, .js, .mjs, .cjs or .json
    📍 Location: ${cwd}

    💡 Example (cplint.config.js):
    export default {
      rootPath: ['src/features']
    }
  `;

  console.error(message);
  process.exit(1);
}
