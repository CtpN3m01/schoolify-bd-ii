import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: ["i.pravatar.cc", "m.media-amazon.com", "pngimg.com", "media.istockphoto.com"], // Permitir imágenes desde estos dominios
  },
};

export default nextConfig;
