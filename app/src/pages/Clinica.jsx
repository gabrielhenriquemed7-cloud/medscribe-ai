import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import "./Clinica.css";

const PAPEL_LABEL = {
  admin: "Admin",
  medico: "Médico",
  recepcao: "Recepção",
};

export function Clinica() {
  const { medico, papel } = useAuth();
  const clinicaId = medico?.clinica_id;
  const isAdmin = papel === "admin";

  const [clinica, setClinica] = useState(null);
  const [membros, setMembros] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [nomeEdit, setNomeEdit] = useState("");
  const [salvandoNome, setSalvandoNome] = useState(false);
  const [nomeSalvo, setNomeSalvo] = useState(false);

  useEffect(() => {
    if (clinicaId) carregar();
  }, [clinicaId]);

  async function carregar() {
    setLoadError(false);
    const [{ data: clinicaData, error: clinicaError }, { data: membrosData, error: membrosError }] =
      await Promise.all([
        supabase.from("clinicas").select("*").eq("id", clinicaId).single(),
        supabase
          .from("membros_clinica")
          .select("id, papel, email, auth_user_id, medicos(nome)")
          .eq("clinica_id", clinicaId)
          .order("papel", { ascending: true }),
      ]);

    if (clinicaError || !clinicaData || membrosError) {
      setLoadError(true);
      return;
    }
    setClinica(clinicaData);
    setNomeEdit(clinicaData.nome);
    setMembros(membrosData || []);
  }

  async function salvarNome() {
    setSalvandoNome(true);
    setNomeSalvo(false);
    const { error } = await supabase
      .from("clinicas")
      .update({ nome: nomeEdit.trim() })
      .eq("id", clinicaId);
    setSalvandoNome(false);
    if (!error) {
      setNomeSalvo(true);
      setClinica((c) => ({ ...c, nome: nomeEdit.trim() }));
    }
  }

  async function removerMembro(membro) {
    if (!confirm(`Remover ${membro.medicos?.nome || membro.email} da clínica?`)) return;
    const { error } = await supabase.from("membros_clinica").delete().eq("id", membro.id);
    if (!error) carregar();
  }

  if (!clinicaId) {
    return <div className="clinica-page">Sua conta não está vinculada a uma clínica.</div>;
  }
  if (loadError) {
    return <div className="clinica-page">Não foi possível carregar os dados da clínica.</div>;
  }
  if (!clinica) {
    return <div className="clinica-page">Carregando...</div>;
  }

  return (
    <div className="clinica-page">
      <Link className="voltar" to="/consultas">
        ← Consultas
      </Link>
      <h1>Clínica</h1>

      <div className="bloco">
        <h2 className="section-title">Dados da clínica</h2>
        <div className="field">
          <label>Nome</label>
          <input
            type="text"
            value={nomeEdit}
            onChange={(e) => {
              setNomeEdit(e.target.value);
              setNomeSalvo(false);
            }}
            disabled={!isAdmin}
          />
        </div>
        {isAdmin && (
          <div className="linha-salvar">
            <button
              className="btn-primary"
              disabled={salvandoNome || !nomeEdit.trim() || nomeEdit.trim() === clinica.nome}
              onClick={salvarNome}
            >
              {salvandoNome ? "Salvando..." : "Salvar"}
            </button>
            {nomeSalvo && <span className="status-msg">Nome atualizado.</span>}
          </div>
        )}
      </div>

      <div className="bloco">
        <div className="bloco-header">
          <h2 className="section-title">Membros</h2>
          {isAdmin && <NovoMembroButton clinicaId={clinicaId} onCriado={carregar} />}
        </div>

        {membros.length === 0 ? (
          <div className="empty-state">Nenhum membro cadastrado.</div>
        ) : (
          <div>
            {membros.map((m) => (
              <div className="membro-card" key={m.id}>
                <div>
                  <div className="membro-nome">
                    {m.medicos?.nome || m.email || "Membro"}
                    {m.auth_user_id === medico?.auth_user_id && <span className="voce"> (você)</span>}
                  </div>
                  {m.email && <div className="membro-email">{m.email}</div>}
                </div>
                <div className="membro-actions">
                  <span className={`papel-tag ${m.papel}`}>{PAPEL_LABEL[m.papel] || m.papel}</span>
                  {isAdmin && m.papel !== "admin" && (
                    <button className="btn-ghost" onClick={() => removerMembro(m)}>
                      Remover
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {!isAdmin && (
        <div className="footnote">
          Apenas administradores da clínica podem editar o nome e gerenciar membros.
        </div>
      )}
    </div>
  );
}

function NovoMembroButton({ clinicaId, onCriado }) {
  const [open, setOpen] = useState(false);
  const [papel, setPapel] = useState("medico");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [crm, setCrm] = useState("");
  const [ufCrm, setUfCrm] = useState("");
  const [especialidade, setEspecialidade] = useState("");
  const [criando, setCriando] = useState(false);
  const [erro, setErro] = useState("");

  function abrir() {
    setOpen(true);
    setPapel("medico");
    setNome("");
    setEmail("");
    setSenha("");
    setCrm("");
    setUfCrm("");
    setEspecialidade("");
    setErro("");
  }

  const podeCriar =
    nome.trim() &&
    email.trim() &&
    senha.length >= 6 &&
    (papel === "recepcao" || (crm.trim() && ufCrm.trim()));

  async function criar() {
    setCriando(true);
    setErro("");
    const { data, error } = await supabase.functions.invoke("criar-membro", {
      body: {
        clinica_id: clinicaId,
        email: email.trim(),
        senha,
        nome: nome.trim(),
        papel,
        crm: crm.trim(),
        uf_crm: ufCrm.trim().toUpperCase(),
        especialidade: especialidade.trim(),
      },
    });
    setCriando(false);
    if (error || data?.error) {
      const code = data?.error;
      setErro(
        code === "create_user_failed"
          ? "Não foi possível criar a conta (e-mail já em uso?)."
          : "Não foi possível adicionar o membro. Tente novamente.",
      );
      return;
    }
    setOpen(false);
    onCriado();
  }

  return (
    <>
      <button className="btn-primary" onClick={abrir}>
        + Adicionar membro
      </button>

      {open && (
        <div id="modal-overlay" className="show" onClick={() => setOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Adicionar membro</h2>

            <div className="field">
              <label>Papel</label>
              <div className="papel-opcoes">
                {["medico", "recepcao"].map((p) => (
                  <button
                    key={p}
                    className={`papel-opcao${papel === p ? " selecionado" : ""}`}
                    onClick={() => setPapel(p)}
                  >
                    {PAPEL_LABEL[p]}
                  </button>
                ))}
              </div>
            </div>

            <div className="field">
              <label>Nome</label>
              <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>

            {papel === "medico" && (
              <div className="linha-dupla">
                <div className="field">
                  <label>CRM</label>
                  <input type="text" value={crm} onChange={(e) => setCrm(e.target.value)} />
                </div>
                <div className="field field-uf">
                  <label>UF</label>
                  <input
                    type="text"
                    maxLength={2}
                    value={ufCrm}
                    onChange={(e) => setUfCrm(e.target.value)}
                  />
                </div>
              </div>
            )}

            {papel === "medico" && (
              <div className="field">
                <label>Especialidade (opcional)</label>
                <input
                  type="text"
                  value={especialidade}
                  onChange={(e) => setEspecialidade(e.target.value)}
                />
              </div>
            )}

            <div className="field">
              <label>E-mail de acesso</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>

            <div className="field">
              <label>Senha temporária (mín. 6 caracteres)</label>
              <input type="text" value={senha} onChange={(e) => setSenha(e.target.value)} />
            </div>

            {erro && <div className="error-msg">{erro}</div>}

            <div className="modal-actions">
              <button id="btn-cancel-modal" onClick={() => setOpen(false)}>
                Cancelar
              </button>
              <button disabled={!podeCriar || criando} onClick={criar}>
                {criando ? "Criando..." : "Adicionar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
