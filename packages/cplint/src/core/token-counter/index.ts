import { encode } from "gpt-tokenizer";
import { readFileSync } from "node:fs";

export interface TokenCount {
  file: string;
  tokens: number;
  content: string;
}

/**
 * Reads a source file or context metadata and estimates its token footprint using BPE.
 */
export function countTokens(file: string): TokenCount {
  const content = readFileSync(file, "utf-8");
  return {
    file,
    tokens: encode(content).length,
    content,
  };
}
