import { db } from '@/lib/db';
import type { CollectionRow } from '@/types/card';
import { getAllTags, getTagsForCards } from '@/lib/tags';
import { getCacheMeta } from '@/lib/scryfall-cache';
import CollectionView from '@/app/CollectionView';
import RefreshCacheButton from '@/app/RefreshCacheButton';

export const dynamic = 'force-dynamic';

export default function MtgCollectionPage() {
  const rows = db
    .prepare(
      `SELECT ci.id, ci.card_id, c.name, c.game, c.set_code, c.image_url,
              ci.quantity_owned, ci.condition,
              ci.printing_external_id, ci.printing_set_code, ci.printing_image_url, ci.printing_attributes
       FROM collection_items ci
       JOIN cards c ON c.id = ci.card_id
       WHERE c.game = 'mtg'
       ORDER BY c.name ASC`
    )
    .all() as CollectionRow[];

  const tagsByCard = getTagsForCards(rows.map((row) => row.card_id));
  const items = rows.map((row) => ({ ...row, tags: tagsByCard.get(row.card_id) ?? [] }));
  const allTags = getAllTags().map((tag) => tag.label);
  const cacheMeta = getCacheMeta();

  return (
    <div>
      <h1 className="h4 fw-semibold mb-3">Collection</h1>

      <div className="mb-3">
        <RefreshCacheButton meta={cacheMeta} />
      </div>

      <CollectionView items={items} allTags={allTags} />
    </div>
  );
}
