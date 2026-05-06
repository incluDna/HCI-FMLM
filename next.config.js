/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    VITE_SHEET_URL: process.env.VITE_SHEET_URL || ""
  }
};

module.exports = nextConfig;
