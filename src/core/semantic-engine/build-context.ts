import fs from "node:fs";
import path from "node:path";

import { Node, Project, SyntaxKind } from "ts-morph";

import type {
  ArrowFunction,
  CallExpression,
  FunctionDeclaration,
  FunctionExpression,
  ImportDeclaration,
  MethodDeclaration,
  Node as MorphNode,
  SourceFile,
  Type,
  TypeChecker,
} from "ts-morph";

const repoRoot = process.cwd();

export type ManualDefaults = {
  meta: string;
  purpose: string;
  decisions: string;
  constraints: string;
  "known-pitfalls": string;
  "not-in-scope": string;
  "open-questions": string;
};

export type ClassifierRule = {
  name?: string;
  kind?: string;
  label: string;
};

export type ImportRoleRule = {
  module?: string;
  label: string;
};

export type FlowBoundaryRule = {
  matchExpr?: string;
  matchFile?: string;
  label: string;
};

export type Config = {
  tsConfigFilePath: string;
  outputFileName: string;
  includePrivateTypes: boolean;
  maxTypeFields: number;
  maxFlowSteps: number;
  maxReferenceFiles: number;
  manualDefaults: ManualDefaults;
  classifiers: ClassifierRule[];
  importRoleRules: ImportRoleRule[];
  flowBoundaryRules: FlowBoundaryRule[];
};

const DEFAULT_CONFIG: Config = {
  tsConfigFilePath: "tsconfig.json",
  outputFileName: "{base}.context.ai.md",
  includePrivateTypes: false,
  maxTypeFields: 12,
  maxFlowSteps: 8,
  maxReferenceFiles: 8,
  manualDefaults: {
    meta: ["status: in-progress", "owner: [team-or-person]"].join("\n"),
    purpose: "one-line description of what this module/feature does",
    decisions: "- ",
    constraints: "- ",
    "known-pitfalls": "- ",
    "not-in-scope": "- ",
    "open-questions": "- ",
  },
  classifiers: [],
  importRoleRules: [],
  flowBoundaryRules: [],
};

type EntryPoint = {
  name: string;
  kind: string;
  file: string;
};

type ApiSurfaceRow = {
  name: string;
  kind: string;
  type: string;
};

type DependencyRow = {
  module: string;
  role: string;
  symbols: string[];
};

type StateField = {
  name: string;
  type: string;
};

type StateShapeRow = {
  name: string;
  fields: StateField[];
};

type SemanticContext = {
  title: string;
  meta: {
    generated: string;
    entry: string;
    related: string[];
  };
  entryPoints: EntryPoint[];
  apiSurface: ApiSurfaceRow[];
  deps: DependencyRow[];
  stateShape: StateShapeRow[];
  criticalFlow: string[];
  changeChecklist: string[];
};

type ExportDeclRow = {
  exportName: string;
  decl: MorphNode;
};

type ManualBlocks = Record<string, string>;

export async function semanticContextGenerator(entrypoint: string) {
  if (!entrypoint) {
    throw new Error("Usage: cplint context --entrypoint <entry-file>");
  }

  const config: Config = DEFAULT_CONFIG;

  const project = new Project({
    tsConfigFilePath: path.resolve(repoRoot, config.tsConfigFilePath),
    skipAddingFilesFromTsConfig: false,
  });

  const sourceFile =
    project.getSourceFile(entrypoint) ||
    project.addSourceFileAtPathIfExists(entrypoint);

  if (!sourceFile) {
    throw new Error(`Source file not found: ${entrypoint}`);
  }

  const checker = project.getTypeChecker();

  const context = buildContext({
    sourceFile,
    checker,
    config,
  });

  const outputPath = getOutputPath(sourceFile.getFilePath(), config);

  const existing = fs.existsSync(outputPath)
    ? fs.readFileSync(outputPath, "utf8")
    : "";

  const manualBlocks = extractManualBlocks(existing);

  const nextDoc = renderDocument(context, config, manualBlocks, sourceFile);

  fs.writeFileSync(outputPath, nextDoc, "utf8");

  console.log(`Wrote ${normalizePath(outputPath)}`);
}

