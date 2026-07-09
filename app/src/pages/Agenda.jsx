import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import "./Agenda.css";

const STATUS_LABEL = {
  agendado: "Agendado",
  realizado: "Realizado",
  cancelado: "Cancelado",
};

export function Agenda() {
  const { medico } = useAuth();
  const navigate = useNavigate();
  const [agendamentos, setAgendamentos] = useState(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    setLoadError(false);
    const { data, error } = await supabase
      .from("agendamentos")
      .select(
        "id, data_hora, status, observacoes, consulta_id, pacientes(id, nome), consultas(status), medicos(nome)",
      )
      .eq("clinica_id", medico.clinica_id)
      .order("data_hora", { ascending: true });

    if (error) {
      setLoadError(true);
      return;
    }
    setAgendamentos(data || []);
  }

  async function iniciarConsulta(agendamento) {
    const { data: novaConsulta, error } = await supabase
      .from("consultas")
      .insert({
        medico_id: medico.id,
        clinica_id: medico.clinica_id,
        paciente_id: agendamento.pacientes.id,
        status: "em_andamento",
      })
      .select()
      .single();
    if (error) return;

    await supabase
      .from("agendamentos")
      .update({ status: "realizado", consulta_id: novaConsulta.id })
      .eq("id", agendamento.id);

    navigate(`/consulta/${novaConsulta.id}/consentimento`);
  }

  function verConsulta(agendamento) {
    const status = agendamento.consultas?.status;
    if (status === "finalizada") {
      navigate(`/consulta/${agendamento.consulta_id}/anamnese`);
    } else if (status === "em_andamento") {
      navigate(`/consulta/${agendamento.consulta_id}/gravacao`);
    }
  }

  async function cancelar(agendamento) {
    await supabase.from("agendamentos").update({ status: "cancelado" }).eq("id", agendamento.id);
    carregar();
  }

  return (
    <div className="agenda-page">
      <header className="top">
        <div>
          <Link className="voltar" to="/consultas">
            ← Consultas
          </Link>
          <h1>Agenda</h1>
        </div>
        <NovoAgendamentoButton
          medicoId={medico.id}
          clinicaId={medico.clinica_id}
          onCriado={carregar}
        />
      </header>

      <ListaAgendamentos
        agendamentos={agendamentos}
        loadError={loadError}
        onIniciar={iniciarConsulta}
        onVer={verConsulta}
        onCancelar={cancelar}
      />
    </div>
  );
}

