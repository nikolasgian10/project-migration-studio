import { deleteCookie, getCookie, setCookie } from "@tanstack/react-start/server";
import { getStore } from "./store/index.server";

const COOKIE = "qdas_sessao";
const MAX_AGE = 60 * 60 * 12; // 12 horas

const g = globalThis as { __qdasSecret?: string };
function secret() {
  // Em produção defina SESSION_SECRET; sem ela, as sessões valem até reiniciar o servidor.
  return process.env["SESSION_SECRET"] || (g.__qdasSecret ??= crypto.randomUUID() + crypto.randomUUID());
}
const enc = (s: string) => btoa(s).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
async function sign(data: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data)));
  return enc(String.fromCharCode(...sig));
}

export async function startSession(userId: string) {
  const payload = enc(JSON.stringify({ uid: userId, exp: Date.now() + MAX_AGE * 1000 }));
  setCookie(COOKIE, `${payload}.${await sign(payload)}`, { httpOnly: true, sameSite: "lax", path: "/", maxAge: MAX_AGE, secure: process.env["NODE_ENV"] === "production" && process.env["SESSION_INSECURE"] !== "1" });
}

export function endSession() {
  deleteCookie(COOKIE, { path: "/" });
}

export async function currentUser() {
  const raw = getCookie(COOKIE);
  if (!raw) return null;
  const [payload, sig] = raw.split(".");
  if (!payload || !sig || sig !== (await sign(payload))) return null;
  try {
    const { uid, exp } = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))) as { uid: string; exp: number };
    if (exp < Date.now()) return null;
    const user = (await getStore().listUsers()).find((u) => u.id === uid);
    return user ? { id: user.id, np: user.np, name: user.name, admin: user.admin } : null;
  } catch {
    return null;
  }
}

export async function requireUser(admin = false) {
  const u = await currentUser();
  if (!u) throw new Error("Sessão expirada. Entre novamente.");
  if (admin && !u.admin) throw new Error("Apenas administradores.");
  return u;
}
