import Link from "next/link";
import { Star, Search, Newspaper } from "lucide-react";
import {
  AccountButton,
  NotificationButton,
} from "@/components/auth/account-button";
import { BrandMark } from "@/components/football/marks";

export function SiteHeader({
  view = "matches",
  initialSaved = false,
  savedCount = 0,
}: {
  view?: "matches" | "competitions";
  initialSaved?: boolean;
  savedCount?: number;
}) {
  return (
    <header className="site-header">
      <div className="header-inner">
        <Link href="/" className="brand" aria-label="Touchline home">
          <BrandMark />
          <span>
            touchline<span className="brand-period">.</span>
          </span>
        </Link>
        <form action="/search" className="header-search" role="search">
          <Search size={18} aria-hidden="true" />
          <input
            name="q"
            aria-label="Search football"
            placeholder="Search for a team, player, or competition..."
            type="search"
            required
            minLength={2}
          />
        </form>
        <nav className="top-nav" aria-label="Main navigation">
          <Link
            href="/"
            className={view === "matches" && !initialSaved ? "active" : ""}
            aria-current={
              view === "matches" && !initialSaved ? "page" : undefined
            }
          >
            Matches
          </Link>
          <Link
            href="/competitions"
            className={view === "competitions" ? "active" : ""}
            aria-current={view === "competitions" ? "page" : undefined}
          >
            Competitions
          </Link>
          <Link
            href="/?saved=1"
            className={initialSaved ? "active" : ""}
            aria-current={initialSaved ? "page" : undefined}
          >
            <Star size={15} /> Saved
            <span className="nav-count">{savedCount}</span>
          </Link>
          <Link href="/news" className="account-link">
            <Newspaper size={15} /> News
          </Link>
          <Link href="/discovery" className="account-link">
            Discover
          </Link>
        </nav>
        <div className="header-end">
          <span className="header-tagline">The beautiful game, connected.</span>
          <NotificationButton />
          <AccountButton />
        </div>
      </div>
    </header>
  );
}
