ALTER TABLE public.tickets DROP CONSTRAINT IF EXISTS tickets_status_check;
ALTER TABLE public.tickets ADD CONSTRAINT tickets_status_check CHECK (status IN ('aberto','em_analise','em_andamento','em_execucao','resolvido','cancelado'));
CREATE OR REPLACE FUNCTION public.get_computer_tickets(_computer_name text)
RETURNS TABLE(number integer, ticket_type text, status text, created_at timestamptz, updated_at timestamptz, support_notes text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT t.number::integer, t.ticket_type, t.status, t.created_at, t.updated_at,
    CASE WHEN t.status IN ('em_analise','em_execucao','resolvido','cancelado') THEN t.support_notes ELSE NULL END
  FROM public.tickets t
  WHERE t.computer_name = upper(trim(_computer_name))
  ORDER BY (t.status NOT IN ('resolvido','cancelado')) DESC, t.created_at DESC
  LIMIT 30
$$;
GRANT EXECUTE ON FUNCTION public.get_computer_tickets(text) TO anon, authenticated;