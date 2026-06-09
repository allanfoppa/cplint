import { SyntaxKind } from "ts-morph";
import type { SourceFile } from "ts-morph";
import type { FileRole } from "../../../core/types/index.js";

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

  // ── Export shape: functions ──────────────────────────────────────────────
  for (const fn of file.getFunctions()) {
    const name = fn.getName() ?? "";
    if (/^use[A-Z]/.test(name)) return "hook";
    if (/Page$/.test(name)) return "page";
  }

  // ── Export shape: variable declarations ─────────────────────────────────
  for (const decl of file.getVariableDeclarations()) {
    const name = decl.getName();
    if (/^use[A-Z]/.test(name)) return "hook";
    if (/Page$/.test(name)) return "page";
  }

  // ── Content patterns ─────────────────────────────────────────────────────
  const text = file.getFullText();
  const hasJSX =
    file.getDescendantsOfKind(SyntaxKind.JsxElement).length > 0 ||
    file.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement).length > 0;

  if (text.includes("createContext")) return "context";

  if (!hasJSX) {
    if (
      text.includes("createSlice") ||
      text.includes("createStore") ||
      text.includes("create(")
    )
      return "store";
    if (text.includes("useReducer")) return "store";
  }

  // JSX = component ou page
  if (hasJSX) {
    if (
      text.includes("useParams") ||
      text.includes("useSearchParams") ||
      /page/.test(base)
    )
      return "page";
    return "component";
  }

  return "unknown";
}
