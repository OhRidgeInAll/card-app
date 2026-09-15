'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CardSearchResult, Game } from '@/types/card';
import { GAME_CONFIG } from '@/lib/game-config';

interface Props {
  game: Game;
  endpoint: string;
  backHref: string;
  backLabel: string;
  title: string;
}

export default function AddCards({ game, endpoint, backHref, backLabel, title }: Props) {
  const { searchPath, subtitle } = GAME_CONFIG[game];
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CardSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.trim().length < 2) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`${searchPath}?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data.cards ?? []);
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, searchPath]);

  async function addCard(card: CardSearchResult) {
    setAddingId(card.external_id);

    await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        game,
        external_id: card.external_id,
        name: card.name,
        set_code: card.set_code,
        image_url: card.image_url,
        attributes: card.attributes,
        quantity: 1,
      }),
    });

    setAddingId(null);
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1 className="h4 fw-semibold mb-0">{title}</h1>
        <button type="button" onClick={() => router.push(backHref)} className="btn btn-link btn-sm p-0">
          {backLabel}
        </button>
      </div>

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by card name…"
        className="form-control"
      />

      {loading && <p className="text-secondary mt-2">Searching…</p>}

      <ul className="list-unstyled mt-3">
        {results.map((card) => (
          <li key={card.external_id} className="d-flex align-items-center gap-3 py-2 border-bottom">
            {card.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={card.image_url} alt={card.name} width={40} className="rounded" />
            ) : (
              <div className="bg-light rounded" style={{ width: 40, height: 56 }} />
            )}
            <div className="flex-grow-1">
              <div className="fw-medium">{card.name}</div>
              <div className="small text-secondary">{subtitle(card)}</div>
            </div>
            <button
              type="button"
              onClick={() => addCard(card)}
              disabled={addingId === card.external_id}
              className="btn btn-outline-primary btn-sm"
            >
              {addingId === card.external_id ? 'Adding…' : 'Add 1'}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
