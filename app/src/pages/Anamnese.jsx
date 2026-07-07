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
                  rows={3}
                  value={campos[key] || ""}
                  onChange={(e) => handleChange(key, e.target.value)}
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
