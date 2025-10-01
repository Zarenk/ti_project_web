import { Inter, Lato, Open_Sans, Poppins, Roboto } from "next/font/google";

type TypographyFontDefinition = {
  label: string;
  className: string;
  cssVariable: string;
};

const INTER_VARIABLE_NAME = "--font-inter" as const;
const ROBOTO_VARIABLE_NAME = "--font-roboto" as const;
const POPPINS_VARIABLE_NAME = "--font-poppins" as const;
const OPEN_SANS_VARIABLE_NAME = "--font-open-sans" as const;
const LATO_VARIABLE_NAME = "--font-lato" as const;

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: INTER_VARIABLE_NAME,
});

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
  variable: ROBOTO_VARIABLE_NAME,
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: POPPINS_VARIABLE_NAME,
});

const openSans = Open_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: OPEN_SANS_VARIABLE_NAME,
});

const lato = Lato({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  variable: LATO_VARIABLE_NAME,
});

const toDefinition = (
  label: string,
  font: { variable: string },
  variableName: string,
): TypographyFontDefinition => ({
  label,
  className: font.variable,
  cssVariable: `var(${variableName})`,
});

export const TYPOGRAPHY_FONTS = {
  Inter: toDefinition("Inter", inter, INTER_VARIABLE_NAME),
  Roboto: toDefinition("Roboto", roboto, ROBOTO_VARIABLE_NAME),
  Poppins: toDefinition("Poppins", poppins, POPPINS_VARIABLE_NAME),
  "Open Sans": toDefinition("Open Sans", openSans, OPEN_SANS_VARIABLE_NAME),
  Lato: toDefinition("Lato", lato, LATO_VARIABLE_NAME),
} as const satisfies Record<string, TypographyFontDefinition>;

export type TypographyFontFamily = keyof typeof TYPOGRAPHY_FONTS;

export const TYPOGRAPHY_FONT_CLASSES = Object.values(TYPOGRAPHY_FONTS).map(
  (definition) => definition.className,
);

export function getTypographyFont(
  fontFamily?: string | null,
): TypographyFontDefinition {
  if (fontFamily && fontFamily in TYPOGRAPHY_FONTS) {
    return TYPOGRAPHY_FONTS[fontFamily as TypographyFontFamily];
  }

  return TYPOGRAPHY_FONTS.Inter;
}

export const TYPOGRAPHY_FONT_OPTIONS = Object.entries(TYPOGRAPHY_FONTS).map(
  ([value, definition]) => ({ value, label: definition.label }),
);