'use client';

import { useState } from 'react';
import type { CollectionRow } from '@/types/card';
import QuantityControls from './QuantityControls';
import PrintPicker from './PrintPicker';
import TagEditor from './TagEditor';

interface Tag {
  id: number;
  label: string;
}

type CollectionItem = CollectionRow & { tags: Tag[] };

interface Props {
  items: CollectionItem[];
  allTags: string[];
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
  const [view, setView] = useState<'table' | 'board'>('table');

  if (items.length === 0) {
    return <p className="text-secondary">No cards yet. Add your first one.</p>;
  }

  const columns = groupByTag(items);
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
                <th>Condition</th>
                <th>Qty</th>
                <th>Tags</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const displayImage = item.printing_image_url ?? item.image_url;
                const displaySet = item.printing_set_code ?? item.set_code;
                return (
                  <tr key={item.id}>
                    <td>
                      {displayImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={displayImage} alt={item.name} width={32} className="rounded" />
                      ) : null}
                    </td>
                    <td>{item.name}</td>
                    <td>{displaySet ?? '—'}</td>
                    <td>{item.condition}</td>
                    <td>
                      <QuantityControls itemId={item.id} quantity={item.quantity_owned} />
                      {item.game === 'mtg' && (
                        <PrintPicker itemId={item.id} cardName={item.name} quantityOwned={item.quantity_owned} />
                      )}
                    </td>
                    <td style={{ minWidth: 180 }}>
                      <TagEditor kind="card" entityId={item.card_id} tags={item.tags} allTags={allTags} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="d-flex gap-3 overflow-auto pb-3">
          {columnNames.map((columnName) => {
            const columnItems = columns.get(columnName)!;
            return (
              <div key={columnName} className="card" style={{ minWidth: 200, flexShrink: 0 }}>
                <div className="card-header d-flex justify-content-between align-items-center py-2">
                  <span className="fw-semibold small">{columnName}</span>
                  <span className="text-secondary small">{columnItems.length}</span>
                </div>
                <ul className="list-group list-group-flush">
                  {columnItems.map((item) => (
                    <li key={item.id} className="list-group-item d-flex justify-content-between small py-2">
                      <span>{item.name}</span>
                      <span className="text-secondary">×{item.quantity_owned}</span>
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
