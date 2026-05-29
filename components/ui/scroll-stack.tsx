"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { useSession, signIn } from "next-auth/react";
import { MousePointerClick } from "lucide-react";
import { InteractiveGradient } from "@/components/ui/interactive-gradient";

export function ScrollCardStack() {
  const { status } = useSession();
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  // Statically declare all Framer Motion hooks at the top level
  // to fully comply with the Rules of Hooks.

  // Card 0 (Publish Your Script)
  const scale0 = useTransform(scrollYProgress, [0, 0.3, 0.45, 0.7, 0.85, 1], [1, 1, 0.96, 0.96, 0.92, 0.92]);
  const y0 = useTransform(scrollYProgress, [0, 0.3, 0.45, 0.7, 0.85, 1], ["0%", "0%", "0%", "0%", "0%", "0%"]);
  const opacity0 = useTransform(scrollYProgress, [0, 0.3, 0.45, 0.7, 0.85, 1], [1, 1, 0.35, 0.35, 0.1, 0.1]);
  const brightness0 = useTransform(scrollYProgress, [0, 0.3, 0.45, 0.7, 0.85, 1], [1, 1, 0.6, 0.6, 0.3, 0.3]);
  const filter0 = useTransform(brightness0, (b) => `brightness(${b})`);

  // Card 1 (Create Your Giveaway)
  const scale1 = useTransform(
    scrollYProgress,
    [0, 0.15, 0.45, 0.7, 0.85, 1],
    [0.96, 0.96, 1, 1, 0.96, 0.96]
  );
  const y1 = useTransform(
    scrollYProgress,
    [0, 0.15, 0.45, 0.7, 0.85, 1],
    ["105%", "105%", "0%", "0%", "0%", "0%"]
  );
  const opacity1 = useTransform(
    scrollYProgress,
    [0, 0.15, 0.45, 0.7, 0.85, 1],
    [0, 0, 1, 1, 0.35, 0.35]
  );
  const brightness1 = useTransform(
    scrollYProgress,
    [0, 0.15, 0.45, 0.7, 0.85, 1],
    [0.3, 0.3, 1, 1, 0.6, 0.6]
  );
  const filter1 = useTransform(brightness1, (b) => `brightness(${b})`);

  // Card 2 (Publish Your Prop)
  const scale2 = useTransform(scrollYProgress, [0, 0.55, 0.85, 1], [0.96, 0.96, 1, 1]);
  const y2 = useTransform(scrollYProgress, [0, 0.55, 0.85, 1], ["105%", "105%", "0%", "0%"]);
  const opacity2 = useTransform(scrollYProgress, [0, 0.55, 0.85, 1], [0, 0, 1, 1]);
  const brightness2 = useTransform(scrollYProgress, [0, 0.55, 0.85, 1], [0.3, 0.3, 1, 1]);
  const filter2 = useTransform(brightness2, (b) => `brightness(${b})`);

  // Bundle transforms for rendering
  const cardsTransforms = [
    { scale: scale0, y: y0, opacity: opacity0, filter: filter0 },
    { scale: scale1, y: y1, opacity: opacity1, filter: filter1 },
    { scale: scale2, y: y2, opacity: opacity2, filter: filter2 },
  ];

  const cards = [
    {
      id: 1,
      title: "Publish Your Script",
      description:
        "Every huge store starts with a great idea and yours could be next. Share published mods and get instant exposure. With us your scripts evolve alongside the community that loves it.",
      image: "/gtav_1.jpg",
      gradient: {
        color1: "#f97316", // orange
        color2: "#dc2626", // red
        color3: "#7c3aed", // purple
      },
      href: "/scripts/submit",
      btnText: "Submit Your Script",
    },
    {
      id: 2,
      title: "Create Your Giveaway",
      description:
        "Create and publish giveaways to promote your scripts and get instant exposure. With us your giveaways evolve alongside the community that loves it.",
      image: "/gtav_2.jpg",
      gradient: {
        color1: "#ea580c", // dark orange
        color2: "#e11d48", // rose
        color3: "#4f46e5", // indigo
      },
      href: "/giveaways/create",
      btnText: "Create Your Giveaway",
    },
    {
      id: 3,
      title: "Publish Your Prop",
      description:
        "Showcase your custom 3D models and props to the FiveM community. Join our growing marketplace of high-quality assets and reach thousands of server owners.",
      image: "/gtav_3.jpg",
      gradient: {
        color1: "#ca8a04", // yellow
        color2: "#ea580c", // orange
        color3: "#dc2626", // red
      },
      href: "/props/submit",
      btnText: "Submit Your Prop",
    },
  ];

  return (
    <div
      ref={containerRef}
      className="relative w-full min-h-[200vh] py-10"
      style={{
        contentVisibility: "auto",
      }}
    >
      <div className="sticky top-[16vh] w-full max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-center overflow-visible">
        <div className="relative w-full max-w-5xl h-[360px] sm:h-[400px] md:h-[450px] overflow-hidden rounded-2xl md:rounded-[32px] border border-white/10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)]">
          {cards.map((card, i) => {
            const transform = cardsTransforms[i];

            return (
              <motion.div
                key={card.id}
                className="absolute inset-0 w-full h-full overflow-hidden bg-[#131313]/60 backdrop-blur-md"
                style={{
                  scale: transform.scale,
                  y: transform.y,
                  opacity: transform.opacity,
                  zIndex: i + 1,
                  filter: transform.filter,
                }}
              >
                {/* Background Image using Next.js Image component for best LCP performance */}
                <div className="absolute inset-0 w-full h-full opacity-50">
                  <Image
                    src={card.image}
                    alt={card.title}
                    fill
                    priority={i === 0}
                    sizes="(max-width: 1024px) 100vw, 1024px"
                    className="object-cover object-top"
                    style={{
                      filter: "contrast(1.05) saturate(0.95)",
                    }}
                  />
                </div>

                {/* Animated Interactive Gradient Overlay */}
                <div className="absolute inset-0 mix-blend-screen opacity-[0.72] pointer-events-none">
                  <InteractiveGradient
                    color1={card.gradient.color1}
                    color2={card.gradient.color2}
                    color3={card.gradient.color3}
                    loopDuration={14}
                    orbitRadius={26}
                    followStrength={0.4}
                    blur={70}
                    brightness={1.15}
                  />
                </div>

                {/* Corner Vignette & Blending to make card boundaries smooth into background #131313 */}
                <div className="absolute inset-0 pointer-events-none rounded-2xl md:rounded-[32px] shadow-[inset_0_0_90px_rgba(19,19,19,0.95),inset_0_0_35px_rgba(19,19,19,0.85)]" />

                {/* Content */}
                <div className="absolute inset-0 flex flex-col items-start justify-center p-6 sm:p-10 md:p-16 z-10">
                  <div className="max-w-2xl flex flex-col items-start gap-4 md:gap-5">
                    <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6.5xl font-extrabold text-white tracking-tight leading-none drop-shadow-md">
                      {card.title}
                    </h2>
                    <p className="text-gray-200/95 text-xs sm:text-sm md:text-base leading-relaxed text-left max-w-xl drop-shadow-sm">
                      {card.description}
                    </p>
                    <div className="mt-2">
                      {status === "authenticated" ? (
                        <Link href={card.href}>
                          <button className="bg-white text-black font-extrabold px-6 sm:px-8 py-3 text-sm sm:text-base md:text-lg shadow-xl rounded-full hover:bg-gray-200 hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.03] flex items-center gap-2">
                            {card.btnText} <MousePointerClick className="h-4 w-4 sm:h-5 sm:w-5" />
                          </button>
                        </Link>
                      ) : (
                        <button
                          onClick={() => signIn("discord")}
                          className="bg-white text-black font-extrabold px-6 sm:px-8 py-3 text-sm sm:text-base md:text-lg shadow-xl rounded-full hover:bg-gray-200 hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.03] flex items-center gap-2"
                        >
                          {card.btnText} <MousePointerClick className="h-4 w-4 sm:h-5 sm:w-5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
