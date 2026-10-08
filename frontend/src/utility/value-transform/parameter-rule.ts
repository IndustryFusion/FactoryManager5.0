//
// Copyright (c) 2026 IB Systems GmbH
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

// The settings the onboarding form shows for one parameter (values to map,
// what any other value does, a unit conversion, what to send when the machine
// cannot be read) and the gateway rule they stand for (engine.ts), both ways.
//
// Only type imports, so `npm run test:transforms` runs this file directly.

import type { MapFallback, TransformCase, TransformRule } from "./engine";

// ─── What a person types for a machine value ────────────────────────────────

export type Match = Omit<TransformCase, "out">;

const NUM = "[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)";
const NUMBER_RE = new RegExp(`^${NUM}$`);
const RANGE_RE = new RegExp(`^(${NUM})\\s*(?:-|–|\\.\\.|to)\\s*(${NUM})$`, "i");
const AT_LEAST_RE = new RegExp(`^(?:>=|≥)\\s*(${NUM})$`);
const AT_MOST_RE = new RegExp(`^(?:<=|≤)\\s*(${NUM})$`);
const BIT_RE = /^bit\s*(\d{1,2})$/i;

/** What a typed value matches ("1", "Running", "3-9", ">=5", "bit 4"), or undefined for nothing. */
export const parseMatch = (text: string): Match | undefined => {
  const t = text.trim();
  if (t === "") return undefined;
  let m = BIT_RE.exec(t);
  if (m && Number(m[1]) <= 52) return { bit: Number(m[1]) };
  m = RANGE_RE.exec(t);
  if (m) {
    const [min, max] = [Number(m[1]), Number(m[2])].sort((a, b) => a - b);
    return { min, max };
  }
  m = AT_LEAST_RE.exec(t);
  if (m) return { min: Number(m[1]) };
  m = AT_MOST_RE.exec(t);
  if (m) return { max: Number(m[1]) };
  return { eq: t };
};

/** How a match reads: "1", "3–9", "≥ 5", "≤ 3", "bit 4". */
export const matchLabel = (c: Match): string => {
  if (c.bit != null) return `bit ${c.bit}`;
  if (c.min != null && c.max != null) return `${c.min}–${c.max}`;
  if (c.min != null) return `≥ ${c.min}`;
  if (c.max != null) return `≤ ${c.max}`;
  return String(c.eq ?? "");
};

/** The text to edit a match as: its label with plain separators, so it parses back. */
export const matchText = (c: Match): string =>
  matchLabel(c).replace("–", "-").replace("≥ ", ">=").replace("≤ ", "<=");

/** Two matches with the same key match the same values, as the gateway reads them. */
export const matchKey = (c: Match): string => {
  if (c.bit != null) return `bit:${c.bit}`;
  if ("min" in c || "max" in c) return `range:${c.min ?? ""}:${c.max ?? ""}`;
  const t = String(c.eq ?? "").trim();
  if (/^true$/i.test(t)) return "eq:1";
  if (/^false$/i.test(t)) return "eq:0";
  return NUMBER_RE.test(t) ? `eq:${Number(t)}` : `eq:${t.toLowerCase()}`;
};

const kindRank = (c: Match) => (c.bit != null ? 2 : "min" in c || "max" in c ? 1 : 0);

/** Exact values first, then ranges, then bits, so a specific value always wins over a range. */
export const orderCases = (cases: TransformCase[]): TransformCase[] =>
  cases.map((c, i) => ({ c, i })).sort((a, b) => kindRank(a.c) - kindRank(b.c) || a.i - b.i).map(x => x.c);

// ─── One parameter's settings ───────────────────────────────────────────────

export interface Pair {
  /** What the machine sends, as typed. */
  from: string;
  /** What to send instead. */
  to: string;
}

export type Otherwise = "raw" | "drop" | "value";

export type Conversion =
  | { kind: "none" }
  | { kind: "unit"; from: string; to: string; factor: number; offset: number; decimals: number }
  | { kind: "factor"; factor: number; offset: number; decimals: number };

export interface ParameterSettings {
  pairs: Pair[];
  /** What any value not in `pairs` does: sent as received, ignored, or replaced. */
  otherwise: Otherwise;
  otherwiseValue: string;
  /** Applied after the mapping, to numbers. */
  conversion: Conversion;
  /** Sent when the machine cannot be read; null sends nothing. */
  onError: string | null;
}

export const DEFAULT_DECIMALS = 3;

export const settingsFromRule = (rule: TransformRule | undefined): ParameterSettings => {
  const pairs = (rule?.map?.cases ?? []).map(({ out, ...match }) => ({ from: matchText(match), to: String(out) }));
  const fallback = rule?.map?.fallback ?? (rule?.map ? "drop" : "raw");
  const linear = rule?.linear;
  let conversion: Conversion = { kind: "none" };
  if (linear) {
    const decimals = linear.decimals ?? DEFAULT_DECIMALS;
    conversion = linear.from && linear.to
      ? { kind: "unit", from: linear.from, to: linear.to, factor: linear.factor, offset: linear.offset, decimals }
      : { kind: "factor", factor: linear.factor, offset: linear.offset, decimals };
  }
  return {
    pairs,
    otherwise: typeof fallback === "object" ? "value" : fallback,
    otherwiseValue: typeof fallback === "object" ? String(fallback.value) : "",
    conversion,
    onError: rule?.on_error ?? null,
  };
};

/** The pairs that are filled in, as gateway cases in the order they are tried. */
export const casesOf = (pairs: Pair[]): TransformCase[] =>
  orderCases(pairs.flatMap(p => {
    const match = parseMatch(p.from);
    return match && p.to.trim() !== "" ? [{ ...match, out: p.to.trim() }] : [];
  }));

/** The rule for the settings, or undefined when every value goes through untouched. */
export const ruleFromSettings = (parameter: string, s: ParameterSettings): TransformRule | undefined => {
  const cases = casesOf(s.pairs);
  const mapped = cases.length > 0 || s.otherwise !== "raw";
  const converted = s.conversion.kind !== "none";
  if (!mapped && !converted && s.onError === null) return undefined;

  const fallback: MapFallback = s.otherwise === "value" ? { value: s.otherwiseValue } : s.otherwise;
  const rule: TransformRule = { parameter };
  // A rule needs a map or a conversion; one that only sets what to send when
  // the machine cannot be read gets a map that lets every value through.
  if (mapped || !converted) rule.map = { cases, fallback };
  if (s.conversion.kind === "unit") {
    const { from, to, factor, offset, decimals } = s.conversion;
    rule.linear = { factor, offset, decimals, from, to };
  } else if (s.conversion.kind === "factor") {
    const { factor, offset, decimals } = s.conversion;
    rule.linear = { factor, offset, decimals };
  }
  if (s.onError !== null) rule.on_error = s.onError;
  return rule;
};

/** Values the machine might send that are listed twice with different meanings, as labels. */
export const conflictingValues = (pairs: Pair[]): string[] => {
  const meaning = new Map<string, string>();
  const conflicts = new Set<string>();
  for (const p of pairs) {
    const match = parseMatch(p.from);
    if (!match || p.to.trim() === "") continue;
    const key = matchKey(match);
    const seen = meaning.get(key);
    if (seen !== undefined && seen !== p.to.trim()) conflicts.add(matchLabel(match));
    else meaning.set(key, p.to.trim());
  }
  return Array.from(conflicts);
};
