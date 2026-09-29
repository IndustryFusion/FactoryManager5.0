// 
// Copyright (c) 2026 IB Systems GmbH 
// 
// Licensed under the Apache License, Version 2.0 (the "License"); 
// you may not use this file except in compliance with the License. 
// You may obtain a copy of the License at 
// 
//    http://www.apache.org/licenses/LICENSE-2.0 
// 
// Unless required by applicable law or agreed to in writing, software 
// distributed under the License is distributed on an "AS IS" BASIS, 
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. 
// See the License for the specific language governing permissions and 
// limitations under the License. 
// 

/**
 * What an asset actually reported, worked out from the rows themselves.
 *
 * The Data Viewer used to ask the NGSI-LD entity which of its properties are
 * sensors. That is a statement of intent: a gateway can write an attribute to
 * the time series that the entity never marked `realtime`, and the entity can
 * declare a sensor that has never reported. This reads the other way round —
 * the time series says what exists, and the caller filters it with whatever
 * metadata it has.
 *
 * Pure on purpose: everything here is a function of the rows, so it can be
 * tested without a database and without axios.
 */

/** Every attribute the chart can query; see the note on `shortAttributeName`. */
export const IFF_BASE = 'https://industry-fusion.org/base/v0.1/';

/** Values that are present in a row but are not a reading. */
const NOT_A_READING = new Set(['', 'null', 'undefined']);

export interface TimeSeriesRow {
  attributeId?: unknown;
  value?: unknown;
  observedAt?: unknown;
}

export interface ReportedAttribute {
  /** The short key, which is what the chart queries with. */
  attribute: string;
  attributeId: string;
  /** The newest real reading in the window, or null if there was none. */
  latestValue: string | null;
  observedAt: string | null;
  /** How many rows carried a reading. */
  samples: number;
  /** More than one distinct reading — the test for "this is a measurement". */
  changed: boolean;
}

/**
 * The short key for an attributeId, or null when the chart could not query it.
 *
 * `PgRestService.findAll` prefixes the short key with IFF_BASE when it builds
 * the upstream query, so an attribute in any other namespace is unreachable.
 * Offering one would give the user an option that charts nothing.
 */
export const shortAttributeName = (attributeId: unknown): string | null => {
  if (typeof attributeId !== 'string' || !attributeId.startsWith(IFF_BASE)) {
    return null;
  }
  const name = attributeId.slice(IFF_BASE.length);
  return name === '' || name.includes('/') ? null : name;
};

/** Whether a stored value is a reading rather than a placeholder. */
export const isReading = (value: unknown): boolean => {
  if (value === null || value === undefined) return false;
  return !NOT_A_READING.has(String(value).trim().toLowerCase());
};

/**
 * One entry per attribute, from rows ordered newest first.
 *
 * The order is what makes the first row seen the latest one, so this never
 * compares timestamps. The distinct-value set is capped at two entries: the
 * question is only whether the value ever changes, and an attribute reporting
 * at 1 Hz for twenty-one hours would otherwise be held in memory in full.
 */
export const summariseRows = (rows: TimeSeriesRow[]): ReportedAttribute[] => {
  const seen = new Map<string, ReportedAttribute & { distinct: Set<string> }>();

  for (const row of Array.isArray(rows) ? rows : []) {
    const attribute = shortAttributeName(row?.attributeId);
    if (!attribute) continue;

    let entry = seen.get(attribute);
    if (!entry) {
      entry = {
        attribute,
        attributeId: String(row.attributeId),
        latestValue: null,
        observedAt: null,
        samples: 0,
        changed: false,
        distinct: new Set<string>(),
      };
      seen.set(attribute, entry);
    }

    if (!isReading(row?.value)) continue;

    const value = String(row.value);
    entry.samples++;
    if (entry.latestValue === null) {
      entry.latestValue = value;
      entry.observedAt =
        typeof row?.observedAt === 'string' ? row.observedAt : null;
    }
    if (!entry.changed) {
      entry.distinct.add(value);
      entry.changed = entry.distinct.size > 1;
    }
  }

  // Alphabetical, so the dropdown keeps its order between refreshes. Recency
  // would reorder it under the reader every time the list is fetched again.
  return [...seen.values()]
    .map(({ distinct, ...attribute }) => attribute)
    .sort((a, b) => a.attribute.localeCompare(b.attribute));
};
