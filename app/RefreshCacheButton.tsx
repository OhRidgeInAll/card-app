'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CacheMeta } from '@/lib/scryfall-cache';

interface Props {
  meta: CacheMeta | null;
}

interface RefreshResponse {
  ok: boolean;
  rows_loaded?: number;
  row_errors?: number;
  last_refreshed_at?: string;
  error?: string;
}

export default function RefreshCacheButton({ meta }: Props) {
  const [refreshing, setRefreshing] = useState(false);
  const [result, setResult] = useState<RefreshResponse | null>(null);
  const router = useRouter();

  async function handleRefresh() {
    setRefreshing(true);
    setResult(null);
    try {
      const res = await fetch('/api/admin/refresh-cache', { method: 'POST' });
      const data = (await res.json()) as RefreshResponse;
      setResult(data);
      router.refresh();
    } catch {
      setResult({ ok: false, error: 'Refresh failed' });
    } finally {
      setRefreshing(false);
    }
  }

  // The last *successful* refresh's stats - preserved in `meta` even after a
  // later failed attempt, since a failure only ever updates status/error_message.
  const lastGoodRefresh = result?.ok
    ? { rows: result.rows_loaded, at: result.last_refreshed_at }
    : meta?.last_refreshed_at
      ? { rows: meta.rows_loaded, at: meta.last_refreshed_at }
      : null;

  const failureMessage = result && !result.ok ? result.error : !result && meta?.status === 'error' ? meta.error_message : null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
      <button
        onClick={handleRefresh}
        disabled={refreshing}
        style={{
          fontSize: '0.9rem',
          textDecoration: 'underline',
          background: 'none',
          border: 'none',
          cursor: refreshing ? 'default' : 'pointer',
          padding: 0,
          color: 'inherit',
        }}
      >
        {refreshing ? 'Refreshing card database…' : 'Refresh card database'}
      </button>
      {!refreshing && (
        <span style={{ color: '#888', fontSize: '0.8rem' }}>
          {lastGoodRefresh
            ? `(${lastGoodRefresh.rows} cards, last refreshed ${new Date(lastGoodRefresh.at!).toLocaleDateString()})`
            : '(never refreshed - using live lookups)'}
          {failureMessage ? ` — last attempt failed: ${failureMessage}` : ''}
        </span>
      )}
    </div>
  );
}
