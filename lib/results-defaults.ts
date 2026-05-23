import {
  RESULT_FIELD_KEYS,
  ResultFieldKey,
  ResultTemplateConfig,
  ResultTextBox,
} from "@/lib/results-types";

export const DEFAULT_RESULT_TEMPLATE_ID = "default-result-template";
export const RESULT_POSTER_WIDTH = 1080;
export const RESULT_POSTER_HEIGHT = 1080;
export const RESULT_AD_HEIGHT = 270;

const posterFont = "Noto Sans Malayalam";

function box(input: Partial<ResultTextBox>): ResultTextBox {
  return {
    x: 0.1,
    y: 0.1,
    width: 0.8,
    height: 0.08,
    fontSize: 42,
    minFontSize: 24,
    fontFamily: posterFont,
    fontWeight: 700,
    color: "#111827",
    lineHeight: 1.12,
    textAlign: "center",
    verticalAlign: "middle",
    textTransform: "none",
    ...input,
  };
}

const defaultFields: Record<ResultFieldKey, ResultTextBox> = {
  resultNumber: box({
    x: 0.36,
    y: 0.13,
    width: 0.28,
    height: 0.07,
    fontSize: 46,
    minFontSize: 28,
    fontWeight: 800,
    color: "#111827",
    textTransform: "uppercase",
  }),
  categoryName: box({
    x: 0.22,
    y: 0.22,
    width: 0.56,
    height: 0.05,
    fontSize: 28,
    minFontSize: 18,
    fontWeight: 500,
    color: "#b45309",
    textTransform: "uppercase",
  }),
  competitionName: box({
    x: 0.16,
    y: 0.28,
    width: 0.68,
    height: 0.1,
    fontSize: 44,
    minFontSize: 24,
    fontWeight: 800,
    color: "#111827",
    textTransform: "uppercase",
  }),
  firstPosition: box({
    x: 0.17,
    y: 0.47,
    width: 0.09,
    height: 0.08,
    fontSize: 52,
    minFontSize: 34,
    fontWeight: 700,
    color: "#b45309",
  }),
  firstName: box({
    x: 0.29,
    y: 0.45,
    width: 0.58,
    height: 0.06,
    fontSize: 46,
    minFontSize: 26,
    fontWeight: 800,
    textAlign: "left",
  }),
  firstUnit: box({
    x: 0.29,
    y: 0.51,
    width: 0.52,
    height: 0.045,
    fontSize: 28,
    minFontSize: 18,
    fontWeight: 500,
    color: "#374151",
    textAlign: "left",
  }),
  secondPosition: box({
    x: 0.17,
    y: 0.61,
    width: 0.09,
    height: 0.08,
    fontSize: 52,
    minFontSize: 34,
    fontWeight: 700,
    color: "#b45309",
  }),
  secondName: box({
    x: 0.29,
    y: 0.59,
    width: 0.58,
    height: 0.06,
    fontSize: 46,
    minFontSize: 26,
    fontWeight: 800,
    textAlign: "left",
  }),
  secondUnit: box({
    x: 0.29,
    y: 0.65,
    width: 0.52,
    height: 0.045,
    fontSize: 28,
    minFontSize: 18,
    fontWeight: 500,
    color: "#374151",
    textAlign: "left",
  }),
  thirdPosition: box({
    x: 0.17,
    y: 0.75,
    width: 0.09,
    height: 0.08,
    fontSize: 52,
    minFontSize: 34,
    fontWeight: 700,
    color: "#b45309",
  }),
  thirdName: box({
    x: 0.29,
    y: 0.73,
    width: 0.58,
    height: 0.06,
    fontSize: 46,
    minFontSize: 26,
    fontWeight: 800,
    textAlign: "left",
  }),
  thirdUnit: box({
    x: 0.29,
    y: 0.79,
    width: 0.52,
    height: 0.045,
    fontSize: 28,
    minFontSize: 18,
    fontWeight: 500,
    color: "#374151",
    textAlign: "left",
  }),
};

export function buildDefaultResultTemplate(): ResultTemplateConfig {
  const now = new Date().toISOString();
  return {
    id: DEFAULT_RESULT_TEMPLATE_ID,
    name: "Official Result Poster",
    scopeType: "global",
    scopeValue: null,
    backgroundImage: null,
    size: {
      width: RESULT_POSTER_WIDTH,
      posterHeight: RESULT_POSTER_HEIGHT,
      adHeight: RESULT_AD_HEIGHT,
    },
    fields: RESULT_FIELD_KEYS.reduce(
      (fields, key) => ({
        ...fields,
        [key]: defaultFields[key],
      }),
      {} as ResultTemplateConfig["fields"],
    ),
    resultNumberFormat: "label",
    active: true,
    createdAt: now,
    updatedAt: now,
  };
}
