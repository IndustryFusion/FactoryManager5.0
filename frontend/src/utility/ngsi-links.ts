// FactoryManager's Scorpio holds compliant NGSI-LD: a link is one Relationship
// per target (with a datasetId), and an empty link is simply absent. Older data
// still has an `object` list, `object: ""` (read back as "json-ld-1.1"), or
// "NULL". Read links only through these helpers so every shape works.

const URI = /^[a-zA-Z][a-zA-Z0-9+.-]*:\S+$/;
const isUri = (v: unknown): v is string => typeof v === "string" && v !== "NULL" && URI.test(v);

const instancesOf = (attr: unknown): Record<string, any>[] =>
  (Array.isArray(attr) ? attr : attr ? [attr] : []).filter(
    (i): i is Record<string, any> => typeof i === "object" && i !== null
  );

// The targets of a link attribute, whatever shape it is stored in.
export const linkTargets = (attr: unknown): string[] => {
  const targets = instancesOf(attr).flatMap((i) => (Array.isArray(i.object) ? i.object : [i.object]));
  return Array.from(new Set(targets.filter(isUri)));
};

// True when the attribute is a link (one Relationship or a list of them).
export const isLink = (attr: unknown): boolean => instancesOf(attr).some((i) => i.type === "Relationship");

// The payload of a Property, ListProperty or JsonProperty.
export const attrValue = (attr: unknown): any => {
  const instance = instancesOf(attr)[0];
  if (!instance) return undefined;
  if (instance.type === "JsonProperty") return instance.json;
  if (instance.type === "ListProperty") return instance.valueList;
  return instance.value;
};

// For code that flattens an entity: the payload of any property type, or the
// attribute unchanged when it is not a property (e.g. a link).
export const flatValue = (attr: any): any =>
  ["Property", "ListProperty", "JsonProperty"].includes(attr?.type) ? attrValue(attr) : attr;
