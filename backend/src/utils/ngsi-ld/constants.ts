// Shared vocabulary for the IFX <-> NGSI-LD adapter.
//
// "Compliant" means NGSI-LD 1.8 restricted to the attribute types the
// IndustryFusion DigitalTwin pipeline actually carries (see
// KafkaBridge/lib/debeziumBridge.js in that repo): Property, Relationship,
// GeoProperty, ListProperty and JsonProperty. LanguageProperty, VocabProperty
// and ListRelationship are stored by Scorpio but dropped by the Debezium
// bridge, so they must never be produced here.

export const IFF_BASE = 'https://industry-fusion.org/base/v0.1/';

export const ALLOWED_ATTRIBUTE_TYPES = [
  'Property',
  'Relationship',
  'GeoProperty',
  'ListProperty',
  'JsonProperty',
] as const;

// Members of an attribute that are part of NGSI-LD itself, not sub-attributes.
export const RESERVED_MEMBERS = new Set([
  'type',
  'value',
  'object',
  'valueList',
  'json',
  'datasetId',
  'unitCode',
  'observedAt',
  'createdAt',
  'modifiedAt',
  'deletedAt',
  'instanceId',
  'objectType',
  'lang',
  '@context',
]);

// Entity members that are not attributes.
export const ENTITY_MEMBERS = new Set(['id', 'type', '@context', 'scope', 'createdAt', 'modifiedAt']);

// The IFX editor writes this text wherever a field has no value.
export const IFX_EMPTY = 'NULL';

// IFX sub-attribute names the adapter reads or rewrites (full IRIs).
export const SUB = {
  unit: `${IFF_BASE}unit`,
  segment: `${IFF_BASE}segment`,
  translation: `${IFF_BASE}translation`,
  bindingPoint: `${IFF_BASE}bindingPoint`,
  default: `${IFF_BASE}default`,
  language: `${IFF_BASE}language`,
};

// A template field in this segment describes live data. Its attribute carries
// per-product setup (binding point, topics) and must survive even without a value.
export const REALTIME_SEGMENT = 'realtime';

// A template field in this segment is a component slot (a Relationship).
export const COMPONENT_SEGMENT = 'component';
