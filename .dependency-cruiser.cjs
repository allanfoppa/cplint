module.exports = {
  forbidden: [
    {
      name: "core-cannot-import-adapters",
      from: {
        path: "^src/core",
      },
      to: {
        path: "^src/adapters",
        // path: "^src/adapters/@", --- IGNORED FOR NOW ---
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
    tsPreCompilationDeps: true,
    tsConfig: {
      fileName: "tsconfig.json",
    },
    skipAnalysisNotInRules: true,
  },
};
