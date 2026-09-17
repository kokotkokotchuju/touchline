import type {
  CenterCatalogue,
  MatchCenterDetail,
  MatchCenterPage,
  MatchCenterQuery,
} from "@/lib/football/match-center";

export interface MatchCenterRepository {
  catalogue(): Promise<CenterCatalogue>;
  list(query: MatchCenterQuery): Promise<MatchCenterPage>;
  detail(publicId: string): Promise<MatchCenterDetail | null>;
}
