-- A interface financeira usa estas categorias canônicas mesmo quando a tabela
-- obra_categorias ainda não foi inicializada. Materializá-las mantém a validação
-- tenant-safe da API e evita que o backend aceite nomes arbitrários.
INSERT INTO public.obra_categorias (user_id, nome)
SELECT DISTINCT d.user_id, category.nome
FROM public.obra_assistant_delegations d
CROSS JOIN (
  VALUES
    ('Material'),
    ('Mão de Obra'),
    ('Equipamento'),
    ('Serviço'),
    ('Administrativo'),
    ('Transporte'),
    ('Alimentação'),
    ('Outro')
) AS category(nome)
WHERE d.enabled = true
ON CONFLICT DO NOTHING;
