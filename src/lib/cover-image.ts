/** Shared responsive cover-image policy for server-rendered Astro and React cards.
 * Cloudflare image-proxy v3 only accepts known, immutable WebRPG cover paths.
 * Original Index URLs remain unchanged for metadata and fallback.
 */
const allowedPath = /^\/(?:[A-Za-z0-9][A-Za-z0-9._-]*-[A-Za-z0-9._-]+\/cover\.png|images\/[A-Za-z0-9][A-Za-z0-9._-]*\.(?:png|jpe?g|webp))$/;
const allowedWidths = new Set([384, 640, 750, 1080, 1200, 1920]);

export const CARD_COVER_WIDTHS = [384, 640, 750, 1080, 1200] as const;
export const DETAIL_COVER_WIDTHS = [640, 750, 1080, 1200, 1920] as const;

/** Match actual auto-fill grid breakpoints, not image intrinsic dimensions. */
export const CARD_COVER_SIZES =
  "(min-width: 1380px) 320px, (min-width: 1020px) 31vw, (min-width: 670px) 47vw, calc(100vw - 42px)";

/** Details use a <=36% desktop column and a single mobile column capped at 500px. */
export const DETAIL_COVER_SIZES =
  "(min-width: 1400px) 470px, (min-width: 760px) 36vw, min(500px, calc(100vw - 48px))";

function sourcePath(source: string): string | null {
  try {
    const u = new URL(source);
    if (u.protocol !== "https:" || u.hostname !== "webrpg.org" ||
        u.port || u.username || u.password || u.search || u.hash ||
        !allowedPath.test(u.pathname)) return null;
    return u.pathname;
  } catch {
    return null;
  }
}

/** Unrecognized sources remain directly accessible instead of being sent to a 403 proxy. */
export function optimizedCoverUrl(source: string, width: number): string {
  const path = sourcePath(source);
  if (!path || !allowedWidths.has(width)) return source;
  return "https://i.ravelloh.com/webrpg.org" + path + "?w=" + width;
}

export function coverSrcSet(source: string, widths: readonly number[]): string | undefined {
  if (!sourcePath(source)) return undefined;
  return widths.map((width) => optimizedCoverUrl(source, width) + " " + width + "w").join(", ");
}
