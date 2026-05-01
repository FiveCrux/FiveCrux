"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/componentss/ui/accordion";
import { HelpCircle } from "lucide-react";

const faqs = [
  {
    question: "How does publishing a script work?",
    answer:
      "Developers can submit their scripts through the developer panel. Each submission goes through a review process to ensure quality, security, and compatibility before being published.",
  },
  {
    question: "Who owns the script rights?",
    answer:
      "Developers retain full ownership of their scripts. FiveCrux only provides the platform for promotion.",
  },
  {
    question: "Is there any publishing fee?",
    answer: "There is no upfront fee to publish scripts.",
  },
  {
    question: "Can I host giveaways on FiveCrux?",
    answer:
      "Yes. Developers can create and publish giveaways to promote their scripts, gain visibility, and reach a wider FiveM audience.",
  },
];

export default function FAQSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <section
      className="relative py-28 px-4 sm:px-6 lg:px-8 overflow-hidden"
      style={{ background: "#000000" }}
    >
      {/* Top rule */}
      <div
        aria-hidden="true"
        className="absolute top-0 inset-x-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)",
        }}
      />

      {/* Ambient glow */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 50% 60% at 50% 50%, rgba(249,115,22,0.03) 0%, transparent 70%)",
        }}
      />

      <div ref={ref} className="max-w-3xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="text-center mb-14"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/8 bg-white/[0.03] mb-5">
            <HelpCircle className="h-3 w-3 text-orange-500" />
            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-widest">
              Support
            </span>
          </div>

          <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tighter mb-4">
            Frequently Asked{" "}
            <span
              style={{
                background: "linear-gradient(90deg, #f97316, #eab308)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Questions
            </span>
          </h2>
        </motion.div>

        {/* Accordion */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Accordion type="single" collapsible className="w-full space-y-3">
            {faqs.map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -12 }}
                animate={inView ? { opacity: 1, x: 0 } : {}}
                transition={{
                  duration: 0.5,
                  delay: 0.3 + i * 0.08,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <AccordionItem
                  value={`faq-${i}`}
                  className="rounded-xl overflow-hidden"
                  style={{
                    background: "#070707",
                    border: "1px solid rgba(255,255,255,0.07)",
                  }}
                >
                  <AccordionTrigger
                    className="px-6 py-5 text-base font-semibold text-white/90 hover:no-underline hover:text-orange-400 transition-colors duration-200 data-[state=open]:text-orange-400"
                    style={{ borderBottom: "none" }}
                  >
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-5 text-neutral-500 text-sm leading-relaxed">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              </motion.div>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
}
