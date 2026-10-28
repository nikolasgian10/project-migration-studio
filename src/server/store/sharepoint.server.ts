import type { DataStore, TicketRow, UserRow } from "./types";

/**
 * Armazena os dados em listas do SharePoint via Microsoft Graph (conta de serviço / app registrado no Entra ID).
 * Variáveis necessárias: SHAREPOINT_TENANT_ID, SHAREPOINT_CLIENT_ID, SHAREPOINT_CLIENT_SECRET, SHAREPOINT_SITE_ID.
 * Listas (nomes podem ser trocados por variáveis): Chamados, MiniFabricas, UsuariosSuporte. Ver SHAREPOINT.md.
 */
export function createSharePointStore(): DataStore {
  const env = (k: string) => {
    const v = process.env[k];
    if (!v) throw new Error(`Configuração do SharePoint ausente: ${k}`);
    return v;
  };
  const LISTS = {
    tickets: process.env.SHAREPOINT_LIST_CHAMADOS || "Chamados",
    factories: process.env.SHAREPOINT_LIST_MINIFABRICAS || "MiniFabricas",
    users: process.env.SHAREPOINT_LIST_USUARIOS || "UsuariosSuporte",
  };
  let token: { value: string; exp: number } | null = null;

  async function getToken() {
    if (token && token.exp > Date.now() + 60_000) return token.value;
    const res = await fetch(`https://login.microsoftonline.com/${env("SHAREPOINT_TENANT_ID")}/oauth2/v2.0/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: env("SHAREPOINT_CLIENT_ID"),
        client_secret: env("SHAREPOINT_CLIENT_SECRET"),
        scope: "https://graph.microsoft.com/.default",
        grant_type: "client_credentials",
      }),
    });
    if (!res.ok) throw new Error(`Falha no login do SharePoint [${res.status}]: ${await res.text()}`);
    const j = (await res.json()) as { access_token: string; expires_in: number };
    token = { value: j.access_token, exp: Date.now() + j.expires_in * 1000 };
    return token.value;
  }

  async function graph<T>(path: string, init: RequestInit = {}): Promise<T> {
    const url = path.startsWith("https://") ? path : `https://graph.microsoft.com/v1.0/sites/${env("SHAREPOINT_SITE_ID")}${path}`;
    const res = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${await getToken()}`,
        "Content-Type": "application/json",
        Prefer: "HonorNonIndexedQueriesWarningMayFailRandomly",
        ...init.headers,
      },
    });
    if (!res.ok) throw new Error(`SharePoint [${res.status}]: ${await res.text()}`);
    return (res.status === 204 ? undefined : await res.json()) as T;
  }

  type Item = { id: string; createdDateTime: string; fields: Record<string, unknown> };
  async function items(list: string, filter?: string): Promise<Item[]> {
    const q = new URLSearchParams({ expand: "fields", $top: "999" });
    if (filter) q.set("$filter", filter);
    let next: string | undefined = `/lists/${list}/items?${q}`;
    const all: Item[] = [];
    while (next) {
      const page: { value: Item[]; "@odata.nextLink"?: string } = await graph(next);
      all.push(...page.value);
      next = page["@odata.nextLink"];
    }
    return all;
  }
  const s = (v: unknown) => (v == null || v === "" ? null : String(v));
  const esc = (v: string) => v.replace(/'/g, "''");

  function toTicket(i: Item): TicketRow {
    const f = i.fields;
    let details: Record<string, string> = {};
    try { details = JSON.parse(String(f.Detalhes || "{}")); } catch { /* campo vazio */ }
    return {
      id: i.id,
      number: Number(i.id),
      computer_name: String(f.Title ?? ""),
      ticket_type: String(f.Tipo ?? ""),
      requester_name: s(f.Solicitante),
      description: s(f.Descricao),
      details,
      status: String(f.Status ?? "aberto"),
      assignee: s(f.Responsavel),
      support_notes: s(f.Parecer),
      created_at: i.createdDateTime,
      updated_at: String(f.AtualizadoEm || i.createdDateTime),
    };
  }

  return {
    async listTickets() {
      return (await items(LISTS.tickets)).map(toTicket).sort((a, b) => b.created_at.localeCompare(a.created_at));
    },
    async ticketsByComputer(c) {
      return (await items(LISTS.tickets, `fields/Title eq '${esc(c)}'`)).map(toTicket);
    },
    async createTicket(t) {
      const item = await graph<Item>(`/lists/${LISTS.tickets}/items`, {
        method: "POST",
        body: JSON.stringify({
          fields: {
            Title: t.computer_name, Tipo: t.ticket_type, Solicitante: t.requester_name ?? "", Descricao: t.description ?? "",
            Detalhes: JSON.stringify(t.details), Status: "aberto", AtualizadoEm: new Date().toISOString(),
          },
        }),
      });
      return Number(item.id);
    },
    async updateTicket(id, p) {
      await graph(`/lists/${LISTS.tickets}/items/${encodeURIComponent(id)}/fields`, {
        method: "PATCH",
        body: JSON.stringify({ Status: p.status, Responsavel: p.assignee ?? "", Parecer: p.support_notes ?? "", AtualizadoEm: new Date().toISOString() }),
      });
    },
    async listMiniFabricas() {
      return (await items(LISTS.factories)).map((i) => String(i.fields.Title ?? "")).filter(Boolean).sort();
    },
    async addMiniFabrica(name) {
      if ((await items(LISTS.factories, `fields/Title eq '${esc(name)}'`)).length) return false;
      await graph(`/lists/${LISTS.factories}/items`, { method: "POST", body: JSON.stringify({ fields: { Title: name } }) });
      return true;
    },
    async listUsers() {
      return (await items(LISTS.users)).map<UserRow>((i) => ({
        id: i.id, name: String(i.fields.Title ?? ""), np: String(i.fields.NP ?? ""),
        admin: Boolean(i.fields.Admin), password_hash: String(i.fields.SenhaHash ?? ""),
      }));
    },
    async createUser(u) {
      if ((await items(LISTS.users, `fields/NP eq '${esc(u.np)}'`)).length) throw new Error("Este NP já tem acesso.");
      await graph(`/lists/${LISTS.users}/items`, {
        method: "POST",
        body: JSON.stringify({ fields: { Title: u.name, NP: u.np, Admin: u.admin, SenhaHash: u.password_hash } }),
      });
    },
    async removeUser(id) {
      await graph(`/lists/${LISTS.users}/items/${encodeURIComponent(id)}`, { method: "DELETE" });
    },
  };
}
