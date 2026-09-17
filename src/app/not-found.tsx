import Link from "next/link";

export default function NotFound() {
  return (
    <main className="standalone-state">
      <span className="section-kicker">404 · OUT OF PLAY</span>
      <h1>This page is off the pitch.</h1>
      <p>Head back to the match centre to find your next game.</p>
      <Link className="primary-button" href="/">
        Back to matches
      </Link>
    </main>
  );
}
