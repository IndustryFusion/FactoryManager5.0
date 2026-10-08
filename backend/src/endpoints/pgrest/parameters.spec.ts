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
import { buildParameterList, humanise, latestPerAttribute, shortName } from './parameters';

const B = 'https://industry-fusion.org/base/v0.1/';
const prop = (value: unknown, extra: Record<string, unknown> = {}) => ({ type: 'Property', value, ...extra });
const seg = (segment: string) => ({ [`${B}segment`]: { type: 'Property', value: segment } });
const unit = (u: string) => ({ [`${B}unit`]: { type: 'Property', value: u } });

// A laser cutter as Scorpio holds it: three declared sensors, a description,
// a relationship, and a reading the gateway appended at runtime.
const entity = {
  id: 'urn:ifric:asset-1',
  type: 'https://industry-fusion.org/eclass#0173-1#01-AKJ975#017',
  [`${B}machine_state`]: prop('2', seg('realtime')),
  [`${B}target_pressure`]: prop('0', { ...seg('realtime'), ...unit('Bar') }),
  [`${B}nozzle_diameter`]: prop('0', { ...seg('realtime'), ...unit('mm') }),
  [`${B}product_name`]: prop('Laser Cutter', seg('identification')),
  [`${B}hasFilter`]: { type: 'Relationship', object: 'urn:ifric:filter-1' },
  [`${B}door_open`]: prop('false', { observedAt: '2026-10-08T09:00:00Z' }),
};

const template = {
  properties: {
    machine_state: { segment: 'realtime', title: 'Machine State' },
    target_pressure: { segment: 'realtime', unit: ['Bar', 'mbar'] },
    product_name: { segment: 'identification' },
  },
};

const rows = [
  { attributeId: `${B}machine_state`, attributeType: 'https://uri.etsi.org/ngsi-ld/Property', value: '2', observedAt: '2026-10-08T10:00:05Z' },
  { attributeId: `${B}target_pressure`, attributeType: 'https://uri.etsi.org/ngsi-ld/Property', value: '4.5', observedAt: '2026-10-08T10:00:05Z' },
  // Only in the time series: the gateway added it, Scorpio missed it
  { attributeId: `${B}spindle_load`, attributeType: 'https://uri.etsi.org/ngsi-ld/Property', value: '37', observedAt: '2026-10-08T10:00:04Z' },
  { attributeId: `${B}product_name`, attributeType: 'https://uri.etsi.org/ngsi-ld/Property', value: 'Laser Cutter', observedAt: '2026-10-01T08:00:00Z' },
  { attributeId: `${B}hasFilter`, attributeType: 'https://uri.etsi.org/ngsi-ld/Relationship', value: 'urn:ifric:filter-1', observedAt: '2026-10-01T08:00:00Z' },
];

const byName = (list: ReturnType<typeof buildParameterList>) => Object.fromEntries(list.map((p) => [p.name, p]));

describe('the parameters the Data Viewer offers', () => {
  const list = buildParameterList(entity, template, rows);
  const p = byName(list);

  it('offers what was declared and what was reported, together', () => {
    expect(Object.keys(p).sort()).toEqual(['door_open', 'machine_state', 'nozzle_diameter', 'spindle_load', 'target_pressure']);
  });

  it('keeps a declared sensor that has not reported yet', () => {
    expect(p.nozzle_diameter).toMatchObject({ declared: true, inScorpio: true, lastSeen: null, unit: 'mm' });
  });

  it('offers a parameter only the time series has seen', () => {
    expect(p.spindle_load).toMatchObject({
      attributeId: `${B}spindle_load`, declared: false, inScorpio: false, lastSeen: '2026-10-08T10:00:04Z', latestValue: '37', label: 'Spindle Load',
    });
  });

  it('offers a reading Scorpio holds with an observedAt but no segment', () => {
    expect(p.door_open).toMatchObject({ declared: false, inScorpio: true });
  });

  it('leaves out descriptions and relationships, even when they have rows', () => {
    expect(p.product_name).toBeUndefined();
    expect(p.hasFilter).toBeUndefined();
  });

  it('labels from the template, units from Scorpio first', () => {
    expect(p.machine_state.label).toBe('Machine State');
    expect(p.target_pressure).toMatchObject({ unit: 'Bar', declared: true, latestValue: '4.5' });
  });

  it('works with no Scorpio entity and no template: everything reported is offered', () => {
    const only = buildParameterList(null, null, rows);
    expect(only.map((x) => x.name).sort()).toEqual(['machine_state', 'product_name', 'spindle_load', 'target_pressure']);
    expect(only.every((x) => !x.inScorpio && !x.declared)).toBe(true);
  });

  it('works with nothing reported: the declared list is offered', () => {
    expect(buildParameterList(entity, template, []).map((x) => x.name).sort())
      .toEqual(['door_open', 'machine_state', 'nozzle_diameter', 'target_pressure']);
  });

  it('keeps a constant sensor, which the old "did it change" test hid', () => {
    const flat = buildParameterList(null, null, [{ attributeId: `${B}coolant_level`, value: '80', observedAt: '2026-10-08T10:00:00Z' }]);
    expect(flat.map((x) => x.name)).toEqual(['coolant_level']);
  });

  it('reads names from any namespace', () => {
    expect(shortName('https://industry-fusion.org/eclass#0173-1#02-AAB713#005')).toBe('005');
    expect(shortName('eclass:0173-1#02-AAB713#005')).toBe('0173-1#02-AAB713#005');
    expect(humanise('targetPressure')).toBe('Target Pressure');
  });

  it('picks the newest row per attribute when the view is missing', () => {
    const latest = latestPerAttribute([
      { attributeId: 'a', value: '1', observedAt: '2026-10-08T10:00:00Z' },
      { attributeId: 'a', value: '2', observedAt: '2026-10-08T10:00:09Z' },
      { attributeId: 'b', value: '3', observedAt: '2026-10-08T09:00:00Z' },
    ]);
    expect(latest.map((r) => [r.attributeId, r.value])).toEqual([['a', '2'], ['b', '3']]);
  });
});
