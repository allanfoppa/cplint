import type { ApiSurfaceRow } from "../types/index.js";

/**
 * Builds an ApiSurfaceRow from the old `kind + type` shape that the
 * extractors were producing before the schema migration.
 *
 * This centralises the signature-building logic so each extractor
 * doesn't duplicate the formatting rules.
 *
 * Old extractor pattern:
 *   { name: "doThing", kind: "function", type: "string" }
 *
 * New shape:
 *   { name: "doThing", signature: "doThing() → string", flags: ["function", "exported"] }
 */
export function buildApiRow(opts: {
  name: string;
  kind: string;
  type: string;
  params?: string; // e.g. "title: string, id: number"
  flags?: string[]; // extra flags beyond kind+exported
}): ApiSurfaceRow {
  const { name, kind, type, params = "", flags = [] } = opts;

  const signature = buildSignature(name, kind, type, params);
  const allFlags = [kind, "exported", ...flags].filter(Boolean);

  return { name, signature, flags: allFlags };
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
      return params
        ? `${name}({ ${params} }) → JSX.Element`
        : `${name}() → JSX.Element`;

    case "class":
      return `class ${name}`;

    case "variable":
      return `${name}: ${type}`;

    case "type":
    case "interface":
      return `type ${name} = ${type}`;

    case "enum":
      return `enum ${name}`;

    default:
      return params ? `${name}(${params}) → ${type}` : `${name}: ${type}`;
  }
}
