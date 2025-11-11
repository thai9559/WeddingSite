/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // ❗ Cho phép build dù có lỗi ESLint
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "oovnjewbubiuyspsghwy.supabase.co", // <-- domain project của bạn
        pathname: "/storage/v1/object/**",
      },
    ],
  },
};

module.exports = nextConfig;
