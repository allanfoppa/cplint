import path from "node:path";
import fs from "node:fs/promises";
import fg from "fast-glob";
import { SOURCE_EXTENSIONS } from "./constants.js";

export async function findFeatures(
  rootPaths: string[],
  ignore: string[],
): Promise<string[]> {
  const cwd = process.cwd();

  const directories = await fg(
    rootPaths.map((root) => path.join(cwd, root, "**")),
    {
      onlyDirectories: true,
      ignore,
    },
  );

  const features: string[] = [];

  for (const dir of directories) {
    const entries = await fs.readdir(dir, {
      withFileTypes: true,
    });

    const hasSourceFiles = entries.some(
      (entry) =>
        entry.isFile() &&
        SOURCE_EXTENSIONS.some((ext) => entry.name.endsWith(ext)),
    );

    const hasSubdirectories = entries.some((entry) => entry.isDirectory());

    if (hasSourceFiles && !hasSubdirectories) {
      features.push(dir);
    }
  }

  return features;
}
