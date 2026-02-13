-- ===============================================
-- NEXFINANCE - CONFIGURAÇÃO COMPLETA DO DATABASE
-- ===============================================
-- Este script contém TODAS as migrações e features
-- implementadas no sistema de gestão financeira.
-- 
-- Execute este script no Supabase SQL Editor para
-- configurar o banco de dados completo do zero.
-- 
-- AUTOR: Lucas S. Santos
-- DATA: 10/02/2026
-- VERSÃO: 1.0.0
-- ===============================================

-- ===============================================
-- PARTE 1: TABELAS BASE
-- ===============================================

-- Categories table (predefined + user custom)
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Financial periods
CREATE TABLE IF NOT EXISTS public.financial_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month INT NOT NULL CHECK (month >= 1 AND month <= 12),
  year INT NOT NULL CHECK (year >= 2000),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, month, year)
);

-- Incomes (receitas)
CREATE TABLE IF NOT EXISTS public.incomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_id UUID NOT NULL REFERENCES public.financial_periods(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  value NUMERIC(12,2) NOT NULL DEFAULT 0,
  date DATE NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Expenses (despesas)
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_id UUID NOT NULL REFERENCES public.financial_periods(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  value NUMERIC(12,2) NOT NULL DEFAULT 0,
  date DATE NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('credit', 'debit', 'voucher', 'pix', 'cash')),
  is_essential BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Bills (contas a pagar)
CREATE TABLE IF NOT EXISTS public.bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_id UUID NOT NULL REFERENCES public.financial_periods(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  value NUMERIC(12,2) NOT NULL DEFAULT 0,
  due_date DATE NOT NULL,
  is_planned BOOLEAN DEFAULT false,
  is_paid BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Reserves & Investments (reservas e investimentos)
-- Tipos: 'emergency' (reserva de emergência), 'investment' (investimentos), 
--        'market' (ações/FIIs/cripto), 'goal' (poupança para metas)
CREATE TABLE IF NOT EXISTS public.reserves_investments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('emergency', 'investment', 'market', 'goal')),
  value NUMERIC(12,2) NOT NULL DEFAULT 0,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Financial Goals (metas financeiras)
CREATE TABLE IF NOT EXISTS public.financial_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_value NUMERIC(12,2) NOT NULL DEFAULT 0,
  current_value NUMERIC(12,2) NOT NULL DEFAULT 0,
  deadline DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ===============================================
-- PARTE 2: PROFILES E ONBOARDING
-- ===============================================

-- Profiles table for onboarding
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  accent_color TEXT DEFAULT '#3b82f6',
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', null)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ===============================================
-- PARTE 3: FEATURES AVANÇADAS
-- ===============================================

-- Recurring bills (contas recorrentes)
CREATE TABLE IF NOT EXISTS public.recurring_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  value NUMERIC(12,2) NOT NULL DEFAULT 0,
  due_day INT NOT NULL CHECK (due_day >= 1 AND due_day <= 31),
  is_planned BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  last_generated_month INT,
  last_generated_year INT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Budgets per category/month (orçamentos por categoria/mês)
CREATE TABLE IF NOT EXISTS public.budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  month INT NOT NULL CHECK (month >= 1 AND month <= 12),
  year INT NOT NULL CHECK (year >= 2000),
  limit_value NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, category_id, month, year)
);

-- Notifications (notificações in-app)
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  period_id UUID REFERENCES public.financial_periods(id) ON DELETE SET NULL,
  threshold INT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, type, category_id, period_id, threshold)
);

-- Audit logs (registros de auditoria)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  action TEXT NOT NULL CHECK (action IN ('insert', 'update', 'delete')),
  changes JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ===============================================
-- PARTE 4: ROW LEVEL SECURITY (RLS)
-- ===============================================

