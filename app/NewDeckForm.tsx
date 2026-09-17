'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Game } from '@/types/card';

interface Props {
  game: Game;
}

export default function NewDeckForm({ game }: Props) {
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
        body: JSON.stringify({ name: name.trim(), game }),
      });
      const data = await res.json();
      setName('');
      if (data.deck_id) {
        router.push(`/${game}/decks/${data.deck_id}`);
      } else {
        router.refresh();
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={createDeck} className="d-flex gap-2 mb-4">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="New deck name…"
        className="form-control"
      />
      <button type="submit" disabled={pending || !name.trim()} className="btn btn-primary text-nowrap">
        Create
      </button>
    </form>
  );
}
