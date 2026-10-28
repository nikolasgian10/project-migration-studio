import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { normalizeNp } from "@/lib/np";
import { getMe, login, logout, listTickets, updateTicket, listSupportUsers, createSupportUser, removeSupportUser } from "@/lib/api.functions";
import { countByMiniFabrica, DETAIL_LABEL, SELECTABLE_STATUSES, STATUS_LABEL, STATUS_REQUIRES_NOTE, TICKET_TYPES, type TicketStatus, type TicketType } from "@/lib/tickets";
import { useMiniFabricas } from "@/lib/mini-fabricas";
import { MiniFabricaManager } from "@/components/mini-fabrica-manager";
import { BrandLogos } from "@/components/brand-logos";

export const Route = createFileRoute("/suporte")({
  head: () => ({
    meta: [
      { title: "Gestão de chamados Q-DAS" },
      { name: "description", content: "Painel da equipe de suporte para gerenciar chamados Q-DAS." },
      { property: "og:title", content: "Gestão de chamados Q-DAS" },
      { property: "og:description", content: "Painel da equipe de suporte para gerenciar chamados Q-DAS." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Suporte,
});

type Ticket = {
  id: string; number: number; computer_name: string; ticket_type: string; requester_name: string | null;
  description: string | null; details: Record<string, string>; status: string; assignee: string | null;
  support_notes: string | null; created_at: string;
};

const STATUS_STYLE: Record<string, string> = {
  aberto: "bg-accent text-accent-foreground",
  em_analise: "bg-secondary text-secondary-foreground",
  em_andamento: "bg-primary text-primary-foreground",
  em_execucao: "bg-primary/80 text-primary-foreground",
  resolvido: "bg-success text-primary-foreground",
  cancelado: "bg-muted text-muted-foreground",
};

function Suporte() {
  const qc = useQueryClient();
  const { data: session, isPending } = useQuery({ queryKey: ["me"], queryFn: () => getMe() });
  if (isPending) return null;
  return (
    <div className="min-h-screen">
      <header className="header-band">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <div>
            <BrandLogos className="mb-4" />
            <p className="font-mono text-xs uppercase tracking-widest opacity-80">Q-DAS · Suporte</p>
            <h1 className="text-2xl font-semibold">Gestão de chamados</h1>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <Link to="/" className="opacity-90 hover:opacity-100">Abrir chamado</Link>
            {session && <button className="opacity-90 hover:opacity-100" onClick={async () => { await logout(); qc.setQueryData(["me"], null); }}>Sair</button>}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{session ? <Board session={session} /> : <Login onDone={() => qc.invalidateQueries({ queryKey: ["me"] })} />}</main>
    </div>
  );
}

function Login({ onDone }: { onDone: () => void }) {
  const [np, setNp] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  async function go() {
    const n = normalizeNp(np);
    if (!n) { toast.error("NP inválido."); return; }
    setBusy(true);
    try {
      const r = await login({ data: { np: n, password } });
      if (r.ok) onDone(); else toast.error("NP ou senha incorretos.");
    } catch {
      toast.error("Sem conexão com o servidor. Verifique sua rede.");
    } finally { setBusy(false); }
  }
  return (
    <form className="mx-auto max-w-sm space-y-4 rounded-lg border bg-card p-6" onSubmit={(e) => { e.preventDefault(); go(); }}>
      <h2 className="text-lg font-semibold">Entrar</h2>
      <div><Label htmlFor="np">NP</Label><Input id="np" className="mt-1 font-mono" inputMode="numeric" autoComplete="username" value={np} onChange={(e) => setNp(e.target.value)} /></div>
      <div><Label htmlFor="pw">Senha</Label><Input id="pw" className="mt-1" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
      <Button type="submit" className="w-full" disabled={busy || !np || !password}>{busy ? "Entrando..." : "Entrar"}</Button>
    </form>
  );
}

function Users({ meId }: { meId: string }) {
  const [list, setList] = useState<{ id: string; np: string; name: string; admin: boolean }[]>([]);
  const [name, setName] = useState(""); const [np, setNp] = useState(""); const [pw, setPw] = useState(""); const [admin, setAdmin] = useState(false);
  const load = useCallback(() => listSupportUsers().then(setList).catch((e) => toast.error(e.message)), []);
  useEffect(() => { load(); }, [load]);
  async function add() {
    try { await createSupportUser({ data: { name, np, password: pw, admin } }); toast.success("Usuário criado"); setName(""); setNp(""); setPw(""); setAdmin(false); load(); }
    catch (e) { toast.error((e as Error).message); }
  }
  async function remove(id: string) {
    if (!confirm("Remover este acesso?")) return;
    try { await removeSupportUser({ data: { id } }); load(); } catch (e) { toast.error((e as Error).message); }
  }
  return (
    <section className="space-y-4 rounded-lg border bg-card p-6">
      <h2 className="font-semibold">Usuários do suporte</h2>
      <div className="flex flex-wrap items-end gap-3">
        <div><Label>Nome</Label><Input className="mt-1 w-56" value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div><Label>NP</Label><Input className="mt-1 w-36 font-mono" value={np} onChange={(e) => setNp(e.target.value)} /></div>
        <div><Label>Senha</Label><Input className="mt-1 w-36" type="password" value={pw} onChange={(e) => setPw(e.target.value)} /></div>
        <label className="flex items-center gap-2 pb-2 text-sm"><input type="checkbox" checked={admin} onChange={(e) => setAdmin(e.target.checked)} /> Administrador</label>
        <Button onClick={add} disabled={!name.trim() || !np.trim() || pw.length < 4}>Criar usuário</Button>
      </div>
      <table className="w-full text-sm">
        <thead className="text-left text-muted-foreground"><tr><th className="p-2">Nome</th><th className="p-2">NP</th><th className="p-2">Perfil</th><th /></tr></thead>
        <tbody>{list.map((u) => (
          <tr key={u.id} className="border-t"><td className="p-2">{u.name || "—"}</td><td className="p-2 font-mono">{u.np}</td><td className="p-2">{u.admin ? "Administrador" : "Suporte"}</td>
            <td className="p-2 text-right">{u.id !== meId && <Button variant="outline" size="sm" onClick={() => remove(u.id)}>Remover</Button>}</td></tr>
        ))}</tbody>
      </table>
    </section>
  );
}

type Me = { id: string; np: string; name: string; admin: boolean };

function Board({ session }: { session: Me }) {
  const { data: miniFabricas = [], isError: factoriesFailed, refetch: reloadFactories } = useMiniFabricas();
  const isAdmin = session.admin;
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [status, setStatus] = useState<string>("ativos");
  const [type, setType] = useState<string>("todos");
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [mf, setMf] = useState("todas");
  const [open, setOpen] = useState<Ticket | null>(null);

  const load = useCallback(async () => {
    try { setTickets(await listTickets()); } catch (e) { toast.error((e as Error).message); }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const inPeriod = useMemo(() => {
    const start = from ? new Date(`${from}T00:00:00`).getTime() : -Infinity;
    const end = to ? new Date(`${to}T23:59:59.999`).getTime() : Infinity;
    return tickets.filter((t) => { const d = new Date(t.created_at).getTime(); return d >= start && d <= end; });
  }, [tickets, from, to]);

  /** Contagem por mini fábrica no período: não muda ao escolher uma delas. */
  const mfCounts = useMemo(() => countByMiniFabrica(inPeriod), [inPeriod]);

  const mfFiltered = useMemo(() => inPeriod.filter((t) =>
    mf === "todas" ? true : t.details?.["mini_fabrica"] === mf
  ), [inPeriod, mf]);

  const list = useMemo(() => mfFiltered.filter((t) =>
    (status === "todos" || (status === "ativos" ? !["resolvido", "cancelado"].includes(t.status) : t.status === status)) &&
    (type === "todos" || t.ticket_type === type) &&
    (!q || `${t.number} ${t.computer_name} ${t.requester_name ?? ""} ${JSON.stringify(t.details)}`.toLowerCase().includes(q.toLowerCase()))
  ), [mfFiltered, status, type, q]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    mfFiltered.forEach((t) => (c[t.status] = (c[t.status] ?? 0) + 1));
    return c;
  }, [mfFiltered]);



  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4">
        <div><Label htmlFor="from">De</Label><Input id="from" type="date" className="mt-1 w-44" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
        <div><Label htmlFor="to">Até</Label><Input id="to" type="date" className="mt-1 w-44" value={to} onChange={(e) => setTo(e.target.value)} /></div>
        <div><Label>Mini fábrica</Label><Select value={mf} onValueChange={setMf}><SelectTrigger className="mt-1 w-40" aria-label="Mini fábrica"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todas">Todas</SelectItem>{miniFabricas.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select></div>
        {factoriesFailed && <Button variant="outline" onClick={() => reloadFactories()}>Recarregar mini fábricas</Button>}
        {(from || to || mf !== "todas") && <Button variant="ghost" onClick={() => { setFrom(""); setTo(""); setMf("todas"); }}>Limpar filtros</Button>}
        <p className="pb-2 text-sm text-muted-foreground">{mfFiltered.length} chamado(s) no filtro</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {SELECTABLE_STATUSES.map((s) => (
          <button key={s} onClick={() => setStatus(s)} className={`rounded-lg border bg-card p-6 text-left ${status === s ? "ring-2 ring-primary" : ""}`}>
            <p className="text-base text-muted-foreground">{STATUS_LABEL[s]}</p>
            <p className="mt-2 font-mono text-5xl font-medium">{counts[s] ?? 0}</p>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm text-muted-foreground">Mini fábrica:</p>
        <button onClick={() => setMf("todas")} className={`rounded-full border px-3 py-1.5 text-sm ${mf === "todas" ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted"}`}>
          Todas <span className="font-mono">{inPeriod.length}</span>
        </button>
        {miniFabricas.map((m) => (
          <Button variant="outline" key={m} onClick={() => setMf(m)} className={`rounded-full border px-3 py-1.5 text-sm ${mf === m ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted"}`}>
            {m} <span className="font-mono">{mfCounts[m] ?? 0}</span>
          </Button>
        ))}
      </div>


      <div className="flex flex-wrap gap-3">
        <Input className="max-w-xs" placeholder="Buscar nº, computer name, nome..." value={q} onChange={(e) => setQ(e.target.value)} />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ativos">Abertos + andamento</SelectItem>
            <SelectItem value="todos">Todos os status</SelectItem>
            {SELECTABLE_STATUSES.map((k) => <SelectItem key={k} value={k}>{STATUS_LABEL[k]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os tipos</SelectItem>
            {Object.entries(TICKET_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={load}>Atualizar</Button>
      </div>

      <div className="overflow-hidden rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-muted-foreground">
            <tr><th className="p-3">Nº</th><th className="p-3">Computador</th><th className="p-3">Mini fábrica</th><th className="p-3">Tipo</th><th className="p-3">Solicitante</th><th className="p-3">Responsável</th><th className="p-3">Aberto em</th><th className="p-3">Status</th></tr>
          </thead>
          <tbody>
            {list.map((t) => (
              <tr key={t.id} onClick={() => setOpen(t)} className="cursor-pointer border-t hover:bg-muted/50">
                <td className="p-3 font-mono">#{t.number}</td>
                <td className="p-3 font-mono">{t.computer_name}</td>
                <td className="p-3 font-mono">{t.details?.["mini_fabrica"] ?? "—"}</td>
                <td className="p-3">{TICKET_TYPES[t.ticket_type as TicketType]?.label}</td>
                <td className="p-3">{t.requester_name ?? "—"}</td>
                <td className="p-3">{t.assignee ?? "—"}</td>
                <td className="p-3">{new Date(t.created_at).toLocaleString("pt-BR")}</td>
                <td className="p-3"><Badge className={STATUS_STYLE[t.status]}>{STATUS_LABEL[t.status as TicketStatus]}</Badge></td>
              </tr>
            ))}
            {!list.length && <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">Nenhum chamado.</td></tr>}
          </tbody>
        </table>
      </div>

      {isAdmin && <MiniFabricaManager />}
      {isAdmin && <Users meId={session.id} />}

      {open && <TicketDialog ticket={open} me={session.name || session.np} onClose={() => setOpen(null)} onSaved={() => { setOpen(null); load(); }} />}
    </div>
  );
}

function TicketDialog({ ticket, me, onClose, onSaved }: { ticket: Ticket; me: string; onClose: () => void; onSaved: () => void }) {
  const [status, setStatus] = useState(ticket.status);
  const [assignee, setAssignee] = useState(ticket.assignee ?? "");
  const [notes, setNotes] = useState(ticket.support_notes ?? "");
  const needsNote = STATUS_REQUIRES_NOTE.includes(status as TicketStatus);
  async function save() {
    if (needsNote && !notes.trim()) { toast.error("Escreva um parecer para o usuário."); return; }
    try { await updateTicket({ data: { id: ticket.id, status, assignee, notes } }); }
    catch (e) { toast.error((e as Error).message); return; }
    toast.success("Chamado atualizado");
    onSaved();
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Chamado #{ticket.number} · {TICKET_TYPES[ticket.ticket_type as TicketType]?.label}</DialogTitle></DialogHeader>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div><dt className="text-muted-foreground">Computador</dt><dd className="font-mono">{ticket.computer_name}</dd></div>
          <div><dt className="text-muted-foreground">Solicitante</dt><dd>{ticket.requester_name ?? "—"}</dd></div>
          {Object.entries(ticket.details ?? {}).map(([k, v]) => (
            <div key={k}><dt className="text-muted-foreground">{DETAIL_LABEL[k] ?? k}</dt><dd>{v}</dd></div>
          ))}
        </dl>
        {ticket.description && <p className="rounded-md bg-muted p-3 text-sm">{ticket.description}</p>}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>{SELECTABLE_STATUSES.map((k) => <SelectItem key={k} value={k}>{STATUS_LABEL[k]}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Responsável</Label>
            <div className="mt-1 flex gap-1">
              <Input value={assignee} onChange={(e) => setAssignee(e.target.value)} />
              <Button variant="outline" size="sm" className="h-9" onClick={() => setAssignee(me)}>Eu</Button>
            </div>
          </div>
        </div>
        <div><Label>Parecer para o usuário {needsNote ? "*" : "(opcional)"}</Label><Textarea className="mt-1" rows={3} value={notes} placeholder={status === "em_andamento" ? "Ex.: Aguardando chegada do cabo até dia 30/10" : ""} onChange={(e) => setNotes(e.target.value)} /></div>
        <Button onClick={save} disabled={needsNote && !notes.trim()}>Salvar</Button>
      </DialogContent>
    </Dialog>
  );
}