function ListaAgendamentos({ agendamentos, loadError, onIniciar, onVer, onCancelar }) {
  if (loadError) {
    return <div className="empty-state">Não foi possível carregar a agenda.</div>;
  }
  if (agendamentos === null) {
    return <div className="empty-state">Carregando...</div>;
  }
  if (agendamentos.length === 0) {
    return (
      <div className="empty-state">
        Nenhum agendamento ainda. Clique em "+ Novo agendamento" para começar.
      </div>
    );
  }

  return (
    <div>
      {agendamentos.map((a) => {
        const d = new Date(a.data_hora);
        const dataFmt =
          d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" }) +
          " · " +
          d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
        return (
          <div className="agendamento-card" key={a.id}>
            <div>
              <div className="data-hora">{dataFmt}</div>
              <Link className="pname-link" to={`/paciente/${a.pacientes?.id}`}>
                {a.pacientes?.nome || "Paciente sem nome"}
              </Link>
              {a.medicos?.nome && <div className="observacoes">{a.medicos.nome}</div>}
              {a.observacoes && <div className="observacoes">{a.observacoes}</div>}
            </div>
            <div className="agendamento-actions">
              <span className={`status-tag ${a.status}`}>{STATUS_LABEL[a.status] || a.status}</span>
              {a.status === "agendado" && (
                <>
                  <button className="btn-primary" onClick={() => onIniciar(a)}>
                    Iniciar consulta
                  </button>
                  <button className="btn-ghost" onClick={() => onCancelar(a)}>
                    Cancelar
                  </button>
                </>
              )}
              {a.status === "realizado" && a.consulta_id && (
                <button className="btn-ghost" onClick={() => onVer(a)}>
                  Ver consulta
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function NovoAgendamentoButton({ medicoId, clinicaId, onCriado }) {
  const [open, setOpen] = useState(false);
  const [busca, setBusca] = useState("");
  const [resultados, setResultados] = useState([]);
  const [selecionado, setSelecionado] = useState(null);
  const [dataHora, setDataHora] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [status, setStatus] = useState({ text: "", error: false });
  const [criando, setCriando] = useState(false);
  const buscaTimeout = useRef(null);

  function abrirModal() {
    setOpen(true);
    setBusca("");
    setResultados([]);
    setSelecionado(null);
    setDataHora("");
    setObservacoes("");
    setStatus({ text: "", error: false });
  }

  function fecharModal() {
    setOpen(false);
  }

  function handleBuscaChange(valor) {
    setBusca(valor);
    setSelecionado(null);
    clearTimeout(buscaTimeout.current);
    const termo = valor.trim();
    if (termo.length < 2) {
      setResultados([]);
      return;
    }
    buscaTimeout.current = setTimeout(async () => {
      const { data, error } = await supabase
        .from("pacientes")
        .select("id, nome")
        .eq("clinica_id", clinicaId)
        .ilike("nome", `%${termo}%`)
        .limit(6);
      setResultados(error ? [] : data || []);
    }, 350);
  }

  function selecionarPaciente(p) {
    setSelecionado(p);
    setStatus({ text: `Paciente selecionado: ${p.nome}`, error: false });
  }

  const nomeNovo = busca.trim();
  const podeMostrarNovoPaciente = nomeNovo.length >= 2 && !selecionado;
  const podeCriar = (!!selecionado || nomeNovo.length >= 2) && !!dataHora;

  async function criar() {
    setCriando(true);
    setStatus({ text: "Criando agendamento...", error: false });
    try {
      let pacienteId = selecionado?.id;

      if (!pacienteId) {
        const { data: novoPaciente, error: errPaciente } = await supabase
          .from("pacientes")
          .insert({ medico_id: medicoId, clinica_id: clinicaId, nome: nomeNovo })
          .select()
          .single();
        if (errPaciente) throw errPaciente;
        pacienteId = novoPaciente.id;
      }

      const { error: errAgendamento } = await supabase.from("agendamentos").insert({
        medico_id: medicoId,
        clinica_id: clinicaId,
        paciente_id: pacienteId,
        data_hora: new Date(dataHora).toISOString(),
        observacoes: observacoes.trim() || null,
      });
      if (errAgendamento) throw errAgendamento;

      onCriado();
      setOpen(false);
    } catch (e) {
      setStatus({ text: "Erro ao criar agendamento. Tente novamente.", error: true });
      setCriando(false);
    }
  }

  return (
    <>
      <button className="btn-primary" onClick={abrirModal}>
        + Novo agendamento
      </button>

      {open && (
        <div id="modal-overlay" className="show" onClick={fecharModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Novo agendamento</h2>
            <div className="field">
              <label>Buscar paciente</label>
              <input
                type="text"
                placeholder="Digite o nome do paciente"
                value={busca}
                onChange={(e) => handleBuscaChange(e.target.value)}
                autoFocus
              />
            </div>
            <div id="patient-results">
              {resultados.map((p) => (
                <div key={p.id} className="patient-opt" onClick={() => selecionarPaciente(p)}>
                  {p.nome}
                </div>
              ))}
            </div>
            {podeMostrarNovoPaciente && (
              <div className="field" style={{ marginTop: 12 }}>
                <label>Cadastrar novo paciente</label>
                <input type="text" value={nomeNovo} readOnly />
              </div>
            )}
            <div className="field" style={{ marginTop: 12 }}>
              <label>Data e hora</label>
              <input
                type="datetime-local"
                value={dataHora}
                onChange={(e) => setDataHora(e.target.value)}
              />
            </div>
            <div className="field">
              <label>Observações (opcional)</label>
              <input
                type="text"
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
              />
            </div>
            <div className={`modal-status${status.error ? " error" : ""}`}>{status.text}</div>
            <div className="modal-actions">
              <button id="btn-cancel-modal" onClick={fecharModal}>
                Cancelar
              </button>
              <button disabled={!podeCriar || criando} onClick={criar}>
                Agendar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
