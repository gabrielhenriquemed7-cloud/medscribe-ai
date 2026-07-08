import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import "./Anamnese.css";

const CAMPOS_MEDICO = [
  { key: "queixa_principal", label: "Queixa principal" },
  { key: "historia_doenca_atual", label: "História da doença atual" },
  { key: "antecedentes_pessoais", label: "Antecedentes pessoais" },
  { key: "antecedentes_familiares", label: "Antecedentes familiares" },
  { key: "exame_fisico", label: "Exame físico" },
  { key: "hipotese_diagnostica", label: "Hipótese diagnóstica" },
  { key: "conduta", label: "Conduta" },
];

function autoGrow(el) {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = el.scrollHeight + "px";
}

const TIPOS_DOCUMENTO = [
  { key: "atestado", label: "Atestado" },
  { key: "receita", label: "Receita" },
  { key: "pedido_exame", label: "Pedido de exame" },
  { key: "carta_encaminhamento", label: "Carta de encaminhamento" },
];

export function Anamnese() {
  const { id: consultaId } = useParams();
  const [consulta, setConsulta] = useState(null);
  const [anamnese, setAnamnese] = useState(null);
  const [transcricao, setTranscricao] = useState(null);
  const [mostrarTranscricao, setMostrarTranscricao] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [campos, setCampos] = useState({});
  const [salvando, setSalvando] = useState(false);
  const [salvoEm, setSalvoEm] = useState(null);

  useEffect(() => {
    carregar();
  }, [consultaId]);

  async function carregar() {
    setLoadError(false);
    const [{ data: consultaData, error: consultaError }, { data: anamneseData }, { data: transcricaoData }] =
      await Promise.all([
        supabase
          .from("consultas")
          .select("id, data_consulta, status, pacientes(nome), medicos(nome)")
          .eq("id", consultaId)
          .single(),
        supabase.from("anamneses").select("*").eq("consulta_id", consultaId).single(),
        supabase.from("transcricoes").select("texto_bruto").eq("consulta_id", consultaId).single(),
      ]);

    if (consultaError || !consultaData) {
      setLoadError(true);
      return;
    }
    setConsulta(consultaData);
    setAnamnese(anamneseData || null);
    setTranscricao(transcricaoData?.texto_bruto || null);
    if (anamneseData) {
      const iniciais = {};
      for (const { key } of CAMPOS_MEDICO) iniciais[key] = anamneseData[key] || "";
      setCampos(iniciais);
    }
  }

  function handleChange(key, value) {
    setCampos((c) => ({ ...c, [key]: value }));
  }

  async function salvar() {
    setSalvando(true);
    setSalvoEm(null);
    const atualizacao = { ...campos, validado_em: new Date().toISOString(), updated_at: new Date().toISOString() };
    const { error } = await supabase.from("anamneses").update(atualizacao).eq("id", anamnese.id);
    setSalvando(false);
    if (!error) {
      setAnamnese((a) => ({ ...a, ...atualizacao }));
      setSalvoEm(new Date());
    }
  }

  if (loadError) {
    return <div className="anamnese-page">Não foi possível carregar esta consulta.</div>;
  }
  if (!consulta) {
    return <div className="anamnese-page">Carregando...</div>;
  }

  return (
    <div className="anamnese-page">
      <header className="top">
        <div>
          <Link className="voltar" to="/consultas">
            ← Consultas
          </Link>
          <h1>
            {consulta.pacientes?.nome} <span>· {consulta.medicos?.nome}</span>
          </h1>
          <div className="meta">
            {new Date(consulta.data_consulta).toLocaleDateString("pt-BR")} ·{" "}
            {new Date(consulta.data_consulta).toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        </div>
        <span className="status-tag finalizada">Finalizada</span>
      </header>

      {!anamnese ? (
        <div className="empty-state">
          Esta consulta foi finalizada sem que uma anamnese tivesse sido estruturada.
        </div>
      ) : (
        <>
          <div className="grid">
            {CAMPOS_MEDICO.map(({ key, label }) => (
              <div className="field-card" key={key}>
                <div className="label">{label}</div>
                <textarea
                  ref={autoGrow}
                  rows={3}
                  placeholder={key === "conduta" ? "Descreva a conduta definida para este paciente" : ""}
                  value={campos[key] || ""}
                  onChange={(e) => {
                    handleChange(key, e.target.value);
                    autoGrow(e.target);
                  }}
                />
              </div>
            ))}
          </div>

          {(anamnese.sugestao_ia_conduta || anamnese.sugestao_ia_diagnostico_diferencial) && (
            <div className="panel ia-panel">
              <h2>
                Sugestões da IA na consulta <span className="ai-badge">IA</span>
              </h2>
              {anamnese.sugestao_ia_diagnostico_diferencial && (
                <div className="field-card readonly">
                  <div className="label">Diagnóstico diferencial</div>
                  <div className="val">{anamnese.sugestao_ia_diagnostico_diferencial}</div>
                </div>
              )}
              {anamnese.sugestao_ia_conduta && (
                <div className="field-card readonly">
                  <div className="label">Conduta sugerida</div>
                  <div className="val">{anamnese.sugestao_ia_conduta}</div>
                </div>
              )}
            </div>
          )}

          <DocumentosPanel consultaId={consultaId} />

          {transcricao && (
            <div className="panel">
              <button className="link-btn" onClick={() => setMostrarTranscricao((v) => !v)}>
                {mostrarTranscricao ? "Ocultar" : "Ver"} transcrição original da consulta
              </button>
              {mostrarTranscricao && <div className="transcricao-original">{transcricao}</div>}
            </div>
          )}

          <button className="btn-primary btn-salvar" disabled={salvando} onClick={salvar}>
            {salvando ? "Salvando..." : "Salvar alterações"}
          </button>
          {salvoEm && <div className="status-msg">Salvo às {salvoEm.toLocaleTimeString("pt-BR")}</div>}

          <div className="footnote">
            Validado pelo médico em{" "}
            {anamnese.validado_em ? new Date(anamnese.validado_em).toLocaleString("pt-BR") : "—"}. Sugestões
            marcadas com <span className="ai-badge">IA</span> foram geradas automaticamente durante a
            consulta e não são alteradas por esta tela, conforme a Resolução CFM nº 2.454/2026.
          </div>
        </>
      )}
    </div>
  );
}

function DocumentosPanel({ consultaId }) {
  const [documentos, setDocumentos] = useState(null);
  const [gerandoTipo, setGerandoTipo] = useState(null);
  const [erro, setErro] = useState("");
  const [rascunho, setRascunho] = useState(null); // { tipo, conteudo }
  const [emitindo, setEmitindo] = useState(false);

  useEffect(() => {
    carregarDocumentos();
  }, [consultaId]);

  async function carregarDocumentos() {
    const { data } = await supabase
      .from("documentos")
      .select("*")
      .eq("consulta_id", consultaId)
      .order("created_at", { ascending: false });
    setDocumentos(data || []);
  }

  async function gerar(tipo) {
    setErro("");
    setGerandoTipo(tipo);
    setRascunho(null);
    const { data, error } = await supabase.functions.invoke("gerar-documento", {
      body: { consulta_id: consultaId, tipo },
    });
    setGerandoTipo(null);
    if (error || !data?.conteudo) {
      setErro("Não foi possível gerar o rascunho. Tente novamente.");
      return;
    }
    setRascunho({ tipo, conteudo: data.conteudo });
  }

  async function emitir() {
    setEmitindo(true);
    const { error } = await supabase.from("documentos").insert({
      consulta_id: consultaId,
      tipo: rascunho.tipo,
      conteudo: rascunho.conteudo,
      emitido: true,
      emitido_em: new Date().toISOString(),
    });
    setEmitindo(false);
    if (!error) {
      setRascunho(null);
      carregarDocumentos();
    }
  }

  return (
    <div className="panel">
      <h2>Documentos</h2>

      <div className="doc-tipos">
        {TIPOS_DOCUMENTO.map(({ key, label }) => (
          <button
            key={key}
            className="btn-ghost"
            disabled={gerandoTipo !== null}
            onClick={() => gerar(key)}
          >
            {gerandoTipo === key ? "Gerando..." : `+ ${label}`}
          </button>
        ))}
      </div>

      {erro && <div className="error-msg">{erro}</div>}

      {rascunho && (
        <div className="field-card rascunho-doc">
          <div className="label">
            Rascunho: {TIPOS_DOCUMENTO.find((t) => t.key === rascunho.tipo)?.label}{" "}
            <span className="ai-badge">IA</span>
          </div>
          <textarea
            ref={autoGrow}
            rows={8}
            value={rascunho.conteudo}
            onChange={(e) => {
              setRascunho((r) => ({ ...r, conteudo: e.target.value }));
              autoGrow(e.target);
            }}
          />
          <div className="doc-actions">
            <button className="btn-ghost" onClick={() => setRascunho(null)}>
              Descartar
            </button>
            <button className="btn-primary" disabled={emitindo} onClick={emitir}>
              {emitindo ? "Emitindo..." : "Emitir documento"}
            </button>
          </div>
        </div>
      )}

      {documentos && documentos.length > 0 && (
        <div className="doc-lista">
          {documentos.map((d) => (
            <details className="field-card readonly" key={d.id}>
              <summary>
                {TIPOS_DOCUMENTO.find((t) => t.key === d.tipo)?.label || d.tipo} — emitido em{" "}
                {new Date(d.emitido_em).toLocaleString("pt-BR")}
              </summary>
              <div className="val doc-conteudo">{d.conteudo}</div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
