import type { ReactNode } from "react";
import { Search, TriangleAlert } from "lucide-react";

export function EmptyState({
  title = "Nothing here yet",
  description,
  action,
}: {
  title?: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <Search size={30} aria-hidden="true" />
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}

export function ErrorState({
  title = "We couldn’t load this content.",
  description = "Please try again in a moment.",
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="error-state" role="alert">
      <TriangleAlert size={28} aria-hidden="true" />
      <h2>{title}</h2>
      <p>{description}</p>
      {action}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <span className={`skeleton ${className}`} aria-hidden="true" />;
}

export function MatchListSkeleton() {
  return (
    <div className="match-list-skeleton" role="status">
      <span className="sr-only">Loading matches…</span>
      <Skeleton className="skeleton-heading" />
      {Array.from({ length: 4 }, (_, index) => (
        <div className="skeleton-match" key={index}>
          <Skeleton className="skeleton-badge" />
          <Skeleton className="skeleton-team" />
          <Skeleton className="skeleton-score" />
        </div>
      ))}
    </div>
  );
}
