# 🗄️ Guia Passo a Passo: Executar Script SQL no Supabase

## ⚠️ Importante

Este script PRECISA ser executado para que o sistema de sincronização funcione. Sem ele, o botão "Atualizar" não salvará o saldo no banco.

---

## 📍 Localize o Script

**Arquivo**: `scripts/010_account_balances.sql`

Ele está na raiz do seu projeto.

---

## 🌐 Método 1: Console Web do Supabase (Recomendado ⭐)

### Passo 1: Abra o Supabase

1. Vá para [supabase.com](https://supabase.com)
2. Faça login (ou crie uma conta se não tiver)
3. Localize seu projeto "nexfinance"
4. Clique para entrar no projeto

### Passo 2: Abra o SQL Editor

```
Menu esquerdo:
  ├── Project
  ├── Authentication
  ├── Database
  │   ├── Tables
  │   ├── Triggers
  │   └── Extensions
  │
  └── SQL Editor  ← CLIQUE AQUI
       ├── New Query
       ├── [Seus scripts recentes]
       └── Quick Start Queries
```

1. No menu esquerdo, localize **SQL Editor**
2. Clique em **SQL Editor**

### Passo 3: Create New Query

1. Clique no botão **"New Query"** (ou ícone + ao lado de SQL Editor)
2. Uma aba branca aparecerá para digite SQL

### Passo 4: Copie o Script

1. Abra seu editor (VS Code)
2. Abra o arquivo `scripts/010_account_balances.sql`
3. **Ctrl+A** para selecionar tudo
4. **Ctrl+C** para copiar

### Passo 5: Cole no Supabase

1. Volte para a aba do Supabase (console web)
2. A área de texto branca já deve estar em foco
3. **Ctrl+V** para colar todo o script

Seu console deve mostrar as linhas de SQL do arquivo.

### Passo 6: Execute o Script

```
Você verá:
┌─────────────────────────────────┐
│  SELECT * FROM ...              │
│  CREATE TABLE account_balances  │
│  CREATE TABLE balance_history   │
│  CREATE TABLE account_reconcil. │
│  ...                            │
│                                 │
│  [RUN] (botão azul no canto)   │
└─────────────────────────────────┘
```

1. Localize o botão **"RUN"** (azul, no canto superior direito)
2. **Clique em RUN**
3. Espere a execução (2-5 segundos)

### Passo 7: Confirme Sucesso

Se tudo correu bem, você verá:

```
✅ Success. No rows returned.
```

Se houver erro, veja a seção "❌ Troubleshooting" abaixo.

---

## 💻 Método 2: Terminal com psql

### Requisitos

- PostgreSQL instalado localmente
- Dados de conexão do Supabase

### Passo 1: Obtenha Dados de Conexão

1. No Supabase web, vá a **Settings** → **Database** → **Connection string**
2. Copie a string de conexão (parece com: `postgresql://user:password@host:5432/postgres`)

### Passo 2: Abra Terminal

```bash
# Windows: Win+R, digite "cmd"
# Mac: Cmd+Space, digite "Terminal"
# Linux: Ctrl+Alt+T
```

### Passo 3: Conecte ao Banco

```bash
psql "postgresql://user:password@host:5432/postgres"
```

**Substitua** `user`, `password`, `host` pelos valores reais da string de conexão.

### Passo 4: Execute o Script

```bash
# Dentro do psql:
\i scripts/010_account_balances.sql

# Ou (caminho absoluto):
\i /Users/seu_usuario/Desktop/nexfinance/scripts/010_account_balances.sql
```

### Passo 5: Saia do psql

```bash
\q
```

---

## 🖥️ Método 3: DBeaver ou Ambiente Similar

Se você usa um gerenciador de banco de dados visuais:

### Passo 1: Configrar Conexão

1. Abra DBeaver (ou similar)
2. Create New Database Connection
3. Tipo: PostgreSQL
4. Host/Dados: da seção Supabase (Settings → Database)
5. Teste a conexão

### Passo 2: Abra o Script

1. Arquivo → Open Script
2. Selecione `scripts/010_account_balances.sql`

### Passo 3: Execute

1. Botão **Execute Script** (ou Ctrl+Enter)
2. Escolha é para executar em qual banco (SELECT default)

---

## ✅ Verificar se Funcionou

Depois de executar em **qualquer método**, verifique assim:

### No Supabase Web Console:

```bash
# No SQL Editor, execute esta query:
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'account_%';
```

**Resultado esperado:**
```
    table_name
─────────────────────────────
account_balances
balance_history
account_reconciliation
```

Deve retornar **3 linhas**.

### Ou veja visualmente:

1. No menu esquerdo, vá a **Tables**
2. Recarregue (F5 ou botão refresh)
3. Procure por:
   - `account_balances` ✅
   - `balance_history` ✅
   - `account_reconciliation` ✅

---

## ❌ Troubleshooting

### Erro: "permission denied for schema public"

**Causa**: Usuário sem permissão de criar tabelas

**Solução**: 
- Use o usuário admin do Supabase (não custom user)
- Ou peça ao admin que execute

### Erro: "table already exists"

**Causa**: Tabelas já foram criadas antes

**Solução**:
- Não é um problema, pode prosseguir
- As tabelas já estão criadas ✅

### Erro: "syntax error at line X"

**Causa**: Script foi colado com problemas de encoding

**Solução**:
1. Abra `scripts/010_account_balances.sql` em VS Code
2. Verifique encoding (canto inferior direito: deve ser UTF-8)
3. Copie novamente e cole no Supabase

### Erro: "no password supplied"

**Causa**: String de conexão incompleta

**Solução**:
- Verifique formato completo: `postgresql://user:password@host:5432/postgres`
- user e password não podem estar vazios

---

## 🎯 Próximo Passo

Após executar com sucesso:

1. ✅ Volte ao seu projeto Next.js
2. ✅ Pare o servidor (`Ctrl+C`)
3. ✅ Rode de novo: `pnpm dev`
4. ✅ Acesse Dashboard
5. ✅ Veja o novo card "Sincronização Nubank"
6. ✅ Clique em "Atualizar" e teste!

---

## 📞 Ficou com Dúvida?

Cada método tem vantagens:

| Método | Vantagem | Desvantagem |
|--------|----------|-------------|
| **Web Console** | Mais simples, sem setup | Conexão lenta em alguns casos |
| **psql Terminal** | Mais rápido | Requer instalação |
| **DBeaver** | Interface visual | Mais pesado |

Recomendo começar com **Método 1 (Web Console)** - é o mais simples!

---

## 🔍 Se Ainda Não Funcionou

Execute **EXATAMENTE** nesta ordem:

1. **Verifique arquivo**: Abra `scripts/010_account_balances.sql` e confirme conteúdo
2. **Conecte**: Teste sua conexão Supabase (login, projeto correto)
3. **Execute**: Run do script (veja passos acima)
4. **Verifique**: Execute query de verificação
5. **Reinicie app**: Recarregue Next.js (`pnpm dev`)

Se mesmo assim não funcionar, verifique se há mensagens de erro nos logs.

---

**Está pronto!** 🎉

Após este passo, o sistema de sincronização estará **100% funcional**!
