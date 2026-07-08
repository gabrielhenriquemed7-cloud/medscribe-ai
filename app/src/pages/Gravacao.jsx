import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import "./Gravacao.css";

const FIELD_LABELS = {
  queixa_principal: "Queixa principal",
  historia_doenca_atual: "História da doença atual",
  antecedentes_pessoais: "Antecedentes pessoais",
  antecedentes_familiares: "Antecedentes familiares",
  exame_fisico: "Exame físico",
  hipotese_diagnostica: "Hipótese diagnóstica",
  sugestao_ia_conduta: "Conduta sugerida",
  sugestao_ia_diagnostico_diferencial: "Diagnóstico diferencial",
  alertas_seguranca: "Alerta de segurança",
};
const FIELD_ORDER = Object.keys(FIELD_LABELS);

export function Gravacao() {
  const { id: consultaId } = useParams();
  const navigate = useNavigate();
  const [consulta, setConsulta] = useState(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    carregarConsulta();
  }, [consultaId]);

  async function carregarConsulta() {
    setLoadError(false);
    const { data, error } = await supabase
      .from("consultas")
      .select("id, status, consentimento_paciente, pacientes(nome), medicos(nome)")
      .eq("id", consultaId)
      .single();

    if (error || !data) {
      setLoadError(true);
      return;
    }
    setConsulta(data);
  }

  if (loadError) {
    return <div className="grav-page">Não foi possível carregar esta consulta.</div>;
  }
  if (!consulta) {
    return <div className="grav-page">Carregando...</div>;
  }
  if (!consulta.consentimento_paciente) {
    return <Navigate to={`/consulta/${consultaId}/consentimento`} replace />;
  }
  if (consulta.status !== "em_andamento") {
    return <Navigate to="/consultas" replace />;
  }

  return <Recorder consulta={consulta} consultaId={consultaId} navigate={navigate} />;
}

