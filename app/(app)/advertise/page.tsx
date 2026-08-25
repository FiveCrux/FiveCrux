import Navbar from "@/componentss/shared/navbar"
import Footer from "@/componentss/shared/footer"
import AdvertisePanel from "@/componentss/advertise/advertise-panel"

export default function AdvertisePage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[#0a0a0a] text-white antialiased selection:bg-[#f97316]/30">
        <div className="mx-auto max-w-7xl px-5 pt-8 pb-16 sm:pt-10 md:pt-12">
          <AdvertisePanel />
        </div>
        <Footer />
      </main>
    </>
  )
}
