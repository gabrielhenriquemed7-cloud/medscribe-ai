import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import { AppLayout } from "../components/AppLayout";
import "./Inicio.css";

const STATUS_LABEL = {
  em_andamento: "Em andamento",
  finalizada: "Finalizada",
  cancelada: "Cancelada",
};

function saudacao() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

export function Inicio() {
  const { medico } = useAuth();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState(null);
  const [agendaHoje, setAgendaHoje] = useState(null);
  const [recentes, setRecentes] = useState(null);

  useEffect(() => {
    if (medico?.clinica_id) carregar();
  }, [medico?.clinica_id]);

  async function carregar() {
    const agora = new Date();
    const inicioHoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
    const fimHoje = new Date(inicioHoje.getTime() + 24 * 60 * 60 * 1000);
    const inicioSemana = new Date(inicioHoje.getTime() - 6 * 24 * 60 * 60 * 1000);
    const clinicaId = medico.clinica_id;

    const [
      { count: hoje },
      { count: semana },
      { count: pacientes },
      { data: agenda },
      { data: recentesData },
    ] = await Promise.all([
      supabase
        .from("consultas")
        .select("id", { count: "exact", head: true })
        .eq("clinica_id", clinicaId)
        .gte("data_consulta", inicioHoje.toISOString())
        .lt("data_consulta", fimHoje.toISOString()),
      supabase
        .from("consultas")
        .select("id", { count: "exact", head: true })
        .eq("clinica_id", clinicaId)
        .gte("data_consulta", inicioSemana.toISOString()),
      supabase
        .from("pacientes")
        .select("id", { count: "exact", head: true })
        .eq("clinica_id", clinicaId),
      supabase
        .from("agendamentos")
        .select("id, data_hora, status, pacientes(id, nome), medicos(nome)")
        .eq("clinica_id", clinicaId)
        .eq("status", "agendado")
        .gte("data_hora", inicioHoje.toISOString())
        .lt("data_hora", fimHoje.toISOString())
        .order("data_hora", { ascending: true }),
      supabase
        .from("consultas")
        .select("id, data_consulta, status, consentimento_data, pacientes(id, nome), medicos(nome)")
        .eq("clinica_id", clinicaId)
        .order("data_consulta", { ascending: false })
        .limit(5),
    ]);

    const agendaList = agenda || [];
    setAgendaHoje(agendaList);
    setRecentes(recentesData || []);
    setMetrics({
      hoje: hoje ?? 0,
      semana: semana ?? 0,
      pacientes: pacientes ?? 0,
      pendencias: agendaList.length,
    });
  }

  async function iniciarConsulta(ag) {
    const { data: novaConsulta, error } = await supabase
      .from("consultas")
      .insert({
        medico_id: medico.id,
        clinica_id: medico.clinica_id,
        paciente_id: ag.pacientes.id,
        status: "em_andamento",
      })
      .select()
      .single();
    if (error) return;

    await supabase
      .from("agendamentos")
      .update({ status: "realizado", consulta_id: novaConsulta.id })
      .eq("id", ag.id);

    navigate(`/consulta/${novaConsulta.id}/consentimento`);
  }

  function abrirConsulta(c) {
    if (c.status === "finalizada") {
      navigate(`/consulta/${c.id}/anamnese`);
      return;
    }
    if (c.status !== "em_andamento") return;
    navigate(c.consentimento_data ? `/consulta/${c.id}/gravacao` : `/consulta/${c.id}/consentimento`);
  }

  return (
    <AppLayout>
      <div className="inicio-page">
        <header className="inicio-head">
          <div>
            <h1>
              {saudacao()}, <b>{medico?.nome?.split(" ")[0] || "Doutor(a)"}</b>
            </h1>
            <p className="inicio-sub">
              {new Date().toLocaleDateString("pt-BR", {
                weekday: "long",
                day: "2-digit",
                month: "long",
              })}
            </p>
          </div>
        </header>

        <div className="metric-grid">
          <MetricCard label="Consultas hoje" value={metrics?.hoje} />
          <MetricCard label="Últimos 7 dias" value={metrics?.semana} />
          <MetricCard label="Pacientes" value={metrics?.pacientes} to="/pacientes" />
          <MetricCard label="Pendências hoje" value={metrics?.pendencias} accent />
        </div>

        <section className="inicio-section">
          <div className="section-head">
            <h2>Agenda de hoje</h2>
            <Link className="section-link" to="/agenda">
              Ver agenda
            </Link>
          </div>
          {agendaHoje === null ? (
            <div className="empty-state">Carregando...</div>
          ) : agendaHoje.length === 0 ? (
            <div className="empty-state">Nenhum agendamento para hoje.</div>
          ) : (
            <div className="agenda-hoje">
              {agendaHoje.map((a) => {
                const d = new Date(a.data_hora);
                const hora = d.toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                });
                return (
                  <div className="hoje-card" key={a.id}>
                    <span className="hoje-hora">{hora}</span>
                    <div className="hoje-info">
                      <span className="hoje-nome">
                        {a.pacientes?.nome || "Paciente sem nome"}
                      </span>
                      {a.medicos?.nome && (
                        <span className="hoje-medico">{a.medicos.nome}</span>
                      )}
                    </div>
                    <button className="btn-primary" onClick={() => iniciarConsulta(a)}>
                      Iniciar
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="inicio-section">
          <div className="section-head">
            <h2>Consultas recentes</h2>
            <Link className="section-link" to="/consultas">
              Ver todas
            </Link>
          </div>
          {recentes === null ? (
            <div className="empty-state">Carregando...</div>
          ) : recentes.length === 0 ? (
            <div className="empty-state">Nenhuma consulta ainda.</div>
          ) : (
            <div>
              {recentes.map((c) => {
                const d = new Date(c.data_consulta);
                const dataFmt =
                  d.toLocaleDateString("pt-BR") +
                  " · " +
                  d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
                const clickable =
                  c.status === "em_andamento" || c.status === "finalizada";
                return (
                  <div
                    key={c.id}
                    className="consulta-card"
                    style={{ cursor: clickable ? "pointer" : "default" }}
                    onClick={() => abrirConsulta(c)}
                  >
                    <div>
                      <div className="pname">{c.pacientes?.nome || "Paciente sem nome"}</div>
                      <div className="meta">
                        {dataFmt}
                        {c.medicos?.nome && ` · ${c.medicos.nome}`}
                      </div>
                    </div>
                    <span className={`status-tag ${c.status}`}>
                      {STATUS_LABEL[c.status] || c.status}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </AppLayout>
  );
}

function MetricCard({ label, value, to, accent }) {
  const content = (
    <>
      <span className="metric-value">{value ?? "—"}</span>
      <span className="metric-label">{label}</span>
    </>
  );
  if (to) {
    return (
      <Link className={"metric-card" + (accent ? " accent" : "")} to={to}>
        {content}
      </Link>
    );
  }
  return <div className={"metric-card" + (accent ? " accent" : "")}>{content}</div>;
}
