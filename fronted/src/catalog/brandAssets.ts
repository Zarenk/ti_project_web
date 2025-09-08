export interface BrandAssets {
  brands: Record<string, string>
  gpus: Record<string, string>
  cpus: Record<string, string>
  storage: Record<string, string>
  // Optional sub-brand/series logos keyed by keyword in product name
  // Example: 'tuf' (ASUS TUF), 'rog' (ASUS ROG), 'predator' (Acer Predator)
  subbrands?: Record<string, string>
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
  gpus: {
    nvidia: '/assets/logos/nvidia.svg',
    geforce: '/assets/logos/nvidia.svg',
    rtx: '/assets/logos/nvidia.svg',
    gtx: '/assets/logos/nvidia.svg',
    amd: '/assets/logos/amd.svg',
    radeon: '/assets/logos/amd.svg',
  },
  cpus: {
    intel: '/assets/logos/intel.svg',
    core: '/assets/logos/intel.svg',
    amd: '/assets/logos/amd.svg',
    ryzen: '/assets/logos/amd.svg',
  },
  storage: {
    samsung: '/assets/logos/samsung.svg',
    seagate: '/assets/logos/seagate.svg',
  },
  // Keywords detected from product titles/descriptions to show an additional logo
  // Add the corresponding SVG/PNG to public/assets/logos if available.
  subbrands: {
    // ASUS series
    tuf: '/assets/logos/asus-tuf.svg',
    rog: '/assets/logos/asus-rog.svg',
    // HP series
    omen: '/assets/logos/hp-omen.svg',
    victus: '/assets/logos/hp-victus.svg',
    // Lenovo series
    legion: '/assets/logos/lenovo-legion.svg',
    // Acer series
    predator: '/assets/logos/acer-predator.svg',
    nitro: '/assets/logos/acer-nitro.svg',
    // Dell series (example)
    alienware: '/assets/logos/dell-alienware.svg',
  },
}

export default brandAssets
