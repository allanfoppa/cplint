import type { Node as MorphNode } from "ts-morph";

export function getDisplayName(exportName: string, decl: MorphNode): string {
  if (exportName !== "default") {
    return exportName;
  }

  const nameFn = (
    decl as MorphNode & {
      getName?: () => string | undefined;
    }
  ).getName;

  if (typeof nameFn === "function") {
    const name = nameFn.call(decl);

    if (name) return name;
  }

  const symbol = (
    decl as MorphNode & {
      getSymbol?: () => { getName(): string } | undefined;
    }
  ).getSymbol?.();

  return symbol ? symbol.getName() : "default";
}
