'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface DeckOption {
  id: number;
  name: string;
  game: string;
}

type Destination = 'collection' | 'deck' | 'both';

interface ImportResult {
  deck_id?: number;
  matched_count: number;
  not_found: string[];
  failed: string[];
}

export default function ImportPage() {
  const [text, setText] = useState('');
  const [destination, setDestination] = useState<Destination>('collection');
  const [decks, setDecks] = useState<DeckOption[]>([]);
  const [deckChoice, setDeckChoice] = useState<'existing' | 'new'>('new');
  const [existingDeckId, setExistingDeckId] = useState('');
  const [newDeckName, setNewDeckName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/decks')
      .then((res) => res.json())
      .then((data) => setDecks((data.decks ?? []).filter((deck: DeckOption) => deck.game === 'mtg')));
  }, []);

  const needsDeck = destination === 'deck' || destination === 'both';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);

    if (!text.trim()) {
      setError('Paste a decklist first.');
      return;
    }

    const body: Record<string, unknown> = { text, destination };

    if (needsDeck) {
      if (deckChoice === 'existing') {
        if (!existingDeckId) {
          setError('Choose an existing deck.');
          return;
        }
        body.deck_id = Number(existingDeckId);
      } else {
        if (!newDeckName.trim()) {
          setError('Name the new deck.');
          return;
        }
        body.new_deck_name = newDeckName.trim();
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Import failed');
        return;
      }

      setResult(data);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  const labelStyle: React.CSSProperties = { display: 'block', marginBottom: '0.4rem', fontSize: '0.9rem' };
  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.5rem 0.7rem',
    borderRadius: 6,
    border: '1px solid #ccc',
  };

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
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Bulk import</h1>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Link href="/decks" style={{ fontSize: '0.9rem', textDecoration: 'underline' }}>
            Decks
          </Link>
          <Link href="/" style={{ fontSize: '0.9rem', textDecoration: 'underline' }}>
            Collection
          </Link>
        </div>
      </div>

      <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '1rem' }}>
        Paste a decklist, one card per line — <code>4x Lightning Bolt</code>,{' '}
        <code>4 Lightning Bolt (M10) 146</code>, or <code>4, Lightning Bolt</code> all work. Set and
        collector-number info gets ignored.
      </p>

      <form onSubmit={handleSubmit}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={12}
          placeholder={'4x Lightning Bolt\n1 Sol Ring\n2 Counterspell'}
          style={{ ...inputStyle, fontFamily: 'monospace', fontSize: '0.9rem' }}
        />

        <fieldset style={{ border: 'none', padding: 0, marginTop: '1rem' }}>
          <legend style={{ fontSize: '0.9rem', fontWeight: 500, marginBottom: '0.5rem' }}>
            Add these cards to:
          </legend>
          <label style={labelStyle}>
            <input
              type="radio"
              name="destination"
              checked={destination === 'collection'}
              onChange={() => setDestination('collection')}
              style={{ marginRight: '0.5rem' }}
            />
            Collection only
          </label>
          <label style={labelStyle}>
            <input
              type="radio"
              name="destination"
              checked={destination === 'deck'}
              onChange={() => setDestination('deck')}
              style={{ marginRight: '0.5rem' }}
            />
            A deck only
          </label>
          <label style={labelStyle}>
            <input
              type="radio"
              name="destination"
              checked={destination === 'both'}
              onChange={() => setDestination('both')}
              style={{ marginRight: '0.5rem' }}
            />
            Collection + a deck (e.g. a precon you just bought)
          </label>
        </fieldset>

        {needsDeck && (
          <div style={{ marginTop: '0.75rem', paddingLeft: '1.5rem' }}>
            <label style={labelStyle}>
              <input
                type="radio"
                checked={deckChoice === 'existing'}
                onChange={() => setDeckChoice('existing')}
                style={{ marginRight: '0.5rem' }}
              />
              Existing deck
            </label>
            {deckChoice === 'existing' && (
              <select
                value={existingDeckId}
                onChange={(e) => setExistingDeckId(e.target.value)}
                style={{ ...inputStyle, marginBottom: '0.75rem' }}
              >
                <option value="">Choose a deck…</option>
                {decks.map((deck) => (
                  <option key={deck.id} value={deck.id}>
                    {deck.name}
                  </option>
                ))}
              </select>
            )}

            <label style={labelStyle}>
              <input
                type="radio"
                checked={deckChoice === 'new'}
                onChange={() => setDeckChoice('new')}
                style={{ marginRight: '0.5rem' }}
              />
              New deck
            </label>
            {deckChoice === 'new' && (
              <input
                type="text"
                value={newDeckName}
                onChange={(e) => setNewDeckName(e.target.value)}
                placeholder="Deck name…"
                style={inputStyle}
              />
            )}
          </div>
        )}

        {error && <p style={{ color: '#b3261e', marginTop: '1rem' }}>{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          style={{
            marginTop: '1.25rem',
            padding: '0.6rem 1.2rem',
            borderRadius: 6,
            border: '1px solid #333',
            background: '#fff',
            cursor: 'pointer',
          }}
        >
          {submitting ? 'Importing… this can take a bit for long lists' : 'Import'}
        </button>
      </form>

      {result && (
        <div style={{ marginTop: '2rem', padding: '1rem', border: '1px solid #ddd', borderRadius: 8 }}>
          <p style={{ fontWeight: 500 }}>
            Matched and added {result.matched_count} card{result.matched_count === 1 ? '' : 's'}.
          </p>
          {result.deck_id && (
            <p style={{ fontSize: '0.9rem' }}>
              <Link href={`/decks/${result.deck_id}`} style={{ textDecoration: 'underline' }}>
                View the deck →
              </Link>
            </p>
          )}
          {result.failed.length > 0 && (
            <div style={{ marginTop: '0.75rem' }}>
              <p style={{ color: '#b3261e', fontSize: '0.9rem' }}>
                {result.failed.length} line{result.failed.length === 1 ? '' : 's'} kept failing to
                reach Scryfall (likely a brief rate limit) — try pasting just these again:
              </p>
              <ul style={{ fontSize: '0.85rem', color: '#666' }}>
                {result.failed.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          )}
          {result.not_found.length > 0 && (
            <div style={{ marginTop: '0.75rem' }}>
              <p style={{ color: '#b3261e', fontSize: '0.9rem' }}>
                Couldn&apos;t find a match for {result.not_found.length} line
                {result.not_found.length === 1 ? '' : 's'} — add these manually:
              </p>
              <ul style={{ fontSize: '0.85rem', color: '#666' }}>
                {result.not_found.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
