import Link from "next/link";
import { SiteHeader } from "@/components/layout/site-header";

export function Welcome() {
  return (
    <>
      <SiteHeader />
      <main className="welcome-page">
        <p className="auth-eyebrow">THE BEAUTIFUL GAME, CONNECTED.</p>
        <h1>
          Every match.
          <br />
          One place.
        </h1>
        <p>
          Create an account or log in to explore matches, follow your teams and
          keep up with the scores.
        </p>
        <Link href="/login" className="auth-submit">
          Get started →
        </Link>
      </main>
    </>
  );
}
