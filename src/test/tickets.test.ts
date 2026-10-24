import { describe, it, expect } from "vitest";
import { detectComputerName } from "@/lib/tickets";

describe("detectComputerName", () => {
  it("usa o ?pc= da URL", () => expect(detectComputerName("?pc=brcps-qd01", null)).toBe("BRCPS-QD01"));
  it("cai para o valor salvo", () => expect(detectComputerName("", "PC-9")).toBe("PC-9"));
  it("vazio quando não há nada", () => expect(detectComputerName("", null)).toBe(""));
});

import { isVisibleToUser as vis, SELECTABLE_STATUSES as SEL, STATUS_REQUIRES_NOTE as REQ } from "@/lib/tickets";
describe("regras de visibilidade e status", () => {
  const now = new Date("2026-10-24T12:00:00Z").getTime();
  it("resolvido some após 1 semana", () => {
    expect(vis({ status: "resolvido", updated_at: "2026-10-20T12:00:00Z" }, now)).toBe(true);
    expect(vis({ status: "cancelado", updated_at: "2026-10-16T12:00:00Z" }, now)).toBe(false);
  });
  it("aberto aparece sempre", () => {
    expect(vis({ status: "em_andamento", updated_at: "2025-01-01T00:00:00Z" }, now)).toBe(true);
  });
  it("em execução retirado e parecer obrigatório", () => {
    expect(SEL).not.toContain("em_execucao");
    expect(REQ).toEqual(["em_andamento", "resolvido", "cancelado"]);
  });
});
