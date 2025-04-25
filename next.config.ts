// next.config.ts

// next.config.ts

/** @type {import('next').NextConfig} */
const nextConfig: import('next').NextConfig = {
  images: {
    domains: ["m.media-amazon.com", "pngimg.com", "media.istockphoto.com", "culturachina.net", "26.110.167.142", "i.pinimg.com"],
  },
  // Permitir escuchar en todas las interfaces de red
  devIndicators: {
  },
};

module.exports = nextConfig;
