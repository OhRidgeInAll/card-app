import Link from 'next/link';
import { db } from '@/lib/db';
import type { CollectionRow } from '@/types/card';
import QuantityControls from './QuantityControls';

export default function CollectionPage() {
  const items = db
    .prepare(
      `SELECT ci.id, ci.card_id, c.name, c.game, c.set_code, c.image_url,
              ci.quantity_owned, ci.condition
       FROM collection_items ci
       JOIN cards c ON c.id = ci.card_id
       ORDER BY c.name ASC`
    )
    .all() as CollectionRow[];

  return (
    <main style={{ maxWidth: 960, margin: '0 auto', padding: '2rem 1rem' }}>
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
          <Link href="/add" style={{ fontSize: '0.9rem', textDecoration: 'underline' }}>
            + Add cards
          </Link>
        </div>
      </div>

      {items.length === 0 ? (
        <p style={{ color: '#666' }}>No cards yet. Add your first one.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>
              <th style={{ padding: '0.5rem' }}></th>
              <th style={{ padding: '0.5rem' }}>Name</th>
              <th style={{ padding: '0.5rem' }}>Game</th>
              <th style={{ padding: '0.5rem' }}>Set</th>
              <th style={{ padding: '0.5rem' }}>Condition</th>
              <th style={{ padding: '0.5rem' }}>Qty</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '0.5rem' }}>
                  {item.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.image_url} alt={item.name} width={32} style={{ borderRadius: 4 }} />
                  ) : null}
                </td>
                <td style={{ padding: '0.5rem' }}>{item.name}</td>
                <td style={{ padding: '0.5rem' }}>{item.game}</td>
                <td style={{ padding: '0.5rem' }}>{item.set_code ?? '—'}</td>
                <td style={{ padding: '0.5rem' }}>{item.condition}</td>
                <td style={{ padding: '0.5rem' }}>
                  <QuantityControls itemId={item.id} quantity={item.quantity_owned} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
