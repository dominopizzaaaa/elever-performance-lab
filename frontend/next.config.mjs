/** @type {import('next').NextConfig} */
const apiTarget = process.env.API_PROXY_TARGET ?? 'http://localhost:4000';

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  /**
   * The kiosk talks to the Express API through a same-origin `/api` path.
   * Proxying here means no CORS preflights in the browser and one origin to
   * configure when the stack moves behind a real reverse proxy.
   */
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${apiTarget}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
