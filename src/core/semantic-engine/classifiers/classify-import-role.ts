import { Config } from "../types/index.js";

export function classifyImportRole(moduleName: string, config: Config): string {
  for (const rule of config.importRoleRules) {
    if (rule.module && new RegExp(rule.module).test(moduleName)) {
      return rule.label;
    }
  }

  if (moduleName.startsWith(".")) {
    return "local";
  }

  return "external";
}
