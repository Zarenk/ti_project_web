'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetchAccountingSummary } from '../accounting.api';
import type { AccountingSummary } from '@/lib/accounting/types';

interface UseAccountingSummaryReturn {
  summary: AccountingSummary | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook para obtener el resumen contable del dashboard
 *
 * @example
 * ```tsx
 * const { summary, loading, error, refetch } = useAccountingSummary();
 *
 * if (loading) return <Skeleton />;
 * if (error) return <ErrorMessage />;
 *
 * return (
 *   <div>
 *     <p>Dinero disponible: S/ {summary?.cashAvailable}</p>
 *     <button onClick={refetch}>Actualizar</button>
 *   </div>
 * );
 * ```
 */
export function useAccountingSummary(): UseAccountingSummaryReturn {
  const [summary, setSummary] = useState<AccountingSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchAccountingSummary();
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Error desconocido'));
      console.error('Error in useAccountingSummary:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    summary,
    loading,
    error,
    refetch: fetchData,
  };
}
