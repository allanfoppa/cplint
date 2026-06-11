export const CLI_MESSAGES = {
  NO_RULES_CONFIGURED: `
  ❌ No lint rules configured.

  💡 Add rules to your cplint.config.ts:

    export default {
      rootPath: ['src/app/features'],
      adapter: 'angular',
      lint: {
        rules: {
          'no-cross-feature-import': 'error',
          'no-empty-manual-blocks': 'warn',
        }
      }
    }
  `,

  CONFIG_NOT_FOUND: `
  ❌ CPLint config not found

  👉 Expected: cplint.config.ts, .js, .mjs, .cjs or .json

  💡 Example (cplint.config.ts):

    export default {
      rootPath: 'src/app/features',
      adapter: 'react',
      lint: {
        rules: {
          'no-cross-feature-import': 'error',
        }
      }
    }
  `,
} as const;

type MessageKey = keyof typeof CLI_MESSAGES;

export function exitWithError(messageKey: MessageKey, exitCode = 1): never {
  console.error(CLI_MESSAGES[messageKey]);
  process.exit(exitCode);
}
