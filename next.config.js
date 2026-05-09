/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    VITE_SHEET_URL: process.env.VITE_SHEET_URL || "",
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
  }
};

module.exports = nextConfig;
