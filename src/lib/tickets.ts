export const MINI_FABRICAS = ["MFAN", "MFSC", "MFCC", "MFBL", "MFBR", "MFBA", "MFPA"] as const;

export type TicketType = "instalacao" | "mascara_errada" | "usuario_sem_acesso" | "criacao_usuario" | "outros";
export type TicketStatus = "aberto" | "em_analise" | "em_andamento" | "em_execucao" | "resolvido" | "cancelado";

export const TICKET_TYPES: Record<TicketType, { label: string; hint: string }> = {
  instalacao: { label: "Solicitar instalação", hint: "Instalar o Q-DAS em uma máquina" },
  mascara_errada: { label: "Máscara errada", hint: "Máscara de entrada/relatório incorreta" },
  usuario_sem_acesso: { label: "Usuário específico sem acesso", hint: "Um usuário não consegue acessar" },
  criacao_usuario: { label: "Criação de usuário", hint: "Novo usuário no Q-DAS" },
  outros: { label: "Outros", hint: "Qualquer outra solicitação" },
};

export const STATUS_LABEL: Record<TicketStatus, string> = {
  aberto: "Aberto",
  em_analise: "Em análise",
  em_andamento: "Em andamento",
  em_execucao: "Em execução",
  resolvido: "Resolvido",
  cancelado: "Cancelado",
};

/** Status que o suporte pode escolher ("Em execução" foi retirado). */
export const SELECTABLE_STATUSES: TicketStatus[] = ["aberto", "em_analise", "em_andamento", "resolvido", "cancelado"];

/** Status que exigem parecer para o usuário. */
export const STATUS_REQUIRES_NOTE: TicketStatus[] = ["em_andamento", "resolvido", "cancelado"];

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Na tela do usuário: abertos sempre; resolvidos/cancelados só por 1 semana. */
export function isVisibleToUser(t: { status: string; updated_at: string }, now = Date.now()): boolean {
  if (t.status !== "resolvido" && t.status !== "cancelado") return true;
  return now - new Date(t.updated_at).getTime() <= WEEK_MS;
}

export const DETAIL_LABEL: Record<string, string> = {
  mini_fabrica: "Mini fábrica",
  computer_name_maquina: "Computer name da máquina",
  operacao: "Operação",
  bp: "BP da máquina",
  usuario: "Usuário",
  nome: "Nome",
  np: "NP",
  operacao_departamento: "Operação / Departamento",
};

/** Lê o computer name passado pelo atalho (?pc=NOME) ou o último salvo neste navegador. */
export function detectComputerName(search: string, stored: string | null): string {
  const p = new URLSearchParams(search);
  const v = p.get("pc") || p.get("computer") || p.get("computername");
  return (v || stored || "").trim().toUpperCase();
}

/** Conta chamados por mini fábrica (para a lista de contagem na gestão). */
export function countByMiniFabrica(tickets: { details?: Record<string, string> | null }[]): Record<string, number> {
  const c: Record<string, number> = {};
  for (const t of tickets) {
    const m = t.details?.["mini_fabrica"];
    if (m) c[m] = (c[m] ?? 0) + 1;
  }
  return c;
}

/** Mini fábrica fora da lista oficial (chamados antigos preenchidos à mão). */
export function isOtherMiniFabrica(details?: Record<string, string> | null): boolean {
  const m = details?.["mini_fabrica"];
  return !m || !(MINI_FABRICAS as readonly string[]).includes(m);
}


