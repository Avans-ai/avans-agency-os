-- PREPARED ONLY. Not applied. Review against a restored non-production database.
-- Reuses client_competitors, benchmark_snapshots, benchmark_scan_configs and
-- document_change_proposals. Canonical sources replace parallel document stores.
begin;

create unique index clients_org_id_uq on public.clients(organization_id,id);
create unique index competitors_org_client_id_uq on public.client_competitors(organization_id,client_id,id);
create unique index documents_org_client_id_uq on public.documents(organization_id,client_id,id);
create unique index proposals_org_client_id_uq on public.document_change_proposals(organization_id,client_id,id);

create table public.questionnaire_templates (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 name text not null, version integer not null check(version>0), sections jsonb not null,
 created_at timestamptz not null default now(), unique(organization_id,name,version),unique(organization_id,id),
 check(jsonb_typeof(sections)='array')
);
create table public.knowledge_sources (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 client_id uuid, type text not null check(type in ('questionnaire','meeting-smart-note','meeting-transcript','meeting-manual-note','document','catalog','brochure','website','drive-file','calendar-event','manual','benchmark-scan','platform')),
 title text not null, provider text not null default 'manual', external_id text,external_url text,mime_type text,
 occurred_at timestamptz, imported_at timestamptz not null default now(),imported_by uuid references public.profiles(id),
 content_hash text, status text not null default 'pending' check(status in ('pending','imported','processing','processed','needs-review','failed')),
 raw_text text, metadata jsonb not null default '{}',version integer not null default 1 check(version>0),
 visibility text not null default 'managers' check(visibility in ('team','managers')),
 validation_status text not null default 'draft',demo boolean not null default false,last_synced_at timestamptz,error_code text,
 foreign key(organization_id,client_id) references public.clients(organization_id,id) on delete cascade,
 unique(organization_id,id),unique(organization_id,client_id,id)
);
create index knowledge_sources_client_status_idx on public.knowledge_sources(organization_id,client_id,status);
create unique index knowledge_sources_external_uq on public.knowledge_sources(organization_id,provider,external_id) where external_id is not null and external_id<>'';
create index knowledge_sources_content_hash_idx on public.knowledge_sources(organization_id,content_hash) where content_hash is not null;

create table public.client_discoveries (
 id uuid primary key default gen_random_uuid(),organization_id uuid not null,client_id uuid not null,
 -- Sources are references to knowledge_sources, never embedded duplicates.
 payload jsonb not null default '{}',revision bigint not null default 0,
 updated_at timestamptz not null default now(),updated_by uuid references public.profiles(id),
 foreign key(organization_id,client_id) references public.clients(organization_id,id) on delete cascade,
 unique(organization_id,client_id),check(not(payload ? 'sources'))
);
create table public.questionnaire_instances (
 id uuid primary key default gen_random_uuid(),organization_id uuid not null,client_id uuid not null,template_id uuid not null,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 foreign key(organization_id,client_id) references public.clients(organization_id,id) on delete cascade,
 foreign key(organization_id,template_id) references public.questionnaire_templates(organization_id,id),
 unique(organization_id,client_id,id)
);
create table public.questionnaire_responses (
 id uuid primary key default gen_random_uuid(),organization_id uuid not null,client_id uuid not null,instance_id uuid not null,
 question_id text not null,value jsonb,status text not null default 'draft' check(status in ('unanswered','draft','answered','validated')),
 source_id uuid,source_reference text,publication_permission text not null default 'pending' check(publication_permission in ('pending','public','confidential')),
 clarification text,updated_at timestamptz not null default now(),updated_by uuid references public.profiles(id),
 foreign key(organization_id,client_id,instance_id) references public.questionnaire_instances(organization_id,client_id,id) on delete cascade,
 foreign key(organization_id,client_id,source_id) references public.knowledge_sources(organization_id,client_id,id),
 unique(instance_id,question_id)
);

