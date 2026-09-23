import { createHash } from 'crypto';
import {
  COMPONENT_SEGMENT,
  ENTITY_MEMBERS,
  IFF_BASE,
  IFX_EMPTY,
  REALTIME_SEGMENT,
  RESERVED_MEMBERS,
  SUB,
} from './constants';
import { defaultUnit, unitCodeFor } from './units';
import { languageCode } from './languages';

// A field of an IFX template (`template.properties[name]`).
export type TemplateField = Record<string, any>;
export type TemplateProperties = Record<string, TemplateField>;

export interface ConversionResult {
  entity: Record<string, any>;
  // Attributes present in the input but removed because they had no value.
  // A sync uses this to delete the stale copy on the FactoryManager side.
  dropped: string[];
  // Things the adapter could not map cleanly; logged, never fatal.
  warnings: string[];
  // Fields with no type in the template (custom fields), typed like similar fields.
  inferred: string[];
}

type Attribute = Record<string, any>;

const isPlainObject = (v: unknown): v is Record<string, any> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const asArray = <T>(v: T | T[]): T[] => (Array.isArray(v) ? v : [v]);

const isScalar = (v: unknown) => ['string', 'number', 'boolean'].includes(typeof v);

const URI = /^[a-zA-Z][a-zA-Z0-9+.-]*:\S+$/;
export const isUri = (v: unknown): v is string =>
  typeof v === 'string' && v !== IFX_EMPTY && URI.test(v);

const isEmptyValue = (v: unknown) => v === undefined || v === null || v === IFX_EMPTY || v === '';

const shortName = (key: string) => (key.startsWith(IFF_BASE) ? key.slice(IFF_BASE.length) : key);

// Stable per target, so every sync of the same link produces the same datasetId
// and an append replaces the instance instead of adding a duplicate.
export const datasetIdFor = (target: string) =>
  `urn:ngsi-ld:Dataset:${createHash('sha1').update(target).digest('hex').slice(0, 16)}`;

// The IFF OPC UA generator's defaults for a value that is not known yet
// (semantic-model/opcua/lib/jsonld.py). Used only for live data attributes,
// which have to exist to carry their setup before the first reading arrives.
const placeholderFor = (field: TemplateField | undefined) => {
  switch (field?.type) {
    case 'number':
      return 0;
    case 'boolean':
      return false;
    default:
      return '';
  }
};

const BOOLEAN_TEXT = /^(true|false)$/i;

// A field IFX gives no type: a custom field added to a model or product that
// the template does not have, or a custom live data field (IFX saves those
// with type ""). Typed the way the template types similar fields: a field with
// a unit is a number (39 of 42 in the templates, and every live data field
// with a unit), true/false is a boolean, anything else is text. Lists,
// objects and links are recognised by their shape, as for every field.
const inferType = (instance: Attribute): string => {
  const value = instance.value;
  if (typeof value === 'boolean' || (typeof value === 'string' && BOOLEAN_TEXT.test(value))) return 'boolean';
  if (typeof value === 'number') return 'number';
  if (defaultUnit(instance[SUB.unit]?.value)) return 'number';
  return 'string';
};

// The field definition to convert by: the template's (base or custom), or one
// inferred from the attribute itself when that gives no type.
const effectiveField = (field: TemplateField | undefined, instance: Attribute): TemplateField => {
  if (typeof field?.type === 'string' && field.type !== '') return field;
  return {
    ...field,
    type: inferType(instance),
    segment: field?.segment ?? instance[SUB.segment]?.value,
    unit: field?.unit ?? instance[SUB.unit]?.value,
    inferred: true,
  };
};

