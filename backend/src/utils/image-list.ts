/**
 * Normalises a product image value into a list of image URLs.
 *
 * IFX used to send `product_image` as a single string ("NULL" when unset) and now
 * sends a string[]. Used as a Mongoose setter so both shapes are stored as a list.
 */
export function toImageList(v: unknown): string[] {
  if (Array.isArray(v)) {
    return v.filter((img): img is string => typeof img === 'string' && img !== '' && img !== 'NULL');
  }
  if (typeof v === 'string') {
    return v === '' || v === 'NULL' ? [] : [v];
  }
  return [];
}
