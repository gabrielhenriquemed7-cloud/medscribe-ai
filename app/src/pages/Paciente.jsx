import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import "./Paciente.css";

const STATUS_LABEL = {
  em_andamento: "Em andamento",
  finalizada: "Finalizada",
  cancelada: "Cancelada",
};

export function Paciente() {
  const { id: pacienteId } = useParams();
  const { medico } = useAuth();
  const navigate = useNavigate();
  const [paciente, setPaciente] = useState(null);
  const [consultas, setConsultas] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [criando, setCriando] = useState(false);

  useEffect(() => {
    carregar();
  }, [pacienteId]);

  async function carregar() {
    setLoadError(false);
    const [{ data: pacienteData, error: pacienteError }, { data: consultasData, error: consultasError }] =
      await Promise.all([
        supabase.from("pacientes").select("*").eq("id", pacienteId).single(),
        supabase
          .from("consultas")
          .select("id, data_consulta, status, consentimento_data, anamneses(queixa_principal, hipotese_diagnostica)")
          .eq("paciente_id", pacienteId)
          .order("data_consulta", { ascending: false }),
      ]);

    if (pacienteError || !pacienteData || consultasError) {
      setLoadError(true);
      return;
    }
    setPaciente(pacienteData);
    setConsultas(consultasData || []);
  }

  function abrirConsulta(c) {
    if (c.status === "finalizada") {
      navigate(`/consulta/${c.id}/anamnese`);
      return;
    }
    if (c.status !== "em_andamento") return;
    if (!c.consentimento_data) {
      navigate(`/consulta/${c.id}/consentimento`);
    } else {
      navigate(`/consulta/${c.id}/gravacao`);
    }
  }

  async function novaConsulta() {
    setCriando(true);
    const { data: novaConsulta, error } = await supabase
      .from("consultas")
      .insert({
        medico_id: medico.id,
        clinica_id: medico.clinica_id,
        paciente_id: pacienteId,
        status: "em_andamento",
      })
      .select()
      .single();
    setCriando(false);
    if (!error) navigate(`/consulta/${novaConsulta.id}/consentimento`);
  }

  if (loadError) {
    return <div className="paciente-page">Não foi possível carregar este paciente.</div>;
  }
  if (!paciente) {
    return <div className="paciente-page">Carregando...</div>;
  }

  const idade = paciente.data_nascimento
    ? Math.floor(
        (Date.now() - new Date(paciente.data_nascimento).getTime()) / (365.25 * 24 * 60 * 60 * 1000),
      )
    : null;

  return (
    <div className="paciente-page">
      <Link className="voltar" to="/consultas">
        ← Consultas
      </Link>

      <header className="top">
        <div>
          <h1>{paciente.nome}</h1>
          <div className="meta">
            {idade !== null && <span>{idade} anos</span>}
            {paciente.sexo && <span>{paciente.sexo}</span>}
            {paciente.telefone && <span>{paciente.telefone}</span>}
            {paciente.cpf && <span>CPF {paciente.cpf}</span>}
          </div>
        </div>
        <button className="btn-primary" disabled={criando} onClick={novaConsulta}>
          {criando ? "Criando..." : "+ Nova consulta"}
        </button>
      </header>

      <h2 className="section-title">Histórico de consultas</h2>

      {consultas.length === 0 ? (
        <div className="empty-state">Nenhuma consulta registrada ainda para este paciente.</div>
      ) : (
        <div>
          {consultas.map((c) => {
            const d = new Date(c.data_consulta);
            const dataFmt =
              d.toLocaleDateString("pt-BR") +
              " · " +
              d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
            const clickable = c.status === "em_andamento" || c.status === "finalizada";
            const anamnese = c.anamneses?.[0];
            return (
              <div
                key={c.id}
                className="consulta-card"
                style={{ cursor: clickable ? "pointer" : "default" }}
                onClick={() => abrirConsulta(c)}
              >
                <div>
                  <div className="meta">{dataFmt}</div>
                  {anamnese?.queixa_principal && (
                    <div className="resumo">{anamnese.queixa_principal}</div>
                  )}
                  {anamnese?.hipotese_diagnostica && (
                    <div className="resumo-sub">{anamnese.hipotese_diagnostica}</div>
                  )}
                </div>
                <span className={`status-tag ${c.status}`}>{STATUS_LABEL[c.status] || c.status}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
