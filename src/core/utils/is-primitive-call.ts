/**
 * Returns true when the call expression text refers to a JavaScript
 * primitive or built-in method that adds no semantic signal for LLMs.
 *
 * These calls appear frequently in critical-flow output but carry no
 * architectural meaning — the LLM already knows how String, Array,
 * Object, Math, etc. work from pre-training.
 *
 * Examples filtered:
 *   mode.charAt(0).toUpperCase  →  String.prototype
 *   items.filter(...)           →  Array.prototype
 *   Object.keys(...)            →  Object built-in
 *   Math.ceil(...)              →  Math built-in
 *   JSON.parse(...)             →  JSON built-in
 *   Promise.resolve(...)        →  Promise built-in
 */

const PRIMITIVE_PREFIXES = [
  // String.prototype
  "mode.",
  "text.",
  "str.",
  "string.",
  "name.",
  "value.",
  "label.",
  "key.",
  "url.",
  "path.",
  "msg.",
  "message.",
  // Array.prototype
  "items.",
  "list.",
  "array.",
  "rows.",
  "results.",
  "entries.",
  "args.",
  "params.",
  // Built-in globals
  "Object.",
  "Array.",
  "String.",
  "Number.",
  "Boolean.",
  "Math.",
  "JSON.",
  "Promise.",
  "Date.",
  "RegExp.",
  "Error.",
  "Set.",
  "Map.",
  // Common method chains that are always primitive
  ".toString",
  ".valueOf",
  ".hasOwnProperty",
];

const PRIMITIVE_EXACT = new Set([
  "parseInt",
  "parseFloat",
  "isNaN",
  "isFinite",
  "encodeURIComponent",
  "decodeURIComponent",
  "encodeURI",
  "decodeURI",
  "setTimeout",
  "setInterval",
  "clearTimeout",
  "clearInterval",
  "queueMicrotask",
]);

export function isPrimitiveCall(callText: string): boolean {
  if (PRIMITIVE_EXACT.has(callText)) return true;
  return PRIMITIVE_PREFIXES.some((prefix) => callText.startsWith(prefix));
}
