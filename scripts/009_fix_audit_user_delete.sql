-- Fix audit trigger to avoid errors when deleting users.
-- Run in Supabase SQL Editor.

CREATE OR REPLACE FUNCTION public.audit_trigger_func()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  IF (TG_OP = 'DELETE') THEN
    v_user_id := OLD.user_id;
  ELSE
    v_user_id := NEW.user_id;
  END IF;

  IF v_user_id IS NOT NULL THEN
    PERFORM 1 FROM auth.users WHERE id = v_user_id;
    IF NOT FOUND THEN
      -- User is being deleted; skip audit log to avoid FK violation.
      IF TG_OP = 'DELETE' THEN
        RETURN OLD;
      END IF;
      RETURN NEW;
    END IF;
  END IF;

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

GRANT EXECUTE ON FUNCTION public.audit_trigger_func() TO authenticated;
