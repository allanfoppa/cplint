import fs from "node:fs/promises";
import { SOURCE_EXTENSIONS } from "./constants.js";

export async function validateFeaturePath(featurePath: string) {
  const entries = await fs.readdir(featurePath, {
    withFileTypes: true,
  });

  return entries.some(
    (entry) =>
      entry.isFile() &&
      SOURCE_EXTENSIONS.some((ext) => entry.name.endsWith(ext)),
  );
}
