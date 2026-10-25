import { createFileRoute, Link } from "@tanstack/react-router";
import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";
import { Monitor, CheckCircle2, Headset } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TICKET_TYPES, detectComputerName, type TicketType } from "@/lib/tickets";
import { useMiniFabricas } from "@/lib/mini-fabricas";
import { ComputerOpenTickets } from "@/components/computer-open-tickets";
import { BrandLogos } from "@/components/brand-logos";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Abrir chamado Q-DAS" },
      { name: "description", content: "Abra um chamado de suporte para o sistema Q-DAS." },
      { property: "og:title", content: "Abrir chamado Q-DAS" },
      { property: "og:description", content: "Abra um chamado de suporte para o sistema Q-DAS." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

const FIELDS: Partial<Record<TicketType, { key: string; label: string }[]>> = {
  instalacao: [
    { key: "computer_name_maquina", label: "Computer name da máquina" },
    { key: "operacao", label: "Operação" },
    { key: "bp", label: "BP da máquina" },
  ],
  mascara_errada: [
    { key: "operacao", label: "Operação" },
  ],
  usuario_sem_acesso: [
    { key: "usuario", label: "Usuário (nome ou NP)" },
    { key: "operacao", label: "Operação" },
  ],
  criacao_usuario: [
    { key: "nome", label: "Nome" },
    { key: "np", label: "NP" },
    { key: "operacao_departamento", label: "Operação / Departamento" },
  ],
};

function Index() {
  const { data: miniFabricas = [], isPending: loadingFactories, isError: factoriesFailed, refetch: reloadFactories } = useMiniFabricas();
  const [detected, setDetected] = useState("");
  const [mode, setMode] = useState<"this" | "other">("this");
  const [other, setOther] = useState("");
  const [type, setType] = useState<TicketType | null>(null);
  const [details, setDetails] = useState<Record<string, string>>({});
  const [requester, setRequester] = useState("");
  const [description, setDescription] = useState("");
  const [miniFabrica, setMiniFabrica] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<number | null>(null);
  const [lookupComputer, setLookupComputer] = useState("");

  useEffect(() => {
    const name = detectComputerName(window.location.search, localStorage.getItem("qdas_pc"));
    setDetected(name);
    if (name) localStorage.setItem("qdas_pc", name);
    else setMode("other");
  }, []);

  const computer = (mode === "this" ? detected : other).trim().toUpperCase();
  useEffect(() => {
    const timer = window.setTimeout(() => setLookupComputer(computer), 350);
    return () => window.clearTimeout(timer);
  }, [computer]);
  const fields = type ? FIELDS[type] ?? [] : [];
  const needsDescription = type === "mascara_errada" || type === "outros";
  const valid = computer && type && miniFabricas.includes(miniFabrica) && fields.every((f) => details[f.key]?.trim()) && (!needsDescription || description.trim());

  async function submit() {
    if (!valid || !type) return;
    setSending(true);
    const clean = { ...Object.fromEntries(fields.map((f) => [f.key, (details[f.key] ?? "").trim()])), mini_fabrica: miniFabrica };
    const { data, error } = await supabase.rpc("create_ticket", {
      _computer_name: computer,
      _ticket_type: type,
      _requester_name: requester,
      _description: description,
      _details: clean,
    });
    setSending(false);
    if (error) { toast.error("Não foi possível abrir o chamado: " + error.message); return; }
    setDone(data as number);
  }

  function reset() {
    setDone(null); setType(null); setDetails({}); setDescription(""); setMiniFabrica("");
  }

  return (
    <div className="min-h-screen">
      <header className="header-band">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-6">
          <div>
            <BrandLogos className="mb-4" />
            <p className="font-mono text-xs uppercase tracking-widest opacity-80">Q-DAS · Suporte</p>
            <h1 className="text-2xl font-semibold">Abertura de chamado</h1>
          </div>
          <Link to="/suporte" className="flex items-center gap-2 text-sm opacity-90 hover:opacity-100">
            <Headset className="h-4 w-4" /> Área do suporte
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8">
        {done !== null ? (
          <div className="rounded-lg border bg-card p-10 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
            <h2 className="mt-4 text-xl font-semibold">Chamado aberto!</h2>
            <p className="mt-2 text-muted-foreground">Número do chamado</p>
            <p className="font-mono text-4xl font-medium text-primary">#{done}</p>
            <Button className="mt-6" onClick={reset}>Abrir outro chamado</Button>
          </div>
        ) : (
          <div className="space-y-6">
            <section className="rounded-lg border bg-card p-6">
              <h2 className="mb-4 font-semibold">1. Computador</h2>
              <RadioGroup value={mode} onValueChange={(v) => setMode(v as "this" | "other")} className="gap-3">
                <label className={`flex items-center gap-3 rounded-md border p-4 ${!detected ? "opacity-50" : "cursor-pointer"}`}>
                  <RadioGroupItem value="this" disabled={!detected} />
                  <Monitor className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Este computador</p>
                    <p className="font-mono font-medium">{detected || "Não identificado automaticamente"}</p>
                  </div>
                </label>
                <label className="flex cursor-pointer items-center gap-3 rounded-md border p-4">
                  <RadioGroupItem value="other" />
                  <span className="text-sm font-medium">Outro computador</span>
                </label>
              </RadioGroup>
              {mode === "other" && (
                <div className="mt-4">
                  <Label htmlFor="pc">Computer name</Label>
                  <Input id="pc" className="mt-1 font-mono uppercase" maxLength={64} value={other}
                    onChange={(e) => setOther(e.target.value)} placeholder="Ex.: BRCPS-QD0123" />
                </div>
              )}
            </section>

            {computer && (
              <section className="border-t pt-5" aria-labelledby="open-tickets-heading">
                <h2 id="open-tickets-heading" className="font-semibold">Chamados deste computador</h2>
                <p className="mb-2 break-all font-mono text-sm text-muted-foreground">{computer}</p>
                {lookupComputer !== computer ? (
                  <p role="status" className="text-sm text-muted-foreground">Consultando chamados...</p>
                ) : (
                  <Suspense fallback={<p role="status" className="text-sm text-muted-foreground">Consultando chamados...</p>}>
                    <ComputerOpenTickets key={computer} computer={computer} />
                  </Suspense>
                )}
              </section>
            )}

            {computer && (
              <section className="rounded-lg border bg-card p-6">
                <h2 className="mb-4 font-semibold">2. Tipo de chamado</h2>
                <Select value={type ?? ""} onValueChange={(v) => { setType(v as TicketType); setDetails({}); }}>
                  <SelectTrigger aria-label="Tipo de chamado"><SelectValue placeholder="Selecione o tipo de chamado" /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(TICKET_TYPES) as TicketType[]).map((t) => (
                      <SelectItem key={t} value={t}>{TICKET_TYPES[t].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {type && <p className="mt-2 text-sm text-muted-foreground">{TICKET_TYPES[type].hint}</p>}
              </section>
            )}

            {computer && type && (
              <section className="space-y-4 rounded-lg border bg-card p-6">
                <h2 className="font-semibold">3. Informações</h2>
                <div>
                  <Label>Mini fábrica *</Label>
                  <Select value={miniFabrica} onValueChange={setMiniFabrica}>
                    <SelectTrigger className="mt-1" aria-label="Mini fábrica" disabled={loadingFactories || factoriesFailed}><SelectValue placeholder={loadingFactories ? "Carregando..." : "Selecione a mini fábrica"} /></SelectTrigger>
                    <SelectContent>{miniFabricas.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                  </Select>
                  {factoriesFailed && <div className="mt-2 text-sm text-destructive">Não foi possível carregar as mini fábricas. <Button variant="ghost" size="sm" onClick={() => reloadFactories()}>Tentar novamente</Button></div>}
                </div>
                {fields.map((f) => (
                  <div key={f.key}>
                    <Label>{f.label} *</Label>
                    <Input className="mt-1" maxLength={120} value={details[f.key] ?? ""}
                      onChange={(e) => setDetails({ ...details, [f.key]: e.target.value })} />
                  </div>
                ))}
                <div>
                  <Label>Seu nome (solicitante)</Label>
                  <Input className="mt-1" maxLength={120} value={requester} onChange={(e) => setRequester(e.target.value)} />
                </div>
                <div>
                  <Label>Descrição {needsDescription ? "*" : "(opcional)"}</Label>
                  <Textarea className="mt-1" maxLength={2000} rows={4} value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={type === "mascara_errada" ? "Qual máscara está errada e o que deveria aparecer?" : type === "outros" ? "Descreva o que você precisa" : ""} />
                </div>
                <Button size="lg" className="w-full" disabled={!valid || sending} onClick={submit}>
                  {sending ? "Enviando..." : "Abrir chamado"}
                </Button>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
