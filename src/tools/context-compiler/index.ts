import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import { loadConfig } from "../../config/load-config.js";
import { resolveEntrypoint } from "../../core/utils/resolve-entrypoint.js";

export interface CompileOptions {
  interleave: boolean;
  output?: string;
}

// Roles considered noise for the LLM — the model already knows these from pre-training
const FRAMEWORK_ROLES = new Set([
  "framework",
  "reactive",
  "external",
  "builtin",
]);

export async function contextCompiler(
  filePath: string,
  options: CompileOptions,
): Promise<string> {
  const config = await loadConfig();
  const resolvedPath = resolveEntrypoint(config.rootPath, filePath);

  console.log(`\n🧑‍🍳 Compiling context from: ${resolvedPath}`);
  console.log(`⚙️  Interleaving enabled: ${options.interleave}\n`);

  const rawYaml = fs.readFileSync(resolvedPath, "utf8");

  if (!options.interleave) {
    maybeWrite(rawYaml, resolvedPath, options.output);
    return rawYaml;
  }

  const parsed = YAML.parse(rawYaml);
  const manual = parsed.manual || {};
  const auto = parsed.auto || {};

  // ── Filter framework noise from deps ──────────────────────────────────────
  // The LLM already knows @angular/core, rxjs, react, etc.
  // Only keep local, state, hook, router, and data-fetching deps.
  const localDeps = Object.fromEntries(
    Object.entries(auto.deps || {}).filter(
      ([, v]) => !FRAMEWORK_ROLES.has((v as any)?.role),
    ),
  );

  // ── Build global block ─────────────────────────────────────────────────────
  const interleavedPayload: Record<string, any> = {
    "# cplint-config": "compiled-interleaved-view",
    global: {
      purpose: manual.purpose || "-",
      not_in_scope: manual["not-in-scope"] || "-",
      open_questions: manual["open-questions"] || "-",
      meta: auto.meta || {},
      summary: auto.summary || "",
      "entry-points": auto["entry-points"] || [],
      deps: localDeps,
      "change-checklist": auto["change-checklist"] || [],
    },
    scopes: {},
  };

  // ── Build per-symbol scopes ────────────────────────────────────────────────
  const apiSurface = auto["api-surface"];
  const identifiers =
    !apiSurface || apiSurface === "none" || typeof apiSurface !== "object"
      ? []
      : Object.keys(apiSurface);

  for (const id of identifiers) {
    const criticalFlow = filterArrayByToken(auto["critical-flow"], id);
    const stateShape = findStateShape(auto["state-shape"], id);
    const decisions = filterArrayByToken(manual.decisions, id);
    const constraints = filterArrayByToken(manual.constraints, id);
    const pitfalls = filterArrayByToken(manual["known-pitfalls"], id);

    const scopeBlock: Record<string, any> = {
      "api-surface": { [id]: apiSurface[id] },
    };

    if (criticalFlow.length) scopeBlock["critical-flow"] = criticalFlow;
    if (stateShape) scopeBlock["state-shape"] = stateShape;
    if (decisions.length) scopeBlock["decisions"] = decisions;
    if (constraints.length) scopeBlock["constraints"] = constraints;
    if (pitfalls.length) scopeBlock["known-pitfalls"] = pitfalls;

    interleavedPayload.scopes[id] = scopeBlock;
  }

  if (!identifiers.length) {
    if (Array.isArray(manual.decisions))
      interleavedPayload.global.decisions = manual.decisions;
    if (Array.isArray(manual.constraints))
      interleavedPayload.global.constraints = manual.constraints;
    if (Array.isArray(manual["known-pitfalls"]))
      interleavedPayload.global["known-pitfalls"] = manual["known-pitfalls"];
  }

  // ── Fallback: unmapped manual rules ───────────────────────────────────────
  const fallbackDecisions = filterUnmappedTokens(manual.decisions, identifiers);
  const fallbackConstraints = filterUnmappedTokens(
    manual.constraints,
    identifiers,
  );
  const fallbackPitfalls = filterUnmappedTokens(
    manual["known-pitfalls"],
    identifiers,
  );

  if (
    fallbackDecisions.length ||
    fallbackConstraints.length ||
    fallbackPitfalls.length
  ) {
    interleavedPayload.global.unmapped_rules = {
      decisions: fallbackDecisions,
      constraints: fallbackConstraints,
      "known-pitfalls": fallbackPitfalls,
    };
  }

  const compiled = YAML.stringify(interleavedPayload, { indent: 2 });

  // ── Token estimate (1 token ≈ 4 chars — reasonable heuristic for code/YAML)
  const estimatedTokens = Math.ceil(compiled.length / 4);
  console.log(`📊 Estimated tokens: ~${estimatedTokens}`);

  maybeWrite(compiled, resolvedPath, options.output, config.rootPath);

  return compiled;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Filter list items that mention the given token by word boundary.
 * Returns an empty array when nothing matches — caller checks .length.
 */
function filterArrayByToken(list: unknown, token: string): string[] {
  if (!Array.isArray(list)) return [];
  const regex = new RegExp(`\\b${token}\\b|\\.${token}\\b`);
  return list.filter((item) => regex.test(String(item)));
}

/**
 * Returns items from list that don't mention any known identifier.
 * These are generic rules the dev wrote without scoping to a specific symbol.
 */
function filterUnmappedTokens(list: unknown, identifiers: string[]): string[] {
  if (!Array.isArray(list)) return [];
  return list.filter((item) => {
    const line = String(item);
    return !identifiers.some((id) => line.includes(id));
  });
}

/**
 * Looks up state-shape by exact key first, then by prefix.
 * Handles cases like "useAccount.useState" matching scope id "useAccount".
 */
function findStateShape(
  stateShape: Record<string, unknown> | undefined,
  id: string,
): unknown {
  if (!stateShape) return null;
  if (stateShape[id]) return stateShape[id];
  const prefixKey = Object.keys(stateShape).find((k) => k.startsWith(`${id}.`));
  return prefixKey ? stateShape[prefixKey] : null;
}

/**
 * Writes the compiled output to a file if --output was specified.
 */
function maybeWrite(
  content: string,
  sourcePath: string,
  outputPath?: string,
  rootPath?: string,
): void {
  if (!outputPath) return;

  // Remove leading slash to treat as relative path always
  const cleanOutput = outputPath.replace(/^\//, "");

  // Resolve against rootPath if provided, otherwise cwd
  const base = rootPath ? path.resolve(process.cwd(), rootPath) : process.cwd();

  const resolved = path.resolve(base, cleanOutput);

  let finalPath = resolved;
  if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
    const baseName = path.basename(sourcePath).replace(".cplint.yaml", "");
    finalPath = path.join(resolved, `${baseName}.compiled.yaml`);
  }

  fs.mkdirSync(path.dirname(finalPath), { recursive: true });
  fs.writeFileSync(finalPath, content, "utf8");
  console.log(`💾 Saved to: ${finalPath}`);
}
