/**
 * Middleware de Rate Limiting para API
 * Protege endpoints contra abuso e excesso de requisições
 */

import { NextRequest, NextResponse } from "next/server"

interface RateLimitStore {
  [key: string]: Array<{
    timestamp: number
    count: number
  }>
}

const store: RateLimitStore = {}

export type RateLimitConfig = {
  /** Requisições permitidas por janela de tempo */
  maxRequests: number
  /** Janela de tempo em segundos */
  windowSeconds: number
  /** Mensagem de erro customizada */
  message?: string
}

/**
 * Extrai identificador único do cliente
 * Pode ser IP, user_id, ou custom
 */
function getClientId(request: NextRequest): string {
  // Preferir user_id se estiver logado
  const authHeader = request.headers.get("authorization")
  if (authHeader) {
    try {
      // Extrair user_id do token JWT se necessário
      return authHeader.replace("Bearer ", "")
    } catch {}
  }

  // Fallback para IP
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0] ||
    request.headers.get("x-real-ip") ||
    "unknown"
  )
}

/**
 * Verifica se requisição ultrapassou limite
 */
function isRateLimited(clientId: string, config: RateLimitConfig): boolean {
  const now = Date.now() / 1000 // segundos
  const key = clientId

  if (!store[key]) {
    store[key] = []
  }

  // Remove entries fora da janela
  store[key] = store[key].filter((entry) => entry.timestamp > now - config.windowSeconds)

  // Verifica limite
  const totalRequests = store[key].reduce((sum, entry) => sum + entry.count, 0)

  if (totalRequests >= config.maxRequests) {
    return true
  }

  // Registra nova requisição
  const lastEntry = store[key][store[key].length - 1]
  if (lastEntry && lastEntry.timestamp === Math.floor(now)) {
    lastEntry.count += 1
  } else {
    store[key].push({
      timestamp: Math.floor(now),
      count: 1,
    })
  }

  return false
}

/**
 * Middleware de rate limiting para Next.js API routes
 */
export function withRateLimit(
  handler: (request: NextRequest) => Promise<NextResponse>,
  config: RateLimitConfig = {
    maxRequests: 10,
    windowSeconds: 60,
  }
) {
  return async (request: NextRequest) => {
    const clientId = getClientId(request)

    if (isRateLimited(clientId, config)) {
      return NextResponse.json(
        {
          error: config.message || "Muitas requisições. Tente novamente mais tarde.",
          retryAfter: config.windowSeconds,
        },
        { status: 429 }
      )
    }

    return handler(request)
  }
}

/**
 * Limpeza periódica de entradas antigas
 * Chamar em um intervalo ou job
 */
export function cleanupRateLimitStore() {
  const now = Date.now() / 1000
  const maxAge = 3600 // 1 hora

  Object.keys(store).forEach((key) => {
    store[key] = store[key].filter((entry) => entry.timestamp > now - maxAge)
    if (store[key].length === 0) {
      delete store[key]
    }
  })
}
