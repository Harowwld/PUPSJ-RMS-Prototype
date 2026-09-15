"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import BevelButton from "@/components/ui/bevel-button";

export default function LandingNavbar() {
  const router = useRouter();
  const [sessionUser, setSessionUser] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        const json = await res.json().catch(() => null);
        if (isMounted && res.ok && json?.ok && json?.data) {
          setSessionUser(json.data);
        }
      } catch (err) {
        // Unauthenticated visitor is expected
      }
    })();

    const handleScroll = () => {
      setScrolled(window.scrollY > 45);
    };
    handleScroll();
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleResize, { passive: true });

    return () => {
      isMounted = false;
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const getDashboardPath = () => {
    if (!sessionUser) return "/login";
    const role = String(sessionUser.role || "").toLowerCase();
    if (role === "student") return "/student";
    if (role === "systemadmin" || role === "superadmin") return "/systemadmin";
    if (role === "admin" || role === "administrator") return "/admin";
    return "/staff";
  };

  // Scroll smoothly back to top when clicking logo
  const scrollToTop = (e) => {
    if (e) e.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (window.location.hash) {
      window.history.pushState(null, "", window.location.pathname);
    }
    setMobileMenuOpen(false);
  };

  // Smooth animated transition to specific section with focus pulse
  const scrollToSection = (e, targetId) => {
    if (e) e.preventDefault();
    const element = document.getElementById(targetId);
    if (!element) return;

    const navOffset = 76;
    const elementPosition = element.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - navOffset;

    window.scrollTo({
      top: offsetPosition,
      behavior: "smooth",
    });

    // Subtle Apple-style highlight pulse on arrival
    element.animate(
      [
        { transform: "scale(0.992)", filter: "brightness(1.08)" },
        { transform: "scale(1)", filter: "brightness(1)" },
      ],
      { duration: 650, easing: "cubic-bezier(0.16, 1, 0.3, 1)" }
    );

    setMobileMenuOpen(false);
  };

  return (
    <>

      <header 
        className="fixed top-0 left-0 right-0 w-full z-50 select-none font-inter pointer-events-none"
      >
        {/* Apple-style global navigation bar container */}
        <div className="w-full pointer-events-none transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] px-0 pt-0">
          <div 
            className={`navbar-glass-shell w-full flex flex-col pointer-events-auto transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] rounded-none shadow-none ${
              scrolled || mobileMenuOpen
                ? "bg-[#f5f5f8]/80 backdrop-blur-md border-b border-black/5"
                : "bg-[#f5f5f8] border-b border-transparent"
            }`}
          >
            {/* Top Bar Row - Constrained width like Apple UI */}
            <div className="w-full max-w-[980px] mx-auto px-4 sm:px-6 flex items-center justify-between h-[46px]">
               {/* BRAND LOGO - Smoothly scrolls back to top */}
              <a 
                href="#" 
                onClick={scrollToTop}
                className="flex items-center gap-2.5 cursor-pointer shrink-0"
                aria-label="Back to top"
              >
                <div className="w-[18px] h-[18px] relative flex items-center justify-center shrink-0">
                  <img 
                    src="/assets/branding/black-icon.png" 
                    alt="eManage Logo" 
                    className="w-full h-full object-contain"
                  />
                </div>
              </a>

              {/* NAVIGATION LINKS WITH SMOOTH ANIMATION (Desktop) */}
              <nav className="hidden md:flex items-center gap-1 text-[13px] font-medium text-black">
                <button 
                  type="button"
                  onClick={(e) => scrollToSection(e, "catalog")}
                  className="px-3.5 py-1.5 rounded-full cursor-pointer bg-transparent"
                >
                  Services
                </button>
                <button 
                  type="button"
                  onClick={(e) => scrollToSection(e, "workflow")}
                  className="px-3.5 py-1.5 rounded-full cursor-pointer bg-transparent"
                >
                  How It Works
                </button>
                <button 
                  type="button"
                  onClick={(e) => scrollToSection(e, "office")}
                  className="px-3.5 py-1.5 rounded-full cursor-pointer bg-transparent"
                >
                  Office Hours
                </button>
                <button 
                  type="button"
                  onClick={(e) => scrollToSection(e, "faq")}
                  className="px-3.5 py-1.5 rounded-full cursor-pointer bg-transparent"
                >
                  FAQ
                </button>
              </nav>

              {/* RIGHT ACTION BUTTONS */}
              <div className="flex items-center gap-2 shrink-0">
                {sessionUser ? (
                  <Button
                    onClick={() => router.push(getDashboardPath())}
                    className="h-9 px-4 rounded-full btn-brand-red text-xs font-semibold tracking-wide cursor-pointer text-white active:scale-95 transition-all"
                  >
                    Dashboard ↗
                  </Button>
                ) : (
                  <button
                    type="button"
                    onClick={() => router.push("/login")}
                    className="h-9 px-3 rounded-full text-[13px] font-medium cursor-pointer bg-transparent text-black"
                  >
                    Sign In
                  </button>
                )}

                {/* Mobile Sidebar Trigger */}
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="md:hidden w-9 h-9 rounded-full flex items-center justify-center cursor-pointer text-black"
                  aria-label="Toggle navigation drawer"
                >
                  <i className={`ph-bold ${mobileMenuOpen ? "ph-x" : "ph-list"} text-lg`} />
                </button>
              </div>
            </div>

            {/* MOBILE MENU ACCORDION (Seamlessly shares the liquid glass background) */}
            <AnimatePresence>
              {mobileMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
                  className="md:hidden w-full overflow-hidden border-t border-black/[0.06] [0.08] pt-2 pb-3.5 flex flex-col gap-1"
                >
                  <button
                    type="button"
                    onClick={(e) => scrollToSection(e, "catalog")}
                    className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left text-xs font-semibold text-gray-800  hover:bg-black/[0.04] :bg-white/[0.06] transition-all cursor-pointer"
                  >
                    <i className="ph-bold ph-files text-base text-[#800000] " />
                    <span>Services</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => scrollToSection(e, "workflow")}
                    className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left text-xs font-semibold text-gray-800  hover:bg-black/[0.04] :bg-white/[0.06] transition-all cursor-pointer"
                  >
                    <i className="ph-bold ph-flow-arrow text-base text-[#800000] " />
                    <span>How It Works</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => scrollToSection(e, "office")}
                    className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left text-xs font-semibold text-gray-800  hover:bg-black/[0.04] :bg-white/[0.06] transition-all cursor-pointer"
                  >
                    <i className="ph-bold ph-clock text-base text-[#800000] " />
                    <span>Office Hours</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => scrollToSection(e, "faq")}
                    className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left text-xs font-semibold text-gray-800  hover:bg-black/[0.04] :bg-white/[0.06] transition-all cursor-pointer"
                  >
                    <i className="ph-bold ph-question text-base text-[#800000] " />
                    <span>FAQ</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
    </header>
  </>
);
}


