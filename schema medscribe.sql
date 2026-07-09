-- ============================================
-- MedScribe AI — Schema (MVP + CRM multi-clínica) — já aplicado no Supabase
-- Projeto: cqjovptfsvuhrrfvlaai
-- ============================================

create table clinicas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  created_at timestamptz default now()
);

create table medicos (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid references auth.users(id) not null,
  clinica_id uuid references clinicas(id),
  nome text not null,
  crm text not null,
  uf_crm text not null,
  especialidade text,
  created_at timestamptz default now()
);

-- Membros da clínica (admin | medico | recepcao). medico_id é preenchido quando
-- o membro também tem registro em `medicos` (admin ou médico); recepção não tem.
create table membros_clinica (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid references clinicas(id) not null,
  auth_user_id uuid references auth.users(id) not null,
  papel text not null default 'medico', -- admin | medico | recepcao
  medico_id uuid references medicos(id),
  email text,
  created_at timestamptz default now(),
  unique (clinica_id, auth_user_id)
);

create table pacientes (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid references clinicas(id),
  medico_id uuid references medicos(id) not null, -- médico responsável (histórico); acesso agora é por clínica
  nome text not null,
  cpf text,
  data_nascimento date,
  sexo text,
  telefone text,
  created_at timestamptz default now()
);

create table consultas (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid references clinicas(id),
  medico_id uuid references medicos(id) not null,
  paciente_id uuid references pacientes(id) not null,
  data_consulta timestamptz default now(),
  status text default 'em_andamento', -- em_andamento | finalizada | cancelada
  consentimento_paciente boolean default false,
  consentimento_data timestamptz,
  audio_retido boolean default false,
  audio_storage_path text,
  ia_utilizada boolean default true,
  created_at timestamptz default now()
);

create table transcricoes (
  id uuid primary key default gen_random_uuid(),
  consulta_id uuid references consultas(id) not null,
  texto_bruto text,
  created_at timestamptz default now()
);

