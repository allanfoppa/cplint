import path from "node:path";

import { loadConfig } from "../../config/load-config.js";

type GenerateContextOptions = {
  entrypoint: string[];
};

export async function generateContext(options: GenerateContextOptions) {
  const config = await loadConfig();

  const resolvedEntrypoints = options.entrypoint.map((entrypoint) =>
    resolveEntrypoint(config.rootPath, entrypoint),
  );

  console.log("\nEntrypoints:\n");

  for (const entrypoint of resolvedEntrypoints) {
    // TODO: Implement actual context generation logic here
    console.log(entrypoint);
  }
}

function resolveEntrypoint(rootPaths: string[], entrypoint: string) {
  const cwd = process.cwd();

  const root = rootPaths[0];

  return path.join(cwd, root, entrypoint);
}
