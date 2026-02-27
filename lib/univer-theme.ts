import type { Theme } from "@univerjs/presets";
import { defaultTheme } from "@univerjs/presets";

const neutralGray: Theme["gray"] = {
  50: "#f4f4f5",
  100: "#e4e4e7",
  200: "#d4d4d8",
  300: "#a1a1aa",
  400: "#71717a",
  500: "#52525b",
  600: "#3f3f46",
  700: "#27272a",
  800: "#18181b",
  900: "#09090b",
};

/** Teal palette matching app primary (oklch hue 183). Selection uses primary/blue. */
const primaryTeal: Theme["primary"] = {
  50: "#f0fdfa",
  100: "#ccfbf1",
  200: "#99f6e4",
  300: "#5eead4",
  400: "#2dd4bf",
  500: "#14b8a6",
  600: "#0d9488",
  700: "#0f766e",
  800: "#115e59",
  900: "#134e4a",
};

export const neutralTheme: Theme = {
  ...defaultTheme,
  white: "#ffffff",
  black: "#020617",
  gray: neutralGray,
  primary: primaryTeal,
  blue: primaryTeal,
};