function buildContext({
  sourceFile,
  checker,
  config,
}: {
  sourceFile: SourceFile;
  checker: TypeChecker;
  config: Config;
}): SemanticContext {
  const exported = sourceFile.getExportedDeclarations();

  return {
    title: humanizeTitle(sourceFile),

    meta: {
      generated: new Date().toISOString().slice(0, 10),
      entry: normalizePath(sourceFile.getFilePath()),
      related: extractRelatedContextFiles(sourceFile, config),
    },

    entryPoints: extractEntryPoints(exported, sourceFile, config),

    apiSurface: extractApiSurface(exported, checker, config),

    deps: extractDeps(sourceFile, config),

    stateShape: extractStateShape(sourceFile, exported, checker, config),

    criticalFlow: extractCriticalFlow(exported, checker, config),

    changeChecklist: extractChangeChecklist(sourceFile, exported, config),
  };
}

function extractRelatedContextFiles(
  sourceFile: SourceFile,
  config: Config,
): string[] {
  const related = new Set<string>();

  for (const imp of sourceFile.getImportDeclarations()) {
    const importedSource = imp.getModuleSpecifierSourceFile();

    if (!importedSource) continue;

    if (importedSource.isFromExternalLibrary()) {
      continue;
    }

    const relatedPath = getOutputPath(importedSource.getFilePath(), config);

    if (fs.existsSync(relatedPath)) {
      related.add(normalizePath(relatedPath));
    }
  }

  return [...related].sort();
}

function extractEntryPoints(
  exported: ReadonlyMap<string, MorphNode[]>,
  sourceFile: SourceFile,
  config: Config,
): EntryPoint[] {
  return firstExportDecls(exported).map(({ exportName, decl }) => {
    const name = getDisplayName(exportName, decl);

    return {
      name,
      kind: classifyDeclaration(decl, name, config),
      file: normalizePath(sourceFile.getFilePath()),
    };
  });
}

function extractApiSurface(
  exported: ReadonlyMap<string, MorphNode[]>,
  checker: TypeChecker,
  config: Config,
): ApiSurfaceRow[] {
  return firstExportDecls(exported).map(({ exportName, decl }) => {
    const name = getDisplayName(exportName, decl);

    const target = getTypeTargetNode(decl);

    return {
      name,

      kind: classifyDeclaration(decl, name, config),

      type: shortType(checker.getTypeAtLocation(target).getText(target)),
    };
  });
}

function extractDeps(sourceFile: SourceFile, config: Config): DependencyRow[] {
  const rows: DependencyRow[] = [];

  for (const imp of sourceFile.getImportDeclarations()) {
    if (imp.isTypeOnly()) continue;

    const symbols = getImportBindingNodes(imp)
      .filter((node) => isImportBindingUsedInFile(node, sourceFile))
      .map((node) => node.getText());

    if (!symbols.length) continue;

    rows.push({
      module: imp.getModuleSpecifierValue(),

      role: classifyImportRole(imp.getModuleSpecifierValue(), config),

      symbols,
    });
  }

  return rows;
}

function extractStateShape(
  sourceFile: SourceFile,
  exported: ReadonlyMap<string, MorphNode[]>,
  checker: TypeChecker,
  config: Config,
): StateShapeRow[] {
  const found = new Map<string, StateShapeRow>();

  for (const iface of sourceFile.getInterfaces()) {
    if (!config.includePrivateTypes && !iface.isExported()) {
      continue;
    }

    addTypeSummary(
      found,
      iface.getName(),
      checker.getTypeAtLocation(iface),
      iface,
      checker,
      config,
    );
  }

  for (const alias of sourceFile.getTypeAliases()) {
    if (!config.includePrivateTypes && !alias.isExported()) {
      continue;
    }

    addTypeSummary(
      found,
      alias.getName(),
      checker.getTypeAtLocation(alias),
      alias,
      checker,
      config,
    );
  }

  for (const { exportName, decl } of firstExportDecls(exported)) {
    const name = getDisplayName(exportName, decl);

    const fn = getFunctionLikeNode(decl);

    if (!fn) continue;

    for (const param of fn.getParameters()) {
      addTypeSummary(
        found,
        `${name}.${param.getName()}`,
        checker.getTypeAtLocation(param),
        param,
        checker,
        config,
      );
    }

    const signatures = checker.getTypeAtLocation(fn).getCallSignatures();

    if (signatures.length) {
      addTypeSummary(
        found,
        `${name}.return`,
        signatures[0].getReturnType(),
        fn,
        checker,
        config,
      );
    }
  }

  return [...found.values()];
}

