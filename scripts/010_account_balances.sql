-- Tabela para rastrear saldo de contas (Nubank, etc)
CREATE TABLE IF NOT EXISTS public.account_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_name TEXT NOT NULL CHECK (account_name IN ('nubank', 'banco_do_brasil', 'itau', 'bradesco', 'santander', 'caixa', 'outro')),
  current_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, account_name)
);

-- Tabela para histórico de saldos (auditoria)
CREATE TABLE IF NOT EXISTS public.balance_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.account_balances(id) ON DELETE CASCADE,
  balance_before NUMERIC(12,2) NOT NULL,
  balance_after NUMERIC(12,2) NOT NULL,
  transaction_id UUID REFERENCES public.expenses(id) ON DELETE SET NULL,
  reason TEXT NOT NULL, -- 'import', 'manual_update', 'expense', 'income'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela para movimento de contas (reconciliação)
CREATE TABLE IF NOT EXISTS public.account_reconciliation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_name TEXT NOT NULL,
  statement_date DATE NOT NULL,
  statement_balance NUMERIC(12,2) NOT NULL,
  system_balance NUMERIC(12,2) NOT NULL,
  difference NUMERIC(12,2),
  reconciled BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, account_name, statement_date)
);

-- Enable RLS
ALTER TABLE public.account_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.balance_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_reconciliation ENABLE ROW LEVEL SECURITY;

-- RLS Policies para account_balances
CREATE POLICY "account_balances_select" ON public.account_balances 
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "account_balances_insert" ON public.account_balances 
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "account_balances_update" ON public.account_balances 
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "account_balances_delete" ON public.account_balances 
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies para balance_history
CREATE POLICY "balance_history_select" ON public.balance_history 
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "balance_history_insert" ON public.balance_history 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies para account_reconciliation
CREATE POLICY "account_reconciliation_select" ON public.account_reconciliation 
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "account_reconciliation_insert" ON public.account_reconciliation 
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "account_reconciliation_update" ON public.account_reconciliation 
  FOR UPDATE USING (auth.uid() = user_id);

-- Índices para performance
CREATE INDEX idx_balance_history_user_id ON public.balance_history(user_id);
CREATE INDEX idx_balance_history_account_id ON public.balance_history(account_id);
CREATE INDEX idx_account_balances_user_id ON public.account_balances(user_id);
CREATE INDEX idx_reconciliation_user_id ON public.account_reconciliation(user_id);
