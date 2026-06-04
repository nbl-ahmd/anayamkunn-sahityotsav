export const defaultUnits = [
  "Anayamkunnu",
  "Kakkad",
  "Sarkkarparamb",
  "Nellikkaparamb",
  "Velliyaparamb",
  "Karuthaparamb",
  "North Anayamkunnu",
  "Chonad",
] as const;

export type UnitName = string;

export interface AppSettings {
  sahithyolsavDate: string | null;
  unitNames: string[];
}
