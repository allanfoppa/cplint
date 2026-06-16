import { writeFileSync } from "node:fs";
import { resolve, relative } from "node:path";
import fg from "fast-glob";
import { countTokens } from "../../core/token-counter/index.js";
import { generateHtmlReport } from "../../core/token-counter/report/report.js";
import { loadConfig } from "../../config/load-config.js";
import { normalizePath } from "../../core/utils/normalize-path.js";

export type TokenCounterOptions = {
  warn?: string;
};

export interface SourceFileCount {
  name: string;
  pkg: string;
  tokens: number;
}

export async function runTokenCounter(
  options: TokenCounterOptions = {},
): Promise<void> {
  const warnThreshold = parseInt(options.warn ?? "2000", 10);

  const config = await loadConfig();
  const rootPath = normalizePath(config.rootPath);
  const exclude = config.exclude ?? ["node_modules", "dist", ".git"];

  // Scan only active source files under the project's root path
  const sourceFiles = await fg(`${rootPath}/**/*.{js,jsx,ts,tsx}`, {
    ignore: [...exclude, "**/*.{spec,test}.*", "**/*.d.ts"],
    absolute: true,
  });

  if (sourceFiles.length === 0) {
    console.error(
      "⚠ No source files found to analyze under the current configuration limits.",
    );
    return;
  }

  const results: SourceFileCount[] = sourceFiles.map((filePath) => {
    const fileCount = countTokens(filePath);
    const relPath = relative(process.cwd(), filePath);
    const parts = relPath.split("/");

    return {
      name: parts.at(-1) ?? relPath,
      pkg: parts.slice(0, -1).join("/") || ".",
      tokens: fileCount.tokens,
    };
  });

  const html = generateHtmlReport({
    results,
    warnThreshold,
  });

  const outPath = resolve(process.cwd(), "cplint-budget.html");
  writeFileSync(outPath, html, "utf-8");

  console.log(
    `\n✔ Source Code Token Report saved to: ${normalizePath(outPath)}`,
  );
}
