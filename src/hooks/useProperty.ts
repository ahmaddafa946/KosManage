import { useCallback, useEffect, useState } from 'react';
import type { Property } from '@/types/database';
import { createProperty, getPrimaryProperty } from '@/services/properties';
import { useAuth } from '@/features/auth/AuthContext';

export function useProperty() {
  const { user } = useAuth();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) {
      setProperty(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const p = await getPrimaryProperty();
      setProperty(p);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat data kos.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  async function ensureProperty(name = 'Kos Saya'): Promise<Property> {
    const existing = await getPrimaryProperty();
    if (existing) {
      setProperty(existing);
      return existing;
    }
    const created = await createProperty(name);
    setProperty(created);
    return created;
  }

  return { property, loading, error, reload: load, ensureProperty, setProperty };
}
