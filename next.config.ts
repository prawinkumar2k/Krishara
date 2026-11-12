import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
  output: "standalone", // small Docker image (Tracen topic 7)
  // The image optimizer needs sharp's native libs (libvips). File tracing copies only the .node file and
  // misses its sibling libraries, so the optimizer silently falls back to serving full-size originals.
  // node_modules/@img only contains the build platform's binaries, so this stays small.
  outputFileTracingIncludes: { "/*": ["./node_modules/@img/**/*"] },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
