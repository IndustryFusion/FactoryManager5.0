import axios from 'axios';
import { TemplateProperties } from './to-ngsi-ld';

// The full template IFX edits a product against: the base template for its
// type, plus the company's custom fields for model and asset creation. This
// mirrors IFX's AssetService.templateFetch; both apps use the same template
// sandbox, so the adapter types fields exactly as IFX defined them.
const templateSandboxUrl = () => process.env.TEMPLATE_SANDBOX_BACKEND_URL;

// A company's custom fields only refine typing, so a failed lookup (or an
// unknown company) falls back to the base template instead of blocking.
const customProperties = async (companyIfricId: string, templateId: string, kind: 'model-creation' | 'asset-creation', productName?: string) => {
  if (!companyIfricId) return {};
  try {
    const response = await axios.get(
      `${templateSandboxUrl()}/custom-properties/${companyIfricId}/${templateId}/${kind}`,
      productName !== undefined ? { params: { model_name: productName } } : undefined,
    );
    // IFX reads only the first saved entry; that one wins for a field it has,
    // and any further entries only add fields.
    const entries = Array.isArray(response.data) ? response.data : [];
    return entries.reduce((all, entry) => ({ ...(entry?.properties ? JSON.parse(entry.properties) : {}), ...all }), {});
  } catch {
    return {};
  }
};

export const fetchTemplateProperties = async (
  type: string,
  companyIfricId: string,
  productName?: string,
): Promise<TemplateProperties> => {
  const response = await axios.get(`${templateSandboxUrl()}/templates/mongo-templates/type/${Buffer.from(type).toString('base64')}`);
  const template = Array.isArray(response.data) ? response.data[0] : response.data;
  if (!template?.properties) throw new Error(`No template found for type ${type}`);

  const templateId = Buffer.from(template.$id).toString('base64');
  const [assetCustom, modelCustom] = await Promise.all([
    customProperties(companyIfricId, templateId, 'asset-creation', productName ?? ''),
    customProperties(companyIfricId, templateId, 'model-creation'),
  ]);
  return { ...template.properties, ...assetCustom, ...modelCustom };
};

// One lookup per type/company/model within a run: a sync touches many products
// of the same model, and the template does not change mid-run.
export const templateCache = () => {
  const cache = new Map<string, Promise<TemplateProperties>>();
  return (type: string, companyIfricId: string, productName?: string) => {
    const key = `${type}|${companyIfricId}|${productName ?? ''}`;
    if (!cache.has(key)) {
      const pending = fetchTemplateProperties(type, companyIfricId, productName);
      // A failed lookup is not cached, so the next product retries it.
      pending.catch(() => cache.delete(key));
      cache.set(key, pending);
    }
    return cache.get(key)!;
  };
};