function Recorder({ consulta, consultaId, navigate }) {
  const [statusText, setStatusText] = useState("Aguardando início");
  const [statusClass, setStatusClass] = useState("idle");
  const [seconds, setSeconds] = useState(0);
  const [recorderState, setRecorderState] = useState("idle"); // idle | recording | paused
  const [transcriptLines, setTranscriptLines] = useState([]);
  const [fields, setFields] = useState({});
  const [noSupport, setNoSupport] = useState(false);
  const [finalizando, setFinalizando] = useState(false);

  const timerRef = useRef(null);
  const secondsRef = useRef(0);
  const recorderStateRef = useRef("idle");
  const lastStructuredAtRef = useRef(0);
  const fullTranscriptRef = useRef("");
  const dirtyFieldsRef = useRef(new Set());
  const recognitionRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);
  const animIdRef = useRef(null);
  const canvasRef = useRef(null);
  const transcricaoIdRef = useRef(null);
  const anamneseIdRef = useRef(null);
  const fieldsRef = useRef({});

  useEffect(() => {
    drawIdleWave();
    window.addEventListener("resize", drawIdleWave);
    return () => {
      window.removeEventListener("resize", drawIdleWave);
      cancelAnimationFrame(animIdRef.current);
      clearInterval(timerRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (_) {}
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (audioCtxRef.current) audioCtxRef.current.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function formatTime(s) {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const ss = (s % 60).toString().padStart(2, "0");
    return `${m}:${ss}`;
  }

  function resizeCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = canvas.clientWidth * devicePixelRatio;
    canvas.height = canvas.clientHeight * devicePixelRatio;
  }

  function drawIdleWave() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    resizeCanvas();
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#D7DDD9";
    ctx.lineWidth = 2 * devicePixelRatio;
    ctx.beginPath();
    ctx.moveTo(0, canvas.height / 2);
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();
  }

  function drawWave() {
    animIdRef.current = requestAnimationFrame(drawWave);
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;
    const dataArray = dataArrayRef.current;
    analyser.getByteTimeDomainData(dataArray);
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 2 * devicePixelRatio;
    ctx.strokeStyle = "#3A7D66";
    ctx.beginPath();
    const slice = canvas.width / dataArray.length;
    let x = 0;
    for (let i = 0; i < dataArray.length; i++) {
      const v = dataArray[i] / 128.0;
      const y = (v * canvas.height) / 2;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      x += slice;
    }
    ctx.stroke();
  }

  async function persistTranscricao(texto) {
    if (!transcricaoIdRef.current) {
      const { data, error } = await supabase
        .from("transcricoes")
        .insert({ consulta_id: consultaId, texto_bruto: texto })
        .select()
        .single();
      if (!error) transcricaoIdRef.current = data.id;
    } else {
      await supabase
        .from("transcricoes")
        .update({ texto_bruto: texto })
        .eq("id", transcricaoIdRef.current);
    }
  }

  async function persistAnamnese(camposAtualizados) {
    if (!anamneseIdRef.current) {
      const { data, error } = await supabase
        .from("anamneses")
        .insert({ consulta_id: consultaId, ...camposAtualizados })
        .select()
        .single();
      if (!error) anamneseIdRef.current = data.id;
    } else {
      await supabase
        .from("anamneses")
        .update(camposAtualizados)
        .eq("id", anamneseIdRef.current);
    }
  }

  async function structureTranscript() {
    if (!fullTranscriptRef.current.trim()) return;
    try {
      const { data, error } = await supabase.functions.invoke("estruturar-anamnese", {
        body: { transcript: fullTranscriptRef.current },
      });
      if (error || !data?.fields) return;

      const novosCampos = {};
      for (const key of Object.keys(data.fields)) {
        if (!dirtyFieldsRef.current.has(key)) {
          novosCampos[key] = data.fields[key];
        }
      }
      if (Object.keys(novosCampos).length === 0) return;

      fieldsRef.current = { ...fieldsRef.current, ...novosCampos };
      setFields(fieldsRef.current);
      await persistAnamnese(novosCampos);
    } catch (e) {
      console.error("Erro ao estruturar transcrição:", e);
    }
  }

  function appendTranscript(text) {
    fullTranscriptRef.current += " " + text;
    setTranscriptLines((lines) => [...lines, text]);
    persistTranscricao(fullTranscriptRef.current);

    if (secondsRef.current - lastStructuredAtRef.current >= 15) {
      lastStructuredAtRef.current = secondsRef.current;
      structureTranscript();
    }
  }

  function setupSpeechRecognition() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setNoSupport(true);
      return null;
    }
    const r = new SR();
    r.lang = "pt-BR";
    r.continuous = true;
    r.interimResults = false;
    r.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          appendTranscript(e.results[i][0].transcript.trim());
        }
      }
    };
    r.onerror = (e) => console.warn("Speech recognition error:", e.error);
    r.onend = () => {
      if (recorderStateRef.current === "recording") {
        try {
          r.start();
        } catch (_) {}
      }
    };
    return r;
  }

  useEffect(() => {
    recorderStateRef.current = recorderState;
  }, [recorderState]);

  function setStatus(state) {
    setStatusClass(state === "idle" ? "idle" : "live");
    setStatusText(
      state === "idle" ? "Aguardando início" : state === "paused" ? "Pausado" : "Gravando ao vivo",
    );
  }

  function startTimer() {
    timerRef.current = setInterval(() => {
      secondsRef.current += 1;
      setSeconds(secondsRef.current);
    }, 1000);
  }
  function stopTimer() {
    clearInterval(timerRef.current);
  }

  async function startRecording() {
    try {
      mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      alert("Não foi possível acessar o microfone. Verifique as permissões do navegador.");
      return;
    }
    audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioCtxRef.current.createMediaStreamSource(mediaStreamRef.current);
    analyserRef.current = audioCtxRef.current.createAnalyser();
    analyserRef.current.fftSize = 2048;
    dataArrayRef.current = new Uint8Array(analyserRef.current.frequencyBinCount);
    source.connect(analyserRef.current);
    drawWave();

    recognitionRef.current = setupSpeechRecognition();
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (_) {}
    }

    setRecorderState("recording");
    setStatus("recording");
    startTimer();
  }

  function pauseRecording() {
    if (recorderState === "recording") {
      setRecorderState("paused");
      setStatus("paused");
      stopTimer();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (_) {}
      }
    } else if (recorderState === "paused") {
      setRecorderState("recording");
      setStatus("recording");
      startTimer();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (_) {}
      }
    }
  }

  function teardownRecording() {
    stopTimer();
    cancelAnimationFrame(animIdRef.current);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_) {}
    }
    if (mediaStreamRef.current) mediaStreamRef.current.getTracks().forEach((t) => t.stop());
    if (audioCtxRef.current) audioCtxRef.current.close();
    drawIdleWave();
  }

  function stopRecording() {
    setRecorderState("idle");
    setStatus("idle");
    teardownRecording();
    if (fullTranscriptRef.current.trim()) structureTranscript();
  }

  async function finalizarConsulta() {
    setFinalizando(true);
    if (recorderStateRef.current !== "idle") teardownRecording();
    setRecorderState("idle");
    setStatus("idle");

    if (fullTranscriptRef.current.trim()) {
      await structureTranscript();
    }

    await supabase
      .from("anamneses")
      .update({ ...fieldsRef.current, validado_pelo_medico: true, validado_em: new Date().toISOString() })
      .eq("id", anamneseIdRef.current);

    await supabase.from("consultas").update({ status: "finalizada" }).eq("id", consultaId);

    navigate("/consultas");
  }

  function handleFieldChange(key, value) {
    dirtyFieldsRef.current.add(key);
    fieldsRef.current = { ...fieldsRef.current, [key]: value };
    setFields(fieldsRef.current);
  }

  const camposPreenchidos = FIELD_ORDER.filter((k) => fields[k]);

  return (
    <div className="grav-page">
      <header className="top">
        <div className="who">
          {consulta.medicos?.nome} <span>· consulta com</span> {consulta.pacientes?.nome}
        </div>
        <div className="grav-header-right">
          <a className="btn-ghost" href="/scores" target="_blank" rel="noreferrer">
            Scores ↗
          </a>
          <div className={`status-pill ${statusClass}`}>
            <span className="dot" style={{ display: statusClass === "idle" ? "none" : "inline-block" }} />
            <span>{statusText}</span>
          </div>
        </div>
      </header>

      {noSupport && (
        <div className="no-support">
          Este navegador não tem suporte a reconhecimento de fala em tempo real. A
          gravação de áudio funciona normalmente, mas a transcrição ao vivo fica
          indisponível — use Chrome ou Edge para testar essa parte.
        </div>
      )}

      <div className="recorder">
        <canvas id="wave" ref={canvasRef}></canvas>
        <div className="timer">{formatTime(seconds)}</div>
        <div className="controls">
          <button
            className="ctrl-btn rec"
            disabled={recorderState !== "idle"}
            onClick={startRecording}
            title="Gravar"
          >
            ●
          </button>
          <button
            className="ctrl-btn pause"
            disabled={recorderState === "idle"}
            onClick={pauseRecording}
            title={recorderState === "paused" ? "Retomar" : "Pausar"}
          >
            {recorderState === "paused" ? "●" : "❚❚"}
          </button>
          <button
            className="ctrl-btn stop"
            disabled={recorderState === "idle"}
            onClick={stopRecording}
            title="Finalizar gravação"
          >
            ■
          </button>
        </div>
      </div>

      <div className="grid">
        <div className="panel">
          <h2>Transcrição ao vivo</h2>
          <div id="transcript">
            {transcriptLines.length === 0 ? (
              <div className="empty">A transcrição aparece aqui conforme a consulta acontece.</div>
            ) : (
              transcriptLines.map((line, i) => <p key={i}>{line}</p>)
            )}
          </div>
        </div>
        <div className="panel">
          <h2>Anamnese sendo estruturada</h2>
          <div id="fields">
            {camposPreenchidos.length === 0 ? (
              <div className="empty">
                Os campos são preenchidos automaticamente à medida que a IA
                identifica cada parte da conversa. Tudo aqui é sugestão — revise
                antes de salvar.
              </div>
            ) : (
              camposPreenchidos.map((key) => {
                const isAlerta = key === "alertas_seguranca";
                return (
                  <div className={`field-card${isAlerta ? " field-card-alerta" : ""}`} key={key}>
                    <div className="label">
                      {FIELD_LABELS[key]}{" "}
                      <span className={isAlerta ? "alerta-badge" : "ai-badge"}>
                        {isAlerta ? "⚠ ALERTA" : "IA"}
                      </span>
                    </div>
                    <textarea
                      className="val"
                      rows={3}
                      value={fields[key] || ""}
                      onChange={(e) => handleFieldChange(key, e.target.value)}
                    />
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <button
        className="btn-primary btn-finalizar"
        disabled={finalizando}
        onClick={finalizarConsulta}
      >
        {finalizando ? "Finalizando..." : "Finalizar consulta"}
      </button>

      <div className="footnote">
        Sugestões marcadas com <span className="ai-badge">IA</span> foram geradas
        automaticamente e precisam de validação médica antes de entrarem no
        prontuário definitivo, conforme a Resolução CFM nº 2.454/2026.
      </div>
    </div>
  );
}
