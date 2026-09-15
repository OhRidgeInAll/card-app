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
    <div className="d-flex flex-wrap align-items-center gap-1">
      {tags.map((tag) => (
        <span key={tag.id} className="badge rounded-pill text-bg-light d-inline-flex align-items-center gap-1">
          {tag.label}
          <button
            type="button"
            onClick={() => removeTag(tag.id)}
            disabled={pending}
            aria-label={`Remove ${tag.label} tag`}
            className="btn-close btn-close-sm"
            style={{ fontSize: '0.55rem' }}
          />
        </span>
      ))}
      <form onSubmit={addTag} className="d-inline-flex">
        <input
          list={datalistId}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="+ tag"
          disabled={pending}
          className="form-control form-control-sm rounded-pill"
          style={{ width: 90 }}
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
