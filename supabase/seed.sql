-- KosManage development seed
-- Dummy data only — no real PII.
--
-- Default demo owner:
--   email:    owner@kosmanage.dev
--   password: KosManage!dev1
--   user id:  a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11
--
-- Requires: migration 20260326000000_init_kosmanage applied.
-- Designed for local Supabase (`supabase db reset`). Remote: create the auth
-- user first (same UUID/email) or adjust :'owner_id' below.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Auth user (local Supabase)
-- ---------------------------------------------------------------------------

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
) values (
  '00000000-0000-0000-0000-000000000000',
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'authenticated',
  'authenticated',
  'owner@kosmanage.dev',
  crypt('KosManage!dev1', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Owner Demo"}'::jsonb,
  now(),
  now(),
  '',
  '',
  '',
  ''
)
on conflict (id) do nothing;

insert into auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
) values (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  format('{"sub":"%s","email":"%s"}', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'owner@kosmanage.dev')::jsonb,
  'email',
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  now(),
  now(),
  now()
)
on conflict do nothing;

-- Profile may already exist via handle_new_user trigger
insert into public.profiles (id, full_name)
values ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Owner Demo')
on conflict (id) do update set full_name = excluded.full_name;

-- ---------------------------------------------------------------------------
-- Property
-- ---------------------------------------------------------------------------

insert into public.properties (id, owner_id, name, address)
values (
  'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'Kos Melati',
  'Jl. Melati No. 10, Bandung'
)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 25 rooms: 21 will be occupied, 3 available, 1 maintenance
-- ---------------------------------------------------------------------------

insert into public.rooms (id, property_id, room_number, floor, price, status, facilities, notes) values
  ('c1000000-0000-4000-8000-000000000001', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '101', 1, 1200000, 'available', 'AC, Kasur, Lemari', null),
  ('c1000000-0000-4000-8000-000000000002', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '102', 1, 1200000, 'available', 'AC, Kasur, Lemari', null),
  ('c1000000-0000-4000-8000-000000000003', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '103', 1, 1100000, 'available', 'Kasur, Lemari', null),
  ('c1000000-0000-4000-8000-000000000004', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '104', 1, 1100000, 'available', 'Kasur, Lemari', null),
  ('c1000000-0000-4000-8000-000000000005', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '105', 1, 1300000, 'available', 'AC, Kasur, Lemari, Meja', null),
  ('c1000000-0000-4000-8000-000000000006', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '201', 2, 1250000, 'available', 'AC, Kasur, Lemari', null),
  ('c1000000-0000-4000-8000-000000000007', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '202', 2, 1250000, 'available', 'AC, Kasur, Lemari', null),
  ('c1000000-0000-4000-8000-000000000008', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '203', 2, 1150000, 'available', 'Kasur, Lemari', null),
  ('c1000000-0000-4000-8000-000000000009', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '204', 2, 1150000, 'available', 'Kasur, Lemari', null),
  ('c1000000-0000-4000-8000-00000000000a', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '205', 2, 1350000, 'available', 'AC, Kasur, Lemari, Meja', null),
  ('c1000000-0000-4000-8000-00000000000b', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '301', 3, 1300000, 'available', 'AC, Kasur, Lemari', null),
  ('c1000000-0000-4000-8000-00000000000c', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '302', 3, 1300000, 'available', 'AC, Kasur, Lemari', null),
  ('c1000000-0000-4000-8000-00000000000d', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '303', 3, 1200000, 'available', 'Kasur, Lemari', null),
  ('c1000000-0000-4000-8000-00000000000e', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '304', 3, 1200000, 'available', 'Kasur, Lemari', null),
  ('c1000000-0000-4000-8000-00000000000f', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '305', 3, 1400000, 'available', 'AC, Kasur, Lemari, Meja', null),
  ('c1000000-0000-4000-8000-000000000010', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '401', 4, 1350000, 'available', 'AC, Kasur, Lemari', null),
  ('c1000000-0000-4000-8000-000000000011', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '402', 4, 1350000, 'available', 'AC, Kasur, Lemari', null),
  ('c1000000-0000-4000-8000-000000000012', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '403', 4, 1250000, 'available', 'Kasur, Lemari', null),
  ('c1000000-0000-4000-8000-000000000013', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '404', 4, 1250000, 'available', 'Kasur, Lemari', null),
  ('c1000000-0000-4000-8000-000000000014', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '405', 4, 1450000, 'available', 'AC, Kasur, Lemari, Meja', null),
  ('c1000000-0000-4000-8000-000000000015', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '501', 5, 1500000, 'available', 'AC, Kasur, Lemari, Meja', null),
  ('c1000000-0000-4000-8000-000000000016', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '502', 5, 1500000, 'available', 'AC, Kasur, Lemari, Meja', null),
  ('c1000000-0000-4000-8000-000000000017', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '503', 5, 1400000, 'available', 'AC, Kasur, Lemari', null),
  ('c1000000-0000-4000-8000-000000000018', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '504', 5, 1400000, 'available', 'AC, Kasur, Lemari', null),
  ('c1000000-0000-4000-8000-000000000019', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'M01', 1, 1000000, 'maintenance', 'Kasur', 'Perbaikan kamar mandi')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 21 active tenants on rooms 101–405 pattern (first 21 non-maintenance rooms)
