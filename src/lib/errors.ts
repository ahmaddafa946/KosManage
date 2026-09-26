import { PostgrestError } from '@supabase/supabase-js';

const GENERIC = 'Gagal menyimpan. Silakan coba lagi.';

export function mapSupabaseError(error: unknown): string {
  if (!error) return GENERIC;
  const msg = error instanceof Error ? error.message : String(error);
  const code = (error as PostgrestError)?.code ?? (error as { code?: string })?.code;

  if (/invalid login|invalid.*credentials|email.*password.*salah/i.test(msg)) return 'Email atau password salah.';
  if (/jwt|expired|session/i.test(msg) && /expir/i.test(msg)) return 'Sesi berakhir. Silakan login kembali.';
  if (code === '23505' || /duplicate|already exists|unique/i.test(msg)) {
    if (/room_number|rooms/i.test(msg)) return 'Nomor kamar sudah digunakan.';
    if (/billing_period|tenant_id/i.test(msg)) return 'Tagihan periode ini sudah ada untuk penghuni tersebut.';
    return 'Data duplikat. Data sudah ada.';
  }
  if (/active tenant|double|already.*occup|one active/i.test(msg)) return 'Kamar sudah ditempati penghuni aktif.';
  if (/maintenance/i.test(msg)) return 'Kamar sedang maintenance.';
  if (/active tenant|delete.*room|occupied/i.test(msg) && /delet/i.test(msg)) return 'Kamar masih memiliki penghuni aktif.';
  if (/active tenant must have/i.test(msg)) return 'Penghuni aktif wajib memiliki kamar.';
  if (/property.*match/i.test(msg)) return 'Data tidak sesuai properti Anda.';
  if (/amount|negative|check/i.test(msg) && /negat|check|amount/i.test(msg)) return 'Nominal tidak valid. Jumlah tidak boleh negatif.';
  if (code === 'PGRST116' || /not found|no rows|tidak ditemukan/i.test(msg)) return 'Data tidak ditemukan atau tidak dapat diakses.';
  if (/failed to fetch|network|offline|koneksi/i.test(msg)) return 'Gagal terhubung. Periksa koneksi Anda.';
  if (/row-level|rls|policy|permission|unauthorized|forbidden/i.test(msg)) return 'Data tidak ditemukan atau tidak dapat diakses.';
  return GENERIC;
}

export function computePaymentStatusLocal(amountDue: number, amountPaid: number, dueDate: string, asOf: Date = new Date()): 'unpaid' | 'partial' | 'paid' | 'overdue' {
  if (amountPaid >= amountDue) return 'paid';
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const ref = new Date(asOf);
  ref.setHours(0, 0, 0, 0);
  if (ref.getTime() > due.getTime()) return 'overdue';
  if (amountPaid > 0) return 'partial';
  return 'unpaid';
}
