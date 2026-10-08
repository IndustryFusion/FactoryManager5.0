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

// The data mappings of an onboarding as YAML, in the shape the gateway's data
// service reads (config.yaml), so they can be pasted and edited as text and
// kept in step with the form.

import YAML from "yaml";

export type SpecProtocol = "opc-ua" | "mqtt";

const SERVICE: Record<SpecProtocol, string> = {
  "opc-ua": "fusionopcuadataservice",
  mqtt: "fusionmqttdataservice",
};

export const specToYaml = (protocol: SpecProtocol, items: unknown[]): string =>
  YAML.stringify({ [SERVICE[protocol]]: { specification: items } }, { indent: 2 });

export type SpecParse =
  | { items: any[]; note?: string }
  | { error: string; line?: number };

const text = (value: unknown): string | undefined => {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return undefined;
};

const opcUaItem = (raw: any, n: number): any => {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) throw new Error(`Mapping ${n} must be a set of fields`);
  let nodeId = text(raw.node_id);
  let identifier = text(raw.identifier);
  // "ns=4;i=39" in node_id alone is split, as the form's prefill does
  if (nodeId && !identifier && nodeId.includes(";")) {
    const parts = nodeId.split(";");
    nodeId = parts[0];
    identifier = parts.slice(1).join(";");
  }
  const parameter = text(raw.parameter);
  if (!nodeId) throw new Error(`Mapping ${n}: node_id is missing (e.g. ns=4)`);
  if (!identifier) throw new Error(`Mapping ${n}: identifier is missing (e.g. i=39)`);
  if (!parameter) throw new Error(`Mapping ${n}: parameter is missing (the property IRI)`);
  return { ...raw, node_id: nodeId, identifier, parameter };
};

const mqttItem = (raw: any, n: number): any => {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) throw new Error(`Mapping ${n} must be a set of fields`);
  const topic = text(raw.topic);
  if (!topic) throw new Error(`Mapping ${n}: topic is missing`);
  const list = (value: unknown) => (value == null ? [] : Array.isArray(value) ? value : [value]);
  const parameter = list(raw.parameter).map(text);
  if (parameter.length === 0 || parameter.some(p => !p)) throw new Error(`Mapping ${n}: parameter needs at least one property IRI`);
  const key = list(raw.key).map(text);
  if (key.some(k => k === undefined)) throw new Error(`Mapping ${n}: key must be a list of names`);
  return { ...raw, topic, key, parameter };
};

/**
 * Read mappings from YAML. Accepts the whole service block
 * (`fusionopcuadataservice: {specification: [...]}`), just
 * `specification: [...]`, or the bare list.
 */
export const parseSpecYaml = (protocol: SpecProtocol, source: string): SpecParse => {
  const doc = YAML.parseDocument(source, { prettyErrors: true });
  if (doc.errors.length > 0) {
    const error = doc.errors[0];
    return { error: error.message.split("\n")[0].replace(/ at line \d+, column \d+:?$/, ""), line: error.linePos?.start.line };
  }
  let value: any = doc.toJSON();
  if (value == null) return { items: [] };

  let note: string | undefined;
  const own = SERVICE[protocol];
  const other = SERVICE[protocol === "opc-ua" ? "mqtt" : "opc-ua"];
  if (typeof value === "object" && !Array.isArray(value)) {
    if (other in value && !(own in value)) {
      return { error: `This is a ${other} configuration; these mappings are for ${own}` };
    }
    if (own in value) value = value[own];
    if (value && typeof value === "object" && !Array.isArray(value)) {
      if ("transforms" in value) note = "transforms are set in the Value Transforms step and were not taken from here";
      if (!("specification" in value)) return { error: "No specification list found" };
      value = value.specification;
    }
  }
  if (value == null) return { items: [], note };
  if (!Array.isArray(value)) return { error: "specification must be a list of mappings" };

  try {
    const items = value.map((raw, i) => (protocol === "opc-ua" ? opcUaItem(raw, i + 1) : mqttItem(raw, i + 1)));
    return { items, note };
  } catch (e) {
    return { error: (e as Error).message };
  }
};
