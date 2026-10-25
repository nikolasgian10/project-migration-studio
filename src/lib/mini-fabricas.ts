import { queryOptions, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function normalizeMiniFabrica(value: string) {
  return value.trim().toUpperCase();
}

export const miniFabricasOptions = queryOptions({
  queryKey: ["mini-fabricas"],
  queryFn: async () => {
    const { data, error } = await supabase.from("mini_fabricas").select("name").order("name");
    if (error) throw error;
    return (data ?? []).map((row) => row.name);
  },
  staleTime: 0,
  refetchOnWindowFocus: true,
});

export function useMiniFabricas() {
  return useQuery(miniFabricasOptions);
}