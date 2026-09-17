"use client";
import { ErrorState } from "@/components/ui/states";

export default function ErrorPage({ retry }: { retry: () => void }) {
  return (
    <main className="standalone-state">
      <ErrorState
        title="We couldn’t load the match centre."
        action={
          <button className="primary-button" onClick={retry}>
            Try again
          </button>
        }
      />
    </main>
  );
}
