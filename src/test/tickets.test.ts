import { describe, it, expect } from "vitest";
import { detectComputerName } from "@/lib/tickets";

describe("detectComputerName", () => {
  it("usa o ?pc= da URL", () => expect(detectComputerName("?pc=brcps-qd01", null)).toBe("BRCPS-QD01"));
  it("cai para o valor salvo", () => expect(detectComputerName("", "PC-9")).toBe("PC-9"));
  it("vazio quando não há nada", () => expect(detectComputerName("", null)).toBe(""));
});
