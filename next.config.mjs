// Security headers for every page and API route.
const securityHeaders = [
  // Don't let other sites embed the app in a frame (stops clickjacking the Upgrade button).
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
  // Browsers must use the declared file types.
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Only send the site's address, not full page URLs, to other sites.
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // The app never needs the camera, microphone or location.
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  // Always use HTTPS.
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
