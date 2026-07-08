-- ============================================
-- MedScribe AI — Schema (MVP) — já aplicado no Supabase
-- Projeto: cqjovptfsvuhrrfvlaai
-- ============================================

create table medicos (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid references auth.users(id) not null,
  nome text not null,
  crm text not null,
  uf_crm text not null,
  especialidade text,
  created_at timestamptz default now()
);

create table pacientes (
  id uuid primary key default gen_random_uuid(),
  medico_id uuid references medicos(id) not null,
  nome text not null,
  cpf text,
  data_nascimento date,
  sexo text,
  telefone text,
  created_at timestamptz default now()
);

create table consultas (
  id uuid primary key default gen_random_uuid(),
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

create index idx_consultas_medico on consultas(medico_id);
create index idx_consultas_paciente on consultas(paciente_id);
create index idx_pacientes_medico on pacientes(medico_id);

-- RLS
alter table medicos enable row level security;
alter table pacientes enable row level security;
alter table consultas enable row level security;
alter table transcricoes enable row level security;
alter table anamneses enable row level security;
alter table documentos enable row level security;
alter table protocolos enable row level security;

-- Só SELECT: médicos são provisionados manualmente (via SQL editor / dashboard),
-- não há auto-cadastro no app, então não existe policy de insert/update aqui de propósito.
create policy "medico_ve_a_si_mesmo" on medicos
  for select using (auth_user_id = auth.uid());

create policy "medico_ve_seus_pacientes" on pacientes
  for all using (medico_id in (select id from medicos where auth_user_id = auth.uid()));

create policy "medico_ve_suas_consultas" on consultas
  for all using (medico_id in (select id from medicos where auth_user_id = auth.uid()));

create policy "medico_ve_suas_transcricoes" on transcricoes
  for all using (
    consulta_id in (
      select id from consultas where medico_id in (
        select id from medicos where auth_user_id = auth.uid()
      )
    )
  );

create policy "medico_ve_suas_anamneses" on anamneses
  for all using (
    consulta_id in (
      select id from consultas where medico_id in (
        select id from medicos where auth_user_id = auth.uid()
      )
    )
  );

create policy "medico_ve_seus_documentos" on documentos
  for all using (
    consulta_id in (
      select id from consultas where medico_id in (
        select id from medicos where auth_user_id = auth.uid()
      )
    )
  );

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
