/**
 * Hook para cache local e suporte offline
 * Armazena dados críticos no localStorage para funcionamento offline
 */

import { useEffect, useState } from "react"

export type CacheItem<T> = {
  data: T
  timestamp: number
  ttl: number // em ms
}

export function useLocalCache<T>(key: string, ttl: number = 1000 * 60 * 5) {
  const [cached, setCached] = useState<T | null>(null)
  const [isStale, setIsStale] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const item = localStorage.getItem(`cache:${key}`)
      if (item) {
        const parsed: CacheItem<T> = JSON.parse(item)
        const age = Date.now() - parsed.timestamp
        
        if (age < parsed.ttl) {
          setCached(parsed.data)
          setIsStale(false)
        } else {
          setIsStale(true)
        }
      }
    } catch (err) {
      console.warn(`Failed to load cache for key: ${key}`, err)
    }
  }, [key])

  const set = (data: T) => {
    try {
      const item: CacheItem<T> = {
        data,
        timestamp: Date.now(),
        ttl,
      }
      localStorage.setItem(`cache:${key}`, JSON.stringify(item))
      setCached(data)
      setIsStale(false)
    } catch (err) {
      console.warn(`Failed to cache data for key: ${key}`, err)
    }
  }

  const clear = () => {
    try {
      localStorage.removeItem(`cache:${key}`)
      setCached(null)
      setIsStale(true)
    } catch (err) {
      console.warn(`Failed to clear cache for key: ${key}`, err)
    }
  }

  const get = (): T | null => cached

  return { cached, get, set, clear, isStale, isAvailable: cached !== null }
}

/**
 * Hook para persistir preferências de filtros
 */
export function usePersistentFilters<T extends Record<string, any>>(
  key: string,
  defaultFilters: T
): [T, (filters: T) => void] {
  const [filters, setFilters] = useState<T>(defaultFilters)

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`filters:${key}`)
      if (stored) {
        setFilters(JSON.parse(stored))
      }
    } catch (err) {
      console.warn(`Failed to load filters for key: ${key}`, err)
    }
  }, [key])

  const updateFilters = (newFilters: T) => {
    try {
      localStorage.setItem(`filters:${key}`, JSON.stringify(newFilters))
      setFilters(newFilters)
    } catch (err) {
      console.warn(`Failed to persist filters for key: ${key}`, err)
    }
  }

  return [filters, updateFilters]
}

/**
 * Função para limpar cache expirado periodicamente
 */
export function useCleanupExpiredCache() {
  useEffect(() => {
    const cleanup = () => {
      try {
        const allKeys = Object.keys(localStorage)
        const now = Date.now()

        allKeys.forEach((key) => {
          if (key.startsWith("cache:")) {
            const item = localStorage.getItem(key)
            if (item) {
              const parsed: CacheItem<any> = JSON.parse(item)
              const age = now - parsed.timestamp
              if (age > parsed.ttl) {
                localStorage.removeItem(key)
              }
            }
          }
        })
      } catch (err) {
        console.warn("Error cleaning up cache", err)
      }
    }

    // Run cleanup every 5 minutes
    const interval = setInterval(cleanup, 1000 * 60 * 5)
    cleanup() // Run immediately on mount

    return () => clearInterval(interval)
  }, [])
}

/**
 * Hook para detectar modo offline
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    setIsOnline(navigator.onLine)

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  return isOnline
}
