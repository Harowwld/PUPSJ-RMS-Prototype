"use client";
import LucideIcon from "@/components/shared/LucideIcon";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import BevelButton from "@/components/ui/bevel-button";
import DocumentCardPreview from "./DocumentCardPreview";

export const CATALOG_ITEMS = [
  {
    id: "tor",
    code: "TOR",
    title: "Transcript of Records",
    category: "transcripts",
    description: "Official comprehensive academic transcript for employment, PRC board examinations, and graduate studies.",
    requirements: [
      "2x2 Formal Photo (White Background, Nametag)",
      "University Clearance Form (Fully Signed)",
      "Documentary Stamp (BIR Compliant)"
    ],
    client: "Student & Alumni"
  },
  {
    id: "cog",
    code: "COG",
    title: "Certificate of Grades",
    category: "transcripts",
    description: "Certified summary of semester grades requested for scholarships, employer tuition subsidies, and academic evaluation.",
    requirements: [
      "Current Student ID or SIS Portal Profile Printout",
      "Specific Academic Year & Semester Identification"
    ],
    client: "Enrolled Students"
  },
  {
    id: "cor",
    code: "COR",
    title: "Certificate of Registration",
    category: "certs",
    description: "Official certification of enrollment status for student discounts, government aid, and passport/visa requirements.",
    requirements: [
      "Validated Assessment Form / Enrollment Proof",
      "Current Semester Course Load Details"
    ],
    client: "Enrolled Students"
  },
  {
    id: "ctc",
    code: "HD",
    title: "Honorable Dismissal",
    category: "clearances",
    description: "Formal Certificate of Transfer Credential certifying official release from PUP to transfer to another institution.",
    requirements: [
      "Comprehensive Campus University Clearance",
      "Surrender of PUP Student ID Card",
      "Parent / Guardian Consent Form (If Minor)"
    ],
    client: "Transferees"
  },
  {
    id: "moral",
    code: "GMC",
    title: "Good Moral Character",
    category: "certs",
    description: "Issued in coordination with OSAS certifying zero pending disciplinary infractions during university residency.",
    requirements: [
      "OSAS Disciplinary Clearance Slip",
      "Valid Student ID or Government ID Card"
    ],
    client: "Student & Alumni"
  },
  {
    id: "diploma",
    code: "DIP-2",
    title: "Second Copy of Diploma",
    category: "clearances",
    description: "Official replacement graduation diploma reissued after verified destruction or loss of the original parchment.",
    requirements: [
      "Notarized Affidavit of Loss / Damage",
      "Copy of Official Certificate of Graduation",
      "Board of Regents Formal Verification"
    ],
    client: "Alumni Only"
  },
  {
    id: "cav",
    code: "CAV",
    title: "CAV (DFA Apostille / Abroad)",
    category: "certs",
    description: "Certification, Authentication, and Verification endorsed directly to DFA and CHED for international credential recognition.",
    requirements: [
      "Certified True Copies of TOR and Diploma",
      "Passport Identification Copy (Full Legal Name)",
      "CHED / Red Ribbon Endorsement Checklist"
    ],
    client: "Graduates & Alumni"
  },
  {
    id: "certified_copy",
    code: "CTC",
    title: "Certified True Copy",
    category: "transcripts",
    description: "Official Registrar dry seal and verification stamp placed on original photocopies of university academic records.",
    requirements: [
      "Original Document for Verification Presentation",
      "Clear Photocopy for Dry Seal Stamping"
    ],
    client: "Student & Alumni"
  }
];

