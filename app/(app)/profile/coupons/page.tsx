import Navbar from "@/componentss/shared/navbar";
import Footer from "@/componentss/shared/footer";
import CouponsTab from "@/componentss/profile/coupons-tab";

export default function ProfileCouponsPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen px-4 py-8 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <CouponsTab />
        </div>
      </main>
      <Footer />
    </>
  );
}
