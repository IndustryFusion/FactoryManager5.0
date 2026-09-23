// IFX <-> NGSI-LD adapter. IFX edits products in its own free-form JSON-LD;
// FactoryManager's Scorpio holds only compliant NGSI-LD. Every product that
// enters FactoryManager goes through toNgsiLd, and everything written to
// Scorpio goes through validateNgsiLd first.
export { toNgsiLd, datasetIdFor, isUri } from './to-ngsi-ld';
export type { ConversionResult, TemplateField, TemplateProperties } from './to-ngsi-ld';
export { fromNgsiLd } from './from-ngsi-ld';
export { validateNgsiLd } from './validate';
export type { ValidationResult } from './validate';
export { mergeForSync } from './merge-for-sync';
export { assertCompliant } from './guard';
export { fetchTemplateProperties, templateCache } from './template-source';
export type { SyncPlan } from './merge-for-sync';
export { attrValue, linkTargets, normalizeForScorpio, prepareForScorpio, replaceEntity, toLinks } from './scorpio-write';
