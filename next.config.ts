import type { NextConfig } from "next";
import { PHOTO_IMAGE_QUALITY } from "./lib/image-config";

const nextConfig: NextConfig = {
  images: {
    // Serve AVIF first (better quality-per-byte than WebP), so raising quality
    // for the photography doesn't blow up transfer size.
    formats: ['image/avif', 'image/webp'],
    // Next 16 only honours `quality` values that are allow-listed here. The
    // photo surfaces render at PHOTO_IMAGE_QUALITY; 75 stays for any default
    // <Image>.
    qualities: [75, PHOTO_IMAGE_QUALITY],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default nextConfig;