-- OAuth material is never exposed through public/PostgREST.
create table private.workspace_connections (
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id) on delete cascade,
 account_email text not null,status text not null default 'not-connected',scopes text[] not null default '{}',
 token_ciphertext bytea,encryption_key_id text,expires_at timestamptz,connected_by uuid references public.profiles(id),
 connected_at timestamptz,last_synced_at timestamptz,revoked_at timestamptz,error_code text,
 unique(organization_id,id),check((token_ciphertext is null)=(encryption_key_id is null))
);
create table private.workspace_oauth_sessions (
 state_hash text primary key,organization_id uuid not null references public.organizations(id) on delete cascade,
 user_id uuid not null references public.profiles(id),session_hash text not null,verifier_ciphertext bytea not null,
 expires_at timestamptz not null,consumed_at timestamptz
);
create table private.workspace_subscriptions (
 id uuid primary key default gen_random_uuid(),organization_id uuid not null,connection_id uuid not null,
 name text not null unique,target_resource text not null,pubsub_subscription text not null,event_source text not null,
 expire_time timestamptz not null,status text not null,operation_name text,last_renewed_at timestamptz,error_code text,
 foreign key(organization_id,connection_id) references private.workspace_connections(organization_id,id) on delete cascade,
 unique(organization_id,id)
);
create table private.workspace_events (
 id uuid primary key default gen_random_uuid(),organization_id uuid not null,subscription_id uuid not null,
 workspace_event_id text not null,message_id text not null,event_type text not null,
 received_at timestamptz not null default now(),processed_at timestamptz,status text not null default 'pending',
 lease_until timestamptz,attempts integer not null default 0,error_code text,payload jsonb not null,
 foreign key(organization_id,subscription_id) references private.workspace_subscriptions(organization_id,id),
 unique(organization_id,workspace_event_id),unique(organization_id,message_id)
);
create index workspace_events_pending_idx on private.workspace_events(status,lease_until) where processed_at is null;
create table private.workspace_connection_audit (
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id),
 actor_id uuid references public.profiles(id),action text not null,created_at timestamptz not null default now(),metadata jsonb not null default '{}'
);

create table public.meeting_artifacts (
 id uuid primary key default gen_random_uuid(),organization_id uuid not null,client_id uuid,source_id uuid not null,
 title text not null,occurred_at timestamptz,organizer text,attendees jsonb not null default '[]',
 calendar_event_id text,conference_record_id text,smart_note_name text,document_id text,workspace_event_id text,content_hash text,
 event_url text,document_url text,summary text,decisions jsonb not null default '[]',tasks jsonb not null default '[]',
 association text not null default 'needs-review' check(association in ('automatic','suggested','needs-review','unrelated')),
 association_reason text,candidates jsonb not null default '[]',demo boolean not null default false,
 foreign key(organization_id,client_id) references public.clients(organization_id,id),
 foreign key(organization_id,source_id) references public.knowledge_sources(organization_id,id),
 foreign key(organization_id,client_id,source_id) references public.knowledge_sources(organization_id,client_id,id)
);
create index meeting_artifacts_client_idx on public.meeting_artifacts(organization_id,client_id,occurred_at desc);
create unique index meeting_event_uq on public.meeting_artifacts(organization_id,workspace_event_id) where workspace_event_id is not null;
create unique index meeting_conference_uq on public.meeting_artifacts(organization_id,conference_record_id) where conference_record_id is not null;
create unique index meeting_smart_note_uq on public.meeting_artifacts(organization_id,smart_note_name) where smart_note_name is not null;
create unique index meeting_document_uq on public.meeting_artifacts(organization_id,document_id) where document_id is not null;
create unique index meeting_hash_uq on public.meeting_artifacts(organization_id,content_hash) where content_hash is not null;

