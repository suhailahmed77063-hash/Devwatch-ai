import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    // WebForge serves user/AI assets through its own optimizer pipeline later;
    // remote marketing assets and S3 URLs are plain <img> in this product.
    unoptimized: true,
  },
  serverExternalPackages: [
    "@prisma/client",
    "bcryptjs",
    "jszip",
    "stripe",
    "@aws-sdk/client-s3",
  ],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
