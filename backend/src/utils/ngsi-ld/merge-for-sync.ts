import { ENTITY_MEMBERS, REALTIME_SEGMENT, SUB } from './constants';
import { datasetIdFor, isUri, TemplateProperties } from './to-ngsi-ld';

type Attribute = Record<string, any>;

export interface SyncPlan {
  // Attributes to write with POST /entities/{id}/attrs.
  attrs: Record<string, any>;
  // Attributes to delete: IFX cleared them, so the FactoryManager copy is stale.
  remove: string[];
}

const instancesOf = (raw: unknown): Attribute[] =>
  (Array.isArray(raw) ? raw : raw ? [raw] : []).filter((i) => typeof i === 'object' && i !== null);

const segmentOf = (instance: Attribute | undefined) => instance?.[SUB.segment]?.value;

const hasRealValue = (instance: Attribute | undefined) =>
  instance !== undefined && instance.value !== undefined && instance.value !== null && instance.value !== '' && instance.value !== 'NULL';

/**
 * Decides what a Sync writes into FactoryManager's Scorpio, working on the
 * compliant form of both sides:
 *  - IFX's attributes win, as before.
 *  - Component links keep FactoryManager's targets (the factory wiring), with
 *    IFX's link settings.
 *  - Live data attributes take IFX's setup but keep the value FactoryManager
 *    already has, so a sync never resets it to the placeholder.
 *  - A property IFX cleared is deleted on the FactoryManager side; a link is
 *    not, because FactoryManager's targets win.
 */
export const mergeForSync = (
  ifx: Record<string, any>,
  dropped: string[],
  factory: Record<string, any>,
  template: TemplateProperties = {},
): SyncPlan => {
  const attrs: Record<string, any> = {};

  for (const [key, raw] of Object.entries(ifx)) {
    if (ENTITY_MEMBERS.has(key)) continue;
    const ifxInstances = instancesOf(raw);
    const factoryInstances = instancesOf(factory[key]);

    if (ifxInstances[0]?.type === 'Relationship') {
      const targets = factoryInstances.map((i) => i.object).filter(isUri);
      if (!targets.length) {
        attrs[key] = raw;
        continue;
      }
      const { object, datasetId, ...settings } = ifxInstances[0];
      const merged = targets.map((target) => ({ ...settings, type: 'Relationship', object: target, datasetId: datasetIdFor(target) }));
      attrs[key] = merged.length === 1 ? merged[0] : merged;
      continue;
    }

    const name = key.split('/').pop() ?? key;
    const isLiveData = template[name]?.segment === REALTIME_SEGMENT || segmentOf(ifxInstances[0]) === REALTIME_SEGMENT;
    if (isLiveData && ifxInstances.length === 1 && factoryInstances.length === 1 && hasRealValue(factoryInstances[0]) && ifxInstances[0].type === 'Property') {
      attrs[key] = { ...ifxInstances[0], value: factoryInstances[0].value };
      continue;
    }
    attrs[key] = raw;
  }

  const remove = dropped.filter((key) => {
    const existing = instancesOf(factory[key]);
    return existing.length > 0 && existing[0].type !== 'Relationship';
  });

  return { attrs, remove };
};
