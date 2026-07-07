# MedScribe AI — Contexto para o Claude Code

## O que já existe

- **Supabase configurado** (projeto próprio "Medscribe", conta separada de Campo na Mão/Mercado Control)
  - URL: `https://cqjovptfsvuhrrfvlaai.supabase.co`
  - Publishable key: `sb_publishable_uqaYECjQmq6u_fZdMQ5d3w_byRhIvFf`
  - Schema completo já aplicado (ver `schema_medscribe.sql`): tabelas `medicos`, `pacientes`, `consultas`, `transcricoes`, `anamneses`, com RLS configurado
  - Bucket de Storage `audios-consulta` (privado) criado, com policy de RLS
  - Auth habilitado (e-mail/senha), 1 médico de teste já cadastrado

## Protótipos já validados (HTML/JS standalone, funcionando com o Supabase real)

1. `medscribe_consultas.html` — login do médico + lista de consultas + criação de nova consulta (cadastra/busca paciente, cria linha em `consultas`, redireciona pra consentimento)
2. `medscribe_consentimento.html` — tela voltada ao paciente, salva `consentimento_paciente`/`consentimento_data` na consulta
3. `medscribe_gravacao_consulta.html` — gravação de áudio + transcrição ao vivo (Web Speech API, pt-BR) + estruturação automática da anamnese via chamada à API do Claude a cada ~15s de fala

**Importante:** esses 3 arquivos são protótipos funcionais em HTML/JS puro, pensados pra validar a lógica rápido. Ainda não estão integrados como um app único (a navegação entre eles hoje é via redirect de URL com `?consulta_id=...`). O objetivo é usá-los como referência de comportamento/lógica pra reconstruir como app React de verdade.

## O que pedir ao Claude Code

1. Criar um projeto React (Vite) novo, estrutura de rotas:
   - `/login`
   - `/consultas` (lista + nova consulta)
   - `/consulta/:id/consentimento`
   - `/consulta/:id/gravacao`
2. Portar a lógica dos 3 arquivos HTML pra componentes React, usando `@supabase/supabase-js` como client (mesmas credenciais acima)
3. Reaproveitar o schema SQL como está — não precisa recriar nada no banco
4. Seguir os tokens de design usados nos protótipos (cores, tipografia) como ponto de partida visual: fundo `#F5F6F4`, tinta `#1C2B33`, verde clínico `#3A7D66` como cor de ação/gravação, tipografia Space Grotesk (labels/UI) + Source Serif 4 (transcrição/conteúdo humano) + IBM Plex Mono (dados/timer)
5. Próxima tela a construir depois da migração: **visualização/edição da anamnese finalizada** (consulta com status `finalizada`)

## Documento de referência completo

`MedScribe_AI_Projeto.md` — análise competitiva, contexto regulatório (CFM 2.454/2026, LGPD, ANVISA), roadmap em 4 fases.
