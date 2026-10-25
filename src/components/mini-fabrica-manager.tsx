import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { normalizeMiniFabrica, miniFabricasOptions, useMiniFabricas } from "@/lib/mini-fabricas";

export function MiniFabricaManager() {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const { data: names = [] } = useMiniFabricas();
  const queryClient = useQueryClient();
  async function add() {
    const normalized = normalizeMiniFabrica(name);
    if (!normalized || normalized.length > 40 || busy) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("mini_fabricas").insert({ name: normalized });
      if (error) {
        toast.error(error.code === "23505" ? "Esta mini fábrica já está cadastrada." : "Não foi possível cadastrar a mini fábrica.");
        return;
      }
      setName("");
      await queryClient.invalidateQueries({ queryKey: miniFabricasOptions.queryKey });
      toast.success("Mini fábrica cadastrada");
    } finally { setBusy(false); }
  }
  return (
    <section className="space-y-4 border-t pt-6">
      <h2 className="font-semibold">Cadastro de mini fábricas</h2>
      <form className="flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); void add(); }}>
        <div><Label htmlFor="new-mini-fabrica">Mini fábrica</Label><Input id="new-mini-fabrica" className="mt-1 w-56 uppercase" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} required /></div>
        <Button type="submit" disabled={busy || !name.trim()}><Plus className="mr-2 h-4 w-4" />{busy ? "Adicionando..." : "Adicionar mini fábrica"}</Button>
      </form>
      <p className="text-sm font-mono text-muted-foreground">{names.join(" · ")}</p>
    </section>
  );
}