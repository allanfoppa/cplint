import type { ApiSurfaceRow } from "../types/index.js";

export function buildApiRow(opts: {
  name: string;
  kind: string;
  type: string;
  params?: string;
  flags?: string[];
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
      // Angular class: type === name (class name passed as type)
      // React function: type is "JSX.Element" or params contains props
      if (type === name || (!params && type !== "JSX.Element")) {
        return name; // Angular — no call signature
      }
      return params
        ? `${name}({ ${params} }) → JSX.Element`
        : `${name}() → JSX.Element`;

    // Angular / Node class-based roles — no call signature
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
      return `type ${name} = ${type}`;

    case "enum":
      return `enum ${name}`;

    case "routes":
      return `${name}: ${type}`;

    default:
      return params ? `${name}(${params}) → ${type}` : `${name}: ${type}`;
  }
}