function addTypeSummary(
  store: Map<string, StateShapeRow>,
  label: string,
  type: Type,
  node: MorphNode,
  checker: TypeChecker,
  config: Config,
): void {
  const fields = type
    .getProperties()
    .slice(0, config.maxTypeFields)
    .map((prop) => ({
      name: prop.getName(),

      type: shortType(
        checker.getTypeOfSymbolAtLocation(prop, node).getText(node),
      ),
    }));

  if (!fields.length) return;

  if (store.has(label)) return;

  store.set(label, {
    name: label,
    fields,
  });
}

function extractCriticalFlow(
  exported: ReadonlyMap<string, MorphNode[]>,
  checker: TypeChecker,
  config: Config,
): string[] {
  const primary = pickPrimaryExport(exported);

  if (!primary) return [];

  const root = getFunctionLikeNode(primary.decl) || primary.decl;

  const steps: string[] = [];

  const seen = new Set<string>();

  const rootName = getDisplayName(primary.exportName, primary.decl);

  steps.push(rootName);

  seen.add(rootName);

  const calls = root.getDescendantsOfKind(SyntaxKind.CallExpression);

  for (const call of calls) {
    const step = describeCall(call, checker, config);

    if (!step) continue;

    if (seen.has(step)) continue;

    seen.add(step);

    steps.push(step);

    if (steps.length >= config.maxFlowSteps) {
      break;
    }
  }

  return steps.length ? [steps.join(" -> ")] : [];
}

function describeCall(
  call: CallExpression,
  checker: TypeChecker,
  config: Config,
): string | null {
  const expr = call.getExpression();

  const text = expr.getText();

  const signature = checker.getResolvedSignature(call);

  const decl = signature && signature.getDeclaration();

  const ownerFile = decl ? decl.getSourceFile().getFilePath() : null;

  const boundaryKind = classifyFlowBoundary({
    exprText: text,

    ownerFile,

    currentFile: call.getSourceFile().getFilePath(),

    isExternal: ownerFile ? ownerFile.includes("node_modules") : false,

    config,
  });

  if (!boundaryKind) return null;

  return `${text} (${boundaryKind})`;
}

function classifyFlowBoundary({
  exprText,
  ownerFile,
  currentFile,
  isExternal,
  config,
}: {
  exprText: string;
  ownerFile: string | null;
  currentFile: string;
  isExternal: boolean;
  config: Config;
}): string | null {
  for (const rule of config.flowBoundaryRules) {
    if (rule.matchExpr && new RegExp(rule.matchExpr).test(exprText)) {
      return rule.label;
    }

    if (
      rule.matchFile &&
      ownerFile &&
      new RegExp(rule.matchFile).test(ownerFile)
    ) {
      return rule.label;
    }
  }

  if (isExternal) {
    return "external-call";
  }

  if (ownerFile && normalizePath(ownerFile) !== normalizePath(currentFile)) {
    return "local-call";
  }

  return "call";
}

function extractChangeChecklist(
  sourceFile: SourceFile,
  exported: ReadonlyMap<string, MorphNode[]>,
  config: Config,
): string[] {
  const refs = new Set<string>();

  for (const { decl } of firstExportDecls(exported)) {
    const refNode = getReferenceNode(decl);

    if (!refNode || !hasReferenceSearch(refNode)) {
      continue;
    }

    for (const ref of refNode.findReferencesAsNodes()) {
      const filePath = ref.getSourceFile().getFilePath();

      if (filePath === sourceFile.getFilePath()) {
        continue;
      }

      if (filePath.includes("node_modules")) {
        continue;
      }

      refs.add(normalizePath(filePath));

      if (refs.size >= config.maxReferenceFiles) {
        break;
      }
    }

    if (refs.size >= config.maxReferenceFiles) {
      break;
    }
  }

  if (!refs.size) {
    return [
      "review dependent callers and tests before changing exported behavior",
    ];
  }

  return [`review references: ${[...refs].join(", ")}`];
}

