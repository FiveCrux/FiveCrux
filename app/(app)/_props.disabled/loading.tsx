export default function Loading() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="mx-auto max-w-7xl px-4 pt-24 pb-8 sm:px-6 lg:px-10">
        {/* Header */}
        <div className="space-y-3 border-b border-white/5 pb-8">
          <div className="h-4 w-32 animate-pulse rounded-lg border border-white/[0.06] bg-white/[0.04]" />
          <div className="h-9 w-56 animate-pulse rounded-lg border border-white/[0.06] bg-white/[0.04]" />
          <div className="h-4 w-80 max-w-full animate-pulse rounded-lg border border-white/[0.06] bg-white/[0.04]" />
        </div>

        {/* Filter bar */}
        <div className="my-6 flex flex-wrap gap-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-8 w-28 animate-pulse rounded-full border border-white/[0.06] bg-white/[0.04]"
            />
          ))}
        </div>

        {/* Card grid */}
        <div className="grid grid-cols-1 gap-[18px] md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.04]"
            >
              <div className="h-52 w-full animate-pulse bg-white/[0.04]" />
              <div className="space-y-3 p-4">
                <div className="h-5 w-3/4 animate-pulse rounded-lg bg-white/[0.06]" />
                <div className="h-4 w-1/2 animate-pulse rounded-lg bg-white/[0.06]" />
                <div className="flex gap-2">
                  <div className="h-5 w-14 animate-pulse rounded-lg bg-white/[0.06]" />
                  <div className="h-5 w-14 animate-pulse rounded-lg bg-white/[0.06]" />
                </div>
                <div className="mt-2 h-9 w-full animate-pulse rounded-xl bg-white/[0.06]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
