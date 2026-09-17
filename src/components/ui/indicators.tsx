export function LiveIndicator({
  label = "Live",
  minute,
}: {
  label?: string;
  minute?: number | null;
}) {
  return (
    <span className="live-indicator">
      <span className="live-dot" aria-hidden="true" />
      {minute == null ? label : `${minute}′ · ${label}`}
    </span>
  );
}

export type FormResult = "W" | "D" | "L" | "?";
const resultLabels = {
  W: "Win",
  D: "Draw",
  L: "Loss",
  "?": "Result unavailable",
};
export function FormIndicator({ results }: { results: readonly FormResult[] }) {
  return (
    <ol className="form-indicator" aria-label="Recent form, oldest to newest">
      {results.map((result, index) => (
        <li
          key={index}
          className={`form-result form-${result === "?" ? "unknown" : result.toLowerCase()}`}
          aria-label={resultLabels[result]}
          title={resultLabels[result]}
        >
          {result}
        </li>
      ))}
    </ol>
  );
}