create table anamneses (
  id uuid primary key default gen_random_uuid(),
  consulta_id uuid references consultas(id) not null,
  queixa_principal text,
  historia_doenca_atual text,
  antecedentes_pessoais text,
  antecedentes_familiares text,
  exame_fisico text,
  hipotese_diagnostica text,
  conduta text,
  sugestao_ia_conduta text,
  sugestao_ia_diagnostico_diferencial text,
  alertas_seguranca text, -- risco de interação medicamentosa, alergia ou contraindicação identificado pela IA
  validado_pelo_medico boolean default false,
  validado_em timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table documentos (
  id uuid primary key default gen_random_uuid(),
  consulta_id uuid references consultas(id) not null,
  tipo text not null, -- atestado | receita | pedido_exame | carta_encaminhamento
  conteudo text not null,
  emitido boolean default false,
  emitido_em timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table protocolos (
  id uuid primary key default gen_random_uuid(),
  medico_id uuid references medicos(id) not null,
  condicao text not null,
  conteudo text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table agendamentos (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid references clinicas(id),
  medico_id uuid references medicos(id) not null,
  paciente_id uuid references pacientes(id) not null,
  data_hora timestamptz not null,
  status text default 'agendado', -- agendado | realizado | cancelado
  observacoes text,
  consulta_id uuid references consultas(id),
  created_at timestamptz default now()
);

create index idx_consultas_medico on consultas(medico_id);
create index idx_consultas_paciente on consultas(paciente_id);
create index idx_pacientes_medico on pacientes(medico_id);
create index idx_membros_clinica_user on membros_clinica(auth_user_id);

-- RLS
alter table clinicas enable row level security;
alter table medicos enable row level security;
alter table membros_clinica enable row level security;
alter table pacientes enable row level security;
alter table consultas enable row level security;
alter table transcricoes enable row level security;
alter table anamneses enable row level security;
alter table documentos enable row level security;
alter table protocolos enable row level security;
alter table agendamentos enable row level security;

-- Funções SECURITY DEFINER: evitam recursão infinita nas policies (uma policy
-- de membros_clinica que faz subquery direta em membros_clinica reaplica a si
-- mesma indefinidamente). Rodando com privilégio elevado, essas funções leem
-- membros_clinica sem passar pela RLS de novo.
create or replace function minhas_clinicas()
returns setof uuid
language sql
security definer
stable
as $$
  select clinica_id from membros_clinica where auth_user_id = auth.uid();
$$;

create or replace function minhas_clinicas_clinicas()
returns setof uuid
language sql
security definer
stable
as $$
  select clinica_id from membros_clinica where auth_user_id = auth.uid() and papel in ('admin', 'medico');
$$;

create or replace function minhas_clinicas_admin()
returns setof uuid
language sql
security definer
stable
as $$
  select clinica_id from membros_clinica where auth_user_id = auth.uid() and papel = 'admin';
$$;

-- Gestão de clínicas/membros é feita via SQL editor por enquanto (sem tela de
-- convite/self-service ainda), por isso só há policy de SELECT nessas duas.
create policy "membro_ve_sua_clinica" on clinicas
  for select using (id in (select minhas_clinicas()));

create policy "admin_atualiza_sua_clinica" on clinicas
  for update using (id in (select minhas_clinicas_admin()));

create policy "membro_ve_membros_da_clinica" on membros_clinica
  for select using (auth_user_id = auth.uid() or clinica_id in (select minhas_clinicas()));

create policy "admin_remove_membros_da_clinica" on membros_clinica
  for delete using (clinica_id in (select minhas_clinicas_admin()));

-- Médicos: cada um vê a si mesmo, e também os demais médicos da mesma clínica
-- (útil pra recepção/agenda mostrar o nome de qualquer médico da clínica).
create policy "medico_ve_a_si_mesmo" on medicos
  for select using (auth_user_id = auth.uid() or clinica_id in (select minhas_clinicas()));

-- Pacientes e agendamentos: qualquer membro da clínica (admin, médico ou
-- recepção) pode ver/gerenciar — recepção precisa disso pro dia a dia.
create policy "membro_ve_pacientes_da_clinica" on pacientes
  for all using (clinica_id in (select minhas_clinicas()));

create policy "membro_ve_agendamentos_da_clinica" on agendamentos
  for all using (clinica_id in (select minhas_clinicas()));

-- Consultas: mesma regra (recepção precisa ver status/horário pra agenda),
-- mas o conteúdo clínico (anamnese/transcrição/documentos) abaixo é
-- restrito a admin/médico.
create policy "membro_ve_consultas_da_clinica" on consultas
  for all using (clinica_id in (select minhas_clinicas()));

create policy "clinico_ve_transcricoes_da_clinica" on transcricoes
  for all using (
    consulta_id in (select id from consultas where clinica_id in (select minhas_clinicas_clinicas()))
  );

create policy "clinico_ve_anamneses_da_clinica" on anamneses
  for all using (
    consulta_id in (select id from consultas where clinica_id in (select minhas_clinicas_clinicas()))
  );

create policy "clinico_ve_documentos_da_clinica" on documentos
  for all using (
    consulta_id in (select id from consultas where clinica_id in (select minhas_clinicas_clinicas()))
  );

-- Protocolos continuam pessoais do médico (preferência individual de conduta),
-- não compartilhados pela clínica.
create policy "medico_ve_seus_protocolos" on protocolos
  for all using (medico_id in (select id from medicos where auth_user_id = auth.uid()));

-- Storage: bucket 'audios-consulta' (privado)
create policy "medico_acessa_seus_audios"
on storage.objects
for all
using (
  bucket_id = 'audios-consulta'
  and (storage.foldername(name))[1] in (
    select id::text from medicos where auth_user_id = auth.uid()
  )
);
