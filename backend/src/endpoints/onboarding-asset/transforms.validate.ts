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

// Shape check for the value transforms an onboarding app config carries
// (app_config.fusionopcuadataservice.transforms). The gateway's data service
// is the real judge and drops a rule it cannot use; this only stops a bad
// shape from being stored. Everything other than `transforms` is left alone.

const SUPPORTED_VERSION = 1;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

// Numbers may arrive as numbers or numeric text. The same pattern as the
// gateway's: no hex, underscores or "Infinity".
const NUMBER_RE = /^[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?$/;
const isNumeric = (value: unknown): boolean =>
  (typeof value === 'number' && Number.isFinite(value)) ||
  (typeof value === 'string' && NUMBER_RE.test(value.trim()) && Number.isFinite(Number(value)));

const isText = (value: unknown): boolean =>
  typeof value === 'string' || (typeof value === 'number' && Number.isFinite(value));

const caseProblem = (c: unknown, where: string): string | undefined => {
  if (!isObject(c)) return `${where} must be an object`;
  if (!isText(c.out)) return `${where} needs an "out" value`;
  const kinds = ['eq', 'bit'].filter(k => k in c).length + ('min' in c || 'max' in c ? 1 : 0);
  if (kinds !== 1) return `${where} needs exactly one of eq, min/max or bit`;
  if ('eq' in c && !isText(c.eq)) return `${where} "eq" must be text`;
  for (const bound of ['min', 'max']) {
    if (c[bound] != null && !isNumeric(c[bound])) return `${where} "${bound}" must be a number`;
  }
  if (('min' in c || 'max' in c) && c.min == null && c.max == null) return `${where} needs min or max`;
  if ('bit' in c && !(Number.isInteger(Number(c.bit)) && Number(c.bit) >= 0 && Number(c.bit) <= 52)) {
    return `${where} "bit" must be a whole number from 0 to 52`;
  }
  return undefined;
};

const ruleProblem = (rule: unknown, where: string): string | undefined => {
  if (!isObject(rule)) return `${where} must be an object`;
  if (typeof rule.parameter !== 'string' || rule.parameter === '') return `${where} needs a parameter`;
  where = `rule for ${rule.parameter}`;
  if (rule.map == null && rule.linear == null) return `${where} needs a map, a conversion or both`;
  if (rule.on_error != null && !isText(rule.on_error)) return `${where} "on_error" must be text`;

  if (rule.map != null) {
    const map = rule.map;
    if (!isObject(map)) return `${where}: map must be an object`;
    if ('cases' in map && !Array.isArray(map.cases)) return `${where}: map cases must be a list`;
    const cases = (map.cases ?? []) as unknown[];
    for (let i = 0; i < cases.length; i++) {
      const problem = caseProblem(cases[i], `${where}, case ${i + 1}`);
      if (problem) return problem;
    }
    const fallback = map.fallback;
    if (fallback != null && fallback !== 'drop' && fallback !== 'raw' && !(isObject(fallback) && isText(fallback.value))) {
      return `${where}: fallback must be drop, raw or {value}`;
    }
    if (rule.linear == null) return undefined;
  }

  const linear = rule.linear;
  if (!isObject(linear)) return `${where}: linear must be an object`;
  for (const key of ['factor', 'offset']) {
    if (linear[key] != null && !isNumeric(linear[key])) return `${where}: ${key} must be a number`;
  }
  if (linear.decimals != null) {
    const decimals = Number(linear.decimals);
    if (!isNumeric(linear.decimals) || !Number.isInteger(decimals) || decimals < 0 || decimals > 10) {
      return `${where}: decimals must be a whole number from 0 to 10`;
    }
  }
  return undefined;
};

/**
 * The first problem with the transforms in an app config, or undefined when
 * there are none or they are well formed. Null, text and configs without
 * transforms are fine.
 */
export const transformsProblem = (appConfig: unknown): string | undefined => {
  if (!isObject(appConfig)) return undefined;
  const service = appConfig.fusionopcuadataservice;
  if (!isObject(service) || service.transforms == null) return undefined;

  const transforms = service.transforms;
  if (!isObject(transforms)) return 'transforms must be an object';
  if (transforms.version !== SUPPORTED_VERSION) return `transforms version must be ${SUPPORTED_VERSION}`;
  if (!Array.isArray(transforms.rules)) return 'transforms needs a list of rules';

  const seen = new Set<string>();
  for (let i = 0; i < transforms.rules.length; i++) {
    const rule = transforms.rules[i];
    const problem = ruleProblem(rule, `rule ${i + 1}`);
    if (problem) return problem;
    const parameter = (rule as { parameter: string }).parameter;
    if (seen.has(parameter)) return `two rules for ${parameter}`;
    seen.add(parameter);
  }
  return undefined;
};
