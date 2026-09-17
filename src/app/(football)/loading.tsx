import { MatchListSkeleton } from "@/components/ui/states";

// Scope streaming to football pages so development-only and unknown routes
// can resolve their HTTP status before any loading response is sent.

export default function Loading() {
  return (
    <main className="standalone-state">
      <MatchListSkeleton />
    </main>
  );
}
