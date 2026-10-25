import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ order: vi.fn(), select: vi.fn(), from: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: mocks.from } }));
import { miniFabricasOptions, normalizeMiniFabrica } from "@/lib/mini-fabricas";

describe("catálogo de mini fábricas", () => {
  beforeEach(() => {
    mocks.from.mockReturnValue({ select: mocks.select });
    mocks.select.mockReturnValue({ order: mocks.order });
  });
  it("inclui novas mini fábricas retornadas pelo banco", async () => {
    mocks.order.mockResolvedValue({ data: [{ name: "MFAN" }, { name: "MFNOVA" }], error: null });
    const queryFn = miniFabricasOptions.queryFn;
    if (typeof queryFn !== "function") throw new Error("Consulta ausente");
    const result = await queryFn({ queryKey: miniFabricasOptions.queryKey, signal: new AbortController().signal, meta: undefined, client: {} as never });
    expect(result).toEqual(["MFAN", "MFNOVA"]);
    expect(mocks.from).toHaveBeenCalledWith("mini_fabricas");
  });
  it("normaliza novas opções para evitar variações do mesmo cadastro", () => {
    expect(normalizeMiniFabrica("  mfNova  ")).toBe("MFNOVA");
  });
});