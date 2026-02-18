# Sistema de Sincronização Nubank - Guia de Uso

## O Que Foi Implementado

Um sistema completo para sincronizar o saldo do seu sistema com o saldo real da sua conta Nubank, permitindo que você acompanhe lado a lado como descrito.

## 🎯 Como Funciona

### 1. **HeroStats (Saldo Restante)**
- Agora exibe o **saldo real do Nubank** em vez do saldo calculado
- Mostra um indicador de sincronização ("Sincronizado" em verde ou "Desincronizado" em amarelo)
- Se há diferença entre o sistema e o banco, exibe um alerta informando a diferença

### 2. **Componente de Sincronização**
- Novo card que aparece logo após a seção principal
- Mostra lado a lado: **Sistema (calculado)** vs **Nubank (real)**
- Indica claramente se existe diferença e o valor dela
- Inclui dicas sobre como manter sincronizado

### 3. **Botão "Atualizar"**
- No componente de sincronização, há um botão "Atualizar"
- Clique para abrir um diálogo e inserir o saldo atual do seu Nubank
- O sistema registra a atualização com timestamp
- Mantém histórico de todas as alterações

## 📱 Fluxo de Uso

### **Primeira vez usando:**

1. Acesse a Dashboard
2. Veja o card "Sincronização Nubank" 
3. Clique no botão "Atualizar"
4. Abra seu aplicativo Nubank
5. Copie o saldo atual (ex: R$ 5.432,10)
6. Cole no diálogo de atualização
7. Clique em "Atualizar Saldo"

### **Após importar transações OFX/CSV:**

1. Importe o arquivo OFX/CSV do Nubank como faz normalmente
2. O sistema registra todas as transações
3. Abra sua conta Nubank novamente para ver o saldo atualizado
4. Clique em "Atualizar" na Dashboard
5. Insira o novo saldo
6. Agora sistema e banco estão sincronizados

## 📊 Indicadores de Status

| Status | Cor | Significado |
|--------|-----|-------------|
| **Sincronizado** | 🟢 Verde | Sistema = Banco (diferença < R$ 0,01) |
| **Diferença** | 🟡 Amarelo | Há desincronização entre sistema e banco |

## 💡 Dicas

- **Sincronize regularmente**: Sempre após importar transações do OFX
- **Verifique depósitos**: Se o banco tem mais, pode haver depósitos não registrados no sistema
- **Histórico**: O sistema mantém um histórico de todas as atualizações de saldo
- **Investimentos**: Quando você faz investimentos direto no Nubank, o saldo diminui e o sistema detecta isso automaticamente após sincronização

## 🗄️ Banco de Dados

O sistema usa as seguintes novas tabelas (criadas pelo script `010_account_balances.sql`):

```sql
-- Tabela principal: Saldo das contas
CREATE TABLE account_balances (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users,
  account_name TEXT NOT NULL (ex: "nubank", "banco_do_brasil"),
  current_balance DECIMAL(15,2),
  last_updated TIMESTAMP,
  ...)

-- Histórico de mudanças de saldo
CREATE TABLE balance_history (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  account_id UUID,
  balance_before DECIMAL(15,2),
  balance_after DECIMAL(15,2),
  reason TEXT (ex: "import", "manual_update", "expense"),
  created_at TIMESTAMP,
  ...)
```

## ⚙️ Setup (Se não tiver feito ainda)

**Importante**: Você precisa executar o script SQL no seu banco:

```bash
# No console Supabase ou psql:
-- Execute o arquivo: scripts/010_account_balances.sql
```

Isso cria as tabelas necessárias para armazenar o saldo do banco.

## 🔧 Componentes Criados/Modificados

- ✅ **hero-stats.tsx** - Agora usa `useAccountBalance` hook
- ✅ **synchronized-balance.tsx** - Novo card de sincronização
- ✅ **update-balance-dialog.tsx** - Diálogo para atualizar saldo
- ✅ **use-account-balance.ts** - Hook para gerenciar saldo do banco
- ✅ **app/dashboard/page.tsx** - Integrado tudo junto

## 🐛 Troubleshooting

### "Erro ao atualizar saldo"
- Certifique-se de que as tabelas foram criadas (execute script 010)
- Verifique sua conexão com o Supabase
- Tente novamente

### "Sempre mostra desincronizado"
- Primeiro saldo precisa de atualização manual
- Clique em "Atualizar" e insira seu saldo atual

### "Valores muito diferentes"
- Pode haver transações não importadas
- Importe novamente seu OFX/CSV do Nubank
- Depois atualize o saldo

## 📈 Próximas Features (Futuro)

- ✨ Auto-extrair saldo do arquivo OFX importado
- ✨ Reconciliação automática após importação
- ✨ Alertas se diferença persistir por dias
- ✨ Suporte para múltiplas contas bancárias

---

**Status**: ✅ Sistema pronto para usar

**Seu feedback**: O sistema está funcionando como esperado? Dúvidas? Me avise!
