"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import LucideIcon from "@/components/shared/LucideIcon";
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
  const filteredFaqs = faqs.filter((faq) => activeCategory === "all" || (faq.category || "General").toLowerCase() === activeCategory.toLowerCase());
  const toggleFaq = (idx) => setOpenIndex((prev) => (prev === idx ? null : idx));

  return (
    <section id="faq" className="w-full bg-[#dadddf] py-16 px-4 sm:px-6 font-jakarta select-none scroll-mt-24">
      <div className="max-w-[1100px] mx-auto bg-white rounded-[2.5rem] p-8 sm:p-12 lg:p-16 shadow-sm overflow-hidden">
        
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-medium text-black tracking-tight">
            {faqData.heading || "Frequently Asked Questions"}
          </h2>
        </div>

        {categories.length > 1 && (
          <div className="flex justify-center mb-12">
            <div className="flex items-center p-1.5 border border-gray-100 rounded-full bg-white shadow-sm overflow-x-auto gap-1">
              <button
                type="button"
                onClick={() => { setActiveCategory("all"); setOpenIndex(0); }}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-medium transition-all whitespace-nowrap cursor-pointer",
                  activeCategory === "all" ? "bg-[#800000] text-white" : "bg-transparent text-gray-600 hover:bg-gray-50"
                )}
              >
                <LucideIcon className={cn("text-base ph-bold ph-squares-four", activeCategory === "all" ? "text-white" : "text-gray-400")} />
                All Questions
              </button>
              {categories.map((cat) => {
                const isActive = activeCategory.toLowerCase() === cat.toLowerCase();
                let iconClass = "ph-bold ph-folder";
                if (cat.toLowerCase().includes("request")) iconClass = "ph-bold ph-file-text";
                if (cat.toLowerCase().includes("process")) iconClass = "ph-bold ph-gear";
                if (cat.toLowerCase().includes("pickup")) iconClass = "ph-bold ph-hand-pointing";

                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => { setActiveCategory(cat); setOpenIndex(0); }}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-medium transition-all whitespace-nowrap cursor-pointer",
                      isActive ? "bg-[#800000] text-white" : "bg-transparent text-gray-600 hover:bg-gray-50"
                    )}
                  >
                    <LucideIcon className={cn("text-base", isActive ? "text-white" : "text-gray-400", iconClass)} />
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="max-w-3xl mx-auto space-y-3 mb-16">
          {filteredFaqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div key={faq.id || idx} className={cn("rounded-2xl transition-all duration-300 overflow-hidden", isOpen ? "bg-[#09090b] text-white" : "bg-[#f4f4f5] text-black")}>
                <button type="button" onClick={() => toggleFaq(idx)} className="w-full flex items-center justify-between p-5 sm:px-6 text-left cursor-pointer transition-colors border-0 bg-transparent" aria-expanded={isOpen}>
                  <span className={cn("text-sm sm:text-base font-medium pr-4", isOpen ? "text-white" : "text-black")}>{faq.q}</span>
                  <div className="shrink-0 ml-4">
                    {isOpen ? <LucideIcon className="ph-bold ph-minus text-white text-lg" /> : <LucideIcon className="ph-bold ph-plus text-gray-500 text-lg" />}
          </div>
                </button>
                <AnimatePresence>
                  {isOpen && (
                    <motion.div key="content" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }} className="overflow-hidden">
                      <div className="px-5 sm:px-6 pb-6 pt-0 text-[13px] sm:text-[14px] text-gray-300 leading-relaxed font-normal">
                        <p>{faq.a}</p>
              </div>
                    </motion.div>
                  )}
                </AnimatePresence>
      </div>
            );
          })}
        </div>


              </div>
    </section>
  );
}
