export const DEFAULT_HOTEL_COVER =
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80';

/**
 * Resolves a hotel or room image URL across platforms:
 * - Returns absolute URLs (Cloudinary CDN, Unsplash, etc.) and Data URIs directly.
 * - For relative server media URLs (e.g. /media/hotels/...), prepends the backend origin from VITE_API_URL.
 * - Falls back to a clean default placeholder if no image exists.
 */
export const resolveImageUrl = (
  url?: string | null,
  fallback: string = DEFAULT_HOTEL_COVER
): string => {
  if (!url) return fallback;
  const trimmed = String(url).trim();
  if (!trimmed) return fallback;

  // Cloudinary HTTPS, external CDN, or live base64/blob preview
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:')
  ) {
    return trimmed;
  }

  // Relative backend media path (e.g. /media/hotels/...)
  if (trimmed.startsWith('/')) {
    const envUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
    if (envUrl && envUrl.startsWith('http')) {
      const origin = envUrl.replace(/\/api\/v1\/?$/, '').replace(/\/+$/, '');
      return `${origin}${trimmed}`;
    }
    // Reliable fallback for Vercel deployment pointing to Render backend
    if (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')) {
      return `https://localstay-backend.onrender.com${trimmed}`;
    }
  }

  return trimmed;
};
