/** Contrato de armazenamento: o modo "local" (arquivo) e o modo "sharepoint" implementam o mesmo formato. */
export type TicketRow = {
  id: string;
  number: number;
  computer_name: string;
  ticket_type: string;
  requester_name: string | null;
  description: string | null;
  details: Record<string, string>;
  status: string;
  assignee: string | null;
  support_notes: string | null;
  created_at: string;
  updated_at: string;
};

export type NewTicket = Pick<TicketRow, "computer_name" | "ticket_type" | "requester_name" | "description" | "details">;
export type TicketPatch = Pick<TicketRow, "status" | "assignee" | "support_notes">;

export type UserRow = { id: string; np: string; name: string; admin: boolean; password_hash: string };

export interface DataStore {
  listTickets(): Promise<TicketRow[]>;
  ticketsByComputer(computer: string): Promise<TicketRow[]>;
  createTicket(t: NewTicket): Promise<number>;
  updateTicket(id: string, patch: TicketPatch): Promise<void>;
  listMiniFabricas(): Promise<string[]>;
  /** false quando já existe */
  addMiniFabrica(name: string): Promise<boolean>;
  listUsers(): Promise<UserRow[]>;
  createUser(u: Omit<UserRow, "id">): Promise<void>;
  removeUser(id: string): Promise<void>;
}
