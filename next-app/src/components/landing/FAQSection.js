"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";

import { cn } from "@/lib/utils";
import { SPRING_LAYOUT, useAppReducedMotion } from "@/lib/motion";
import { Add01Icon, LayoutGridIcon, MinusSignIcon } from "hugeicons-react";
import AppIcon from "@/components/ui/app-icon";
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
    id: "claiming-deadline",
    q: "How long do I have to claim my document?",
    a: "Please claim your document within 90 days after notification. Unclaimed documents are safely disposed of after 90 days to protect your privacy.",
    category: "Pickup",
  },
];

function FAQItem({ faq, isOpen, onToggle, measureOnly = false }) {
  return (
    <div className={cn("rounded-2xl transition-all duration-300 overflow-hidden", isOpen ? "bg-[#09090b] text-white" : "bg-[#f4f4f5] text-black")}>
      <button
        type="button"
        onClick={onToggle}
        disabled={measureOnly}
        aria-expanded={isOpen}
        className="w-full flex items-center justify-between p-5 sm:px-6 text-left cursor-pointer transition-colors border-0 bg-transparent disabled:cursor-default"
      >
        <span className={cn("text-sm sm:text-base font-medium pr-4", isOpen ? "text-white" : "text-black")}>{faq.q}</span>
        <span className="shrink-0 ml-4">
          {isOpen ? <MinusSignIcon size="1em" className="text-white text-lg" /> : <Add01Icon size="1em" className="text-gray-500 text-lg" />}
        </span>
      </button>
      {measureOnly ? (
        isOpen && (
          <div className="overflow-hidden">
            <div className="px-5 sm:px-6 pb-6 pt-0 text-[13px] sm:text-[14px] text-gray-300 leading-relaxed font-normal">
              <p>{faq.a}</p>
            </div>
          </div>
        )
      ) : (
        <AnimatePresence>
          {isOpen && (
            <motion.div
              key="content"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
              <div className="px-5 sm:px-6 pb-6 pt-0 text-[13px] sm:text-[14px] text-gray-300 leading-relaxed font-normal">
                <p>{faq.a}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState(0);
  const [activeCategory, setActiveCategory] = useState("all");
  const shouldReduceMotion = useAppReducedMotion();
  const [faqData, setFaqData] = useState({
    heading: "Frequently Asked Questions",
    description: "Quick answers on requesting, tracking, and claiming your official school records.",
    faqs: DEFAULT_FAQS,
  });

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
    return () => { isMounted = false; };
  }, []);

  const faqs = Array.isArray(faqData.faqs) && faqData.faqs.length > 0 ? faqData.faqs : DEFAULT_FAQS;
  const categories = Array.from(new Set(faqs.map((f) => f.category || "General").filter(Boolean)));
  const categoryGroups = categories.map((category) => ({
    id: `category:${category}`,
    faqs: faqs.filter((faq) => (faq.category || "General").toLowerCase() === category.toLowerCase()),
  }));
  const measureGroups = [{ id: "all", faqs }, ...categoryGroups];
  const filteredFaqs = activeCategory === "all"
    ? faqs
    : categoryGroups.find((group) => group.id === `category:${activeCategory}`)?.faqs || [];
  const toggleFaq = (idx) => setOpenIndex((prev) => (prev === idx ? null : idx));

  return (
    <section id="faq" className="w-full bg-[#dadddf] py-16 px-4 sm:px-6 font-jakarta select-none scroll-mt-24">
      <div className="max-w-[1100px] mx-auto bg-white rounded-[2.5rem] p-8 sm:p-12 lg:p-16 shadow-sm overflow-hidden">
        
        <div className="text-center mb-10 max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-medium text-black tracking-tight">
            {faqData.heading || "Frequently Asked Questions"}
          </h2>
          {faqData.description && (
            <p className="mt-3 text-sm sm:text-base text-gray-500 max-w-xl mx-auto">
              {faqData.description}
            </p>
          )}
        </div>

        {categories.length > 1 && (
          <div className="flex justify-center mb-12">
            <div className="flex items-center p-1.5 border border-border rounded-full bg-white shadow-sm overflow-x-auto gap-1">
              <LayoutGroup id="landing-faq-categories">
                <button
                  type="button"
                  onClick={() => { setActiveCategory("all"); setOpenIndex(0); }}
                  aria-pressed={activeCategory === "all"}
                  className={cn(
                    "relative flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-medium transition-colors whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#800000]/30",
                    activeCategory === "all" ? "text-white" : "bg-transparent text-gray-600 hover:bg-gray-50"
                  )}
                >
                  {activeCategory === "all" && (
                    <motion.span
                      layoutId="landing-faq-active-category"
                      layout="x"
                      initial={false}
                      transition={shouldReduceMotion ? { duration: 0 } : SPRING_LAYOUT}
                      aria-hidden="true"
                      className="absolute inset-0 rounded-full bg-[#800000]"
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-2">
                    <LayoutGridIcon size="1em" className={cn("text-base", activeCategory === "all" ? "text-white" : "text-gray-400")} />
                    All Questions
                  </span>
                </button>
                {categories.map((cat) => {
                  const isActive = activeCategory.toLowerCase() === cat.toLowerCase();
                  let iconClass = " Folder01Icon";
                  if (cat.toLowerCase().includes("request")) iconClass = " File02Icon";
                  if (cat.toLowerCase().includes("process")) iconClass = " Settings01Icon";
                  if (cat.toLowerCase().includes("pickup")) iconClass = " CursorPointer01Icon";

                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => { setActiveCategory(cat); setOpenIndex(0); }}
                      aria-pressed={isActive}
                      className={cn(
                        "relative flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-medium transition-colors whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#800000]/30",
                        isActive ? "text-white" : "bg-transparent text-gray-600 hover:bg-gray-50"
                      )}
                    >
                      {isActive && (
                        <motion.span
                          layoutId="landing-faq-active-category"
                          layout="x"
                          initial={false}
                          transition={shouldReduceMotion ? { duration: 0 } : SPRING_LAYOUT}
                          aria-hidden="true"
                          className="absolute inset-0 rounded-full bg-[#800000]"
                        />
                      )}
                      <span className="relative z-10 flex items-center gap-2">
                        <AppIcon className={cn("text-base", isActive ? "text-white" : "text-gray-400", iconClass)} />
                        {cat}
                      </span>
                    </button>
                  );
                })}
              </LayoutGroup>
            </div>
          </div>
        )}

        <div className="grid max-w-3xl mx-auto mb-16">
          {measureGroups.map((group) => (
            <div
              key={group.id}
              aria-hidden="true"
              className="invisible pointer-events-none col-start-1 row-start-1 flex flex-col gap-3"
            >
              {group.faqs.map((faq, idx) => (
                <FAQItem
                  key={faq.id || `${group.id}-${idx}`}
                  faq={faq}
                  isOpen={idx === 0}
                  measureOnly
                />
              ))}
            </div>
          ))}
          <div className="relative col-start-1 row-start-1 flex flex-col gap-3">
            {filteredFaqs.map((faq, idx) => (
              <FAQItem
                key={faq.id || idx}
                faq={faq}
                isOpen={openIndex === idx}
                onToggle={() => toggleFaq(idx)}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
