/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  // เปิดบรรทัดนี้ “ชั่วคราว” ถ้าอยากให้ deploy ผ่านก่อน แล้วค่อยแก้ type error ภายหลัง
  // typescript: { ignoreBuildErrors: true },
};
module.exports = nextConfig;
