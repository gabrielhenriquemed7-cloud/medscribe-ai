# MedScribe AI — Documento de Estruturação do Projeto

## 1. Visão do produto

Plataforma de IA para consultórios que escuta a conversa entre médico e paciente, transcreve em tempo real, estrutura a anamnese/evolução no formato clínico (SOAP ou similar) e sugere condutas/tratamento — com o médico sempre como validador final do conteúdo.

---

## 2. Panorama competitivo (o que já existe no mercado)

### Players internacionais (enterprise)
| Ferramenta | Perfil | Diferencial | Ponto fraco |
|---|---|---|---|
| **Nabla** | Mid-market a enterprise, 85 mil+ clínicos, 150+ orgs | Modelo próprio (não é wrapper de LLM), não guarda áudio/transcrição, 20+ integrações EHR, "Nabla Connect" para embutir em qualquer EHR | Sem CDS (apoio à decisão clínica) nativo; coding ainda incompleto |
| **Abridge** | Enterprise puro (Mayo, Hopkins, UPMC) | "Linked evidence" — cada trecho da nota linka ao áudio/transcrição original; processamento em tempo real durante a consulta | Sem self-serve, ~US$208/mês/médico, sem funções pré-consulta |
| **DAX Copilot (Microsoft/Nuance)** | Enterprise, ecossistema Epic/Azure | Integração nativa Epic, certificação HITRUST | Caro (US$444–1.500/mês), setup de semanas, sem ganho estatístico significativo de tempo em estudo da UCLA |
| **Ambience Healthcare** | Enterprise, foco em coding de risco (HCC/E&M) | Ganho comprovado de receita por acurácia de codificação (~US$13k/médico/ano em estudo KLAS) | Só enterprise, sem preço público |
| **DeepScribe** | Enterprise, especialidades complexas | Camada de revisão humana antes de liberar a nota (QA híbrido) | Processo mais lento (horas), caro |

### Players self-serve / mais leves
| Ferramenta | Perfil | Diferencial |
|---|---|---|
| **Heidi Health** | Free tier permanente, 110+ idiomas | Forte em multilíngue, setup em minutos |
| **Freed AI** | US$39–119/mês | Simplicidade, foco em prática solo |
| **Suki AI** | Enterprise, comando de voz | Camada de interação por voz com o EHR, 80+ idiomas |

### Brasil (mercado local, ainda pouco consolidado)
- **Doclin** — transcrição em tempo real, nota SOAP, conformidade LGPD, descarte de áudio pós-processamento, foco 100% português.
- **Amplimed, ProDoctor, GestãoDS, Doctorflow, Scriba, Dr. Assistente** — a maioria são sistemas de gestão de clínica (agenda/financeiro/prontuário) que *adicionaram* transcrição como recurso extra via parceria, e não plataformas nascidas para isso.
- Praticamente nenhum concorrente brasileiro oferece **copiloto clínico com sugestão de conduta** de forma robusta — a maior parte fica só na transcrição + estruturação de prontuário.

### O que isso indica para o MedScribe AI
1. O mercado internacional já resolveu bem a transcrição básica — **essa parte sozinha não é mais diferencial**.
2. **Sugestão de conduta/tratamento (copiloto clínico)** é onde há menos concorrência madura, especialmente em português e adaptado às diretrizes/protocolos brasileiros.
3. **Conformidade regulatória local** (ver seção 3) é uma barreira de entrada real — poucos concorrentes internacionais tratam isso bem, e é uma oportunidade de diferenciação para um produto nascido no Brasil.

---

## 3. Contexto regulatório no Brasil (obrigatório para o roadmap)

- **Resolução CFM nº 2.454/2026** — regula uso de IA na prática médica: a IA deve ser **ferramenta de apoio**, o médico é sempre responsável final pela decisão clínica; é **vedado** delegar à IA a comunicação de diagnóstico/prognóstico/conduta sem mediação humana; o uso de IA deve constar no prontuário; paciente deve ser informado do uso.
- **LGPD** — dado de saúde é dado sensível; exige base legal, criptografia, controle de acesso, e **consentimento registrado do paciente** para gravação de áudio da consulta.
- **ANVISA RDC 657/2022** — pode enquadrar o software como SaMD (Software as a Medical Device) *se* houver função diagnóstica/terapêutica autônoma — importante desenhar o produto para ficar claramente como "apoio à decisão", não decisão autônoma, evitando enquadramento mais pesado no início.
- **PL 2.338/2023 (Marco Legal da IA)** — ainda em tramitação, classifica aplicações de IA em saúde como alto risco. Vale acompanhar, mas não bloqueia o desenvolvimento agora.

