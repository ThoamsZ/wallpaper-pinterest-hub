-- Create moderation tables for upload and delete workflows

-- 1) Upload requests (creator -> admin approval -> publish to bucket and wallpapers table)
create table if not exists public.upload_requests (
  id uuid primary key default gen_random_uuid(),
  requested_by uuid not null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  status text not null default 'pending', -- pending | approved | rejected
  approved_by uuid,
  approved_at timestamptz,
  type text not null,
  tags text[],
  original_filename text,
  mime_type text,
  bytes bigint,
  staging_key text not null, -- key in a private staging bucket or private path
  final_key text,            -- key in the public bucket after approval
  r2_bucket text,            -- optional: bucket name used for staging
  message text,
  reject_reason text,
  uploaded_wallpaper_id uuid -- reference to wallpapers.id after approval (not FK to avoid RLS recursion)
);

alter table public.upload_requests enable row level security;

-- Allowed status values
create or replace function public.valid_upload_request_status(_status text)
returns boolean language sql immutable as $$
  select _status in ('pending','approved','rejected')
$$;

create or replace function public.ensure_valid_upload_request_status()
returns trigger language plpgsql as $$
begin
  if not public.valid_upload_request_status(new.status) then
    raise exception 'Invalid status % for upload_requests', new.status;
  end if;
  return new;
end;$$;

create trigger trg_upload_requests_status_check
before insert or update on public.upload_requests
for each row execute function public.ensure_valid_upload_request_status();

-- RLS policies
create policy "Creators can create their own upload requests"
  on public.upload_requests for insert
  with check (auth.uid() = requested_by);

create policy "Creators can view their own upload requests"
  on public.upload_requests for select
  using (auth.uid() = requested_by);

create policy "Admins can view all upload requests"
  on public.upload_requests for select
  using (is_admin());

create policy "Admins can update upload requests (approve/reject)"
  on public.upload_requests for update
  using (is_admin());

create policy "Admins can delete upload requests"
  on public.upload_requests for delete
  using (is_admin());

create index if not exists idx_upload_requests_status on public.upload_requests(status);
create index if not exists idx_upload_requests_requested_by on public.upload_requests(requested_by);
create index if not exists idx_upload_requests_created_at on public.upload_requests(created_at desc);


-- 2) Delete requests (creator -> admin approval -> delete from bucket)
create table if not exists public.delete_requests (
  id uuid primary key default gen_random_uuid(),
  requested_by uuid not null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  status text not null default 'pending', -- pending | approved | rejected
  approved_by uuid,
  approved_at timestamptz,
  wallpaper_id uuid not null,
  r2_key text not null,
  r2_bucket text,
  reason text,
  final_deleted boolean not null default false
);

alter table public.delete_requests enable row level security;

create or replace function public.valid_delete_request_status(_status text)
returns boolean language sql immutable as $$
  select _status in ('pending','approved','rejected')
$$;

create or replace function public.ensure_valid_delete_request_status()
returns trigger language plpgsql as $$
begin
  if not public.valid_delete_request_status(new.status) then
    raise exception 'Invalid status % for delete_requests', new.status;
  end if;
  return new;
end;$$;

create trigger trg_delete_requests_status_check
before insert or update on public.delete_requests
for each row execute function public.ensure_valid_delete_request_status();

-- RLS policies
create policy "Creators can create their own delete requests"
  on public.delete_requests for insert
  with check (auth.uid() = requested_by);

create policy "Creators can view their own delete requests"
  on public.delete_requests for select
  using (auth.uid() = requested_by);

create policy "Admins can view all delete requests"
  on public.delete_requests for select
  using (is_admin());

create policy "Admins can update delete requests (approve/reject)"
  on public.delete_requests for update
  using (is_admin());

create policy "Admins can delete delete requests"
  on public.delete_requests for delete
  using (is_admin());

create index if not exists idx_delete_requests_status on public.delete_requests(status);
create index if not exists idx_delete_requests_requested_by on public.delete_requests(requested_by);
create index if not exists idx_delete_requests_created_at on public.delete_requests(created_at desc);
