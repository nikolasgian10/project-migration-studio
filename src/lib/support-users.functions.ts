import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { npToEmail, normalizeNp } from "./np";

type Cred = { np: string; password: string; name?: string };

function validate(d: Cred): Cred {
  const np = normalizeNp(d?.np ?? "");
  if (!np) throw new Error("NP inválido (use letras e números).");
  if (typeof d.password !== "string" || d.password.length < 8) throw new Error("A senha deve ter pelo menos 8 caracteres.");
  return { np, password: d.password, name: (d.name ?? "").slice(0, 100) };
}

async function createAccount(c: Cred, roles: ("admin" | "support")[]) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: npToEmail(c.np),
    password: c.password,
    email_confirm: true,
    user_metadata: { np: c.np, name: c.name },
  });
  if (error) throw new Error(error.message.includes("already") ? "Este NP já tem acesso." : error.message);
  await supabaseAdmin.from("user_roles").upsert(
    roles.map((role) => ({ user_id: data.user.id, role })),
    { onConflict: "user_id,role" },
  );
}

/** Só funciona enquanto não existe nenhum acesso cadastrado. */
export const hasAnyAccess = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { count } = await supabaseAdmin.from("user_roles").select("*", { count: "exact", head: true });
  return (count ?? 0) > 0;
});

export const setupFirstAdmin = createServerFn({ method: "POST" })
  .inputValidator(validate)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin.from("user_roles").select("*", { count: "exact", head: true });
    if ((count ?? 0) > 0) throw new Error("O administrador já foi configurado.");
    await createAccount(data, ["admin", "support"]);
    return { ok: true };
  });

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!data) throw new Error("Apenas administradores.");
}

export const listSupportUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id, role");
    const { data } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    return (data?.users ?? [])
      .filter((u) => roles?.some((r) => r.user_id === u.id))
      .map((u) => ({
        id: u.id,
        np: String(u.user_metadata?.["np"] ?? ""),
        name: String(u.user_metadata?.["name"] ?? ""),
        admin: !!roles?.some((r) => r.user_id === u.id && r.role === "admin"),
      }));
  });

export const createSupportUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: Cred & { admin?: boolean }) => ({ ...validate(d), admin: !!d.admin }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    await createAccount(data, data.admin ? ["admin", "support"] : ["support"]);
    return { ok: true };
  });

export const removeSupportUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => ({ id: String(d.id) }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    if (data.id === context.userId) throw new Error("Você não pode remover seu próprio acesso.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
