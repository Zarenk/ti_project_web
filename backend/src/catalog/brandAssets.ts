import path from 'path'

const LOGO_DIR = path.resolve(__dirname, '../../../fronted/public/assets/logos')

export const brandAssets = {
  brands: {
    apple: path.join(LOGO_DIR, 'apple.svg'),
    asus: path.join(LOGO_DIR, 'asus.svg'),
    dell: path.join(LOGO_DIR, 'dell.svg'),
    hp: path.join(LOGO_DIR, 'hp.svg'),
    lenovo: path.join(LOGO_DIR, 'lenovo.svg'),
  },
  gpus: {
    nvidia: path.join(LOGO_DIR, 'nvidia.svg'),
    geforce: path.join(LOGO_DIR, 'nvidia.svg'),
    rtx: path.join(LOGO_DIR, 'nvidia.svg'),
    gtx: path.join(LOGO_DIR, 'nvidia.svg'),
    amd: path.join(LOGO_DIR, 'amd.svg'),
    radeon: path.join(LOGO_DIR, 'amd.svg'),
  },
  cpus: {
    intel: path.join(LOGO_DIR, 'intel.svg'),
    core: path.join(LOGO_DIR, 'intel.svg'),
    amd: path.join(LOGO_DIR, 'amd.svg'),
    ryzen: path.join(LOGO_DIR, 'amd.svg'),
  }
}

export default brandAssets