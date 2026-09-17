"use client";
import { ErrorState } from "@/components/ui/states";
import { MatchCenterShell } from "@/components/football/match-center-shared";

export default function CompetitionError({ retry }: { retry: () => void }) {
  return (
    <MatchCenterShell view="competitions">
      <ErrorState
        title="We couldn’t load this competition."
        description="Competition data is temporarily unavailable. Please try again."
        action={
          <button className="primary-button" onClick={retry}>
            Try again
          </button>
        }
      />
    </MatchCenterShell>
  );
}