// Types a value by its field: IFX stores most values as text.
const typedValue = (value: any, field: TemplateField | undefined, name: string, warnings: string[]) => {
  if (typeof value !== 'string') return value;
  if (field?.type === 'number') {
    const n = Number(value);
    if (value.trim() !== '' && Number.isFinite(n)) return n;
    // An inferred type is a guess from the unit; text that is not a number stays text quietly.
    if (!field.inferred) warnings.push(`${name}: "${value}" is not a number; kept as text`);
  } else if (field?.type === 'boolean') {
    // IFX custom booleans are "True" / "False".
    if (BOOLEAN_TEXT.test(value)) return value.toLowerCase() === 'true';
    if (!field.inferred) warnings.push(`${name}: "${value}" is not a boolean; kept as text`);
  }
  return value;
};

// Puts a raw value into the attribute type that can carry it:
// a list of scalars is a ListProperty, anything with objects in it is a JsonProperty.
export const shapeValue = (value: any): Attribute => {
  if (Array.isArray(value)) {
    return value.every(isScalar) ? { type: 'ListProperty', valueList: value } : { type: 'JsonProperty', json: value };
  }
  // A JSON-LD typed literal ({"@type": ..., "@value": ...}) is still a plain value.
  if (isPlainObject(value) && !('@value' in value)) {
    return { type: 'JsonProperty', json: value };
  }
  return { type: 'Property', value };
};

// IFX translation sub-attribute ({language: "English", default, value}, one or a list)
// becomes a JsonProperty keyed by language code. Returns the default text too.
const convertTranslation = (sub: Attribute, name: string, warnings: string[]) => {
  const entries = asArray(sub?.value ?? sub?.json ?? []).filter(isPlainObject);
  const map: Record<string, string> = {};
  let defaultText: string | undefined;
  for (const entry of entries) {
    const language = entry[SUB.language] ?? entry.language;
    const text = entry.value;
    if (typeof text !== 'string') continue;
    let code = languageCode(language);
    if (!code) {
      warnings.push(`${name}: unknown translation language "${language}"; kept under its own name`);
      code = String(language ?? '').trim().toLowerCase() || 'und';
    }
    map[code] = text;
    if ((entry[SUB.default] ?? entry.default) === true) defaultText = text;
  }
  return { map, defaultText };
};

// Sub-attributes (IFX's editor settings: segment, model, bindingPoint, ...) are
// valid NGSI-LD and FactoryManager reads several, so they are kept; only their
// shape is fixed where the pipeline could not carry it.
const convertSubAttributes = (attr: Attribute, name: string, warnings: string[], skip: Set<string>) => {
  const out: Attribute = {};
  for (const [key, sub] of Object.entries(attr)) {
    if (RESERVED_MEMBERS.has(key) || skip.has(key) || !isPlainObject(sub)) continue;
    const subName = `${name}.${shortName(key)}`;
    if (sub.type === 'Relationship') {
      if (isUri(sub.object)) out[key] = { ...convertSubAttributes(sub, subName, warnings, new Set()), type: 'Relationship', object: sub.object };
      continue;
    }
    if (sub.type === 'ListProperty' || sub.type === 'JsonProperty' || sub.type === 'GeoProperty') {
      out[key] = { ...sub, ...convertSubAttributes(sub, subName, warnings, new Set()) };
      continue;
    }
    if (sub.value === undefined || sub.value === null) continue;
    out[key] = { ...shapeValue(sub.value), ...convertSubAttributes(sub, subName, warnings, new Set()) };
  }
  return out;
};

const convertRelationship = (instances: Attribute[], name: string, warnings: string[]): Attribute[] => {
  const out: Attribute[] = [];
  const seen = new Set<string>();
  for (const instance of instances) {
    const meta = convertSubAttributes(instance, name, warnings, new Set());
    for (const target of asArray(instance.object)) {
      if (!isUri(target) || seen.has(target)) continue;
      seen.add(target);
      out.push({ type: 'Relationship', object: target, datasetId: datasetIdFor(target), ...meta });
    }
  }
  return out;
};

