-- Add market type to reserves_investments
ALTER TABLE public.reserves_investments
  DROP CONSTRAINT IF EXISTS reserves_investments_type_check;

ALTER TABLE public.reserves_investments
  ADD CONSTRAINT reserves_investments_type_check
  CHECK (type IN ('emergency', 'investment', 'market', 'goal'));
