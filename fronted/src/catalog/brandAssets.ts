export interface BrandAssets {
  brands: Record<string, string>
  gpus: Record<string, string>
  cpus: Record<string, string>
  storage: Record<string, string>
}

export const brandAssets: BrandAssets = {
  brands: {
    apple: '/assets/logos/apple.svg',
    dell: '/assets/logos/dell.svg',
  },
  gpus: {
    nvidia: '/assets/logos/nvidia.svg',
    amd: '/assets/logos/amd.svg',
  },
  cpus: {
    intel: '/assets/logos/intel.svg',
    amd: '/assets/logos/amd.svg',
  },
  storage: {
    samsung: '/assets/logos/samsung.svg',
    seagate: '/assets/logos/seagate.svg',
  },
}

export default brandAssets