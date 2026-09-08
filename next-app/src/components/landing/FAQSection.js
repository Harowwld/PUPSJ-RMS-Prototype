"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState(0);

  const faqs = [
    {
      id: "how-to-request",
      q: "How do I request my school records?",
      a: "Log in with your Student Number, choose the document you need (like your TOR, grades, or diploma), and submit your request online. No paper forms needed."
    },
    {
      id: "forgot-student-number",
      q: "I forgot my student number. Can I still request?",
      a: "Yes! You can skip the student number and enter your full name, course, and years attended. Our staff will find your file in the records archive."
    },
    {
      id: "processing-time",
      q: "How long does it take to process my request?",
      a: "Regular certificates take 3 working days. Clearances take 7 days, and full transcripts (TOR) take up to 20 days. You will be notified when it is ready for pickup."
    },
    {
      id: "representative-pickup",
      q: "Can someone else pick up my document for me?",
      a: "Yes. They just need to bring: (1) an authorization letter signed by you, (2) a copy of your valid ID, and (3) their own valid ID."
    },
    {
      id: "cutoff-time",
      q: "What time does daily evaluation cut off?",
      a: "Cut-off is 3:00 PM on weekdays (Monday to Friday). Requests submitted after 3:00 PM are evaluated the next working morning."
    },
    {
      id: "claiming-deadline",
      q: "How long do I have to claim my document?",
      a: "Please claim your document within 90 days after notification. Unclaimed documents are safely disposed of after 90 days to protect your privacy."
    }
  ];

  const toggleFaq = (idx) => {
    setOpenIndex((prev) => (prev === idx ? null : idx));
  };

  return (
    <section 
      id="faq" 
      className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 sm:pt-16 lg:pt-20 pb-24 sm:pb-32 w-full font-inter select-none scroll-mt-24"
    >
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="rounded-[2.5rem] bg-zinc-950 text-white border border-white/[0.08] shadow-[0_30px_70px_-20px_rgba(0,0,0,0.6)] overflow-hidden p-8 sm:p-14 relative"
      >
        {/* Ambient lighting effects */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#800000]/15 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-zinc-800/30 rounded-full blur-[140px] pointer-events-none" />

        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-12 relative z-10">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 mt-3 leading-relaxed font-normal">
            Quick answers on requesting, tracking, and claiming your official school records.
          </p>
        </div>

        {/* Scroll-Triggered Accordion List (revealing one by one) */}
        <div className="max-w-3xl mx-auto space-y-3.5 relative z-10">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;

            return (
              <motion.div
                key={faq.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-30px" }}
                transition={{
                  duration: 0.5,
                  delay: idx * 0.06,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                  isOpen
                    ? "bg-zinc-900 border-white/20 shadow-md shadow-black/40"
                    : "bg-zinc-900/60 border-white/[0.08] hover:bg-zinc-900/90 hover:border-white/15"
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(idx)}
                  className="w-full flex items-center justify-between p-5 text-left cursor-pointer select-none transition-colors"
                  aria-expanded={isOpen}
                >
                  <div className="flex items-center gap-3.5 pr-3">
                    <span className="font-mono text-[11px] font-bold text-red-400 shrink-0">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <span className="text-sm font-bold text-white tracking-tight leading-snug">
                      {faq.q}
                    </span>
                  </div>

                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-transform duration-300 ${
                    isOpen ? "bg-[#800000] text-white rotate-180" : "bg-white/10 text-zinc-400"
                  }`}>
                    <i className="ph-bold ph-caret-down text-xs" />
                  </div>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      key="content"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-zinc-300 leading-relaxed border-t border-white/[0.08] font-normal">
                        <p className="pt-3.5">{faq.a}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

      </motion.div>
    </section>
  );
}


