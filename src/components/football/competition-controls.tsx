"use client";
import Link, { useLinkStatus } from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { Trophy } from "lucide-react";
import {
  competitionHref,
  type CompetitionPageData,
} from "@/lib/football/competition-center";

function NavigationHint() {
  const { pending } = useLinkStatus();
  return (
    <span
      className={`cc-link-hint ${pending ? "cc-link-pending" : ""}`}
      role="status"
    >
      {pending ? "Loading…" : ""}
    </span>
  );
}
export function CompetitionLink({
  href,
  children,
  className,
  current,
}: {
  href: string;
  children: ReactNode;
  className?: string;
  current?: boolean;
}) {
  return (
    <Link
      href={href}
      prefetch={false}
      className={className}
      aria-current={current ? "page" : undefined}
    >
      {children}
      <NavigationHint />
    </Link>
  );
}
export function CompetitionEmblem({
  name,
  logoUrl,
}: {
  name: string;
  logoUrl: string | null;
}) {
  const [failed, setFailed] = useState(false);
  const resolvedLogoUrl = name.toLowerCase().includes("primera division")
    ? "https://media.api-sports.io/football/leagues/140.png"
    : logoUrl;
  let safe = false;
  try {
    const url = new URL(resolvedLogoUrl ?? "");
    safe = url.protocol === "https:" && !url.username && !url.password;
  } catch {}
  return (
    <span className="cc-emblem" aria-hidden="true">
      {safe && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={resolvedLogoUrl!}
          alt=""
          width={48}
          height={48}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        <Trophy size={32} strokeWidth={1.5} aria-label={name} />
      )}
    </span>
  );
}
export function CompetitionControls({
  data,
}: {
  data: Pick<
    CompetitionPageData,
    "competition" | "season" | "seasons" | "stages" | "section" | "query"
  >;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { competition, seasons, season, stages, section, query } = data;
  const stage = stages.find((item) => item.slug === query.stage);
  const navigate = (href: string) =>
    startTransition(() => router.push(href, { scroll: false }));
  return (
    <>
      <div className="cc-controls" aria-busy={pending}>
        <label>
          Season
          <select
            aria-label="Season"
            disabled={pending || !seasons.length}
            value={season?.slug ?? ""}
            onChange={(event) =>
              navigate(
                competitionHref(competition.slug, section, event.target.value, {
                  view: query.view,
                }),
              )
            }
          >
            {!seasons.length && <option value="">No seasons available</option>}
            {seasons.map((item) => (
              <option key={item.id} value={item.slug}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Stage
          <select
            aria-label="Stage"
            disabled={pending || !stages.length}
            value={query.stage ?? ""}
            onChange={(event) =>
              navigate(
                competitionHref(competition.slug, section, season?.slug, {
                  stage: event.target.value || undefined,
                  view: query.view,
                }),
              )
            }
          >
            <option value="">All stages</option>
            {stages.map((item) => (
              <option key={item.id} value={item.slug}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        {!!stage?.groups.length && (
          <label>
            Group
            <select
              aria-label="Group"
              disabled={pending}
              value={query.group ?? ""}
              onChange={(event) =>
                navigate(
                  competitionHref(competition.slug, section, season?.slug, {
                    stage: query.stage,
                    group: event.target.value || undefined,
                    view: query.view,
                  }),
                )
              }
            >
              <option value="">All groups</option>
              {stage.groups.map((item) => (
                <option key={item.id} value={item.slug}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <span
          className={`cc-control-status ${pending ? "cc-is-loading" : ""}`}
          role="status"
        >
          {pending ? "Loading competition…" : "Season & stage selection"}
        </span>
      </div>
      <nav
        className="cc-tabs"
        aria-label="Competition sections"
        aria-busy={pending}
      >
        {(
          [
            ["overview", "Overview"],
            ["standings", "Standings"],
            ["matches", "Matches"],
            ["stats", "Statistics"],
          ] as const
        ).map(([key, label]) => (
          <Link
            key={key}
            href={competitionHref(competition.slug, key, season?.slug, query)}
            prefetch={false}
            aria-current={section === key ? "page" : undefined}
            aria-disabled={pending}
            onNavigate={(event) => {
              event.preventDefault();
              if (!pending)
                navigate(
                  competitionHref(competition.slug, key, season?.slug, query),
                );
            }}
          >
            {label}
          </Link>
        ))}
      </nav>
    </>
  );
}
