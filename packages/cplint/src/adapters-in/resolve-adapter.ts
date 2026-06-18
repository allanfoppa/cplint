import type { CPLintAdapter } from "../core/types/index.js";

const ADAPTER_MAP: Record<string, () => Promise<CPLintAdapter>> = {
  angular: () =>
    import("@cplint/adapter-angular").then((m) => m.AngularAdapter),
  react: () => import("@cplint/adapter-react").then((m) => m.ReactAdapter),
  node: () => import("@cplint/adapter-node").then((m) => m.NodeAdapter),
};

export async function resolveAdapter(
  adapter: string | undefined,
): Promise<CPLintAdapter> {
  if (!adapter) {
    const { NodeAdapter } = await import("@cplint/adapter-node");
    return NodeAdapter;
  }

  const loader = ADAPTER_MAP[adapter.toLowerCase()];

  if (!loader) {
    const valid = Object.keys(ADAPTER_MAP).join(", ");
    throw new Error(`Unknown adapter "${adapter}". Valid options: ${valid}\n`);
  }

  try {
    return await loader();
  } catch (error) {
    throw new Error(
      `The adapter "${adapter}" is missing.\n` +
        `Please ensure it is installed by running: pnpm add -D @cplint/adapter-${adapter.toLowerCase()}`,
    );
  }
}