**Implicação prática de produto:** desde o MVP, o MedScribe AI precisa ter (a) tela de consentimento do paciente antes de gravar, (b) descarte ou retenção configurável do áudio, (c) toda sugestão de IA claramente marcada como "sugestão para revisão do médico" e nunca inserida automaticamente sem validação.

---

## 4. Proposta de diferenciação do MedScribe AI

1. **Português nativo + protocolos clínicos brasileiros** (SUS, diretrizes CFM/sociedades brasileiras) em vez de tradução de ferramenta americana.
2. **Copiloto de conduta mais robusto** que a média dos concorrentes brasileiros — sugestão de exames, diagnóstico diferencial e conduta terapêutica, sempre como rascunho editável.
3. **Compliance-first** — consentimento do paciente, descarte de áudio configurável e rastro de auditoria já embutidos desde o MVP (não como camada adicionada depois).
4. **Custo acessível para consultório pequeno/solo** — modelo self-serve (como Freed/Heidi), não enterprise-only (como Abridge/DAX), aproveitando o baixo custo de IA por consulta (~US$0,20–0,35 já estimado).

---

## 5. Roadmap em 4 fases

### Fase 1 — MVP (transcrição + anamnese estruturada)
- Gravação de áudio da consulta (consentimento obrigatório do paciente na tela)
- Transcrição em tempo real (português)
- Estruturação automática em campos: queixa principal, HDA, antecedentes, exame físico, hipótese diagnóstica, conduta
- Edição manual pelo médico antes de salvar
- Descarte automático de áudio após geração da nota (padrão), com opção de retenção
- Registro no prontuário do uso de IA (exigência CFM)

### Fase 2 — Prontuário inteligente + geração de documentos
- Histórico longitudinal do paciente
- Geração automática de: atestado, receita (rascunho), pedido de exame, carta de encaminhamento
- Busca e reuso de consultas anteriores do mesmo paciente

### Fase 3 — Copiloto clínico com alertas
- Sugestão de diagnóstico diferencial durante a consulta
- Alertas de interação medicamentosa, alergias, condutas contraindicadas
- Sugestão de exames/condutas com base em protocolos configuráveis

### Fase 4 — Integrações externas + escala comercial
- Integração com sistemas de prontuário eletrônico existentes (API/exportação)
- Multiespecialidade (templates por especialidade)
- Modelo de comercialização SaaS (planos por médico/clínica)

---

## 6. Estimativa de custo (referência já levantada)

- Custo de IA por consulta: **~US$0,20–0,35** (baseado em análise de custo já feita)
- Benchmark de mercado brasileiro para ferramentas similares: **R$200–500/mês** por médico (transcrição/documentação)

---

## 7. Stack técnico sugerido

Reaproveitando a experiência do Campo na Mão e Mercado Control:
- **Frontend:** React (mesmo padrão já validado nos outros projetos)
- **Backend/DB:** Supabase (auth, storage para áudio temporário, banco relacional para prontuário)
- **IA:** API de transcrição (Whisper ou similar) + modelo de linguagem para estruturação/sugestão (Claude API)
- **Hospedagem:** Cloudflare Pages, seguindo o mesmo pipeline de deploy já em uso

---

## 8. Próximos passos sugeridos

1. Validar com você o escopo exato do MVP (quais campos da anamnese são prioridade, se já quer entrar com sugestão de conduta ou deixar 100% só documentação na Fase 1)
2. Desenhar o fluxo de consentimento do paciente (tela + registro)
3. Definir schema inicial do banco (Supabase) para prontuário + consultas
4. Prototipar a tela de gravação + estruturação automática

---

*Documento gerado em 07/07/2026 com base em levantamento de concorrentes (Nabla, Abridge, DAX Copilot, Ambience, DeepScribe, Heidi Health, Freed, Suki) e do cenário regulatório/competitivo brasileiro (Doclin, Amplimed, ProDoctor, GestãoDS, Resolução CFM 2.454/2026, LGPD, ANVISA RDC 657/2022).*
