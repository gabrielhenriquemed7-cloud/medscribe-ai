import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import { AppLayout } from "../components/AppLayout";
import "./Consultas.css";

const STATUS_LABEL = {
  em_andamento: "Em andamento",
  finalizada: "Finalizada",
  cancelada: "Cancelada",
};

export function Consultas() {
  const { medico } = useAuth();
  const navigate = useNavigate();
  const [consultas, setConsultas] = useState(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    carregarConsultas();
  }, []);

  async function carregarConsultas() {
    setLoadError(false);
    setConsultas(null);
    const { data, error } = await supabase
      .from("consultas")
      .select("id, data_consulta, status, consentimento_data, pacientes(id, nome), medicos(nome)")
      .eq("clinica_id", medico.clinica_id)
      .order("data_consulta", { ascending: false })
      .limit(30);

    if (error) {
      setLoadError(true);
      return;
    }
    setConsultas(data || []);
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

  return (
    <AppLayout>
      <div id="app" className="show">
        <div className="actions-row">
          <h2>Consultas recentes</h2>
          <NovaConsultaButton
            medicoId={medico.id}
            clinicaId={medico.clinica_id}
            onCriada={carregarConsultas}
          />
        </div>

        <ListaConsultas
          consultas={consultas}
          loadError={loadError}
          onAbrir={abrirConsulta}
        />
      </div>
    </AppLayout>
  );
}

function ListaConsultas({ consultas, loadError, onAbrir }) {
  if (loadError) {
    return (
      <div className="empty-state">Não foi possível carregar as consultas.</div>
    );
  }
  if (consultas === null) {
    return <div className="empty-state">Carregando...</div>;
  }
  if (consultas.length === 0) {
    return (
      <div className="empty-state">
        Nenhuma consulta ainda. Clique em "+ Nova consulta" para começar.
      </div>
    );
  }
  return (
    <div>
      {consultas.map((c) => {
        const d = new Date(c.data_consulta);
        const dataFmt =
          d.toLocaleDateString("pt-BR") +
          " · " +
          d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
        const clickable = c.status === "em_andamento" || c.status === "finalizada";
        return (
          <div
            key={c.id}
            className="consulta-card"
            style={{ cursor: clickable ? "pointer" : "default" }}
            onClick={() => onAbrir(c)}
          >
            <div>
              {c.pacientes?.id ? (
                <Link
                  className="pname pname-link"
                  to={`/paciente/${c.pacientes.id}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  {c.pacientes.nome}
                </Link>
              ) : (
                <div className="pname">Paciente sem nome</div>
              )}
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
  );
}

function NovaConsultaButton({ medicoId, clinicaId, onCriada }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [busca, setBusca] = useState("");
  const [resultados, setResultados] = useState([]);
  const [selecionado, setSelecionado] = useState(null);
  const [status, setStatus] = useState({ text: "", error: false });
  const [criando, setCriando] = useState(false);
  const buscaTimeout = useRef(null);

  function abrirModal() {
    setOpen(true);
    setBusca("");
    setResultados([]);
    setSelecionado(null);
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
  const podeMostrarNovoPaciente = resultados.length >= 0 && nomeNovo.length >= 2 && !selecionado;
  const podeCriar = !!selecionado || nomeNovo.length >= 2;

  async function criarConsulta() {
    setCriando(true);
    setStatus({ text: "Criando consulta...", error: false });
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

      const { data: novaConsulta, error: errConsulta } = await supabase
        .from("consultas")
        .insert({
          medico_id: medicoId,
          clinica_id: clinicaId,
          paciente_id: pacienteId,
          status: "em_andamento",
        })
        .select()
        .single();
      if (errConsulta) throw errConsulta;

      onCriada();
      navigate(`/consulta/${novaConsulta.id}/consentimento`);
    } catch (e) {
      setStatus({ text: "Erro ao criar consulta. Tente novamente.", error: true });
      setCriando(false);
    }
  }

  return (
    <>
      <button id="btn-nova" onClick={abrirModal}>
        + Nova consulta
      </button>

      {open && (
        <div id="modal-overlay" className="show" onClick={fecharModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Nova consulta</h2>
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
                <div
                  key={p.id}
                  className="patient-opt"
                  onClick={() => selecionarPaciente(p)}
                >
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
            <div className={`modal-status${status.error ? " error" : ""}`}>
              {status.text ||
                (nomeNovo.length >= 2 && !selecionado
                  ? "Será cadastrado como novo paciente."
                  : "")}
            </div>
            <div className="modal-actions">
              <button id="btn-cancel-modal" onClick={fecharModal}>
                Cancelar
              </button>
              <button
                id="btn-criar-consulta"
                disabled={!podeCriar || criando}
                onClick={criarConsulta}
              >
                Iniciar consulta
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
