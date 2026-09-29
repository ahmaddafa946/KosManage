-- Slice 7: payment expansion additive (FR-120..122).
-- ADD qris + payment_reference/payment_url/paid_at. Canonical status/
-- payment_method/payment_date preserved; status trigger untouched.
-- Tenant: SELECT own (incl. history) ONLY. No INSERT/UPDATE/DELETE.
-- Simulation via narrow RPC start_simulated_payment (no client amounts).

-- ---------------------------------------------------------------------------
-- 1. Additive columns
-- ---------------------------------------------------------------------------
alter table public.payments
  add column if not exists payment_reference text check (char_length(payment_reference) <= 120),
  add column if not exists payment_url text check (char_length(payment_url) <= 500),
  add column if not exists paid_at timestamptz null;

-- ---------------------------------------------------------------------------
-- 2. payment_method CHECK: add qris (drop + recreate, same name family)
-- v1 used an inline (unnamed) CHECK; drop generically then add named one.
-- ---------------------------------------------------------------------------
do $$
declare
  v_con text;
begin
  select conname into v_con
    from pg_constraint
   where conrelid = 'public.payments'::regclass
     and pg_get_constraintdef(oid) like '%payment_method%';
  if v_con is not null then
    execute format('alter table public.payments drop constraint %I', v_con);
  end if;
end;
$$;

alter table public.payments
  add constraint payments_payment_method_check
  check (payment_method is null or payment_method in ('cash', 'transfer', 'ewallet', 'qris'));

-- ---------------------------------------------------------------------------
-- 3. Tenant SELECT own incl. history (no active requirement for history)
-- Slice 1 already shipped payments_select_own_tenant with identical
-- semantics; consolidate to a single policy (rename, zero behavior change).
-- ---------------------------------------------------------------------------
drop policy if exists payments_select_own_tenant on public.payments;
drop policy if exists payments_select_tenant_history on public.payments;
create policy payments_select_tenant_history on public.payments
  for select to authenticated
  using (
    exists (
      select 1 from public.tenants t
       where t.id = payments.tenant_id
         and private.is_own_tenant(t.profile_id)
    )
  );

-- Explicitly: NO tenant INSERT / UPDATE / DELETE policies. Tenant mutation
-- goes only through start_simulated_payment below.

-- ---------------------------------------------------------------------------
-- 4. Simulated payment RPC (narrow, DB-authoritative)
-- Input: payment id + chosen method ONLY. Amount/ids/status never trusted.
-- Semantics: full-pay simulation (amount_paid = amount_due, paid_at = now(),
-- payment_date = today, reference SIMULASI-<id8>). Idempotent: already-paid
-- returns current row unchanged. Existing payments_set_status trigger
-- recomputes status (paid) from amount_paid.
-- ---------------------------------------------------------------------------
create or replace function public.start_simulated_payment(
  p_payment_id uuid,
  p_payment_method text
)
returns public.payments
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pay public.payments%rowtype;
  v_tenant_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if p_payment_method not in ('cash', 'transfer', 'ewallet', 'qris') then
    raise exception 'Invalid payment method';
  end if;
  select * into v_pay from public.payments where id = p_payment_id;
  if not found then
    raise exception 'Payment not found';
  end if;
  -- Ownership: payment tenant must be caller's linked tenant (any status,
  -- so history bills remain payable if reopened/partial).
  select t.id into v_tenant_id from public.tenants t
   where t.id = v_pay.tenant_id and t.profile_id = auth.uid();
  if not found then
    raise exception 'Access denied';
  end if;
  -- Idempotent: already fully paid -> return as-is.
  if v_pay.amount_paid >= v_pay.amount_due then
    return v_pay;
  end if;
  update public.payments
     set amount_paid = amount_due,
         paid_at = now(),
         payment_date = current_date,
         payment_method = p_payment_method,
         payment_reference = 'SIMULASI-' || upper(substring(v_pay.id::text, 1, 8)),
         payment_url = null,
         updated_at = now()
   where id = p_payment_id
  returning * into v_pay;
  return v_pay;
end;
$$;

revoke all on function public.start_simulated_payment(uuid, text) from public, anon;
grant execute on function public.start_simulated_payment(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Verification (read-only, run after manual apply)
-- ---------------------------------------------------------------------------
-- -- a. columns exist
-- -- select column_name from information_schema.columns where table_name = 'payments' and column_name in ('payment_reference', 'payment_url', 'paid_at') order by 1;
-- -- b. method check includes qris
-- -- select conname, pg_get_constraintdef(oid) from pg_constraint where conrelid = 'public.payments'::regclass and pg_get_constraintdef(oid) like '%qris%';
-- -- c. status trigger intact
-- -- select tgname from pg_trigger where tgrelid = 'public.payments'::regclass and not tgisinternal order by 1;
-- -- d. policies: owner 4 + tenant select (own_tenant + tenant_history), NO tenant insert/update/delete
-- -- select policyname, cmd from pg_policies where tablename = 'payments' order by 1;
-- -- e. RPC hardened (definer + search_path + grants)
-- -- select proname, prosecdef from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and proname = 'start_simulated_payment';
-- -- f. existing count unchanged
-- -- select count(*) as payments from payments;
