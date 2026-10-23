CREATE OR REPLACE FUNCTION public.get_computer_open_tickets(_computer_name text)
RETURNS TABLE(number bigint, ticket_type text, status text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT t.number, t.ticket_type, t.status, t.created_at
  FROM public.tickets AS t
  WHERE length(trim(_computer_name)) BETWEEN 1 AND 64
    AND t.computer_name = upper(trim(_computer_name))
    AND t.status IN ('aberto', 'em_andamento')
  ORDER BY t.created_at DESC, t.number DESC;
$$;
REVOKE ALL ON FUNCTION public.get_computer_open_tickets(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_computer_open_tickets(text) TO anon, authenticated, service_role;
CREATE INDEX IF NOT EXISTS tickets_open_computer_idx ON public.tickets (computer_name, created_at DESC) WHERE status IN ('aberto', 'em_andamento');