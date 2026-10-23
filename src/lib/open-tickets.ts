import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function computerOpenTicketsOptions(computer: string) {
  const normalized = computer.trim().toUpperCase();
  return queryOptions({
    queryKey: ["computer-open-tickets", normalized],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.rpc("get_computer_open_tickets", {
          _computer_name: normalized,
        });
        return { tickets: data ?? [], failed: Boolean(error) };
      } catch {
        return { tickets: [], failed: true };
      }
    },
    staleTime: 0,
    refetchInterval: 30_000,
  });
}