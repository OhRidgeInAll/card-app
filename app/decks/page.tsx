import Link from 'next/link';
import { db } from '@/lib/db';
import NewDeckForm from './NewDeckForm';

interface DeckRow {
  id: number;
  name: string;
  game: string;
  card_count: number;
}

export default function DecksPage() {
  const decks = db
    .prepare(
      `SELECT d.id, d.name, d.game, COUNT(dc.id) AS card_count
       FROM decks d
       LEFT JOIN deck_cards dc ON dc.deck_id = d.id
       GROUP BY d.id
       ORDER BY d.id ASC`
    )
    .all() as DeckRow[];

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
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Decks</h1>
        <Link href="/" style={{ fontSize: '0.9rem', textDecoration: 'underline' }}>
          Collection
        </Link>
      </div>

      <NewDeckForm />

      {decks.length === 0 ? (
        <p style={{ color: '#666' }}>No decks yet. Create your first one above.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {decks.map((deck) => (
            <li key={deck.id} style={{ borderBottom: '1px solid #eee', padding: '0.75rem 0' }}>
              <Link href={`/decks/${deck.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 500 }}>{deck.name}</span>
                  <span style={{ color: '#666', fontSize: '0.9rem' }}>
                    {deck.card_count} card{deck.card_count === 1 ? '' : 's'}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
