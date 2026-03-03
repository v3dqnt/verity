/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@ffmpeg-installer/ffmpeg', 'fluent-ffmpeg'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'pollinations.ai',
      },
    ],
  },
};

export default nextConfig;