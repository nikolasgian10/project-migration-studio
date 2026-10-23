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
