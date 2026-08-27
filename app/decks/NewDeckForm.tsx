'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewDeckForm() {
  const [name, setName] = useState('');
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function createDeck(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setPending(true);
    try {
      const res = await fetch('/api/decks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), game: 'mtg' }),
      });
      const data = await res.json();
      setName('');
      if (data.deck_id) {
        router.push(`/decks/${data.deck_id}`);
      } else {
        router.refresh();
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={createDeck} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="New deck name…"
        style={{ flex: 1, padding: '0.5rem 0.75rem', border: '1px solid #ccc', borderRadius: 6 }}
      />
      <button
        type="submit"
        disabled={pending || !name.trim()}
        style={{ padding: '0.5rem 1rem', borderRadius: 6, border: '1px solid #333', background: '#fff', cursor: 'pointer' }}
      >
        Create
      </button>
    </form>
  );
}