alter table public.document_change_proposals alter column document_id drop not null;
alter table public.document_change_proposals add column knowledge_source_id uuid;
alter table public.document_change_proposals add column target_module text check(target_module in ('discovery','benchmark','marketing-plan'));
alter table public.document_change_proposals add column target_section text;
alter table public.document_change_proposals add column operation text not null default 'update' check(operation in ('create','update','append','remove'));
alter table public.document_change_proposals add column confidence numeric check(confidence between 0 and 1);
alter table public.document_change_proposals add column impact text check(impact in ('low','medium','high'));
alter table public.document_change_proposals add column explanation text;
alter table public.document_change_proposals add column dedup_key text;
alter table public.document_change_proposals add column affected_modules text[] not null default '{}';
alter table public.document_change_proposals add constraint proposal_origin_required check(document_id is not null or knowledge_source_id is not null);
alter table public.document_change_proposals add constraint proposal_client_org_fk foreign key(organization_id,client_id) references public.clients(organization_id,id);
alter table public.document_change_proposals add constraint proposal_source_org_client_fk foreign key(organization_id,client_id,knowledge_source_id) references public.knowledge_sources(organization_id,client_id,id);
alter table public.document_change_proposals add constraint proposal_document_org_client_fk foreign key(organization_id,client_id,document_id) references public.documents(organization_id,client_id,id);
create unique index proposal_dedup_uq on public.document_change_proposals(organization_id,client_id,dedup_key) where dedup_key is not null;
create table public.change_proposal_evidence (
 id uuid primary key default gen_random_uuid(),organization_id uuid not null,client_id uuid not null,proposal_id uuid not null,source_id uuid not null,
 excerpt text not null,source_version integer not null,page integer,paragraph integer,speaker text,evidence_timestamp text,
 foreign key(organization_id,client_id,proposal_id) references public.document_change_proposals(organization_id,client_id,id),
 foreign key(organization_id,client_id,source_id) references public.knowledge_sources(organization_id,client_id,id)
);
create index proposal_evidence_proposal_idx on public.change_proposal_evidence(proposal_id);
create table public.knowledge_versions (
 id uuid primary key default gen_random_uuid(),organization_id uuid not null,client_id uuid not null,
 entity_type text not null,entity_id text not null,version integer not null check(version>0),snapshot jsonb not null,
 changed_at timestamptz not null default now(),changed_by uuid references public.profiles(id),source_id uuid,proposal_id uuid,
 foreign key(organization_id,client_id) references public.clients(organization_id,id),
 foreign key(organization_id,client_id,source_id) references public.knowledge_sources(organization_id,client_id,id),
 foreign key(organization_id,client_id,proposal_id) references public.document_change_proposals(organization_id,client_id,id),
 unique(organization_id,client_id,entity_type,entity_id,version)
);
create table public.knowledge_dependencies (
 id uuid primary key default gen_random_uuid(),organization_id uuid not null,client_id uuid not null,
 source_entity_type text not null,source_entity_id text not null,target_entity_type text not null,target_entity_id text not null,
 reason text not null,requires_review boolean not null default false,changed_at timestamptz,reviewed_at timestamptz,reviewed_by uuid references public.profiles(id),
 foreign key(organization_id,client_id) references public.clients(organization_id,id),
 unique(organization_id,client_id,source_entity_type,source_entity_id,target_entity_type,target_entity_id)
);
create index knowledge_dependencies_target_idx on public.knowledge_dependencies(organization_id,client_id,target_entity_type,target_entity_id);

-- Existing competitors become brands, including the client's own baseline.
alter table public.client_competitors add column brand_type text not null default 'direct' check(brand_type in ('own','direct','indirect','reference'));
alter table public.client_competitors add column principal boolean not null default false;
alter table public.client_competitors add column selection jsonb not null default '{}';
alter table public.client_competitors add constraint brand_client_org_fk foreign key(organization_id,client_id) references public.clients(organization_id,id);
create unique index benchmark_own_brand_uq on public.client_competitors(client_id) where brand_type='own';
-- Application enforces <=4 main competitors; serialize client-level selection in the future write RPC.
alter table public.benchmark_snapshots add column captured_by uuid references public.profiles(id);
alter table public.benchmark_snapshots add constraint snapshot_client_org_fk foreign key(organization_id,client_id) references public.clients(organization_id,id);
alter table public.benchmark_snapshots add constraint snapshot_brand_org_client_fk foreign key(organization_id,client_id,competitor_id) references public.client_competitors(organization_id,client_id,id);
create index benchmark_snapshots_history_idx on public.benchmark_snapshots(organization_id,client_id,competitor_id,captured_at desc);
alter table public.benchmark_scan_configs add column job_status text not null default 'pending-configuration';
alter table public.benchmark_scan_configs add column last_run_at timestamptz;
alter table public.benchmark_scan_configs add column error_code text;
create table public.benchmark_analysis_items (
 id uuid primary key default gen_random_uuid(),organization_id uuid not null,client_id uuid not null,brand_id uuid not null,
 section text not null check(section in ('overview','content','paid','web','design')),payload jsonb not null,observed_at date,status text not null default 'draft',
 foreign key(organization_id,client_id,brand_id) references public.client_competitors(organization_id,client_id,id),
 unique(organization_id,client_id,id)
);
create table public.benchmark_findings (
 id uuid primary key default gen_random_uuid(),organization_id uuid not null,client_id uuid not null,
 category text not null check(category in ('take','avoid','differentiate')),payload jsonb not null,impacted_services text[] not null default '{}',status text not null default 'draft',
 foreign key(organization_id,client_id) references public.clients(organization_id,id),unique(organization_id,client_id,id)
);
create table public.marketing_plans (
 id uuid primary key default gen_random_uuid(),organization_id uuid not null,client_id uuid not null,
 revision bigint not null default 0,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 foreign key(organization_id,client_id) references public.clients(organization_id,id),unique(organization_id,client_id),unique(organization_id,client_id,id)
);
create table public.marketing_plan_modules (
 id uuid primary key default gen_random_uuid(),organization_id uuid not null,client_id uuid not null,plan_id uuid not null,
 service_id text not null,active boolean not null default true,
 foreign key(organization_id,client_id,plan_id) references public.marketing_plans(organization_id,client_id,id),
 unique(plan_id,service_id),unique(organization_id,client_id,id)
);
create table public.marketing_plan_items (
 id uuid primary key default gen_random_uuid(),organization_id uuid not null,client_id uuid not null,module_id uuid not null,
 section text not null,payload jsonb not null,status text not null default 'draft',updated_at timestamptz not null default now(),
 foreign key(organization_id,client_id,module_id) references public.marketing_plan_modules(organization_id,client_id,id),
 unique(organization_id,client_id,id)
);
-- Many-to-many links share the canonical source table and enforce tenant boundaries.
create table public.knowledge_item_sources (
 id uuid primary key default gen_random_uuid(),organization_id uuid not null,client_id uuid not null,source_id uuid not null,
 entity_type text not null,entity_id text not null,evidence text,
 foreign key(organization_id,client_id,source_id) references public.knowledge_sources(organization_id,client_id,id),
 unique(organization_id,client_id,entity_type,entity_id,source_id)
);

