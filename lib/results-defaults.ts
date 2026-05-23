import {
  RESULT_FIELD_KEYS,
  RESULT_POSITION_KEYS,
  ResultFieldKey,
  ResultPositionKey,
  ResultTemplateConfig,
  ResultTemplatePositionMarkers,
  ResultTextBox,
} from "@/lib/results-types";

export const DEFAULT_RESULT_TEMPLATE_ID = "default-result-template";
export const RESULT_POSTER_WIDTH = 1080;
export const RESULT_POSTER_HEIGHT = 1080;
export const RESULT_AD_HEIGHT = 270;

const posterFont = "Noto Sans";

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

const positionFieldKeys: Record<ResultPositionKey, ResultFieldKey> = {
  first: "firstPosition",
  second: "secondPosition",
  third: "thirdPosition",
};

const positionLabels: Record<ResultPositionKey, string> = {
  first: "1",
  second: "2",
  third: "3",
};

export function buildTextPositionMarkers(fields: Record<ResultFieldKey, ResultTextBox>): ResultTemplatePositionMarkers {
  return RESULT_POSITION_KEYS.reduce(
    (markers, key) => ({
      ...markers,
      [key]: {
        mode: "text",
        visible: true,
        text: positionLabels[key],
        box: { ...fields[positionFieldKeys[key]] },
      },
    }),
    {} as ResultTemplatePositionMarkers,
  );
}

const defaultPositionMarkers: ResultTemplatePositionMarkers = buildTextPositionMarkers(defaultFields);

export function clonePositionMarkers(markers: ResultTemplatePositionMarkers): ResultTemplatePositionMarkers {
  return RESULT_POSITION_KEYS.reduce((next, key) => {
    const marker = markers[key];
    if (marker.mode === "text") {
      return {
        ...next,
        [key]: {
          ...marker,
          box: { ...marker.box },
        },
      };
    }
    if (marker.mode === "shape") {
      return {
        ...next,
        [key]: {
          ...marker,
          colors: [...marker.colors],
        },
      };
    }
    return {
      ...next,
      [key]: { ...marker },
    };
  }, {} as ResultTemplatePositionMarkers);
}

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
    positionMarkers: clonePositionMarkers(defaultPositionMarkers),
    resultNumberFormat: "number",
    active: true,
    createdAt: now,
    updatedAt: now,
  };
}
