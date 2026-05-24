import type { SourceFile } from "ts-morph";
import type { Config } from "../types/index.js";

// ─── Severity ────────────────────────────────────────────────────────────────

export type Severity = "error" | "warn" | "info";

// ─── Violation ───────────────────────────────────────────────────────────────

export interface Violation {
  ruleId: string;
  severity: Severity;
  message: string;
  file: string;
  line?: number;
}

// ─── Fix ─────────────────────────────────────────────────────────────────────

export interface Fix {
  description: string;
  apply(): void;
}

// ─── Rule ────────────────────────────────────────────────────────────────────

export interface Rule {
  id: string;
  severity: Severity;
  description: string;
  check(file: SourceFile, config: Config): Violation[];
  fix?(violation: Violation): Fix;
}

// ─── Lint Result ─────────────────────────────────────────────────────────────

export interface LintResult {
  file: string;
  violations: Violation[];
}
