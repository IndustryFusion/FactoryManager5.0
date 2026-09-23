import { datasetIdFor, fromNgsiLd, mergeForSync, toNgsiLd, validateNgsiLd } from './index';
import * as ifxLaser from './__fixtures__/laser-cutter.ifx.json';
import * as laserTemplate from './__fixtures__/laser-cutter.template.json';

const B = 'https://industry-fusion.org/base/v0.1/';
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));
// JSON imports carry a `default` key under esModuleInterop; strip it.
const plain = (m: any) => { const { default: _d, ...rest } = m; return rest; };
const laser = () => clone(plain(ifxLaser));
const template = plain(laserTemplate);

describe('toNgsiLd on a real IFX laser cutter', () => {
  const { entity, dropped, warnings } = toNgsiLd(laser(), template);

  it('produces an entity the platform accepts', () => {
    expect(validateNgsiLd(entity)).toEqual({ valid: true, errors: [] });
  });

  it('shows the input was not compliant to begin with', () => {
    expect(validateNgsiLd(laser()).valid).toBe(false);
  });

  it('keeps id, type and context', () => {
    expect(entity.id).toBe(ifxLaser.id);
    expect(entity.type).toBe(`${B}laserCutter`);
    expect(entity['@context']).toEqual(ifxLaser['@context']);
  });

  it('removes empty component slots and empty values, and reports them', () => {
    expect(entity[`${B}hasController`]).toBeUndefined();
    expect(entity[`${B}adjusted_source`]).toBeUndefined();
    expect(entity[`${B}animal_origin`]).toBeUndefined();
    expect(dropped).toEqual(expect.arrayContaining([`${B}hasController`, `${B}adjusted_source`, `${B}animal_origin`]));
  });

  it('types numbers by the template, and leaves numeric-looking text fields alone', () => {
    expect(entity[`${B}ambient_operating_temperature_max`].value).toBe(20);
    expect(entity[`${B}article_number`].value).toBe('390650');
  });

  it('adds unitCode from the template default unit and keeps the symbol', () => {
    const temp = entity[`${B}ambient_operating_temperature_max`];
    expect(temp.unitCode).toBe('CEL');
    expect(temp[`${B}unit`]).toEqual({ type: 'Property', value: '°C' });
    // a unit list: the first entry is the default
    const weight = entity[`${B}weight_percentage_of_total`];
    expect(weight.unitCode).toBe('P1');
    expect(weight[`${B}unit`].value).toBe('%');
  });

  it('keeps the symbol only when a unit has no UN/CEFACT code', () => {
    const co2 = entity[`${B}adjusted_total_co2`];
    expect(co2.unitCode).toBeUndefined();
    expect(co2[`${B}unit`].value).toBe('kgCO₂');
  });

  it('keeps live data attributes with their setup, using a placeholder typed by the template', () => {
    // machine_state is a number in the template
    expect(entity[`${B}machine_state`].value).toBe(0);
    // active_current is a custom field, absent from the template: it has a
    // unit, so it is typed as a number like similar template fields
    const current = entity[`${B}active_current`];
    expect(current.type).toBe('Property');
    expect(current.value).toBe(0);
    // with no template unit, the instance's own unit symbol is used
    expect(current.unitCode).toBe('AMP');
    expect(current[`${B}segment`].value).toBe('realtime');
    expect(current[`${B}functionTopic`]).toEqual({ type: 'ListProperty', valueList: ['Production Sharing', 'Predictive Maintenance'] });
  });

  it('turns the list-of-objects binding point into a JsonProperty', () => {
    const binding = entity[`${B}machine_state`][`${B}bindingPoint`];
    expect(binding.type).toBe('JsonProperty');
    expect(Array.isArray(binding.json)).toBe(true);
    expect(binding.json[0][`${B}state`]).toBe('Online_Idle');
  });

  it('turns translations into a default value plus a JsonProperty by language code', () => {
    const description = entity[`${B}manufacturer_product_description`];
    expect(description.value).toBe('TEST DATASHARING');
    expect(description[`${B}translation`]).toEqual({ type: 'JsonProperty', json: { en: 'TEST DATASHARING' } });
  });

  it('keeps fields the template does not know, as plain valid attributes', () => {
    expect(entity[`${B}items_per_batch`]).toBeDefined();
  });

  it('warns rather than fails on values it cannot map', () => {
    expect(Array.isArray(warnings)).toBe(true);
  });
});

