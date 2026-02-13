export const DEFAULT_SYSTEM_COLOR = "#3b82f6"

export const normalizeHex = (value: string) => {
  const cleaned = value.trim().replace(/^#/, "")
  if (/^[0-9a-fA-F]{3}$/.test(cleaned)) {
    const expanded = cleaned
      .split("")
      .map((char) => char + char)
      .join("")
    return `#${expanded.toLowerCase()}`
  }
  if (/^[0-9a-fA-F]{6}$/.test(cleaned)) {
    return `#${cleaned.toLowerCase()}`
  }
  return null
}

const hexToRgb = (hex: string) => {
  const normalized = normalizeHex(hex)
  if (!normalized) return null
  const value = normalized.slice(1)
  const r = parseInt(value.slice(0, 2), 16)
  const g = parseInt(value.slice(2, 4), 16)
  const b = parseInt(value.slice(4, 6), 16)
  return { r, g, b }
}

const rgbToHsl = (r: number, g: number, b: number) => {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const delta = max - min

  let h = 0
  if (delta !== 0) {
    if (max === rn) {
      h = ((gn - bn) / delta) % 6
    } else if (max === gn) {
      h = (bn - rn) / delta + 2
    } else {
      h = (rn - gn) / delta + 4
    }
    h *= 60
    if (h < 0) h += 360
  }

  const l = (max + min) / 2
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1))

  return {
    h: Math.round(h),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  }
}

const setHslVar = (name: string, h: number, s: number, l: number) => {
  document.documentElement.style.setProperty(name, `${h} ${s}% ${l}%`)
}

export const applySystemColor = (hex: string) => {
  const rgb = hexToRgb(hex)
  if (!rgb) return
  const { h, s, l } = rgbToHsl(rgb.r, rgb.g, rgb.b)
  const accentHue = (h + 16) % 360
  const accentLight = Math.min(92, l + 8)

  setHslVar("--primary", h, s, l)
  setHslVar("--ring", h, s, l)
  setHslVar("--sidebar-primary", h, s, l)
  setHslVar("--sidebar-ring", h, s, l)
  setHslVar("--chart-1", h, s, l)
  setHslVar("--chart-3", h, Math.min(95, s + 6), accentLight)
  setHslVar("--success", h, s, l)

  setHslVar("--accent", accentHue, s, accentLight)
  setHslVar("--chart-2", accentHue, s, accentLight)
}