const convertProperty = (
  instance: Attribute,
  templateField: TemplateField | undefined,
  name: string,
  warnings: string[],
): Attribute | undefined => {
  const field = effectiveField(templateField, instance);
  const kept: Attribute = {};
  for (const member of ['datasetId', 'observedAt', 'unitCode']) {
    if (instance[member] !== undefined) kept[member] = instance[member];
  }

  // Already a type the pipeline carries: keep the payload, fix the sub-attributes.
  if (['ListProperty', 'JsonProperty', 'GeoProperty'].includes(instance.type)) {
    const payload = instance.type === 'ListProperty' ? 'valueList' : instance.type === 'JsonProperty' ? 'json' : 'value';
    if (instance[payload] === undefined || instance[payload] === null) return undefined;
    return { type: instance.type, [payload]: instance[payload], ...kept, ...convertSubAttributes(instance, name, warnings, new Set()) };
  }

  let value = instance.value;
  const subs = convertSubAttributes(instance, name, warnings, new Set([SUB.translation, SUB.unit]));

  // LanguageProperty never reaches the pipeline: carry the default text as the
  // value and every language in a JsonProperty sub-attribute.
  let translation: Record<string, string> | undefined;
  if (instance.type === 'LanguageProperty' && isPlainObject(instance.languageMap)) {
    translation = instance.languageMap;
    value = translation.en ?? Object.values(translation)[0];
  } else if (instance[SUB.translation]) {
    const { map, defaultText } = convertTranslation(instance[SUB.translation], name, warnings);
    if (Object.keys(map).length) translation = map;
    if (defaultText !== undefined) value = defaultText;
  }

  const isLiveData =
    field.segment === REALTIME_SEGMENT || instance[SUB.segment]?.value === REALTIME_SEGMENT || instance[SUB.bindingPoint] !== undefined;
  if (isEmptyValue(value)) {
    if (!isLiveData) return undefined;
    value = placeholderFor(field);
  }

  const attribute: Attribute = { ...shapeValue(typedValue(value, field, name, warnings)), ...kept, ...subs };
  if (translation) attribute[SUB.translation] = { type: 'JsonProperty', json: translation };

  // The template's unit wins over the instance's copy; a list means "allowed
  // units" and its first entry is the default.
  const symbol = defaultUnit(field?.unit) ?? defaultUnit(instance[SUB.unit]?.value);
  if (symbol) {
    attribute[SUB.unit] = { type: 'Property', value: symbol };
    const code = unitCodeFor(symbol);
    if (code) attribute.unitCode = code;
  }
  return attribute;
};

/**
 * Converts an entity as IFX stores it into the compliant form FactoryManager's
 * Scorpio holds. `template` is the IFX template's `properties`, which knows each
 * field's type, unit and whether it is a component slot or live data.
 */
export const toNgsiLd = (input: Record<string, any>, template: TemplateProperties = {}): ConversionResult => {
  const entity: Record<string, any> = { id: input.id, type: input.type };
  if (input['@context'] !== undefined) entity['@context'] = input['@context'];
  const dropped: string[] = [];
  const warnings: string[] = [];
  const inferred: string[] = [];

  for (const [key, raw] of Object.entries(input)) {
    if (ENTITY_MEMBERS.has(key) || raw === null || typeof raw !== 'object') continue;
    const name = shortName(key);
    const field = template[name];
    const instances = asArray(raw).filter(isPlainObject);
    if (!(typeof field?.type === 'string' && field.type !== '') && instances.some((i) => i.type !== 'Relationship')) {
      inferred.push(name);
    }

    const isRelationship =
      field?.segment === COMPONENT_SEGMENT || instances.some((i) => i.type === 'Relationship');
    const converted = isRelationship
      ? convertRelationship(instances, name, warnings)
      : instances.map((i) => convertProperty(i, field, name, warnings)).filter((a): a is Attribute => !!a);

    if (!converted.length) {
      dropped.push(key);
      continue;
    }
    entity[key] = converted.length === 1 ? converted[0] : converted;
  }
  return { entity, dropped, warnings, inferred };
};
