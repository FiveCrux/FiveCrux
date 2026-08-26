import Navbar from "@/componentss/shared/navbar"
import Footer from "@/componentss/shared/footer"
import AdvertisePanel from "@/componentss/advertise/advertise-panel"
import type { Metadata } from "next";
import { pageTitle, pageOpenGraph } from "@/lib/seo";

const TITLE = pageTitle("Advertise to FiveM Server Owners");
const DESCRIPTION =
  "Put your FiveM product in front of server owners — ad slots, featured-asset slots and side banners on FiveCrux.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  ...pageOpenGraph(TITLE, DESCRIPTION, "/advertise"),
};

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
