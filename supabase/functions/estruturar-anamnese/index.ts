// Edge Function: recebe a transcrição bruta de uma consulta e devolve os
// campos estruturados de anamnese, chamando a API do Claude do lado do
// servidor (a chave nunca fica exposta no client).

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const ANTHROPIC_MODEL = "claude-sonnet-5";

const FIELD_KEYS = [
  "queixa_principal",
  "historia_doenca_atual",
  "antecedentes_pessoais",
  "antecedentes_familiares",
  "exame_fisico",
  "hipotese_diagnostica",
  "sugestao_ia_conduta",
  "sugestao_ia_diagnostico_diferencial",
  "alertas_seguranca",
];

const SYSTEM_PROMPT = `Você é um assistente que estrutura anamneses médicas a partir de transcrições de consulta em português (Brasil).
A partir da transcrição fornecida, extraia o que for identificável para os campos: ${FIELD_KEYS.join(", ")}.
Se um campo não tiver informação suficiente ainda, omita-o do JSON.
Para o campo alertas_seguranca: preencha apenas se identificar um risco concreto e sustentado pela transcrição — por exemplo, alergia informada pelo paciente a algo mencionado na conduta, interação medicamentosa entre remédios que o paciente já usa e algo sugerido na consulta, ou contraindicação evidente entre antecedentes e a conduta discutida. Nunca invente riscos hipotéticos sem base na transcrição; se não houver risco identificável, omita este campo.
Todo conteúdo gerado é uma sugestão para revisão do médico, nunca uma conclusão definitiva.
Responda APENAS com um objeto JSON válido, sem markdown, sem texto antes ou depois.`;

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
    const { transcript } = await req.json();
    if (!transcript || typeof transcript !== "string" || !transcript.trim()) {
      return new Response(JSON.stringify({ error: "missing_transcript" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 1000,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: `Transcrição:\n${transcript}` }],
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
    const text = (data.content || [])
      .filter((b: { type: string }) => b.type === "text")
      .map((b: { text: string }) => b.text)
      .join("");
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    const fields: Record<string, string> = {};
    for (const key of FIELD_KEYS) {
      if (parsed[key]) fields[key] = parsed[key];
    }

    return new Response(JSON.stringify({ fields }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: "unexpected_error", detail: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
