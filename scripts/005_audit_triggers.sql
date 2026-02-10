-- Audit triggers for automatic logging

-- Function to log audit changes
CREATE OR REPLACE FUNCTION public.audit_trigger_func()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers for incomes
DROP TRIGGER IF EXISTS audit_incomes_trigger ON public.incomes;
CREATE TRIGGER audit_incomes_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.incomes
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- Triggers for expenses
DROP TRIGGER IF EXISTS audit_expenses_trigger ON public.expenses;
CREATE TRIGGER audit_expenses_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- Triggers for bills
DROP TRIGGER IF EXISTS audit_bills_trigger ON public.bills;
CREATE TRIGGER audit_bills_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.bills
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- Triggers for reserves_investments
DROP TRIGGER IF EXISTS audit_reserves_trigger ON public.reserves_investments;
CREATE TRIGGER audit_reserves_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.reserves_investments
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- Triggers for financial_goals
DROP TRIGGER IF EXISTS audit_goals_trigger ON public.financial_goals;
CREATE TRIGGER audit_goals_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.financial_goals
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- Triggers for categories
DROP TRIGGER IF EXISTS audit_categories_trigger ON public.categories;
CREATE TRIGGER audit_categories_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- Triggers for budgets (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'budgets') THEN
    DROP TRIGGER IF EXISTS audit_budgets_trigger ON public.budgets;
    CREATE TRIGGER audit_budgets_trigger
      AFTER INSERT OR UPDATE OR DELETE ON public.budgets
      FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();
  END IF;
END $$;

-- Triggers for recurring_bills (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'recurring_bills') THEN
    DROP TRIGGER IF EXISTS audit_recurring_trigger ON public.recurring_bills;
    CREATE TRIGGER audit_recurring_trigger
      AFTER INSERT OR UPDATE OR DELETE ON public.recurring_bills
      FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();
  END IF;
END $$;
