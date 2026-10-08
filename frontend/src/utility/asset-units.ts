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

import { attrValue } from "@/utility/ngsi-links";

/**
 * The unit of each property of a raw NGSI-LD entity, keyed by property IRI.
 * The same lookup as the sensor chart: the sub-property whose key ends in
 * "unit" holds the symbol ("°C"); the UN/CEFACT unitCode ("CEL") is the fallback.
 */
export const propertyUnitMap = (entity: Record<string, any> | null | undefined): Record<string, string> => {
  const units: Record<string, string> = {};
  if (!entity) return units;
  for (const [key, attr] of Object.entries(entity)) {
    const instance = Array.isArray(attr) ? attr[0] : attr;
    if (!instance || typeof instance !== "object") continue;
    const entries = Object.entries(instance as Record<string, any>);
    const unitEntry =
      entries.find(([innerKey]) => innerKey.endsWith("unit")) ??
      entries.find(([innerKey]) => innerKey === "unitCode");
    if (!unitEntry) continue;
    const value = unitEntry[1];
    const text = typeof value === "object" && value !== null ? attrValue(value) : value;
    if (typeof text === "string" && text !== "" && text !== "null") units[key] = text;
  }
  return units;
};
