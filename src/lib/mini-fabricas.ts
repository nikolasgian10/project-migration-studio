import { queryOptions, useQuery } from "@tanstack/react-query";
import { listMiniFabricas } from "@/lib/api.functions";

export function normalizeMiniFabrica(value: string) {
  return value.trim().toUpperCase();
}

export const miniFabricasOptions = queryOptions({
  queryKey: ["mini-fabricas"],
  queryFn: () => listMiniFabricas(),
  staleTime: 0,
  refetchOnWindowFocus: true,
});

export function useMiniFabricas() {
  return useQuery(miniFabricasOptions);
}
