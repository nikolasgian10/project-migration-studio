CREATE TABLE public.mini_fabricas (
  name text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mini_fabrica_name_valid CHECK (name = upper(btrim(name)) AND length(name) BETWEEN 1 AND 40)
);
GRANT SELECT ON public.mini_fabricas TO anon, authenticated;
GRANT INSERT ON public.mini_fabricas TO authenticated;
GRANT ALL ON public.mini_fabricas TO service_role;
ALTER TABLE public.mini_fabricas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public mini fabrica catalog" ON public.mini_fabricas FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins add mini fabricas" ON public.mini_fabricas FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
INSERT INTO public.mini_fabricas(name) SELECT DISTINCT upper(btrim(details->>'mini_fabrica')) FROM public.tickets WHERE upper(btrim(details->>'mini_fabrica')) IN ('MFAN','MFSC','MFCC','MFBL','MFBR','MFBA','MFPA') ON CONFLICT DO NOTHING;