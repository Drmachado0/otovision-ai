
CREATE TABLE public.obra_categorias (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  nome text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone NULL
);

CREATE UNIQUE INDEX obra_categorias_user_nome_unique
  ON public.obra_categorias (user_id, lower(nome))
  WHERE deleted_at IS NULL;

ALTER TABLE public.obra_categorias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own obra_categorias"
ON public.obra_categorias
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE TRIGGER update_obra_categorias_updated_at
BEFORE UPDATE ON public.obra_categorias
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
