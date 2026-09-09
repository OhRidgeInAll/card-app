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
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '2rem 1rem' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
        }}
      >
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600 }}>{title}</h1>
        <button
          onClick={() => router.push(backHref)}
          style={{
            fontSize: '0.9rem',
            textDecoration: 'underline',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          {backLabel}
        </button>
      </div>

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by card name…"
        style={{
          width: '100%',
          padding: '0.6rem 0.75rem',
          fontSize: '1rem',
          border: '1px solid #ccc',
          borderRadius: 6,
        }}
      />

      {loading && <p style={{ color: '#666', marginTop: '0.75rem' }}>Searching…</p>}

      <ul style={{ listStyle: 'none', padding: 0, marginTop: '1rem' }}>
        {results.map((card) => (
          <li
            key={card.external_id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.5rem 0',
              borderBottom: '1px solid #eee',
            }}
          >
            {card.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={card.image_url} alt={card.name} width={40} style={{ borderRadius: 4 }} />
            ) : (
              <div style={{ width: 40, height: 56, background: '#f0f0f0', borderRadius: 4 }} />
            )}
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 500 }}>{card.name}</div>
              <div style={{ fontSize: '0.8rem', color: '#666' }}>{subtitle(card)}</div>
            </div>
            <button
              onClick={() => addCard(card)}
              disabled={addingId === card.external_id}
              style={{
                padding: '0.4rem 0.8rem',
                borderRadius: 6,
                border: '1px solid #333',
                background: '#fff',
                cursor: 'pointer',
              }}
            >
              {addingId === card.external_id ? 'Adding…' : 'Add 1'}
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}
