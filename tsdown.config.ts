import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/main.ts"],
  format: "esm",
  outDir: "dist",
  clean: true,
  fixedExtension: false,
  platform: "node",
  outputOptions: {
    codeSplitting: false,
  },
  sourcemap: true,
  dts: {
    sourcemap: true,
  },
});
