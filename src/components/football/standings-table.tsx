import type { Team } from "@/lib/football/types";
import { FormIndicator, type FormResult } from "@/components/ui/indicators";
import { TeamBadge } from "./marks";

export interface StandingRow {
  id: string;
  rank: number;
  team: Team;
  played: number | null;
  won: number | null;
  drawn: number | null;
  lost: number | null;
  goalDifference: number | null;
  points: number | null;
  form: readonly FormResult[];
}

/** Presentation only. Ranking, tie-break rules, and real data belong to later phases. */
export function StandingsTable({
  caption,
  rows,
}: {
  caption: string;
  rows: readonly StandingRow[];
}) {
  return (
    <div
      className="standings-scroll"
      role="region"
      aria-label={caption}
      tabIndex={0}
    >
      <table className="standings-table">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Position</th>
            <th scope="col">Team</th>
            <th scope="col">
              <abbr title="Played">Pld</abbr>
            </th>
            <th scope="col">
              <abbr title="Won">W</abbr>
            </th>
            <th scope="col">
              <abbr title="Drawn">D</abbr>
            </th>
            <th scope="col">
              <abbr title="Lost">L</abbr>
            </th>
            <th scope="col">
              <abbr title="Goal difference">GD</abbr>
            </th>
            <th scope="col">
              <abbr title="Points">Pts</abbr>
            </th>
            <th scope="col">Form</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{row.rank}</td>
              <th scope="row">
                <span className="table-team">
                  <TeamBadge team={row.team} />
                  {row.team.name}
                </span>
              </th>
              <td>{row.played ?? "—"}</td>
              <td>{row.won ?? "—"}</td>
              <td>{row.drawn ?? "—"}</td>
              <td>{row.lost ?? "—"}</td>
              <td>{row.goalDifference ?? "—"}</td>
              <td className="standing-points">{row.points ?? "—"}</td>
              <td>
                <FormIndicator results={row.form} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && (
        <p className="table-empty">No standings available.</p>
      )}
    </div>
  );
}
