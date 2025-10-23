import path from 'path';

const LOGO_DIR = path.resolve(
  __dirname,
  '../../../fronted/public/assets/logos',
);

export const brandAssets = {
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
  },
};

export default brandAssets;
