import type {
  CompetitionDirectory,
  CompetitionPageData,
  CompetitionQuery,
  CompetitionSection,
  DirectoryQuery,
} from "@/lib/football/competition-center";

export interface CompetitionRepository {
  directory(query: DirectoryQuery): Promise<CompetitionDirectory>;
  page(
    slug: string,
    season: string | undefined,
    section: CompetitionSection,
    query: CompetitionQuery,
  ): Promise<CompetitionPageData | null>;
}
