'use client';

import { useState } from 'react';
import { gameLabel } from '@/lib/games';
import QuantityControls from './QuantityControls';
import TagEditor from './TagEditor';

interface Tag {
  id: number;
  label: string;
}

interface CollectionItem {
  id: number;
  card_id: number;
  name: string;
  game: string;
  set_code: string | null;
  image_url: string | null;
  quantity_owned: number;
  condition: string;
  tags: Tag[];
}

interface Props {
  items: CollectionItem[];
  allTags: string[];
}

function toggleStyle(active: boolean): React.CSSProperties {
  return {
    padding: '0.3rem 0.8rem',
    borderRadius: 6,
    border: '1px solid #333',
    background: active ? '#333' : '#fff',
    color: active ? '#fff' : '#333',
    cursor: 'pointer',
    fontSize: '0.85rem',
  };
}

function tabStyle(active: boolean): React.CSSProperties {
  return {
    padding: '0.35rem 0.9rem',
    borderRadius: 6,
    border: '1px solid #333',
    background: active ? '#1a1a1a' : '#fff',
    color: active ? '#fff' : '#333',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: active ? 600 : 400,
  };
}

function groupByTag<T extends { tags: Tag[] }>(items: T[]): Map<string, T[]> {
  const columns = new Map<string, T[]>();
  for (const item of items) {
    const labels = item.tags.length > 0 ? item.tags.map((t) => t.label) : ['Untagged'];
    for (const label of labels) {
      const list = columns.get(label) ?? [];
      list.push(item);
      columns.set(label, list);
    }
  }
  return columns;
}

function sortColumnNames(names: string[]): string[] {
  return names.sort((a, b) => {
    if (a === 'Untagged') return 1;
    if (b === 'Untagged') return -1;
    return a.localeCompare(b);
  });
}

export default function CollectionView({ items, allTags }: Props) {
  const [game, setGame] = useState<'mtg' | 'yugioh'>('mtg');
  const [view, setView] = useState<'table' | 'board'>('table');

  const filteredItems = items.filter((item) => item.game === game);
  const columns = groupByTag(filteredItems);
  const columnNames = sortColumnNames(Array.from(columns.keys()));

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <button onClick={() => setGame('mtg')} style={tabStyle(game === 'mtg')}>
          Magic: The Gathering
        </button>
        <button onClick={() => setGame('yugioh')} style={tabStyle(game === 'yugioh')}>
          Yu-Gi-Oh!
        </button>
      </div>

      {filteredItems.length === 0 ? (
        <p style={{ color: '#666' }}>No {gameLabel(game)} cards yet. Add your first one.</p>
      ) : (
        <>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <button onClick={() => setView('table')} style={toggleStyle(view === 'table')}>
              Table
            </button>
            <button onClick={() => setView('board')} style={toggleStyle(view === 'board')}>
              Board (by tag)
            </button>
          </div>

          {view === 'table' ? (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>
              <th style={{ padding: '0.5rem' }}></th>
              <th style={{ padding: '0.5rem' }}>Name</th>
              <th style={{ padding: '0.5rem' }}>Set</th>
              <th style={{ padding: '0.5rem' }}>Condition</th>
              <th style={{ padding: '0.5rem' }}>Qty</th>
              <th style={{ padding: '0.5rem' }}>Tags</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((item) => (
              <tr key={item.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '0.5rem' }}>
                  {item.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.image_url} alt={item.name} width={32} style={{ borderRadius: 4 }} />
                  ) : null}
                </td>
                <td style={{ padding: '0.5rem' }}>{item.name}</td>
                <td style={{ padding: '0.5rem' }}>{item.set_code ?? '—'}</td>
                <td style={{ padding: '0.5rem' }}>{item.condition}</td>
                <td style={{ padding: '0.5rem' }}>
                  <QuantityControls itemId={item.id} quantity={item.quantity_owned} />
                </td>
                <td style={{ padding: '0.5rem', minWidth: 180 }}>
                  <TagEditor kind="card" entityId={item.card_id} tags={item.tags} allTags={allTags} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '1rem' }}>
          {columnNames.map((columnName) => {
            const columnItems = columns.get(columnName)!;
            return (
              <div
                key={columnName}
                style={{ minWidth: 200, flexShrink: 0, border: '1px solid #ddd', borderRadius: 8, background: '#fff' }}
              >
                <div
                  style={{
                    padding: '0.5rem 0.75rem',
                    borderBottom: '1px solid #eee',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>{columnName}</span>
                  <span style={{ color: '#999', fontWeight: 400 }}>{columnItems.length}</span>
                </div>
                <div style={{ padding: '0.5rem' }}>
                  {columnItems.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '0.85rem',
                        padding: '0.3rem 0',
                        borderBottom: '1px solid #f2f2f2',
                      }}
                    >
                      <span>{item.name}</span>
                      <span style={{ color: '#999' }}>×{item.quantity_owned}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
        </>
      )}
    </div>
  );
}
