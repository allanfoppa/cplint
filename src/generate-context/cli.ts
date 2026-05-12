import { Command } from "commander";
import { loadConfig } from "../load-config/load-config.js";
import { findFeatures } from "./find-features.js";
import { resolveTargetPath } from "./resolve-target-path.js";
import { validateFeaturePath } from "./validate-feature-path.js";

export const generateCommand = new Command("generate");

generateCommand
  .argument("[target]")

  .action(async (target?: string) => {
    const config = await loadConfig();

    if (target) {
      const resolvedTarget = resolveTargetPath(target);

      const isValid = await validateFeaturePath(resolvedTarget);

      if (!isValid) {
        console.error("Invalid feature path");

        process.exit(1);
      }

      console.log("Generating context for:\n");

      console.log(resolvedTarget);

      return;
    }

    const features = await findFeatures(config.rootPath, config.exclude || []);

    console.log("\nDiscovered features:\n");

    for (const feature of features) {
      console.log(feature);
    }
  });
