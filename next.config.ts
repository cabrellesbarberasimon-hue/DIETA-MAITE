import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Las fotos de comida (registro por IA) se comprimen en el cliente antes
    // de enviarse, pero dejamos margen sobre el 1MB por defecto.
    serverActions: {
      bodySizeLimit: "8mb",
    },
  },
};

export default nextConfig;
