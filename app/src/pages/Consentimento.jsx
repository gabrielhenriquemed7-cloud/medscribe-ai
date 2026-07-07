import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import "./Consentimento.css";

export function Consentimento() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [consulta, setConsulta] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [resultado, setResultado] = useState(null); // null | true | false

  useEffect(() => {
    carregarConsulta();
  }, [id]);

  async function carregarConsulta() {
    setLoadError(false);
    const { data, error } = await supabase
      .from("consultas")
      .select("id, status, consentimento_paciente, pacientes(nome), medicos(nome)")
      .eq("id", id)
      .single();

    if (error || !data) {
      setLoadError(true);
      return;
    }
    setConsulta(data);
  }

  async function registrarConsentimento(consentiu) {
    setSaving(true);
    setSaveError("");
    const { error } = await supabase
      .from("consultas")
      .update({
        consentimento_paciente: consentiu,
        consentimento_data: new Date().toISOString(),
      })
      .eq("id", id);

    setSaving(false);
    if (error) {
      setSaveError("Não foi possível salvar. Tente novamente.");
      return;
    }
    setResultado(consentiu);
  }

  if (loadError) {
    return (
      <div className="consent-page">
        <div className="wrap">Não foi possível carregar esta consulta.</div>
      </div>
    );
  }
  if (!consulta) {
    return (
      <div className="consent-page">
        <div className="wrap">Carregando...</div>
      </div>
    );
  }

  if (resultado === true) {
    return (
      <div className="consent-page">
        <div className="result ok show">
          <div className="badge">✓</div>
          <h2>Consentimento registrado</h2>
          <p>
            Obrigado. A consulta pode começar — o médico já pode iniciar a
            gravação e transcrição.
          </p>
          <button onClick={() => navigate(`/consulta/${id}/gravacao`)}>
            Iniciar consulta
          </button>
        </div>
      </div>
    );
  }

  if (resultado === false) {
    return (
      <div className="consent-page">
        <div className="result no show">
          <div className="badge">–</div>
          <h2>Sem gravação, sem problema</h2>
          <p>
            A consulta segue normalmente. O médico fará as anotações da forma
            tradicional, sem o apoio da IA.
          </p>
          <button onClick={() => navigate("/consultas")}>
            Voltar para consultas
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="consent-page">
    <div className="wrap">
      <div className="mark">MedScribe AI</div>
      <div className="who">
        Consulta de <b>{consulta.pacientes?.nome}</b> com{" "}
        <b>{consulta.medicos?.nome}</b>
      </div>
      <h1>Antes de começarmos, precisamos da sua autorização</h1>

      <ul className="points">
        <li>
          <span className="ico">1</span>
          <span>
            Durante a consulta, uma <b>inteligência artificial vai ouvir e
            transcrever</b> a conversa entre você e o médico, só pra ajudar a
            montar o resumo da consulta.
          </span>
        </li>
        <li>
          <span className="ico">2</span>
          <span>
            O médico <b>revisa tudo</b> que a IA sugerir antes de salvar
            qualquer coisa no seu prontuário — nada é registrado
            automaticamente sem essa revisão.
          </span>
        </li>
        <li>
          <span className="ico">3</span>
          <span>
            Você pode <b>pedir para pausar ou encerrar</b> a gravação a
            qualquer momento durante a consulta, sem precisar justificar.
          </span>
        </li>
        <li>
          <span className="ico">4</span>
          <span>
            Se preferir <b>não autorizar</b>, a consulta continua normalmente
            — só que sem o apoio da IA na transcrição.
          </span>
        </li>
      </ul>

      <div className="legal">
        Esta autorização segue a Resolução CFM nº 2.454/2026 sobre uso de IA
        na prática médica e a Lei Geral de Proteção de Dados (LGPD). Seus
        dados de saúde são tratados como informação sensível e protegidos de
        acordo com a legislação.
      </div>

      <button
        id="btn-agree"
        disabled={saving}
        onClick={() => registrarConsentimento(true)}
      >
        Concordo e autorizo a gravação
      </button>
      <button
        id="btn-decline"
        disabled={saving}
        onClick={() => registrarConsentimento(false)}
      >
        Prefiro não gravar
      </button>
      <div className={`status-msg${saveError ? " error" : ""}`}>
        {saving ? "Salvando..." : saveError}
      </div>
    </div>
    </div>
  );
}
