import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import { loadConfig } from "../../config/load-config.js";

interface CompileOptions {
  interleave: boolean;
}

export async function contextCompiler(
  filePath: string,
  options: CompileOptions,
): Promise<string> {
  const config = await loadConfig();
  console.log(`\n🧑‍🍳 Compiling context from: ${filePath}`);
  console.log(`⚙️  Interleaving enabled: ${options}\n`);

  const rawYaml = fs.readFileSync(`${config.rootPath}/${filePath}`, "utf8");

  if (!options.interleave) {
    return rawYaml;
  }

  const parsed = YAML.parse(rawYaml);
  const manual = parsed.manual || {};
  const auto = parsed.auto || {};

  // Build the interleaved memory map
  const interleavedPayload: Record<string, any> = {
    "# cplint-config": "compiled-interleaved-view",
    global: {
      purpose: manual.purpose || "-",
      not_in_scope: manual["not-in-scope"] || "-",
      open_questions: manual["open-questions"] || "-",
      meta: auto.meta || {},
      summary: auto.summary || "",
      "entry-points": auto["entry-points"] || [],
      deps: auto.deps || {},
      "change-checklist": auto["change-checklist"] || [],
    },
    scopes: {},
  };

  // Identify independent scopes from the extracted API Surface
  const apiSurface = auto["api-surface"] || {};
  const identifiers = Object.keys(apiSurface);

  for (const id of identifiers) {
    const criticalFlow = filterArrayByToken(auto["critical-flow"], id);
    const stateShape = auto["state-shape"]?.[id];
    const decisions = filterArrayByToken(manual.decisions, id);
    const constraints = filterArrayByToken(manual.constraints, id);
    const pitfalls = filterArrayByToken(manual["known-pitfalls"], id);

    // Only instantiate the scope block if it contains actual technical metadata or human rules
    const scopeBlock: Record<string, any> = {
      "api-surface": { [id]: apiSurface[id] },
    };

    if (criticalFlow !== "-") scopeBlock["critical-flow"] = criticalFlow;
    if (stateShape && stateShape !== "none")
      scopeBlock["state-shape"] = stateShape;
    if (decisions !== "-") scopeBlock["decisions"] = decisions;
    if (constraints !== "-") scopeBlock["constraints"] = constraints;
    if (pitfalls !== "-") scopeBlock["known-pitfalls"] = pitfalls;

    interleavedPayload.scopes[id] = scopeBlock;
  }

  // Fallback items that did not match any explicit identifier scope
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

  return YAML.stringify(interleavedPayload, { indent: 2 });
}

/**
 * Filter array items optimizing for strict token matching to prevent cross-scope pollution
 */
function filterArrayByToken(list: any, token: string): any {
  if (!Array.isArray(list)) return "-";

  // Use a regex edge boundary (\b) or specific prefixes to avoid matching substring noise
  const regex = new RegExp(`\\b${token}\\b|\\.${token}\\b`);
  const matched = list.filter((item) => regex.test(String(item)));

  return matched.length ? matched : "-";
}

/**
 * Capture generic human configurations that were not bound to specific code tokens
 */
function filterUnmappedTokens(list: any, identifiers: string[]): string[] {
  if (!Array.isArray(list)) return [];
  return list.filter((item) => {
    const line = String(item);
    return !identifiers.some((id) => line.includes(id));
  });
}