describe('component links', () => {
  const slot = (object: any) => ({
    type: 'Relationship',
    object,
    [`${B}segment`]: { type: 'Property', value: 'component' },
    [`${B}relationship_type`]: { type: 'Property', value: 'peer' },
  });

  it('gives every target its own stable datasetId', () => {
    const input = {
      id: 'urn:ifric:a', type: `${B}laserCutter`,
      [`${B}hasFilter`]: [slot('urn:ifric:f1'), slot('urn:ifric:f2'), slot('urn:ifric:f1')],
    };
    const { entity } = toNgsiLd(input, {});
    const links = entity[`${B}hasFilter`];
    expect(links).toHaveLength(2);
    expect(links.map((l: any) => l.datasetId)).toEqual([datasetIdFor('urn:ifric:f1'), datasetIdFor('urn:ifric:f2')]);
    expect(links[0][`${B}relationship_type`].value).toBe('peer');
    expect(validateNgsiLd(entity).valid).toBe(true);
  });

  it('accepts an object list and drops "NULL" and empty targets', () => {
    const input = { id: 'urn:ifric:a', type: 't', [`${B}hasPart`]: slot(['urn:ifric:p1', 'NULL', '']) };
    const { entity } = toNgsiLd(input, {});
    expect(entity[`${B}hasPart`].object).toBe('urn:ifric:p1');
  });

  it('rejects links the Debezium bridge would collapse', () => {
    const bad = { id: 'urn:ifric:a', type: 't', [`${B}hasPart`]: [slot('urn:ifric:p1'), slot('urn:ifric:p2')] };
    expect(validateNgsiLd(bad).errors[0]).toMatch(/distinct datasetIds/);
  });
});

describe('validateNgsiLd', () => {
  it('rejects types the pipeline drops', () => {
    const entity = { id: 'urn:x:1', type: 't', name: { type: 'LanguageProperty', languageMap: { en: 'x' } } };
    expect(validateNgsiLd(entity).errors[0]).toMatch(/not carried by the platform/);
  });

  it('rejects list and object values in a plain Property', () => {
    const entity = { id: 'urn:x:1', type: 't', a: { type: 'Property', value: [1, 2] }, b: { type: 'Property', value: { k: 1 } } };
    expect(validateNgsiLd(entity).errors).toHaveLength(2);
  });

  it('checks sub-attributes too', () => {
    const entity = { id: 'urn:x:1', type: 't', a: { type: 'Property', value: 1, sub: { type: 'Property', value: 'NULL' } } };
    expect(validateNgsiLd(entity).errors[0]).toMatch(/a\.sub/);
  });

  it('can check an attrs-only payload', () => {
    expect(validateNgsiLd({ a: { type: 'Property', value: 1 } }, { requireId: false }).valid).toBe(true);
  });
});

describe('LanguageProperty input', () => {
  it('becomes a default value plus a JsonProperty map', () => {
    const input = { id: 'urn:x:1', type: 't', name: { type: 'LanguageProperty', languageMap: { de: 'Laser', en: 'Laser cutter' } } };
    const { entity } = toNgsiLd(input, {});
    expect(entity.name.value).toBe('Laser cutter');
    expect(entity.name[`${B}translation`].json).toEqual({ de: 'Laser', en: 'Laser cutter' });
  });
});

describe('fromNgsiLd', () => {
  it('round-trips the values that survive conversion', () => {
    const { entity } = toNgsiLd(laser(), template);
    const back = fromNgsiLd(entity);
    expect(back[`${B}ambient_operating_temperature_max`].value).toBe(20);
    expect(back[`${B}manufacturer_product_description`][`${B}translation`].value).toEqual({
      [`${B}default`]: true, [`${B}language`]: 'English', value: 'TEST DATASHARING',
    });
    expect(back[`${B}active_current`][`${B}functionTopic`].value).toEqual(['Production Sharing', 'Predictive Maintenance']);
    expect(toNgsiLd(back, template).entity).toEqual(entity);
  });
});

describe('mergeForSync', () => {
  const settings = { [`${B}segment`]: { type: 'Property', value: 'component' }, [`${B}class`]: { type: 'Property', value: 'machine' } };

  it("keeps FactoryManager's link targets with IFX's link settings", () => {
    const ifx = { id: 'urn:a', type: 't', [`${B}hasFilter`]: { type: 'Relationship', object: 'urn:ifx:x', datasetId: datasetIdFor('urn:ifx:x'), ...settings } };
    const factory = { [`${B}hasFilter`]: [{ type: 'Relationship', object: 'urn:f:1' }, { type: 'Relationship', object: 'urn:f:2' }] };
    const { attrs } = mergeForSync(ifx, [], factory);
    expect(attrs[`${B}hasFilter`].map((l: any) => l.object)).toEqual(['urn:f:1', 'urn:f:2']);
    expect(attrs[`${B}hasFilter`][0][`${B}class`].value).toBe('machine');
    expect(validateNgsiLd(attrs, { requireId: false }).valid).toBe(true);
  });

  it("keeps FactoryManager's live value but takes IFX's setup", () => {
    const { entity, dropped } = toNgsiLd(laser(), template);
    const factory = { [`${B}active_current`]: { type: 'Property', value: 12.5 } };
    const { attrs } = mergeForSync(entity, dropped, factory, template);
    expect(attrs[`${B}active_current`].value).toBe(12.5);
    expect(attrs[`${B}active_current`].unitCode).toBe('AMP');
  });

  it('deletes properties IFX cleared, but never links', () => {
    const factory = {
      [`${B}adjusted_source`]: { type: 'Property', value: 'old' },
      [`${B}hasController`]: { type: 'Relationship', object: 'urn:f:c' },
    };
    const { entity, dropped } = toNgsiLd(laser(), template);
    const { remove, attrs } = mergeForSync(entity, dropped, factory, template);
    expect(remove).toEqual([`${B}adjusted_source`]);
    expect(attrs[`${B}hasController`]).toBeUndefined();
  });
});

