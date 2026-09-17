import { db } from '@/lib/db';
import type { CollectionRow } from '@/types/card';
import { getAllTags, getTagsForCards } from '@/lib/tags';
import { getYgoCacheMeta } from '@/lib/ygoprodeck-cache';
import CollectionView from '@/app/CollectionView';
import RefreshYgoCacheButton from '@/app/RefreshYgoCacheButton';

export const dynamic = 'force-dynamic';

export default function YugiohCollectionPage() {
  const rows = db
    .prepare(
      `SELECT ci.id, ci.card_id, c.name, c.game, c.set_code, c.image_url,
              ci.quantity_owned, ci.condition,
              ci.printing_external_id, ci.printing_set_code, ci.printing_image_url, ci.printing_attributes
       FROM collection_items ci
       JOIN cards c ON c.id = ci.card_id
       WHERE c.game = 'yugioh'
       ORDER BY c.name ASC`
    )
    .all() as CollectionRow[];

  const tagsByCard = getTagsForCards(rows.map((row) => row.card_id));
  const items = rows.map((row) => ({ ...row, tags: tagsByCard.get(row.card_id) ?? [] }));
  const allTags = getAllTags().map((tag) => tag.label);
  const ygoCacheMeta = getYgoCacheMeta();

  return (
    <div>
      <h1 className="h4 fw-semibold mb-3">Collection</h1>

      <div className="mb-3">
        <RefreshYgoCacheButton meta={ygoCacheMeta} />
      </div>

      <CollectionView items={items} allTags={allTags} />
    </div>
  );
}
