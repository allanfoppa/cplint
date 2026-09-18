import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const rootDir = resolve(__dirname, "..");
const srcDir = resolve(rootDir, "packages/cplint/src/core/analyze/report");
const distDir = resolve(rootDir, "packages/cplint/dist");

try {
  // 1. Make sure the dist directory exists
  mkdirSync(distDir, { recursive: true });

  // 2. Read the original files from src
  const htmlTemplate = readFileSync(
    resolve(srcDir, "report-template.html"),
    "utf-8",
  );
  const rawStyles = readFileSync(resolve(srcDir, "report-styles.css"), "utf-8");
  const rawScript = readFileSync(resolve(srcDir, "report-script.js"), "utf-8");

  // 3. Combine the HTML, CSS, and JS into a single file
  const htmlWithStyles = htmlTemplate.replace(
    "",
    `<style>${rawStyles}</style>`,
  );

  const singleFileTemplate = htmlWithStyles.replace(
    "",
    `<script>${rawScript}</script>`,
  );

  // 4. Save the final file in dist
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
