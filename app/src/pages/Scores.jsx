import { useState } from "react";
import { AppLayout } from "../components/AppLayout";
import "./Scores.css";

const SCORES = [
  {
    key: "gcs",
    nome: "Escala de Coma de Glasgow",
    descricao: "Avalia o nível de consciência através da resposta ocular, verbal e motora.",
    campos: [
      {
        label: "Abertura ocular",
        opcoes: [
          { label: "Espontânea", valor: 4 },
          { label: "Ao estímulo verbal", valor: 3 },
          { label: "À dor", valor: 2 },
          { label: "Nenhuma", valor: 1 },
        ],
      },
      {
        label: "Resposta verbal",
        opcoes: [
          { label: "Orientada", valor: 5 },
          { label: "Confusa", valor: 4 },
          { label: "Palavras inapropriadas", valor: 3 },
          { label: "Sons incompreensíveis", valor: 2 },
          { label: "Nenhuma", valor: 1 },
        ],
      },
      {
        label: "Resposta motora",
        opcoes: [
          { label: "Obedece comandos", valor: 6 },
          { label: "Localiza a dor", valor: 5 },
          { label: "Retirada à dor", valor: 4 },
          { label: "Flexão anormal (decorticação)", valor: 3 },
          { label: "Extensão anormal (descerebração)", valor: 2 },
          { label: "Nenhuma", valor: 1 },
        ],
      },
    ],
    interpretar: (total) =>
      total <= 8
        ? "Grave — considerar via aérea avançada"
        : total <= 12
          ? "Moderado"
          : "Leve",
  },
  {
    key: "curb65",
    nome: "CURB-65",
    descricao: "Gravidade de pneumonia adquirida na comunidade.",
    campos: [
      { label: "Confusão mental", opcoes: [{ label: "Não", valor: 0 }, { label: "Sim", valor: 1 }] },
      {
        label: "Ureia > 50 mg/dL (ou > 7 mmol/L)",
        opcoes: [{ label: "Não", valor: 0 }, { label: "Sim", valor: 1 }],
      },
      {
        label: "Frequência respiratória ≥ 30 irpm",
        opcoes: [{ label: "Não", valor: 0 }, { label: "Sim", valor: 1 }],
      },
      {
        label: "PAS < 90 mmHg ou PAD ≤ 60 mmHg",
        opcoes: [{ label: "Não", valor: 0 }, { label: "Sim", valor: 1 }],
      },
      { label: "Idade ≥ 65 anos", opcoes: [{ label: "Não", valor: 0 }, { label: "Sim", valor: 1 }] },
    ],
    interpretar: (total) =>
      total <= 1
        ? "Baixo risco — tratamento ambulatorial"
        : total === 2
          ? "Risco intermediário — considerar internação"
          : "Alto risco — internação, considerar UTI",
  },
  {
    key: "qsofa",
    nome: "qSOFA",
    descricao: "Rastreio rápido de risco de desfecho desfavorável por sepse fora da UTI.",
    campos: [
      {
        label: "Frequência respiratória ≥ 22 irpm",
        opcoes: [{ label: "Não", valor: 0 }, { label: "Sim", valor: 1 }],
      },
      {
        label: "Alteração do nível de consciência",
        opcoes: [{ label: "Não", valor: 0 }, { label: "Sim", valor: 1 }],
      },
      { label: "PAS ≤ 100 mmHg", opcoes: [{ label: "Não", valor: 0 }, { label: "Sim", valor: 1 }] },
    ],
    interpretar: (total) => (total >= 2 ? "Alto risco — investigar sepse" : "Baixo risco"),
  },
  {
    key: "cha2ds2vasc",
    nome: "CHA₂DS₂-VASc",
    descricao: "Risco de AVC em pacientes com fibrilação atrial.",
    campos: [
      {
        label: "Insuficiência cardíaca / disfunção de VE",
        opcoes: [{ label: "Não", valor: 0 }, { label: "Sim", valor: 1 }],
      },
      { label: "Hipertensão arterial", opcoes: [{ label: "Não", valor: 0 }, { label: "Sim", valor: 1 }] },
      {
        label: "Idade",
        opcoes: [
          { label: "< 65 anos", valor: 0 },
          { label: "65-74 anos", valor: 1 },
          { label: "≥ 75 anos", valor: 2 },
        ],
      },
      { label: "Diabetes mellitus", opcoes: [{ label: "Não", valor: 0 }, { label: "Sim", valor: 1 }] },
      {
        label: "AVC / AIT / tromboembolismo prévio",
        opcoes: [{ label: "Não", valor: 0 }, { label: "Sim", valor: 2 }],
      },
      {
        label: "Doença vascular (IAM, DAP, placa aórtica)",
        opcoes: [{ label: "Não", valor: 0 }, { label: "Sim", valor: 1 }],
      },
      { label: "Sexo feminino", opcoes: [{ label: "Não", valor: 0 }, { label: "Sim", valor: 1 }] },
    ],
    interpretar: (total) =>
      total === 0
        ? "Risco baixo"
        : total === 1
          ? "Risco baixo-intermediário — considerar anticoagulação"
          : "Risco alto — considerar anticoagulação",
  },
  {
    key: "centor",
    nome: "Centor / McIsaac",
    descricao: "Probabilidade de faringoamigdalite estreptocócica.",
    campos: [
      { label: "Febre > 38°C", opcoes: [{ label: "Não", valor: 0 }, { label: "Sim", valor: 1 }] },
      { label: "Ausência de tosse", opcoes: [{ label: "Não", valor: 0 }, { label: "Sim", valor: 1 }] },
      {
        label: "Linfonodos cervicais anteriores dolorosos",
        opcoes: [{ label: "Não", valor: 0 }, { label: "Sim", valor: 1 }],
      },
      {
        label: "Exsudato ou edema amigdaliano",
        opcoes: [{ label: "Não", valor: 0 }, { label: "Sim", valor: 1 }],
      },
      {
        label: "Idade",
        opcoes: [
          { label: "3-14 anos", valor: 1 },
          { label: "15-44 anos", valor: 0 },
          { label: "≥ 45 anos", valor: -1 },
        ],
      },
    ],
    interpretar: (total) =>
      total <= 1
        ? "Baixo risco — sem indicação de teste/antibiótico"
        : total <= 3
          ? "Risco intermediário — considerar teste rápido"
          : "Alto risco — considerar antibiótico empírico ou teste",
  },
  {
    key: "wells-tvp",
    nome: "Wells (TVP)",
    descricao: "Probabilidade clínica de trombose venosa profunda.",
    campos: [
      { label: "Câncer ativo", opcoes: [{ label: "Não", valor: 0 }, { label: "Sim", valor: 1 }] },
      {
        label: "Paralisia/paresia ou imobilização recente de MI",
        opcoes: [{ label: "Não", valor: 0 }, { label: "Sim", valor: 1 }],
      },
      {
        label: "Acamado > 3 dias ou cirurgia de grande porte < 12 semanas",
        opcoes: [{ label: "Não", valor: 0 }, { label: "Sim", valor: 1 }],
      },
      {
        label: "Dor localizada ao longo do sistema venoso profundo",
        opcoes: [{ label: "Não", valor: 0 }, { label: "Sim", valor: 1 }],
      },
      { label: "Edema de todo o membro", opcoes: [{ label: "Não", valor: 0 }, { label: "Sim", valor: 1 }] },
      {
        label: "Panturrilha com edema > 3cm vs. contralateral",
        opcoes: [{ label: "Não", valor: 0 }, { label: "Sim", valor: 1 }],
      },
      {
        label: "Edema depressível (cacifo) restrito à perna sintomática",
        opcoes: [{ label: "Não", valor: 0 }, { label: "Sim", valor: 1 }],
      },
      {
        label: "Veias colaterais superficiais não varicosas",
        opcoes: [{ label: "Não", valor: 0 }, { label: "Sim", valor: 1 }],
      },
      {
        label: "Diagnóstico alternativo tão ou mais provável que TVP",
        opcoes: [{ label: "Não", valor: 0 }, { label: "Sim", valor: -2 }],
      },
    ],
    interpretar: (total) =>
      total >= 2
        ? "TVP provável — considerar exame de imagem (USG doppler)"
        : "TVP improvável — considerar D-dímero",
  },
];

