/** O login é feito só com NP + senha; internamente o NP vira um identificador fixo. */
export function normalizeNp(np: string): string {
  const v = np.trim().toLowerCase();
  return /^[a-z0-9._-]{2,40}$/.test(v) ? v : "";
}

export function npToEmail(np: string): string {
  return `${normalizeNp(np)}@np.qdas.local`;
}