function extractManualBlocks(markdown: string): ManualBlocks {
  const blocks: ManualBlocks = {};

  const regex =
    /<!-- MANUAL:START ([a-z-]+) -->([\s\S]*?)<!-- MANUAL:END \1 -->/g;

  for (const match of markdown.matchAll(regex)) {
    const key = match[1];

    const body = match[2].replace(/^\n/, "").replace(/\n\s*$/, "");

    blocks[key] = body;
  }

  return blocks;
}

function renderDocument(
  context: SemanticContext,
  config: Config,
  manualBlocks: ManualBlocks,
  sourceFile: SourceFile,
): string {
  const manual = {
    ...config.manualDefaults,
    ...manualBlocks,
  };

  return [
    "<!-- Generated file. Edit only MANUAL blocks. -->",
    "",

    `# ${context.title} context`,

    "",

    "## meta",

    renderAutoBlock("meta", renderMeta(context.meta)),

    renderManualBlock("meta", manual.meta),

    "",

    "## purpose",

    renderManualBlock("purpose", manual.purpose),

    "",

    "## entry-points",

    renderAutoBlock("entry-points", renderEntryPoints(context.entryPoints)),

    "",

    "## api-surface",

    renderAutoBlock("api-surface", renderApiSurface(context.apiSurface)),

    "",

    "## deps",

    renderAutoBlock("deps", renderDeps(context.deps)),

    "",

    "## state-shape",

    renderAutoBlock(
      "state-shape",
      renderStateShape(context.stateShape, sourceFile),
    ),

    "",

    "## critical-flow",

    renderAutoBlock("critical-flow", renderCriticalFlow(context.criticalFlow)),

    "",

    "## decisions",

    renderManualBlock("decisions", manual.decisions),

    "",

    "## constraints",

    renderManualBlock("constraints", manual.constraints),

    "",

    "## known-pitfalls",

    renderManualBlock("known-pitfalls", manual["known-pitfalls"]),

    "",

    "## not-in-scope",

    renderManualBlock("not-in-scope", manual["not-in-scope"]),

    "",

    "## change-checklist",

    renderAutoBlock(
      "change-checklist",
      renderChecklist(context.changeChecklist),
    ),

    "",

    "## open-questions",

    renderManualBlock("open-questions", manual["open-questions"]),

    "",
  ].join("\n");
}

function renderMeta(meta: SemanticContext["meta"]): string {
  return [
    `generated: ${meta.generated}`,
    `entry: ${meta.entry}`,

    "related:",

    ...(meta.related.length
      ? meta.related.map((x) => `  - ${x}`)
      : ["  - none"]),
  ].join("\n");
}

function renderEntryPoints(rows: EntryPoint[]): string {
  if (!rows.length) return "- none";

  return rows.map((row) => `- ${row.name}: ${row.kind}`).join("\n");
}

function renderApiSurface(rows: ApiSurfaceRow[]): string {
  if (!rows.length) return "- none";

  return rows
    .map((row) => `- ${row.name}: ${row.kind} | ${row.type}`)
    .join("\n");
}

function renderDeps(rows: DependencyRow[]): string {
  if (!rows.length) return "- none";

  return rows
    .map((row) => `- ${row.module}: ${row.role} | ${row.symbols.join(", ")}`)
    .join("\n");
}

