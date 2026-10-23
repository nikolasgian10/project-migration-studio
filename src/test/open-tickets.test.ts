import { describe, expect, it, vi } from "vitest";
import { computerOpenTicketsOptions } from "@/lib/open-tickets";

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc } }));

describe("consulta de chamados do computador selecionado", () => {
  it("consulta somente o computador selecionado com nome normalizado", async () => {
    rpc.mockResolvedValueOnce({ data: [{ number: 42, status: "aberto" }], error: null });
    const options = computerOpenTicketsOptions(" pc-42 ");
    const result = await (options.queryFn as () => Promise<unknown>)();
    expect(rpc).toHaveBeenCalledWith("get_computer_open_tickets", { _computer_name: "PC-42" });
    expect(options.queryKey).toEqual(["computer-open-tickets", "PC-42"]);
    expect(result).toEqual({ tickets: [{ number: 42, status: "aberto" }], failed: false });
  });
  it("diferencia falha de conexão de computador sem chamados", async () => {
    rpc.mockRejectedValueOnce(new Error("network"));
    const options = computerOpenTicketsOptions("PC-9");
    expect(await (options.queryFn as () => Promise<unknown>)()).toEqual({ tickets: [], failed: true });
  });
});