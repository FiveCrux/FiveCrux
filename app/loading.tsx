export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] text-white">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-orange-500" />
        <p className="text-sm text-white/40">Loading…</p>
      </div>
    </div>
  )
}
