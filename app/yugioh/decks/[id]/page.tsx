import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { getDeckCardsWithAllocation } from '@/lib/decks';
import { getAllTags, getTagsForDecks } from '@/lib/tags';
import DeckCardsView from '@/app/DeckCardsView';
import TagEditor from '@/app/TagEditor';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function YugiohDeckDetailPage({ params }: Props) {
  const { id } = await params;
  const deckId = Number(id);
  const deck = db.prepare(`SELECT id, name, game FROM decks WHERE id = ?`).get(deckId) as
    | { id: number; name: string; game: string }
    | undefined;

  // A stray cross-game link/bookmark shouldn't show a deck under the wrong palette.
  if (!deck || deck.game !== 'yugioh') {
    notFound();
  }

  const cards = getDeckCardsWithAllocation(deckId);
  const totalMissing = cards.reduce((sum, c) => sum + c.missing, 0);
  const deckTags = getTagsForDecks([deckId]).get(deckId) ?? [];
  const allTags = getAllTags().map((tag) => tag.label);

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h1 className="h4 fw-semibold mb-0">{deck.name}</h1>
        <div className="d-flex gap-3">
          <Link href={`/yugioh/decks/${deck.id}/add`} className="link-underline small">
            + Add cards
          </Link>
          <Link href="/yugioh/decks" className="link-underline small">
            All decks
          </Link>
        </div>
      </div>

      <div className="mb-3">
        <TagEditor kind="deck" entityId={deck.id} tags={deckTags} allTags={allTags} />
      </div>

      <p className={`mb-3 ${totalMissing > 0 ? 'text-danger' : 'text-success'}`}>
        {totalMissing > 0
          ? `Missing ${totalMissing} card${totalMissing === 1 ? '' : 's'}`
          : 'Fully assembled from your collection'}
      </p>

      <DeckCardsView deckId={deck.id} cards={cards} allTags={allTags} />
    </div>
  );
}
