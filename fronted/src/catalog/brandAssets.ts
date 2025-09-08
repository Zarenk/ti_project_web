export interface BrandAssets {
  brands: Record<string, string>
  // Keyword mappings for detecting GPU brands. The value must match a
  // brand name present in the backend `brands` section so the logo can be
  // resolved dynamically from there.
  gpus: Record<string, string>
  // Keyword mappings for detecting CPU brands. Values reference brand names
  // from the backend as well.
  cpus: Record<string, string>
}

export const brandAssets: BrandAssets = {
  brands: {
    acer: '/assets/logos/acer.svg',
    apple: '/assets/logos/apple.svg',
    dell: '/assets/logos/dell.svg',
    hp: '/assets/logos/hp.svg',
    asus: '/assets/logos/asus.svg',
    lenovo: '/assets/logos/lenovo.svg',
  },
  // Keyword lookups for GPU brands mapped to a brand name defined in the
  // backend.
  gpus: {
    nvidia: 'nvidia',
    geforce: 'nvidia',
    rtx: 'nvidia',
    gtx: 'nvidia',
    amd: 'amd',
    radeon: 'amd',
  },
  // Keyword lookups for CPU brands mapped to a brand name defined in the
  // backend.
  cpus: {
    intel: 'intel',
    core: 'intel',
    amd: 'amd',
    ryzen: 'amd',
  },
}

export default brandAssets
