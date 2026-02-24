create table if not exists public.canvas_documents (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  page_global integer not null,
  schema_version integer not null default 1,
  document jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_id, page_global)
);

create table if not exists public.canvas_document_ops (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.canvas_documents(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  page_global integer not null,
  operation_type text not null,
  operation_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_canvas_documents_course_page on public.canvas_documents(course_id, page_global);
create index if not exists idx_canvas_document_ops_document_created on public.canvas_document_ops(document_id, created_at desc);
create index if not exists idx_canvas_document_ops_course_page_created on public.canvas_document_ops(course_id, page_global, created_at desc);

create or replace function public.set_canvas_documents_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_canvas_documents_updated_at on public.canvas_documents;
create trigger trg_canvas_documents_updated_at
before update on public.canvas_documents
for each row
execute function public.set_canvas_documents_updated_at();