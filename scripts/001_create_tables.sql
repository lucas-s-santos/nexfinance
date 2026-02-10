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

-- Incomes
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

-- Expenses
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

-- Reserves & Investments
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

-- Financial Goals
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

-- Enable RLS on all tables
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reserves_investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_goals ENABLE ROW LEVEL SECURITY;

-- RLS Policies: categories
CREATE POLICY "categories_select" ON public.categories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "categories_insert" ON public.categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "categories_update" ON public.categories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "categories_delete" ON public.categories FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies: financial_periods
CREATE POLICY "periods_select" ON public.financial_periods FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "periods_insert" ON public.financial_periods FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "periods_update" ON public.financial_periods FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "periods_delete" ON public.financial_periods FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies: incomes
CREATE POLICY "incomes_select" ON public.incomes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "incomes_insert" ON public.incomes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "incomes_update" ON public.incomes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "incomes_delete" ON public.incomes FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies: expenses
CREATE POLICY "expenses_select" ON public.expenses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "expenses_insert" ON public.expenses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "expenses_update" ON public.expenses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "expenses_delete" ON public.expenses FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies: bills
CREATE POLICY "bills_select" ON public.bills FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "bills_insert" ON public.bills FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "bills_update" ON public.bills FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "bills_delete" ON public.bills FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies: reserves_investments
CREATE POLICY "reserves_select" ON public.reserves_investments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "reserves_insert" ON public.reserves_investments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reserves_update" ON public.reserves_investments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "reserves_delete" ON public.reserves_investments FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies: financial_goals
CREATE POLICY "goals_select" ON public.financial_goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "goals_insert" ON public.financial_goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "goals_update" ON public.financial_goals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "goals_delete" ON public.financial_goals FOR DELETE USING (auth.uid() = user_id);
