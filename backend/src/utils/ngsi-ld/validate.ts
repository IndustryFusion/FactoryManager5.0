import { ALLOWED_ATTRIBUTE_TYPES, ENTITY_MEMBERS, IFX_EMPTY, RESERVED_MEMBERS } from './constants';
import { isUri } from './to-ngsi-ld';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

const isPlainObject = (v: unknown): v is Record<string, any> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const isScalar = (v: unknown) => ['string', 'number', 'boolean'].includes(typeof v);

const checkInstance = (attr: Record<string, any>, path: string, errors: string[]) => {
  if (!ALLOWED_ATTRIBUTE_TYPES.includes(attr.type)) {
    errors.push(`${path}: type "${attr.type}" is not carried by the platform (allowed: ${ALLOWED_ATTRIBUTE_TYPES.join(', ')})`);
    return;
  }
  switch (attr.type) {
    case 'Property':
      if (attr.value === undefined || attr.value === null) errors.push(`${path}: Property has no value`);
      else if (attr.value === IFX_EMPTY) errors.push(`${path}: value is the "${IFX_EMPTY}" placeholder`);
      else if (Array.isArray(attr.value)) errors.push(`${path}: list value in a Property (only the first item reaches the pipeline); use ListProperty`);
      else if (isPlainObject(attr.value) && !('@value' in attr.value)) errors.push(`${path}: object value in a Property (dropped by the pipeline); use JsonProperty`);
      break;
    case 'Relationship':
      if (!isUri(attr.object)) errors.push(`${path}: Relationship object ${JSON.stringify(attr.object)} is not a URI`);
      break;
    case 'ListProperty':
      if (!Array.isArray(attr.valueList)) errors.push(`${path}: ListProperty has no valueList`);
      else if (!attr.valueList.every(isScalar)) errors.push(`${path}: ListProperty items must be scalars; use JsonProperty`);
      break;
    case 'JsonProperty':
      if (!isPlainObject(attr.json) && !Array.isArray(attr.json)) errors.push(`${path}: JsonProperty json must be an object or array`);
      break;
    case 'GeoProperty':
      if (!isPlainObject(attr.value) || typeof attr.value.type !== 'string') errors.push(`${path}: GeoProperty value must be a GeoJSON geometry`);
      break;
  }
  if (attr.datasetId !== undefined && !isUri(attr.datasetId)) errors.push(`${path}: datasetId ${JSON.stringify(attr.datasetId)} is not a URI`);
  if (attr.unitCode !== undefined && typeof attr.unitCode !== 'string') errors.push(`${path}: unitCode must be text`);
  checkAttributes(attr, path, errors, RESERVED_MEMBERS);
};

const checkAttribute = (raw: unknown, path: string, errors: string[]) => {
  const instances = Array.isArray(raw) ? raw : [raw];
  if (!instances.length) {
    errors.push(`${path}: empty attribute`);
    return;
  }
  // Several instances need distinct datasetIds (at most one default instance):
  // the Debezium bridge keys attributes by datasetId and keeps only one per key.
  if (instances.length > 1) {
    const ids = instances.map((i) => (isPlainObject(i) ? i.datasetId ?? '@none' : '@none'));
    if (new Set(ids).size !== ids.length) errors.push(`${path}: ${instances.length} instances without distinct datasetIds`);
  }
  instances.forEach((instance, i) => {
    const at = instances.length > 1 ? `${path}[${i}]` : path;
    if (!isPlainObject(instance)) errors.push(`${at}: not an attribute object`);
    else checkInstance(instance, at, errors);
  });
};

const checkAttributes = (holder: Record<string, any>, path: string, errors: string[], skip: Set<string>) => {
  for (const [key, raw] of Object.entries(holder)) {
    if (skip.has(key)) continue;
    checkAttribute(raw, path ? `${path}.${key}` : key, errors);
  }
};

/**
 * Checks an entity against what the IndustryFusion platform can store and
 * carry: NGSI-LD 1.8 restricted to Property, Relationship, GeoProperty,
 * ListProperty and JsonProperty. Returns every problem at once.
 */
export const validateNgsiLd = (entity: Record<string, any>, { requireId = true } = {}): ValidationResult => {
  const errors: string[] = [];
  if (requireId && !isUri(entity?.id)) errors.push(`id ${JSON.stringify(entity?.id)} is not a URI`);
  if (requireId && (typeof entity?.type !== 'string' || entity.type === '')) errors.push('entity has no type');
  checkAttributes(entity ?? {}, '', errors, ENTITY_MEMBERS);
  return { valid: errors.length === 0, errors };
};
