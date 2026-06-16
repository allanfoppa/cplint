import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const rootDir = resolve(__dirname, "..");
const srcDir = resolve(
  rootDir,
  "packages/cplint/src/core/token-counter/report",
);
const distDir = resolve(rootDir, "packages/cplint/dist");

try {
  // 1. Garantir que a pasta de destino exista no dist
  mkdirSync(distDir, { recursive: true });

  // 2. Ler os arquivos originais da src
  const htmlTemplate = readFileSync(
    resolve(srcDir, "report-template.html"),
    "utf-8",
  );
  const rawStyles = readFileSync(resolve(srcDir, "report-styles.css"), "utf-8");
  const rawScript = readFileSync(resolve(srcDir, "report-script.js"), "utf-8");

  // 3. Unificar os assets injetando CSS e JS nas tags correspondentes
  const htmlWithStyles = htmlTemplate.replace(
    "",
    `<style>${rawStyles}</style>`,
  );

  const singleFileTemplate = htmlWithStyles.replace(
    "",
    `<script>${rawScript}</script>`,
  );

  // 4. Salvar o arquivo final unificado na dist
  writeFileSync(
    resolve(distDir, "report-template.html"),
    singleFileTemplate,
    "utf-8",
  );

  console.log(
    "✔ Global report template compiled into single file inside dist/ successfully.",
  );
} catch (error) {
  console.error("❌ Failed to compile asset templates during build:", error);
  process.exit(1);
}
