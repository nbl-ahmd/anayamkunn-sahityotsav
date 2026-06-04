import { UnitName, defaultUnits } from "@/lib/types";

export const FONT_OPTIONS = [
  "'Poppins', sans-serif",
  "'Montserrat', sans-serif",
  "'Space Grotesk', sans-serif",
  "'Noto Sans Malayalam', sans-serif",
  "'Noto Serif Malayalam', serif",
  "'Baloo Chettan 2', sans-serif",
  "'Chilanka', cursive",
  "'Merriweather', serif",
  "'Manjari', sans-serif",
  "'Oswald', sans-serif",
];

export const DEFAULT_UNIT_LIST: readonly UnitName[] = defaultUnits;
export const UNIT_LIST: readonly UnitName[] = DEFAULT_UNIT_LIST;

export function resolveUnit(input: string | null | undefined): UnitName | undefined {
  if (!input) {
    return undefined;
  }

  const normalized = input.trim().toLowerCase().replace(/\s+/g, " ");
  return UNIT_LIST.find((unit) => unit.toLowerCase() === normalized);
}