-- Enable RLS on all tables
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reserves_investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies: categories
DROP POLICY IF EXISTS "categories_select" ON public.categories;
DROP POLICY IF EXISTS "categories_insert" ON public.categories;
DROP POLICY IF EXISTS "categories_update" ON public.categories;
DROP POLICY IF EXISTS "categories_delete" ON public.categories;
CREATE POLICY "categories_select" ON public.categories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "categories_insert" ON public.categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "categories_update" ON public.categories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "categories_delete" ON public.categories FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies: financial_periods
DROP POLICY IF EXISTS "periods_select" ON public.financial_periods;
DROP POLICY IF EXISTS "periods_insert" ON public.financial_periods;
DROP POLICY IF EXISTS "periods_update" ON public.financial_periods;
DROP POLICY IF EXISTS "periods_delete" ON public.financial_periods;
CREATE POLICY "periods_select" ON public.financial_periods FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "periods_insert" ON public.financial_periods FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "periods_update" ON public.financial_periods FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "periods_delete" ON public.financial_periods FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies: incomes
DROP POLICY IF EXISTS "incomes_select" ON public.incomes;
DROP POLICY IF EXISTS "incomes_insert" ON public.incomes;
DROP POLICY IF EXISTS "incomes_update" ON public.incomes;
DROP POLICY IF EXISTS "incomes_delete" ON public.incomes;
CREATE POLICY "incomes_select" ON public.incomes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "incomes_insert" ON public.incomes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "incomes_update" ON public.incomes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "incomes_delete" ON public.incomes FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies: expenses
DROP POLICY IF EXISTS "expenses_select" ON public.expenses;
DROP POLICY IF EXISTS "expenses_insert" ON public.expenses;
DROP POLICY IF EXISTS "expenses_update" ON public.expenses;
DROP POLICY IF EXISTS "expenses_delete" ON public.expenses;
CREATE POLICY "expenses_select" ON public.expenses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "expenses_insert" ON public.expenses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "expenses_update" ON public.expenses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "expenses_delete" ON public.expenses FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies: bills
DROP POLICY IF EXISTS "bills_select" ON public.bills;
DROP POLICY IF EXISTS "bills_insert" ON public.bills;
DROP POLICY IF EXISTS "bills_update" ON public.bills;
DROP POLICY IF EXISTS "bills_delete" ON public.bills;
CREATE POLICY "bills_select" ON public.bills FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "bills_insert" ON public.bills FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "bills_update" ON public.bills FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "bills_delete" ON public.bills FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies: reserves_investments
DROP POLICY IF EXISTS "reserves_select" ON public.reserves_investments;
DROP POLICY IF EXISTS "reserves_insert" ON public.reserves_investments;
DROP POLICY IF EXISTS "reserves_update" ON public.reserves_investments;
DROP POLICY IF EXISTS "reserves_delete" ON public.reserves_investments;
CREATE POLICY "reserves_select" ON public.reserves_investments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "reserves_insert" ON public.reserves_investments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reserves_update" ON public.reserves_investments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "reserves_delete" ON public.reserves_investments FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies: financial_goals
DROP POLICY IF EXISTS "goals_select" ON public.financial_goals;
DROP POLICY IF EXISTS "goals_insert" ON public.financial_goals;
DROP POLICY IF EXISTS "goals_update" ON public.financial_goals;
DROP POLICY IF EXISTS "goals_delete" ON public.financial_goals;
CREATE POLICY "goals_select" ON public.financial_goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "goals_insert" ON public.financial_goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "goals_update" ON public.financial_goals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "goals_delete" ON public.financial_goals FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies: profiles
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- RLS Policies: recurring_bills
DROP POLICY IF EXISTS "recurring_bills_select" ON public.recurring_bills;
DROP POLICY IF EXISTS "recurring_bills_insert" ON public.recurring_bills;
DROP POLICY IF EXISTS "recurring_bills_update" ON public.recurring_bills;
DROP POLICY IF EXISTS "recurring_bills_delete" ON public.recurring_bills;
CREATE POLICY "recurring_bills_select" ON public.recurring_bills FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "recurring_bills_insert" ON public.recurring_bills FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "recurring_bills_update" ON public.recurring_bills FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "recurring_bills_delete" ON public.recurring_bills FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies: budgets
DROP POLICY IF EXISTS "budgets_select" ON public.budgets;
DROP POLICY IF EXISTS "budgets_insert" ON public.budgets;
DROP POLICY IF EXISTS "budgets_update" ON public.budgets;
DROP POLICY IF EXISTS "budgets_delete" ON public.budgets;
CREATE POLICY "budgets_select" ON public.budgets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "budgets_insert" ON public.budgets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "budgets_update" ON public.budgets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "budgets_delete" ON public.budgets FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies: notifications
DROP POLICY IF EXISTS "notifications_select" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update" ON public.notifications;
DROP POLICY IF EXISTS "notifications_delete" ON public.notifications;
CREATE POLICY "notifications_select" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notifications_insert" ON public.notifications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "notifications_update" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "notifications_delete" ON public.notifications FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies: audit_logs
DROP POLICY IF EXISTS "audit_logs_select" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert" ON public.audit_logs;
CREATE POLICY "audit_logs_select" ON public.audit_logs 
  FOR SELECT 
  USING (auth.uid() = user_id);
CREATE POLICY "audit_logs_insert" ON public.audit_logs 
  FOR INSERT 
  WITH CHECK (true);

-- ===============================================
-- PARTE 5: SISTEMA DE AUDITORIA AUTOMÁTICA
-- ===============================================

