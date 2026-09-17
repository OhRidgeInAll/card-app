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
    <div className="mt-1">
      <button type="button" onClick={toggleOpen} className="btn btn-link btn-sm text-secondary p-0">
        {open ? 'Close' : 'Change print'}
      </button>

      {open && (
        <div className="mt-2" style={{ maxWidth: 280 }}>
          <p className="small text-secondary mb-1">
            Applies to all {quantityOwned} cop{quantityOwned === 1 ? 'y' : 'ies'} of this card at this condition.
          </p>
          {loading && <p className="small text-secondary">Loading printings…</p>}
          {!loading && printings.length === 0 && <p className="small text-secondary">No printings found.</p>}
          <ul className="list-unstyled mb-0" style={{ maxHeight: 200, overflowY: 'auto' }}>
            {printings.map((card) => (
              <li key={card.external_id} className="d-flex align-items-center gap-2 py-1 border-bottom">
                {card.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={card.image_url} alt={card.name} width={28} className="rounded" />
                ) : (
                  <div className="bg-light rounded" style={{ width: 28, height: 39 }} />
                )}
                <span className="small flex-grow-1">{card.set_code?.toUpperCase()}</span>
                <button
                  type="button"
                  onClick={() => applyPrinting(card)}
                  disabled={applyingId === card.external_id}
                  className="btn btn-outline-secondary btn-sm"
                >
                  {applyingId === card.external_id ? 'Setting…' : 'Use this'}
                </button>
              </li>
            ))}
          </ul>
          {hasMore && <p className="small text-secondary mt-1 mb-0">More printings exist than shown here.</p>}
        </div>
      )}
    </div>
  );
}
