import { Project } from "ts-morph";
import fs from "node:fs";

export function createProject(tsconfig: string): Project {
  if (fs.existsSync(tsconfig)) {
    return new Project({
      tsConfigFilePath: tsconfig,
    });
  }

  return new Project({
    compilerOptions: {
      allowJs: true,
      checkJs: true,
    },
  });
}
