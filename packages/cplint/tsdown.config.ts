import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/main.ts", "src/index.ts"],
  format: "esm",
  outDir: "dist",
  clean: true,
  fixedExtension: false,
  platform: "node",
  outputOptions: {
    codeSplitting: true,
  },
  sourcemap: true,
  dts: {
    sourcemap: true,
  },
  deps: {
    onlyBundle: false,
  },
});
