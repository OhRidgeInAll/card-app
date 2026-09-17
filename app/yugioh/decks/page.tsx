import Link from 'next/link';
import { db } from '@/lib/db';
import { getTagsForDecks } from '@/lib/tags';
import NewDeckForm from '@/app/NewDeckForm';

export const dynamic = 'force-dynamic';

interface DeckRow {
  id: number;
  name: string;
  game: string;
  card_count: number;
}

export default function YugiohDecksPage() {
  const decks = db
    .prepare(
      `SELECT d.id, d.name, d.game, COUNT(dc.id) AS card_count
       FROM decks d
       LEFT JOIN deck_cards dc ON dc.deck_id = d.id
       WHERE d.game = 'yugioh'
       GROUP BY d.id
       ORDER BY d.id ASC`
    )
    .all() as DeckRow[];

  const tagsByDeck = getTagsForDecks(decks.map((deck) => deck.id));

  return (
    <div style={{ maxWidth: 720 }}>
      <h1 className="h4 fw-semibold mb-3">Decks</h1>

      <NewDeckForm game="yugioh" />

      {decks.length === 0 ? (
        <p className="text-secondary">No decks yet. Create your first one above.</p>
      ) : (
        <div className="list-group">
          {decks.map((deck) => {
            const tags = tagsByDeck.get(deck.id) ?? [];
            return (
              <Link
                key={deck.id}
                href={`/yugioh/decks/${deck.id}`}
                className="list-group-item list-group-item-action"
              >
                <div className="d-flex justify-content-between">
                  <span className="fw-medium">{deck.name}</span>
                  <span className="text-secondary small">
                    {deck.card_count} card{deck.card_count === 1 ? '' : 's'}
                  </span>
                </div>
                {tags.length > 0 && (
                  <div className="d-flex gap-1 mt-2 flex-wrap">
                    {tags.map((tag) => (
                      <span key={tag.id} className="badge rounded-pill text-bg-light">
                        {tag.label}
                      </span>
                    ))}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
