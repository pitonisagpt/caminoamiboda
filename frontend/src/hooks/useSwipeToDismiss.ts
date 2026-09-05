import { useEffect, useRef } from "react";

interface Options {
  /** Called once the drag commits past the threshold (or a fast downward
   * flick) — the caller's real close handler, not an animated wrapper:
   * this hook already slides the panel fully off-screen itself before
   * calling it. */
  onDismiss: () => void;
  /** Set true to ignore all touch input (e.g. a layout where dragging to
   * dismiss doesn't make sense). Off by default. */
  disabled?: boolean;
}

const COMMIT_PX = 80;
const AXIS_RATIO = 1.5;
const AXIS_DEADZONE_PX = 10;
const RELEASE_MS = 200;

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Vertical swipe-to-dismiss for <Modal>'s mobile bottom-sheet layout —
 * the sibling of useSwipeNavigation.ts (horizontal, next/prev) but for a
 * single downward dismiss gesture instead of a pair of navigation
 * directions. Same architecture on purpose: live drag tracking mutates
 * `ref.current.style.transform` straight from `onTouchMove`, bypassing
 * React state/render (a re-render per touchmove would be far too slow
 * for 1:1 finger tracking) — see useSwipeNavigation.ts's own comment for
 * the fuller rationale.
 *
 * Usage — attach the ref to the panel that should visually slide (the
 * whole sheet), but only spread the touch handlers onto a smaller
 * drag-grabbable region (e.g. the handle + header), not the scrollable
 * body — otherwise scrolling tall form content and dismissing the sheet
 * would both be vertical gestures competing for the same touch:
 * ```
 * const { ref, ...swipeHandlers } = useSwipeToDismiss({ onDismiss: onClose });
 * <div ref={ref} className="...">
 *   <div {...swipeHandlers}>...handle + header...</div>
 *   <div className="overflow-y-auto">...scrollable body...</div>
 * </div>
 * ```
 */
export function useSwipeToDismiss({ onDismiss, disabled }: Options) {
  const ref = useRef<HTMLDivElement>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const axis = useRef<"horizontal" | "vertical" | null>(null);
  // True from the moment a drag commits until its slide-out transition
  // finishes and onDismiss has fired — mirrors useSwipeNavigation's own
  // guard against a second gesture racing the pending commit.
  const committing = useRef(false);
  const commitTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (commitTimeout.current) clearTimeout(commitTimeout.current);
    };
  }, []);

  const springBack = () => {
    const panel = ref.current;
    if (!panel) return;
    panel.style.transition = prefersReducedMotion() ? "none" : `transform ${RELEASE_MS}ms ease-out`;
    panel.style.transform = "translateY(0)";
  };

  const commit = () => {
    const panel = ref.current;
    if (!panel || prefersReducedMotion()) {
      onDismiss();
      return;
    }
    committing.current = true;
    panel.style.transition = `transform ${RELEASE_MS}ms ease-out`;
    panel.style.transform = "translateY(100%)";
    commitTimeout.current = setTimeout(() => {
      onDismiss();
      committing.current = false;
    }, RELEASE_MS);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (disabled || committing.current) return;
    start.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    axis.current = null;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const s = start.current;
    const panel = ref.current;
    if (disabled || !s || !panel || committing.current) return;

    const dx = e.touches[0].clientX - s.x;
    const dy = e.touches[0].clientY - s.y;

    if (axis.current === null) {
      if (Math.abs(dx) < AXIS_DEADZONE_PX && Math.abs(dy) < AXIS_DEADZONE_PX) return;
      axis.current = Math.abs(dy) >= Math.abs(dx) * AXIS_RATIO ? "vertical" : "horizontal";
    }
    if (axis.current !== "vertical") return;

    // A bottom sheet has nowhere further to go upward — dragging up
    // rubber-bands instead of tracking 1:1, same damping idea as
    // useSwipeNavigation's boundary case.
    const visualDy = dy < 0 ? dy * 0.35 : dy;
    panel.style.transition = "none";
    panel.style.transform = `translateY(${visualDy}px)`;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    const s = start.current;
    const wasVertical = axis.current === "vertical";
    start.current = null;
    axis.current = null;
    if (disabled || !s || committing.current || !wasVertical) return;

    const dy = e.changedTouches[0].clientY - s.y;
    if (dy >= COMMIT_PX) {
      commit();
    } else {
      springBack();
    }
  };

  // A gesture the browser decides to take over mid-touch fires
  // touchcancel, not touchend — same as useSwipeNavigation.
  const onTouchCancel = () => {
    const wasVertical = axis.current === "vertical";
    start.current = null;
    axis.current = null;
    if (disabled || committing.current || !wasVertical) return;
    springBack();
  };

  return { ref, onTouchStart, onTouchMove, onTouchEnd, onTouchCancel };
}
