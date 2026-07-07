// Edge Function: gera o rascunho de um documento (atestado, receita, pedido de
// exame ou carta de encaminhamento) a partir da anamnese de uma consulta,
// chamando a API do Claude do lado do servidor. O médico sempre revisa e edita
// antes de emitir — nada aqui é gerado como documento final.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const ANTHROPIC_MODEL = "claude-sonnet-5";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

const INSTRUCOES_POR_TIPO: Record<string, string> = {
  atestado:
    "Gere um rascunho de atestado médico simples e objetivo. Deixe um placeholder claro tipo [X dias] para o médico preencher o afastamento — nunca invente esse número. Não inclua data nem assinatura.",
  receita:
    "Gere um rascunho de receita médica: lista de medicamentos compatíveis com a hipótese diagnóstica e conduta, com posologia e duração sugeridas. Deixe claro que é um rascunho para revisão do médico antes de prescrever.",
  pedido_exame:
    "Gere um rascunho de pedido de exames complementares compatíveis com a hipótese diagnóstica e o diagnóstico diferencial, justificando brevemente cada exame solicitado.",
  carta_encaminhamento:
    "Gere um rascunho de carta de encaminhamento a um especialista adequado à hipótese diagnóstica, explicando de forma objetiva o motivo do encaminhamento e o resumo clínico relevante.",
};

Deno.serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!ANTHROPIC_API_KEY) {
    return new Response(JSON.stringify({ error: "missing_anthropic_api_key" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { consulta_id, tipo } = await req.json();
    const instrucao = INSTRUCOES_POR_TIPO[tipo];
    if (!consulta_id || !instrucao) {
      return new Response(JSON.stringify({ error: "invalid_params" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: req.headers.get("Authorization")! } },
    });

    const { data: consulta, error: consultaError } = await supabase
      .from("consultas")
      .select("pacientes(nome), anamneses(*)")
      .eq("id", consulta_id)
      .single();

    if (consultaError || !consulta || !consulta.anamneses?.[0]) {
      return new Response(JSON.stringify({ error: "anamnese_not_found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anamnese = consulta.anamneses[0];
    const resumoClinico = `Paciente: ${consulta.pacientes?.nome ?? "não identificado"}
Queixa principal: ${anamnese.queixa_principal ?? "-"}
História da doença atual: ${anamnese.historia_doenca_atual ?? "-"}
Antecedentes pessoais: ${anamnese.antecedentes_pessoais ?? "-"}
Antecedentes familiares: ${anamnese.antecedentes_familiares ?? "-"}
Exame físico: ${anamnese.exame_fisico ?? "-"}
Hipótese diagnóstica: ${anamnese.hipotese_diagnostica ?? "-"}
Diagnóstico diferencial (IA): ${anamnese.sugestao_ia_diagnostico_diferencial ?? "-"}
Conduta: ${anamnese.conduta || anamnese.sugestao_ia_conduta || "-"}`;

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 700,
        system:
          "Você redige rascunhos de documentos médicos em português (Brasil) a partir do resumo clínico fornecido. " +
          instrucao +
          " Responda APENAS com o texto do documento, sem markdown, sem comentários antes ou depois. Todo o conteúdo é um rascunho que o médico vai revisar e editar antes de emitir.",
        messages: [{ role: "user", content: resumoClinico }],
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      return new Response(JSON.stringify({ error: "anthropic_error", detail: errText }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const texto = (data.content || [])
      .filter((b: { type: string }) => b.type === "text")
      .map((b: { text: string }) => b.text)
      .join("")
      .trim();

    return new Response(JSON.stringify({ conteudo: texto }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: "unexpected_error", detail: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
