import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/main.ts"],
  format: "esm",
  outDir: "dist",
  clean: true,
  fixedExtension: false, // Ensures output uses .js instead of .mjs

  // Enable JavaScript source maps (.js.map)
  sourcemap: true,

  // Enable Type Declaration source maps (.d.ts.map)
  dts: {
    sourcemap: true,
  },
});