-- Client-scoped read policies. Writes require a server transaction that also
-- updates versions, dependencies and audit; no browser grants to bypass approval.
do $$ declare t text; begin
 foreach t in array array['client_discoveries','questionnaire_instances','questionnaire_responses','change_proposal_evidence','knowledge_versions','knowledge_dependencies','benchmark_analysis_items','benchmark_findings','marketing_plans','marketing_plan_modules','marketing_plan_items','knowledge_item_sources'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public,anon,authenticated',t);
  execute format('grant select on public.%I to authenticated',t);
  execute format('grant select,insert,update,delete on public.%I to service_role',t);
  execute format('create policy client_managers_read on public.%I for select to authenticated using (private.is_org_member(organization_id) and private.can_manage_client(client_id))',t);
  execute format('create index %I on public.%I(organization_id,client_id)',t||'_tenant_idx',t);
 end loop;
 foreach t in array array['workspace_connections','workspace_oauth_sessions','workspace_subscriptions','workspace_events','workspace_connection_audit'] loop
  execute format('alter table private.%I enable row level security',t);
  execute format('revoke all on private.%I from public,anon,authenticated',t);
  execute format('grant select,insert,update,delete on private.%I to service_role',t);
 end loop;
end $$;
alter table public.questionnaire_templates enable row level security;
revoke all on public.questionnaire_templates from public,anon,authenticated;
grant select on public.questionnaire_templates to authenticated;
grant all on public.questionnaire_templates to service_role;
create policy template_members_read on public.questionnaire_templates for select to authenticated using(private.is_org_member(organization_id));
alter table public.knowledge_sources enable row level security;
alter table public.meeting_artifacts enable row level security;
revoke all on public.knowledge_sources,public.meeting_artifacts from public,anon,authenticated;
grant select on public.knowledge_sources,public.meeting_artifacts to authenticated;
grant all on public.knowledge_sources,public.meeting_artifacts to service_role;
create policy source_authorized_read on public.knowledge_sources for select to authenticated using(
 private.is_org_member(organization_id) and (
  (client_id is not null and (private.can_manage_client(client_id) or (visibility='team' and private.is_client_assigned(client_id))))
  or (client_id is null and private.member_has_role(organization_id,array['admin'::public.member_role,'project_manager'::public.member_role]))
 )
);
create policy meeting_managers_read on public.meeting_artifacts for select to authenticated using(
 private.is_org_member(organization_id) and (
  (client_id is not null and private.can_manage_client(client_id))
  or (client_id is null and private.member_has_role(organization_id,array['admin'::public.member_role,'project_manager'::public.member_role]))
 )
);
-- Existing permissive policies must not leak proposal evidence or allow applying
-- changes without the future atomic approval service.
drop policy if exists document_change_proposals_select on public.document_change_proposals;
drop policy if exists document_change_proposals_manage on public.document_change_proposals;
revoke all on public.document_change_proposals from anon,authenticated;
grant select on public.document_change_proposals to authenticated;
create policy proposal_managers_read on public.document_change_proposals for select to authenticated using(private.is_org_member(organization_id) and private.can_manage_client(client_id));
revoke update,delete on public.knowledge_versions,public.benchmark_snapshots from authenticated;

comment on table public.knowledge_sources is 'Canonical knowledge source. Never store OAuth secrets or apply unreviewed document instructions.';
comment on table private.workspace_connections is 'Server-only ciphertext using a managed encryption key; no browser grants.';
comment on table public.knowledge_versions is 'Immutable application history. Server approval transaction writes revisions and dependency review flags atomically.';
commit;
