/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    forceSwcTransforms: true,
  },
  images: {
    unoptimized: true,
  },
  trailingSlash: false,
  output: 'standalone'
};

export default nextConfig;
