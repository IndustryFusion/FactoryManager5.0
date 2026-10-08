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

// The value transforms the gateway's OPC UA data service applies, mirrored so
// the onboarding form can preview them. The gateway's src/transform.py is the
// original; transform_cases.json (copied from its tests) pins both to the same
// results, so change them together.
//
// No imports and only syntax Node can strip, so `npm run test:transforms`
// runs this file directly.

export interface TransformCase {
  eq?: string;
  min?: number | null;
  max?: number | null;
  bit?: number;
  out: string;
}

export type MapFallback = "drop" | "raw" | { value: string };

/** A map, a linear conversion, or both: the map runs first, then numbers are converted. */
export interface TransformRule {
  parameter: string;
  map?: { cases: TransformCase[]; fallback?: MapFallback };
  linear?: { factor: number; offset: number; decimals?: number; from?: string; to?: string };
  on_error?: string;
}

export interface Transforms {
  version: number;
  rules: TransformRule[];
}

export const SUPPORTED_VERSION = 1;
const DEFAULT_DECIMALS = 6;
const REL_TOL = 1e-6;
const ABS_TOL = 1e-9;
const FIXED_LIMIT = 1e15;
export const MAX_BIT = 52;
const NUMBER_RE = /^[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?$/;

const NO_VALUE = Symbol("NO_VALUE");
const UNSUPPORTED = Symbol("UNSUPPORTED");
type Canon = number | string | typeof NO_VALUE | typeof UNSUPPORTED;

// ─── Normalising raw values ──────────────────────────────────────────────────

/** The value a rule matches against: a number, lower-case text, or a marker. */
const canon = (raw: unknown): Canon => {
  if (raw === null || raw === undefined) return NO_VALUE;
  if (typeof raw === "boolean") return raw ? 1 : 0;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : NO_VALUE;
  if (typeof raw === "string") {
    const text = raw.trim();
    const lowered = text.toLowerCase();
    if (lowered === "true") return 1;
    if (lowered === "false") return 0;
    if (NUMBER_RE.test(text)) {
      const value = Number(text);
      if (Number.isFinite(value)) return value;
    }
    return lowered;
  }
  return UNSUPPORTED;
};

/** Python's repr() of a float, which is what the gateway sends. */
const pyRepr = (value: number): string => {
  const [mantissa, exp] = value.toExponential().split("e");
  const exponent = Number(exp);
  if (exponent < -4 || exponent >= 16) {
    const sign = exponent < 0 ? "-" : "+";
    return `${mantissa}e${sign}${String(Math.abs(exponent)).padStart(2, "0")}`;
  }
  const text = String(value);
  return Number.isInteger(value) ? `${text}.0` : text;
};

/** A number as the twin should receive it: "2", not "2.0". */
export const formatNumber = (value: number): string => {
  if (value === 0) return "0";
  if (Number.isInteger(value) && Math.abs(value) < FIXED_LIMIT) return String(value);
  return pyRepr(value);
};

/** A value sent without any rule. */
export const formatRaw = (raw: unknown): string => {
  if (typeof raw === "boolean") return raw ? "true" : "false";
  if (typeof raw === "number") return formatNumber(raw);
  return String(raw);
};

/** Round half away from zero on the exact binary value, then drop trailing zeros. */
const roundHalfUp = (value: number, decimals: number): string => {
  if (Math.abs(value) >= FIXED_LIMIT) return formatNumber(value);
  let text = value.toFixed(decimals);
  if (text.includes(".")) text = text.replace(/0+$/, "").replace(/\.$/, "");
  return text === "-0" || text === "" ? "0" : text;
};

// ─── Rules ───────────────────────────────────────────────────────────────────

class RuleError extends Error {}

const isObject = (value: unknown): value is Record<string, any> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const toNumber = (value: unknown, what: string): number => {
  let result: number;
  if (typeof value === "string" && NUMBER_RE.test(value.trim())) result = Number(value);
  else if (typeof value === "number") result = value;
  else throw new RuleError(`${what} must be a number`);
  if (!Number.isFinite(result)) throw new RuleError(`${what} must be finite`);
  return result;
};

const toText = (value: unknown, what: string): string => {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return formatNumber(value);
  throw new RuleError(`${what} must be text`);
};

const close = (a: number, b: number) =>
  Math.abs(a - b) <= Math.max(REL_TOL * Math.max(Math.abs(a), Math.abs(b)), ABS_TOL);

interface CompiledCase {
  out: string;
  matches: (value: Canon) => boolean;
}

const compileCase = (cfg: unknown): CompiledCase => {
  if (!isObject(cfg)) throw new RuleError("a case must be an object");
  const out = toText(cfg.out, 'case "out"');
  const kinds = ["eq", "bit"].filter(k => k in cfg).length + ("min" in cfg || "max" in cfg ? 1 : 0);
  if (kinds !== 1) throw new RuleError("a case needs exactly one of eq, min/max or bit");

  if ("eq" in cfg) {
    const eq = canon(toText(cfg.eq, 'case "eq"'));
    if (typeof eq === "symbol") throw new RuleError('case "eq" has no usable value');
    return {
      out,
      matches: value =>
        typeof eq === "number"
          ? typeof value === "number" && close(eq, value)
          : typeof value === "string" && eq === value,
    };
  }
  if ("bit" in cfg) {
    const bit = cfg.bit;
    if (typeof bit !== "number" || !Number.isInteger(bit)) throw new RuleError('case "bit" must be a whole number');
    if (bit < 0 || bit > MAX_BIT) throw new RuleError(`case "bit" must be between 0 and ${MAX_BIT}`);
    return {
      out,
      matches: value =>
        typeof value === "number" && value >= 0 && Number.isInteger(value) && value < 2 ** (MAX_BIT + 1) &&
        Math.floor(value / 2 ** bit) % 2 === 1,
    };
  }
  const min = cfg.min == null ? null : toNumber(cfg.min, 'case "min"');
  const max = cfg.max == null ? null : toNumber(cfg.max, 'case "max"');
  if (min === null && max === null) throw new RuleError("a range needs min or max");
  return {
    out,
    matches: value =>
      typeof value === "number" && (min === null || value >= min) && (max === null || value <= max),
  };
};

const DROP = Symbol("DROP");

interface CompiledRule {
  onError: string | null;
  apply: (raw: unknown, value: Canon) => string | typeof DROP;
}

const compileRule = (cfg: unknown): CompiledRule & { parameter: string } => {
  if (!isObject(cfg)) throw new RuleError("a rule must be an object");
  const parameter = cfg.parameter;
  if (typeof parameter !== "string" || parameter === "") throw new RuleError("a rule needs a parameter");
  const onError = cfg.on_error == null ? null : toText(cfg.on_error, "on_error");
  const hasMap = cfg.map != null;
  const hasLinear = cfg.linear != null;
  if (!hasMap && !hasLinear) throw new RuleError("a rule needs a map, a conversion or both");

  // The map: what a matched value becomes, null to let the value through unchanged, DROP to send nothing
  let map: ((value: Canon) => string | null | typeof DROP) | null = null;
  if (hasMap) {
    const spec = cfg.map;
    const cases = isObject(spec) ? ("cases" in spec ? spec.cases : []) : null;
    if (!Array.isArray(cases)) throw new RuleError("a map needs a list of cases");
    const compiled = cases.map(compileCase);
    const fallback = "fallback" in spec ? spec.fallback : "drop";
    let fallbackValue: string | null = null;
    if (fallback !== "drop" && fallback !== "raw") {
      if (!(isObject(fallback) && "value" in fallback)) throw new RuleError("fallback must be drop, raw or a value");
      fallbackValue = toText(fallback.value, "fallback value");
    }
    map = value => {
      if (value !== UNSUPPORTED) {
        for (const c of compiled) if (c.matches(value)) return c.out;
      }
      if (fallbackValue !== null) return fallbackValue;
      return fallback === "raw" ? null : DROP;
    };
  }

  let convert: ((value: number) => string | typeof DROP) | null = null;
  if (hasLinear) {
    const spec = cfg.linear;
    if (!isObject(spec)) throw new RuleError("linear must be an object");
    const factor = toNumber("factor" in spec ? spec.factor : 1, "factor");
    const offset = toNumber("offset" in spec ? spec.offset : 0, "offset");
    const decimals = spec.decimals == null ? DEFAULT_DECIMALS : toNumber(spec.decimals, "decimals");
    if (!Number.isInteger(decimals) || decimals < 0 || decimals > 10) {
      throw new RuleError("decimals must be a whole number from 0 to 10");
    }
    convert = value => {
      const result = value * factor + offset;
      return Number.isFinite(result) ? roundHalfUp(result, decimals) : DROP;
    };
  }

  return {
    parameter,
    onError,
    // The map runs first. What it puts out is converted when it is a number and
    // sent as it is when it is text; a value it lets through unchanged is
    // converted when it is a number and dropped when it is not.
    apply: (raw, value) => {
      const mapped = map ? map(value) : null;
      if (mapped === DROP) return DROP;
      if (!convert) return mapped ?? formatRaw(raw);
      if (mapped !== null) {
        const number = canon(mapped);
        return typeof number === "number" ? convert(number) : mapped;
      }
      return typeof value === "number" ? convert(value) : DROP;
    },
  };
};

/** Why a rule cannot be used, or undefined when it can. */
export const ruleError = (rule: unknown): string | undefined => {
  try {
    compileRule(rule);
    return undefined;
  } catch (e) {
    if (e instanceof RuleError) return e.message;
    throw e;
  }
};

// ─── The transformer ─────────────────────────────────────────────────────────

export interface Transformer {
  /** The text to send for a read value, or null to send nothing. */
  convert: (parameter: string, raw: unknown) => string | null;
  /** What to send when the parameter cannot be read, or null. */
  onError: (parameter: string) => string | null;
}

export const createTransformer = (transforms: unknown): Transformer => {
  const rules = new Map<string, CompiledRule>();
  const broken = new Set<string>();

  if (isObject(transforms) && Array.isArray(transforms.rules)) {
    const named = transforms.rules
      .filter((r: unknown) => isObject(r) && typeof r.parameter === "string")
      .map((r: { parameter: string }) => r.parameter);
    if (transforms.version !== SUPPORTED_VERSION) {
      named.forEach((p: string) => broken.add(p));
    } else {
      for (const cfg of transforms.rules) {
        try {
          const rule = compileRule(cfg);
          if (!rules.has(rule.parameter)) rules.set(rule.parameter, rule);
        } catch (e) {
          if (!(e instanceof RuleError)) throw e;
          if (isObject(cfg) && typeof cfg.parameter === "string") broken.add(cfg.parameter);
        }
      }
    }
  }

  const onError = (parameter: string) => rules.get(parameter)?.onError ?? null;
  return {
    onError,
    convert: (parameter, raw) => {
      if (broken.has(parameter)) return null;
      const value = canon(raw);
      if (value === NO_VALUE) return onError(parameter);
      const rule = rules.get(parameter);
      if (!rule) return formatRaw(raw);
      const out = rule.apply(raw, value);
      return out === DROP ? null : out;
    },
  };
};

/**
 * What a typed preview value stands for: numbers and true/false as a node
 * would deliver them, an empty box as "could not be read", anything else as text.
 */
export const parseTyped = (text: string): unknown => {
  const trimmed = text.trim();
  if (trimmed === "") return null;
  if (NUMBER_RE.test(trimmed)) return Number(trimmed);
  if (trimmed.toLowerCase() === "true") return true;
  if (trimmed.toLowerCase() === "false") return false;
  return text;
};
