"use client"

import { useEffect, useRef, useState } from "react"

interface AnimatedNumberProps {
  value: number
  prefix?: string
  suffix?: string
  decimals?: number
  duration?: number
  className?: string
}

export function AnimatedNumber({
  value,
  prefix = "",
  suffix = "",
  decimals = 2,
  duration = 800,
  className = "",
}: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(0)
  const animationRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    let startTime: number | null = null
    let isAnimating = true

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime

      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)

      const currentValue = Math.floor(value * progress)
      setDisplayValue(currentValue)

      if (progress < 1 && isAnimating) {
        animationRef.current = setTimeout(() => {
          animate(performance.now())
        }, 16) // ~60fps
      } else if (progress >= 1) {
        setDisplayValue(value)
      }
    }

    const startTime2 = performance.now()
    animate(startTime2)

    return () => {
      isAnimating = false
      if (animationRef.current) {
        clearTimeout(animationRef.current)
      }
    }
  }, [value, duration])

  const formattedValue = displayValue.toLocaleString("pt-BR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })

  return (
    <span className={className}>
      {prefix}
      {formattedValue}
      {suffix}
    </span>
  )
}