function renderStateShape(
  rows: StateShapeRow[],
  sourceFile?: SourceFile,
  checker?: TypeChecker,
): string {
  const stateMap = new Map<string, StateShapeRow>();

  // 1. Populamos com o que o extrator de tipos já encontrou (Interfaces/Types)
  rows.forEach((row) => stateMap.set(row.name, row));

  if (sourceFile && checker) {
    // 2. BUSCA EM CLASSES (Angular/Inversify/Classes puras)
    const classes = sourceFile.getClasses();
    classes.forEach((clazz) => {
      clazz.getProperties().forEach((prop) => {
        const name = prop.getName();
        const initializer = prop.getInitializer()?.getText() || "";

        // Filtro básico de injeção
        const isInjected =
          prop.getDecorators().some((d) => d.getName() === "Inject") ||
          initializer.includes("inject(");

        if (!isInjected) {
          const type = prop.getType();
          stateMap.set(name, {
            name: `${name}: ${shortType(type.getText(prop))}`,
            fields: extractFieldsFromType(type, prop, checker),
          });
        }
      });
    });

    // 3. BUSCA EM VARIÁVEIS (React Hooks/NgRx Signals/Zustand)
    // Se o mapa ainda estiver vazio ou for um arquivo funcional, olhamos as consts
    if (stateMap.size <= rows.length) {
      sourceFile.getVariableDeclarations().forEach((decl) => {
        const initializer = decl.getInitializer();
        if (initializer && Node.isCallExpression(initializer)) {
          const callText = initializer.getExpression().getText();

          // Se a variável vem de uma função de "State" ou "Store"
          if (
            callText.includes("State") ||
            callText.includes("Store") ||
            callText.includes("create")
          ) {
            const name = decl.getName();
            const type = decl.getType();
            stateMap.set(name, {
              name: `${name}: ${shortType(type.getText(decl))}`,
              fields: extractFieldsFromType(type, decl, checker),
            });
          }
        }
      });
    }
  }

  const finalRows = Array.from(stateMap.values());
  if (!finalRows.length) return "- none";

  return finalRows
    .map((row) => {
      const header = `- ${row.name}`;
      const fields = row.fields.length
        ? row.fields.map((f) => `  - ${f.name}: ${f.type}`).join("\n")
        : "";

      return fields ? `${header}\n${fields}` : header;
    })
    .join("\n");
}

function extractFieldsFromType(
  type: Type,
  node: MorphNode,
  checker: TypeChecker,
): StateField[] {
  const fields: StateField[] = [];
  const props = type.getProperties();

  // Só expandimos se for um objeto e não for muito complexo (ex: evitar expandir o HTMLElement)
  if (
    props.length > 0 &&
    !type.isBoolean() &&
    !type.isString() &&
    !type.isNumber() &&
    props.length < 15
  ) {
    props.forEach((p) => {
      const propType = checker.getTypeOfSymbolAtLocation(p, node);
      fields.push({
        name: p.getName(),
        type: shortType(propType.getText(node)),
      });
    });
  }
  return fields;
}

function renderCriticalFlow(rows: string[]): string {
  if (!rows.length) return "- none";

  return rows.map((row) => `- ${row}`).join("\n");
}

function renderChecklist(rows: string[]): string {
  if (!rows.length) return "- none";

  return rows.map((row) => `- ${row}`).join("\n");
}

function renderAutoBlock(name: string, content: string): string {
  return [
    `<!-- AUTO:START ${name} -->`,
    content || "- none",
    `<!-- AUTO:END ${name} -->`,
  ].join("\n");
}

function renderManualBlock(name: string, content: string): string {
  return [
    `<!-- MANUAL:START ${name} -->`,
    content || "",
    `<!-- MANUAL:END ${name} -->`,
  ].join("\n");
}

function firstExportDecls(
  exported: ReadonlyMap<string, MorphNode[]>,
): ExportDeclRow[] {
  const rows: ExportDeclRow[] = [];

  for (const [exportName, decls] of exported.entries()) {
    if (!decls.length) continue;

    rows.push({
      exportName,
      decl: decls[0],
    });
  }

  return rows;
}

function pickPrimaryExport(
  exported: ReadonlyMap<string, MorphNode[]>,
): ExportDeclRow | null {
  const rows = firstExportDecls(exported);

  if (!rows.length) return null;

  rows.sort((a, b) => {
    const aName = getDisplayName(a.exportName, a.decl);

    const bName = getDisplayName(b.exportName, b.decl);

    const aScore = a.exportName === "default" ? 2 : 1;

    const bScore = b.exportName === "default" ? 2 : 1;

    if (aScore !== bScore) {
      return bScore - aScore;
    }

    return aName.localeCompare(bName);
  });

  return rows[0];
}

function classifyDeclaration(
  decl: MorphNode,
  name: string,
  config: Config,
): string {
  for (const rule of config.classifiers) {
    if (rule.name && !new RegExp(rule.name).test(name)) {
      continue;
    }

    if (rule.kind && rule.kind !== decl.getKindName()) {
      continue;
    }

    return rule.label;
  }

  return genericKind(decl);
}

