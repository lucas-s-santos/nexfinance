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
    ppr: true, // Partial Pre-rendering
  },
}

export default nextConfig
