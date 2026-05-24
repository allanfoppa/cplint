import path from "node:path";

/**
 * Given a file path and the configured rootPaths, returns the feature name
 * (the first path segment after the rootPath).
 *
 * @example
 * rootPaths: ['src/app/features']
 * filePath:  '/project/src/app/features/favorites/facade/favorites.facade.ts'
 * returns:   'favorites'
 *
 * @example
 * rootPaths: ['src/app/features']
 * filePath:  '/project/src/app/shared/utils/format.ts'
 * returns:   null  ← not inside a feature root
 */
export function detectFeature(
  filePath: string,
  rootPaths: string[],
): string | null {
  if (!filePath) return null;

  const normalized = filePath.replace(/\\/g, "/");

  for (const rootPath of rootPaths) {
    const normalizedRoot = rootPath.replace(/\\/g, "/");

    // Find the root segment in the file path
    const rootIndex = normalized.indexOf(normalizedRoot);
    if (rootIndex === -1) continue;

    // Everything after the root
    const afterRoot = normalized.slice(rootIndex + normalizedRoot.length);

    // Remove leading slash
    const trimmed = afterRoot.replace(/^\//, "");

    // First segment is the feature name
    const feature = trimmed.split("/")[0];

    if (feature && feature.length > 0) return feature;
  }

  return null;
}
