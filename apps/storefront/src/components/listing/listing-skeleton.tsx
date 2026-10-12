// Shown while the product grid streams in. Same shape as the real cards, so nothing jumps.
export const ListingSkeleton = () => (
  <div
    className="grid gap-x-10 gap-y-6 lg:grid-cols-[15rem_minmax(0,1fr)]"
    aria-busy="true"
    aria-label="Loading products"
  >
    <div className="hidden space-y-4 lg:block">
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index} className="h-32 animate-pulse rounded-2xl bg-surface" />
      ))}
    </div>
    <div>
      <div className="mb-4 h-10 w-48 animate-pulse rounded-full bg-surface" />
      <ul className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <li key={index} className="overflow-hidden rounded-2xl border border-muted">
            <div className="aspect-square animate-pulse bg-surface" />
            <div className="space-y-2 p-4">
              <div className="h-3 w-1/3 animate-pulse rounded bg-surface" />
              <div className="h-5 w-4/5 animate-pulse rounded bg-surface" />
              <div className="h-5 w-1/3 animate-pulse rounded bg-surface" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  </div>
);
