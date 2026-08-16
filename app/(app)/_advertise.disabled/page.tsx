// ADS-DISABLED 2026-08-16: advertising disabled — payment gateway rejected the
// ad business. See .hudson/specs/disable-advertiser-flows.md
//
// This folder is named `_advertise.disabled` on purpose. The leading underscore
// makes it a Next.js PRIVATE folder, so `/advertise` is not a route at all and
// the router 404s before any rendering happens.
//
// Calling `notFound()` from a still-registered page was NOT enough: the route
// still matched, so Next.js streamed the response and returned HTTP 200 with
// the 404 UI painted inside it. A gateway reviewer (or a crawler) sees the
// status, not the pixels — locked by scripts/check-ads-disabled.mjs.
//
// RESTORE: rename this folder back to `advertise` and uncomment the body below.

// import Navbar from "@/componentss/shared/navbar"
// import Footer from "@/componentss/shared/footer"
// import AdvertisePanel from "@/componentss/advertise/advertise-panel"

// export default function AdvertisePage() {
//   return (
//     <>
//       <Navbar />
//       <main className="min-h-screen bg-[#0a0a0a] text-white antialiased selection:bg-[#f97316]/30">
//         <div className="mx-auto max-w-7xl px-5 pt-8 pb-16 sm:pt-10 md:pt-12">
//           <AdvertisePanel />
//         </div>
//         <Footer />
//       </main>
//     </>
//   )
// }

export {}
