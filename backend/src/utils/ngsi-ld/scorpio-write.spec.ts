import axios from 'axios';
import { attrValue, datasetIdFor, linkTargets, normalizeForScorpio, prepareForScorpio, replaceEntity, toLinks, validateNgsiLd } from './index';

jest.mock('axios');
const S = 'http://www.industry-fusion.org/schema#';

describe('linkTargets reads every link shape FactoryManager has stored', () => {
  it.each([
    ['one link', { type: 'Relationship', object: 'urn:a' }, ['urn:a']],
    ['a list of links', [{ type: 'Relationship', object: 'urn:a' }, { type: 'Relationship', object: 'urn:b' }], ['urn:a', 'urn:b']],
    ['the old object list', { type: 'Relationship', object: ['urn:a', 'urn:b'] }, ['urn:a', 'urn:b']],
    ['the old empty link', { type: 'Relationship', object: '' }, []],
    ['"NULL"', { type: 'Relationship', object: 'NULL' }, []],
    ['a missing attribute', undefined, []],
  ])('%s', (_label, attr, expected) => {
    expect(linkTargets(attr)).toEqual(expected);
  });
});

describe('toLinks', () => {
  it('builds one compliant link per target and keeps the slot settings', () => {
    const links = toLinks(['urn:a', 'urn:b', 'urn:a'], { [`${S}class`]: { type: 'Property', value: 'machine' } }) as any[];
    expect(links).toHaveLength(2);
    expect(links[1]).toMatchObject({ type: 'Relationship', object: 'urn:b', datasetId: datasetIdFor('urn:b') });
    expect(links[0][`${S}class`].value).toBe('machine');
  });

  it('returns undefined for no targets, because NGSI-LD has no empty link', () => {
    expect(toLinks([])).toBeUndefined();
    expect(toLinks(['', 'NULL'])).toBeUndefined();
  });
});

describe('normalizeForScorpio on FactoryManager entities', () => {
  it('fixes a factory site whose hasShopFloor holds an object list', () => {
    const site = {
      id: 'urn:ngsi-ld:factories:2:001', type: 'factory',
      [`${S}factory_name`]: { type: 'Property', value: 'Plant A' },
      [`${S}description`]: { type: 'Property', value: '' },
      [`${S}hasShopFloor`]: { type: 'Relationship', object: ['urn:ngsi-ld:shopFloors:2:001', 'urn:ngsi-ld:shopFloors:2:002'] },
    };
    expect(validateNgsiLd(site).valid).toBe(false);
    const fixed = normalizeForScorpio(site);
    expect(validateNgsiLd(fixed)).toEqual({ valid: true, errors: [] });
    expect(fixed[`${S}hasShopFloor`]).toHaveLength(2);
    // plain text, including empty text, is left alone
    expect(fixed[`${S}description`]).toEqual({ type: 'Property', value: '' });
  });

  it('drops an empty link instead of writing object ""', () => {
    const floor = { id: 'urn:ngsi-ld:shopFloors:2:001', type: 'shopFloor', [`${S}hasAsset`]: { type: 'Relationship', object: '' } };
    expect(normalizeForScorpio(floor)[`${S}hasAsset`]).toBeUndefined();
  });

  it('moves the allocated-assets object value into a JsonProperty, readable by attrValue', () => {
    const store = { id: 'urn:ngsi-ld:factories:2:001:allocated-assets', type: 'urn-holder', [`${S}last-data`]: { value: { items: [{ id: 'urn:a' }] } } };
    const fixed = normalizeForScorpio(store);
    expect(fixed[`${S}last-data`]).toEqual({ type: 'JsonProperty', json: { items: [{ id: 'urn:a' }] } });
    expect(attrValue(fixed[`${S}last-data`])).toEqual({ items: [{ id: 'urn:a' }] });
    expect(validateNgsiLd(fixed).valid).toBe(true);
  });

  it('prepareForScorpio refuses what it cannot fix', () => {
    expect(() => prepareForScorpio({ id: 'not a uri', type: 't' })).toThrow(/non-compliant/);
  });
});

describe('replaceEntity', () => {
  beforeEach(() => (axios.post as jest.Mock).mockReset());

  it('replaces in one batch upsert request, never delete-then-create', async () => {
    (axios.post as jest.Mock).mockResolvedValue({ status: 204 });
    const entity = { id: 'urn:x:1', type: 't', [`${S}hasAsset`]: { type: 'Relationship', object: ['urn:a'] } };
    await replaceEntity('https://scorpio/ngsi-ld/v1/entities', entity, {});
    const [url, body] = (axios.post as jest.Mock).mock.calls[0];
    expect(url).toBe('https://scorpio/ngsi-ld/v1/entityOperations/upsert?options=replace');
    expect(body[0][`${S}hasAsset`]).toMatchObject({ object: 'urn:a', datasetId: datasetIdFor('urn:a') });
    expect(axios.delete).not.toHaveBeenCalled();
  });

  it('treats a 207 partial failure as a failure', async () => {
    (axios.post as jest.Mock).mockResolvedValue({ status: 207, data: { errors: ['x'] } });
    await expect(replaceEntity('https://scorpio/ngsi-ld/v1/entities', { id: 'urn:x:1', type: 't' }, {})).rejects.toThrow(/refused/);
  });

  it('does not send anything non-compliant', async () => {
    await expect(replaceEntity('https://scorpio/ngsi-ld/v1/entities', { id: 'bad', type: 't' }, {})).rejects.toThrow(/non-compliant/);
    expect(axios.post).not.toHaveBeenCalled();
  });
});
