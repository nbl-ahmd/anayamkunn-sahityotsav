import { hasDatabaseUrl } from "@/lib/db";
import * as fileStore from "@/lib/results-store-file";
import * as postgresStore from "@/lib/results-store-postgres";
import {
  PublishResultInput,
  PublishedResult,
  ResultAdConfig,
  ResultsAdminSnapshot,
  ResultsPublicSnapshot,
  ResultTemplateConfig,
  SaveResultAdInput,
  SaveResultTemplateInput,
} from "@/lib/results-types";

function shouldUsePostgres(): boolean {
  return hasDatabaseUrl();
}

export async function getAdminResultsSnapshot(): Promise<ResultsAdminSnapshot> {
  return shouldUsePostgres()
    ? postgresStore.getAdminResultsSnapshot()
    : fileStore.getAdminResultsSnapshot();
}

export async function getPublicResultsSnapshot(): Promise<ResultsPublicSnapshot> {
  return shouldUsePostgres()
    ? postgresStore.getPublicResultsSnapshot()
    : fileStore.getPublicResultsSnapshot();
}

export async function saveResultTemplate(
  input: SaveResultTemplateInput,
): Promise<ResultTemplateConfig> {
  return shouldUsePostgres()
    ? postgresStore.saveResultTemplate(input)
    : fileStore.saveResultTemplate(input);
}

export async function saveResultAd(input: SaveResultAdInput): Promise<ResultAdConfig> {
  return shouldUsePostgres() ? postgresStore.saveResultAd(input) : fileStore.saveResultAd(input);
}

export async function publishResult(input: PublishResultInput): Promise<PublishedResult> {
  return shouldUsePostgres() ? postgresStore.publishResult(input) : fileStore.publishResult(input);
}

export async function clearPublishedResults(): Promise<void> {
  return shouldUsePostgres() ? postgresStore.clearPublishedResults() : fileStore.clearPublishedResults();
}

export async function deletePublishedResult(resultId: string): Promise<void> {
  return shouldUsePostgres()
    ? postgresStore.deletePublishedResult(resultId)
    : fileStore.deletePublishedResult(resultId);
}

export async function renderPublishedResultPoster(input: {
  resultId: string;
  templateId?: string;
}): Promise<{ buffer: Buffer; result: PublishedResult; template: ResultTemplateConfig }> {
  return shouldUsePostgres()
    ? postgresStore.renderPublishedResultPoster(input)
    : fileStore.renderPublishedResultPoster(input);
}
