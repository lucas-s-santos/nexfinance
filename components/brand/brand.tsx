// Marca NexFinance — igual ao app (nexfinance-mobile/src/components/brand/Brand.tsx).
import { cn } from "@/lib/utils"

/** Sigla "NF" (PNG transparente extraído da logo oficial — funciona nos dois temas). */
export function BrandMark({ size = 48, className }: { size?: number; className?: string }) {
  return (
    // biome-ignore lint: imagem estática local, não precisa do otimizador do Next
    <img src="/brand-mark.png" alt="NexFinance" width={size} height={size} className={cn("shrink-0 object-contain", className)} />
  )
}

interface WordmarkProps {
  /** Altura da sigla; o texto acompanha. */
  size?: number
  /** Mostra "Controle financeiro inteligente" abaixo. */
  tagline?: boolean
  /** Empilha sigla e nome (telas de entrada) em vez de lado a lado. */
  stacked?: boolean
  className?: string
}

// Logotipo: sigla + "nex" + "finance" em Sora, com as cores da marca ajustadas ao tema
// (a imagem original tem "nex" azul-marinho, que some no escuro).
export function Wordmark({ size = 40, tagline = false, stacked = false, className }: WordmarkProps) {
  // A sigla é mais larga que alta: empilhada, ela precisa ser maior para equilibrar o nome.
  const markSize = stacked ? Math.round(size * 1.35) : size
  const fontSize = Math.round(size * (stacked ? 0.5 : 0.58))

  return (
    <div className={cn(stacked ? "flex flex-col items-center gap-1" : "flex items-center gap-2.5", className)}>
      <BrandMark size={markSize} />
      <div className={stacked ? "flex flex-col items-center" : ""}>
        <span className="font-display font-bold" style={{ fontSize, lineHeight: 1.2, letterSpacing: "-0.02em" }}>
          <span className="text-wordmark-nex">nex</span>
          <span className="text-wordmark-finance">finance</span>
        </span>
        {tagline ? (
          <span className="block text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">Controle financeiro inteligente</span>
        ) : null}
      </div>
    </div>
  )
}
