// Edge Function: cria um novo membro (médico ou recepção) numa clínica.
// Roda com a service_role key (privilégio de admin), então cria a conta de
// auth diretamente com senha temporária, sem depender de e-mail de convite.
// Antes de criar, valida que quem está chamando é ADMIN da clínica alvo —
// essa checagem é feita com o token do próprio usuário (respeitando RLS),
// nunca confiando só no que veio no corpo da requisição.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "missing_auth" }, 401);

    const { clinica_id, email, senha, nome, papel, crm, uf_crm, especialidade } = await req.json();

    if (!clinica_id || !email || !senha || !nome || !papel) {
      return json({ error: "missing_params" }, 400);
    }
    if (!["medico", "recepcao"].includes(papel)) {
      return json({ error: "invalid_papel" }, 400);
    }
    if (papel === "medico" && (!crm || !uf_crm)) {
      return json({ error: "medico_requires_crm" }, 400);
    }

    // 1. Cliente com o token do chamador (respeita RLS) — confirma que ele é
    //    admin da clínica alvo.
    const asCaller = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: adminRow } = await asCaller
      .from("membros_clinica")
      .select("id")
      .eq("clinica_id", clinica_id)
      .eq("papel", "admin")
      .maybeSingle();

    // maybeSingle retorna a linha do admin só se a RLS deixar o chamador ver
    // uma linha admin dessa clínica que seja dele mesmo — reforço abaixo.
    const { data: userData } = await asCaller.auth.getUser();
    const callerId = userData?.user?.id;
    if (!callerId) return json({ error: "invalid_session" }, 401);

    const { data: souAdmin } = await asCaller
      .from("membros_clinica")
      .select("id")
      .eq("clinica_id", clinica_id)
      .eq("auth_user_id", callerId)
      .eq("papel", "admin")
      .maybeSingle();

    if (!souAdmin) return json({ error: "not_admin" }, 403);

    // 2. Cliente admin (service_role) — cria a conta e os registros.
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
    });
    if (createErr || !created?.user) {
      return json({ error: "create_user_failed", detail: createErr?.message }, 400);
    }
    const newUserId = created.user.id;

    let medicoId: string | null = null;
    if (papel === "medico") {
      const { data: medico, error: medErr } = await admin
        .from("medicos")
        .insert({ auth_user_id: newUserId, clinica_id, nome, crm, uf_crm, especialidade: especialidade || null })
        .select("id")
        .single();
      if (medErr) {
        // rollback da conta de auth pra não deixar órfã
        await admin.auth.admin.deleteUser(newUserId);
        return json({ error: "create_medico_failed", detail: medErr.message }, 400);
      }
      medicoId = medico.id;
    }

    const { error: membroErr } = await admin.from("membros_clinica").insert({
      clinica_id,
      auth_user_id: newUserId,
      papel,
      medico_id: medicoId,
      email,
    });
    if (membroErr) {
      await admin.auth.admin.deleteUser(newUserId);
      return json({ error: "create_membro_failed", detail: membroErr.message }, 400);
    }

    return json({ ok: true });
  } catch (e) {
    return json({ error: "unexpected_error", detail: String(e) }, 500);
  }
});
