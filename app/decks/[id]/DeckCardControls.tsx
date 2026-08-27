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

  const buttonStyle: React.CSSProperties = {
    width: 24,
    height: 24,
    borderRadius: 4,
    border: '1px solid #ccc',
    background: '#fff',
    cursor: 'pointer',
    lineHeight: 1,
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
      <button onClick={() => adjust(-1)} disabled={pending} aria-label="Need one fewer" style={buttonStyle}>
        −
      </button>
      <span style={{ minWidth: '1.5rem', textAlign: 'center' }}>{quantity}</span>
      <button onClick={() => adjust(1)} disabled={pending} aria-label="Need one more" style={buttonStyle}>
        +
      </button>
      <button
        onClick={remove}
        disabled={pending}
        style={{
          marginLeft: '0.5rem',
          fontSize: '0.75rem',
          color: '#999',
          background: 'none',
          border: 'none',
          textDecoration: 'underline',
          cursor: 'pointer',
        }}
      >
        remove
      </button>
    </div>
  );
}
