import type { ReactNode } from 'react';

export function TenantPlaceholder({ title, desc, hint }: { title: string; desc: string; hint: string }) {
  return (
    <div className="mx-auto max-w-2xl space-y-3 py-8 text-center">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="text-sm text-muted-foreground">{desc}</p>
      <div className="rounded-md border bg-card p-4 text-sm text-muted-foreground" role="status">
        {hint}
      </div>
    </div>
  );
}

export function PageWrap({ children }: { children: ReactNode }) {
  return <div className="space-y-4">{children}</div>;
}
