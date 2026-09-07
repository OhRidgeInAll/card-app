import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { getDeckCardsWithAllocation } from '@/lib/decks';
import { getAllTags, getTagsForDecks } from '@/lib/tags';
import DeckCardsView from './DeckCardsView';
import TagEditor from '@/app/TagEditor';

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
  const deckTags = getTagsForDecks([deckId]).get(deckId) ?? [];
  const allTags = getAllTags().map((tag) => tag.label);

  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem 1rem' }}>
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

      <div style={{ marginBottom: '0.75rem' }}>
        <TagEditor kind="deck" entityId={deck!.id} tags={deckTags} allTags={allTags} />
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

      <DeckCardsView deckId={deck!.id} cards={cards} allTags={allTags} />
    </main>
  );
}
