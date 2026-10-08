//
// Copyright (c) 2024 IB Systems GmbH
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

/**
 * The values machine_state takes in the digital twin. Gateways send these
 * after applying the asset's value transforms, and the stats views count hours
 * per value (backend/src/bootstrap/pdt-views.sql.ts).
 */
export const MACHINE_STATE_OPTIONS = [
  { value: "0", label: "Offline", tone: "offline" },
  { value: "1", label: "Online Idle", tone: "idle" },
  { value: "2", label: "Online Running", tone: "running" },
] as const;

export type MachineState = "running" | "idle" | "offline";

/**
 * Which of the three states a machine_state reading means.
 *
 * 0 is offline, 1 is online but idle. Everything that is not a real reading —
 * missing, empty, the "NULL" placeholder, or text that is not a number — is
 * offline too, because a machine that reports nothing is not known to be on.
 * Any other number counts as running, as every non-zero value did before idle
 * was told apart.
 */
export const machineStateOf = (value: unknown): MachineState => {
  if (value === null || value === undefined) return "offline";
  const text = String(value).trim();
  if (text === "" || text === "NULL" || text === "undefined") return "offline";
  const state = Number(text);
  if (!Number.isFinite(state) || state === 0) return "offline";
  return state === 1 ? "idle" : "running";
};

/**
 * Is the machine running, from a machine_state reading? Idle (1) is online
 * but not running. See machineStateOf.
 *
 * The checks this replaces compared the raw value with the *strings* "0" and
 * "NULL", so a numeric 0 (what the product record carries before the first
 * reading) passed as "running".
 */
export const isMachineRunning = (value: unknown): boolean =>
  machineStateOf(value) === "running";
