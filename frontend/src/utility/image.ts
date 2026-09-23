// Returns the first usable image of a product row. `product_image` is a string[]
// but older cache rows may still carry a single string ("NULL" when unset).
export const firstImage = (v: unknown): string | undefined => {
  const images = Array.isArray(v) ? v : [v];
  return images.find((img): img is string => typeof img === 'string' && img !== '' && img !== 'NULL');
};
