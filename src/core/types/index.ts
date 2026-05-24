import type { Node as MorphNode } from "ts-morph";
import type { SourceFile, TypeChecker } from "ts-morph";

export type FileRole =
  | "facade"
  | "store"
  | "service"
  | "component"
  | "page"
  | "hook"
  | "controller"
  | "repository"
  | "pipe"
  | "directive"
  | "routes"
  | "model"
  | "util"
  | "unknown";

export interface ExtractedContext extends Omit<
  SemanticContext,
  "title" | "meta" | "metrics" | "role"
> {
  relatedContextFiles: string[];
}

export interface CPLintAdapter {
  name: string;
  classify(file: SourceFile): FileRole;
  extract(
    file: SourceFile,
    checker: TypeChecker,
    config: Config,
  ): ExtractedContext;
}

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
  diagram?: boolean;
};

export const DEFAULT_CONFIG: Config = {
  tsConfigFilePath: "tsconfig.json",
  outputFileName: "{base}.context.ai.md",
  includePrivateTypes: false,
  maxTypeFields: 12,
  maxFlowSteps: 8,
  maxReferenceFiles: 8,
  manualDefaults: {
    meta: ["status: in-progress", "owner: [team-or-person]"].join("\n"),
    purpose: "- ",
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

export type EntryPoint = {
  name: string;
  kind: string;
  file: string;
};

export type ApiSurfaceRow = {
  name: string;
  kind: string;
  type: string;
};

export type DependencyRow = {
  module: string;
  role: string;
  symbols: string[];
  type: string;
};

export type StateField = {
  name: string;
  type: string;
};

export type StateShapeRow = {
  name: string;
  fields: StateField[];
};

export type SemanticContext = {
  title: string;
  role: FileRole;
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

export type ExportDeclRow = {
  exportName: string;
  decl: MorphNode;
};

export type ManualBlocks = Record<string, string>;
