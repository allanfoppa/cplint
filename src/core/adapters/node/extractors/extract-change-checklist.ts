import { Node, type ExportedDeclarations } from "ts-morph";
import type { SourceFile } from "ts-morph";
import type { Config } from "../../../types/index.js";

export function extractChangeChecklist(
  file: SourceFile,
  exported: ReadonlyMap<string, ExportedDeclarations[]>,
  _config: Config,
): string[] {
  const checklist: string[] = [
    "review dependent callers and tests before changing exported behavior",
  ];

  const hasClasses = file.getClasses().length > 0;
  const exportCount = exported.size;

  if (hasClasses) {
    checklist.push(
      "update constructor signature carefully — callers may use positional args",
    );
  }

  if (exportCount > 3) {
    checklist.push(
      "this module has multiple exports — check each consumer independently",
    );
  }

  const hasAsyncMethods = file
    .getClasses()
    .flatMap((c) => c.getMethods())
    .some((m) => m.isAsync());

  if (hasAsyncMethods) {
    checklist.push(
      "async methods changed — verify error handling and Promise chains in callers",
    );
  }

  const text = file.getFullText();
  if (text.includes("process.env")) {
    checklist.push(
      "reads from process.env — update .env.example if adding new variables",
    );
  }

  return checklist;
}
