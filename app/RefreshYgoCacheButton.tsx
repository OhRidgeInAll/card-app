'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { YgoCacheMeta } from '@/lib/ygoprodeck-cache';

interface Props {
  meta: YgoCacheMeta | null;
}

interface RefreshResponse {
  ok: boolean;
  rows_loaded?: number;
  row_errors?: number;
  last_refreshed_at?: string;
  error?: string;
}

export default function RefreshYgoCacheButton({ meta }: Props) {
  const [refreshing, setRefreshing] = useState(false);
  const [result, setResult] = useState<RefreshResponse | null>(null);
  const router = useRouter();

  async function handleRefresh() {
    setRefreshing(true);
    setResult(null);
    try {
      const res = await fetch('/api/admin/refresh-ygo-cache', { method: 'POST' });
      const data = (await res.json()) as RefreshResponse;
      setResult(data);
      router.refresh();
    } catch {
      setResult({ ok: false, error: 'Refresh failed' });
    } finally {
      setRefreshing(false);
    }
  }

  // Last successful refresh: preserved in `meta` even after a
  // later failed attempt, since a failure only ever updates status/error_message.
  // Rendered as ISO-date slice, not toLocaleDateString() - that
  // formats using the server's locale during SSR and the browser's locale
  // during hydration, which can disagree and throw a hydration mismatch error.
  // (We could also use a useEffect to force a re-render after hydration, but this is simpler.)
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
        {refreshing ? 'Refreshing Yu-Gi-Oh! database…' : 'Refresh Yu-Gi-Oh! database'}
      </button>
      {!refreshing && (
        <span style={{ color: '#888', fontSize: '0.8rem' }}>
          {lastGoodRefresh
            ? `(${lastGoodRefresh.rows} cards, last refreshed ${lastGoodRefresh.at!.slice(0, 10)})`
            : '(never refreshed - using live lookups)'}
          {failureMessage ? ` — last attempt failed: ${failureMessage}` : ''}
        </span>
      )}
    </div>
  );
}
