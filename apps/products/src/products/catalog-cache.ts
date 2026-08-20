/**
 * Cache lifetimes for the catalog. Categories are embedded in product payloads,
 * so a category write has to reach into the product caches as well — both
 * services share these constants rather than each guessing at the other's TTL.
 */
export const PRODUCT_CACHE_TTL_SECONDS = 600;
export const PRODUCT_LIST_CACHE_TTL_SECONDS = 60;
export const PRODUCT_LIST_VERSION_TTL_SECONDS = 3600;
export const CATEGORY_LIST_CACHE_TTL_SECONDS = 300;

/** The three shapes `activeOnly` can take, as a cache-key-safe token. */
export function categoryListScope(activeOnly: boolean | undefined): string {
  if (activeOnly === undefined) return "all";
  return activeOnly ? "active" : "inactive";
}
