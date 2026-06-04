import YAML from "yaml";
import type { ManualBlocks } from "../../types/index.js";

/**
 * Extracts all MANUAL blocks from an existing .context.ai.yaml file.
 * Uses YAML.parse for correctness — handles multiline strings, quotes,
 * special characters, and all valid YAML the dev might write.
 */
export function extractManualBlocks(yamlContent: string): ManualBlocks {
  const blocks: ManualBlocks = {};

  try {
    const parsed = YAML.parse(yamlContent) as {
      manual?: Record<string, unknown>;
    };

    if (!parsed?.manual || typeof parsed.manual !== "object") return blocks;

    for (const [key, value] of Object.entries(parsed.manual)) {
      if (value === null || value === undefined) {
        blocks[key] = "-";
        continue;
      }

      if (Array.isArray(value)) {
        // Filter null/empty items that represent blank placeholders (- \n)
        const items = value.filter(
          (v) => v !== null && v !== undefined && v !== "",
        );
        blocks[key] = items.length
          ? items.map((v) => `- ${String(v)}`).join("\n")
          : "-";
        continue;
      }

      blocks[key] = String(value);
    }
  } catch {
    // Malformed YAML — return empty, lint rule will catch the issue
  }

  return blocks;
}
