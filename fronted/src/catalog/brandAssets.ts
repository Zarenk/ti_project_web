import brandAssetsJson from "./brandAssets.json";

export interface BrandAssets {
  brands: Record<string, string>;
  // Keyword mappings for detecting GPU brands. The value must match a
  // brand name present in the backend `brands` section so the logo can be
  // resolved dynamically from there.
  gpus: Record<string, string>;
  // Keyword mappings for detecting CPU brands. Values reference brand names
  // from the backend as well.
  cpus: Record<string, string>;
}

export const brandAssets: BrandAssets = brandAssetsJson as BrandAssets;

export default brandAssets;
