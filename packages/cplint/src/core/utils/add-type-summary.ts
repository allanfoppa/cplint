import type { Node as MorphNode } from "ts-morph";
import type { SourceFile, Type, TypeChecker } from "ts-morph";
import type { ApiSurfaceRow, FileRole, StateShapeRow } from "../types/index.js";
import { shortType } from "./short-type.js";

// ─── addTypeSummary ───────────────────────────────────────────────────────────

export function addTypeSummary(
  found: Map<string, StateShapeRow>,
  name: string,
  type: Type,
  node: MorphNode,
  checker: TypeChecker,
  config: { maxTypeFields: number },
): void {
  const props = type.getProperties();
  if (!props.length) return;

  const fields = props.slice(0, config.maxTypeFields).map((p) => ({
    name: p.getName(),
    type: shortType(checker.getTypeOfSymbolAtLocation(p, node).getText(node)),
  }));

  found.set(name, { name, fields });
}

// ─── buildSummary ─────────────────────────────────────────────────────────────

export function buildSummary(role: FileRole, apiSurface: any[]): string {
  // Encontra a linha principal do export (ignora métodos internos indentados)
  const mainExport = (apiSurface || []).find(
    (row) => row && !row.name.startsWith("  "),
  );

  if (!mainExport) {
    return `Exports architecture assets. Role: ${role}.`;
  }

  const cleanName = mainExport.name.trim();

  // ── Entrypoint ───────────────────────────────────────────────────────────
  if (role === "entrypoint") {
    return "Application entrypoint. Bootstraps the app and wires top-level dependencies.";
  }

  // ── Store ────────────────────────────────────────────────────────────────
  if (role === "store") {
    if (mainExport.kind === "class") {
      const methodsCount = apiSurface.filter(
        (row) => row.kind === "method",
      ).length;
      return `Exported store class \`${cleanName}\`. Manages state with ${methodsCount} public feature(s).`;
    }
    return `Exported functional store \`${cleanName}\`. Manages application state.`;
  }

  // ── Class-based roles (Service, Facade, Repository, Controller) ──────────
  if (
    ["service", "facade", "repository", "controller", "directive"].includes(
      role,
    )
  ) {
    const methodsCount = apiSurface.filter(
      (row) => row.kind === "method",
    ).length;
    return `Exported ${role} class. \`${cleanName}\` exposing ${methodsCount} public method(s).`;
  }

  // ── Component / Page ─────────────────────────────────────────────────────
  if (role === "component" || role === "page") {
    if (mainExport.kind === "class") {
      const methodsCount = apiSurface.filter(
        (row) => row.kind === "method",
      ).length;
      return `Exported Angular ${role} class \`${cleanName}\` with ${methodsCount} public method(s).`;
    }
    const paramsDesc = mainExport.params
      ? `Receives props: \`${mainExport.params}\`. `
      : "";
    return `Exported component \`${cleanName}\`. ${paramsDesc}Returns JSX.`;
  }

  // ── Hook ─────────────────────────────────────────────────────────────────
  if (role === "hook") {
    const paramsDesc = mainExport.params
      ? `Receives \`${mainExport.params}\`. `
      : "";
    const retDesc = mainExport.type
      ? `Returns \`${mainExport.type}\`.`
      : "Returns hook state.";
    return `Exported React hook \`${cleanName}\`. ${paramsDesc}${retDesc}`;
  }

  // ── Model ────────────────────────────────────────────────────────────────
  if (role === "model") {
    const types = apiSurface
      .filter((row) => row.kind === "type")
      .map((row) => `\`${row.name}\``);
    if (types.length) {
      return `Exports ${types.length} type definition(s): ${types.join(", ")}.`;
    }
    return `Exported type boundaries for \`${cleanName}\`.`;
  }

  // ── Util ─────────────────────────────────────────────────────────────────
  if (role === "util") {
    // Filtra todos os símbolos reais expostos na raiz do utilitário (evita quebras por variação de kind)
    const rootUtils = apiSurface.filter(
      (row) => row && !row.name.startsWith("  "),
    );

    if (rootUtils.length === 1) {
      const paramsDesc = rootUtils[0].params
        ? `Receives \`${rootUtils[0].params}\`. `
        : "";
      const retDesc = rootUtils[0].type
        ? `Returns \`${rootUtils[0].type}\`.`
        : "";
      return `Exported utility function \`${cleanName}\`. ${paramsDesc}${retDesc}`.trim();
    }

    return `Exports ${rootUtils.length} utility function(s): ${rootUtils.map((f) => `\`${f.name.trim()}\``).join(", ")}.`;
  }

  // ── Fallbacks Estruturados ───────────────────────────────────────────────
  if (role === "guard")
    return `Exported route guard \`${cleanName}\`. Controls route access.`;
  if (role === "pipe")
    return `Exported Angular pipe \`${cleanName}\`. Transforms template values.`;
  if (role === "routes")
    return "Exported route configuration. Defines navigation structure.";
  if (role === "context")
    return `Exported React context \`${cleanName}\`. Provides shared state to tree.`;

  return `Exports symbol \`${cleanName}\`. Role: ${role}.`;
}
