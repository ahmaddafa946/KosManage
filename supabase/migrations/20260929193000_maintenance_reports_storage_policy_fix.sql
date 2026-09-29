-- Slice 6 corrective: qualify Storage object name in tenant policies.
-- Root cause: bare `name` inside EXISTS subqueries that join tenants t
-- resolved to tenants.name (tenant person name), NOT storage.objects.name.
-- Tenant INSERT/SELECT therefore parsed the wrong string for path segments.
-- Fix: every path extraction uses storage.foldername(storage.objects.name).
-- Owner policy gets the same qualification (was unshadowed but bare).
-- Additive policy-only fix: no bucket/schema/data/trigger change.

drop policy if exists maintenance_photo_insert_tenant on storage.objects;
create policy maintenance_photo_insert_tenant on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'maintenance-reports'
    and array_length(storage.foldername(storage.objects.name), 1) = 3
    and exists (
      select 1
        from public.maintenance_reports r
        join public.tenants t on t.id = r.tenant_id
       where r.id::text = (storage.foldername(storage.objects.name))[3]
         and r.property_id::text = (storage.foldername(storage.objects.name))[1]
         and r.tenant_id::text = (storage.foldername(storage.objects.name))[2]
         and t.status = 'active'
         and private.is_own_tenant(t.profile_id)
    )
  );

drop policy if exists maintenance_photo_select_tenant on storage.objects;
create policy maintenance_photo_select_tenant on storage.objects
  for select to authenticated
  using (
    bucket_id = 'maintenance-reports'
    and array_length(storage.foldername(storage.objects.name), 1) = 3
    and exists (
      select 1
        from public.maintenance_reports r
        join public.tenants t on t.id = r.tenant_id
       where r.id::text = (storage.foldername(storage.objects.name))[3]
         and r.property_id::text = (storage.foldername(storage.objects.name))[1]
         and r.tenant_id::text = (storage.foldername(storage.objects.name))[2]
         and t.status = 'active'
         and private.is_own_tenant(t.profile_id)
    )
  );

drop policy if exists maintenance_photo_select_owner on storage.objects;
create policy maintenance_photo_select_owner on storage.objects
  for select to authenticated
  using (
    bucket_id = 'maintenance-reports'
    and array_length(storage.foldername(storage.objects.name), 1) = 3
    and exists (
      select 1
        from public.maintenance_reports r
       where r.id::text = (storage.foldername(storage.objects.name))[3]
         and r.property_id::text = (storage.foldername(storage.objects.name))[1]
         and r.tenant_id::text = (storage.foldername(storage.objects.name))[2]
         and (select private.is_property_owner(r.property_id))
    )
  );

-- ---------------------------------------------------------------------------
-- Live verification (read-only, run after manual apply)
-- ---------------------------------------------------------------------------
-- -- a. all 3 policies reference storage.objects.name; none uses foldername(t.name)
-- -- select policyname from pg_policies
-- --  where schemaname = 'storage' and tablename = 'objects'
-- --    and policyname like 'maintenance_photo_%'
-- --    and (definition like '%storage.foldername(storage.objects.name)%');
-- --    -- expect 3 rows. Then confirm zero bare-name occurrences:
-- -- select policyname, definition from pg_policies
-- --  where schemaname = 'storage' and tablename = 'objects'
-- --    and policyname like 'maintenance_photo_%'
-- --    and definition like '%foldername(name)%'
-- --    and definition not like '%foldername(storage.objects.name)%';
-- --    -- expect 0 rows.
-- -- b. bucket intact: public=false, 5242880, 3 MIMEs
-- -- select id, public, file_size_limit, allowed_mime_types from storage.buckets where id = 'maintenance-reports';
-- -- c. exactly 3 maintenance storage policies, no DELETE/UPDATE
-- -- select policyname, cmd from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname like 'maintenance_photo_%' order by 1;
