import { encode } from "gpt-tokenizer";
import { readFileSync } from "node:fs";

export interface IAnalyze {
  file: string;
  tokens: number;
  content: string;
  model: string;
}

/**
 * Reads a source file and estimates its token footprint using BPE encoding.
 *
 * Currently uses `gpt-tokenizer` (GPT-4 compatible BPE) as a cross-model
 * estimate. This is accurate enough for budget analysis but not exact for
 * Claude or Gemini, which use their own tokenizers.
 *
 * TODO: support per-model exact token counting via provider APIs:
 *   - Anthropic: POST /v1/messages/count_tokens (requires ANTHROPIC_API_KEY)
 *   - Google:    generativeModel.countTokens()   (requires GOOGLE_API_KEY)
 *
 * When implemented, `model` will drive which tokenizer/API is used, and the
 * result will reflect the exact count for that model instead of a BPE estimate.
 * API keys should be read from env or from the user's .cplintrc config — never
 * hardcoded or committed.
 */
export function analyze(file: string, model = "gpt-compatible"): IAnalyze {
  const content = readFileSync(file, "utf-8");
  return {
    file,
    tokens: encode(content).length,
    content,
    model,
  };
}
