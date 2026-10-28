/**
 * Paintings of the Savior used as covers: on the home page, investigation
 * pages, and the study tools (3.0's "more Christ-centered look"). Every work
 * here is in the public domain, from a reproduction on Wikimedia Commons; the
 * credits below are copied from each file's Commons page and are listed in
 * Settings › About. Never add Church-owned or other copyrighted art.
 *
 * Images live in public/art/ as <slug>-600.webp and <slug>-1200.webp.
 */
import ART_DATA from "@/content/art.json";

export interface Artwork {
  slug: string;
  title: string;
  artist: string;
  /** As the Commons page gives it, e.g. "1886" or "c. 1668". */
  year?: string;
  institution?: string;
  /** The Wikimedia Commons file page the image came from. */
  source: string;
  license: string;
  /** What the painting shows, for screen readers. */
  alt: string;
  /** CSS object-position values that keep the subject in view in a wide (16:9) and a 4:3 crop. */
  focus: { wide: string; standard: string };
  /** Pixel size of the 1200-wide file, so the browser can reserve its space. */
  height1200: number;
}

/** Where each painting is used: an investigation id, or one of the study tools. */
export type ArtUse = string;

interface ArtFile {
  note?: string;
  artworks: Artwork[];
  /** Investigation id or section name → artwork slug. */
  uses: Record<ArtUse, string>;
}

const data = ART_DATA as ArtFile;
const BY_SLUG = new Map(data.artworks.map((artwork) => [artwork.slug, artwork]));

export const ARTWORKS: readonly Artwork[] = data.artworks;

/** The painting for an investigation id or a section ("connect", "character", "explorer", "journal", "home"). */
export function artFor(use: ArtUse): Artwork | undefined {
  const slug = data.uses[use];
  return slug ? BY_SLUG.get(slug) : undefined;
}

export const artSrc = (artwork: Artwork, width: 600 | 1200) => `/art/${artwork.slug}-${width}.webp`;

/** "Christ in Gethsemane, Heinrich Hofmann, 1886": the line under a painting, like a museum label. */
export const artCredit = (artwork: Artwork) => [artwork.title, artwork.artist, artwork.year].filter(Boolean).join(", ");
