-- Modificar constraint de categories para aceitar "reminder"
ALTER TABLE public.categories DROP CONSTRAINT IF EXISTS categories_type_check;
ALTER TABLE public.categories ADD CONSTRAINT categories_type_check CHECK (type IN ('income', 'expense', 'reminder'));

-- Criar tabela de Lembretes (reminders)
CREATE TABLE IF NOT EXISTS public.reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ativar RLS
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

-- Criar Politicas
CREATE POLICY "reminders_select" ON public.reminders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "reminders_insert" ON public.reminders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reminders_update" ON public.reminders FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "reminders_delete" ON public.reminders FOR DELETE USING (auth.uid() = user_id);
