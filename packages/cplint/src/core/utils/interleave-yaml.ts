// src/core/context-generator/utils/interleave-yaml.ts
import YAML from "yaml";
import type { ManualBlockKey, ManualDefaults } from "../types/index.js";

const FRAMEWORK_ROLES = new Set([
  "framework",
  "reactive",
  "external",
  "builtin",
]);
const PLACEHOLDER_PREFIXES = ["Required.", "Optional."];

const MANUAL_KEYS: ManualBlockKey[] = [
  "purpose",
  "decisions",
  "constraints",
  "known-pitfalls",
  "not-in-scope",
  "open-questions",
];

function isPlaceholder(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") {
    return (
      value === "-" ||
      PLACEHOLDER_PREFIXES.some((p) => value.replace(/^-\s*/, "").startsWith(p))
    );
  }
  if (!Array.isArray(value)) return false;
  return value.every((item) =>
    PLACEHOLDER_PREFIXES.some((p) => String(item).startsWith(p)),
  );
}

function parseList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v) => v !== null && v !== undefined && v !== "")
    .map(String);
}

export function interleaveYaml(
  autoContext: any,
  existingYaml: string,
  manualDefaults: ManualDefaults,
): string {
  let existingGlobal: Record<string, any> = {};

  if (existingYaml) {
    try {
      const parsed = YAML.parse(existingYaml);
      if (parsed && parsed.global) {
        existingGlobal = parsed.global;
      }
    } catch {
      // Avoid breaking if malformed
    }
  }

  const manualFields: Record<string, unknown> = {};
  for (const key of MANUAL_KEYS) {
    const previousValue = existingGlobal[key];
    if (previousValue && !isPlaceholder(previousValue)) {
      manualFields[key] = previousValue;
    } else {
      manualFields[key] = [manualDefaults[key].replace(/^-\s*/, "")];
    }
  }

  // Normalize dependencies schema to avoid positional array indexing arrays as keys
  const rawDeps = autoContext.deps || autoContext.dependencies || {};
  const depsSource = Array.isArray(rawDeps) ? rawDeps : Object.values(rawDeps);

  const filteredDeps = depsSource.filter(
    (v: any) => v && !FRAMEWORK_ROLES.has(v.role),
  );
  const depsPayload = filteredDeps.length ? filteredDeps : {};

  const related = parseList(autoContext.meta?.related).filter(
    (r) => r !== "none",
  );
  const changeChecklist = parseList(
    autoContext["change-checklist"] || autoContext.changeChecklist,
  );

  const interleavedPayload: Record<string, any> = {
    global: {
      ...manualFields,
      meta: {
        ...(autoContext.meta || {}),
        related: related.length ? related : [],
      },
      summary: autoContext.summary || "",
      deps: depsPayload,
    },
    scopes: {},
  };

  if (changeChecklist.length) {
    interleavedPayload.global["change-checklist"] = changeChecklist;
  }

  // Normalize api-surface array list
  const rawApiSurface =
    autoContext["api-surface"] || autoContext.apiSurface || {};
  const apiSurfaceList: any[] = Array.isArray(rawApiSurface)
    ? rawApiSurface
    : Object.values(rawApiSurface);

  if (!apiSurfaceList.length) {
    const rawEntryPoints =
      autoContext["entry-points"] || autoContext.entryPoints;
    if (rawEntryPoints && rawEntryPoints !== "none") {
      interleavedPayload.global["entry-points"] = rawEntryPoints;
    }
  }

  // Map each identity surface directly into a key-named scope entry
  for (const apiItem of apiSurfaceList) {
    if (!apiItem || !apiItem.name) continue;

    const id = apiItem.name; // Use the function/class name as the direct scope key (e.g. updateWindowTitle)

    const scopeBlock: Record<string, any> = {
      "api-surface": {
        name: apiItem.name,
        signature: apiItem.signature,
        flags: apiItem.flags,
      },
    };

    // Extract critical flows matched by identifiers
    const criticalFlow =
      autoContext["critical-flow"] || autoContext.criticalFlow;
    if (criticalFlow) {
      if (criticalFlow[id]) {
        scopeBlock["critical-flow"] = criticalFlow[id];
      } else if (typeof criticalFlow === "object") {
        // Fallback checks for sequential matching
        const dynamicKey = Object.keys(criticalFlow).find(
          (k) => k === id || k.startsWith(`${id}.`),
        );
        if (dynamicKey) scopeBlock["critical-flow"] = criticalFlow[dynamicKey];
      }
    }

    // Extract state shapes matched by identifiers
    const stateShape = autoContext["state-shape"] || autoContext.stateShape;
    if (stateShape) {
      if (stateShape[id]) {
        scopeBlock["state-shape"] = stateShape[id];
      } else if (typeof stateShape === "object") {
        const dynamicKey = Object.keys(stateShape).find(
          (k) => k === id || k.startsWith(`${id}.`),
        );
        if (dynamicKey) scopeBlock["state-shape"] = stateShape[dynamicKey];
      }
    }

    interleavedPayload.scopes[id] = scopeBlock;
  }

  return YAML.stringify(interleavedPayload, { indent: 2 });
}
