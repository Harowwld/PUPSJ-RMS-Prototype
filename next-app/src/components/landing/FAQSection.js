"use client";

import { motion } from "framer-motion";

export default function FAQSection() {
  const faqs = [
    {
      q: "Can an authorized representative claim my document on my behalf?",
      a: "Yes. Your representative must present: (1) A signed Authorization Letter stating their full legal name, (2) A clear photocopy of your valid PUP Student ID or Government ID with signature, and (3) The original and photocopy of the representative's valid government-issued ID."
    },
    {
      q: "I am an alumnus and cannot recall my student number. Can I still request?",
      a: "Yes. When submitting an alumni document request, you can leave the student number optional and provide your full birth/maiden name, course program, and years attended for archive file verification."
    },
    {
      q: "How do I pay for document processing fees?",
      a: "Payment is made upon document claiming at the PUP San Juan Campus Cashier or via authorized institutional payment channels indicated on your ticket status update."
    },
    {
      q: "How long are unclaimed documents kept before disposal?",
      a: "In accordance with university records management guidelines, processed physical documents not claimed within ninety (90) calendar days from notification are subject to shredding and will require a new request."
    },
    {
      q: "Can I request expedited processing for urgent employment or embassy deadlines?",
      a: "Standard SLA applies to maintain archive retrieval and signature verification integrity. For pressing visa or employment requirements, indicate your deadline in the request notes and present proof during evaluation."
    }
  ];

  return (
    <section id="faq" className="max-w-7xl mx-auto px-4 sm:px-6 pb-24 w-full font-inter select-none">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="rounded-[2.5rem] bg-white dark:bg-zinc-900 border border-black/[0.06] dark:border-white/[0.08] shadow-[0_20px_50px_-15px_rgba(0,0,0,0.06)] overflow-hidden p-8 sm:p-14"
      >
        
        <div className="text-center max-w-xl mx-auto mb-10">
          <span className="text-xs font-bold uppercase tracking-widest text-[#800000] bg-red-50 dark:bg-red-950/40 px-3 py-1 rounded-full border border-red-100 dark:border-red-900/30">
            Help Center
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-950 dark:text-white tracking-tight mt-3">
            Frequently Asked Questions
          </h2>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-2 leading-relaxed">
            Essential procedures regarding authorized representatives, alumni records, and claiming deadlines.
          </p>
        </div>

        <div className="max-w-3xl mx-auto space-y-3.5">
          {faqs.map((faq, idx) => (
            <details
              key={idx}
              className="group rounded-2xl border border-gray-200/80 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-800/40 p-5 transition-all open:bg-white open:dark:bg-zinc-800 open:shadow-xs"
            >
              <summary className="flex items-center justify-between cursor-pointer list-none text-sm font-bold text-gray-900 dark:text-zinc-100">
                <span>{faq.q}</span>
                <span className="text-gray-400 text-xs group-open:rotate-180 transition-transform shrink-0 ml-3">
                  ▼
                </span>
              </summary>
              <p className="mt-3.5 text-xs sm:text-sm text-gray-600 dark:text-zinc-400 leading-relaxed border-t border-gray-100 dark:border-zinc-700/60 pt-3.5 font-normal">
                {faq.a}
              </p>
            </details>
          ))}
        </div>

      </motion.div>
    </section>
  );
}

