"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from "lucide-react";
import { TIME_ZONES, shiftDate } from "@/lib/football/filters";
import {
  MAX_MATCH_DATE,
  MIN_MATCH_DATE,
  matchDateSchema,
  matchesHref,
  utcToday,
  type CenterCatalogue,
  type MatchCenterQuery,
} from "@/lib/football/match-center";

export function MatchCenterControls({
  query,
  date,
  today,
  catalogue,
}: {
  query: MatchCenterQuery;
  date: string;
  today: string;
  catalogue: CenterCatalogue;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  function navigate(next: Partial<MatchCenterQuery>, nextDate = date) {
    if (!matchDateSchema.safeParse(nextDate).success) return;
    startTransition(() =>
      router.push(
        matchesHref(nextDate, { ...query, ...next, cursor: undefined }),
        { scroll: false },
      ),
    );
  }
  return (
    <div className="mc-controls" aria-busy={pending}>
      <div className="mc-date-navigation" aria-label="Match dates">
        <button
          className="icon-button"
          aria-label="Previous day"
          disabled={pending || date === MIN_MATCH_DATE}
          onClick={() => navigate({}, shiftDate(date, -1))}
        >
          <ChevronLeft size={19} />
        </button>
        <div className="mc-date-shortcuts">
          {([-1, 0, 1] as const).map((offset, index) => (
            <button
              key={offset}
              className={date === shiftDate(today, offset) ? "selected" : ""}
              aria-pressed={date === shiftDate(today, offset)}
              disabled={pending}
              onClick={() => navigate({}, shiftDate(utcToday(), offset))}
            >
              {["Yesterday", "Today", "Tomorrow"][index]}
            </button>
          ))}
        </div>
        <button
          className="icon-button"
          aria-label="Next day"
          disabled={pending || date === MAX_MATCH_DATE}
          onClick={() => navigate({}, shiftDate(date, 1))}
        >
          <ChevronRight size={19} />
        </button>
        <label className="mc-calendar">
          <CalendarDays size={17} aria-hidden="true" />
          <span className="sr-only">Choose match date</span>
          <input
            type="date"
            min={MIN_MATCH_DATE}
            max={MAX_MATCH_DATE}
            value={date}
            disabled={pending}
            onChange={(event) => navigate({}, event.target.value)}
          />
        </label>
      </div>
      <div className="mc-filter-line">
        <div
          className="mc-status-filters"
          role="group"
          aria-label="Filter match status"
        >
          {(["all", "live", "upcoming", "finished"] as const).map((status) => (
            <button
              key={status}
              className={query.status === status ? "selected" : ""}
              aria-pressed={query.status === status}
              disabled={pending}
              onClick={() => navigate({ status })}
            >
              {status === "live" && (
                <span className="live-dot" aria-hidden="true" />
              )}
              {status[0].toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
        <label>
          <span>Competition</span>
          <select
            value={query.competition ?? ""}
            disabled={pending}
            onChange={(event) =>
              navigate({ competition: event.target.value || undefined })
            }
          >
            <option value="">All competitions</option>
            {catalogue.competitions.map((competition) => (
              <option key={competition.id} value={competition.slug}>
                {competition.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Kickoff time zone</span>
          <select
            value={query.timeZone}
            disabled={pending}
            onChange={(event) =>
              navigate({
                timeZone: event.target.value as MatchCenterQuery["timeZone"],
              })
            }
          >
            {TIME_ZONES.map((zone) => (
              <option key={zone} value={zone}>
                {zone.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>
        <button
          className="mc-reset"
          disabled={pending}
          onClick={() =>
            navigate({
              country: undefined,
              competition: undefined,
              status: "all",
            })
          }
        >
          <RotateCcw size={14} aria-hidden="true" />
          Reset filters
        </button>
      </div>
      <p className="mc-time-note" role="status">
        {pending
          ? "Loading matches…"
          : `Dates use UTC days. Kickoff times shown in ${query.timeZone.replaceAll("_", " ")}.`}
      </p>
    </div>
  );
}
