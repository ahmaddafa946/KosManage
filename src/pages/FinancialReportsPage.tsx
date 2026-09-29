import ReportsPage from '@/pages/ReportsPage';

// Owner "Laporan Keuangan": fokus finansial. Slice 2 reuse ReportsPage
// penuh; split operasional vs finansial disempurnakan di Slice 11.
export default function FinancialReportsPage() {
  return (
    <div className="space-y-2">
      <h2 className="text-lg font-semibold">Laporan Keuangan</h2>
      <p className="text-sm text-muted-foreground">
        Ringkasan pendapatan dan tunggakan properti Anda. Laporan operasional/maintenance tetap di menu Laporan.
      </p>
      <ReportsPage />
    </div>
  );
}
