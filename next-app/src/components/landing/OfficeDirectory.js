"use client";

import { motion } from "framer-motion";

export default function OfficeDirectory() {
  return (
    <section id="office" className="max-w-7xl mx-auto px-4 sm:px-6 pb-20 w-full font-inter select-none">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Operating Hours Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          whileHover={{ y: -3 }}
          className="rounded-[2rem] bg-white dark:bg-zinc-900 border border-black/[0.06] dark:border-white/[0.08] p-8 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] flex flex-col justify-between"
        >
          <div>
            <span className="text-[10px] font-mono font-semibold uppercase tracking-widest text-[#800000] dark:text-red-400 block mb-2">
              Operating Schedule
            </span>
            <h3 className="text-lg font-bold text-gray-950 dark:text-white mb-1">
              Registrar Office Hours
            </h3>
            <p className="text-xs text-gray-400 mb-6 font-normal">
              Regular Semester Calendar · San Juan Campus
            </p>
            
            <div className="space-y-3.5 text-xs">
              <div className="flex items-center justify-between pb-2.5 border-b border-gray-100 dark:border-zinc-800">
                <span className="font-medium text-gray-600 dark:text-zinc-400">Monday – Friday</span>
                <span className="font-bold text-gray-950 dark:text-white font-mono">8:00 AM – 5:00 PM</span>
              </div>
              <div className="flex items-center justify-between pb-2.5 border-b border-gray-100 dark:border-zinc-800">
                <span className="font-medium text-gray-600 dark:text-zinc-400">Saturday & Sunday</span>
                <span className="font-semibold text-rose-600 dark:text-rose-400">Closed (University Break)</span>
              </div>
              <div className="flex items-center justify-between pb-2.5 border-b border-gray-100 dark:border-zinc-800">
                <span className="font-medium text-gray-600 dark:text-zinc-400">Noon Break Shift</span>
                <span className="font-medium text-gray-500 dark:text-zinc-400 font-mono">12:00 PM – 1:00 PM</span>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 rounded-2xl bg-gray-50 dark:bg-zinc-800/60 border border-gray-100 dark:border-zinc-700/60 text-xs text-gray-600 dark:text-zinc-400 leading-relaxed font-normal">
            Cut-off for same-day evaluation filings is 3:00 PM on regular campus working days.
          </div>
        </motion.div>

        {/* Campus Location Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          whileHover={{ y: -3 }}
          className="rounded-[2rem] bg-white dark:bg-zinc-900 border border-black/[0.06] dark:border-white/[0.08] p-8 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] flex flex-col justify-between"
        >
          <div>
            <span className="text-[10px] font-mono font-semibold uppercase tracking-widest text-[#800000] dark:text-red-400 block mb-2">
              Physical Location
            </span>
            <h3 className="text-lg font-bold text-gray-950 dark:text-white mb-1">
              Campus Archive Hall
            </h3>
            <p className="text-xs text-gray-400 mb-6 font-normal">
              Polytechnic University of the Philippines — San Juan
            </p>
            
            <p className="text-xs text-gray-600 dark:text-zinc-400 leading-relaxed mb-6 font-normal">
              Ground Floor, Administration & Records Hall<br />
              223 Ortega Street, corner A. Mabini Street, Barangay Addition Hills, San Juan City
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-gray-50 dark:bg-zinc-800/60 border border-gray-100 dark:border-zinc-700/60 text-xs space-y-2">
            <div className="font-bold text-gray-900 dark:text-zinc-200 text-[11px] uppercase tracking-wide">
              Counter Service Windows:
            </div>
            <div className="text-gray-600 dark:text-zinc-400 text-[11px] leading-relaxed">
              <strong>Window 1:</strong> Enrolled Student Records & Registration Certs
            </div>
            <div className="text-gray-600 dark:text-zinc-400 text-[11px] leading-relaxed">
              <strong>Window 2:</strong> Alumni TOR, Diplomas & CAV Endorsements
            </div>
          </div>
        </motion.div>

        {/* Direct Inquiries & Support Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          whileHover={{ y: -3 }}
          className="rounded-[2rem] bg-white dark:bg-zinc-900 border border-black/[0.06] dark:border-white/[0.08] p-8 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] flex flex-col justify-between"
        >
          <div>
            <span className="text-[10px] font-mono font-semibold uppercase tracking-widest text-[#800000] dark:text-red-400 block mb-2">
              Official Desk
            </span>
            <h3 className="text-lg font-bold text-gray-950 dark:text-white mb-1">
              Direct Communications
            </h3>
            <p className="text-xs text-gray-400 mb-6 font-normal">
              Institutional Records & Evaluation Help Desk
            </p>
            
            <div className="space-y-4 text-xs">
              <div>
                <span className="block text-gray-400 text-[10px] font-mono uppercase tracking-wider mb-0.5">Registrar Inquiries</span>
                <a href="mailto:registrar.sanjuan@pup.edu.ph" className="font-semibold text-[#800000] dark:text-red-400 hover:underline">
                  registrar.sanjuan@pup.edu.ph
                </a>
              </div>
              <div>
                <span className="block text-gray-400 text-[10px] font-mono uppercase tracking-wider mb-0.5">Student Affairs (OSAS)</span>
                <span className="font-medium text-gray-800 dark:text-zinc-200">osas.sanjuan@pup.edu.ph</span>
              </div>
              <div>
                <span className="block text-gray-400 text-[10px] font-mono uppercase tracking-wider mb-0.5">Campus Trunkline</span>
                <span className="font-mono text-gray-800 dark:text-zinc-200">(02) 8724-4112 / (02) 8724-4113</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-3.5 border-t border-gray-100 dark:border-zinc-800 text-[11px] text-gray-400 font-mono">
            PUP SAN JUAN OFFICIAL RECORDS DIVISION
          </div>
        </motion.div>

      </div>
    </section>
  );
}

