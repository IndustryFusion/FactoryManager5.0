import { ENTITY_MEMBERS, RESERVED_MEMBERS, SUB } from './constants';
import { symbolForUnitCode } from './units';
import { languageName } from './languages';

type Attribute = Record<string, any>;

const isPlainObject = (v: unknown): v is Record<string, any> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

// The compliant JsonProperty translation map back to IFX's list of
// {language, default, value} entries.
const toIfxTranslation = (map: Record<string, string>, defaultText: unknown) => {
  const entries = Object.entries(map).map(([code, text]) => ({
    [SUB.default]: text === defaultText,
    [SUB.language]: languageName(code),
    value: text,
  }));
  return { type: 'Property', value: entries.length === 1 ? entries[0] : entries };
};

const subAttributes = (attr: Attribute): Attribute => {
  const out: Attribute = {};
  for (const [key, sub] of Object.entries(attr)) {
    if (RESERVED_MEMBERS.has(key) || !isPlainObject(sub) || key === SUB.translation) continue;
    out[key] = toIfxAttribute(sub);
  }
  return out;
};

const toIfxAttribute = (attr: Attribute): Attribute => {
  const subs = subAttributes(attr);
  if (attr.type === 'Relationship') return { type: 'Relationship', object: attr.object, ...subs };

  const value = attr.type === 'ListProperty' ? attr.valueList : attr.type === 'JsonProperty' ? attr.json : attr.value;
  const out: Attribute = { type: 'Property', value, ...subs };
  if (isPlainObject(attr[SUB.translation]?.json)) out[SUB.translation] = toIfxTranslation(attr[SUB.translation].json, value);
  if (attr.unitCode && !out[SUB.unit]) {
    const symbol = symbolForUnitCode(attr.unitCode);
    if (symbol) out[SUB.unit] = { type: 'Property', value: symbol };
  }
  return out;
};

/**
 * Converts a compliant FactoryManager entity back into the form IFX edits.
 * Nothing in FactoryManager's Scorpio flows back to IFX today (only
 * factory_site / shop_floor, from Mongo), so this exists for future flows and
 * to prove the conversion round-trips.
 */
export const fromNgsiLd = (entity: Record<string, any>): Record<string, any> => {
  const out: Record<string, any> = { id: entity.id, type: entity.type };
  if (entity['@context'] !== undefined) out['@context'] = entity['@context'];
  for (const [key, raw] of Object.entries(entity)) {
    if (ENTITY_MEMBERS.has(key) || raw === null || typeof raw !== 'object') continue;
    const instances = (Array.isArray(raw) ? raw : [raw]).filter(isPlainObject);
    if (!instances.length) continue;
    const converted = instances.map(toIfxAttribute);
    out[key] = converted.length === 1 ? converted[0] : converted;
  }
  return out;
};
