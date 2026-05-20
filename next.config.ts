import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.1.47", "192.168.1.227"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "eptastodjhyanomzauti.supabase.co" },
    ],
  },
  serverExternalPackages: [
    "@react-pdf/renderer",
    "@react-pdf/pdfkit",
    "@react-pdf/render",
    "@react-pdf/layout",
    "@react-pdf/image",
    "@react-pdf/font",
    "fontkit",
  ],
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        {
          key: "Content-Security-Policy",
          value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: blob: https://eptastodjhyanomzauti.supabase.co",
            "font-src 'self' data:",
            "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
            "frame-ancestors 'none'",
          ].join("; "),
        },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      ],
    },
  ],
};

export default nextConfig;
