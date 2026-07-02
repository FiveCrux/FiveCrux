export default function Loading() {
  return (
    <div className="min-h-screen overflow-x-clip bg-[#0a0a0a] text-white">
      {/* Hero header */}
      <div className="px-3 pt-24 pb-8 sm:px-6">
        <div className="mx-auto max-w-7xl space-y-4">
          <div className="h-7 w-36 animate-pulse rounded-full border border-white/[0.06] bg-white/[0.04]" />
          <div className="h-10 w-72 max-w-full animate-pulse rounded-2xl border border-white/[0.06] bg-white/[0.04]" />
          <div className="h-5 w-2/3 max-w-2xl animate-pulse rounded-lg border border-white/[0.06] bg-white/[0.04]" />
        </div>
      </div>

      {/* Toolbar */}
      <div className="px-3 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3">
          <div className="h-10 flex-1 animate-pulse rounded-xl border border-white/[0.06] bg-white/[0.04]" />
          <div className="h-10 w-32 animate-pulse rounded-xl border border-white/[0.06] bg-white/[0.04]" />
        </div>
      </div>

      {/* Card grid */}
      <div className="mx-auto mt-10 max-w-7xl px-3 pb-20 sm:px-6">
        <div className="grid grid-cols-1 justify-items-center gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="w-full sm:max-w-[280px] overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.04]"
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
