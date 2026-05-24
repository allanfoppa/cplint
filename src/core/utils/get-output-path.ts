import path from "node:path";
import { Config } from "../types/index.js";

export function getOutputPath(filePath: string, config: Config): string {
  const parsed = path.parse(filePath);

  const fileName = config.outputFileName
    .replace("{name}", parsed.name + parsed.ext)
    .replace("{base}", parsed.name)
    .replace("{ext}", parsed.ext.replace(/^\./, ""));

  return path.join(parsed.dir, fileName);
}
