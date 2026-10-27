/** Loading placeholder shaped like the research notebook workspace. */
export function WorkspaceSkeleton() {
  return (
    <div role="status" aria-label="Loading research notebook" className="flex animate-pulse flex-col gap-8">
      <div className="flex flex-col gap-3">
        <div className="h-4 w-24 rounded bg-surface" />
        <div className="h-8 w-2/3 max-w-lg rounded bg-surface" />
        <div className="h-5 w-32 rounded-full bg-surface" />
      </div>
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-8">
        <div className="flex gap-2 lg:flex-col">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="h-10 w-28 rounded-lg bg-surface lg:w-full" />
          ))}
        </div>
        <div className="h-96 rounded-2xl border border-line bg-surface" />
      </div>
    </div>
  );
}
