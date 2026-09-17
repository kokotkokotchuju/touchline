import type { FootballSnapshot } from "@/lib/football/types";

/** Read-side contract. Provider calls belong exclusively to synchronization. */
export interface FootballReadRepository {
  getSnapshot(): Promise<FootballSnapshot>;
}
