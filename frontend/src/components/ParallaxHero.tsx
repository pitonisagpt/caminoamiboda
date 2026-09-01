import { useEffect, useRef, useState, type ReactNode } from "react";

const VIDEO_SRC = "/videos/hero.mp4";

interface Props {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}

/**
 * Full-bleed video hero with a scroll parallax effect — the video moves
 * slower than the page, the classic parallax read. Pure CSS + a small
 * scroll listener, no animation library (matches the rest of this app).
 *
 * `transform` (not top/left) so the browser can GPU-accelerate it, and the
 * scroll handler is throttled to one calculation per animation frame.
 * Skips the effect entirely under prefers-reduced-motion — the video still
 * plays, it just doesn't move with scroll.
 *
 * Breaks out of whatever max-width container it's rendered in via the
 * standard `w-screen` + `left-1/2 -translate-x-1/2` full-bleed trick, so
 * no page or PublicLayout.tsx needs its own structure changed.
 */
export function ParallaxHero({ title, subtitle, children }: Props) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        if (sectionRef.current) {
          setOffset(sectionRef.current.getBoundingClientRect().top * -0.3);
        }
        ticking = false;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      ref={sectionRef}
      className="relative left-1/2 -translate-x-1/2 w-screen h-[55vh] min-h-[380px] max-h-[640px] overflow-hidden bg-brand-900"
    >
      <video
        className="absolute inset-0 w-full h-[130%] object-cover will-change-transform"
        style={{ transform: `translateY(${offset}px)` }}
        src={VIDEO_SRC}
        autoPlay
        muted
        loop
        playsInline
      />
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative h-full flex flex-col items-center justify-center text-center px-4">
        <h1 className="text-4xl sm:text-5xl font-brand text-white mb-3 drop-shadow-lg">{title}</h1>
        {subtitle && (
          <p className="text-white/90 max-w-xl mx-auto text-sm sm:text-base drop-shadow">{subtitle}</p>
        )}
        {children}
      </div>
    </div>
  );
}
