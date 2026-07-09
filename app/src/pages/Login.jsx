import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import "./Login.css";

export function Login() {
  const { medico, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!loading && medico) return <Navigate to="/inicio" replace />;

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    if (!email.trim() || !senha) {
      setError("Preencha e-mail e senha.");
      return;
    }
    setSubmitting(true);
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: senha,
    });
    if (signInError) {
      setSubmitting(false);
      setError("E-mail ou senha incorretos.");
      return;
    }

    const { data: medico, error: medicoError } = await supabase
      .from("medicos")
      .select("id")
      .eq("auth_user_id", data.user.id)
      .single();

    setSubmitting(false);
    if (medicoError || !medico) {
      setError("Usuário autenticado, mas sem cadastro de médico vinculado.");
      await supabase.auth.signOut();
      return;
    }
    navigate("/inicio");
  }

  return (
    <div id="login-screen">
      <div className="login-card">
        <div className="mark">MedScribe AI</div>
        <h1>Entrar</h1>
        <form onSubmit={handleLogin}>
          <div className="field">
            <label>E-mail</label>
            <input
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Senha</label>
            <input
              type="password"
              placeholder="••••••••"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />
          </div>
          <button className="btn-primary" type="submit" disabled={submitting}>
            {submitting ? "Entrando..." : "Entrar"}
          </button>
          <div className="error-msg">{error}</div>
        </form>
      </div>
    </div>
  );
}
