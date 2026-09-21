import withSerwistInit from "@serwist/next";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const offlinePage = "app/~offline/page.tsx";
const revision = createHash("md5").update(readFileSync(offlinePage)).digest("hex");

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
  cacheOnNavigation: true,
  reloadOnOnline: true,
  additionalPrecacheEntries: [
    { url: "/~offline", revision },
    { url: "/guru/soal/latihan", revision: `${revision}-guru-latihan` },
    { url: "/ortu/soal", revision: `${revision}-ortu-soal` },
  ],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: [
      "pdf-parse",
      "@prisma/client",
      "tesseract.js",
      "sharp",
      "mupdf",
    ],
    serverActions: {
      bodySizeLimit: "20mb",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.vercel-storage.com",
      },
    ],
  },
};

export default withSerwist(nextConfig);
