import Link from "next/link"

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] px-6 text-white">
      <div className="flex flex-col items-center gap-4 text-center">
        <p className="text-5xl font-bold text-orange-500">404</p>
        <h1 className="text-xl font-semibold">This page doesn&apos;t exist</h1>
        <p className="max-w-sm text-sm text-white/55">
          The page you&apos;re looking for may have been moved or never existed.
        </p>
        <Link
          href="/"
          className="mt-2 rounded-xl bg-orange-500 px-6 py-3 text-sm font-bold text-black transition hover:bg-orange-400"
        >
          Back to marketplace
        </Link>
      </div>
    </div>
  )
}
