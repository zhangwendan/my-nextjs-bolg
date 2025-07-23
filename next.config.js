/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
  output: 'standalone',
  trailingSlash: false,
  generateEtags: false,
  compress: true,
  poweredByHeader: false,
  serverExternalPackages: []
};

export default config;
