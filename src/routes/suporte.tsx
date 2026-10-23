import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { normalizeNp, npToEmail } from "@/lib/np";
import { listSupportUsers, createSupportUser, removeSupportUser } from "@/lib/support-users.functions";
import { DETAIL_LABEL, STATUS_LABEL, TICKET_TYPES, type TicketStatus, type TicketType } from "@/lib/tickets";

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
  em_andamento: "bg-primary text-primary-foreground",
  resolvido: "bg-success text-primary-foreground",
  cancelado: "bg-muted text-muted-foreground",
};

function Suporte() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    return () => data.subscription.unsubscribe();
  }, []);
  if (!ready) return null;
  return (
    <div className="min-h-screen">
      <header className="header-band">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest opacity-80">Q-DAS · Suporte</p>
            <h1 className="text-2xl font-semibold">Gestão de chamados</h1>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <Link to="/" className="opacity-90 hover:opacity-100">Abrir chamado</Link>
            {session && <button className="opacity-90 hover:opacity-100" onClick={() => supabase.auth.signOut()}>Sair</button>}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{session ? <Board session={session} /> : <Login />}</main>
    </div>
  );
}

function Login() {
  const [np, setNp] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  async function go() {
    const n = normalizeNp(np);
    if (!n) { toast.error("NP inválido."); return; }
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: npToEmail(n), password });
    setBusy(false);
    if (error) toast.error("NP ou senha incorretos.");
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

function Board({ session }: { session: Session }) {
  const [isSupport, setIsSupport] = useState<boolean | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [status, setStatus] = useState<string>("ativos");
  const [type, setType] = useState<string>("todos");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Ticket | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from("tickets").select("*").order("created_at", { ascending: false });
    if (error) { toast.error(error.message); return; }
    setTickets((data ?? []) as Ticket[]);
  }, []);

  useEffect(() => {
    // roles and tickets load in parallel (RLS returns no tickets to non-support users)
    load();
    supabase.from("user_roles").select("role").eq("user_id", session.user.id).then(({ data }) => {
      setIsSupport(!!data?.some((r) => r.role === "support"));
      setIsAdmin(!!data?.some((r) => r.role === "admin"));
    });
  }, [session.user.id, load]);

  const list = useMemo(() => tickets.filter((t) =>
    (status === "todos" || (status === "ativos" ? ["aberto", "em_andamento"].includes(t.status) : t.status === status)) &&
    (type === "todos" || t.ticket_type === type) &&
    (!q || `${t.number} ${t.computer_name} ${t.requester_name ?? ""} ${JSON.stringify(t.details)}`.toLowerCase().includes(q.toLowerCase()))
  ), [tickets, status, type, q]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    tickets.forEach((t) => (c[t.status] = (c[t.status] ?? 0) + 1));
    return c;
  }, [tickets]);

  if (isSupport === null) return null;
  if (!isSupport) return (
    <div className="mx-auto max-w-md rounded-lg border bg-card p-6 text-center">
      <h2 className="font-semibold">Acesso restrito</h2>
      <p className="mt-2 text-sm text-muted-foreground">Sua conta ainda não tem permissão de suporte. Peça a um administrador para liberar.</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(Object.keys(STATUS_LABEL) as TicketStatus[]).map((s) => (
          <button key={s} onClick={() => setStatus(s)} className={`rounded-lg border bg-card p-4 text-left ${status === s ? "ring-2 ring-primary" : ""}`}>
            <p className="text-sm text-muted-foreground">{STATUS_LABEL[s]}</p>
            <p className="font-mono text-3xl font-medium">{counts[s] ?? 0}</p>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <Input className="max-w-xs" placeholder="Buscar nº, computer name, nome..." value={q} onChange={(e) => setQ(e.target.value)} />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ativos">Abertos + andamento</SelectItem>
            <SelectItem value="todos">Todos os status</SelectItem>
            {Object.entries(STATUS_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
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
            <tr><th className="p-3">Nº</th><th className="p-3">Computador</th><th className="p-3">Tipo</th><th className="p-3">Solicitante</th><th className="p-3">Responsável</th><th className="p-3">Aberto em</th><th className="p-3">Status</th></tr>
          </thead>
          <tbody>
            {list.map((t) => (
              <tr key={t.id} onClick={() => setOpen(t)} className="cursor-pointer border-t hover:bg-muted/50">
                <td className="p-3 font-mono">#{t.number}</td>
                <td className="p-3 font-mono">{t.computer_name}</td>
                <td className="p-3">{TICKET_TYPES[t.ticket_type as TicketType]?.label}</td>
                <td className="p-3">{t.requester_name ?? "—"}</td>
                <td className="p-3">{t.assignee ?? "—"}</td>
                <td className="p-3">{new Date(t.created_at).toLocaleString("pt-BR")}</td>
                <td className="p-3"><Badge className={STATUS_STYLE[t.status]}>{STATUS_LABEL[t.status as TicketStatus]}</Badge></td>
              </tr>
            ))}
            {!list.length && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Nenhum chamado.</td></tr>}
          </tbody>
        </table>
      </div>

      {isAdmin && <Users meId={session.user.id} />}

      {open && <TicketDialog ticket={open} me={String(session.user.user_metadata?.["name"] || session.user.user_metadata?.["np"] || "")} onClose={() => setOpen(null)} onSaved={() => { setOpen(null); load(); }} />}
    </div>
  );
}

function TicketDialog({ ticket, me, onClose, onSaved }: { ticket: Ticket; me: string; onClose: () => void; onSaved: () => void }) {
  const [status, setStatus] = useState(ticket.status);
  const [assignee, setAssignee] = useState(ticket.assignee ?? "");
  const [notes, setNotes] = useState(ticket.support_notes ?? "");
  async function save() {
    const { error } = await supabase.from("tickets").update({ status, assignee: assignee || null, support_notes: notes || null }).eq("id", ticket.id);
    if (error) { toast.error(error.message); return; }
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
              <SelectContent>{Object.entries(STATUS_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
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
        <div><Label>Notas do suporte</Label><Textarea className="mt-1" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        <Button onClick={save}>Salvar</Button>
      </DialogContent>
    </Dialog>
  );
}
