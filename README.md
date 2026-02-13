# NexFinance

Sistema de gestao financeira pessoal com importacao OFX/CSV, painel completo de receitas/despesas, metas, reservas e relatorios.

## Destaques
- Importacao OFX/CSV com preview, ignorar linhas e ajuste manual de descricao/categoria
- Classificacao por entrada/saida (receita/despesa) e regras por palavra-chave
- Dashboard com resumo mensal e comparativo
- Relatorios com exportacao CSV e PDF
- Auditoria automatica (logs de alteracoes)
- RLS (Row Level Security) por usuario no Supabase

## Tecnologias
- Next.js 16 (App Router, Turbopack)
- TypeScript
- Supabase (Auth + Postgres + RLS)
- Tailwind CSS + shadcn/ui
- SWR

## Como rodar local
```bash
pnpm install
pnpm dev
```

Acesse: http://localhost:3000

## Variaveis de ambiente
Crie um arquivo `.env.local` na raiz:
```env
NEXT_PUBLIC_SUPABASE_URL="https://SEU-PROJETO.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="SUA_ANON_KEY"
```

## Configuracao do banco (Supabase)
1. Crie um projeto no Supabase.
2. Abra o SQL Editor.
3. Execute o script completo: `scripts/MASTER_COMPLETE_SETUP.sql`.
4. Em Authentication > Providers > Email, defina se quer confirmar email ou nao.

## Build e deploy (Vercel)
1. Conecte o repositorio no Vercel.
2. Configure as variaveis de ambiente (as mesmas do `.env.local`).
3. Rode o deploy.

## Scripts
- `pnpm dev` - desenvolvimento
- `pnpm build` - build de producao
- `pnpm start` - iniciar build

## Estrutura
- `app/` - rotas e paginas (App Router)
- `components/` - componentes UI e dashboard
- `lib/` - utilitarios (formatacao, importacao, supabase)
- `scripts/` - SQL do banco

## Observacoes
- O filtro de periodo controla o que aparece em receitas/despesas.
- Importacao grava dados no periodo do mes/ano da transacao.

## Licenca
Uso interno / educacional.
