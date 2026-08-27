import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { getDeckCardsWithAllocation } from '@/lib/decks';
import DeckCardControls from './DeckCardControls';

interface Props {
  params: { id: string };
}

export default function DeckDetailPage({ params }: Props) {
  const deckId = Number(params.id);
  const deck = db.prepare(`SELECT id, name, game FROM decks WHERE id = ?`).get(deckId) as
    | { id: number; name: string; game: string }
    | undefined;

  if (!deck) {
    notFound();
  }

  const cards = getDeckCardsWithAllocation(deckId);
  const totalMissing = cards.reduce((sum, c) => sum + c.missing, 0);

  return (
    <main style={{ maxWidth: 960, margin: '0 auto', padding: '2rem 1rem' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '0.5rem',
        }}
      >
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600 }}>{deck!.name}</h1>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Link href={`/decks/${deck!.id}/add`} style={{ fontSize: '0.9rem', textDecoration: 'underline' }}>
            + Add cards
          </Link>
          <Link href="/decks" style={{ fontSize: '0.9rem', textDecoration: 'underline' }}>
            All decks
          </Link>
        </div>
      </div>

      <p
        style={{
          color: totalMissing > 0 ? '#b3261e' : '#2e7d32',
          marginBottom: '1.5rem',
          fontSize: '0.9rem',
        }}
      >
        {totalMissing > 0
          ? `Missing ${totalMissing} card${totalMissing === 1 ? '' : 's'}`
          : 'Fully assembled from your collection'}
      </p>

      {cards.length === 0 ? (
        <p style={{ color: '#666' }}>No cards yet. Add your first one.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>
              <th style={{ padding: '0.5rem' }}></th>
              <th style={{ padding: '0.5rem' }}>Name</th>
              <th style={{ padding: '0.5rem' }}>Set</th>
              <th style={{ padding: '0.5rem' }}>Needed</th>
              <th style={{ padding: '0.5rem' }}>Owned (total)</th>
              <th style={{ padding: '0.5rem' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {cards.map((card) => (
              <tr key={card.card_id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '0.5rem' }}>
                  {card.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={card.image_url} alt={card.name} width={32} style={{ borderRadius: 4 }} />
                  ) : null}
                </td>
                <td style={{ padding: '0.5rem' }}>{card.name}</td>
                <td style={{ padding: '0.5rem' }}>{card.set_code?.toUpperCase() ?? '—'}</td>
                <td style={{ padding: '0.5rem' }}>
                  <DeckCardControls deckId={deck!.id} cardId={card.card_id} quantity={card.quantity_needed} />
                </td>
                <td style={{ padding: '0.5rem' }}>{card.total_owned}</td>
                <td style={{ padding: '0.5rem' }}>
                  {card.missing > 0 ? (
                    <span style={{ color: '#b3261e' }}>Missing {card.missing}</span>
                  ) : (
                    <span style={{ color: '#2e7d32' }}>Have {card.allocated}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
