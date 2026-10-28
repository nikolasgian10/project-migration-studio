import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { DataStore, TicketRow, UserRow } from "./types";

type Db = { nextNumber: number; tickets: TicketRow[]; miniFabricas: string[]; users: UserRow[] };

const DEFAULT_FACTORIES = ["MFAN", "MFSC", "MFCC", "MFBL", "MFBR", "MFBA", "MFPA"];

/** Armazena tudo em um arquivo JSON (padrão: ./data/qdas-dados.json). Usado até o SharePoint ser conectado. */
export function createLocalStore(seedAdmin: () => Promise<Omit<UserRow, "id">>): DataStore {
  const file = resolve(process.env["QDAS_DATA_FILE"] || "data/qdas-dados.json");
  let queue: Promise<unknown> = Promise.resolve();

  async function read(): Promise<Db> {
    try {
      return JSON.parse(await readFile(file, "utf8")) as Db;
    } catch {
      const db: Db = { nextNumber: 1, tickets: [], miniFabricas: [...DEFAULT_FACTORIES], users: [{ id: crypto.randomUUID(), ...(await seedAdmin()) }] };
      await save(db);
      return db;
    }
  }
  async function save(db: Db) {
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, JSON.stringify(db, null, 2), "utf8");
  }
  /** Serializa leituras/escritas para não perder dados com envios simultâneos. */
  function tx<T>(fn: (db: Db) => T | Promise<T>, write = false): Promise<T> {
    const run = queue.then(async () => {
      const db = await read();
      const result = await fn(db);
      if (write) await save(db);
      return result;
    });
    queue = run.catch(() => undefined);
    return run;
  }

  return {
    listTickets: () => tx((db) => [...db.tickets].sort((a, b) => b.created_at.localeCompare(a.created_at))),
    ticketsByComputer: (c) => tx((db) => db.tickets.filter((t) => t.computer_name === c)),
    createTicket: (t) =>
      tx((db) => {
        const now = new Date().toISOString();
        const number = db.nextNumber++;
        db.tickets.push({ ...t, id: crypto.randomUUID(), number, status: "aberto", assignee: null, support_notes: null, created_at: now, updated_at: now });
        return number;
      }, true),
    updateTicket: (id, patch) =>
      tx((db) => {
        const t = db.tickets.find((x) => x.id === id);
        if (!t) throw new Error("Chamado não encontrado.");
        Object.assign(t, patch, { updated_at: new Date().toISOString() });
      }, true),
    listMiniFabricas: () => tx((db) => [...db.miniFabricas].sort()),
    addMiniFabrica: (name) =>
      tx((db) => {
        if (db.miniFabricas.includes(name)) return false;
        db.miniFabricas.push(name);
        return true;
      }, true),
    listUsers: () => tx((db) => db.users),
    createUser: (u) =>
      tx((db) => {
        if (db.users.some((x) => x.np === u.np)) throw new Error("Este NP já tem acesso.");
        db.users.push({ id: crypto.randomUUID(), ...u });
      }, true),
    removeUser: (id) =>
      tx((db) => {
        db.users = db.users.filter((u) => u.id !== id);
      }, true),
  };
}
