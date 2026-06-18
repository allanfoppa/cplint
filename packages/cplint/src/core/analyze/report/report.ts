import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export interface SourceFileCount {
  name: string;
  pkg: string;
  tokens: number;
}

export type ReportOptions = {
  results: SourceFileCount[];
  warnThreshold: number;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function generateHtmlReport({
  results,
  warnThreshold,
}: ReportOptions): string {
  const templatePath = resolve(__dirname, "report-template.html");

  try {
    const singleFileTemplate = readFileSync(templatePath, "utf-8");

    return singleFileTemplate
      .replace("__INITIAL_DATA__", JSON.stringify(results))
      .replace("__WARN_THRESHOLD__", warnThreshold.toString());
  } catch (error) {
    console.error(
      `❌ Error: Failed to load compiled report template at ${templatePath}`,
    );
    throw error;
  }
}
