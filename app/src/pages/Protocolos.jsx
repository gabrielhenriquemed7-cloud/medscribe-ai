import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import "./Protocolos.css";

export function Protocolos() {
  const { medico } = useAuth();
  const [protocolos, setProtocolos] = useState(null);
  const [condicao, setCondicao] = useState("");
  const [conteudo, setConteudo] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    const { data } = await supabase
      .from("protocolos")
      .select("*")
      .order("condicao", { ascending: true });
    setProtocolos(data || []);
  }

  async function adicionar(e) {
    e.preventDefault();
    if (!condicao.trim() || !conteudo.trim()) return;
    setSalvando(true);
    setErro("");
    const { error } = await supabase
      .from("protocolos")
      .insert({ medico_id: medico.id, condicao: condicao.trim(), conteudo: conteudo.trim() });
    setSalvando(false);
    if (error) {
      setErro("Não foi possível salvar o protocolo. Tente novamente.");
      return;
    }
    setCondicao("");
    setConteudo("");
    carregar();
  }

  async function remover(id) {
    await supabase.from("protocolos").delete().eq("id", id);
    carregar();
  }

  return (
    <div className="protocolos-page">
      <Link className="voltar" to="/consultas">
        ← Consultas
      </Link>
      <h1>Protocolos clínicos</h1>
      <p className="descricao">
        Cadastre condições e a conduta/exames que você segue para elas. A IA passa a basear a
        sugestão de conduta nesses protocolos quando a hipótese diagnóstica corresponder, durante
        a estruturação da anamnese.
      </p>

      <form className="form-protocolo" onSubmit={adicionar}>
        <div className="field">
          <label>Condição</label>
          <input
            type="text"
            placeholder="Ex: Hipertensão arterial"
            value={condicao}
            onChange={(e) => setCondicao(e.target.value)}
          />
        </div>
        <div className="field">
          <label>Conduta / exames recomendados</label>
          <textarea
            rows={4}
            placeholder="Descreva a conduta que você segue para essa condição"
            value={conteudo}
            onChange={(e) => setConteudo(e.target.value)}
          />
        </div>
        {erro && <div className="error-msg">{erro}</div>}
        <button className="btn-primary" disabled={salvando}>
          {salvando ? "Salvando..." : "+ Adicionar protocolo"}
        </button>
      </form>

      <h2 className="section-title">Protocolos cadastrados</h2>
      {protocolos === null ? (
        <div className="empty-state">Carregando...</div>
      ) : protocolos.length === 0 ? (
        <div className="empty-state">Nenhum protocolo cadastrado ainda.</div>
      ) : (
        <div>
          {protocolos.map((p) => (
            <div className="protocolo-card" key={p.id}>
              <div>
                <div className="condicao">{p.condicao}</div>
                <div className="conteudo">{p.conteudo}</div>
              </div>
              <button className="btn-ghost" onClick={() => remover(p.id)}>
                Remover
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
