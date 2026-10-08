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

/**
 * The parameters the Data Viewer offers for one asset.
 *
 * Two sources, joined rather than one standing in for the other:
 *  - what the asset is meant to report: every property Scorpio or the
 *    template files under the realtime segment, and every property Scorpio
 *    holds with an observedAt (a reading appended at runtime, which no
 *    template describes);
 *  - what it did report: every attribute with a recent row in the time
 *    series. A gateway can add parameters that reach the time series but
 *    never Scorpio, so these are offered even when nothing describes them.
 *
 * Only what is certainly not a reading is left out: an attribute filed under
 * another segment (a product name, an article number), a relationship, and a
 * sub-property (unit, segment, …), which the time-series view already drops.
 *
 * Pure on purpose: a function of the entity, the template and the rows, so it
 * is tested without Scorpio, the template service or PostgREST.
 */

export interface Parameter {
  /** The full attribute IRI: what the chart queries with. */
  attributeId: string;
  /** The last part of the IRI. */
  name: string;
  label: string;
  unit?: string;
  /** Scorpio or the template files it under the realtime segment. */
  declared: boolean;
  /** Scorpio has the property. False for one only the time series has seen. */
  inScorpio: boolean;
  /** The newest row in the time series, or null when there is none. */
  lastSeen: string | null;
  latestValue: string | null;
}

/** One row of the attribute_latest view (or the newest row of a scan). */
export interface LatestRow {
  attributeId?: unknown;
  attributeType?: unknown;
  value?: unknown;
  observedAt?: unknown;
}

interface TemplateProperty {
  segment?: string;
  title?: string;
  unit?: string;
}

const NOT_A_READING = new Set(['', 'null', 'undefined']);

/** Whether a stored value is a reading rather than a placeholder. */
export const isReading = (value: unknown): boolean =>
  value !== null && value !== undefined && !NOT_A_READING.has(String(value).trim().toLowerCase());

/** The last part of an attribute IRI: after the last "/" or "#", or after "eclass:". */
export const shortName = (iri: string): string => {
  if (iri.includes('eclass:')) return iri.split('eclass:').pop() || iri;
  return iri.split(/[/#]/).pop() || iri;
};

/** "target_pressure" and "targetPressure" read "Target Pressure". */
export const humanise = (name: string): string =>
  name
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

/** A template's unit may be a list; the first entry is the default. */
const firstUnit = (unit: unknown): string | undefined => {
  const first = Array.isArray(unit) ? unit.find((u) => typeof u === 'string' && u.trim()) : unit;
  return typeof first === 'string' && first.trim() && first !== 'null' ? first.trim() : undefined;
};

/** A sub-property's value, whether it is written { value } or bare. */
const subValue = (attr: any, ending: string): unknown => {
  if (!attr || typeof attr !== 'object') return undefined;
  const key = Object.keys(attr).find((k) => k.endsWith(ending));
  if (!key) return undefined;
  const v = attr[key];
  return v && typeof v === 'object' && 'value' in v ? v.value : v;
};

const READING_TYPES = new Set(['Property', 'ListProperty', 'JsonProperty', 'LanguageProperty']);

export const templateProperties = (template: any): Record<string, TemplateProperty> => {
  const out: Record<string, TemplateProperty> = {};
  const props = template?.properties;
  if (!props || typeof props !== 'object') return out;
  for (const [key, prop] of Object.entries<any>(props)) {
    out[shortName(key)] = {
      segment: typeof prop?.segment === 'string' ? prop.segment.toLowerCase() : undefined,
      title: typeof prop?.title === 'string' && prop.title.trim() ? prop.title.trim() : undefined,
      unit: firstUnit(prop?.unit),
    };
  }
  return out;
};

export const buildParameterList = (
  entity: Record<string, any> | null | undefined,
  template: any,
  rows: LatestRow[],
): Parameter[] => {
  const tpl = templateProperties(template);
  const found = new Map<string, Parameter>();

  const describe = (attributeId: string, attr: any): Parameter => {
    const name = shortName(attributeId);
    const unitSub = subValue(attr, 'unit');
    const unit =
      (typeof unitSub === 'string' && unitSub && unitSub !== 'null' ? unitSub : undefined) ??
      (typeof attr?.unitCode === 'string' ? attr.unitCode : undefined) ??
      tpl[name]?.unit;
    return {
      attributeId,
      name,
      label: tpl[name]?.title ?? humanise(name),
      ...(unit ? { unit } : {}),
      declared: false,
      inScorpio: !!attr,
      lastSeen: null,
      latestValue: null,
    };
  };

  /** The segment the template or Scorpio files a property under, if any. */
  const segmentOf = (name: string, attr: any): string | undefined => {
    const fromScorpio = subValue(attr, 'segment');
    return tpl[name]?.segment ?? (typeof fromScorpio === 'string' ? fromScorpio.toLowerCase() : undefined);
  };

  // What the asset is meant to report
  const properties: Record<string, any> = {};
  for (const [key, raw] of Object.entries(entity ?? {})) {
    const attr = Array.isArray(raw) ? raw[0] : raw;
    if (!attr || typeof attr !== 'object' || !READING_TYPES.has(attr.type)) continue;
    properties[key] = attr;
    const segment = segmentOf(shortName(key), attr);
    const realtime = segment === 'realtime';
    if (realtime || (segment === undefined && 'observedAt' in attr)) {
      found.set(key, { ...describe(key, attr), declared: realtime });
    }
  }

  // What it did report
  for (const row of Array.isArray(rows) ? rows : []) {
    const attributeId = typeof row?.attributeId === 'string' ? row.attributeId : '';
    if (!attributeId) continue;
    if (typeof row.attributeType === 'string' && /relationship/i.test(row.attributeType)) continue;
    const attr = properties[attributeId];
    const segment = segmentOf(shortName(attributeId), attr);
    if (segment !== undefined && segment !== 'realtime') continue;

    const entry = found.get(attributeId) ?? { ...describe(attributeId, attr), declared: segment === 'realtime' };
    const observedAt = typeof row.observedAt === 'string' ? row.observedAt : null;
    if (observedAt && (!entry.lastSeen || observedAt > entry.lastSeen)) {
      entry.lastSeen = observedAt;
      entry.latestValue = isReading(row.value) ? String(row.value) : null;
    }
    found.set(attributeId, entry);
  }

  return [...found.values()].sort((a, b) => a.label.localeCompare(b.label));
};

/** The newest row per attribute, from rows in any order (for when the view is missing). */
export const latestPerAttribute = (rows: LatestRow[]): LatestRow[] => {
  const newest = new Map<string, LatestRow>();
  for (const row of Array.isArray(rows) ? rows : []) {
    if (typeof row?.attributeId !== 'string') continue;
    const seen = newest.get(row.attributeId);
    if (!seen || String(row.observedAt ?? '') > String(seen.observedAt ?? '')) newest.set(row.attributeId, row);
  }
  return [...newest.values()];
};
