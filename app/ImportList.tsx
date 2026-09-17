'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Game } from '@/types/card';
import { GAME_CONFIG } from '@/lib/game-config';

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

interface Props {
  game: Game;
  title: string;
}

export default function ImportList({ game, title }: Props) {
  const { importIntro, importPlaceholder, importBothLabel, errorSource } = GAME_CONFIG[game];
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
      .then((data) => setDecks((data.decks ?? []).filter((deck: DeckOption) => deck.game === game)));
  }, [game]);

  const needsDeck = destination === 'deck' || destination === 'both';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);

    if (!text.trim()) {
      setError('Paste a decklist first.');
      return;
    }

    const body: Record<string, unknown> = { text, destination, game };

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

  return (
    <div style={{ maxWidth: 720 }}>
      <h1 className="h4 fw-semibold mb-3">{title}</h1>

      <p className="text-secondary small mb-3">{importIntro}</p>

      <form onSubmit={handleSubmit}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={12}
          placeholder={importPlaceholder}
          className="form-control font-monospace small"
        />

        <fieldset className="border-0 p-0 mt-3">
          <legend className="fs-6 fw-medium mb-2">Add these cards to:</legend>
          <div className="form-check">
            <input
              type="radio"
              id={`dest-collection-${game}`}
              className="form-check-input"
              name="destination"
              checked={destination === 'collection'}
              onChange={() => setDestination('collection')}
            />
            <label className="form-check-label" htmlFor={`dest-collection-${game}`}>
              Collection only
            </label>
          </div>
          <div className="form-check">
            <input
              type="radio"
              id={`dest-deck-${game}`}
              className="form-check-input"
              name="destination"
              checked={destination === 'deck'}
              onChange={() => setDestination('deck')}
            />
            <label className="form-check-label" htmlFor={`dest-deck-${game}`}>
              A deck only
            </label>
          </div>
          <div className="form-check">
            <input
              type="radio"
              id={`dest-both-${game}`}
              className="form-check-input"
              name="destination"
              checked={destination === 'both'}
              onChange={() => setDestination('both')}
            />
            <label className="form-check-label" htmlFor={`dest-both-${game}`}>
              {importBothLabel}
            </label>
          </div>
        </fieldset>

        {needsDeck && (
          <div className="mt-3 ps-4">
            <div className="form-check">
              <input
                type="radio"
                id={`deck-existing-${game}`}
                className="form-check-input"
                checked={deckChoice === 'existing'}
                onChange={() => setDeckChoice('existing')}
              />
              <label className="form-check-label" htmlFor={`deck-existing-${game}`}>
                Existing deck
              </label>
            </div>
            {deckChoice === 'existing' && (
              <select
                value={existingDeckId}
                onChange={(e) => setExistingDeckId(e.target.value)}
                className="form-select mb-3"
              >
                <option value="">Choose a deck…</option>
                {decks.map((deck) => (
                  <option key={deck.id} value={deck.id}>
                    {deck.name}
                  </option>
                ))}
              </select>
            )}

            <div className="form-check">
              <input
                type="radio"
                id={`deck-new-${game}`}
                className="form-check-input"
                checked={deckChoice === 'new'}
                onChange={() => setDeckChoice('new')}
              />
              <label className="form-check-label" htmlFor={`deck-new-${game}`}>
                New deck
              </label>
            </div>
            {deckChoice === 'new' && (
              <input
                type="text"
                value={newDeckName}
                onChange={(e) => setNewDeckName(e.target.value)}
                placeholder="Deck name…"
                className="form-control"
              />
            )}
          </div>
        )}

        {error && <p className="text-danger mt-3">{error}</p>}

        <button type="submit" disabled={submitting} className="btn btn-primary mt-3">
          {submitting ? 'Importing… this can take a bit for long lists' : 'Import'}
        </button>
      </form>

      {result && (
        <div className="mt-4 p-3 border rounded">
          <p className="fw-medium mb-2">
            Matched and added {result.matched_count} card{result.matched_count === 1 ? '' : 's'}.
          </p>
          {result.deck_id && (
            <p className="small mb-2">
              <Link href={`/${game}/decks/${result.deck_id}`}>View the deck →</Link>
            </p>
          )}
          {result.failed.length > 0 && (
            <div className="mt-2">
              <p className="text-danger small mb-1">
                {result.failed.length} line{result.failed.length === 1 ? '' : 's'} kept failing to
                reach {errorSource} (likely a brief rate limit) — try pasting just these again:
              </p>
              <ul className="small text-secondary">
                {result.failed.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          )}
          {result.not_found.length > 0 && (
            <div className="mt-2">
              <p className="text-danger small mb-1">
                Couldn&apos;t find a match for {result.not_found.length} line
                {result.not_found.length === 1 ? '' : 's'} — add these manually:
              </p>
              <ul className="small text-secondary">
                {result.not_found.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
