-- Remove audit triggers temporarily

DROP TRIGGER IF EXISTS audit_incomes_trigger ON public.incomes;
DROP TRIGGER IF EXISTS audit_expenses_trigger ON public.expenses;
DROP TRIGGER IF EXISTS audit_bills_trigger ON public.bills;
DROP TRIGGER IF EXISTS audit_reserves_trigger ON public.reserves_investments;
DROP TRIGGER IF EXISTS audit_goals_trigger ON public.financial_goals;
DROP TRIGGER IF EXISTS audit_categories_trigger ON public.categories;

-- Drop budgets trigger only if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'budgets') THEN
    DROP TRIGGER IF EXISTS audit_budgets_trigger ON public.budgets;
  END IF;
END $$;

-- Drop recurring_bills trigger only if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'recurring_bills') THEN
    DROP TRIGGER IF EXISTS audit_recurring_trigger ON public.recurring_bills;
  END IF;
END $$;

DROP FUNCTION IF EXISTS public.audit_trigger_func();
