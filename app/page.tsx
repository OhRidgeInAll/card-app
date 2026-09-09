import Link from 'next/link';
import { db } from '@/lib/db';
import type { CollectionRow } from '@/types/card';
import { getAllTags, getTagsForCards } from '@/lib/tags';
import { getCacheMeta } from '@/lib/scryfall-cache';
import { getYgoCacheMeta } from '@/lib/ygoprodeck-cache';
import CollectionView from './CollectionView';
import RefreshCacheButton from './RefreshCacheButton';
import RefreshYgoCacheButton from './RefreshYgoCacheButton';

export const dynamic = 'force-dynamic';

export default function CollectionPage() {
  const rows = db
    .prepare(
      `SELECT ci.id, ci.card_id, c.name, c.game, c.set_code, c.image_url,
              ci.quantity_owned, ci.condition,
              ci.printing_external_id, ci.printing_set_code, ci.printing_image_url, ci.printing_attributes
       FROM collection_items ci
       JOIN cards c ON c.id = ci.card_id
       ORDER BY c.name ASC`
    )
    .all() as CollectionRow[];

  const tagsByCard = getTagsForCards(rows.map((row) => row.card_id));
  const items = rows.map((row) => ({ ...row, tags: tagsByCard.get(row.card_id) ?? [] }));
  const allTags = getAllTags().map((tag) => tag.label);
  const cacheMeta = getCacheMeta();
  const ygoCacheMeta = getYgoCacheMeta();

  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem 1rem' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
        }}
      >
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Collection</h1>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Link href="/decks" style={{ fontSize: '0.9rem', textDecoration: 'underline' }}>
            Decks
          </Link>
          <Link href="/import" style={{ fontSize: '0.9rem', textDecoration: 'underline' }}>
            Bulk import
          </Link>
          <Link href="/add" style={{ fontSize: '0.9rem', textDecoration: 'underline' }}>
            + Add cards
          </Link>
          <Link href="/import-ygo" style={{ fontSize: '0.9rem', textDecoration: 'underline' }}>
            Bulk import (YGO)
          </Link>
          <Link href="/add-ygo" style={{ fontSize: '0.9rem', textDecoration: 'underline' }}>
            + Add cards (YGO)
          </Link>
        </div>
      </div>

      <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        <RefreshCacheButton meta={cacheMeta} />
        <RefreshYgoCacheButton meta={ygoCacheMeta} />
      </div>

      <CollectionView items={items} allTags={allTags} />
    </main>
  );
}
