'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  deckId: number;
  cardId: number;
  quantity: number;
}

export default function DeckCardControls({ deckId, cardId, quantity }: Props) {
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function adjust(delta: number) {
    setPending(true);
    try {
      await fetch(`/api/decks/${deckId}/cards/${cardId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delta }),
      });
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function remove() {
    setPending(true);
    try {
      await fetch(`/api/decks/${deckId}/cards/${cardId}`, { method: 'DELETE' });
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="d-flex align-items-center gap-2">
      <div className="btn-group btn-group-sm" role="group">
        <button
          type="button"
          className="btn btn-outline-secondary"
          onClick={() => adjust(-1)}
          disabled={pending}
          aria-label="Need one fewer"
        >
          −
        </button>
        <span className="btn btn-outline-secondary disabled" style={{ minWidth: '2.5rem' }}>
          {quantity}
        </span>
        <button
          type="button"
          className="btn btn-outline-secondary"
          onClick={() => adjust(1)}
          disabled={pending}
          aria-label="Need one more"
        >
          +
        </button>
      </div>
      <button type="button" onClick={remove} disabled={pending} className="btn btn-link btn-sm text-secondary p-0">
        remove
      </button>
    </div>
  );
}
