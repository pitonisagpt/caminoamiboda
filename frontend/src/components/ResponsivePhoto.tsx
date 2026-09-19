import { forwardRef } from "react";
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
 * WebP-with-JPEG-fallback wrapper via <picture>, sized to either the
 * catalog-grid "card" tier or the full/original tier the backend already
 * generates for every photo (app/core/image_utils.py,
 * generate_responsive_variants()). A browser without WebP support (there
 * basically isn't one left, but the mechanism is what matters) just
 * renders the <img> fallback — no JS feature detection needed.
 *
 * Forwards its ref to the underlying <img> (not the <picture> wrapper) —
 * PhotoSlider's swipe-drag tracking (useSwipeNavigation) mutates
 * `ref.current.style.transform` directly on the image element itself.
 */
export const ResponsivePhoto = forwardRef<HTMLImageElement, ResponsivePhotoProps>(
  function ResponsivePhoto({ url, alt, size, className, loading = "lazy" }, ref) {
    const variants = photoVariantUrls(url);
    const webpSrc = size === "card" ? variants.cardWebp : variants.fullWebp;
    const jpgSrc = size === "card" ? variants.cardJpg : url;
    return (
      <picture>
        <source srcSet={webpSrc} type="image/webp" />
        <img ref={ref} src={jpgSrc} alt={alt} className={className} loading={loading} />
      </picture>
    );
  }
);
