'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  itemId: number;
  quantity: number;
}

export default function QuantityControls({ itemId, quantity }: Props) {
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function adjust(delta: number) {
    setPending(true);
    try {
      await fetch(`/api/collection/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delta }),
      });
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function removeAll() {
    setPending(true);
    try {
      await fetch(`/api/collection/${itemId}`, { method: 'DELETE' });
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="d-flex align-items-center gap-2">
      <div className="btn-group btn-group-sm" role="group">
        <button type="button" className="btn btn-outline-secondary" onClick={() => adjust(-1)} disabled={pending} aria-label="Remove one copy">
          −
        </button>
        <span className="btn btn-outline-secondary disabled" style={{ minWidth: '2.5rem' }}>
          {quantity}
        </span>
        <button type="button" className="btn btn-outline-secondary" onClick={() => adjust(1)} disabled={pending} aria-label="Add one copy">
          +
        </button>
      </div>
      <button type="button" onClick={removeAll} disabled={pending} className="btn btn-link btn-sm text-secondary p-0">
        remove
      </button>
    </div>
  );
}
