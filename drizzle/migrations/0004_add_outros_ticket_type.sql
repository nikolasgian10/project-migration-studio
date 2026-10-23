ALTER TABLE public.tickets DROP CONSTRAINT tickets_ticket_type_check;
ALTER TABLE public.tickets ADD CONSTRAINT tickets_ticket_type_check CHECK (ticket_type IN ('instalacao','mascara_errada','usuario_sem_acesso','criacao_usuario','outros'));
COMMENT ON CONSTRAINT tickets_ticket_type_check ON public.tickets IS 'Lista de tipos de chamado aceitos, incluindo outros';