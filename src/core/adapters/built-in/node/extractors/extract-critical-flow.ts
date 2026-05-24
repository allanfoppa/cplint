import { Node, SyntaxKind, type ExportedDeclarations } from "ts-morph";
import type {
  FunctionDeclaration,
  MethodDeclaration,
  TypeChecker,
} from "ts-morph";
import type { Config } from "../../../../types/index.js";
import { getDisplayName } from "../../../../utils/get-display-name.js";

export function extractCriticalFlow(
  exported: ReadonlyMap<string, ExportedDeclarations[]>,
  checker: TypeChecker,
  config: Config,
): string[] {
  const flows: string[] = [];

  for (const [exportName, decls] of exported.entries()) {
    const decl = decls[0];
    if (!decl) continue;

    const name = getDisplayName(exportName, decl);

    if (Node.isClassDeclaration(decl)) {
      const methods = decl
        .getMethods()
        .filter(
          (m) => !m.getName().startsWith("_") && m.getScope() !== "private",
        );

      for (const method of methods.slice(0, config.maxFlowSteps)) {
        const calls = extractCallsFromBody(method, checker, config);
        if (calls.length) {
          flows.push(`${name}.${method.getName()} -> ${calls.join(" -> ")}`);
        }
      }
      continue;
    }

    if (Node.isFunctionDeclaration(decl)) {
      const calls = extractCallsFromBody(decl, checker, config);
      if (calls.length) {
        flows.push(`${name} -> ${calls.join(" -> ")}`);
      }
    }
  }

  return flows.slice(0, config.maxFlowSteps);
}

function extractCallsFromBody(
  node: MethodDeclaration | FunctionDeclaration,
  checker: TypeChecker,
  config: Config,
): string[] {
  const calls: string[] = [];
  const seen = new Set<string>();

  try {
    node
      .getDescendantsOfKind(SyntaxKind.CallExpression)
      .forEach((call: any) => {
        const text = call.getExpression().getText();
        if (seen.has(text) || text.length > 60) return;
        seen.add(text);

        const signature = checker.getResolvedSignature(call);
        const decl = signature?.getDeclaration();
        const isExternal = decl
          ? decl.getSourceFile().getFilePath().includes("node_modules")
          : false;

        const label = isExternal ? `${text} (external)` : text;
        calls.push(label);
      });
  } catch {
    // ts-morph can throw on complex AST nodes — fail gracefully
  }

  return calls.slice(0, config.maxFlowSteps);
}
