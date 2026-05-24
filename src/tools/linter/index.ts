import { loadConfig } from "../../config/load-config.js";
import { runLinter } from "../../core/linter/runner/lint-runner.js";
import {
  getExitCode,
  reportToJson,
  reportToStdout,
} from "../../core/linter/runner/reporter.js";
import { DEFAULT_CONFIG } from "../../core/types/index.js";

type LintOptions = {
  format?: "stdout" | "json";
};

export async function runLint(options: LintOptions = {}): Promise<void> {
  const config = await loadConfig();

  if (!config.lint?.rules || !Object.keys(config.lint.rules).length) {
    console.error(`
  ❌ No lint rules configured.

  💡 Add rules to your cplint.config.ts:

    export default {
      rootPath: ['src/app/features'],
      adapter: 'angular',
      lint: {
        rules: {
          'no-cross-feature-import': 'error',
        }
      }
    }
    `);
    process.exit(1);
  }

  const results = await runLinter({
    rootPaths: config.rootPath,
    rulesConfig: config.lint.rules,
    config: { ...DEFAULT_CONFIG, ...config },
  });

  if (options.format === "json") {
    console.log(reportToJson(results));
  } else {
    reportToStdout(results);
  }

  process.exit(getExitCode(results));
}
