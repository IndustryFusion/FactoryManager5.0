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

import {
  IFF_BASE,
  isReading,
  shortAttributeName,
  summariseRows,
  TimeSeriesRow,
} from './reported-attributes';

/** Rows as PostgREST returns them: newest first, values as text. */
const row = (name: string, value: unknown, observedAt: string): TimeSeriesRow => ({
  attributeId: `${IFF_BASE}${name}`,
  value,
  observedAt,
});

describe('shortAttributeName', () => {
  it('strips the base namespace', () => {
    expect(shortAttributeName(`${IFF_BASE}active_current`)).toBe('active_current');
  });

  it('rejects an attribute the chart could not query', () => {
    // findAll prefixes the short key with IFF_BASE, so nothing else is reachable.
    expect(shortAttributeName('https://example.com/v1/temperature')).toBeNull();
    expect(shortAttributeName(`${IFF_BASE}eclass/0173-1`)).toBeNull();
    expect(shortAttributeName(IFF_BASE)).toBeNull();
    expect(shortAttributeName(undefined)).toBeNull();
    expect(shortAttributeName(42)).toBeNull();
  });
});

describe('isReading', () => {
  it('accepts a value, including zero and text', () => {
    expect(isReading('0')).toBe(true);
    expect(isReading(0)).toBe(true);
    expect(isReading('Idle')).toBe(true);
  });

  it('rejects the placeholders these rows carry', () => {
    expect(isReading(null)).toBe(false);
    expect(isReading(undefined)).toBe(false);
    expect(isReading('')).toBe(false);
    expect(isReading('  ')).toBe(false);
    expect(isReading('NULL')).toBe(false);
  });
});

describe('summariseRows', () => {
  it('takes the newest row as the latest reading', () => {
    const [entry] = summariseRows([
      row('active_current', '12.4', '2026-09-29T10:00:30Z'),
      row('active_current', '12.1', '2026-09-29T10:00:29Z'),
      row('active_current', '11.8', '2026-09-29T10:00:28Z'),
    ]);

    expect(entry.attribute).toBe('active_current');
    expect(entry.attributeId).toBe(`${IFF_BASE}active_current`);
    expect(entry.latestValue).toBe('12.4');
    expect(entry.observedAt).toBe('2026-09-29T10:00:30Z');
    expect(entry.samples).toBe(3);
  });

  it('reports a constant value as unchanged', () => {
    const [entry] = summariseRows([
      row('production_name', 'Bracket A', '2026-09-29T10:00:30Z'),
      row('production_name', 'Bracket A', '2026-09-29T10:00:00Z'),
    ]);

    expect(entry.changed).toBe(false);
  });

  it('reports a second distinct value as changed', () => {
    const [entry] = summariseRows([
      row('machine_state', '2', '2026-09-29T10:00:30Z'),
      row('machine_state', '2', '2026-09-29T10:00:00Z'),
      row('machine_state', '0', '2026-09-29T09:59:30Z'),
    ]);

    expect(entry.changed).toBe(true);
  });

  it('stops collecting distinct values once it has its answer', () => {
    // A 1 Hz attribute over a 21-hour window is ~75k rows; the set must not
    // grow with them.
    const rows = Array.from({ length: 5000 }, (_, i) =>
      row('active_current', String(i), `2026-09-29T10:00:${i}Z`),
    );

    const [entry] = summariseRows(rows);
    expect(entry.changed).toBe(true);
    expect(entry.samples).toBe(5000);
  });

  it('keeps an attribute that only ever reported placeholders, with no reading', () => {
    const [entry] = summariseRows([
      row('ambient_operating_temperature_max', 'NULL', '2026-09-29T10:00:30Z'),
      row('ambient_operating_temperature_max', '', '2026-09-29T10:00:00Z'),
    ]);

    expect(entry.latestValue).toBeNull();
    expect(entry.observedAt).toBeNull();
    expect(entry.samples).toBe(0);
    expect(entry.changed).toBe(false);
  });

  it('skips attributes outside the base namespace', () => {
    const summary = summariseRows([
      { attributeId: 'https://example.com/v1/temperature', value: '20', observedAt: 'x' },
      row('active_current', '12.4', '2026-09-29T10:00:30Z'),
    ]);

    expect(summary.map((entry) => entry.attribute)).toEqual(['active_current']);
  });

  it('orders alphabetically, not by recency, so the dropdown holds still', () => {
    const summary = summariseRows([
      row('machine_state', '2', '2026-09-29T10:00:30Z'),
      row('active_current', '12.4', '2026-09-29T10:00:29Z'),
      row('bar_code', 'X1', '2026-09-29T10:00:28Z'),
    ]);

    expect(summary.map((entry) => entry.attribute)).toEqual([
      'active_current',
      'bar_code',
      'machine_state',
    ]);
  });

  it('answers an empty window with an empty list', () => {
    expect(summariseRows([])).toEqual([]);
    expect(summariseRows(undefined as any)).toEqual([]);
  });
});
