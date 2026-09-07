'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Tag {
  id: number;
  label: string;
}

interface Props {
  kind: 'card' | 'deck';
  entityId: number;
  tags: Tag[];
  allTags: string[];
}

export default function TagEditor({ kind, entityId, tags, allTags }: Props) {
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);
  const router = useRouter();

  const basePath = kind === 'card' ? `/api/cards/${entityId}/tags` : `/api/decks/${entityId}/tags`;
  const datalistId = `tag-suggestions-${kind}-${entityId}`;

  async function addTag(e: React.FormEvent) {
    e.preventDefault();
    const label = input.trim();
    if (!label) return;

    setPending(true);
    try {
      await fetch(basePath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label }),
      });
      setInput('');
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function removeTag(tagId: number) {
    setPending(true);
    try {
      await fetch(`${basePath}/${tagId}`, { method: 'DELETE' });
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.35rem' }}>
      {tags.map((tag) => (
        <span
          key={tag.id}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.3rem',
            padding: '0.15rem 0.5rem',
            borderRadius: 999,
            background: '#eef0ff',
            color: '#33399e',
            fontSize: '0.75rem',
          }}
        >
          {tag.label}
          <button
            onClick={() => removeTag(tag.id)}
            disabled={pending}
            aria-label={`Remove ${tag.label} tag`}
            style={{
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              color: 'inherit',
              lineHeight: 1,
              padding: 0,
              fontSize: '0.9rem',
            }}
          >
            ×
          </button>
        </span>
      ))}
      <form onSubmit={addTag} style={{ display: 'inline-flex' }}>
        <input
          list={datalistId}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="+ tag"
          disabled={pending}
          style={{
            fontSize: '0.75rem',
            padding: '0.15rem 0.5rem',
            border: '1px dashed #bbb',
            borderRadius: 999,
            width: 80,
          }}
        />
        <datalist id={datalistId}>
          {allTags.map((label) => (
            <option key={label} value={label} />
          ))}
        </datalist>
      </form>
    </div>
  );
}
