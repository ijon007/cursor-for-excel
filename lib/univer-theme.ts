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

export const neutralTheme: Theme = {
  ...defaultTheme,
  // Keep existing accent palette, but make neutrals more gray / less blue.
  white: "#ffffff",
  black: "#020617",
  gray: neutralGray,
};


