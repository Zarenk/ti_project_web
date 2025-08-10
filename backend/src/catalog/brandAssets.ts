import path from 'path'

const LOGO_DIR = path.resolve(__dirname, '../../../fronted/public/assets/logos')

export const brandAssets = {
  brands: {
    acer: path.join(LOGO_DIR, 'acer.png'),
    apple: path.join(LOGO_DIR, 'apple.png'),
    dell: path.join(LOGO_DIR, 'dell.png'),
    hp: path.join(LOGO_DIR, 'hp.png'),
    asus: path.join(LOGO_DIR, 'asus.png'),
    lenovo: path.join(LOGO_DIR, 'lenovo.png'),
  },
  gpus: {
    nvidia: path.join(LOGO_DIR, 'nvidia.png'),
    geforce: path.join(LOGO_DIR, 'nvidia.png'),
    rtx: path.join(LOGO_DIR, 'nvidia.png'),
    gtx: path.join(LOGO_DIR, 'nvidia.png'),
    amd: path.join(LOGO_DIR, 'amd.png'),
    radeon: path.join(LOGO_DIR, 'amd.png'),
  },
  cpus: {
    intel: path.join(LOGO_DIR, 'intel.png'),
    core: path.join(LOGO_DIR, 'intel.png'),
    amd: path.join(LOGO_DIR, 'amd.png'),
    ryzen: path.join(LOGO_DIR, 'amd.png'),
  }
}

export default brandAssets