export function Scores() {
  const [aberto, setAberto] = useState(null);

  return (
    <AppLayout>
      <div className="scores-page">
        <h1>Scores clínicos</h1>
        <p className="descricao">
          Calculadoras de referência para uso durante a consulta. Os resultados são um apoio à
          decisão — a interpretação clínica final é sempre do médico.
        </p>

        <div className="lista-scores">
          {SCORES.map((score) => (
            <ScoreCard
              key={score.key}
              score={score}
              aberto={aberto === score.key}
              onToggle={() => setAberto(aberto === score.key ? null : score.key)}
            />
          ))}
        </div>
      </div>
    </AppLayout>
  );
}

function ScoreCard({ score, aberto, onToggle }) {
  const [respostas, setRespostas] = useState({});

  const total = score.campos.reduce((acc, _campo, i) => acc + (respostas[i] ?? 0), 0);
  const todasRespondidas = score.campos.every((_campo, i) => respostas[i] !== undefined);

  return (
    <div className="score-card">
      <button className="score-header" onClick={onToggle}>
        <div>
          <div className="score-nome">{score.nome}</div>
          <div className="score-descricao">{score.descricao}</div>
        </div>
        <span className="score-toggle">{aberto ? "−" : "+"}</span>
      </button>

      {aberto && (
        <div className="score-body">
          {score.campos.map((campo, i) => (
            <div className="score-campo" key={i}>
              <label>{campo.label}</label>
              <div className="score-opcoes">
                {campo.opcoes.map((opcao) => (
                  <button
                    key={opcao.label}
                    className={`score-opcao${respostas[i] === opcao.valor ? " selecionada" : ""}`}
                    onClick={() => setRespostas((r) => ({ ...r, [i]: opcao.valor }))}
                  >
                    {opcao.label}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div className="score-resultado">
            <div className="score-total">Total: {todasRespondidas ? total : "—"}</div>
            {todasRespondidas && <div className="score-interpretacao">{score.interpretar(total)}</div>}
          </div>
        </div>
      )}
    </div>
  );
}
