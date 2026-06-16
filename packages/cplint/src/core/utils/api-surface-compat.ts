import type { ApiSurfaceRow } from "../types/index.js";

export function buildApiRow(opts: {
  name: string;
  kind: string;
  type: string;
  params?: string;
  flags?: string[];
  signature?: string;
}): ApiSurfaceRow {
  const {
    name,
    kind,
    type,
    params = "",
    flags = [],
    signature: customSignature,
  } = opts;

  const signature =
    customSignature ||
    buildSignature(name, kind, type, normalizeParams(params));

  const allFlags = [kind, "exported", ...flags].filter(Boolean);
  return { name, signature, flags: allFlags };
}

/**
 * Flattens multiline parameter strings (as extracted by ts-morph from
 * destructured or formatted function signatures) into a single line.
 */
function normalizeParams(params: string): string {
  return params
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .join(" ");
}

function buildSignature(
  name: string,
  kind: string,
  type: string,
  params: string,
): string {
  switch (kind) {
    case "function":
    case "method":
    case "hook":
      return `${name}(${params}) → ${type}`;

    case "component":
    case "page":
      if (type === name || (!params && type !== "JSX.Element")) {
        return name;
      }
      return params
        ? `${name}({ ${params} }) → JSX.Element`
        : `${name}() → JSX.Element`;

    // Class-based roles — no call signature
    case "facade":
    case "service":
    case "guard":
    case "store":
    case "repository":
    case "controller":
    case "directive":
    case "pipe":
    case "class":
      return name;

    case "variable":
      return `${name}: ${type}`;

    case "type":
    case "interface":
      return type.startsWith("type ") || type.startsWith("interface ")
        ? type
        : `type ${name} = ${type}`;

    case "enum":
      return `enum ${name}`;

    case "routes":
      return `${name}: ${type}`;

    default:
      return params ? `${name}(${params}) → ${type}` : `${name}: ${type}`;
  }
}
