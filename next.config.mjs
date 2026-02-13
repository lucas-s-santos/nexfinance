/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Impedir erro de build quando Supabase env vars nao estao disponiveis
  // (paginas protegidas requerem dinamico, nao pre-render)
  experimental: {
    cacheComponents: true,
  },
}

export default nextConfig
