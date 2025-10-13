/** @type {import('next').NextConfig} */
const nextConfig = {
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
