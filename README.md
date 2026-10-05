# NexFinance

> Sistema de gestão financeira pessoal com importação de extratos em PDF, OFX e CSV, painel de receitas e despesas, metas, reservas e relatórios.

**[Ver no ar →](https://nexfinance-ten.vercel.app)**

![Página inicial do NexFinance](docs/home.jpg)

## O problema

Quem controla as finanças em planilha precisa digitar cada lançamento à mão e montar os próprios gráficos. O NexFinance importa o extrato do banco direto (PDF, OFX ou CSV), classifica as transações automaticamente e mostra o mês inteiro em um painel, com metas e reservas no mesmo lugar.

## Destaques

- **Importação de extratos em PDF, OFX e CSV** com pré-visualização, opção de ignorar linhas e ajuste manual de descrição e categoria antes de gravar
- **Classificação automática** por entrada e saída (receita e despesa), com regras por palavra-chave
- **Categorias que aprendem com o uso:** quando você corrige a categoria de uma transação, o sistema lembra a escolha nas próximas importações
- **PWA:** instalável no celular direto pelo navegador
- **Dashboard** com resumo mensal e comparativo entre períodos
- **Relatórios** com exportação em CSV e PDF
- **Auditoria automática:** gatilhos no banco registram cada alteração
- **Isolamento por usuário** com Row Level Security no Supabase: cada pessoa só enxerga os próprios dados
- **Versão mobile** em React Native (Expo), que usa o mesmo banco

## Tecnologias

| Camada | Tecnologias |
|---|---|
| Web | Next.js 16 (App Router, Turbopack), TypeScript, Tailwind CSS, shadcn/ui, SWR |
| Backend | Supabase (Auth, Postgres, Row Level Security, gatilhos de auditoria) |
| Mobile | React Native, Expo, NativeWind |
| Deploy | Vercel |

## Como rodar localmente

```bash
pnpm install
pnpm dev
```

Acesse http://localhost:3000.

### Variáveis de ambiente

Crie um arquivo `.env.local` na raiz:

```env
NEXT_PUBLIC_SUPABASE_URL="https://SEU-PROJETO.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="SUA_ANON_KEY"
```

### Configuração do banco (Supabase)

1. Crie um projeto no Supabase.
2. Abra o SQL Editor.
3. Execute o script completo: `scripts/MASTER_COMPLETE_SETUP.sql`.
4. Em Authentication → Providers → Email, defina se o cadastro exige confirmação de e-mail.

### Build e deploy (Vercel)

1. Conecte o repositório na Vercel.
2. Configure as variáveis de ambiente (as mesmas do `.env.local`).
3. Faça o deploy.

## Scripts

| Script | O que faz |
|---|---|
| `pnpm dev` | Servidor de desenvolvimento |
| `pnpm build` | Build de produção |
| `pnpm start` | Serve o build de produção |

## Estrutura

```
app/          # Rotas e páginas (App Router)
components/   # Componentes de interface e do dashboard
lib/          # Utilitários: formatação, importação de extratos, cliente Supabase
scripts/      # SQL do banco: tabelas, perfis, auditoria, saldos
```

## Observações

- O filtro de período controla o que aparece em receitas e despesas.
- A importação grava cada transação no mês e ano em que ela aconteceu.

## Autor

Feito por **Lucas Silva dos Santos**: [portfólio](https://lucas-portfolio-opal.vercel.app) · [LinkedIn](https://www.linkedin.com/in/lucas-silva-dos-santos-31026726a) · [GitHub](https://github.com/lucas-s-santos)
