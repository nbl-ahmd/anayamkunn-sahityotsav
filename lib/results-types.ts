import { UnitName } from "@/lib/types";

export const RESULT_CATEGORY_GROUPS = [
  "General",
  "High School",
  "Higher Secondary",
  "Junior",
  "Lower Primary",
  "Senior",
  "Upper Primary",
] as const;

export type ResultCategoryGroup = (typeof RESULT_CATEGORY_GROUPS)[number];

export type ResultTemplateScopeType = "global" | "category" | "program";

export const RESULT_FIELD_KEYS = [
  "resultNumber",
  "categoryName",
  "competitionName",
  "firstPosition",
  "firstName",
  "firstUnit",
  "secondPosition",
  "secondName",
  "secondUnit",
  "thirdPosition",
  "thirdName",
  "thirdUnit",
] as const;

export type ResultFieldKey = (typeof RESULT_FIELD_KEYS)[number];

export interface ResultProgram {
  id: string;
  competitionName: string;
  publicCompetitionName: string;
  category: string;
  categoryGroup: ResultCategoryGroup;
  sortOrder: number;
}

export interface ResultPosterSize {
  width: number;
  posterHeight: number;
  adHeight: number;
}

export interface ResultTextBox {
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  minFontSize: number;
  fontFamily: string;
  fontWeight: number;
  color: string;
  lineHeight: number;
  textAlign: "left" | "center" | "right";
  verticalAlign: "top" | "middle" | "bottom";
  textTransform?: "none" | "uppercase";
}

export type ResultTemplateFields = Record<ResultFieldKey, ResultTextBox>;

export interface ResultTemplateConfig {
  id: string;
  name: string;
  scopeType: ResultTemplateScopeType;
  scopeValue: string | null;
  backgroundImage: string | null;
  size: ResultPosterSize;
  fields: ResultTemplateFields;
  resultNumberFormat: "label" | "number";
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ResultEntry {
  position: 1 | 2 | 3;
  name: string;
  unit: UnitName;
  chestNumber: string;
  codeLetter: string;
  points: string;
}

export interface PublishedResult {
  id: string;
  programId: string;
  competitionName: string;
  category: string;
  categoryGroup: ResultCategoryGroup;
  resultNumber: number;
  entries: ResultEntry[];
  templateId: string;
  adId: string | null;
  posterImageUrl: string;
  status: "published";
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ResultAdConfig {
  id: string;
  name: string;
  imageUrl: string;
  rangeStart: number;
  rangeEnd: number;
  scopeType: ResultTemplateScopeType;
  scopeValue: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ResultStoreData {
  nextResultNumber: number;
  templates: ResultTemplateConfig[];
  ads: ResultAdConfig[];
  results: PublishedResult[];
}

export interface ResultsAdminSnapshot {
  programs: ResultProgram[];
  templates: ResultTemplateConfig[];
  ads: ResultAdConfig[];
  results: PublishedResult[];
}

export interface ResultsPublicSnapshot {
  programs: ResultProgram[];
  results: PublishedResult[];
  templates: ResultTemplateConfig[];
}

export interface PublishResultInput {
  programId: string;
  entries: ResultEntry[];
  templateId?: string;
}

export interface SaveResultTemplateInput {
  id?: string;
  name: string;
  scopeType: ResultTemplateScopeType;
  scopeValue: string | null;
  backgroundImage: string | null;
  size: ResultPosterSize;
  fields: ResultTemplateFields;
  resultNumberFormat?: "label" | "number";
  active: boolean;
}

export interface SaveResultAdInput {
  id?: string;
  name: string;
  imageUrl: string;
  rangeStart: number;
  rangeEnd: number;
  scopeType: ResultTemplateScopeType;
  scopeValue: string | null;
  active: boolean;
}
