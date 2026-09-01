import { useRef } from "react";

interface Options {
  onNext?: () => void;
  onPrev?: () => void;
}

/**
 * Horizontal swipe-to-navigate for photo/file carousels — a left swipe
 * calls `onNext`, a right swipe calls `onPrev`. Ignores mostly-vertical
 * swipes so it doesn't fight the page's own scroll.
 *
 * Spread the returned handlers onto the swipeable container:
 * `<div {...useSwipeNavigation({ onNext, onPrev })}>`.
 */
export function useSwipeNavigation({ onNext, onPrev }: Options) {
  const start = useRef<{ x: number; y: number } | null>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    start.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    const s = start.current;
    start.current = null;
    if (!s) return;
    const dx = e.changedTouches[0].clientX - s.x;
    const dy = e.changedTouches[0].clientY - s.y;
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    if (dx < 0) onNext?.();
    else onPrev?.();
  };

  return { onTouchStart, onTouchEnd };
}
