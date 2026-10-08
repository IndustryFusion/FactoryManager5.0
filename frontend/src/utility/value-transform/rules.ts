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

import { SUPPORTED_VERSION, TransformRule, Transforms, ruleError } from "./engine";
import { legacyRule, shortName } from "./presets";
import { matchKey, matchLabel } from "./parameter-rule";

// The first data service image that applies value transforms. Older images
// ignore them and keep their built-in machine-state handling.
export const TRANSFORMS_IMAGE_TAG = "v0.1.0";
export const DEFAULT_OPCUA_IMAGE = `docker.io/ibn40/fusionopcuadataservice:${TRANSFORMS_IMAGE_TAG}`;
export const DEFAULT_MQTT_IMAGE = `docker.io/ibn40/fusionmqttdataservice:${TRANSFORMS_IMAGE_TAG}`;

export type DataProtocol = "opc-ua" | "mqtt";

/** The app config key of each protocol's data service. */
export const SERVICE_KEY: Record<DataProtocol, string> = {
  "opc-ua": "fusionopcuadataservice",
  mqtt: "fusionmqttdataservice",
};

export const ruleFor = (rules: TransformRule[], parameter: string) =>
  rules.find(rule => rule.parameter === parameter);

/** The rules with `parameter`'s rule replaced, added, or (with undefined) removed. */
export const setRule = (rules: TransformRule[], parameter: string, rule: TransformRule | undefined) => {
  const others = rules.filter(r => r.parameter !== parameter);
  if (!rule) return others;
  const at = rules.findIndex(r => r.parameter === parameter);
  if (at < 0) return [...rules, rule];
  return rules.map(r => (r.parameter === parameter ? rule : r));
};

/** The rules for parameters still mapped; a rule for a removed mapping is dropped. */
export const pruneRules = (rules: TransformRule[], parameters: string[]) =>
  rules.filter(rule => parameters.includes(rule.parameter));

export const buildTransforms = (rules: TransformRule[]): Transforms | undefined =>
  rules.length > 0 ? { version: SUPPORTED_VERSION, rules } : undefined;

/** The rules stored in an app config, for whichever data service it configures, or none. */
export const rulesFromConfig = (appConfig: any): TransformRule[] => {
  const service = appConfig?.[SERVICE_KEY["opc-ua"]] ?? appConfig?.[SERVICE_KEY.mqtt];
  const rules = service?.transforms?.rules;
  return Array.isArray(rules) ? rules : [];
};

/** The parameters a list of mappings sends, in order: OPC UA has one per mapping, MQTT one or more. */
export const parametersOf = (items: any[]): string[] => {
  const out: string[] = [];
  for (const item of items ?? []) {
    const params = Array.isArray(item?.parameter) ? item.parameter : [item?.parameter];
    for (const p of params) if (typeof p === "string" && p.trim() && !out.includes(p)) out.push(p);
  }
  return out;
};

/** An app config for a data service: its mappings, and the rules for those mappings if any. */
export const appConfigFor = (protocol: DataProtocol, items: any[], rules: TransformRule[]) => {
  const transforms = buildTransforms(pruneRules(rules, parametersOf(items)));
  return { [SERVICE_KEY[protocol]]: { specification: items, ...(transforms && { transforms }) } };
};

/** Parameters the data service used to treat as states: any IRI with a "_state" part. */
export const hadBuiltInStateHandling = (parameter: string) => parameter.split("_").includes("state");

/**
 * Give every state parameter that has not been looked at yet the legacy rule,
 * so moving to a data service that applies rules changes nothing until the
 * user says otherwise. `seen` remembers the parameters already offered, so a
 * rule the user removed is not put back. Returns `rules` itself when nothing
 * was added.
 */
export const seedLegacyRules = (rules: TransformRule[], parameters: string[], seen: Set<string>) => {
  let next = rules;
  for (const parameter of parameters) {
    if (seen.has(parameter)) continue;
    seen.add(parameter);
    if (hadBuiltInStateHandling(parameter) && !ruleFor(next, parameter)) next = [...next, legacyRule(parameter)];
  }
  return next;
};

/** What is wrong with each rule the user is editing, by parameter. */
export const ruleProblems = (rules: TransformRule[]): { parameter: string; message: string }[] => {
  const problems: { parameter: string; message: string }[] = [];
  for (const rule of rules) {
    const label = shortName(rule.parameter);
    const cases = rule.map?.cases ?? [];
    const incomplete = cases.findIndex(c =>
      ("eq" in c && String(c.eq ?? "").trim() === "") ||
      (("min" in c || "max" in c) && c.min == null && c.max == null) ||
      ("bit" in c && c.bit == null) ||
      String(c.out ?? "").trim() === "");
    if (incomplete >= 0) {
      problems.push({ parameter: rule.parameter, message: `${label}: row ${incomplete + 1} is not filled in` });
      continue;
    }
    const error = ruleError(rule);
    if (error) {
      problems.push({ parameter: rule.parameter, message: `${label}: ${error}` });
      continue;
    }
    // The same machine value with two meanings: only the first would ever apply.
    const meaning = new Map<string, string>();
    const twice = cases.find(c => {
      const key = matchKey(c);
      if (meaning.has(key) && meaning.get(key) !== c.out) return true;
      meaning.set(key, c.out);
      return false;
    });
    if (twice) problems.push({ parameter: rule.parameter, message: `${label}: ${matchLabel(twice)} is listed with two different meanings` });
  }
  return problems;
};

// ─── Data service image ─────────────────────────────────────────────────────

/** One of the published data service images, whose version tells whether it applies rules. */
export const isDataServiceImage = (image: string | undefined) => !!image && /fusion(opcua|mqtt)dataservice/.test(image);

const imageTag = (image: string) => {
  const name = image.split("/").pop() ?? "";
  const colon = name.lastIndexOf(":");
  return colon < 0 ? "" : name.slice(colon + 1);
};

/**
 * Does the data service image apply value transforms? Only the published OPC UA
 * and MQTT data service images can be judged; any other image is assumed to.
 * No image at all does not.
 */
export const imageAppliesTransforms = (image: string | undefined): boolean => {
  if (!image) return false;
  if (!isDataServiceImage(image)) return true;
  const version = /^v?(\d+)\.(\d+)\.(\d+)/.exec(imageTag(image!));
  if (!version) return false;
  const [major, minor] = [Number(version[1]), Number(version[2])];
  return major > 0 || minor >= 1;
};

/** The same image at the first version that applies transforms, or the protocol's default image. */
export const upgradedImage = (image: string | undefined, protocol: DataProtocol) => {
  if (!isDataServiceImage(image)) return protocol === "mqtt" ? DEFAULT_MQTT_IMAGE : DEFAULT_OPCUA_IMAGE;
  const name = image!.split("/").pop() ?? "";
  const base = name.includes(":") ? image!.slice(0, image!.lastIndexOf(":")) : image!;
  return `${base}:${TRANSFORMS_IMAGE_TAG}`;
};
