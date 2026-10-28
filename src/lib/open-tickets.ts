import { queryOptions } from "@tanstack/react-query";
import { getComputerTickets } from "@/lib/api.functions";

export function computerOpenTicketsOptions(computer: string) {
  const normalized = computer.trim().toUpperCase();
  return queryOptions({
    queryKey: ["computer-open-tickets", normalized],
    queryFn: async () => {
      try {
        return { tickets: await getComputerTickets({ data: { computer: normalized } }), failed: false };
      } catch {
        return { tickets: [], failed: true };
      }
    },
    staleTime: 0,
    refetchInterval: 30_000,
  });
}
