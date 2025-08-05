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
    hp: '/assets/logos/hp.svg',
    asus: '/assets/logos/asus.svg',
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
}

export default brandAssets