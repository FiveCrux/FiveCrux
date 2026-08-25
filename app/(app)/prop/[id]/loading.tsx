export default function Loading() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="mx-auto max-w-7xl px-4 pt-24 pb-16 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <div className="mb-6 h-4 w-48 animate-pulse rounded-lg border border-white/[0.06] bg-white/[0.04]" />

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Gallery column */}
          <div className="lg:col-span-2 space-y-4">
            <div className="aspect-video w-full animate-pulse rounded-2xl border border-white/[0.06] bg-white/[0.04]" />
            <div className="grid grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-video animate-pulse rounded-xl border border-white/[0.06] bg-white/[0.04]"
                />
              ))}
            </div>
            <div className="mt-6 space-y-3">
              <div className="h-6 w-40 animate-pulse rounded-lg border border-white/[0.06] bg-white/[0.04]" />
              <div className="h-4 w-full animate-pulse rounded-lg border border-white/[0.06] bg-white/[0.04]" />
              <div className="h-4 w-11/12 animate-pulse rounded-lg border border-white/[0.06] bg-white/[0.04]" />
              <div className="h-4 w-4/5 animate-pulse rounded-lg border border-white/[0.06] bg-white/[0.04]" />
            </div>
          </div>

          {/* Info column */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.04] p-6">
              <div className="h-7 w-3/4 animate-pulse rounded-lg border border-white/[0.06] bg-white/[0.06]" />
              <div className="mt-4 h-5 w-1/2 animate-pulse rounded-lg border border-white/[0.06] bg-white/[0.06]" />
              <div className="mt-6 h-10 w-32 animate-pulse rounded-lg border border-white/[0.06] bg-white/[0.06]" />
              <div className="mt-6 space-y-3">
                <div className="h-11 w-full animate-pulse rounded-xl border border-white/[0.06] bg-white/[0.06]" />
                <div className="h-11 w-full animate-pulse rounded-xl border border-white/[0.06] bg-white/[0.06]" />
              </div>
            </div>
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.04] p-6">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 animate-pulse rounded-full border border-white/[0.06] bg-white/[0.06]" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-2/3 animate-pulse rounded-lg border border-white/[0.06] bg-white/[0.06]" />
                  <div className="h-3 w-1/2 animate-pulse rounded-lg border border-white/[0.06] bg-white/[0.06]" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
