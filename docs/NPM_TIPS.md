This guide provides a linear, professional workflow for publishing the **CPLint** package to the NPM registry, from initial configuration to version management and final deployment.

---

## Pre-Publication Checklist

Before initiating the publication process, ensure the `package.json` is correctly configured. These fields define how your package is consumed and what files are included.

- **`name`**: The unique identifier (`cplint` or `@cplint/cli`).
- **`version`**: Must follow [Semantic Versioning](https://semver.org/) (e.g., `1.0.0`).
- **`main` / `module` / `types**`: Entry points for your compiled code (typically pointing to the `dist` folder).
- **`bin`**: Maps the CLI command to your executable file.
- **`files`**: A whitelist of directories to be uploaded. This keeps the package lightweight by excluding source files and tests.

```json
{
  "files": ["dist", "README.md", "LICENSE"]
}
```

---

## Expert Recommendations

To ensure a professional and reliable release, implement these automation best practices:

- **`files` vs `.npmignore**`: Always prefer the `"files"`property in`package.json`. It acts as a whitelist, which is safer and more maintainable than trying to exclude files manually.

- **Automated Builds**: Add a `prepublishOnly` script. This ensures that your code is always re-built (e.g., via `tsdown` or `tsc`) immediately before the registry upload, preventing the publication of outdated artifacts.

```json
"scripts": {
  "prepublishOnly": "pnpm run build"
}
```

- **Documentation**: Ensure your `README.md` is detailed. The NPM registry uses this file as your package's landing page. It should clearly explain installation and how to create the `cplint.config.ts` file.

- **Local CLI Development**: To test the CLI locally without publishing to npm, use `npm link`.

```bash
# Inside the CPLint project root:
npm link
```

This creates a global symlink for the CLI command defined in `package.json`.

```json
"bin": {
  "cplint": "./dist/main.js"
}
```

After linking, the command becomes available globally and now can be tested the CLI inside any local project:

```bash
cplint generate-context
```

Rebuilding during development whenever the source changes, rebuild the project:

```bash
npm run build
# Since the command is symlinked, the global CLI automatically uses the updated build.
```

To remove the global symlink:

```bash
# Inside the CPLint project root
npm unlink
```

If the command is still available globally, remove it explicitly:

```bash
npm unlink -g cplint
```

To link again later:

```bash
npm link
```

## Version Management (SemVer)

Never manually edit the version in `package.json`. Use the standard NPM commands to keep your versioning consistent and your Git tags synchronized:

- **Patch** (Bug fixes): `1.0.0` → `1.0.1`

```bash
npm version patch
```

- **Minor** (New backward-compatible features): `1.0.0` → `1.1.0`

```bash
npm version minor
```

- **Major** (Breaking changes): `1.0.0` → `2.0.0`

```bash
npm version major
```

> **Note:** These commands automatically update the `package.json`, commit the change, and create a Git tag for you.

---

## Publication Workflow

### 1. Authentication

Log in to your NPM account via the terminal. This is required for the first session or after the token expires:

```bash
npm login
```

### 2. Security Verification (Dry Run)

Verify the package contents without actually performing an upload. This allows you to inspect the file list and final package size:

```bash
npm publish --dry-run
```

### 3. Final Publication

Once verified, push the package to the registry.

- **For Global (Unscoped) Packages:**

```bash
npm publish
```

- **For Scoped Packages (`@cplint/`):**
  By default, scoped packages are treated as private. You must explicitly set the access to public:

```bash
npm publish --access public
```

---

### Quick Reference Commands

| Goal                             | Command                                               |
| :------------------------------- | :---------------------------------------------------- |
| Verify logged-in user            | `npm whoami`                                          |
| View current registry version    | `npm view cplint version`                             |
| Deprecate a specific version     | `npm deprecate cplint@1.0.0 "Reason for deprecation"` |
| Unpublish a package (within 72h) | `npm unpublish cplint --force`                        |
