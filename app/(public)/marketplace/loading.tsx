export default function Loading() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Hero header */}
      <div className="border-b border-white/[0.06]">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 py-16 text-center sm:px-6 lg:px-8 lg:py-20">
          <div className="h-6 w-32 animate-pulse rounded-full border border-white/[0.06] bg-white/[0.04]" />
          <div className="h-10 w-3/4 max-w-xl animate-pulse rounded-2xl border border-white/[0.06] bg-white/[0.04]" />
          <div className="h-5 w-2/3 max-w-md animate-pulse rounded-lg border border-white/[0.06] bg-white/[0.04]" />
          <div className="mt-2 h-11 w-48 animate-pulse rounded-xl border border-white/[0.06] bg-white/[0.04]" />
        </div>
      </div>

      {/* Catalog */}
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Search + filter */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="h-12 flex-1 animate-pulse rounded-xl border border-white/[0.06] bg-white/[0.04]" />
          <div className="h-12 w-28 animate-pulse rounded-xl border border-white/[0.06] bg-white/[0.04]" />
        </div>

        {/* Category chips */}
        <div className="mb-6 flex flex-wrap gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-8 w-20 animate-pulse rounded-full border border-white/[0.06] bg-white/[0.04]"
            />
          ))}
        </div>

        {/* Card grid */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.04]"
            >
              <div className="h-40 w-full animate-pulse bg-white/[0.04]" />
              <div className="space-y-3 p-4">
                <div className="h-5 w-3/4 animate-pulse rounded-lg bg-white/[0.06]" />
                <div className="h-4 w-1/2 animate-pulse rounded-lg bg-white/[0.06]" />
                <div className="mt-2 h-6 w-20 animate-pulse rounded-lg bg-white/[0.06]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
