"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { EmptyState } from "@/components/ui/empty";
import { useAppReducedMotion } from "@/lib/motion";
import CatalogClientBadge from "@/components/landing/CatalogClientBadge";
import { Files01Icon , Shield01Icon, Tick01Icon} from "hugeicons-react";

export default function DocumentCatalog({ classic, previewContent }) {
  const reduceMotion = useAppReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const [expandedCard, setExpandedCard] = useState(null);
  const [publishedContent, setCatalogData] = useState({
    heading: "Academic Document Catalog",
    description:
      "Explore authentic credentials, university clearance protocols, and official registrar records issued by the University.",
    items: [],
  });

  const [publishedStatus, setCatalogStatus] = useState("loading");

  // Fetch active requestable document types with matching CMS descriptions.
  const catalogData = previewContent ?? publishedContent;

  useEffect(() => {
    if (previewContent) return;
    let isMounted = true;
    fetch("/api/landing/catalog", { cache: "no-store" })
      .then((r) => r.json())
      .then((json) => {
        if (!isMounted) return;
        if (!json.ok || !json.data) throw new Error("Catalog could not be loaded.");
        setCatalogData(json.data);
        setCatalogStatus("ready");
      })
      .catch((err) => {
        if (isMounted) setCatalogStatus("error");
        console.warn("[DocumentCatalog] Failed to fetch catalog config:", err);
      });
    return () => {
      isMounted = false;
    };
  }, [previewContent]);

  const catalogStatus = previewContent ? "ready" : publishedStatus;
  const items = catalogData.items;
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [dragScrollLeft, setDragScrollLeft] = useState(0);

  const carouselRef = useRef(null);
  const scrollTimeout = useRef(null);
  
  // Dramatically reduce DOM nodes: 5 chunks is enough for a seamless treadmill
  const MULTIPLIER = items.length > 1 ? 5 : 1;
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
    if (!carouselRef.current || items.length < 2) return;
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
    if (items.length < 2 || reduceMotion || expandedCard !== null) return;
    if (autoplayTimer.current) clearInterval(autoplayTimer.current);
    autoplayTimer.current = setInterval(() => {
      scrollToNext();
    }, 5000);
  }, [expandedCard, items.length, reduceMotion, scrollToNext]);

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
    if (!carouselRef.current || e.target.closest("button")) return;
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
      className={`relative flex min-h-0 w-full scroll-mt-20 items-center overflow-hidden select-none font-jakarta ${classic ? "bg-white py-16 sm:py-20 lg:py-24" : "bg-[#f5f5f7] py-16 sm:py-[90px]"}`}
    >


      {/* Main Content Area */}
      <div className="w-full relative z-20 pointer-events-none flex flex-col items-center">
        <div className="w-full pointer-events-auto flex flex-col items-center">

          {/* Section Heading & Subtitle */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center mb-12">
            <h2 className="text-3xl sm:text-[40px] font-semibold tracking-tight text-[#1d1d1f] leading-[1.08]">
              {catalogData.heading || "Academic Document Catalog"}
            </h2>
            <p className="text-[17px] text-[#707070] mt-5 max-w-xl leading-relaxed font-normal">
              {catalogData.description}
            </p>
          </div>

          {catalogStatus === "loading" ? (
            <p role="status" className="px-5 py-8 text-sm text-[#707070]">Loading requestable documents…</p>
          ) : catalogStatus === "error" ? (
            <EmptyState
              variant="compact"
              icon={Files01Icon}
              title="Catalog Unavailable"
              description="Try refreshing the page to see which documents are available."
            />
          ) : items.length === 0 ? (
            <EmptyState
              variant="compact"
              icon={Files01Icon}
              title="No Catalog Documents Available"
              description="No catalog documents are available at this time. Check back later for updates."
            />
          ) : (
            <>
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
                  const isActive = items.length > 0 ? (idx % items.length) === activeIndex : false;
                  const expanded = expandedCard === idx;
                  const requirements = doc.requirements ?? [];
                  const extraCount = requirements.length - 3;
                  return (
                    <div 
                      key={`${doc.id || doc.title}-${idx}`}
                      className={`shrink-0 w-[85vw] sm:w-[60vw] md:w-[45vw] lg:w-[420px] flex flex-col ${classic ? "rounded-3xl bg-[#f5f5f7] p-6 sm:p-8" : "rounded-[28px] bg-white p-6 sm:p-7"} text-left transition-all duration-500 ease-out group snap-center sm:snap-align-none ${
                        isDragging ? 'pointer-events-none' : 'hover:-translate-y-1'
                      } ${
                        isActive 
                          ? 'scale-[1.05] shadow-none z-10' 
                          : 'scale-[0.95] shadow-none z-0 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-5">
                        <CatalogClientBadge label={doc.client} />
                        <span className="text-[10px] font-sans tabular-nums text-zinc-400 font-medium tracking-wide">
                          Official Document
                        </span>
                      </div>
                      
                      <h3 className="text-2xl font-semibold text-[#1d1d1f] tracking-tight leading-snug mb-3 group-hover:text-[#800000] transition-colors">
                        {doc.title}
                      </h3>
                      
                      {doc.description && (
                        <p className="text-sm text-[#707070] leading-relaxed mb-8 flex-grow">{doc.description}</p>
                      )}
                      
                      <div className="pt-5 border-t border-black/5 mt-auto">
                          <div className="text-[10px] font-semibold text-gray-400 font-sans tabular-nums mb-3 flex items-center gap-1.5">
                            <Shield01Icon size="1em"  className="text-sm" />
                            Filing requirements
                          </div>
                          {requirements.length > 0 ? (
                            <>
                              <ul id={`catalog-requirements-${idx}`} className="space-y-3 text-xs text-gray-600">
                                {(expanded ? requirements : requirements.slice(0, 3)).map((requirement, index) => (
                                  <li key={index} className="flex items-start gap-2.5 leading-relaxed">
                                    <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                                      <Tick01Icon size={16} aria-hidden="true" />
                                    </span>
                                    <span className="min-w-0 wrap-break-word">{requirement}</span>
                                  </li>
                                ))}
                              </ul>
                              {extraCount > 0 && (
                                <button
                                  type="button"
                                  aria-expanded={expanded}
                                  aria-controls={`catalog-requirements-${idx}`}
                                  onClick={() => setExpandedCard(expanded ? null : idx)}
                                  className="mt-2 min-h-11 cursor-pointer rounded-md text-xs font-semibold text-pup-maroon hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
                                >
                                  {expanded ? "Show fewer requirements" : `Show ${extraCount} more ${extraCount === 1 ? "requirement" : "requirements"}`}
                                </button>
                              )}
                            </>
                          ) : (
                            <p className="text-xs text-gray-500">Contact the Registrar to confirm filing requirements.</p>
                          )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Apple-style Pagination Dots & Controls */}
              {items.length > 1 && (
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
              )}
            </>
          )}

        </div>
      </div>


    </section>
  );
}
