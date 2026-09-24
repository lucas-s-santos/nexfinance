// Mesmo código do app (nexfinance-mobile/src/theme/palette.ts). Mantenha os dois iguais.
// Paleta NexFinance — derivada da marca (sigla "NF": azul royal → teal).
//
// Fonte única das cores do app. As mesmas cores existem como variáveis CSS em
// src/global.css (para as classes do Tailwind: bg-surface, text-muted...). O teste
// tests/theme.test.ts garante que os dois arquivos continuam iguais e que todo
// token de texto passa no contraste WCAG AA (4.5:1) nos dois temas.

export type Scheme = "light" | "dark"

export type Palette = {
  /** Fundo das telas. */
  background: string
  /** Cards, campos, sheets. */
  surface: string
  /** Superfície sutil: trilhos, estados pressionados, chips inativos. */
  surface2: string
  border: string
  /** Texto principal. */
  foreground: string
  /** Texto secundário (legendas, rótulos, placeholders). */
  muted: string
  /** Cor de ação da marca: botões primários, seleção, foco. */
  accent: string
  /** Acento usado como TEXTO (links, valores em destaque) — mais claro no escuro. */
  accentSoft: string
  /** Texto/ícone sobre fundo accent. */
  onAccent: string
  /** Segunda cor da marca — decorativa (ícones, gradientes), não para texto. */
  teal: string
  income: string
  expense: string
  invest: string
  warning: string
  info: string
}

export const palettes: Record<Scheme, Palette> = {
  light: {
    background: "#F4F6FA",
    surface: "#FFFFFF",
    surface2: "#EEF2F7",
    border: "#E2E8F0",
    foreground: "#0D1B36",
    muted: "#5A6781",
    accent: "#1D4FC4",
    accentSoft: "#1D4FC4",
    onAccent: "#FFFFFF",
    teal: "#0E9C9C",
    income: "#0A7A45",
    expense: "#C8283F",
    invest: "#6B46E0",
    warning: "#A34A06",
    info: "#0A6FB0",
  },
  dark: {
    background: "#0A1122",
    surface: "#111A2F",
    surface2: "#182440",
    border: "#223153",
    foreground: "#EEF2FA",
    muted: "#97A3BC",
    accent: "#3565DB",
    accentSoft: "#86A8FF",
    onAccent: "#FFFFFF",
    teal: "#2CC5C5",
    income: "#3DD68C",
    expense: "#FF6B7F",
    invest: "#A98BFF",
    warning: "#F5B544",
    info: "#4FC3F7",
  },
}

/** Gradiente da sigla — só em peças decorativas (logo, botão "+"), nunca atrás de texto pequeno. */
export const brandGradient = ["#1D4FC4", "#0FA3A3"] as const

/** Versão mais profunda do gradiente, para superfícies com texto branco (cartão de saldo). */
export const heroGradient = ["#1D4FC4", "#0B6E80"] as const

/** Cores do logotipo em texto ("nex" + "finance"), ajustadas a cada fundo (texto grande: ≥ 3:1). */
export const wordmarkColors: Record<Scheme, { nex: string; finance: string }> = {
  light: { nex: "#1B2A5C", finance: "#1592C4" },
  dark: { nex: "#EEF2FA", finance: "#4CC3F0" },
}

/** Texto sobre o heroGradient: branco (≥ 5.9:1) e secundário (≥ 4.5:1). */
export const onHero = { primary: "#FFFFFF", secondary: "#D6E4F5" } as const

// Cores dos gráficos — validadas com o validador de paletas (daltonismo + contraste):
// categorias em ordem fixa (nunca cicladas) e o par Receitas × Despesas com
// claridades bem diferentes para continuar distinguível em protanopia/deuteranopia.
export const chartColors: Record<Scheme, { categorical: readonly string[]; income: string; expense: string; trend: string }> = {
  light: {
    categorical: ["#1D4FC4", "#EB6834", "#1BAF7A", "#EDA100", "#E87BA4", "#008300"],
    income: "#00672B",
    expense: "#EE6D6C",
    trend: "#1D4FC4",
  },
  dark: {
    categorical: ["#3987E5", "#D95926", "#199E70", "#C98500", "#D55181", "#008300"],
    income: "#1BAF7A",
    expense: "#C9403F",
    trend: "#86A8FF",
  },
}

// Elevação (boxShadow, suportado no nativo e na web). No escuro a separação vem
// da borda — sombra não aparece sobre fundo escuro, só suja.
export const shadows: Record<Scheme, { card?: string; floating: string }> = {
  light: {
    card: "0 1px 2px rgba(13, 27, 54, 0.04), 0 6px 16px rgba(13, 27, 54, 0.05)",
    floating: "0 12px 32px rgba(13, 27, 54, 0.14)",
  },
  dark: {
    floating: "0 12px 32px rgba(0, 0, 0, 0.45)",
  },
}

/** "#RRGGBB" + alpha (0–1) → "#RRGGBBAA". */
export function withAlpha(hex: string, alpha: number): string {
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255)
  return `${hex.slice(0, 7)}${a.toString(16).padStart(2, "0")}`
}

/** "#RRGGBB" → "R G B" (formato das variáveis CSS do Tailwind). */
export function hexToRgbTriplet(hex: string): string {
  const h = hex.replace("#", "")
  return [0, 2, 4].map((i) => Number.parseInt(h.slice(i, i + 2), 16)).join(" ")
}

/** Nome do token em camelCase → nome da variável CSS ("accentSoft" → "--accent-soft"). */
export function cssVarName(token: string): string {
  return `--${token.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`
}
