'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CardSearchResult } from '@/types/card';

interface Props {
  itemId: number;
  cardName: string;
  quantityOwned: number;
}

export default function PrintPicker({ itemId, cardName, quantityOwned }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [printings, setPrintings] = useState<CardSearchResult[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const router = useRouter();

  async function toggleOpen() {
    if (open) {
      setOpen(false);
      return;
    }

    setOpen(true);
    if (printings.length === 0) {
      setLoading(true);
      try {
        const res = await fetch(`/api/scryfall/prints?name=${encodeURIComponent(cardName)}`);
        const data = await res.json();
        setPrintings(data.printings ?? []);
        setHasMore(Boolean(data.has_more));
      } finally {
        setLoading(false);
      }
    }
  }

  async function applyPrinting(card: CardSearchResult) {
    setApplyingId(card.external_id);
    try {
      await fetch(`/api/collection/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          printing: {
            external_id: card.external_id,
            set_code: card.set_code,
            image_url: card.image_url,
            attributes: card.attributes,
          },
        }),
      });
      router.refresh();
      setOpen(false);
    } finally {
      setApplyingId(null);
    }
  }

  return (
    <div style={{ marginTop: '0.3rem' }}>
      <button
        onClick={toggleOpen}
        style={{
          fontSize: '0.75rem',
          color: '#999',
          background: 'none',
          border: 'none',
          textDecoration: 'underline',
          cursor: 'pointer',
          padding: 0,
        }}
      >
        {open ? 'Close' : 'Change print'}
      </button>

      {open && (
        <div style={{ marginTop: '0.4rem', maxWidth: 280 }}>
          <p style={{ fontSize: '0.7rem', color: '#999', margin: '0 0 0.3rem' }}>
            Applies to all {quantityOwned} cop{quantityOwned === 1 ? 'y' : 'ies'} of this card at this condition.
          </p>
          {loading && <p style={{ fontSize: '0.8rem', color: '#666' }}>Loading printings…</p>}
          {!loading && printings.length === 0 && <p style={{ fontSize: '0.8rem', color: '#666' }}>No printings found.</p>}
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, maxHeight: 200, overflowY: 'auto' }}>
            {printings.map((card) => (
              <li
                key={card.external_id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.25rem 0',
                  borderBottom: '1px solid #eee',
                }}
              >
                {card.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={card.image_url} alt={card.name} width={28} style={{ borderRadius: 3 }} />
                ) : (
                  <div style={{ width: 28, height: 39, background: '#f0f0f0', borderRadius: 3 }} />
                )}
                <span style={{ fontSize: '0.8rem', flex: 1 }}>{card.set_code?.toUpperCase()}</span>
                <button
                  onClick={() => applyPrinting(card)}
                  disabled={applyingId === card.external_id}
                  style={{
                    fontSize: '0.75rem',
                    padding: '0.2rem 0.5rem',
                    borderRadius: 4,
                    border: '1px solid #333',
                    background: '#fff',
                    cursor: 'pointer',
                  }}
                >
                  {applyingId === card.external_id ? 'Setting…' : 'Use this'}
                </button>
              </li>
            ))}
          </ul>
          {hasMore && (
            <p style={{ fontSize: '0.7rem', color: '#999', marginTop: '0.3rem' }}>
              More printings exist than shown here.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
