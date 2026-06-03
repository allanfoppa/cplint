import type { CPLintAdapter } from "../../core/types/index.js";

const ADAPTER_MAP: Record<string, () => Promise<CPLintAdapter>> = {
  angular: () =>
    import("../adapters/angular/index.js").then((m) => m.AngularAdapter),
  react: () => import("../adapters/react/index.js").then((m) => m.ReactAdapter),
  node: () => import("../adapters/node/index.js").then((m) => m.NodeAdapter),
};

export async function resolveAdapter(
  adapter: string | CPLintAdapter | undefined,
): Promise<CPLintAdapter> {
  // Already a concrete adapter object — use directly
  if (typeof adapter === "object" && adapter !== null) {
    return adapter;
  }

  // Default
  if (!adapter) {
    const { NodeAdapter } = await import("../adapters/node/index.js");
    return NodeAdapter;
  }

  const loader = ADAPTER_MAP[adapter.toLowerCase()];

  if (!loader) {
    const valid = Object.keys(ADAPTER_MAP).join(", ");
    throw new Error(
      `Unknown adapter "${adapter}". Valid options: ${valid}\n` +
        `Or pass a CPLintAdapter object directly in your config.`,
    );
  }

  return loader();
}
