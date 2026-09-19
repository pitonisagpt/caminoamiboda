import { useEffect, useRef, useState, type ReactNode } from "react";

const VIDEO_SRC = "/videos/hero.mp4";
const POSTER_SRC = "/videos/hero-poster.jpg";

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
 * Skips the parallax effect (not the video) under prefers-reduced-motion —
 * see `computeLoadVideo()` below for when the video file itself doesn't
 * load at all.
 *
 * The video is ~1MB even after compression (H.264, no audio track, CRF 30)
 * — still real weight on mobile data, and pointless under
 * prefers-reduced-motion or Data Saver. In those cases (and on narrow
 * viewports, same `md` breakpoint as the rest of the site) a static poster
 * frame renders instead — no video download at all. Decided via a lazy
 * `useState` initializer (not `useEffect`) so it's resolved before the
 * first paint — an effect here would paint the poster first and swap to
 * video a moment later, a visible flash on every desktop load.
 *
 * Breaks out of whatever max-width container it's rendered in via the
 * standard `w-screen` + `left-1/2 -translate-x-1/2` full-bleed trick, so
 * no page or PublicLayout.tsx needs its own structure changed.
 */
function computeLoadVideo(): boolean {
  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const isMobile = window.matchMedia?.("(max-width: 767px)").matches;
  const saveData = (navigator as unknown as { connection?: { saveData?: boolean } }).connection?.saveData === true;
  return !reduceMotion && !isMobile && !saveData;
}

export function ParallaxHero({ title, subtitle, children }: Props) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);
  const [loadVideo] = useState(computeLoadVideo);

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
      {loadVideo ? (
        <video
          className="absolute inset-0 w-full h-[130%] object-cover will-change-transform"
          style={{ transform: `translateY(${offset}px)` }}
          src={VIDEO_SRC}
          poster={POSTER_SRC}
          autoPlay
          muted
          loop
          playsInline
        />
      ) : (
        <img
          className="absolute inset-0 w-full h-full object-cover"
          src={POSTER_SRC}
          alt=""
          fetchPriority="high"
        />
      )}
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
