import { artCredit, artFor, artSrc, type ArtUse } from "@/lib/art";
import { cn } from "@/lib/cn";

interface ArtImageProps {
  /** An investigation id or a section name (src/content/art.json). */
  use: ArtUse;
  /** "wide" is 16:9 (covers), "banner" 21:9 (page covers), "standard" 4:3 (tiles), "square" 1:1 (list thumbnails). */
  ratio?: "wide" | "banner" | "standard" | "square";
  /** The image's displayed width, for choosing between the 600 and 1200 files. */
  sizes?: string;
  /** Loads at once (the first painting on a page); everything else waits until it's near the screen. */
  priority?: boolean;
  /** The painting only decorates something already named nearby (a list thumbnail), so screen readers skip it. */
  decorative?: boolean;
  /** Sizing and shape. Without it the painting fills the width; a className that sets a size must set the width too. */
  className?: string;
}

const RATIOS = { wide: "aspect-video", banner: "aspect-[21/9]", standard: "aspect-[4/3]", square: "aspect-square" } as const;

/**
 * A painting of the Savior, cropped to the ratio asked for with its subject kept in view. Without a painting for
 * `use` (or before one is added), a quiet panel keeps the layout. A plain <img>: the site is a static export, so
 * there is no image optimizer, and the two WebP sizes are made ahead of time.
 */
export function ArtImage({ use, ratio = "wide", sizes = "100vw", priority = false, decorative = false, className = "w-full" }: ArtImageProps) {
  const artwork = artFor(use);
  if (!artwork) return <div aria-hidden className={cn(RATIOS[ratio], "bg-surface-sunken", className)} />;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static export: no image optimizer
    <img
      src={artSrc(artwork, 600)}
      srcSet={`${artSrc(artwork, 600)} 600w, ${artSrc(artwork, 1200)} 1200w`}
      sizes={sizes}
      width={1200}
      height={artwork.height1200}
      alt={decorative ? "" : artwork.alt}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      decoding="async"
      style={{ objectPosition: ratio === "wide" || ratio === "banner" ? artwork.focus.wide : artwork.focus.standard }}
      className={cn(RATIOS[ratio], "bg-surface-sunken object-cover", className)}
    />
  );
}

/**
 * A painting across the top of a page, edge to edge on phones, with its credit underneath like a museum label.
 * Renders nothing when there is no painting for `use`.
 */
export function PageCover({ use, ratio = "banner" }: { use: ArtUse; ratio?: "wide" | "banner" }) {
  const artwork = artFor(use);
  if (!artwork) return null;
  return (
    <figure className="-mx-5 -mt-6 sm:mx-0 sm:mt-0">
      <ArtImage use={use} ratio={ratio} priority sizes="(min-width: 72rem) 70rem, 100vw" className="w-full sm:rounded-xl" />
      <figcaption className="mt-2 px-5 text-[13px] leading-snug text-muted sm:px-0">{artCredit(artwork)}</figcaption>
    </figure>
  );
}
