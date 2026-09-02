import { useEffect, useRef } from "react";

interface Options {
  /**
   * Called when the gesture resolves to "next" (drag left). Pass
   * `undefined` instead of a no-op to mark that direction as a boundary —
   * the live drag rubber-bands there and release always springs back
   * instead of committing. FilePreviewModal's non-wrapping `hasNext`/
   * `hasPrev` already flow into this today (`onNext: hasNext ? onNext :
   * undefined`), no separate flag needed here.
   */
  onNext?: () => void;
  /** Same as `onNext`, mirrored for the "prev" direction (drag right). */
  onPrev?: () => void;
}

const COMMIT_PX = 50;
const AXIS_RATIO = 1.5;
const AXIS_DEADZONE_PX = 10;
const BOUNDARY_DAMPEN = 0.35;
const RELEASE_MS = 200;

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Horizontal swipe-to-navigate for photo/file carousels — the current
 * image now visually tracks the finger during the drag (direct
 * manipulation, not damped) and animates the rest of the way off-screen
 * before handing off to `onNext`/`onPrev`, instead of silently swapping
 * only once the finger lifts.
 *
 * The live tracking mutates `ref.current.style.transform` straight from
 * `onTouchMove`, bypassing React state/render entirely (matches
 * ParallaxHero.tsx's own direct scroll-linked transform) — a re-render
 * per touchmove event would be far too slow for 1:1 finger tracking.
 *
 * Usage — the container gets the touch handlers, the `<img>` inside it
 * gets the ref, so only the image itself moves and not any sibling
 * overlays (arrow buttons, dots, counters):
 * ```
 * const { ref, ...swipeHandlers } = useSwipeNavigation({ onNext, onPrev });
 * <div className="touch-pan-y" {...swipeHandlers}>
 *   <img ref={ref} ... />
 *   ...overlays...
 * </div>
 * ```
 */
export function useSwipeNavigation({ onNext, onPrev }: Options) {
  const ref = useRef<HTMLImageElement>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const axis = useRef<"horizontal" | "vertical" | null>(null);
  // True from the moment a swipe commits until its slide-out transition
  // finishes and onNext/onPrev has fired — new touch input is ignored for
  // that window so a rapid second swipe can't fire mid-animation and race
  // the pending commit.
  const committing = useRef(false);
  const commitTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (commitTimeout.current) clearTimeout(commitTimeout.current);
    };
  }, []);

  const springBack = () => {
    const img = ref.current;
    if (!img) return;
    img.style.transition = prefersReducedMotion() ? "none" : `transform ${RELEASE_MS}ms ease-out`;
    img.style.transform = "translateX(0)";
  };

  const commit = (callback: () => void, direction: "next" | "prev") => {
    const img = ref.current;
    if (!img || prefersReducedMotion()) {
      // No image to animate (e.g. FilePreviewModal on a PDF/unsupported
      // file) or motion is reduced — fall back to the old instant swap.
      callback();
      if (img) {
        img.style.transition = "none";
        img.style.transform = "translateX(0)";
      }
      return;
    }
    committing.current = true;
    img.style.transition = `transform ${RELEASE_MS}ms ease-out`;
    img.style.transform = direction === "next" ? "translateX(-100%)" : "translateX(100%)";
    commitTimeout.current = setTimeout(() => {
      callback();
      // Same DOM node (nothing forces a remount) just got a new `src` in
      // that render — reset it to centered with no transition before the
      // browser's next paint so it appears already in place, no flash.
      const el = ref.current;
      if (el) {
        el.style.transition = "none";
        el.style.transform = "translateX(0)";
      }
      committing.current = false;
    }, RELEASE_MS);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (committing.current) return; // ignore new gestures while a swipe is still animating out
    start.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    axis.current = null;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const s = start.current;
    const img = ref.current;
    if (!s || !img || committing.current) return;

    const dx = e.touches[0].clientX - s.x;
    const dy = e.touches[0].clientY - s.y;

    if (axis.current === null) {
      if (Math.abs(dx) < AXIS_DEADZONE_PX && Math.abs(dy) < AXIS_DEADZONE_PX) return;
      axis.current = Math.abs(dx) >= Math.abs(dy) * AXIS_RATIO ? "horizontal" : "vertical";
    }
    if (axis.current !== "horizontal") return; // vertical gesture — let touch-pan-y hand it to native scroll

    const atBoundary = (dx < 0 && !onNext) || (dx > 0 && !onPrev);
    const visualDx = atBoundary ? dx * BOUNDARY_DAMPEN : dx;
    img.style.transition = "none";
    img.style.transform = `translateX(${visualDx}px)`;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    const s = start.current;
    const wasHorizontal = axis.current === "horizontal";
    start.current = null;
    axis.current = null;
    if (!s || committing.current || !wasHorizontal) return;

    const dx = e.changedTouches[0].clientX - s.x;
    const dy = e.changedTouches[0].clientY - s.y;
    const crossedThreshold = Math.abs(dx) >= COMMIT_PX && Math.abs(dx) >= Math.abs(dy) * AXIS_RATIO;
    const direction: "next" | "prev" = dx < 0 ? "next" : "prev";
    const callback = direction === "next" ? onNext : onPrev;

    if (!crossedThreshold || !callback) {
      springBack();
      return;
    }
    commit(callback, direction);
  };

  // A gesture the browser decides to take over mid-touch (e.g. it starts
  // scrolling/zooming instead) fires touchcancel, not touchend.
  const onTouchCancel = () => {
    const wasHorizontal = axis.current === "horizontal";
    start.current = null;
    axis.current = null;
    if (committing.current || !wasHorizontal) return;
    springBack();
  };

  return { ref, onTouchStart, onTouchMove, onTouchEnd, onTouchCancel };
}
