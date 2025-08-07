// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    turbo: {
      loaders: { '.mdx': ['@mdx-js/loader'] }
    }
  }
}

export default nextConfig