-- Function to log audit changes (SECURITY DEFINER para bypass RLS)
CREATE OR REPLACE FUNCTION public.audit_trigger_func()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    INSERT INTO public.audit_logs (user_id, entity_type, entity_id, action, changes)
    VALUES (
      OLD.user_id,
      TG_TABLE_NAME,
      OLD.id,
      'delete',
      jsonb_build_object('old', row_to_json(OLD))
    );
    RETURN OLD;
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO public.audit_logs (user_id, entity_type, entity_id, action, changes)
    VALUES (
      NEW.user_id,
      TG_TABLE_NAME,
      NEW.id,
      'update',
      jsonb_build_object('old', row_to_json(OLD), 'new', row_to_json(NEW))
    );
    RETURN NEW;
  ELSIF (TG_OP = 'INSERT') THEN
    INSERT INTO public.audit_logs (user_id, entity_type, entity_id, action, changes)
    VALUES (
      NEW.user_id,
      TG_TABLE_NAME,
      NEW.id,
      'insert',
      jsonb_build_object('new', row_to_json(NEW))
    );
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.audit_trigger_func() TO authenticated;

-- Recreate triggers for all main tables
DROP TRIGGER IF EXISTS audit_incomes_trigger ON public.incomes;
CREATE TRIGGER audit_incomes_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.incomes
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

DROP TRIGGER IF EXISTS audit_expenses_trigger ON public.expenses;
CREATE TRIGGER audit_expenses_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

DROP TRIGGER IF EXISTS audit_bills_trigger ON public.bills;
CREATE TRIGGER audit_bills_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.bills
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

DROP TRIGGER IF EXISTS audit_reserves_trigger ON public.reserves_investments;
CREATE TRIGGER audit_reserves_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.reserves_investments
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

DROP TRIGGER IF EXISTS audit_goals_trigger ON public.financial_goals;
CREATE TRIGGER audit_goals_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.financial_goals
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

DROP TRIGGER IF EXISTS audit_categories_trigger ON public.categories;
CREATE TRIGGER audit_categories_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

DROP TRIGGER IF EXISTS audit_budgets_trigger ON public.budgets;
CREATE TRIGGER audit_budgets_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.budgets
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

DROP TRIGGER IF EXISTS audit_recurring_trigger ON public.recurring_bills;
CREATE TRIGGER audit_recurring_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.recurring_bills
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- ===============================================
-- PARTE 6: CATEGORIAS PADRÃO
-- ===============================================

-- Função para inserir categorias padrão para novos usuários
CREATE OR REPLACE FUNCTION public.create_default_categories(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Categorias de receita
  INSERT INTO public.categories (user_id, name, type) VALUES
    (p_user_id, 'Salário', 'income'),
    (p_user_id, 'Freelance', 'income'),
    (p_user_id, 'Investimentos', 'income'),
    (p_user_id, 'Outros', 'income');
  
  -- Categorias de despesa
  INSERT INTO public.categories (user_id, name, type) VALUES
    (p_user_id, 'Alimentação', 'expense'),
    (p_user_id, 'Transporte', 'expense'),
    (p_user_id, 'Moradia', 'expense'),
    (p_user_id, 'Saúde', 'expense'),
    (p_user_id, 'Educação', 'expense'),
    (p_user_id, 'Lazer', 'expense'),
    (p_user_id, 'Compras', 'expense'),
    (p_user_id, 'Outros', 'expense');
END;
$$;

-- ===============================================
-- FIM DO SCRIPT DE CONFIGURAÇÃO
-- ===============================================
-- 
-- PRÓXIMOS PASSOS:
-- 1. Execute este script no Supabase SQL Editor
-- 2. Configure as variáveis de ambiente no projeto Next.js:
--    - NEXT_PUBLIC_SUPABASE_URL
--    - NEXT_PUBLIC_SUPABASE_ANON_KEY
-- 3. Faça o deploy da aplicação
-- 
-- FEATURES IMPLEMENTADAS:
-- ✅ Sistema completo de autenticação
-- ✅ Gestão de receitas, despesas, contas e reservas
-- ✅ Metas financeiras
-- ✅ Categorias customizáveis
-- ✅ Períodos financeiros (mensal)
-- ✅ Contas recorrentes
-- ✅ Orçamentos por categoria
-- ✅ Sistema de notificações
-- ✅ Auditoria automática de todas as operações
-- ✅ Row Level Security (RLS) em todas as tabelas
-- ✅ Importação de OFX com classificação inteligente
-- ✅ Separação de investimentos (CDB/RDB vs Ações/FIIs/Cripto)
-- ✅ Validação de valores monetários
-- ✅ Validação de datas futuras
-- ✅ Dashboard com gráficos e resumos
-- 
-- ===============================================