function genericKind(decl: MorphNode): string {
  if (Node.isFunctionDeclaration(decl)) {
    return "function";
  }

  if (Node.isClassDeclaration(decl)) {
    return "class";
  }

  if (Node.isInterfaceDeclaration(decl)) {
    return "interface";
  }

  if (Node.isTypeAliasDeclaration(decl)) {
    return "type";
  }

  if (Node.isEnumDeclaration(decl)) {
    return "enum";
  }

  if (Node.isVariableDeclaration(decl)) {
    const init = decl.getInitializer();

    if (init && Node.isArrowFunction(init)) {
      return "function";
    }

    if (init && Node.isFunctionExpression(init)) {
      return "function";
    }

    if (init && Node.isObjectLiteralExpression(init)) {
      return "object";
    }

    return "variable";
  }

  return decl.getKindName().toLowerCase();
}

function classifyImportRole(moduleName: string, config: Config): string {
  for (const rule of config.importRoleRules) {
    if (rule.module && new RegExp(rule.module).test(moduleName)) {
      return rule.label;
    }
  }

  if (moduleName.startsWith(".")) {
    return "local";
  }

  return "external";
}

function getDisplayName(exportName: string, decl: MorphNode): string {
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

function getFunctionLikeNode(
  decl: MorphNode,
):
  | FunctionDeclaration
  | MethodDeclaration
  | ArrowFunction
  | FunctionExpression
  | null {
  if (
    Node.isFunctionDeclaration(decl) ||
    Node.isMethodDeclaration(decl) ||
    Node.isFunctionExpression(decl) ||
    Node.isArrowFunction(decl)
  ) {
    return decl;
  }

  if (Node.isVariableDeclaration(decl)) {
    const init = decl.getInitializer();

    if (
      init &&
      (Node.isArrowFunction(init) || Node.isFunctionExpression(init))
    ) {
      return init;
    }
  }

  return null;
}

function getTypeTargetNode(decl: MorphNode): MorphNode {
  if (Node.isVariableDeclaration(decl)) {
    return decl.getInitializer() || decl;
  }

  return decl;
}

function getImportBindingNodes(imp: ImportDeclaration): MorphNode[] {
  const nodes = [
    imp.getDefaultImport(),
    imp.getNamespaceImport(),
    ...imp.getNamedImports().map((n) => n.getNameNode()),
  ] as Array<MorphNode | undefined>;

  return nodes.filter((node): node is MorphNode => Boolean(node));
}

function hasReferenceSearch(node: MorphNode): node is MorphNode & {
  findReferencesAsNodes(): MorphNode[];
} {
  return (
    typeof (
      node as MorphNode & {
        findReferencesAsNodes?: unknown;
      }
    ).findReferencesAsNodes === "function"
  );
}

function isImportBindingUsedInFile(
  node: MorphNode,
  sourceFile: SourceFile,
): boolean {
  if (!hasReferenceSearch(node)) {
    return false;
  }

  return node
    .findReferencesAsNodes()
    .some((ref) => ref.getSourceFile() === sourceFile && ref !== node);
}

function getReferenceNode(decl: MorphNode): MorphNode {
  const nameNodeFn = (
    decl as MorphNode & {
      getNameNode?: () => MorphNode | undefined;
    }
  ).getNameNode;

  if (typeof nameNodeFn === "function") {
    const node = nameNodeFn.call(decl);

    if (node) return node;
  }

  return decl;
}

function getOutputPath(filePath: string, config: Config): string {
  const parsed = path.parse(filePath);

  const fileName = config.outputFileName
    .replace("{name}", parsed.name + parsed.ext)
    .replace("{base}", parsed.name)
    .replace("{ext}", parsed.ext.replace(/^\./, ""));

  return path.join(parsed.dir, fileName);
}

function normalizePath(filePath: string): string {
  return path.relative(repoRoot, filePath).split(path.sep).join("/");
}

function humanizeTitle(sourceFile: SourceFile): string {
  return sourceFile
    .getBaseNameWithoutExtension()
    .replace(/[._-]+/g, " ")
    .trim();
}

function shortType(text: string): string {
  const compact = text.replace(/\s+/g, " ").trim();

  return compact.length > 140 ? compact.slice(0, 137) + "..." : compact;
}
