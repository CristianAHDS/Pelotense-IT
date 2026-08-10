import './Skeleton.css';

export function SkeletonCard() {
  return (
    <div className="skeleton skeleton-card">
      <div className="skeleton-circle" />
      <div className="skeleton-lines">
        <div className="skeleton-line short" />
        <div className="skeleton-line medium" />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5 }) {
  return (
    <div className="skeleton-table">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton-row">
          <div className="skeleton-cell w-20" />
          <div className="skeleton-cell w-60" />
          <div className="skeleton-cell w-28" />
          <div className="skeleton-cell w-24" />
          <div className="skeleton-cell w-32" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonPanel() {
  return (
    <div className="skeleton skeleton-panel">
      <div className="skeleton-line medium" />
      <div className="skeleton-bar" />
      <div className="skeleton-bar" />
      <div className="skeleton-bar short-bar" />
    </div>
  );
}

export function SkeletonKanban() {
  return (
    <div className="skeleton-kanban">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="skeleton-col">
          <div className="skeleton-col-header" />
          {Array.from({ length: 2 + i }).map((_, j) => (
            <div key={j} className="skeleton-kanban-card">
              <div className="skeleton-line medium" />
              <div className="skeleton-line short" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