-- Leave 503, 504 available; M01 maintenance
-- Rooms 1..21 of the 24 non-maintenance = ids ...001 through ...015 (21 rooms)
-- ---------------------------------------------------------------------------

insert into public.tenants (
  id, property_id, room_id, name, phone, email, identity_number,
  start_date, end_date, rent_price, deposit, status, notes
) values
  ('d1000000-0000-4000-8000-000000000001', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c1000000-0000-4000-8000-000000000001', 'Andi Pratama', '081111100001', 'andi@example.com', '3273010101010001', '2025-01-01', null, 1200000, 1200000, 'active', null),
  ('d1000000-0000-4000-8000-000000000002', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c1000000-0000-4000-8000-000000000002', 'Budi Santoso', '081111100002', 'budi@example.com', '3273010101010002', '2025-02-01', null, 1200000, 1200000, 'active', null),
  ('d1000000-0000-4000-8000-000000000003', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c1000000-0000-4000-8000-000000000003', 'Citra Lestari', '081111100003', 'citra@example.com', '3273010101010003', '2025-03-01', null, 1100000, 1100000, 'active', null),
  ('d1000000-0000-4000-8000-000000000004', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c1000000-0000-4000-8000-000000000004', 'Dewi Anggraini', '081111100004', 'dewi@example.com', '3273010101010004', '2025-01-15', null, 1100000, 1100000, 'active', null),
  ('d1000000-0000-4000-8000-000000000005', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c1000000-0000-4000-8000-000000000005', 'Eko Wijaya', '081111100005', 'eko@example.com', '3273010101010005', '2025-04-01', null, 1300000, 1300000, 'active', null),
  ('d1000000-0000-4000-8000-000000000006', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c1000000-0000-4000-8000-000000000006', 'Fajar Nugroho', '081111100006', 'fajar@example.com', '3273010101010006', '2025-05-01', null, 1250000, 1250000, 'active', null),
  ('d1000000-0000-4000-8000-000000000007', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c1000000-0000-4000-8000-000000000007', 'Gita Maharani', '081111100007', 'gita@example.com', '3273010101010007', '2025-02-10', null, 1250000, 1250000, 'active', null),
  ('d1000000-0000-4000-8000-000000000008', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c1000000-0000-4000-8000-000000000008', 'Hendra Gunawan', '081111100008', 'hendra@example.com', '3273010101010008', '2025-06-01', null, 1150000, 1150000, 'active', null),
  ('d1000000-0000-4000-8000-000000000009', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c1000000-0000-4000-8000-000000000009', 'Indah Permata', '081111100009', 'indah@example.com', '3273010101010009', '2025-03-20', null, 1150000, 1150000, 'active', null),
  ('d1000000-0000-4000-8000-00000000000a', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c1000000-0000-4000-8000-00000000000a', 'Joko Susilo', '081111100010', 'joko@example.com', '3273010101010010', '2025-07-01', null, 1350000, 1350000, 'active', null),
  ('d1000000-0000-4000-8000-00000000000b', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c1000000-0000-4000-8000-00000000000b', 'Kartika Sari', '081111100011', 'kartika@example.com', '3273010101010011', '2025-01-05', null, 1300000, 1300000, 'active', null),
  ('d1000000-0000-4000-8000-00000000000c', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c1000000-0000-4000-8000-00000000000c', 'Lutfi Hakim', '081111100012', 'lutfi@example.com', '3273010101010012', '2025-08-01', null, 1300000, 1300000, 'active', null),
  ('d1000000-0000-4000-8000-00000000000d', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c1000000-0000-4000-8000-00000000000d', 'Maya Putri', '081111100013', 'maya@example.com', '3273010101010013', '2025-04-12', null, 1200000, 1200000, 'active', null),
  ('d1000000-0000-4000-8000-00000000000e', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c1000000-0000-4000-8000-00000000000e', 'Nanda Firmansyah', '081111100014', 'nanda@example.com', '3273010101010014', '2025-05-18', null, 1200000, 1200000, 'active', null),
  ('d1000000-0000-4000-8000-00000000000f', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c1000000-0000-4000-8000-00000000000f', 'Oki Prasetyo', '081111100015', 'oki@example.com', '3273010101010015', '2025-09-01', null, 1400000, 1400000, 'active', null),
  ('d1000000-0000-4000-8000-000000000010', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c1000000-0000-4000-8000-000000000010', 'Putri Ayu', '081111100016', 'putri@example.com', '3273010101010016', '2025-02-28', null, 1350000, 1350000, 'active', null),
  ('d1000000-0000-4000-8000-000000000011', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c1000000-0000-4000-8000-000000000011', 'Rizky Fadilah', '081111100017', 'rizky@example.com', '3273010101010017', '2025-06-15', null, 1350000, 1350000, 'active', null),
  ('d1000000-0000-4000-8000-000000000012', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c1000000-0000-4000-8000-000000000012', 'Sinta Dewi', '081111100018', 'sinta@example.com', '3273010101010018', '2025-03-01', null, 1250000, 1250000, 'active', null),
  ('d1000000-0000-4000-8000-000000000013', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c1000000-0000-4000-8000-000000000013', 'Taufik Hidayat', '081111100019', 'taufik@example.com', '3273010101010019', '2025-07-20', null, 1250000, 1250000, 'active', null),
  ('d1000000-0000-4000-8000-000000000014', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c1000000-0000-4000-8000-000000000014', 'Umi Kalsum', '081111100020', 'umi@example.com', '3273010101010020', '2025-01-20', null, 1450000, 1450000, 'active', null),
  ('d1000000-0000-4000-8000-000000000015', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c1000000-0000-4000-8000-000000000015', 'Vina Melati', '081111100021', 'vina@example.com', '3273010101010021', '2025-08-10', null, 1500000, 1500000, 'active', null)
on conflict (id) do nothing;

-- One inactive historical tenant (no current room) for archive demo
insert into public.tenants (
  id, property_id, room_id, name, phone, email, identity_number,
  start_date, end_date, rent_price, deposit, status, notes
) values (
  'd1000000-0000-4000-8000-000000000099',
  'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  null,
  'Wawan Checkout',
  '081111100099',
  'wawan@example.com',
  '3273010101010099',
  '2024-01-01',
  '2024-12-31',
  1000000,
  1000000,
  'inactive',
  'Sudah checkout'
)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Payments: mix of paid / partial / unpaid / overdue for period 2026-03
-- plus some prior paid history
-- Status is set by trigger; values below are placeholders overwritten on insert.
-- ---------------------------------------------------------------------------

insert into public.payments (
  id, property_id, tenant_id, room_id, billing_period, due_date,
  amount_due, amount_paid, payment_date, payment_method, notes
) values
  -- paid
  ('e1000000-0000-4000-8000-000000000001', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'd1000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000001', '2026-03', '2026-03-05', 1200000, 1200000, '2026-03-03', 'transfer', null),
  ('e1000000-0000-4000-8000-000000000002', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'd1000000-0000-4000-8000-000000000002', 'c1000000-0000-4000-8000-000000000002', '2026-03', '2026-03-05', 1200000, 1200000, '2026-03-04', 'cash', null),
  ('e1000000-0000-4000-8000-000000000003', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'd1000000-0000-4000-8000-000000000003', 'c1000000-0000-4000-8000-000000000003', '2026-03', '2026-03-05', 1100000, 1100000, '2026-03-02', 'ewallet', null),
  ('e1000000-0000-4000-8000-000000000004', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'd1000000-0000-4000-8000-000000000004', 'c1000000-0000-4000-8000-000000000004', '2026-03', '2026-03-05', 1100000, 1100000, '2026-03-05', 'transfer', null),
  ('e1000000-0000-4000-8000-000000000005', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'd1000000-0000-4000-8000-000000000005', 'c1000000-0000-4000-8000-000000000005', '2026-03', '2026-03-05', 1300000, 1300000, '2026-03-01', 'transfer', null),
  -- partial
  ('e1000000-0000-4000-8000-000000000006', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'd1000000-0000-4000-8000-000000000006', 'c1000000-0000-4000-8000-000000000006', '2026-03', '2026-03-10', 1250000, 500000, '2026-03-08', 'cash', 'Bayar sebagian'),
  ('e1000000-0000-4000-8000-000000000007', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'd1000000-0000-4000-8000-000000000007', 'c1000000-0000-4000-8000-000000000007', '2026-03', '2026-03-12', 1250000, 600000, '2026-03-09', 'transfer', null),
  ('e1000000-0000-4000-8000-000000000008', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'd1000000-0000-4000-8000-000000000008', 'c1000000-0000-4000-8000-000000000008', '2026-03', '2026-03-15', 1150000, 400000, '2026-03-10', 'ewallet', null),
  -- unpaid (due in future relative to seed authoring; may show unpaid or overdue depending on current_date)
  ('e1000000-0000-4000-8000-000000000009', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'd1000000-0000-4000-8000-000000000009', 'c1000000-0000-4000-8000-000000000009', '2026-03', '2026-03-28', 1150000, 0, null, null, null),
  ('e1000000-0000-4000-8000-00000000000a', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'd1000000-0000-4000-8000-00000000000a', 'c1000000-0000-4000-8000-00000000000a', '2026-03', '2026-03-30', 1350000, 0, null, null, null),
  -- overdue (due date in the past)
  ('e1000000-0000-4000-8000-00000000000b', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'd1000000-0000-4000-8000-00000000000b', 'c1000000-0000-4000-8000-00000000000b', '2026-02', '2026-02-05', 1300000, 0, null, null, 'Belum bayar Feb'),
  ('e1000000-0000-4000-8000-00000000000c', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'd1000000-0000-4000-8000-00000000000c', 'c1000000-0000-4000-8000-00000000000c', '2026-02', '2026-02-05', 1300000, 300000, '2026-02-20', 'cash', 'Kurang bayar'),
  ('e1000000-0000-4000-8000-00000000000d', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'd1000000-0000-4000-8000-00000000000d', 'c1000000-0000-4000-8000-00000000000d', '2026-02', '2026-02-05', 1200000, 0, null, null, null),
  ('e1000000-0000-4000-8000-00000000000e', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'd1000000-0000-4000-8000-00000000000e', 'c1000000-0000-4000-8000-00000000000e', '2026-03', '2026-03-01', 1200000, 200000, '2026-03-02', 'transfer', 'Terlambat + partial'),
  -- more paid prior month
  ('e1000000-0000-4000-8000-00000000000f', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'd1000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000001', '2026-02', '2026-02-05', 1200000, 1200000, '2026-02-03', 'transfer', null),
  ('e1000000-0000-4000-8000-000000000010', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'd1000000-0000-4000-8000-00000000000f', 'c1000000-0000-4000-8000-00000000000f', '2026-03', '2026-03-05', 1400000, 1400000, '2026-03-04', 'transfer', null),
  ('e1000000-0000-4000-8000-000000000011', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'd1000000-0000-4000-8000-000000000010', 'c1000000-0000-4000-8000-000000000010', '2026-03', '2026-03-05', 1350000, 0, null, null, null),
  ('e1000000-0000-4000-8000-000000000012', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'd1000000-0000-4000-8000-000000000011', 'c1000000-0000-4000-8000-000000000011', '2026-03', '2026-03-05', 1350000, 700000, '2026-03-06', 'cash', null),
  ('e1000000-0000-4000-8000-000000000013', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'd1000000-0000-4000-8000-000000000012', 'c1000000-0000-4000-8000-000000000012', '2026-03', '2026-03-05', 1250000, 1250000, '2026-03-05', 'ewallet', null),
  ('e1000000-0000-4000-8000-000000000014', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'd1000000-0000-4000-8000-000000000013', 'c1000000-0000-4000-8000-000000000013', '2026-03', '2026-03-05', 1250000, 0, null, null, null),
  ('e1000000-0000-4000-8000-000000000015', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'd1000000-0000-4000-8000-000000000014', 'c1000000-0000-4000-8000-000000000014', '2026-03', '2026-03-05', 1450000, 1450000, '2026-03-02', 'transfer', null),
  ('e1000000-0000-4000-8000-000000000016', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'd1000000-0000-4000-8000-000000000015', 'c1000000-0000-4000-8000-000000000015', '2026-03', '2026-03-05', 1500000, 500000, '2026-03-07', 'transfer', null)
on conflict (id) do nothing;
