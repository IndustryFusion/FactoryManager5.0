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

import { TransformRule } from "./engine";
import { findUnit } from "./units";

export const MACHINE_STATE_IRI = "https://industry-fusion.org/base/v0.1/machine_state";

/** The last segment of a property IRI: "machine_state". */
export const shortName = (iri: string) => iri.split(/[/#]/).pop() || iri;

export const isMachineState = (parameter: string) => shortName(parameter) === "machine_state";

/** A property name for people: "target_pressure" and "targetPressure" read "Target pressure". */
export const propertyLabel = (iri: string) => {
  const words = shortName(iri).replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ").trim().toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

/**
 * What the digital twin expects for a property, which is what a rule must
 * produce:
 * - "state": machine_state, "0" / "1" / "2" (Offline / Online Idle / Online Running)
 * - "unit": a number in this unit. Power is always W, whatever the asset
 *   declares, because the power and CO₂ views divide it by 1000 for kWh.
 * - "free": anything; the twin attaches no meaning to it.
 */
export type Target = { kind: "state" } | { kind: "unit"; unit: string } | { kind: "free"; unit?: string };

export const targetFor = (parameter: string, unit: string | undefined): Target => {
  if (isMachineState(parameter)) return { kind: "state" };
  if (shortName(parameter) === "power_consumption") return { kind: "unit", unit: "W" };
  const known = findUnit(unit);
  if (known) return { kind: "unit", unit: known.unit.symbol };
  return { kind: "free", unit };
};

// ─── Presets ────────────────────────────────────────────────────────────────

/**
 * What the data service did before rules existed, for parameters whose name
 * has a "_state" part: Online Running whenever the node can be read, Offline
 * when it cannot.
 */
export const legacyRule = (parameter: string): TransformRule => ({
  parameter,
  map: { cases: [], fallback: { value: "2" } },
  on_error: "0",
});

/** True when a rule is still the untouched legacy rule, which the user should review. */
export const isLegacyRule = (rule: TransformRule | undefined): boolean => {
  const fallback = rule?.map?.fallback;
  return !!rule?.map && !rule.linear && (rule.map.cases ?? []).length === 0 &&
    typeof fallback === "object" && fallback.value === "2" && rule.on_error === "0";
};

/**
 * For a machine with no state node: ServerStatus.State (ns=0;i=2259), which
 * every OPC UA server has, is 0 while the server runs. So the machine shows
 * Online Running while its server can be reached and Offline when it cannot.
 */
export const SERVER_STATE_NODE = { node_id: "ns=0", identifier: "i=2259" };

export const serverReachableRule = (parameter: string): TransformRule => ({
  parameter,
  map: { cases: [{ eq: "0", out: "2" }], fallback: { value: "0" } },
  on_error: "0",
});
