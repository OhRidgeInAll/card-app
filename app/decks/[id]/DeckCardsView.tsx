'use client';

import { useState } from 'react';
import DeckCardControls from './DeckCardControls';
import TagEditor from '@/app/TagEditor';

interface Tag {
  id: number;
  label: string;
}

interface DeckCard {
  card_id: number;
  name: string;
  set_code: string | null;
  image_url: string | null;
  quantity_needed: number;
  total_owned: number;
  allocated: number;
  missing: number;
  tags: Tag[];
}

interface Props {
  deckId: number;
  cards: DeckCard[];
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

function groupByTag(cards: DeckCard[]): Map<string, DeckCard[]> {
  const columns = new Map<string, DeckCard[]>();
  for (const card of cards) {
    const labels = card.tags.length > 0 ? card.tags.map((t) => t.label) : ['Untagged'];
    for (const label of labels) {
      const list = columns.get(label) ?? [];
      list.push(card);
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

export default function DeckCardsView({ deckId, cards, allTags }: Props) {
  const [view, setView] = useState<'table' | 'board'>('table');

  if (cards.length === 0) {
    return <p style={{ color: '#666' }}>No cards yet. Add your first one.</p>;
  }

  const columns = groupByTag(cards);
  const columnNames = sortColumnNames(Array.from(columns.keys()));

  return (
    <div>
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
              <th style={{ padding: '0.5rem' }}>Needed</th>
              <th style={{ padding: '0.5rem' }}>Owned (total)</th>
              <th style={{ padding: '0.5rem' }}>Status</th>
              <th style={{ padding: '0.5rem' }}>Tags</th>
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
                  <DeckCardControls deckId={deckId} cardId={card.card_id} quantity={card.quantity_needed} />
                </td>
                <td style={{ padding: '0.5rem' }}>{card.total_owned}</td>
                <td style={{ padding: '0.5rem' }}>
                  {card.missing > 0 ? (
                    <span style={{ color: '#b3261e' }}>Missing {card.missing}</span>
                  ) : (
                    <span style={{ color: '#2e7d32' }}>Have {card.allocated}</span>
                  )}
                </td>
                <td style={{ padding: '0.5rem', minWidth: 180 }}>
                  <TagEditor kind="card" entityId={card.card_id} tags={card.tags} allTags={allTags} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '1rem' }}>
          {columnNames.map((columnName) => {
            const columnCards = columns.get(columnName)!;
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
                  <span style={{ color: '#999', fontWeight: 400 }}>{columnCards.length}</span>
                </div>
                <div style={{ padding: '0.5rem' }}>
                  {columnCards.map((card) => (
                    <div
                      key={card.card_id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '0.85rem',
                        padding: '0.3rem 0',
                        borderBottom: '1px solid #f2f2f2',
                      }}
                    >
                      <span>{card.name}</span>
                      <span style={{ color: card.missing > 0 ? '#b3261e' : '#999' }}>
                        {card.missing > 0 ? `missing ${card.missing}` : `×${card.quantity_needed}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
