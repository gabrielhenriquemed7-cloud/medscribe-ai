import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import { AppLayout } from "../components/AppLayout";
import "./Pacientes.css";

export function Pacientes() {
  const { medico } = useAuth();
  const [pacientes, setPacientes] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [busca, setBusca] = useState("");

  useEffect(() => {
    if (medico?.clinica_id) carregar();
  }, [medico?.clinica_id]);

  async function carregar() {
    setLoadError(false);
    const { data, error } = await supabase
      .from("pacientes")
      .select("id, nome, data_nascimento, sexo, telefone")
      .eq("clinica_id", medico.clinica_id)
      .order("nome", { ascending: true });

    if (error) {
      setLoadError(true);
      return;
    }
    setPacientes(data || []);
  }

  const filtrados = useMemo(() => {
    if (!pacientes) return null;
    const termo = busca.trim().toLowerCase();
    if (!termo) return pacientes;
    return pacientes.filter((p) => p.nome?.toLowerCase().includes(termo));
  }, [pacientes, busca]);

  return (
    <AppLayout>
      <div className="pacientes-page">
        <header className="pacientes-head">
          <h1>Pacientes</h1>
          {pacientes && (
            <span className="pacientes-count">{pacientes.length} no total</span>
          )}
        </header>

        <input
          className="pacientes-busca"
          type="text"
          placeholder="Buscar paciente pelo nome..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />

        {loadError ? (
          <div className="empty-state">Não foi possível carregar os pacientes.</div>
        ) : filtrados === null ? (
          <div className="empty-state">Carregando...</div>
        ) : filtrados.length === 0 ? (
          <div className="empty-state">
            {busca.trim()
              ? "Nenhum paciente encontrado para essa busca."
              : "Nenhum paciente cadastrado ainda."}
          </div>
        ) : (
          <div className="pacientes-list">
            {filtrados.map((p) => {
              const idade = p.data_nascimento
                ? Math.floor(
                    (Date.now() - new Date(p.data_nascimento).getTime()) /
                      (365.25 * 24 * 60 * 60 * 1000),
                  )
                : null;
              const iniciais = (p.nome || "?")
                .split(" ")
                .filter(Boolean)
                .slice(0, 2)
                .map((x) => x[0])
                .join("")
                .toUpperCase();
              return (
                <Link className="paciente-row" to={`/paciente/${p.id}`} key={p.id}>
                  <span className="paciente-avatar">{iniciais}</span>
                  <div className="paciente-info">
                    <span className="paciente-nome">{p.nome}</span>
                    <span className="paciente-meta">
                      {idade !== null && `${idade} anos`}
                      {p.sexo && `${idade !== null ? " · " : ""}${p.sexo}`}
                      {p.telefone && ` · ${p.telefone}`}
                    </span>
                  </div>
                  <span className="paciente-chev">→</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
