"use client";

import {
  motion,
  AnimatePresence,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Calendar, MapPin, Maximize2, X } from "lucide-react";

const reels = [
  "/reels/reel1.mp4",
  "/reels/reel2.mp4",
  "/reels/reel3.mp4",
  "/reels/reel4.mp4",
];

interface HeroSectionProps {
  targetDate: string | null;
}

function getRemaining(targetDate: string | null) {
  if (!targetDate) return { days: 0, hours: 0, mins: 0, secs: 0 };
  const target = new Date(targetDate).getTime();
  if (!Number.isFinite(target)) return { days: 0, hours: 0, mins: 0, secs: 0 };
  
  const diff = Math.max(0, target - Date.now());
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const mins = Math.floor((diff / 1000 / 60) % 60);
  const secs = Math.floor((diff / 1000) % 60);
  return { days, hours, mins, secs };
}

export function HeroSection({ targetDate }: HeroSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const [timeLeft, setTimeLeft] = useState(() => getRemaining(targetDate));
  const [isHovered, setIsHovered] = useState(false);
  const [showPoster, setShowPoster] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });
  const mobilePosterRevealRaw = useTransform(scrollYProgress, [0.06, 0.78], [0, 1]);
  const mobilePosterReveal = useSpring(mobilePosterRevealRaw, {
    stiffness: 110,
    damping: 24,
    mass: 0.5,
  });
  const mobileTextOpacity = useTransform(mobilePosterReveal, [0, 0.72], [1, 0]);
  const mobileTextY = useTransform(mobilePosterReveal, [0, 1], [0, -28]);
  const mobilePosterClipPath = useTransform(
    mobilePosterReveal,
    (value) => `inset(${(1 - value) * 100}% 0% 0% 0%)`,
  );
  const mobilePosterScale = useTransform(mobilePosterReveal, [0, 1], [1.1, 1]);
  const mobilePosterOverlayOpacity = useTransform(mobilePosterReveal, [0, 1], [0.2, 0]);
  const mobileFeatherTop = useTransform(
    mobilePosterReveal,
    (value) => `calc(${(1 - value) * 100}% - 88px)`,
  );
  const mobileFeatherOpacity = useTransform(mobilePosterReveal, [0, 0.12, 0.95, 1], [0, 0.92, 0.92, 0]);

  useEffect(() => {
    // Keep timer updating every second
    const timer = setInterval(() => {
      setTimeLeft(getRemaining(targetDate));
    }, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  useEffect(() => {
    // Reel rotation
    if (prefersReducedMotion) {
      return;
    }
    const interval = setInterval(() => {
      if (!isHovered) {
        setActive((prev) => (prev + 1) % reels.length);
      }
    }, 6000);
    return () => clearInterval(interval);
  }, [isHovered, prefersReducedMotion]);

  return (
    <section
      ref={sectionRef}
      className="relative w-full h-[220dvh] sm:h-[205dvh] lg:h-[85vh] min-h-0 lg:min-h-[650px] mb-12 sm:mb-16 rounded-xl lg:rounded-3xl bg-slate-950 shadow-2xl"
    >
      <div className="sticky top-0 relative h-[100dvh] lg:h-full overflow-hidden flex flex-col lg:flex-row-reverse items-center justify-center p-6 sm:p-8 md:p-12 gap-8 md:gap-12 py-10 lg:py-12 rounded-xl lg:rounded-3xl">
      {/* Background ambient effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-amber-900/20 via-slate-950 to-emerald-900/20 z-0 pointer-events-none hidden lg:block" />
      <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-amber-500/10 blur-[120px] rounded-full z-0 pointer-events-none hidden lg:block" />
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-emerald-500/10 blur-[100px] rounded-full z-0 pointer-events-none hidden lg:block" />

      {/* Video Players / Reels as Background on Mobile */}
      <div 
        className="absolute inset-0 lg:relative z-0 lg:z-10 flex-1 flex flex-col justify-center items-center h-full w-full perspective-1000 mt-0 lg:mt-0"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="relative w-full h-full flex justify-center items-center overflow-hidden lg:overflow-visible">
          {reels.map((reelId, index) => {
            const isActive = index === active;
            const isPrev = index === (active - 1 + reels.length) % reels.length;
            const isNext = index === (active + 1) % reels.length;
            const shouldLoadVideo = isActive || isPrev || isNext;

            // Compute transformations based on visual position
            let x = 0;
            let z = 0;
            let rotateY = 0;
            let scale = 1;
            let opacity = 1;
            let zIndex = 0;

            if (isActive) {
              x = 0;
              z = 40;
              rotateY = 0;
              scale = 1;
              zIndex = 30;
            } else if (isPrev) {
              x = -45;
              z = -100;
              rotateY = 25;
              scale = 0.8;
              opacity = 0.4;
              zIndex = 20;
            } else if (isNext) {
              x = 45;
              z = -100;
              rotateY = -25;
              scale = 0.8;
              opacity = 0.4;
              zIndex = 20;
            } else {
              // Hidden layers
              opacity = 0;
              scale = 0.6;
              zIndex = 0;
            }

            return (
              <motion.div
                key={reelId}
                className={`absolute w-[140%] h-[140%] lg:w-[280px] lg:h-[500px] lg:rounded-3xl overflow-hidden cursor-pointer origin-center bg-black/50 backdrop-blur-md lg:shadow-2xl transition-shadow ${isActive ? 'lg:shadow-blue-500/30' : ''}`}
                animate={{
                  x: `${x}%`,
                  z,
                  rotateY,
                  scale,
                  opacity,
                  zIndex,
                }}
                transition={{
                  duration: 0.8,
                  ease: [0.16, 1, 0.3, 1],
                }}
                onClick={() => setActive(index)}
              >
                <div className={`absolute inset-0 transition-opacity duration-700 z-20 pointer-events-none ${isActive ? 'bg-transparent' : 'bg-black/60'}`} />
                
                <video
                  src={shouldLoadVideo ? reelId : undefined}
                  className={`w-full h-full object-cover transition-opacity duration-500 ${isActive ? 'opacity-100 scale-100' : 'opacity-60 scale-105'}`}
                  autoPlay={isActive}
                  muted
                  loop
                  playsInline
                  preload={isActive ? "auto" : "metadata"}
                  controls={false}
                />
                
                {isActive && (
                  <div className="hidden lg:block absolute inset-0 ring-2 ring-inset ring-white/40 rounded-3xl pointer-events-none z-30 shadow-[inset_0_0_20px_rgba(255,255,255,0.2)]" />
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Mobile dark overlay so text is readable */}
        <div className="absolute inset-0 bg-black/50 lg:hidden z-50 pointer-events-none backdrop-blur-[2px]" />

        {/* Indicator dots */}
        <div className="absolute bottom-6 flex gap-2 z-40 lg:-bottom-8">
          {reels.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setActive(idx)}
              className={`h-1.5 rounded-full transition-all duration-300 ${active === idx ? 'w-6 bg-amber-400' : 'w-2 bg-white/20 hover:bg-white/40'}`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Mobile poster reveal on scroll */}
      <motion.div
        className="absolute inset-0 z-30 lg:hidden pointer-events-none"
        style={prefersReducedMotion ? undefined : { clipPath: mobilePosterClipPath }}
      >
        <motion.div
          className="absolute inset-0"
          style={prefersReducedMotion ? undefined : { scale: mobilePosterScale }}
        >
          <Image
            src="/poster-mobile.jpeg"
            alt="Official Poster"
            fill
            sizes="100vw"
            className="object-cover object-top"
            loading="lazy"
          />
          <motion.div
            className="absolute inset-0 bg-slate-950/40"
            style={prefersReducedMotion ? { opacity: 0 } : { opacity: mobilePosterOverlayOpacity }}
          />
        </motion.div>
      </motion.div>
      {!prefersReducedMotion && (
        <motion.div
          className="absolute left-0 right-0 h-40 z-40 lg:hidden pointer-events-none"
          style={{
            top: mobileFeatherTop,
            opacity: mobileFeatherOpacity,
            background:
              "linear-gradient(to bottom, rgba(15,23,42,0.0) 0%, rgba(15,23,42,0.6) 50%, rgba(15,23,42,0.0) 100%)",
            filter: "blur(12px)",
          }}
        />
      )}

      {/* Text Content */}
      <motion.div
        className="relative z-20 flex-1 text-center lg:text-left w-full mt-4 md:mt-0 py-8 lg:py-0"
        style={
          prefersReducedMotion
            ? undefined
            : {
                opacity: mobileTextOpacity,
                y: mobileTextY,
              }
        }
      >
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-amber-200 text-sm font-semibold mb-6 backdrop-blur-sm shadow-xl">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            Upcoming Event
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white tracking-tight mb-4 leading-tight">
            <span className="block text-lg md:text-xl lg:text-2xl font-semibold tracking-normal text-slate-200">
              Anayamkunnu Sector
            </span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-orange-500">
              Sahityolsav
            </span>
          </h1>
          
          <div className="flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-4 sm:gap-6 text-slate-300 font-medium mb-8">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-amber-400" />
              <span>May 23, 24</span>
            </div>
            <div className="hidden sm:block w-1.5 h-1.5 rounded-full bg-slate-600" />
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-emerald-400" />
              <span>Sarkkarparamb</span>
            </div>
          </div>

          {/* Poster and Countdown Integrated Block */}
          <div className="flex flex-col xl:flex-row items-center lg:items-start xl:items-center justify-center lg:justify-start gap-6 sm:gap-8 xl:gap-10 mt-6 sm:mt-8 w-full max-w-2xl mx-auto lg:mx-0">
            
            {/* Sleek Poster Thumbnail */}
            <motion.div 
              onClick={() => setShowPoster(true)}
              whileHover={{ scale: 1.03, y: -5 }}
              className="relative hidden lg:block w-[150px] sm:w-[200px] xl:w-[260px] aspect-[1/1.414] rounded-2xl overflow-hidden border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.5)] group cursor-pointer bg-slate-900 shrink-0 z-20 mx-auto lg:mx-0 transition-all duration-300"
            >
               <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 to-emerald-500/10 mix-blend-overlay z-10 opacity-100 group-hover:opacity-0 transition-opacity duration-500" />
               <Image 
                 src="/main-poster.jpg" 
                 alt="Official Poster Thumbnail" 
                 className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105"
                 width={400}
                 height={600}
               />
               
               {/* Hover Overlay */}
               <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 flex items-center justify-center">
                 <div className="flex items-center gap-2 text-white bg-white/20 backdrop-blur-md rounded-full py-1.5 px-3 sm:py-2 sm:px-4 border border-white/30 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 shadow-xl">
                   <Maximize2 className="w-3 h-3 sm:w-4 sm:h-4" />
                   <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">View Full Poster</span>
                 </div>
               </div>
            </motion.div>

            {/* Countdown UI */}
            <div className="flex flex-col gap-3 sm:gap-4 w-full xl:w-auto">
              <div className="text-xs sm:text-sm font-semibold tracking-widest text-amber-500 uppercase px-1 text-center xl:text-left mb-1">
                Event Starts In
              </div>
              <div className="flex gap-2 sm:gap-3 lg:gap-4 justify-center xl:justify-start">
                {[
                  { label: "Days", value: timeLeft.days },
                  { label: "Hours", value: timeLeft.hours },
                  { label: "Mins", value: timeLeft.mins },
                  { label: "Secs", value: timeLeft.secs }
                ].map((unit, i) => (
                  <div key={i} className="flex flex-col items-center group">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 lg:w-20 lg:h-20 xl:w-24 xl:h-24 bg-gradient-to-b from-white/10 to-white/5 backdrop-blur-xl rounded-xl sm:rounded-2xl border border-white/20 flex flex-col items-center justify-center shadow-[0_8px_30px_rgba(0,0,0,0.2)] mb-2.5 relative overflow-hidden transition-all duration-300 group-hover:border-amber-500/30 group-hover:-translate-y-1">
                      {/* Inner glare */}
                      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-50" />
                      
                      <span className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-black text-white tabular-nums tracking-tighter drop-shadow-md">
                        {unit.value.toString().padStart(2, "0")}
                      </span>
                    </div>
                    <span className="text-[9px] sm:text-[10px] lg:text-xs uppercase tracking-widest text-slate-400 font-bold group-hover:text-amber-400 transition-colors duration-300">{unit.label}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </motion.div>
      </motion.div>
      </div>

      {/* Modal for Full Poster */}
      <AnimatePresence>
        {showPoster && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 backdrop-blur-xl bg-slate-950/90"
            onClick={() => setShowPoster(false)}
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.98, y: 10, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="relative max-w-md md:max-w-2xl max-h-[95vh] w-full rounded-2xl overflow-hidden shadow-2xl border border-white/20 bg-slate-900 flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
               <button 
                 onClick={() => setShowPoster(false)} 
                 className="absolute top-4 right-4 z-50 p-2.5 bg-black/40 hover:bg-black/80 rounded-full text-white backdrop-blur-md border border-white/10 transition-all hover:scale-110"
               >
                 <X className="w-5 h-5" />
               </button>
               <div className="w-full h-full overflow-y-auto custom-scrollbar flex items-center justify-center p-2 bg-black">
                 <Image 
                   src="/main-poster.jpg" 
                   alt="Full Official Poster" 
                   width={1200}
                   height={1600}
                   className="w-full h-auto object-contain rounded-xl"
                 />
               </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
