import { Badge } from '@/components/ui/badge';
import type { PaymentStatus, RoomStatus } from '@/types/database';

const ROOM_LABEL: Record<RoomStatus, string> = {
  available: 'Kosong',
  occupied: 'Terisi',
  maintenance: 'Maintenance',
};

const PAY_LABEL: Record<PaymentStatus, string> = {
  unpaid: 'Belum Bayar',
  partial: 'Sebagian',
  paid: 'Lunas',
  overdue: 'Terlambat',
};

export function RoomStatusBadge({ status }: { status: RoomStatus }) {
  const variant = status === 'occupied' ? 'default' : status === 'maintenance' ? 'warning' : 'success';
  return <Badge variant={variant}>{ROOM_LABEL[status]}</Badge>;
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const variant =
    status === 'paid' ? 'success' : status === 'partial' ? 'warning' : status === 'overdue' ? 'destructive' : 'secondary';
  return <Badge variant={variant}>{PAY_LABEL[status]}</Badge>;
}
