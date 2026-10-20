export const DEFAULT_HOTEL_COVER =
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=400&q=65';

export interface ImageOptimizationOptions {
  width?: number;
  quality?: number;
}

/**
 * Optimizes external image URLs (Unsplash, Cloudinary) to avoid transferring oversized raw resolutions.
 */
export const optimizeImageUrl = (
  url: string,
  options: ImageOptimizationOptions = { width: 380, quality: 65 }
): string => {
  if (!url) return url;
  const width = options.width ?? 380;
  const quality = options.quality ?? 65;

  // Unsplash CDN dynamic optimization: downscale to mobile/card width and lower quality
  if (url.includes('images.unsplash.com')) {
    try {
      const parsed = new URL(url);
      parsed.searchParams.set('auto', 'format');
      parsed.searchParams.set('fit', 'crop');
      parsed.searchParams.set('w', String(width));
      parsed.searchParams.set('q', String(quality));
      return parsed.toString();
    } catch {
      return url
        .replace(/([?&])w=\d+/, `$1w=${width}`)
        .replace(/([?&])q=\d+/, `$1q=${quality}`);
    }
  }

  // Cloudinary CDN automatic format, quality, and width transform
  if (url.includes('res.cloudinary.com') && url.includes('/upload/')) {
    if (!url.includes('f_auto') && !url.includes('w_')) {
      return url.replace('/upload/', `/upload/f_auto,q_auto,w_${width}/`);
    }
  }

  return url;
};

/**
 * Resolves a hotel or room image URL across platforms:
 * - Returns absolute URLs (Cloudinary CDN, Unsplash, etc.) and Data URIs with automatic responsive downscaling.
 * - For relative server media URLs (e.g. /media/hotels/...), prepends the backend origin from VITE_API_URL.
 * - Falls back to a clean default placeholder if no image exists.
 */
export const resolveImageUrl = (
  url?: string | null,
  fallback: string = DEFAULT_HOTEL_COVER,
  options?: ImageOptimizationOptions
): string => {
  if (!url) return optimizeImageUrl(fallback, options);
  const trimmed = String(url).trim();
  if (!trimmed) return optimizeImageUrl(fallback, options);

  // Cloudinary HTTPS, external CDN, or live base64/blob preview
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:')
  ) {
    return optimizeImageUrl(trimmed, options);
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

  return optimizeImageUrl(trimmed, options);
};

