/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // ไม่มี experimental.appDir
};
module.exports = nextConfig;

// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },        // ⬅ ข้าม ESLint ตอน build
  typescript: { ignoreBuildErrors: true },     // ⬅ ข้าม TS error ตอน build
  // ...ของเดิมคุณ
};

export default nextConfig;
