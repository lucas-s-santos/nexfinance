-- Batch de importacao para rastreabilidade
CREATE TABLE IF NOT EXISTS public.import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT,
  source TEXT CHECK (source IN ('ofx', 'csv', 'pdf')),
  total_transactions INT NOT NULL DEFAULT 0,
  success_count INT NOT NULL DEFAULT 0,
  failed_count INT NOT NULL DEFAULT 0,
  imported_at TIMESTAMPTZ DEFAULT now(),
  -- Dados de cada transacao importada (permite desfazer)
  details JSONB DEFAULT '[]'::jsonb
);

-- RLS para import_batches
ALTER TABLE public.import_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "import_batches_select" ON public.import_batches FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "import_batches_insert" ON public.import_batches FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "import_batches_delete" ON public.import_batches FOR DELETE USING (auth.uid() = user_id);

-- Permitir category_id em reserves_investments
ALTER TABLE public.reserves_investments ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL;

-- Adicionar tipo "investment" para categorias (para investimentos)
-- Modifica o CHECK para aceitar 'investment' como tipo
ALTER TABLE public.categories DROP CONSTRAINT IF EXISTS categories_type_check;
ALTER TABLE public.categories ADD CONSTRAINT categories_type_check CHECK (type IN ('income', 'expense', 'reminder', 'investment'));

-- Funcao para desfazer um batch de importacao
CREATE OR REPLACE FUNCTION public.undo_import_batch(batch_id UUID)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_batch RECORD;
  v_detail RECORD;
  v_user_id UUID;
BEGIN
  SELECT * INTO v_batch FROM public.import_batches WHERE id = batch_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Batch nao encontrado';
  END IF;

  v_user_id := v_batch.user_id;

  -- Deleta transacoes pelo batch details
  FOR v_detail IN SELECT * FROM jsonb_array_elements(v_batch.details) LOOP
    CASE v_detail->>'table'
      WHEN 'incomes' THEN
        DELETE FROM public.incomes WHERE id = (v_detail->>'entity_id')::UUID AND user_id = v_user_id;
      WHEN 'expenses' THEN
        DELETE FROM public.expenses WHERE id = (v_detail->>'entity_id')::UUID AND user_id = v_user_id;
      WHEN 'reserves_investments' THEN
        DELETE FROM public.reserves_investments WHERE id = (v_detail->>'entity_id')::UUID AND user_id = v_user_id;
    END CASE;
  END LOOP;

  -- Marca o batch como desfeito (deletando o registro)
  DELETE FROM public.import_batches WHERE id = batch_id;

  RETURN true;
END;
$$;
