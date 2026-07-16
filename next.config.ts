import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }
    return config;
  },
  outputFileTracingIncludes: {
    '/api/companies/excel': [
      './public/startuptn-startups.csv',
      './public/startuptn-startups.xlsx'
    ],
  },
};

export default nextConfig;