describe('custom fields (not in the template, or saved by IFX with type "")', () => {
  const prop = (value: any, subs: Record<string, any> = {}) => ({
    type: 'Property',
    value,
    [`${B}model`]: { type: 'Property', value: true },
    [`${B}owner_ref`]: { type: 'Property', value: 'manufacturer' },
    ...Object.fromEntries(Object.entries(subs).map(([k, v]) => [`${B}${k}`, { type: 'Property', value: v }])),
  });
  const input = {
    id: 'urn:ifric:c1', type: `${B}laserCutter`,
    [`${B}custom_numeric`]: prop('12.5', { segment: 'parameter', unit: 'mm' }),
    [`${B}custom_string`]: prop('390650', { segment: 'identification' }),
    [`${B}custom_text_with_unit`]: prop('about 12', { segment: 'parameter', unit: 'mm' }),
    [`${B}custom_boolean`]: prop('True', { segment: 'parameter' }),
    [`${B}custom_multi_select`]: prop(['red', 'blue'], { segment: 'parameter' }),
    [`${B}custom_attachment`]: prop('https://files/manual.pdf', { segment: 'resource' }),
    [`${B}custom_empty`]: prop('NULL', { segment: 'parameter' }),
    [`${B}custom_live`]: prop('NULL', { segment: 'realtime', unit: 'bar', functionTopic: ['Predictive Maintenance'] }),
    [`${B}custom_live_text`]: prop('NULL', { segment: 'realtime' }),
    [`${B}hasCustomPart`]: { type: 'Relationship', object: 'urn:ifric:p9', [`${B}segment`]: { type: 'Property', value: 'component' } },
  };
  // custom_live is saved by IFX with type "" (live data custom fields always are)
  const template = { custom_live: { segment: 'realtime', type: '', isCustom: true } };
  const { entity, dropped, inferred } = toNgsiLd(input, template);
  const v = (name: string) => entity[`${B}${name}`];

  it('is fully compliant', () => {
    expect(validateNgsiLd(entity)).toEqual({ valid: true, errors: [] });
  });

  it('types a field with a unit as a number, like the template does', () => {
    expect(v('custom_numeric').value).toBe(12.5);
    expect(v('custom_numeric').unitCode).toBe('MMT');
  });

  it('leaves numeric-looking text without a unit as text', () => {
    expect(v('custom_string').value).toBe('390650');
  });

  it('keeps text with a unit as text when it is not a number', () => {
    expect(v('custom_text_with_unit').value).toBe('about 12');
  });

  it('reads IFX custom booleans ("True" / "False")', () => {
    expect(v('custom_boolean').value).toBe(true);
  });

  it('handles lists and attachments by their shape', () => {
    expect(v('custom_multi_select')).toMatchObject({ type: 'ListProperty', valueList: ['red', 'blue'] });
    expect(v('custom_attachment').value).toBe('https://files/manual.pdf');
  });

  it('drops an empty custom field like any other empty field', () => {
    expect(dropped).toContain(`${B}custom_empty`);
  });

  it('keeps custom live data fields with their setup, typed like similar fields', () => {
    expect(v('custom_live').value).toBe(0);
    expect(v('custom_live').unitCode).toBe('BAR');
    expect(v('custom_live')[`${B}functionTopic`]).toEqual({ type: 'ListProperty', valueList: ['Predictive Maintenance'] });
    expect(v('custom_live_text').value).toBe('');
  });

  it('converts custom component links like template links', () => {
    expect(v('hasCustomPart')).toMatchObject({ object: 'urn:ifric:p9', datasetId: datasetIdFor('urn:ifric:p9') });
  });

  it('reports which fields were typed by inference', () => {
    expect(inferred).toEqual(expect.arrayContaining(['custom_numeric', 'custom_live', 'custom_boolean']));
    expect(inferred).not.toContain('hasCustomPart');
  });

  it('uses the template type when the custom field was saved with one', () => {
    const typed = toNgsiLd({ id: 'urn:ifric:c2', type: 't', [`${B}custom_code`]: prop('0042', { unit: 'mm' }) }, { custom_code: { type: 'string', unit: 'mm' } });
    expect(typed.entity[`${B}custom_code`].value).toBe('0042');
    expect(typed.inferred).toEqual([]);
  });
});
