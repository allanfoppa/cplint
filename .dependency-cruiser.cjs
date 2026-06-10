module.exports = {
  forbidden: [
    {
      name: "core-cannot-import-adapters",
      severity: "error",
      comment:
        "The core cplint package must never import logic from adapter packages, except inside resolve-adapter.",
      from: {
        path: "^packages/cplint",
        pathNot: "^packages/cplint/src/adapters-in/resolve-adapter\\.ts",
      },
      to: {
        path: "^packages/adapter-",
        dependencyTypesNot: ["type-only"],
      },
    },
    {
      name: "no-circular",
      severity: "error",
      from: {},
      to: {
        circular: true,
      },
    },
    {
      name: "not-to-unresolvable",
      severity: "error",
      from: {},
      to: {
        couldNotResolve: true,
      },
    },
  ],

  options: {
    exclude: {
      path: ["node_modules", "\\.config\\.ts$", "\\.dependency-cruiser\\.cjs$"],
    },
    doNotFollow: {
      path: "(/dist/)",
    },
    tsPreCompilationDeps: true,
    tsConfig: {
      fileName: "tsconfig.json",
    },
    skipAnalysisNotInRules: true,
  },
};
