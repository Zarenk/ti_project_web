export const logoMap: Record<string, string> = {
  hp: "/logos/hp.svg",
  asus: "/logos/asus.svg",
  nvidia: "/logos/nvidia.svg",
  geforce: "/logos/nvidia.svg",
  rtx: "/logos/nvidia.svg",
  amd: "/logos/amd.svg",
  radeon: "/logos/amd.svg",
  ryzen: "/logos/amd.svg",
};

export function getLogos(brand?: string, graphics?: string | string[]): string[] {
  const logos: string[] = [];
  const addLogo = (key?: string) => {
    if (!key) return;
    const logo = logoMap[key.toLowerCase()];
    if (logo && !logos.includes(logo)) {
      logos.push(logo);
    }
  };

  addLogo(brand);
  if (graphics) {
    const list = Array.isArray(graphics) ? graphics : [graphics];
    list.forEach((g) => addLogo(g));
  }

  return logos;
}