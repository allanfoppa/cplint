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
  // O tsdown + script de build garante que o template unificado estático
  // já foi compilado para a dist com o nome correto.
  const templatePath = resolve(__dirname, "report-template.html");

  try {
    const singleFileTemplate = readFileSync(templatePath, "utf-8");

    // Injeta apenas os payloads de dados gerados no scan atual
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
