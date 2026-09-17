export function ScoreDisplay({
  home,
  away,
  live = false,
  large = false,
}: {
  home: number | null;
  away: number | null;
  live?: boolean;
  large?: boolean;
}) {
  return (
    <span
      className={`row-score ${live ? "score-live" : ""} ${large ? "score-display-large" : ""}`}
    >
      {home === null && away === null ? (
        <span className="versus">vs</span>
      ) : (
        <>
          <span className="home-score">{home ?? "–"}</span>
          <span className="score-dash">–</span>
          <span className="away-score">{away ?? "–"}</span>
        </>
      )}
    </span>
  );
}
