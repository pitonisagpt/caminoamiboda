import { forwardRef, useEffect, useState } from "react";
import { photoVariantUrls } from "../utils/photoVariants";

interface ResponsivePhotoProps {
  url: string;
  alt: string;
  /** "card" = catalog grid/thumbnail size (~480px). "full" = modal/detail
   * hero size (the photo's own stored resolution, up to 1600px). */
  size: "card" | "full";
  className?: string;
  loading?: "lazy" | "eager";
}

/**
 * Tries the WebP variant first, then steps down through JPEG fallbacks on
 * load failure, ending at `url` — the original, DB-referenced file, which
 * always exists.
 *
 * Deliberately NOT a <picture><source type="image/webp"> — that was the
 * first version of this component, and it had a real bug: once a browser's
 * picture algorithm matches a <source> by type, writing `.src` on the
 * <img> from an onError handler does NOT bypass it — the UA re-runs
 * source selection, re-matches the same (still-broken) <source>, and
 * retries the exact URL that just failed. Confirmed with Playwright
 * (blocking the derived variants and watching every image stay broken
 * despite the "fallback"). A plain <img> with state-driven `src` swapping
 * has no such algorithm to fight — onError just moves to the next
 * candidate, which is plain, predictable browser behavior.
 *
 * Forwards its ref to the underlying <img> — PhotoSlider's swipe-drag
 * tracking (useSwipeNavigation) mutates `ref.current.style.transform`
 * directly on the image element itself.
 */
export const ResponsivePhoto = forwardRef<HTMLImageElement, ResponsivePhotoProps>(
  function ResponsivePhoto({ url, alt, size, className, loading = "lazy" }, ref) {
    const variants = photoVariantUrls(url);
    const candidates =
      size === "card" ? [variants.cardWebp, variants.cardJpg, url] : [variants.fullWebp, url];

    const [step, setStep] = useState(0);
    // A different photo (slider moved, or this instance got reused for a
    // different vehicle) needs to restart from the preferred candidate,
    // not stay stuck wherever the previous photo's fallback chain landed.
    useEffect(() => {
      setStep(0);
    }, [url, size]);

    return (
      <img
        ref={ref}
        src={candidates[step]}
        alt={alt}
        className={className}
        loading={loading}
        onError={() => setStep((s) => Math.min(s + 1, candidates.length - 1))}
      />
    );
  }
);
