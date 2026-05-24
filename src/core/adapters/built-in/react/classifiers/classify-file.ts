import { Node, SyntaxKind } from "ts-morph";
import type { SourceFile } from "ts-morph";
import type { FileRole } from "../../../../types/index.js";

/**
 * Classifies a React source file into a FileRole.
 *
 * Strategy (priority order):
 * 1. File name suffix
 * 2. Export shape — hooks (useX), pages (PageX), components (JSX return)
 * 3. Content patterns — context, store, reducer
 */
export function classifyReactFile(file: SourceFile): FileRole {
  const base = file.getBaseNameWithoutExtension().toLowerCase();

  // ── Name suffix ──────────────────────────────────────────────────────────
  if (base.endsWith(".routes") || base.endsWith(".router")) return "routes";
  if (base.endsWith(".model") || base.endsWith(".types")) return "model";
  if (
    base.endsWith(".util") ||
    base.endsWith(".utils") ||
    base.endsWith(".helper")
  )
    return "util";
  if (base.endsWith(".store") || base.endsWith(".slice")) return "store";
  if (base.endsWith(".service")) return "service";
  if (base.endsWith(".repository") || base.endsWith(".repo"))
    return "repository";
  if (base.endsWith(".facade")) return "facade";
  if (base.endsWith(".page")) return "page";
  if (base.endsWith(".hook")) return "hook";

  // ── Export shape ─────────────────────────────────────────────────────────
  const functions = [
    ...file.getFunctions(),
    ...file
      .getVariableDeclarations()
      .map((v) => v.getInitializer())
      .filter(
        (i) => i && (Node.isArrowFunction(i) || Node.isFunctionExpression(i)),
      )
      .map((i) => i!),
  ];

  for (const fn of file.getFunctions()) {
    const name = fn.getName() ?? "";
    if (/^use[A-Z]/.test(name)) return "hook";
    if (/Page$/.test(name)) return "page";
  }

  // Arrow function components and hooks
  for (const decl of file.getVariableDeclarations()) {
    const name = decl.getName();
    if (/^use[A-Z]/.test(name)) return "hook";
    if (/Page$/.test(name)) return "page";
  }

  // ── Content patterns ─────────────────────────────────────────────────────
  const text = file.getFullText();
  if (text.includes("createContext") || text.includes("useContext"))
    return "service"; // context provider = service layer
  if (
    text.includes("createSlice") ||
    text.includes("createStore") ||
    text.includes("create(")
  )
    return "store";
  if (text.includes("useReducer") && !text.includes("JSX")) return "store";

  // JSX return = component
  const hasJSX =
    file.getDescendantsOfKind(SyntaxKind.JsxElement).length > 0 ||
    file.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement).length > 0;

  if (hasJSX) {
    // Distinguish page from component by name or route-like imports
    if (
      text.includes("useParams") ||
      text.includes("useSearchParams") ||
      /Page/.test(base)
    ) {
      return "page";
    }
    return "component";
  }

  return "unknown";
}
