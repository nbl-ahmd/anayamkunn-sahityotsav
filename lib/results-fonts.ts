export const RESULT_FONT_OPTIONS = [
  { label: "Noto Sans Malayalam", value: "Noto Sans Malayalam" },
  { label: "Noto Sans", value: "Noto Sans" },
  { label: "Poppins", value: "Poppins" },
  { label: "Montserrat", value: "Montserrat" },
  { label: "Inter", value: "Inter" },
  { label: "Cooper Black Poster", value: "\"Cooper Black Poster\", serif" },
] as const;

export type ResultFontFamily = (typeof RESULT_FONT_OPTIONS)[number]["value"];

export const RESULT_FONT_VALUES = RESULT_FONT_OPTIONS.map((font) => font.value) as string[];

