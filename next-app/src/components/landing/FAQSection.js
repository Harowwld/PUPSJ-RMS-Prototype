"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const DEFAULT_FAQS = [
  {
    id: "how-to-request",
    q: "How do I request my school records?",
    a: "Log in with your Student Number, choose the document you need (like your TOR, grades, or diploma), and submit your request online. No paper forms needed.",
    category: "Requests",
  },
  {
    id: "forgot-student-number",
    q: "I forgot my student number. Can I still request?",
    a: "Yes! You can skip the student number and enter your full name, course, and years attended. Our staff will find your file in the records archive.",
    category: "Requests",
  },
  {
    id: "processing-time",
    q: "How long does it take to process my request?",
    a: "Regular certificates take 3 working days. Clearances take 7 days, and full transcripts (TOR) take up to 20 days. You will be notified when it is ready for pickup.",
    category: "Processing",
  },
  {
    id: "representative-pickup",
    q: "Can someone else pick up my document for me?",
    a: "Yes. They just need to bring: (1) an authorization letter signed by you, (2) a copy of your valid ID, and (3) their own valid ID.",
    category: "Pickup",
  },
  {
    id: "cutoff-time",
    q: "What time does daily evaluation cut off?",
    a: "Cut-off is 3:00 PM on weekdays (Monday to Friday). Requests submitted after 3:00 PM are evaluated the next working morning.",
    category: "Processing",
  },
  {
    id: "claiming-deadline",
    q: "How long do I have to claim my document?",
    a: "Please claim your document within 90 days after notification. Unclaimed documents are safely disposed of after 90 days to protect your privacy.",
    category: "Pickup",
  },
];

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState(0);
  const [activeCategory, setActiveCategory] = useState("all");
  const [faqData, setFaqData] = useState({
    eyebrow: "Clear & Direct University Guidelines",
    heading: "Frequently Asked Questions",
    description: "Quick answers on requesting, tracking, and claiming your official school records.",
    supportCardEnabled: true,
    supportTitle: "Still have questions about your records?",
    supportDescription: "Our Registrar records desk is available Monday to Friday from 8:00 AM to 5:00 PM for verification and assistance.",
    supportButtonText: "Visit Registrar Counter",
    supportButtonLink: "#",
    supportLocation: "Ground Floor, Registrar Window",
    faqs: DEFAULT_FAQS,
  });

  // Fetch dynamic FAQ content from API
  useEffect(() => {
    let isMounted = true;
    fetch("/api/landing/faq", { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (isMounted && json.ok && json.data) {
          setFaqData(json.data);
        }
      })
      .catch((err) => {
        console.warn("[FAQSection] Failed to load dynamic FAQ data:", err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const faqs = Array.isArray(faqData.faqs) && faqData.faqs.length > 0 ? faqData.faqs : DEFAULT_FAQS;

  // Extract unique categories
  const categories = Array.from(
    new Set(faqs.map((f) => f.category || "General").filter(Boolean))
  );

  // Filtered FAQs
  const filteredFaqs = faqs.filter((faq) => {
    if (activeCategory === "all") return true;
    return (faq.category || "General").toLowerCase() === activeCategory.toLowerCase();
  });

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
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12 relative z-10">
          {faqData.eyebrow && (
            <span className="inline-block px-3 py-1 rounded-full bg-pup-maroon/20 border border-pup-maroon/40 text-red-400 font-mono text-[11px] font-semibold uppercase tracking-wider mb-3">
              {faqData.eyebrow}
            </span>
          )}
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight">
            {faqData.heading || "Frequently Asked Questions"}
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 mt-3 leading-relaxed font-normal">
            {faqData.description || "Quick answers on requesting, tracking, and claiming your official school records."}
          </p>

          {/* Interactive Category Filter Pills */}
          {categories.length > 1 && (
            <div className="flex items-center justify-center gap-1.5 flex-wrap mt-6 sm:mt-8">
              <button
                type="button"
                onClick={() => {
                  setActiveCategory("all");
                  setOpenIndex(0);
                }}
                className={cn(
                  "px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer border select-none",
                  activeCategory === "all"
                    ? "bg-white text-zinc-950 border-white shadow-sm"
                    : "bg-white/5 text-zinc-400 border-white/10 hover:border-white/25 hover:text-white"
                )}
              >
                All Questions
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setActiveCategory(cat);
                    setOpenIndex(0);
                  }}
                  className={cn(
                    "px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer border select-none",
                    activeCategory.toLowerCase() === cat.toLowerCase()
                      ? "bg-white text-zinc-950 border-white shadow-sm"
                      : "bg-white/5 text-zinc-400 border-white/10 hover:border-white/25 hover:text-white"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Scroll-Triggered Accordion List */}
        <div className="max-w-3xl mx-auto space-y-3.5 relative z-10">
          {filteredFaqs.map((faq, idx) => {
            const isOpen = openIndex === idx;

            return (
              <motion.div
                key={faq.id || idx}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-30px" }}
                transition={{
                  duration: 0.5,
                  delay: Math.min(idx * 0.05, 0.4),
                  ease: [0.16, 1, 0.3, 1],
                }}
                className={cn(
                  "rounded-2xl transition-all duration-200 overflow-hidden relative border",
                  isOpen
                    ? "liquid-glass-dark border-white/20 shadow-md shadow-black/40"
                    : "liquid-glass-dark-pill border-white/[0.08] hover:border-white/15"
                )}
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(idx)}
                  className="w-full flex items-center justify-between p-5 text-left cursor-pointer select-none transition-colors border-0 bg-transparent"
                  aria-expanded={isOpen}
                >
                  <div className="flex items-center gap-3.5 pr-3 min-w-0">
                    <span className="font-mono text-[11px] font-bold text-red-400 shrink-0">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <span className="text-sm font-bold text-white tracking-tight leading-snug">
                      {faq.q}
                    </span>
                  </div>

                  <div className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-transform duration-300",
                    isOpen ? "bg-[#800000] text-white rotate-180" : "bg-white/10 text-zinc-400"
                  )}>
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
                        {faq.category && (
                          <div className="mt-3.5 flex items-center gap-2">
                            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                              Topic:
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] text-zinc-400 font-mono">
                              {faq.category}
                            </span>
                          </div>
                        )}
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