export default function DocumentCatalog() {
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [catalogData, setCatalogData] = useState({
    eyebrow: "Official University Credentials",
    heading: "Academic Document Catalog",
    description:
      "Explore authentic credentials, university clearance protocols, and official registrar records issued by the University.",
    badgeText: "Official Credential",
    primaryButtonText: "Request Credential",
    primaryButtonLink: "/login",
    primaryButtonEnabled: true,
    dragHint: "Drag or click document to inspect",
    items: CATALOG_ITEMS,
  });

  // Fetch dynamic catalog configuration
  useEffect(() => {
    let isMounted = true;
    fetch("/api/landing/catalog", { cache: "no-store" })
      .then((r) => r.json())
      .then((json) => {
        if (isMounted && json.ok && json.data) {
          setCatalogData(json.data);
        }
      })
      .catch((err) => {
        console.warn("[DocumentCatalog] Failed to fetch catalog config:", err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const items = catalogData.items?.length ? catalogData.items : CATALOG_ITEMS;
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [dragScrollLeft, setDragScrollLeft] = useState(0);
  const totalItems = items.length;
  const safeActiveIndex = activeIndex < totalItems ? activeIndex : 0;

  // Section reference for sizing the giant Ferris Wheel
  const sectionRef = useRef(null);
  const [wheelGeometry, setWheelGeometry] = useState({
    radius: 580,
    centerX: 1350,
    centerY: 450,
    scale: 1,
  });

  // Responsive Ferris Wheel geometry calculation
  useEffect(() => {
    if (!sectionRef.current) return;

    const updateGeometry = () => {
      if (!sectionRef.current) return;
      const width = sectionRef.current.clientWidth;
      const height = sectionRef.current.clientHeight || 800;

      if (width < 640) {
        // Mobile: Circle center positioned comfortably past right edge
        setWheelGeometry({
          radius: 350,
          centerX: width * 1.05,
          centerY: height * 0.65,
          scale: 0.78,
        });
      } else if (width < 1024) {
        // Tablet: Circle center at right edge
        setWheelGeometry({
          radius: 460,
          centerX: width * 1.02,
          centerY: height * 0.5,
          scale: 0.88,
        });
      } else if (width < 1440) {
        // Standard Desktop: Center near right edge (~98% of width)
        setWheelGeometry({
          radius: 560,
          centerX: width * 0.98,
          centerY: height * 0.5,
          scale: 1,
        });
      } else {
        // Large & Ultrawide Desktop: Center aligned near right edge (~100% of width)
        setWheelGeometry({
          radius: 620,
          centerX: width * 1.00,
          centerY: height * 0.5,
          scale: 1.05,
        });
      }
    };

    updateGeometry();
    const ro = new ResizeObserver(updateGeometry);
    ro.observe(sectionRef.current);
    return () => ro.disconnect();
  }, []);

  const carouselRef = useRef(null);
  const scrollTimeout = useRef(null);
  
  // Dramatically reduce DOM nodes: 5 chunks is enough for a seamless treadmill
  const MULTIPLIER = 5;
  const infiniteItems = Array(MULTIPLIER).fill(items).flat();
  const middleIndex = items.length * Math.floor(MULTIPLIER / 2);

  // Jump to the middle chunk on mount
  useEffect(() => {
    if (carouselRef.current) {
      setTimeout(() => {
        const targetChild = carouselRef.current?.children[middleIndex + 1];
        if (targetChild && carouselRef.current) {
          const parentWidth = carouselRef.current.clientWidth;
          const childWidth = targetChild.clientWidth;
          const scrollPos = targetChild.offsetLeft - (parentWidth / 2) + (childWidth / 2);
          carouselRef.current.scrollTo({ left: scrollPos, behavior: 'instant' });
        }
      }, 50);
    }
  }, [middleIndex]);

  const handleScroll = useCallback(() => {
    if (!carouselRef.current) return;
    const container = carouselRef.current;
    
    const children = container.children;
    let minDistance = Infinity;
    let newIndex = 0;
    
    const parentWidth = container.clientWidth;
    const currentCenter = container.scrollLeft + (parentWidth / 2);
    
    for (let i = 1; i < children.length; i++) {
      const child = children[i];
      const childCenter = child.offsetLeft + (child.clientWidth / 2);
      const distance = Math.abs(childCenter - currentCenter);
      
      if (distance < minDistance) {
        minDistance = distance;
        newIndex = i - 1; 
      } else if (distance > minDistance) {
        break;
      }
    }
    setActiveIndex(newIndex % items.length);

    // Debounced Treadmill Reset
    if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    scrollTimeout.current = setTimeout(() => {
      // Only reset if scroll has fully stopped and we are not actively dragging
      if (!carouselRef.current || isDragging) return;
      
      const firstItem = carouselRef.current.children[1];
      const chunkStartItem = carouselRef.current.children[items.length + 1];
      if (!firstItem || !chunkStartItem) return;
      
      const chunkWidth = chunkStartItem.offsetLeft - firstItem.offsetLeft;
      const currentScroll = carouselRef.current.scrollLeft;
      
      // If we drifted left into chunk 0 or 1, shift forward by 2 chunks (to center)
      if (currentScroll < chunkWidth * 1.5) {
        carouselRef.current.scrollLeft = currentScroll + (chunkWidth * 2);
      } 
      // If we drifted right into chunk 3 or 4, shift backward by 2 chunks (to center)
      else if (currentScroll > chunkWidth * 3.5) {
        carouselRef.current.scrollLeft = currentScroll - (chunkWidth * 2);
      }
    }, 200);

  }, [items.length, isDragging]);

  const scrollToDot = useCallback((dotIndex) => {
    if (!carouselRef.current) return;
    const container = carouselRef.current;
    const parentWidth = container.clientWidth;
    const currentCenter = container.scrollLeft + (parentWidth / 2);
    
    let closestChild = null;
    let minDiff = Infinity;
    
    for (let i = 1; i < container.children.length; i++) {
      const actualIndex = (i - 1) % items.length;
      if (actualIndex === dotIndex) {
        const child = container.children[i];
        const childCenter = child.offsetLeft + (child.clientWidth / 2);
        const diff = Math.abs(childCenter - currentCenter);
        if (diff < minDiff) {
          minDiff = diff;
          closestChild = child;
        }
      }
    }
    
    if (closestChild) {
      const scrollPos = closestChild.offsetLeft - (parentWidth / 2) + (closestChild.clientWidth / 2);
      container.scrollTo({ left: scrollPos, behavior: 'smooth' });
    }
  }, [items.length]);

  const scrollToNext = useCallback(() => {
    if (!carouselRef.current) return;
    const container = carouselRef.current;
    const parentWidth = container.clientWidth;
    const currentCenter = container.scrollLeft + (parentWidth / 2);
    
    let nextChild = null;
    let minPositiveDiff = Infinity;
    
    for (let i = 1; i < container.children.length; i++) {
      const child = container.children[i];
      const childCenter = child.offsetLeft + (child.clientWidth / 2);
      const diff = childCenter - currentCenter;
      
      if (diff > 10 && diff < minPositiveDiff) {
        minPositiveDiff = diff;
        nextChild = child;
      }
    }
    
    if (nextChild) {
      const scrollPos = nextChild.offsetLeft - (parentWidth / 2) + (nextChild.clientWidth / 2);
      container.scrollTo({ left: scrollPos, behavior: 'smooth' });
    }
  }, []);

  const autoplayTimer = useRef(null);
  const pauseTimeout = useRef(null);

  const startAutoplay = useCallback(() => {
    if (autoplayTimer.current) clearInterval(autoplayTimer.current);
    autoplayTimer.current = setInterval(() => {
      scrollToNext();
    }, 5000);
  }, [scrollToNext]);

  const pauseAutoplayTemporarily = useCallback(() => {
    // Stop the current autoplay
    if (autoplayTimer.current) clearInterval(autoplayTimer.current);
    if (pauseTimeout.current) clearTimeout(pauseTimeout.current);
    
    // Resume autoplay 2 seconds after the user stops interacting
    pauseTimeout.current = setTimeout(() => {
      startAutoplay();
    }, 2000);
  }, [startAutoplay]);

  // Initial Autoplay effect
  useEffect(() => {
    startAutoplay();
    return () => {
      if (autoplayTimer.current) clearInterval(autoplayTimer.current);
      if (pauseTimeout.current) clearTimeout(pauseTimeout.current);
    };
  }, [startAutoplay]);

  // Drag-to-scroll handlers
  const handleMouseDown = (e) => {
    if (!carouselRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - carouselRef.current.offsetLeft);
    setDragScrollLeft(carouselRef.current.scrollLeft);
  };

  const handleMouseLeave = () => {
    if (isDragging) {
      setIsDragging(false);
      scrollToDot(activeIndex);
    }
  };

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
      scrollToDot(activeIndex);
    }
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !carouselRef.current) return;
    e.preventDefault();
    const x = e.pageX - carouselRef.current.offsetLeft;
    const walk = (x - startX) * 1.5; // Scroll speed multiplier
    carouselRef.current.scrollLeft = dragScrollLeft - walk;
  };

  return (
    <section
      id="catalog"
      ref={sectionRef}
      className="relative w-full py-16 sm:py-20 lg:py-24 overflow-hidden bg-white select-none font-jakarta min-h-0 flex items-center"
    >


      {/* Main Content Area */}
      <div className="w-full relative z-20 pointer-events-none flex flex-col items-center">
        <div className="w-full pointer-events-auto flex flex-col items-center">

          {/* Section Heading & Subtitle */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center mb-12">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-gray-950 leading-[1.08]">
              {catalogData.heading || "Academic Document Catalog"}
            </h2>
            <p className="text-sm sm:text-base text-gray-500 mt-4 max-w-xl leading-relaxed font-normal">
              {catalogData.description}
            </p>
          </div>

          {/* Apple-style Horizontal Carousel */}
          <div 
            ref={carouselRef}
            onScroll={handleScroll}
            onMouseDown={(e) => { handleMouseDown(e); pauseAutoplayTemporarily(); }}
            onMouseLeave={handleMouseLeave}
            onMouseUp={handleMouseUp}
            onMouseMove={(e) => { handleMouseMove(e); pauseAutoplayTemporarily(); }}
            onTouchStart={pauseAutoplayTemporarily}
            onTouchMove={pauseAutoplayTemporarily}
            onWheel={pauseAutoplayTemporarily}
            className={`w-full flex overflow-x-auto gap-4 pb-8 pt-8 hide-scrollbar snap-x snap-mandatory sm:snap-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`} 
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            <style dangerouslySetInnerHTML={{__html: `
              .hide-scrollbar::-webkit-scrollbar { display: none; }
            `}} />
            {infiniteItems.map((doc, idx) => {
              const isActive = (idx % items.length) === activeIndex;
              return (
                <div 
                  key={`${doc.id || doc.title}-${idx}`}
                  className={`shrink-0 w-[85vw] sm:w-[60vw] md:w-[45vw] lg:w-[420px] flex flex-col bg-[#f5f5f7] rounded-none p-6 sm:p-8 text-left transition-all duration-500 ease-out group snap-center sm:snap-align-none ${
                    isDragging ? 'pointer-events-none' : 'hover:-translate-y-1'
                  } ${
                    isActive 
                      ? 'scale-[1.05] shadow-none z-10' 
                      : 'scale-[0.95] shadow-none z-0 opacity-70 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center justify-between mb-5">
                    <span className="px-3 py-1 rounded-full text-[10px] font-bold font-mono tracking-wider bg-zinc-100 text-zinc-600 border border-black/5">
                      {doc.code}
                    </span>
                    <span className="text-[10px] font-mono font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                      {doc.client}
                    </span>
                  </div>
                  
                  <h3 className="text-xl font-bold text-gray-950 tracking-tight leading-snug mb-3 group-hover:text-[#800000] transition-colors">
                    {doc.title}
                  </h3>
                  
                  <p className="text-sm text-gray-500 leading-relaxed mb-8 flex-grow">
                    {doc.description}
                  </p>
                  
                  <div className="pt-5 border-t border-black/5 mt-auto">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 font-mono mb-3 flex items-center gap-1.5">
                      <LucideIcon  className="ph-bold ph-shield-check text-sm" />
                      Filing Requirements
                    </div>
                    <ul className="space-y-3 text-xs text-gray-600">
                      {doc.requirements?.slice(0, 2).map((req, i) => (
                        <li key={i} className="flex items-start gap-2.5 leading-relaxed">
                          <span className="mt-0.5 flex-shrink-0 w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[8px] font-bold">
                            <LucideIcon  className="ph-bold ph-check" />
                          </span>
                          <span className="line-clamp-2">{req}</span>
                        </li>
                      ))}
                      {doc.requirements?.length > 2 && (
                         <li className="text-gray-400 italic text-[11px] pl-6.5">+{doc.requirements.length - 2} more...</li>
                      )}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Apple-style Pagination Dots & Controls */}
          <div className="relative w-full max-w-7xl mx-auto px-6 flex items-center justify-center mt-2 mb-4 h-6">
            <div className="flex items-center justify-center gap-2 h-2">
              {items.map((_, idx) => {
                const dist = Math.abs(idx - activeIndex);
                let dotClass = "";
                
                if (activeIndex === idx) {
                  dotClass = "w-6 h-1.5 bg-black";
                } else if (dist <= 2) {
                  dotClass = "w-1.5 h-1.5 bg-gray-400 hover:bg-gray-500";
                } else if (dist === 3) {
                  dotClass = "w-[5px] h-[5px] bg-gray-400 hover:bg-gray-500";
                } else {
                  dotClass = "w-[3px] h-[3px] bg-gray-400 hover:bg-gray-500";
                }
                
                return (
                  <button
                    key={idx}
                    onClick={() => scrollToDot(idx)}
                    className={`transition-all duration-300 rounded-full flex-shrink-0 ${dotClass}`}
                    aria-label={`Go to slide ${idx + 1}`}
                  />
                );
              })}
            </div>
          </div>

        </div>
      </div>


    </section>
  );
}
