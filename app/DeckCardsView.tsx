'use client';

import { useState } from 'react';
import DeckCardControls from './DeckCardControls';
import TagEditor from './TagEditor';

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
    return <p className="text-secondary">No cards yet. Add your first one.</p>;
  }

  const columns = groupByTag(cards);
  const columnNames = sortColumnNames(Array.from(columns.keys()));

  return (
    <div>
      <div className="btn-group btn-group-sm mb-3" role="group">
        <button
          type="button"
          className={`btn ${view === 'table' ? 'btn-primary' : 'btn-outline-secondary'}`}
          onClick={() => setView('table')}
        >
          Table
        </button>
        <button
          type="button"
          className={`btn ${view === 'board' ? 'btn-primary' : 'btn-outline-secondary'}`}
          onClick={() => setView('board')}
        >
          Board (by tag)
        </button>
      </div>

      {view === 'table' ? (
        <div className="table-responsive">
          <table className="table table-hover align-middle">
            <thead>
              <tr>
                <th></th>
                <th>Name</th>
                <th>Set</th>
                <th>Needed</th>
                <th>Owned (total)</th>
                <th>Status</th>
                <th>Tags</th>
              </tr>
            </thead>
            <tbody>
              {cards.map((card) => (
                <tr key={card.card_id}>
                  <td>
                    {card.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={card.image_url} alt={card.name} width={32} className="rounded" />
                    ) : null}
                  </td>
                  <td>{card.name}</td>
                  <td>{card.set_code?.toUpperCase() ?? '—'}</td>
                  <td>
                    <DeckCardControls deckId={deckId} cardId={card.card_id} quantity={card.quantity_needed} />
                  </td>
                  <td>{card.total_owned}</td>
                  <td>
                    {card.missing > 0 ? (
                      <span className="text-danger">Missing {card.missing}</span>
                    ) : (
                      <span className="text-success">Have {card.allocated}</span>
                    )}
                  </td>
                  <td style={{ minWidth: 180 }}>
                    <TagEditor kind="card" entityId={card.card_id} tags={card.tags} allTags={allTags} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="d-flex gap-3 overflow-auto pb-3">
          {columnNames.map((columnName) => {
            const columnCards = columns.get(columnName)!;
            return (
              <div key={columnName} className="card" style={{ minWidth: 200, flexShrink: 0 }}>
                <div className="card-header d-flex justify-content-between align-items-center py-2">
                  <span className="fw-semibold small">{columnName}</span>
                  <span className="text-secondary small">{columnCards.length}</span>
                </div>
                <ul className="list-group list-group-flush">
                  {columnCards.map((card) => (
                    <li
                      key={card.card_id}
                      className="list-group-item d-flex justify-content-between small py-2"
                    >
                      <span>{card.name}</span>
                      <span className={card.missing > 0 ? 'text-danger' : 'text-secondary'}>
                        {card.missing > 0 ? `missing ${card.missing}` : `×${card.quantity_needed}`}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
