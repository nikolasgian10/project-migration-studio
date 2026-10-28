import { createServerFn } from "@tanstack/react-start";
import { normalizeNp } from "./np";
import { isVisibleToUser, STATUS_REQUIRES_NOTE, SELECTABLE_STATUSES, TICKET_TYPES, type TicketStatus } from "./tickets";

const store = async () => (await import("@/server/store/index.server")).getStore();
const session = () => import("@/server/session.server");
const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/* ---------- Público (sem login) ---------- */

export const listMiniFabricas = createServerFn({ method: "GET" }).handler(async () => (await store()).listMiniFabricas());

export const createTicket = createServerFn({ method: "POST" })
  .inputValidator((d: { computer: string; type: string; requester: string; description: string; details: Record<string, string> }) => {
    const computer = str(d?.computer, 64).toUpperCase();
    if (!computer) throw new Error("Informe o computador.");
    if (!(d.type in TICKET_TYPES)) throw new Error("Tipo de chamado inválido.");
    const details = Object.fromEntries(Object.entries(d.details ?? {}).slice(0, 20).map(([k, v]) => [str(k, 40), str(v, 120)]));
    return { computer, type: d.type, requester: str(d.requester, 120), description: str(d.description, 2000), details };
  })
  .handler(async ({ data }) => {
    const s = await store();
    if (!(await s.listMiniFabricas()).includes(data.details["mini_fabrica"] ?? "")) throw new Error("Selecione uma mini fábrica válida.");
    return s.createTicket({ computer_name: data.computer, ticket_type: data.type, requester_name: data.requester || null, description: data.description || null, details: data.details });
  });

/** Só número, tipo, status, datas e parecer — sem dados pessoais. */
export const getComputerTickets = createServerFn({ method: "GET" })
  .inputValidator((d: { computer: string }) => ({ computer: str(d?.computer, 64).toUpperCase() }))
  .handler(async ({ data }) => {
    if (!data.computer) return [];
    const rows = await (await store()).ticketsByComputer(data.computer);
    const active = (t: { status: string }) => t.status !== "resolvido" && t.status !== "cancelado";
    return rows
      .filter((t) => isVisibleToUser(t))
      .sort((a, b) => Number(active(b)) - Number(active(a)) || b.created_at.localeCompare(a.created_at))
      .slice(0, 30)
      .map((t) => ({ number: t.number, ticket_type: t.ticket_type, status: t.status, created_at: t.created_at, updated_at: t.updated_at, support_notes: t.support_notes }));
  });

/* ---------- Sessão ---------- */

export const login = createServerFn({ method: "POST" })
  .inputValidator((d: { np: string; password: string }) => ({ np: normalizeNp(d?.np ?? ""), password: String(d?.password ?? "") }))
  .handler(async ({ data }) => {
    const { verifyPassword } = await import("@/server/password");
    const user = (await (await store()).listUsers()).find((u) => u.np === data.np);
    if (!user || !(await verifyPassword(data.password, user.password_hash))) return { ok: false as const };
    await (await session()).startSession(user.id);
    return { ok: true as const };
  });

export const logout = createServerFn({ method: "POST" }).handler(async () => { (await session()).endSession(); return { ok: true }; });

export const getMe = createServerFn({ method: "GET" }).handler(async () => (await session()).currentUser());

/* ---------- Suporte (com login) ---------- */

export const listTickets = createServerFn({ method: "GET" }).handler(async () => {
  await (await session()).requireUser();
  return (await store()).listTickets();
});

export const updateTicket = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; status: string; assignee: string; notes: string }) => {
    if (!SELECTABLE_STATUSES.includes(d?.status as TicketStatus)) throw new Error("Status inválido.");
    const notes = str(d.notes, 2000);
    if (STATUS_REQUIRES_NOTE.includes(d.status as TicketStatus) && !notes) throw new Error("Escreva um parecer para o usuário.");
    return { id: str(d.id, 100), status: d.status, assignee: str(d.assignee, 120) || null, notes: notes || null };
  })
  .handler(async ({ data }) => {
    await (await session()).requireUser();
    await (await store()).updateTicket(data.id, { status: data.status, assignee: data.assignee, support_notes: data.notes });
    return { ok: true };
  });

export const addMiniFabrica = createServerFn({ method: "POST" })
  .inputValidator((d: { name: string }) => {
    const name = str(d?.name, 40).toUpperCase();
    if (!name) throw new Error("Informe a mini fábrica.");
    return { name };
  })
  .handler(async ({ data }) => {
    await (await session()).requireUser(true);
    return { created: await (await store()).addMiniFabrica(data.name) };
  });

export const listSupportUsers = createServerFn({ method: "GET" }).handler(async () => {
  await (await session()).requireUser(true);
  return (await (await store()).listUsers()).map(({ id, np, name, admin }) => ({ id, np, name, admin }));
});

export const createSupportUser = createServerFn({ method: "POST" })
  .inputValidator((d: { name: string; np: string; password: string; admin: boolean }) => {
    const np = normalizeNp(d?.np ?? "");
    if (!np) throw new Error("NP inválido (use letras e números).");
    const name = str(d.name, 100);
    if (!name) throw new Error("Informe o nome.");
    if (typeof d.password !== "string" || d.password.length < 4) throw new Error("A senha deve ter pelo menos 4 caracteres.");
    return { np, name, password: d.password, admin: Boolean(d.admin) };
  })
  .handler(async ({ data }) => {
    await (await session()).requireUser(true);
    const { hashPassword } = await import("@/server/password");
    await (await store()).createUser({ np: data.np, name: data.name, admin: data.admin, password_hash: await hashPassword(data.password) });
    return { ok: true };
  });

export const removeSupportUser = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => ({ id: str(d?.id, 100) }))
  .handler(async ({ data }) => {
    const me = await (await session()).requireUser(true);
    if (me.id === data.id) throw new Error("Você não pode remover seu próprio acesso.");
    await (await store()).removeUser(data.id);
    return { ok: true };
  });
