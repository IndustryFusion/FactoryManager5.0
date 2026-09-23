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
 * Is the machine running, from a machine_state reading?
 *
 * 0 means not running. Everything that is not a real reading — missing, empty,
 * the "NULL" placeholder, or text that is not a number — is not running either,
 * because a machine that reports nothing is not known to be running.
 *
 * The checks this replaces compared the raw value with the *strings* "0" and
 * "NULL", so a numeric 0 (what the product record carries before the first
 * reading) passed as "running".
 */
export const isMachineRunning = (value: unknown): boolean => {
  if (value === null || value === undefined) return false;
  const text = String(value).trim();
  if (text === "" || text === "NULL" || text === "undefined") return false;
  const state = Number(text);
  return Number.isFinite(state) && state !== 0;
};
