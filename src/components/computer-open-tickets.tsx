import { useSuspenseQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { computerOpenTicketsOptions } from "@/lib/open-tickets";
import { STATUS_LABEL, TICKET_TYPES, type TicketStatus, type TicketType } from "@/lib/tickets";

export function ComputerOpenTickets({ computer }: { computer: string }) {
  const { data, refetch, isFetching } = useSuspenseQuery(computerOpenTicketsOptions(computer));
  if (data.failed) {
    return (
      <div role="status" className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <p className="text-muted-foreground">Não foi possível consultar os chamados deste computador.</p>
        <Button variant="outline" size="sm" disabled={isFetching} onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4" /> Tentar novamente
        </Button>
      </div>
    );
  }
  if (data.tickets.length === 0) {
    return <p role="status" className="text-sm text-muted-foreground">Nenhum chamado para este computador.</p>;
  }
  return (
    <ul className="divide-y" aria-label={`Chamados de ${computer}`}>
      {data.tickets.map((ticket) => {
        const closed = ticket.status === "resolvido" || ticket.status === "cancelado";
        return (
          <li key={ticket.number} className="py-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="break-words text-sm font-medium">
                  <span className="font-mono text-primary">#{ticket.number}</span>{" · "}
                  {TICKET_TYPES[ticket.ticket_type as TicketType]?.label ?? "Chamado Q-DAS"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(ticket.created_at).toLocaleString("pt-BR")}
                </p>
              </div>
              <span className={`text-sm ${closed ? "text-muted-foreground" : "text-primary"}`}>
                {STATUS_LABEL[ticket.status as TicketStatus] ?? ticket.status}
              </span>
            </div>
            {closed && (
              <div className="mt-2 rounded-md bg-muted p-3 text-sm">
                <p className="text-xs font-medium text-muted-foreground">Parecer do suporte</p>
                <p className="mt-1 whitespace-pre-wrap break-words">{ticket.support_notes?.trim() || "Sem parecer registrado."}</p>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
