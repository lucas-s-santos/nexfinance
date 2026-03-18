-- Link paid bills to generated expenses
-- Run in Supabase SQL Editor after the base tables already exist.

ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS bill_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'expenses_bill_id_fkey'
  ) THEN
    ALTER TABLE public.expenses
      ADD CONSTRAINT expenses_bill_id_fkey
      FOREIGN KEY (bill_id)
      REFERENCES public.bills(id)
      ON DELETE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS expenses_bill_id_unique
  ON public.expenses (bill_id)
  WHERE bill_id IS NOT NULL;

INSERT INTO public.expenses (
  user_id,
  period_id,
  name,
  value,
  date,
  category_id,
  payment_method,
  is_essential,
  bill_id
)
SELECT
  b.user_id,
  b.period_id,
  b.name,
  b.value,
  b.due_date,
  NULL,
  'debit',
  b.is_planned,
  b.id
FROM public.bills b
LEFT JOIN public.expenses e
  ON e.bill_id = b.id
WHERE b.is_paid = true
  AND e.id IS NULL;
