import axios from 'axios';
import { ENTITY_MEMBERS, IFX_EMPTY } from './constants';
import { datasetIdFor, isUri, shapeValue } from './to-ngsi-ld';
import { assertCompliant } from './guard';

type Attribute = Record<string, any>;

const isPlainObject = (v: unknown): v is Record<string, any> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const instancesOf = (attr: unknown): Attribute[] => (Array.isArray(attr) ? attr : attr ? [attr] : []).filter(isPlainObject);

/**
 * The targets of a link, whatever shape it is stored in: one Relationship, a
 * list of them, an `object` list (the old FactoryManager form), or nothing.
 * Every read of a link goes through this, so old and compliant data both work.
 */
export const linkTargets = (attr: unknown): string[] => {
  const targets = instancesOf(attr).flatMap((instance) => (Array.isArray(instance.object) ? instance.object : [instance.object]));
  return [...new Set(targets.filter(isUri))];
};

/**
 * A compliant link to `targets`: one Relationship per target with a stable
 * datasetId, carrying `settings` (sub-attributes such as relationship_type).
 * Returns undefined when there is no target: NGSI-LD has no empty link, so the
 * attribute is left out instead.
 */
export const toLinks = (targets: string[], settings: Attribute = {}): Attribute | Attribute[] | undefined => {
  const unique = [...new Set(targets.filter(isUri))];
  const links = unique.map((target) => ({ ...settings, type: 'Relationship', object: target, datasetId: datasetIdFor(target) }));
  return links.length === 0 ? undefined : links.length === 1 ? links[0] : links;
};

// The payload of a Property, JsonProperty or ListProperty.
export const attrValue = (attr: unknown): any => {
  const instance = instancesOf(attr)[0];
  if (!instance) return undefined;
  if (instance.type === 'JsonProperty') return instance.json;
  if (instance.type === 'ListProperty') return instance.valueList;
  return instance.value;
};

const linkSettings = (instance: Attribute | undefined): Attribute => {
  if (!instance) return {};
  const { type, object, datasetId, ...settings } = instance;
  return settings;
};

/**
 * Brings an entity (or an attrs payload) FactoryManager builds itself into the
 * compliant shape: links get one instance per target with a datasetId and empty
 * links are left out; list and object values move into ListProperty and
 * JsonProperty; null and "NULL" values are left out.
 */
export const normalizeForScorpio = <T extends Record<string, any>>(payload: T): T => {
  const out: Record<string, any> = {};
  for (const [key, raw] of Object.entries(payload)) {
    if (ENTITY_MEMBERS.has(key) || !isPlainObject(raw) && !Array.isArray(raw)) {
      out[key] = raw;
      continue;
    }
    const instances = instancesOf(raw);
    if (instances.some((i) => i.type === 'Relationship')) {
      const links = toLinks(linkTargets(instances), linkSettings(instances[0]));
      if (links !== undefined) out[key] = links;
      continue;
    }
    if (instances.length === 1 && (instances[0].type === 'Property' || instances[0].type === undefined) && 'value' in instances[0]) {
      const { type, value, ...rest } = instances[0];
      if (value === null || value === undefined || value === IFX_EMPTY) continue;
      out[key] = { ...rest, ...shapeValue(value) };
      continue;
    }
    out[key] = raw;
  }
  return out as T;
};

// normalizeForScorpio + assertCompliant, for every FactoryManager write.
export const prepareForScorpio = <T extends Record<string, any>>(payload: T, { requireId = true, label = 'entity' } = {}): T => {
  const normalized = normalizeForScorpio(payload);
  assertCompliant(normalized, { requireId, label });
  return normalized;
};

/**
 * Replaces an entity as a whole, in one request (NGSI-LD batch upsert with
 * options=replace, as the platform's own ngsildUpdates bridge does). Replaces
 * the old delete-then-create, which lost the entity whenever the create failed.
 */
export const replaceEntity = async (scorpioEntitiesUrl: string, entity: Record<string, any>, headers: Record<string, string>) => {
  const prepared = prepareForScorpio(entity, { label: `entity ${entity.id}` });
  const upsertUrl = `${scorpioEntitiesUrl.replace(/\/entities\/?$/, '/entityOperations/upsert')}?options=replace`;
  const response = await axios.post(upsertUrl, [prepared], { headers });
  // 207 means the batch was accepted but this entity failed.
  if (response.status === 207) {
    throw new Error(`Scorpio refused to replace ${entity.id}: ${JSON.stringify(response.data)}`);
  }
  return response;
};
