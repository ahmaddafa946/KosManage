-- Slice 6: private bucket maintenance-reports + Storage RLS + image_url guard.
-- Additive only. Slice 5 table/policies/triggers/data untouched except the
-- narrow image_url enforcement trigger below.

-- ---------------------------------------------------------------------------
-- 1. Private bucket (idempotent; fail loud on unexpected conflict)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('maintenance-reports', 'maintenance-reports', false, 5242880,
  array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Enforce intended config even if the bucket pre-existed (private, 5MB, images).
update storage.buckets
   set public = false,
       file_size_limit = 5242880,
       allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
 where id = 'maintenance-reports'
   and (public is distinct from false
     or file_size_limit is distinct from 5242880
     or allowed_mime_types is distinct from array['image/jpeg', 'image/png', 'image/webp']);

-- ---------------------------------------------------------------------------
-- 2. Storage RLS on storage.objects (bucket-scoped, operation-specific)
-- Path: {property_id}/{tenant_id}/{report_id}/{filename}.
-- No DELETE policy, no broad UPDATE, no FOR ALL (FR/Slice 6 boundary).
-- ---------------------------------------------------------------------------

-- Tenant INSERT own photo: path segments must match a report owned by the
-- caller through tenants.profile_id = auth.uid() (active tenant).
drop policy if exists maintenance_photo_insert_tenant on storage.objects;
create policy maintenance_photo_insert_tenant on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'maintenance-reports'
    and array_length(storage.foldername(name), 1) = 3
    and exists (
      select 1
        from public.maintenance_reports r
        join public.tenants t on t.id = r.tenant_id
       where r.id::text = (storage.foldername(name))[3]
         and r.property_id::text = (storage.foldername(name))[1]
         and r.tenant_id::text = (storage.foldername(name))[2]
         and t.status = 'active'
         and private.is_own_tenant(t.profile_id)
    )
  );

-- Tenant SELECT own photo (same ownership chain).
drop policy if exists maintenance_photo_select_tenant on storage.objects;
create policy maintenance_photo_select_tenant on storage.objects
  for select to authenticated
  using (
    bucket_id = 'maintenance-reports'
    and array_length(storage.foldername(name), 1) = 3
    and exists (
      select 1
        from public.maintenance_reports r
        join public.tenants t on t.id = r.tenant_id
       where r.id::text = (storage.foldername(name))[3]
         and r.property_id::text = (storage.foldername(name))[1]
         and r.tenant_id::text = (storage.foldername(name))[2]
         and t.status = 'active'
         and private.is_own_tenant(t.profile_id)
    )
  );

-- Owner SELECT photos of reports in owned properties.
drop policy if exists maintenance_photo_select_owner on storage.objects;
create policy maintenance_photo_select_owner on storage.objects
  for select to authenticated
  using (
    bucket_id = 'maintenance-reports'
    and array_length(storage.foldername(name), 1) = 3
    and exists (
      select 1
        from public.maintenance_reports r
       where r.id::text = (storage.foldername(name))[3]
         and r.property_id::text = (storage.foldername(name))[1]
         and r.tenant_id::text = (storage.foldername(name))[2]
         and (select private.is_property_owner(r.property_id))
    )
  );

-- ---------------------------------------------------------------------------
-- 3. image_url guard: NULL or exact prefix property/tenant/report (no URLs)
-- INVOKER, trigger-only, revoked. Attach stays tenant-safe: cannot point at
-- another report/property, cannot inject signed URLs, cannot touch status.
-- ---------------------------------------------------------------------------
create or replace function public.guard_maintenance_image_url()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_prefix text;
begin
  if new.image_url is null then
    return new;
  end if;
  if new.image_url ~* '^https?://' then
    raise exception 'image_url must be a storage object path, not a URL';
  end if;
  if new.image_url like '%..%' then
    raise exception 'image_url must not contain path traversal';
  end if;
  v_prefix := new.property_id::text || '/' || new.tenant_id::text || '/' || new.id::text || '/';
  if left(new.image_url, char_length(v_prefix)) <> v_prefix
     or char_length(new.image_url) <= char_length(v_prefix)
     or new.image_url like '%/%/%/%/%' then
    raise exception 'image_url must be property/tenant/report/filename with non-empty filename';
  end if;
  return new;
end;
$$;

revoke all on function public.guard_maintenance_image_url() from public, anon, authenticated, service_role;

create trigger maintenance_reports_guard_image_url
before insert or update of image_url on public.maintenance_reports
for each row execute function public.guard_maintenance_image_url();

-- ---------------------------------------------------------------------------
-- 4. Verification (read-only, run after manual apply)
-- ---------------------------------------------------------------------------
-- -- a. bucket private + limits
-- -- select id, public, file_size_limit, allowed_mime_types from storage.buckets where id = 'maintenance-reports';
-- -- b. storage policies (expect 3: tenant insert/select + owner select; no delete/update/all)
-- -- select policyname, cmd from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname like 'maintenance_photo_%' order by 1;
-- -- c. Slice 5 policies unchanged (expect 6, no delete)
-- -- select policyname, cmd from pg_policies where tablename = 'maintenance_reports' order by 1;
-- -- d. triggers present (updated_at + integrity + transition + image_url)
-- -- select tgname from pg_trigger where tgrelid = 'public.maintenance_reports'::regclass and not tgisinternal order by 1;
-- -- e. image_url guard hardened (invoker + search_path + revoked)
-- -- select proname, prosecdef from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and proname = 'guard_maintenance_image_url';
